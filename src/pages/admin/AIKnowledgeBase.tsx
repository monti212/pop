import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader, Eye, Trash2, RefreshCw, AlertCircle, X as XIcon } from 'lucide-react';
import { supabase } from '../../services/authService';
import AdminSidebar from '../../components/AdminSidebar';

const Brand = {
  sand: '#F7F5F2',
  navy: '#19324A',
  teal: '#0096B3',
  sky: '#7DF9FF',
  orange: '#FF6A00',
  line: '#EAE7E3',
};

interface KnowledgeDocument {
  id: string;
  slot_number: number;
  title: string;
  document_type: string;
  grade_level: string;
  subject: string;
  original_content: string;
  processing_status: string;
  ai_summary: string | null;
  key_concepts: any[];
  is_active: boolean;
  file_name: string | null;
  file_size: number | null;
  file_format: string | null;
  page_count: number | null;
  word_count: number | null;
  extraction_quality_score: number | null;
  token_count: number | null;
  estimated_cost: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

interface QueuedFile {
  id: string;
  file: File;
  slotNumber: number;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

const AIKnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [viewingDocument, setViewingDocument] = useState<KnowledgeDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const slots = [1, 2, 3, 4, 5, 6];
  const slotLabels = {
    1: 'Teaching Methodology 1',
    2: 'Teaching Methodology 2',
    3: 'Ghana Syllabus - KG',
    4: 'Ghana Syllabus - Primary',
    5: 'Ghana Syllabus - Upper',
    6: 'Additional Guidelines'
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('admin_knowledge_documents')
        .select('*')
        .order('slot_number', { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (slotNumber: number, file: File) => {
    try {
      setUploadingSlot(slotNumber);
      setError(null);

      // Validate file size (300MB limit)
      const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the 300MB limit`);
      }

      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-word',
        'text/plain',
        'text/markdown'
      ];

      const validExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        throw new Error('Invalid file type. Please upload PDF, Word (DOC/DOCX), Text, or Markdown files.');
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }

        const existingDoc = documents.find(d => d.slot_number === slotNumber);

        let documentId: string;

        // Determine file format from extension and mime type
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        let fileFormat = 'other';
        if (fileExtension === '.pdf') fileFormat = 'pdf';
        else if (fileExtension === '.doc') fileFormat = 'doc';
        else if (fileExtension === '.docx') fileFormat = 'docx';
        else if (fileExtension === '.txt') fileFormat = 'txt';
        else if (fileExtension === '.md') fileFormat = 'md';

        if (existingDoc) {
          const { data, error } = await supabase
            .from('admin_knowledge_documents')
            .update({
              title: file.name.replace(/\.[^/.]+$/, ''),
              original_content: content,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              file_format: fileFormat,
              processing_status: 'pending',
              is_active: false,
              ai_summary: null,
              key_concepts: [],
              processed_at: null,
              error_message: null,
              word_count: 0,
              page_count: 0,
              token_count: 0
            })
            .eq('id', existingDoc.id)
            .select()
            .single();

          if (error) throw error;
          documentId = data.id;
        } else {
          const { data, error } = await supabase
            .from('admin_knowledge_documents')
            .insert({
              slot_number: slotNumber,
              title: file.name.replace(/\.[^/.]+$/, ''),
              original_content: content,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              file_format: fileFormat,
              processing_status: 'pending',
              uploaded_by: session.user.id
            })
            .select()
            .single();

          if (error) throw error;
          documentId = data.id;
        }

        const processResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-knowledge-document`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ documentId }),
          }
        );

        if (!processResponse.ok) {
          const errorData = await processResponse.json();
          throw new Error(errorData.error || 'Failed to process document');
        }

        await fetchDocuments();
      };

      reader.onerror = () => {
        throw new Error('Failed to read file');
      };

      reader.readAsText(file);
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError(err.message);
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleMultipleFilesSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (files.length > 10) {
      setError('You can upload a maximum of 10 files at once');
      return;
    }

    const newQueue: QueuedFile[] = [];
    let availableSlot = 1;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      while (documents.some(d => d.slot_number === availableSlot) && availableSlot <= 6) {
        availableSlot++;
      }

      if (availableSlot > 6) {
        setError(`Only ${i} file(s) can be uploaded. All slots are occupied.`);
        break;
      }

      newQueue.push({
        id: `${Date.now()}-${i}`,
        file,
        slotNumber: availableSlot,
        status: 'queued',
        progress: 0,
      });

      availableSlot++;
    }

    setFileQueue(newQueue);
    setShowUploadModal(true);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleFilesSelect(e.dataTransfer.files);
    }
  };

  const removeFromQueue = (fileId: string) => {
    setFileQueue(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadQueuedFiles = async () => {
    for (const queuedFile of fileQueue) {
      if (queuedFile.status !== 'queued') continue;

      try {
        setFileQueue(prev =>
          prev.map(f => f.id === queuedFile.id ? { ...f, status: 'uploading', progress: 10 } : f)
        );

        await handleFileUpload(queuedFile.slotNumber, queuedFile.file);

        setFileQueue(prev =>
          prev.map(f => f.id === queuedFile.id ? { ...f, status: 'completed', progress: 100 } : f)
        );
      } catch (err: any) {
        setFileQueue(prev =>
          prev.map(f =>
            f.id === queuedFile.id
              ? { ...f, status: 'failed', progress: 0, error: err.message }
              : f
          )
        );
      }
    }

    await fetchDocuments();
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('admin_knowledge_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      await fetchDocuments();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err.message);
    }
  };

  const getDocumentForSlot = (slotNumber: number): KnowledgeDocument | undefined => {
    return documents.find(d => d.slot_number === slotNumber);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />;
      case 'processing':
      case 'pending':
        return <Loader className="w-5 h-5 animate-spin" style={{ color: Brand.teal }} />;
      case 'failed':
        return <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Active in AI';
      case 'processing':
        return 'Processing...';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen" style={{ background: Brand.sand }}>
        <AdminSidebar />
        <div className="flex-1 flex justify-center items-center">
          <Loader className="w-8 h-8 animate-spin" style={{ color: Brand.teal }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: Brand.sand }}>
      <AdminSidebar />
      <div className="flex-1 p-6">
        <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: Brand.navy }}>
            AI Knowledge Base
          </h2>
          <p className="text-sm mt-1" style={{ color: Brand.navy, opacity: 0.7 }}>
            Upload PDF, Word, or text documents (max 300MB). AI processes and learns automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <label>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => handleMultipleFilesSelect(e.target.files)}
            />
            <div
              className="px-4 py-2 rounded-lg border transition-colors hover:bg-white cursor-pointer flex items-center gap-2"
              style={{ borderColor: Brand.teal, color: Brand.teal, background: 'white' }}
            >
              <Upload className="w-4 h-4" />
              <span className="font-medium">Bulk Upload</span>
            </div>
          </label>
          <button
            onClick={fetchDocuments}
            className="px-4 py-2 rounded-lg border transition-colors hover:bg-white"
            style={{ borderColor: Brand.line, color: Brand.navy }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slotNumber) => {
          const doc = getDocumentForSlot(slotNumber);
          const isUploading = uploadingSlot === slotNumber;

          return (
            <div
              key={slotNumber}
              className="rounded-2xl border p-6"
              style={{ borderColor: Brand.line, background: '#fff' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: Brand.navy }}>
                    Slot {slotNumber}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                    {slotLabels[slotNumber as keyof typeof slotLabels]}
                  </p>
                </div>
                {doc && (
                  <div className="flex items-center gap-1">
                    {getStatusIcon(doc.processing_status)}
                  </div>
                )}
              </div>

              {doc ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" style={{ color: Brand.teal }} />
                      <span className="text-sm font-medium" style={{ color: Brand.navy }}>
                        {doc.title}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                      Status: {getStatusText(doc.processing_status)}
                    </p>
                    {doc.file_size && (
                      <p className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                        Size: {doc.file_size < 1024 * 1024
                          ? `${(doc.file_size / 1024).toFixed(1)} KB`
                          : `${(doc.file_size / 1024 / 1024).toFixed(2)} MB`}
                        {doc.file_format && ` • ${doc.file_format.toUpperCase()}`}
                      </p>
                    )}
                    {doc.word_count && doc.word_count > 0 && (
                      <p className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                        {doc.word_count.toLocaleString()} words
                        {doc.page_count && doc.page_count > 0 && ` • ${doc.page_count} pages`}
                      </p>
                    )}
                  </div>

                  {doc.processing_status === 'completed' && doc.key_concepts?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: Brand.navy }}>
                        Key Concepts: {doc.key_concepts.length}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setViewingDocument(doc)}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: Brand.teal, color: '#fff' }}
                    >
                      <Eye className="w-3 h-3 inline mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: '#ef4444', color: '#fff' }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <label className="block">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(slotNumber, file);
                      }}
                      disabled={isUploading}
                    />
                    <div
                      className="cursor-pointer text-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
                      style={{ borderColor: Brand.line, color: Brand.navy }}
                    >
                      Replace
                    </div>
                  </label>
                </div>
              ) : (
                <label className="block">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(slotNumber, file);
                    }}
                    disabled={isUploading}
                  />
                  <div
                    className="cursor-pointer flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed transition-colors hover:bg-gray-50"
                    style={{ borderColor: Brand.line }}
                  >
                    {isUploading ? (
                      <Loader className="w-8 h-8 animate-spin" style={{ color: Brand.teal }} />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2" style={{ color: Brand.teal }} />
                        <span className="text-xs font-medium" style={{ color: Brand.navy }}>
                          Upload Document
                        </span>
                        <span className="text-xs mt-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                          PDF, Word, Text (Max 300MB)
                        </span>
                      </>
                    )}
                  </div>
                </label>
              )}
            </div>
          );
        })}
      </div>

      {viewingDocument && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingDocument(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b" style={{ borderColor: Brand.line }}>
              <h3 className="text-xl font-bold" style={{ color: Brand.navy }}>
                {viewingDocument.title}
              </h3>
              <p className="text-sm mt-1" style={{ color: Brand.navy, opacity: 0.7 }}>
                Slot {viewingDocument.slot_number} • {viewingDocument.document_type}
                {viewingDocument.file_format && ` • ${viewingDocument.file_format.toUpperCase()}`}
              </p>
              {viewingDocument.word_count && viewingDocument.word_count > 0 && (
                <p className="text-xs mt-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                  {viewingDocument.word_count.toLocaleString()} words
                  {viewingDocument.page_count && viewingDocument.page_count > 0 && ` • ${viewingDocument.page_count} pages`}
                  {viewingDocument.extraction_quality_score && ` • Quality: ${viewingDocument.extraction_quality_score.toFixed(0)}%`}
                </p>
              )}
              {viewingDocument.error_message && (
                <div className="mt-2 p-2 rounded-lg" style={{ background: '#fef2f2', borderLeft: '3px solid #ef4444' }}>
                  <p className="text-xs font-medium" style={{ color: '#991b1b' }}>Processing Error:</p>
                  <p className="text-xs mt-1" style={{ color: '#7f1d1d' }}>{viewingDocument.error_message}</p>
                </div>
              )}
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {viewingDocument.ai_summary ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: Brand.navy }}>
                      AI Summary
                    </h4>
                    <div
                      className="prose prose-sm max-w-none"
                      style={{ color: Brand.navy }}
                    >
                      <pre className="whitespace-pre-wrap text-sm">
                        {viewingDocument.ai_summary}
                      </pre>
                    </div>
                  </div>

                  {viewingDocument.key_concepts?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: Brand.navy }}>
                        Key Concepts ({viewingDocument.key_concepts.length})
                      </h4>
                      <div className="space-y-2">
                        {viewingDocument.key_concepts.map((concept: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border"
                            style={{ borderColor: Brand.line }}
                          >
                            <p className="font-medium text-sm" style={{ color: Brand.navy }}>
                              {concept.concept}
                            </p>
                            <p className="text-xs mt-1" style={{ color: Brand.navy, opacity: 0.7 }}>
                              {concept.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                    Document is being processed. AI summary will appear here once complete.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t" style={{ borderColor: Brand.line }}>
              <button
                onClick={() => setViewingDocument(null)}
                className="px-4 py-2 rounded-lg w-full font-medium"
                style={{ background: Brand.teal, color: '#fff' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (fileQueue.every(f => f.status !== 'uploading')) {
              setShowUploadModal(false);
              setFileQueue([]);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b" style={{ borderColor: Brand.line }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold" style={{ color: Brand.navy }}>
                    Upload Queue ({fileQueue.length} files)
                  </h3>
                  <p className="text-sm mt-1" style={{ color: Brand.navy, opacity: 0.7 }}>
                    Review and manage files before uploading
                  </p>
                </div>
                {fileQueue.every(f => f.status !== 'uploading') && (
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setFileQueue([]);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <XIcon className="w-5 h-5" style={{ color: Brand.navy }} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-3">
                {fileQueue.map((queuedFile) => (
                  <div
                    key={queuedFile.id}
                    className="p-4 rounded-lg border"
                    style={{ borderColor: Brand.line, background: '#fff' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4" style={{ color: Brand.teal }} />
                          <span className="font-medium text-sm" style={{ color: Brand.navy }}>
                            {queuedFile.file.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                          <span>
                            {queuedFile.file.size < 1024 * 1024
                              ? `${(queuedFile.file.size / 1024).toFixed(1)} KB`
                              : `${(queuedFile.file.size / 1024 / 1024).toFixed(2)} MB`}
                          </span>
                          <span>•</span>
                          <span>Slot {queuedFile.slotNumber}</span>
                          <span>•</span>
                          <span className="capitalize">{queuedFile.status}</span>
                        </div>
                        {queuedFile.status === 'uploading' && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${queuedFile.progress}%`,
                                  background: Brand.teal,
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {queuedFile.error && (
                          <p className="text-xs text-red-600 mt-1">{queuedFile.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {queuedFile.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {queuedFile.status === 'failed' && (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        {queuedFile.status === 'uploading' && (
                          <Loader className="w-5 h-5 animate-spin" style={{ color: Brand.teal }} />
                        )}
                        {queuedFile.status === 'queued' && (
                          <button
                            onClick={() => removeFromQueue(queuedFile.id)}
                            className="p-1 rounded hover:bg-red-50"
                          >
                            <XIcon className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t" style={{ borderColor: Brand.line }}>
              <div className="flex gap-3">
                {fileQueue.some(f => f.status === 'queued') && (
                  <button
                    onClick={uploadQueuedFiles}
                    disabled={fileQueue.every(f => f.status !== 'queued')}
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    style={{ background: Brand.teal, color: '#fff' }}
                  >
                    Upload All ({fileQueue.filter(f => f.status === 'queued').length})
                  </button>
                )}
                {fileQueue.every(f => f.status !== 'uploading' && f.status !== 'queued') && (
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setFileQueue([]);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg font-medium"
                    style={{ background: Brand.teal, color: '#fff' }}
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default AIKnowledgeBase;
