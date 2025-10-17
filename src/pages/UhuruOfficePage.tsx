import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Download, FileText, File, ArrowLeft, Plus, Folder, Trash2, FileEdit as Edit3, Copy, Check } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { convertMarkdownToHtml } from '../utils/markdownConverter';
import { useAuth } from '../context/AuthContext';
import {
  createDocument,
  getUserDocuments,
  updateDocument,
  deleteDocument,
  UserDocument as DBUserDocument
} from '../services/documentService';

interface UhuruDocument {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  isAutoSaved?: boolean;
  source?: string;
}

interface AIAction {
  id: string;
  action: 'draft' | 'rewrite' | 'summarize' | 'outline';
  input: string;
  output: string;
  context: 'selection' | 'whole_doc' | 'none';
  timestamp: string;
  model: string;
}

interface AIResult {
  content: string;
  action: string;
  model: string;
  latency?: number;
}
const UhuruDocsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled Document');
  const [showDocuments, setShowDocuments] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState<UhuruDocument[]>([]);
  const [currentDocument, setCurrentDocument] = useState<UhuruDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showAutoSavedOnly, setShowAutoSavedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Uhuru AI Panel State
  const [showUhuruPanel, setShowUhuruPanel] = useState(false);
  const [aiContext, setAiContext] = useState<'selection' | 'whole_doc' | 'none'>('selection');
  const [aiTone, setAiTone] = useState<'neutral' | 'professional' | 'friendly' | 'academic'>('neutral');
  const [aiLanguage, setAiLanguage] = useState('english');
  const [aiInsertMode, setAiInsertMode] = useState<'replace' | 'insert_below' | 'copy_to_clipboard'>('insert_below');
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiThinkingMessage, setAiThinkingMessage] = useState('Uhuru is thinking...');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHistory, setAiHistory] = useState<AIAction[]>([]);
  const [originalContentBeforeReplace, setOriginalContentBeforeReplace] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<'2.0'>('2.0');
  const [selectedText, setSelectedText] = useState('');
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Reference to ReactQuill editor
  const quillRef = useRef<ReactQuill>(null);

  // Get initial content from navigation state
  useEffect(() => {
    const initialContent = location.state?.content;
    const initialTitle = location.state?.title;
    
    if (initialContent) {
      convertMarkdownToHtml(initialContent).then(htmlContent => {
        setContent(htmlContent);
      });
    }
    
    if (initialTitle) {
      setTitle(initialTitle);
    }
    
    // Load saved documents
    loadSavedDocuments();
  }, [location.state]);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'align', 'direction',
    'blockquote', 'code-block',
    'link', 'image'
  ];

  useEffect(() => {
    if (content && content.trim() !== '' && content !== '<p><br></p>') {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        if (document.hasFocus()) {
          handleAutoSave();
        }
      }, 5000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content]);

  const handleAutoSave = async () => {
    if (!user) return;

    try {
      if (currentDocument?.id) {
        // Update existing document
        const result = await updateDocument(currentDocument.id, user.id, {
          title: title || 'Untitled Document',
          content
        });

        if (result.success && result.document) {
          const updatedDoc: UhuruDocument = {
            id: result.document.id,
            title: result.document.title,
            content: result.document.content,
            created_at: result.document.created_at,
            updated_at: result.document.updated_at,
            isAutoSaved: result.document.is_auto_saved
          };
          setCurrentDocument(updatedDoc);
          // Refresh the documents list
          await loadSavedDocuments();
        }
      } else {
        // Create new document
        const result = await createDocument(user.id, title || 'Untitled Document', content, {
          documentType: 'office',
          isAutoSaved: true,
          source: location.state?.source || 'manual'
        });

        if (result.success && result.document) {
          const newDoc: UhuruDocument = {
            id: result.document.id,
            title: result.document.title,
            content: result.document.content,
            created_at: result.document.created_at,
            updated_at: result.document.updated_at,
            isAutoSaved: result.document.is_auto_saved
          };
          setCurrentDocument(newDoc);
          await loadSavedDocuments();
        }
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  };

  const loadSavedDocuments = async () => {
    if (!user) {
      // Check localStorage for legacy documents
      const saved = localStorage.getItem('uhuru-office-documents');
      if (saved) {
        setSavedDocuments(JSON.parse(saved));
      }
      return;
    }

    setIsLoading(true);
    try {
      const result = await getUserDocuments(user.id, {
        documentType: 'office',
        limit: 100
      });

      if (result.success && result.documents) {
        const docs: UhuruDocument[] = result.documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          isAutoSaved: doc.is_auto_saved,
          source: doc.source
        }));
        setSavedDocuments(docs);
      } else if (result.error) {
        setError(result.error);

        // Fallback to localStorage
        const saved = localStorage.getItem('uhuru-office-documents');
        if (saved) {
          setSavedDocuments(JSON.parse(saved));
        }
      }
    } catch (error: any) {
      console.error('Error loading documents:', error);
      setError(error.message);

      // Fallback to localStorage
      const saved = localStorage.getItem('uhuru-office-documents');
      if (saved) {
        setSavedDocuments(JSON.parse(saved));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDocument = async (showNotification = true) => {
    if (!user) {
      setError('Please sign in to save documents');
      return;
    }

    setIsSaving(true);

    try {
      if (currentDocument?.id) {
        // Update existing document
        const result = await updateDocument(currentDocument.id, user.id, {
          title: title || 'Untitled Document',
          content
        });

        if (result.success && result.document) {
          const updatedDoc: UhuruDocument = {
            id: result.document.id,
            title: result.document.title,
            content: result.document.content,
            created_at: result.document.created_at,
            updated_at: result.document.updated_at,
            isAutoSaved: false
          };
          setCurrentDocument(updatedDoc);
          await loadSavedDocuments();
        } else {
          setError(result.error || 'Failed to save document');
        }
      } else {
        // Create new document
        const result = await createDocument(user.id, title || 'Untitled Document', content, {
          documentType: 'office',
          isAutoSaved: false,
          source: location.state?.source || 'manual'
        });

        if (result.success && result.document) {
          const newDoc: UhuruDocument = {
            id: result.document.id,
            title: result.document.title,
            content: result.document.content,
            created_at: result.document.created_at,
            updated_at: result.document.updated_at,
            isAutoSaved: false
          };
          setCurrentDocument(newDoc);
          await loadSavedDocuments();
        } else {
          setError(result.error || 'Failed to create document');
        }
      }
    } catch (error: any) {
      console.error('Save error:', error);
      setError(error.message || 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewDocument = () => {
    setCurrentDocument(null);
    setContent('');
    setTitle('Untitled Document');
    setShowDocuments(false);
  };

  const handleLoadDocument = (doc: UhuruDocument) => {
    setCurrentDocument(doc);
    setContent(doc.content);
    setTitle(doc.title);
    setShowDocuments(false);
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    if (!user) {
      setError('Please sign in to delete documents');
      return;
    }

    try {
      const result = await deleteDocument(docId, user.id, false); // Soft delete

      if (result.success) {
        await loadSavedDocuments();

        if (currentDocument?.id === docId) {
          handleNewDocument();
        }
      } else {
        setError(result.error || 'Failed to delete document');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      setError(error.message || 'Failed to delete document');
    }
  };

  const downloadAsPDF = () => {
    setIsDownloading(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxLineWidth = pageWidth - (margin * 2);
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, margin + 10);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, margin + 20);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      const lines = doc.splitTextToSize(plainText, maxLineWidth);
      
      let currentY = margin + 35;
      const lineHeight = 7;
      
      lines.forEach((line: string) => {
        if (currentY + lineHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
        doc.text(line, margin, currentY);
        currentY += lineHeight;
      });
      
      doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAsWord = () => {
    setIsDownloading(true);
    try {
      const htmlContent = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="Uhuru Office">
  <title>${title}</title>
  <style>
    @page { margin: 1in; }
    body { 
      font-family: 'Times New Roman', serif; 
      font-size: 12pt; 
      line-height: 1.6; 
      color: #000; 
      background: #fff;
    }
    h1 { font-size: 18pt; font-weight: bold; margin: 24pt 0 12pt 0; }
    h2 { font-size: 16pt; font-weight: bold; margin: 18pt 0 10pt 0; }
    h3 { font-size: 14pt; font-weight: bold; margin: 14pt 0 8pt 0; }
    p { margin: 0 0 12pt 0; text-align: justify; }
    ul, ol { margin: 12pt 0; padding-left: 36pt; }
    li { margin: 6pt 0; }
    blockquote { 
      margin: 12pt 24pt; 
      padding: 12pt; 
      border-left: 3pt solid #0096B3; 
      background-color: #f8f9fa;
      font-style: italic;
    }
    strong { font-weight: bold; }
    em { font-style: italic; }
    code { 
      font-family: 'Courier New', monospace; 
      background-color: #f1f3f4;
      padding: 2pt 4pt;
      border-radius: 2pt;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p>Generated on ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}</p>
  </div>
  
  <div class="content">
    ${content}
  </div>
  
  <div class="footer">
    <p>Created with Uhuru Office by OrionX</p>
    <p>Document generated at ${new Date().toLocaleTimeString()}</p>
  </div>
</body>
</html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating Word document:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const copyToClipboard = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    navigator.clipboard.writeText(plainText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="h-screen bg-sand-200 flex flex-col overflow-hidden">
      <header className="bg-white shadow-card border-b border-borders px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left side - Back button */}
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-12 hover:bg-sand-200 text-navy transition-colors flex items-center gap-2"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Back</span>
          </button>
          
          {/* Center - Title and document name */}
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-teal mr-2" />
              <h1 className="text-xl font-bold text-gray-800">Uhuru Docs</h1>
            </div>
            
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-1 border border-borders rounded-12 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent text-navy bg-white"
              placeholder="Document title..."
            />
          </div>
          
          {/* Right side - Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDocuments(!showDocuments)}
              className="p-2 rounded-12 hover:bg-sand-200 text-navy transition-colors flex items-center gap-1"
              aria-label="My documents"
            >
              <Folder className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Documents</span>
            </button>
            
            <button
              onClick={handleNewDocument}
              className="p-2 rounded-12 hover:bg-sand-200 text-navy transition-colors flex items-center gap-1"
              aria-label="New document"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">New</span>
            </button>
            
            <button
              onClick={copyToClipboard}
              className="px-3 py-2 rounded-12 bg-white text-navy hover:bg-sand-200 transition-colors duration-200 flex items-center gap-2 text-sm border border-borders"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  const menu = document.getElementById('download-menu');
                  menu?.classList.toggle('hidden');
                }}
                className="px-3 py-2 rounded-12 bg-white text-navy hover:bg-sand-200 transition-colors duration-200 flex items-center gap-2 text-sm border border-borders"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
              
              <div id="download-menu" className="hidden absolute right-0 top-full mt-2 bg-white rounded-12 shadow-card z-10 min-w-[160px] overflow-hidden border border-borders">
                <button
                  onClick={() => {
                    downloadAsPDF();
                    document.getElementById('download-menu')?.classList.add('hidden');
                  }}
                  disabled={isDownloading}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-left transition-colors duration-200 disabled:opacity-50"
                >
                  <FileText className="w-4 h-4 text-red-500" />
                  <div>
                    <div className="font-medium text-gray-800">Export as PDF</div>
                    <div className="text-xs text-gray-500">Portable document</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    downloadAsWord();
                    document.getElementById('download-menu')?.classList.add('hidden');
                  }}
                  disabled={isDownloading}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-left transition-colors duration-200 disabled:opacity-50"
                >
                  <File className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-800">Export as Word</div>
                    <div className="text-xs text-gray-500">Microsoft Word format</div>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={() => handleSaveDocument()}
              disabled={isSaving}
              className="px-3 py-2 rounded-12 bg-teal text-white hover:bg-teal/90 transition-colors duration-200 flex items-center gap-2 text-sm shadow-card"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Saving</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Documents Modal */}
      {showDocuments && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-16 shadow-card max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-borders flex justify-between items-center">
              <h3 className="font-semibold text-lg text-navy">My Documents</h3>
              <button
                onClick={() => setShowDocuments(false)}
                className="p-2 rounded-12 hover:bg-sand-200 text-navy"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(80vh-8rem)]">
              {savedDocuments.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto text-navy/30 mb-3" />
                  <h4 className="text-lg font-medium text-navy mb-1">No documents yet</h4>
                  <p className="text-sm text-navy/70 mb-4">
                    Start writing to create your first document
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-borders">
                  {/* Filter buttons */}
                  <div className="p-4 border-b border-borders">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAutoSavedOnly(false)}
                        className={`px-3 py-1 rounded-12 text-sm ${
                          !showAutoSavedOnly 
                            ? 'bg-teal text-white' 
                            : 'bg-white text-navy hover:bg-sand-200 border border-borders'
                        }`}
                      >
                        All Documents
                      </button>
                      <button
                        onClick={() => setShowAutoSavedOnly(true)}
                        className={`px-3 py-1 rounded-12 text-sm ${
                          showAutoSavedOnly 
                            ? 'bg-teal text-white' 
                            : 'bg-white text-navy hover:bg-sand-200 border border-borders'
                        }`}
                      >
                        Auto-saved from Chat
                      </button>
                    </div>
                  </div>
                  
                  {savedDocuments.filter(doc => showAutoSavedOnly ? doc.isAutoSaved : true).map(doc => (
                    <div key={doc.id} className="p-4 hover:bg-sand-200/50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-navy">{doc.title}</h4>
                            {doc.isAutoSaved && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                Auto-saved
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-navy/70 mt-0.5">
                            Last edited: {new Date(doc.updated_at).toLocaleDateString()}
                          </p>
                          {doc.source && (
                            <p className="text-xs text-navy/50 mt-0.5">
                              Source: {doc.source}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadDocument(doc)}
                            className="px-3 py-1 rounded-12 bg-teal text-white hover:bg-teal/90 transition-colors text-sm"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 rounded-12 hover:bg-red-50 text-red-500 transition-colors"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor Content - Scrollable */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto bg-sand-200">
          {/* ReactQuill Toolbar - Above the document */}
          <div className="max-w-none mx-auto flex justify-center mb-4">
            <div style={{ width: '210mm', maxWidth: '210mm' }}>
              <div className="bg-white border border-borders rounded-t-12 p-2">
                <div id="toolbar" className="ql-toolbar">
                  <span className="ql-formats">
                    <select className="ql-header">
                      <option value="1">Heading 1</option>
                      <option value="2">Heading 2</option>
                      <option value="3">Heading 3</option>
                      <option selected>Normal</option>
                    </select>
                  </span>
                  <span className="ql-formats">
                    <button className="ql-bold" title="Bold"></button>
                    <button className="ql-italic" title="Italic"></button>
                    <button className="ql-underline" title="Underline"></button>
                    <button className="ql-strike" title="Strike"></button>
                  </span>
                  <span className="ql-formats">
                    <select className="ql-color" title="Text Color"></select>
                    <select className="ql-background" title="Background Color"></select>
                  </span>
                  <span className="ql-formats">
                    <button className="ql-list" value="ordered" title="Numbered List"></button>
                    <button className="ql-list" value="bullet" title="Bullet List"></button>
                    <button className="ql-indent" value="-1" title="Decrease Indent"></button>
                    <button className="ql-indent" value="+1" title="Increase Indent"></button>
                  </span>
                  <span className="ql-formats">
                    <select className="ql-align" title="Text Align"></select>
                  </span>
                  <span className="ql-formats">
                    <button className="ql-blockquote" title="Blockquote"></button>
                    <button className="ql-code-block" title="Code Block"></button>
                  </span>
                  <span className="ql-formats">
                    <button className="ql-link" title="Link"></button>
                    <button className="ql-image" title="Image"></button>
                  </span>
                  <span className="ql-formats">
                    <button className="ql-clean" title="Remove Formatting"></button>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="max-w-none mx-auto flex justify-center">
            {/* A4 Page Container */}
            <div className="bg-white shadow-card" style={{
              width: '210mm',
              minHeight: '297mm',
              maxWidth: '210mm',
              padding: '20mm',
              margin: '20px auto',
              position: 'relative',
              borderRadius: '0 0 12px 12px'
            }}>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={setContent}
              onChangeSelection={(range, source, editor) => {
                // Track text selection for AI context
                if (range && range.length > 0) {
                  const selectedText = editor.getText(range.index, range.length);
                  setSelectedText(selectedText.trim());
                } else {
                  setSelectedText('');
                }
              }}
              modules={{
                toolbar: '#toolbar'
              }}
              formats={formats}
              placeholder="Start writing your document here..."
              className="bg-white border-none"
            />
            </div>
          </div>
        </div>
        </div>
        
        {/* Uhuru AI Panel (Right Rail) */}
        {showUhuruPanel && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-80 flex-shrink-0 bg-white border-l border-borders shadow-card flex flex-col"
          >
            {/* Panel Header */}
            <div className="p-4 border-b border-borders bg-gradient-to-r from-teal/5 to-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-12 bg-teal/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-teal" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy">Uhuru AI</h3>
                    <p className="text-xs text-navy/70">Writing assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUhuruPanel(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-navy/70"
                  title="Close AI panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Thinking State Pill */}
              {isAiThinking && (
                <div className="flex items-center gap-2 px-3 py-2 bg-sand-50 border border-teal/20 rounded-xl">
                  <div className="flex space-x-1">
                    <div className={`w-2 h-2 bg-teal rounded-full animate-pulse ${
                      selectedModel === '2.1' ? 'animate-bounce' : ''
                    }`}></div>
                    <div className={`w-2 h-2 bg-teal rounded-full animate-pulse ${
                      selectedModel === '2.1' ? 'animate-bounce' : ''
                    }`} style={{ animationDelay: '120ms' }}></div>
                    <div className={`w-2 h-2 bg-teal rounded-full animate-pulse ${
                      selectedModel === '2.1' ? 'animate-bounce' : ''
                    }`} style={{ animationDelay: '240ms' }}></div>
                  </div>
                  <span className="text-xs font-medium text-navy">
                    {aiThinkingMessage}
                  </span>
                </div>
              )}
            </div>
            
            {/* Panel Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Quick Actions */}
              <div className="p-4 border-b border-borders">
                <h4 className="text-sm font-semibold text-navy mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAiPromptInput('Draft a document about: ')}
                    className="p-3 rounded-12 border border-borders hover:border-teal/30 hover:bg-teal/5 text-left transition-colors"
                  >
                    <div className="text-sm font-medium text-navy">Draft</div>
                    <div className="text-xs text-navy/70">Create new content</div>
                  </button>
                  
                  <button
                    onClick={() => setAiPromptInput('Rewrite the selected text to: ')}
                    className="p-3 rounded-12 border border-borders hover:border-teal/30 hover:bg-teal/5 text-left transition-colors"
                  >
                    <div className="text-sm font-medium text-navy">Rewrite</div>
                    <div className="text-xs text-navy/70">Improve text</div>
                  </button>
                  
                  <button
                    onClick={() => setAiPromptInput('Summarize this content: ')}
                    className="p-3 rounded-12 border border-borders hover:border-teal/30 hover:bg-teal/5 text-left transition-colors"
                  >
                    <div className="text-sm font-medium text-navy">Summarize</div>
                    <div className="text-xs text-navy/70">Key points</div>
                  </button>
                  
                  <button
                    onClick={() => setAiPromptInput('Create an outline for: ')}
                    className="p-3 rounded-12 border border-borders hover:border-teal/30 hover:bg-teal/5 text-left transition-colors"
                  >
                    <div className="text-sm font-medium text-navy">Outline</div>
                    <div className="text-xs text-navy/70">Structure ideas</div>
                  </button>
                </div>
              </div>
              
              {/* Context Control */}
              <div className="p-4 border-b border-borders">
                <h4 className="text-sm font-semibold text-navy mb-3">Context</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="selection"
                      checked={aiContext === 'selection'}
                      onChange={(e) => setAiContext(e.target.value as any)}
                      className="w-4 h-4 text-teal focus:ring-teal focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-navy">
                      Selection {selectedText && `(${selectedText.length} chars)`}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="whole_doc"
                      checked={aiContext === 'whole_doc'}
                      onChange={(e) => setAiContext(e.target.value as any)}
                      className="w-4 h-4 text-teal focus:ring-teal focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-navy">
                      Whole doc ({content.length} chars)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="none"
                      checked={aiContext === 'none'}
                      onChange={(e) => setAiContext(e.target.value as any)}
                      className="w-4 h-4 text-teal focus:ring-teal focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-navy">None/blank</span>
                  </label>
                </div>
              </div>
              
              {/* Tone Selection */}
              <div className="p-4 border-b border-borders">
                <h4 className="text-sm font-semibold text-navy mb-3">Tone</h4>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value as any)}
                  className="w-full px-3 py-2 border border-borders rounded-12 bg-white text-navy focus:ring-2 focus:ring-teal focus:border-teal"
                >
                  <option value="neutral">Neutral</option>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="academic">Academic</option>
                </select>
              </div>
              
              {/* Language Selection */}
              <div className="p-4 border-b border-borders">
                <h4 className="text-sm font-semibold text-navy mb-3">Language</h4>
                <select
                  value={aiLanguage}
                  onChange={(e) => setAiLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-borders rounded-12 bg-white text-navy focus:ring-2 focus:ring-teal focus:border-teal"
                >
                  <option value="english">English</option>
                  <option value="setswana">Setswana</option>
                  <option value="swahili">Swahili</option>
                  <option value="french">French</option>
                </select>
              </div>
              
              {/* Insert Mode */}
              <div className="p-4 border-b border-borders">
                <h4 className="text-sm font-semibold text-navy mb-3">Insert As</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="replace"
                      checked={aiInsertMode === 'replace'}
                      onChange={(e) => setAiInsertMode(e.target.value as any)}
                      className="w-4 h-4 text-teal focus:ring-teal focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-navy">Replace</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="insert_below"
                      checked={aiInsertMode === 'insert_below'}
                      onChange={(e) => setAiInsertMode(e.target.value as any)}
                      className="w-4 h-4 text-teal focus:ring-teal focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-navy">Insert below</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="copy_to_clipboard"
                      checked={aiInsertMode === 'copy_to_clipboard'}
                      onChange={(e) => setAiInsertMode(e.target.value as any)}
                      className="w-4 h-4 text-teal focus:ring-teal focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-navy">Copy to clipboard</span>
                  </label>
                </div>
              </div>
              
              {/* AI Input and Run */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">
                    What would you like to do?
                  </label>
                  <textarea
                    value={aiPromptInput}
                    onChange={(e) => setAiPromptInput(e.target.value)}
                    placeholder="e.g., Draft a business proposal, Rewrite this paragraph to be more concise..."
                    rows={3}
                    className="w-full px-3 py-2 border border-borders rounded-12 bg-white text-navy placeholder:text-navy/50 focus:ring-2 focus:ring-teal focus:border-teal resize-none"
                  />
                </div>
                
                <button
                  onClick={() => {/* TODO: Implement handleRunAI */}}
                  disabled={!aiPromptInput.trim() || isAiThinking}
                  className="w-full px-4 py-3 bg-teal text-white rounded-12 hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-card flex items-center justify-center gap-2"
                >
                  {isAiThinking ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Run
                    </>
                  )}
                </button>
              </div>
              
              {/* AI Error Display */}
              {aiError && (
                <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-12">
                  <p className="text-sm text-red-700">{aiError}</p>
                  <button
                    onClick={() => setAiError(null)}
                    className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              
              {/* AI Result Card */}
              {aiResult && !isAiThinking && (
                <div className="mx-4 mb-4 border border-borders rounded-12 bg-white shadow-card">
                  <div className="p-3 border-b border-borders">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-navy">Result Preview</span>
                      <div className="flex items-center gap-1 text-xs text-navy/70">
                        <span>{selectedModel}</span>
                        {aiResult.latency && <span>• {aiResult.latency}ms</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 max-h-48 overflow-y-auto">
                    <div className="prose prose-sm max-w-none text-navy">
                      <div className="whitespace-pre-wrap text-sm">{aiResult.content}</div>
                    </div>
                  </div>
                  
                  <div className="p-3 border-t border-borders flex items-center gap-2">
                    <button
                      onClick={() => {/* TODO: Implement handleAcceptAIResult */}}
                      className="flex-1 px-3 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors text-sm font-medium"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => {/* TODO: Implement try again */}}
                      className="px-3 py-2 border border-borders text-navy hover:bg-sand-200 rounded-lg transition-colors text-sm"
                    >
                      Try again
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(aiResult.content)}
                      className="p-2 border border-borders text-navy hover:bg-sand-200 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Model Selection */}
              <div className="p-4 border-t border-borders bg-sand-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-navy/70">Model</span>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value as any);
                      setAiThinkingMessage(e.target.value === '2.1' ? 'Deeply thinking...' : 'Uhuru is thinking...');
                    }}
                    className="text-xs border border-borders rounded-lg px-2 py-1 bg-white text-navy"
                  >
                    <option value="2.1">Uhuru 2.1</option>
                    <option value="2.0">Uhuru 2.0</option>
                    <option value="1.0">Uhuru 1.0</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Undo Toast */}
      {showUndoToast && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-navy text-white px-4 py-3 rounded-12 shadow-card flex items-center gap-3 z-50"
        >
          <span className="text-sm">Text replaced.</span>
          <button
            onClick={() => {
              if (originalContentBeforeReplace) {
                setContent(originalContentBeforeReplace);
                setOriginalContentBeforeReplace('');
                setShowUndoToast(false);
              }
            }}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            <Undo2 className="w-4 h-4 mr-1" />
            Undo
          </button>
          <button
            onClick={() => setShowUndoToast(false)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
      
    </div>
    </div>
  );
};

export default UhuruDocsPage;