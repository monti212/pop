import React, { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Slider } from "../../components/ui/slider";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Info, TrendingUp, Calculator, Settings, ShieldCheck, Image as ImageIcon, FileUp, MessageSquare } from "lucide-react";

/**
 * UHURU — B2C Cost & Limits Calculator (Admin)
 * Premium, minimal UI for forecasting costs across 10 → 1,000,000 active users.
 * SECURITY: never hardcode secrets; only reference these names in env:
 *   UHURU_API_KEY, UHURU_20_API_KEY, UHURU_API_URL, UHURU_IMAGES_URL, UHURU_EXTRA_HEADERS,
 *   UHURU_MODEL_15, UHURU_MODEL_20, UHURU_MODEL_21,
 *   UHURU_IMAGE_MODEL_15, UHURU_IMAGE_MODEL_20, UHURU_IMAGE_MODEL_21
 */

// ---------- Pricing & Plan Defaults (editable) ----------
const SUPABASE = {
  proBaseUSD: 25,
  computeCreditUSD: 10,
  tiers: [
    { name: "Micro",  priceUSD: 10,  maxActives: 100 },
    { name: "Small",  priceUSD: 15,  maxActives: 600 },
    { name: "Medium", priceUSD: 60,  maxActives: 5000 },
    { name: "Large",  priceUSD: 110, maxActives: 25000 },
  ],
  included: { dbGB: 8, fileGB: 100, egressGB: 250, edgeCalls: 2_000_000 },
  overage:  { dbPerGB: 0.125, filePerGB: 0.021, egressPerGB: 0.09 }
};

// Public wallet price for planning (customer token spend)
const WALLET = { usdPerMillionTokens: 180 };

// Model routing (for planning only)
const MODEL_ROUTING_DEFAULT = { pct15: 70, pct20: 25, pct21: 5 };

// Image generation cost structure by model version
const IMAGE_COST = {
  standardQuality: 0.04,  // Version 1.5
  highQuality:     0.08,  // Version 2.0
  mediumQuality:   0.04,  // Version 2.1 only
};

// Optional "Uhuru Tools" pricing (planning)
const TOOLS = {
  vectorStorageUSDPerGBPerDay: 0.10, // ≈ $3 per GB per 30-day month
  knowledgeQueryUSDPer1kCalls: 2.50,
  assumedQueriesPerChat: 0.20,       // fraction of chats that trigger a knowledge query
};

// Verbosity planning factors (applies to 2.1 only in calculator)
const VERBOSITY = { low: 0.9, medium: 1.0, high: 1.2 } as const;

// WhatsApp/Web/SMS limits (policy)
const CFO_LIMITS = {
  whatsapp: { docMBDefault: 25, docMBMaxAdmin: 50, imageMBDefault: 5, videoMBMax: 16, absoluteCapMB: 100 },
  web:      { fileMBDefault: 50, fileMBMaxAdmin: 100 },
};

const PROFILES = {
  conservative: {
    activeRate: 0.60,
    perActive: {
      webChats: 8,  webTokensPerChat: 600,
      waChats: 6,   waTokensPerChat: 800,
      smsSessions: 4, smsTokensPerSession: 220,
      images15: 1, images20: 1, images21: 0,  // 2 images/mo
      filesPerActive: 1, avgFileMB: 0.5,
    }
  },
  nonConservative: {
    activeRate: 0.80,
    perActive: {
      webChats: 12, webTokensPerChat: 700,
      waChats: 12,  waTokensPerChat: 800,
      smsSessions: 6, smsTokensPerSession: 220,
      images15: 2, images20: 1, images21: 1,  // 4 images/mo
      filesPerActive: 3, avgFileMB: 1.0,
    }
  }
};

function chooseComputeTier(actives: number) {
  const t = SUPABASE.tiers.find(t => actives <= t.maxActives);
  return t ?? SUPABASE.tiers[SUPABASE.tiers.length - 1];
}
const nf = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function CostCalculator() {
  const [profileKey, setProfileKey] = useState<keyof typeof PROFILES>("conservative");
  const [activeUsers, setActiveUsers] = useState(1000);
  const [routing, setRouting] = useState({ ...MODEL_ROUTING_DEFAULT });
  const [imgCost, setImgCost] = useState({
    stdQual: IMAGE_COST.standardQuality,
    hqQual: IMAGE_COST.highQuality,
    medQual: IMAGE_COST.mediumQuality,
  });
  const [mode21, setMode21] = useState<'complex' | 'polymath'>('complex');
  const [verbosity, setVerbosity] = useState<'low' | 'medium' | 'high'>('medium');

  const profile = PROFILES[profileKey];
  const actives = Math.round(activeUsers * profile.activeRate);
  const ch = profile.perActive;

  // Tokens by channel & total (planning; 60/40 is implicit)
  const tokensWeb = ch.webChats * ch.webTokensPerChat * actives;
  const tokensWA  = ch.waChats  * ch.waTokensPerChat  * actives;
  const tokensSMS = ch.smsSessions * ch.smsTokensPerSession * actives;
  const totalTokens = tokensWeb + tokensWA + tokensSMS;

  // Routing allocation (before verbosity adjustment)
  const sumPct = Math.max(1, routing.pct15 + routing.pct20 + routing.pct21);
  const tokens15 = totalTokens * (routing.pct15 / sumPct);
  const tokens20 = totalTokens * (routing.pct20 / sumPct);
  const tokens21 = totalTokens * (routing.pct21 / sumPct);

  // Apply verbosity to 2.1 only (planning)
  const verbosityFactor = verbosity === 'low' ? VERBOSITY.low : (verbosity === 'high' ? VERBOSITY.high : VERBOSITY.medium);
  const tokens21Adj = tokens21 * verbosityFactor;
  const totalTokensAdj = tokens15 + tokens20 + tokens21Adj;

  // Wallet (customer token spend) @ $180 / 1M (uses adjusted total)
  const walletUSD = (totalTokensAdj / 1_000_000) * WALLET.usdPerMillionTokens;

  // Images (unit costs editable)
  const images15 = ch.images15 * actives; // Standard quality
  const images20 = ch.images20 * actives; // High quality
  const images21 = ch.images21 * actives; // Medium quality (2.1 only)
  const imagesUSD = images15 * imgCost.stdQual + images20 * imgCost.hqQual + images21 * imgCost.medQual;

  // File storage (attachments) & egress
  const totalFiles = ch.filesPerActive * actives;
  const storedGB   = (totalFiles * ch.avgFileMB) / 1024; // GB
  const egressGB   = (images15 + images20 + images21) * 1.0 / 1024; // 1 MB per image view

  // Tools (Vector Storage + Knowledge Query)
  const approxChats = (ch.webChats + ch.waChats + ch.smsSessions) * actives;
  const knowledgeCalls = approxChats * TOOLS.assumedQueriesPerChat;
  const toolsVectorUSD    = Math.max(0, storedGB - 1) * TOOLS.vectorStorageUSDPerGBPerDay * 30; // first 1 GB/day free
  const toolsKnowledgeUSD = (knowledgeCalls / 1000) * TOOLS.knowledgeQueryUSDPer1kCalls;
  const toolsUSD = toolsVectorUSD + toolsKnowledgeUSD;

  // Supabase (infra) base + compute tier + overages
  const tier = chooseComputeTier(actives);
  const supabaseBaseUSD = SUPABASE.proBaseUSD;
  const supabaseComputeUSD = Math.max(0, tier.priceUSD - SUPABASE.computeCreditUSD);
  const supabaseFileOverUSD = Math.max(0, storedGB - SUPABASE.included.fileGB) * SUPABASE.overage.filePerGB;
  const supabaseEgressOverUSD = Math.max(0, egressGB - SUPABASE.included.egressGB) * SUPABASE.overage.egressPerGB;
  const supabaseUSD = supabaseBaseUSD + supabaseComputeUSD + supabaseFileOverUSD + supabaseEgressOverUSD;

  // Grand total (ex taxes)
  const modelsUSD = walletUSD;
  const infraUSD  = supabaseUSD;
  const totalUSD  = modelsUSD + imagesUSD + toolsUSD + infraUSD;

  const waPolicy = `Default ${CFO_LIMITS.whatsapp.docMBDefault}MB docs/images, hard ceiling ${CFO_LIMITS.whatsapp.docMBMaxAdmin}MB (admin). Videos up to ${CFO_LIMITS.whatsapp.videoMBMax}MB. Absolute Cloud API cap ${CFO_LIMITS.whatsapp.absoluteCapMB}MB.`;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Uhuru — B2C Cost & Limits</h1>
          <p className="text-sm text-gray-600 mt-1">
            Forecast monthly spend from 10 → 1,000,000 active users. Toggle conservative/non-conservative.
            Images: Generated via Uhuru image models (Standard/High/Medium quality). Attachments stored in Supabase.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={profileKey === "nonConservative"} onCheckedChange={(v)=> setProfileKey(v ? "nonConservative" : "conservative")} />
          <span className="text-sm font-medium">Non-conservative</span>
        </div>
      </header>

      {/* Limits & Policies */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3"><ShieldCheck className="h-5 w-5 text-teal"/><h2 className="text-lg font-semibold">Limits & Policies (B2C Free)</h2></div>
          <ul className="text-sm leading-6 list-disc pl-5 space-y-1">
            <li><b>Models:</b> Uhuru 1.5 (default), 2.0 (limited), 2.1 (rare). Output caps: 350 / 600 / 800 tokens per reply. Daily caps: 20 / 6 / 1 msgs.</li>
            <li><b>Images:</b> 1.5 → Standard quality; 2.0 → High quality; 2.1 → Medium quality only.
              Default allowance: {profileKey === "conservative" ? "2 images/mo" : "4 images/mo"} per user.</li>
            <li><b>WhatsApp attachments:</b> {waPolicy}</li>
            <li><b>Web uploads:</b> default {CFO_LIMITS.web.fileMBDefault}MB/file (max {CFO_LIMITS.web.fileMBMaxAdmin}MB via admin). SMS: links only.</li>
            <li><b>Storage & retention:</b> Supabase Storage; suggest 180-day retention, purge on expiry; keep metadata.</li>
            <li><b>Security:</b> use env names only: UHURU_API_KEY, UHURU_API_URL, UHURU_MODEL_15/20/21, UHURU_IMAGE_MODEL_*, UHURU_IMAGES_URL, UHURU_CORE_LLM_*.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2"><Settings className="h-5 w-5 text-teal"/><h2 className="text-lg font-semibold">Scenario Controls</h2></div>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Active users</label>
              <div className="flex items-center gap-3 mt-2">
                <Slider value={[activeUsers]} min={10} max={1_000_000} step={10} onValueChange={(v)=> setActiveUsers(v[0])} />
                <Input className="w-36" type="number" value={activeUsers} onChange={(e)=> setActiveUsers(Number(e.target.value))} />
              </div>
              <div className="text-xs text-gray-500 mt-1">Actives = signups × {Math.round(PROFILES[profileKey].activeRate*100)}%</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Model routing (%)</label>
              <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                <div><span className="text-xs text-gray-600">1.5</span><Input type="number" value={routing.pct15} onChange={(e)=> setRouting({ ...routing, pct15: Number(e.target.value) })}/></div>
                <div><span className="text-xs text-gray-600">2.0</span><Input type="number" value={routing.pct20} onChange={(e)=> setRouting({ ...routing, pct20: Number(e.target.value) })}/></div>
                <div><span className="text-xs text-gray-600">2.1</span><Input type="number" value={routing.pct21} onChange={(e)=> setRouting({ ...routing, pct21: Number(e.target.value) })}/></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">Spends use wallet @ ${WALLET.usdPerMillionTokens}/M.</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Image unit prices (USD)</label>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div><span className="text-gray-600">Standard Quality</span><Input type="number" step="0.01" value={imgCost.stdQual} onChange={(e)=> setImgCost({ ...imgCost, stdQual: Number(e.target.value) })}/></div>
                <div><span className="text-gray-600">High Quality</span><Input type="number" step="0.01" value={imgCost.hqQual} onChange={(e)=> setImgCost({ ...imgCost, hqQual: Number(e.target.value) })}/></div>
                <div><span className="text-gray-600">Medium Quality</span><Input type="number" step="0.01" value={imgCost.medQual} onChange={(e)=> setImgCost({ ...imgCost, medQual: Number(e.target.value) })}/></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2.1 Mode & Verbosity */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2"><Settings className="h-5 w-5 text-teal"/><h2 className="text-lg font-semibold">Uhuru 2.1 Mode & Verbosity</h2></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Uhuru 2.1 Mode</label>
              <select className="mt-2 w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent" value={mode21} onChange={(e)=> setMode21(e.target.value as 'complex'|'polymath')}>
                <option value="complex">Complex (default)</option>
                <option value="polymath">Polymath</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Verbosity (output style)</label>
              <select className="mt-2 w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent" value={verbosity} onChange={(e)=> setVerbosity(e.target.value as 'low'|'medium'|'high')}>
                <option value="low">Low (×{VERBOSITY.low})</option>
                <option value="medium">Medium (×{VERBOSITY.medium})</option>
                <option value="high">High (×{VERBOSITY.high})</option>
              </select>
            </div>
          </div>
          <div className="text-xs text-gray-500">Verbosity affects planning tokens for 2.1 only. This does not change the underlying engine.</div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-teal"/><h3 className="font-semibold">Totals (Monthly)</h3></div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Active users</div><div className="text-right font-medium">{nf(actives)}</div>
              <div className="text-gray-600">Tokens (planning)</div><div className="text-right font-medium">{nf(totalTokensAdj)}</div>
              <div className="text-gray-600">Images (15/20/21)</div><div className="text-right font-medium">{nf(images15)}/{nf(images20)}/{nf(images21)}</div>
              <div className="text-gray-600">Stored files (GB)</div><div className="text-right font-medium">{nf(storedGB)}</div>
              <div className="text-gray-600">Egress (GB)</div><div className="text-right font-medium">{nf(egressGB)}</div>
              <div className="text-gray-600">Supabase (USD)</div><div className="text-right font-medium">{nf(supabaseUSD)}</div>
              <div className="text-gray-600">Images (USD)</div><div className="text-right font-medium">{nf(imagesUSD)}</div>
              <div className="text-gray-600">Tokens / Models (USD)</div><div className="text-right font-medium">{nf(walletUSD)}</div>
              <div className="text-gray-600">Uhuru Tools (USD)</div><div className="text-right font-medium">{nf(toolsUSD)}</div>
              <div className="text-gray-600 font-semibold">Total (USD)</div><div className="text-right font-bold text-teal">{nf(totalUSD)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-teal"/><h3 className="font-semibold">Supabase Plan</h3></div>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-600">Compute tier</span><span className="font-medium">{tier.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Base (Pro)</span><span className="font-medium">${SUPABASE.proBaseUSD}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Net compute (after $10 credit)</span><span className="font-medium">${Math.max(0, tier.priceUSD - SUPABASE.computeCreditUSD)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">File overage</span><span className="font-medium">${nf(supabaseFileOverUSD)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Egress overage</span><span className="font-medium">${nf(supabaseEgressOverUSD)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Included</span><span className="font-medium text-xs">DB {SUPABASE.included.dbGB}GB • Files {SUPABASE.included.fileGB}GB • Egress {SUPABASE.included.egressGB}GB</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-teal"/><h3 className="font-semibold">Image Engines</h3></div>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-600">1.5 → Standard Quality</span><span className="font-medium">${imgCost.stdQual} / img × {nf(images15)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">2.0 → High Quality</span><span className="font-medium">${imgCost.hqQual} / img × {nf(images20)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">2.1 → Medium Quality</span><span className="font-medium">${imgCost.medQual} / img × {nf(images21)}</span></div>
              <div className="text-xs text-gray-500 mt-2">2.1 is locked to medium quality by policy.</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Models & Tools breakdown */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-teal"/><h3 className="font-semibold">Models (Routing & Spend Estimate)</h3></div>
            <div className="text-sm grid grid-cols-3 gap-2 items-end">
              <div><label className="text-xs text-gray-600">1.5 %</label><Input type="number" value={routing.pct15} onChange={(e)=> setRouting({ ...routing, pct15: Number(e.target.value) })}/></div>
              <div><label className="text-xs text-gray-600">2.0 %</label><Input type="number" value={routing.pct20} onChange={(e)=> setRouting({ ...routing, pct20: Number(e.target.value) })}/></div>
              <div><label className="text-xs text-gray-600">2.1 %</label><Input type="number" value={routing.pct21} onChange={(e)=> setRouting({ ...routing, pct21: Number(e.target.value) })}/></div>
            </div>
            <div className="text-sm mt-3 space-y-1">
              <div className="flex justify-between"><span className="text-gray-600">Tokens → 1.5</span><span className="font-medium">{nf(tokens15)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tokens → 2.0</span><span className="font-medium">{nf(tokens20)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tokens → 2.1 (adj)</span><span className="font-medium">{nf(tokens21Adj)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2"><span className="text-gray-600">Wallet spend (@${WALLET.usdPerMillionTokens}/M)</span><span className="font-semibold text-teal">${nf(walletUSD)}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2"><FileUp className="h-5 w-5 text-teal"/><h3 className="font-semibold">Uhuru Tools (Monthly)</h3></div>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-600">Vector Storage (~${TOOLS.vectorStorageUSDPerGBPerDay}/GB/day ×30)</span><span className="font-medium">${nf(toolsVectorUSD)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Knowledge Query Calls (@${TOOLS.knowledgeQueryUSDPer1kCalls}/1k)</span><span className="font-medium">${nf(toolsKnowledgeUSD)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2"><span className="text-gray-600">Total Tools</span><span className="font-semibold text-teal">${nf(toolsUSD)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="text-xs text-gray-500 flex items-start gap-2 mt-6 p-4 bg-gray-50 rounded-lg">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          WhatsApp Cloud API media cap is 100MB; we enforce default 25MB (50MB admin) for docs/images and 16MB for videos.
          Web uploads default 50MB (100MB admin). SMS has no attachments. Use env names only (UHURU_*); never expose raw values in the client.
        </p>
      </footer>
    </div>
  );
}
