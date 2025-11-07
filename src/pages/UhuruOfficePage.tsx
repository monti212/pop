import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Download, FileText, File, ArrowLeft, Plus, Folder, Trash2, Copy, Check } from 'lucide-react';
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { user, profile } = useAuth();
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

  const handleSaveDocument = async () => {
    if (!user) {
      setError('Please sign in to save documents');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!content || content.trim() === '' || content === '<p><br></p>') {
      setError('Cannot save empty document');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

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
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
          await loadSavedDocuments();
        } else {
          setError(result.error || 'Failed to save document');
          setTimeout(() => setError(null), 3000);
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
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
          await loadSavedDocuments();
        } else {
          setError(result.error || 'Failed to create document');
          setTimeout(() => setError(null), 3000);
        }
      }
    } catch (error: any) {
      console.error('Save error:', error);
      setError(error.message || 'Failed to save document');
      setTimeout(() => setError(null), 3000);
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
        {error && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-12 shadow-card z-50 max-w-md">
            <p className="text-sm">{error}</p>
          </div>
        )}
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
            
            <div className="flex flex-col">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-3 py-1 border border-borders rounded-12 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent text-navy bg-white"
                placeholder="Document title..."
              />
              {currentDocument && (
                <span className="text-xs text-navy/50 mt-1 px-1">
                  Last saved: {new Date(currentDocument.updated_at).toLocaleString()}
                </span>
              )}
            </div>
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
              onClick={handleSaveDocument}
              disabled={isSaving || !user}
              className="px-3 py-2 rounded-12 bg-teal text-white hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 text-sm shadow-card"
              title={!user ? 'Please sign in to save' : 'Save document'}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Saving</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Saved</span>
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
      </div>
      </div>
    </div>
  );
};

export default UhuruDocsPage;
