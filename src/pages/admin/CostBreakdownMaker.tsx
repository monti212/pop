import React, { useState, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CostBreakdownMaker: React.FC = () => {
  const [docHtml, setDocHtml] = useState('');
  const [docText, setDocText] = useState('');
  const [filenameBase, setFilenameBase] = useState('document');
  const [aiToggle, setAiToggle] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilenameBase(file.name.replace(/\.[^.]+$/, '') || 'document');

    const arrayBuffer = await file.arrayBuffer();

    if (typeof window.mammoth === 'undefined') {
      alert('Mammoth library not loaded. Please refresh the page.');
      return;
    }

    const options = {
      styleMap: [
        'p.StyleHeading1 => h1:fresh',
        'p.StyleHeading2 => h2:fresh',
        'p.Heading1 => h1:fresh',
        'p.Heading2 => h2:fresh',
        'p.Heading3 => h3:fresh'
      ]
    };

    const { value: html } = await window.mammoth.convertToHtml({ arrayBuffer }, options);
    const sanitized = sanitizeHtml(html);
    setDocHtml(sanitized);
    setDocText(stripHtml(sanitized));
  };

  const sanitizeHtml = (html: string): string => {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  const stripHtml = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const layout = buildPremiumLayout(docHtml, docText, null);

      const summaryEl = document.getElementById('summary');
      const factsEl = document.getElementById('facts');
      const fullEl = document.getElementById('full');
      const titleEl = document.getElementById('docTitle');
      const chipsEl = document.getElementById('chips');
      const metaEl = document.getElementById('docMeta');
      const dateEl = document.getElementById('date');

      if (summaryEl) summaryEl.innerHTML = layout.summary;
      if (factsEl) factsEl.innerHTML = layout.factsHTML;
      if (fullEl) fullEl.innerHTML = layout.fullHTML;
      if (titleEl) titleEl.textContent = layout.title || filenameBase;
      if (chipsEl) chipsEl.innerHTML = layout.chips.map(txt => `<span class="chip">${escapeHtml(txt)}</span>`).join('');
      if (metaEl) metaEl.textContent = layout.subtitle;
      if (dateEl) dateEl.textContent = new Date().toLocaleDateString();

      const previewEl = document.getElementById('preview');
      if (previewEl) previewEl.hidden = false;

      const pageEl = document.getElementById('page');
      if (!pageEl) return;

      if (typeof window.html2pdf === 'undefined') {
        alert('html2pdf library not loaded. Please refresh the page.');
        return;
      }

      await window.html2pdf()
        .set({
          margin: [16, 16, 16, 16],
          filename: `${filenameBase}.pdf`,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(pageEl)
        .save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const buildPremiumLayout = (html: string, text: string, outline: any) => {
    const lines = text.split('\n').filter(l => l.trim());
    const title = lines[0]?.trim() || 'Document';
    const subtitle = new Date().toLocaleDateString();
    const chips = ['Uhuru', 'Premium'];

    const summary = lines.slice(0, 3).join('<br>') || 'Executive summary will appear here.';
    const factsHTML = '<ul>' + lines.slice(0, 5).map(l => `<li>${escapeHtml(l)}</li>`).join('') + '</ul>';
    const fullHTML = html || '<p>Full content will appear here.</p>';

    return { title, subtitle, chips, summary, factsHTML, fullHTML };
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(1200px 600px at 20% -10%, rgba(124,58,237,.20), transparent 60%), radial-gradient(1000px 500px at 90% 10%, rgba(6,182,212,.15), transparent 60%), #0f1220' }}>
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Link>
        </div>

        <div className="bg-white/5 border border-white/8 backdrop-blur-sm rounded-3xl p-6 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-3">DOCX → Premium PDF (Uhuru)</h1>
          <p className="text-gray-300 mb-6">
            Upload a Word document. We'll convert it in-browser, smart-rearrange sections, and export a beautifully styled PDF with rounded cards and page numbers.
          </p>

          <div className="flex flex-wrap gap-4 items-center mb-6">
            <label className="inline-flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <span>📄 Choose .docx</span>
            </label>

            <label className="inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900 border border-gray-800">
              <input
                type="checkbox"
                checked={aiToggle}
                onChange={(e) => setAiToggle(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-gray-300">AI-Enhance layout (optional)</span>
            </label>

            <button
              onClick={generatePDF}
              disabled={!docHtml || isGenerating}
              className="ml-auto px-6 py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow: '0 8px 24px rgba(124,58,237,.35)' }}
            >
              {isGenerating ? 'Generating...' : 'Generate PDF'}
            </button>
          </div>

          <div id="preview" className="mt-6 bg-white text-gray-900 rounded-3xl overflow-hidden" hidden>
            <div id="page" className="p-12">
              <div className="flex gap-6 items-center mb-8">
                <div className="w-14 h-14 rounded-2xl" style={{ background: 'conic-gradient(from 210deg, #7c3aed, #06b6d4)', boxShadow: 'inset 0 0 0 6px rgba(255,255,255,.2)' }} />
                <div className="flex-1">
                  <h2 id="docTitle" className="text-2xl font-bold">Preview</h2>
                  <div id="docMeta" className="text-sm text-gray-600">—</div>
                  <div id="chips" className="flex gap-2 mt-2"></div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2 bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-lg">
                  <div className="px-5 py-4 bg-gradient-to-b from-gray-50 to-gray-100 border-b border-gray-200 font-bold">
                    Executive Summary
                  </div>
                  <div id="summary" className="p-5"></div>
                </div>

                <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-lg">
                  <div className="px-5 py-4 bg-gradient-to-b from-gray-50 to-gray-100 border-b border-gray-200 font-bold">
                    Key Facts
                  </div>
                  <div id="facts" className="p-5"></div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-lg">
                <div className="px-5 py-4 bg-gradient-to-b from-gray-50 to-gray-100 border-b border-gray-200 font-bold">
                  Full Content
                </div>
                <div id="full" className="p-5"></div>
              </div>

              <div className="mt-8 flex justify-between items-center text-sm text-gray-500">
                <span>Uhuru · OrionX</span>
                <span id="date"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

declare global {
  interface Window {
    mammoth: any;
    html2pdf: any;
  }
}

export default CostBreakdownMaker;
