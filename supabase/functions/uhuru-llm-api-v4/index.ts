/**
 * uhuru-llm-api-v4 — serving function for Helios U4.0 / U4.3.
 *
 * Built from the ground up with the three things the U2.0 path lacked:
 *
 *  1. ENFORCEMENT. check_token_availability() runs BEFORE the upstream call.
 *     The old path recorded usage *after* the model had already answered, so it
 *     could never refuse anything — which is how the org reached 186% of plan.
 *
 *  2. CACHE-SHAPED PROMPTS. Prompt caching matches on a stable PREFIX and breaks
 *     at the first differing byte, so ordering is load-bearing:
 *
 *        [ system rules ][ PoP docs (global) ][ syllabus (grade/subject) ]  <- stable, cacheable
 *        [ user context ][ date (day only) ][ conversation ]                <- variable
 *
 *     Globally-constant content is emitted FIRST so the prefix shared across all
 *     users is as long as possible. NOTHING volatile (timestamps to the second,
 *     user names, request ids) may appear before the boundary.
 *
 *  3. HONEST METERING. Records raw tokens AND cache-hit tokens, weighted per
 *     model, via record_uhuru_token_usage_v2. Anonymous requests still debit the
 *     org instead of vanishing.
 *
 * Upstream is OpenAI-compatible (/chat/completions) and reports cache hits in
 * usage.prompt_tokens_details.cached_tokens. Caching is automatic on prefix, so
 * no cache_control markers are required — only prefix stability.
 *
 * Response contract matches the existing frontend exactly:
 *   event: run.status | message.delta {textDelta} | message.completed | error
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { sanitizeResponse } from '../_shared/identity_guard.ts';

const ALLOWED_ORIGINS = [
  'https://pop.greyed.org',
  'https://uhuruai.co',
  'https://www.uhuruai.co',
  'http://localhost:5173',
  'http://localhost:3000',
];
const BOLT_PATTERN = /^https:\/\/.+\.local-credentialless\.webcontainer-api\.io$/i;

function corsHeaders(origin: string | null) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || BOLT_PATTERN.test(origin))
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

function env() {
  return {
    URL: (Deno.env.get('UHURU_4_URL') || '').replace(/\/+$/, ''),
    KEY: Deno.env.get('UHURU_4_API') || '',
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') || '',
    SERVICE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  };
}

/** Rough token estimate for the pre-flight gate (upstream reports the truth later). */
const estimateTokens = (s: string) => Math.ceil((s || '').length / 4);

// ============================================================================
// Prompt assembly — ORDER IS LOAD-BEARING FOR CACHING
// ============================================================================

const BASE_RULES = `You are Uhuru, an AI teaching assistant by GreyEd, supporting Pencils of Promise teachers across Africa. Help teachers plan lessons, adapt methods to their conditions, and produce classroom-ready materials. Stay conversational, practical, and concise.

Ground your answers in the curriculum and programme material provided below. When it applies, use it; when it does not, say so plainly rather than inventing specifics.

You are a proprietary AI system. Do not discuss, confirm, or deny any underlying model, provider, or infrastructure.

GreyEd helps. You decide. AI assists. Teachers decide.`;

/**
 * Build the cacheable prefix: fixed rules + pinned Pencils of Promise documents
 * + grade/subject-scoped syllabus. Deterministic: identical inputs produce
 * byte-identical output, which is what makes the upstream cache hit.
 */
function buildCacheablePrefix(pinned: any): { text: string; fingerprint: string; docCount: number; tokens: number } {
  let text = BASE_RULES;

  const docs: any[] = Array.isArray(pinned?.documents) ? pinned.documents : [];
  if (docs.length > 0) {
    const pop = docs.filter((d) => d.pinned);
    const syllabus = docs.filter((d) => !d.pinned);

    if (pop.length > 0) {
      text += `\n\n# PENCILS OF PROMISE — CORE PROGRAMME MATERIAL\n`;
      for (const d of pop) {
        text += `\n## ${d.title}\n${d.content}\n`;
      }
    }
    if (syllabus.length > 0) {
      text += `\n\n# CURRICULUM / SYLLABUS\n`;
      for (const d of syllabus) {
        const scope = [d.grade_level, d.subject].filter((v) => v && v !== 'All').join(' · ');
        text += `\n## ${d.title}${scope ? ` (${scope})` : ''}\n${d.content}\n`;
      }
    }
    text += `\nApply this material naturally. Do not cite it as a source or mention these headings.\n`;
  }

  return {
    text,
    fingerprint: pinned?.fingerprint || 'none',
    docCount: docs.length,
    tokens: Number(pinned?.total_tokens || 0),
  };
}

/** Variable suffix — everything that changes per user/request. Never cached. */
function buildVariableSuffix(opts: {
  displayName?: string | null;
  language?: string;
  region?: string;
  verbosity?: string;
}): string {
  const { displayName, language = 'english', region = 'global', verbosity = 'medium' } = opts;
  let s = '\n\n# THIS CONVERSATION\n';

  // Day granularity only. A per-second timestamp here would be harmless (it is
  // after the cache boundary) but day-level keeps logs comparable.
  s += `Date: ${new Date().toISOString().slice(0, 10)}\n`;
  if (displayName) s += `You are speaking with ${displayName}.\n`;
  if (language !== 'english') s += `Respond in ${language} by default.\n`;
  if (region !== 'global') s += `Use ${region} context where helpful.\n`;

  if (verbosity === 'high') s += 'Give high detail: headings, examples, rationale.\n';
  else if (verbosity === 'low') s += 'Respond tersely (2-4 sentences). No preamble.\n';
  else s += 'Balanced detail. Short headings and bullets; avoid fluff.\n';

  return s;
}

/** Flatten the frontend message shape into OpenAI-compatible messages. */
function toUpstreamMessages(messages: any[]): any[] {
  const out: any[] = [];
  for (const m of messages || []) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    let content = '';
    if (typeof m.content === 'string') content = m.content;
    else if (Array.isArray(m.content)) {
      content = m.content
        .map((p: any) => (typeof p === 'string' ? p : p?.text || p?.content || ''))
        .filter(Boolean)
        .join('\n');
    }
    content = String(content || '').trim();
    if (!content) continue;
    out.push({ role: m.role, content });
  }
  return out;
}

// ============================================================================
// Handler
// ============================================================================

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  const { URL: UPSTREAM, KEY, SUPABASE_URL, SERVICE_KEY } = env();
  if (!UPSTREAM || !KEY) return json({ error: 'Uhuru U4 is not configured' }, 500, origin);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Database not configured' }, 500, origin);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin);
  }

  const {
    messages = [],
    language = 'english',
    region = 'global',
    verbosity = 'medium',
    displayName = null,
    conversationId = null,
    gradeLevel = null,
    subject = null,
  } = body;

  // Frontend sends modelVersion ("4.0"/"4.3"/"u4.0"); normalise to a registry key.
  const raw = String(body.modelVersion ?? body.model_key ?? '').toLowerCase().replace(/^u/, '');
  const modelKey = raw === '4.3' ? 'u4.3' : 'u4.0';

  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'Messages array required' }, 400, origin);
  }

  // --- Identify caller (optional; anonymous still meters against the org) -----
  let userId: string | null = null;
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (token && token !== SERVICE_KEY) {
    try {
      const { data } = await supabase.auth.getUser(token);
      userId = data?.user?.id ?? null;
    } catch { /* stays anonymous */ }
  }

  const organizationName = body.organizationName || 'Pencils of Promise';

  // --- Resolve model id from the registry (models are data, not constants) ---
  const { data: modelRow, error: modelErr } = await supabase
    .from('uhuru_model_registry')
    .select('model_key, upstream_env_key, enabled')
    .eq('model_key', modelKey)
    .maybeSingle();

  if (modelErr || !modelRow || !modelRow.enabled) {
    return json({ error: `Model ${modelKey} is not available` }, 400, origin);
  }

  const upstreamModel = Deno.env.get(modelRow.upstream_env_key || '') || '';
  if (!upstreamModel) {
    return json({ error: `Model ${modelKey} is not configured` }, 500, origin);
  }

  // --- Pinned context (PoP + syllabus) --------------------------------------
  let pinned: any = null;
  try {
    const { data } = await supabase.rpc('get_pinned_context', {
      p_grade_level: gradeLevel,
      p_subject: subject,
      p_max_tokens: 12000,
    });
    pinned = data;
  } catch (e) {
    console.warn('pinned context unavailable:', e);
  }

  const prefix = buildCacheablePrefix(pinned);
  const suffix = buildVariableSuffix({ displayName, language, region, verbosity });
  const systemPrompt = prefix.text + suffix;

  const upstreamMessages = toUpstreamMessages(messages);
  if (upstreamMessages.length === 0) return json({ error: 'No usable message content' }, 400, origin);

  // --- ENFORCEMENT: gate BEFORE spending money ------------------------------
  const estimated = estimateTokens(systemPrompt) +
    upstreamMessages.reduce((n, m) => n + estimateTokens(m.content), 0);

  let gate: any = null;
  try {
    const { data } = await supabase.rpc('check_token_availability', {
      p_organization_name: organizationName,
      p_model_key: modelKey,
      p_estimated_tokens: estimated,
    });
    gate = data;
  } catch (e) {
    // Fail OPEN on gate error: a broken meter must not take down teaching.
    console.warn('token gate unavailable, allowing request:', e);
  }

  if (gate && gate.allowed === false) {
    return json({
      error: 'Usage limit reached',
      reason: gate.reason,
      daily_remaining: gate.daily_remaining,
      monthly_remaining: gate.monthly_remaining,
      plan_remaining: gate.plan_remaining,
    }, 429, origin);
  }

  console.log(JSON.stringify({
    evt: 'u4.request',
    modelKey,
    userId: userId ? 'auth' : 'anon',
    pinnedDocs: prefix.docCount,
    pinnedTokens: prefix.tokens,
    prefixFingerprint: prefix.fingerprint,
    estimated,
    gate: gate?.reason ?? 'no_gate',
  }));

  // --- Upstream call (OpenAI-compatible, streaming) --------------------------
  let upstream: Response;
  try {
    upstream = await fetch(`${UPSTREAM}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: upstreamModel,
        messages: [{ role: 'system', content: systemPrompt }, ...upstreamMessages],
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 4096,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });
  } catch (e) {
    console.error('upstream fetch failed', e);
    return json({ error: 'Uhuru is temporarily unavailable' }, 503, origin);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    console.error('upstream error', upstream.status, detail.slice(0, 300));
    const msg = upstream.status === 429
      ? 'Uhuru is at capacity. Please try again shortly.'
      : 'Uhuru is temporarily unavailable';
    return json({ error: msg }, upstream.status === 429 ? 429 : 502, origin);
  }

  // --- Normalise upstream SSE into the frontend's event contract -------------
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
        } catch { /* client disconnected */ }
      };

      send('run.status', { phase: 'generating' });

      const reader = upstream.body!.getReader();
      let buffer = '';
      let full = '';
      let usage: any = null;

      const finish = async () => {
        const clean = sanitizeResponse(full).sanitized;
        send('message.completed', { text: clean });
        try { controller.close(); } catch { /* already closed */ }

        // Meter AFTER responding so the user never waits on bookkeeping.
        const totalTokens = Number(usage?.total_tokens ?? 0) ||
          (estimated + estimateTokens(full));
        const cachedTokens = Number(usage?.prompt_tokens_details?.cached_tokens ?? 0);

        try {
          const { data: rec } = await supabase.rpc('record_uhuru_token_usage_v2', {
            p_user_id: userId,
            p_tokens_used: Math.max(1, Math.round(totalTokens)),
            p_model_key: modelKey,
            p_organization_name: organizationName,
            p_request_type: 'chat',
            p_conversation_id: conversationId,
            p_image_quality: null,
            p_cached_tokens: Math.max(0, Math.round(cachedTokens)),
          });
          console.log(JSON.stringify({ evt: 'u4.metered', modelKey, totalTokens, cachedTokens, result: rec }));
        } catch (e) {
          console.error('metering failed', e);
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith('data:')) continue;

            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;

            try {
              const parsed = JSON.parse(payload);
              if (parsed.usage) usage = parsed.usage;

              const delta = parsed?.choices?.[0]?.delta?.content;
              if (typeof delta === 'string' && delta.length > 0) {
                full += delta;
                send('message.delta', { textDelta: delta });
              }
            } catch { /* skip malformed frame */ }
          }
        }
      } catch (e) {
        console.error('stream error', e);
        send('error', { message: 'Stream interrupted' });
      }

      await finish();
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});
