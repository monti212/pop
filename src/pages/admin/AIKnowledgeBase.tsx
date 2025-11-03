import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader, Eye, Trash2, RefreshCw, AlertCircle, X as XIcon, Search, Filter, Download, Archive, TrendingUp, Database, DollarSign, Clock, Zap } from 'lucide-react';
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
  slot_number: number | null;
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

interface UploadingFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  documentId?: string;
}

type SortField = 'title' | 'created_at' | 'file_size' | 'word_count' | 'processing_status';
type SortDirection = 'asc' | 'desc';

const AIKnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState<KnowledgeDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterAndSortDocuments();
  }, [documents, searchQuery, statusFilter, formatFilter, sortField, sortDirection]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('admin_knowledge_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortDocuments = () => {
    let filtered = [...documents];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.file_name?.toLowerCase().includes(query) ||
        doc.document_type.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.processing_status === statusFilter);
    }

    if (formatFilter !== 'all') {
      filtered = filtered.filter(doc => doc.file_format === formatFilter);
    }

    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredDocuments(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (files.length > 20) {
      setError('You can upload a maximum of 20 files at once');
      return;
    }

    const newUploads: UploadingFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const MAX_FILE_SIZE = 300 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" exceeds 300MB limit`);
        continue;
      }

      const validExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (!validExtensions.includes(fileExtension)) {
        setError(`File "${file.name}" has invalid format. Only PDF, Word, Text, and Markdown files are supported.`);
        continue;
      }

      newUploads.push({
        id: `${Date.now()}-${i}`,
        file,
        status: 'pending',
        progress: 0,
      });
    }

    setUploadingFiles(prev => [...prev, ...newUploads]);
    setShowUploadZone(true);
    startUploads(newUploads);
  };

  const startUploads = async (files: UploadingFile[]) => {
    for (const uploadFile of files) {
      try {
        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f)
        );

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session');

        const fileExtension = uploadFile.file.name.toLowerCase().substring(uploadFile.file.name.lastIndexOf('.'));
        let fileFormat = 'other';
        if (fileExtension === '.pdf') fileFormat = 'pdf';
        else if (fileExtension === '.doc') fileFormat = 'doc';
        else if (fileExtension === '.docx') fileFormat = 'docx';
        else if (fileExtension === '.txt') fileFormat = 'txt';
        else if (fileExtension === '.md') fileFormat = 'md';

        // Upload to storage first
        const timestamp = Date.now();
        const sanitizedFileName = uploadFile.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `knowledge-base/${session.user.id}/${timestamp}_${sanitizedFileName}`;

        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadFile.id ? { ...f, progress: 20 } : f)
        );

        const { data: storageData, error: storageError } = await supabase.storage
          .from('user-files')
          .upload(storagePath, uploadFile.file, {
            cacheControl: '3600',
            upsert: false,
            contentType: uploadFile.file.type
          });

        if (storageError) throw storageError;

        const { data: { publicUrl } } = supabase.storage
          .from('user-files')
          .getPublicUrl(storagePath);

        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadFile.id ? { ...f, progress: 40 } : f)
        );

        // Create document record with storage path
        const { data: docData, error: insertError } = await supabase
          .from('admin_knowledge_documents')
          .insert({
            title: uploadFile.file.name.replace(/\.[^/.]+$/, ''),
            original_content: `[File stored in storage: ${storagePath}]`,
            storage_path: storagePath,
            file_url: publicUrl,
            file_name: uploadFile.file.name,
            file_size: uploadFile.file.size,
            mime_type: uploadFile.file.type,
            file_format: fileFormat,
            processing_status: 'pending',
            uploaded_by: session.user.id,
            slot_number: null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadFile.id ? { ...f, status: 'processing', progress: 60, documentId: docData.id } : f)
        );

        // Process document on backend
        const processResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-knowledge-document`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ documentId: docData.id }),
          }
        );

        if (!processResponse.ok) {
          const errorData = await processResponse.json();
          throw new Error(errorData.error || 'Failed to process document');
        }

        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadFile.id ? { ...f, status: 'completed', progress: 100 } : f)
        );

      } catch (err: any) {
        console.error('Error uploading file:', err);
        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadFile.id ? { ...f, status: 'failed', progress: 0, error: err.message } : f)
        );
      }
    }

    await fetchDocuments();
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
      handleFileSelect(e.dataTransfer.files);
    }
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

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;
    if (!confirm(`Delete ${selectedDocuments.size} selected documents? This cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('admin_knowledge_documents')
        .delete()
        .in('id', Array.from(selectedDocuments));

      if (error) throw error;
      setSelectedDocuments(new Set());
      await fetchDocuments();
    } catch (err: any) {
      console.error('Error deleting documents:', err);
      setError(err.message);
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    setSelectedDocuments(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(d => d.id)));
    }
  };

  const removeUploadingFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />;
      case 'processing':
      case 'pending':
        return <Loader className="w-4 h-4 animate-spin" style={{ color: Brand.teal }} />;
      case 'failed':
        return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Active';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalDocuments = documents.length;
  const activeDocuments = documents.filter(d => d.is_active && d.processing_status === 'completed').length;
  const totalSize = documents.reduce((sum, d) => sum + (d.file_size || 0), 0);
  const totalCost = documents.reduce((sum, d) => sum + (d.estimated_cost || 0), 0);
  const totalTokens = documents.reduce((sum, d) => sum + (d.token_count || 0), 0);
  const avgTokensPerDoc = totalDocuments > 0 ? Math.round(totalTokens / totalDocuments) : 0;

  if (loading && documents.length === 0) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: Brand.sand }}>
        <AdminSidebar />
        <div className="flex-1 flex justify-center items-center overflow-hidden">
          <Loader className="w-8 h-8 animate-spin" style={{ color: Brand.teal }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: Brand.sand }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: Brand.navy }}>
                AI Knowledge Base
              </h1>
              <p className="text-sm mt-2" style={{ color: Brand.navy, opacity: 0.7 }}>
                Manage educational documents that power Uhuru AI's teaching capabilities
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-lg font-medium transition-all hover:shadow-lg flex items-center gap-2"
                style={{ background: Brand.teal, color: '#fff' }}
              >
                <Upload className="w-4 h-4" />
                Upload Documents
              </button>
              <button
                onClick={fetchDocuments}
                className="px-4 py-2.5 rounded-lg border transition-colors hover:bg-white"
                style={{ borderColor: Brand.line, color: Brand.navy }}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-xl p-5 border" style={{ borderColor: Brand.line, background: '#fff' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Total Documents</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: Brand.navy }}>{totalDocuments}</p>
                </div>
                <Database className="w-8 h-8" style={{ color: Brand.teal, opacity: 0.3 }} />
              </div>
            </div>

            <div className="rounded-xl p-5 border" style={{ borderColor: Brand.line, background: '#fff' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Active in AI</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: Brand.navy }}>{activeDocuments}</p>
                </div>
                <TrendingUp className="w-8 h-8" style={{ color: '#10b981', opacity: 0.3 }} />
              </div>
            </div>

            <div className="rounded-xl p-5 border" style={{ borderColor: Brand.line, background: '#fff' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Total Tokens</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: Brand.navy }}>{totalTokens.toLocaleString()}</p>
                  <p className="text-xs mt-1" style={{ color: Brand.navy, opacity: 0.5 }}>Avg: {avgTokensPerDoc.toLocaleString()}</p>
                </div>
                <Zap className="w-8 h-8" style={{ color: Brand.orange, opacity: 0.3 }} />
              </div>
            </div>

            <div className="rounded-xl p-5 border" style={{ borderColor: Brand.line, background: '#fff' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Storage Used</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: Brand.navy }}>{formatFileSize(totalSize)}</p>
                </div>
                <Archive className="w-8 h-8" style={{ color: Brand.orange, opacity: 0.3 }} />
              </div>
            </div>

            <div className="rounded-xl p-5 border" style={{ borderColor: Brand.line, background: '#fff' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Total Cost</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: Brand.navy }}>${totalCost.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8" style={{ color: Brand.teal, opacity: 0.3 }} />
              </div>
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

          {uploadingFiles.length > 0 && (
            <div className="rounded-xl border p-5" style={{ borderColor: Brand.line, background: '#fff' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold" style={{ color: Brand.navy }}>
                  Upload Progress ({uploadingFiles.filter(f => f.status !== 'completed').length} remaining)
                </h3>
                <button
                  onClick={() => setUploadingFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'uploading' || f.status === 'processing'))}
                  className="text-xs px-3 py-1 rounded-lg border"
                  style={{ borderColor: Brand.line, color: Brand.navy }}
                >
                  Clear Completed
                </button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {uploadingFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: Brand.line }}>
                    <FileText className="w-4 h-4 flex-shrink-0" style={{ color: Brand.teal }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: Brand.navy }}>{file.file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${file.progress}%`,
                              background: file.status === 'failed' ? '#ef4444' : Brand.teal,
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
                          {file.progress}%
                        </span>
                      </div>
                      {file.error && (
                        <p className="text-xs text-red-600 mt-1">{file.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {file.status === 'failed' && <XCircle className="w-5 h-5 text-red-600" />}
                      {(file.status === 'uploading' || file.status === 'processing') && (
                        <Loader className="w-5 h-5 animate-spin" style={{ color: Brand.teal }} />
                      )}
                      {file.status === 'pending' && (
                        <Clock className="w-5 h-5" style={{ color: Brand.navy, opacity: 0.3 }} />
                      )}
                      {(file.status === 'pending' || file.status === 'failed' || file.status === 'completed') && (
                        <button
                          onClick={() => removeUploadingFile(file.id)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <XIcon className="w-4 h-4" style={{ color: Brand.navy }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className={`rounded-xl border-2 border-dashed p-12 transition-all ${dragActive ? 'bg-blue-50' : ''}`}
            style={{ borderColor: dragActive ? Brand.teal : Brand.line, background: dragActive ? '#e0f7fa' : '#fff' }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: Brand.teal, opacity: 0.5 }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: Brand.navy }}>
                Drag and drop files here
              </h3>
              <p className="text-sm mb-4" style={{ color: Brand.navy, opacity: 0.6 }}>
                or click the Upload Documents button above
              </p>
              <p className="text-xs" style={{ color: Brand.navy, opacity: 0.5 }}>
                Supports PDF, Word, Text, and Markdown files up to 300MB each. Maximum 20 files per batch.
              </p>
            </div>
          </div>

          <div className="rounded-xl border" style={{ borderColor: Brand.line, background: '#fff' }}>
            <div className="p-5 border-b" style={{ borderColor: Brand.line }}>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: Brand.navy, opacity: 0.4 }} />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border outline-none focus:ring-2 transition-all"
                    style={{ borderColor: Brand.line, color: Brand.navy }}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border outline-none"
                    style={{ borderColor: Brand.line, color: Brand.navy }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="processing">Processing</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                  <select
                    value={formatFilter}
                    onChange={(e) => setFormatFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border outline-none"
                    style={{ borderColor: Brand.line, color: Brand.navy }}
                  >
                    <option value="all">All Formats</option>
                    <option value="pdf">PDF</option>
                    <option value="docx">Word (DOCX)</option>
                    <option value="doc">Word (DOC)</option>
                    <option value="txt">Text</option>
                    <option value="md">Markdown</option>
                  </select>
                </div>
              </div>

              {selectedDocuments.size > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: Brand.navy }}>
                    {selectedDocuments.size} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: '#ef4444', color: '#fff' }}
                  >
                    Delete Selected
                  </button>
                  <button
                    onClick={() => setSelectedDocuments(new Set())}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border"
                    style={{ borderColor: Brand.line, color: Brand.navy }}
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: Brand.sand }}>
                  <tr>
                    <th className="px-5 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={filteredDocuments.length > 0 && selectedDocuments.size === filteredDocuments.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-opacity-50"
                      style={{ color: Brand.navy }}
                      onClick={() => handleSort('title')}
                    >
                      Document {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: Brand.navy }}>
                      Format
                    </th>
                    <th
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-opacity-50"
                      style={{ color: Brand.navy }}
                      onClick={() => handleSort('file_size')}
                    >
                      Size {sortField === 'file_size' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-opacity-50"
                      style={{ color: Brand.navy }}
                      onClick={() => handleSort('word_count')}
                    >
                      Words {sortField === 'word_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: Brand.navy }}>
                      Tokens
                    </th>
                    <th
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-opacity-50"
                      style={{ color: Brand.navy }}
                      onClick={() => handleSort('processing_status')}
                    >
                      Status {sortField === 'processing_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-opacity-50"
                      style={{ color: Brand.navy }}
                      onClick={() => handleSort('created_at')}
                    >
                      Uploaded {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: Brand.navy }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: Brand.line }}>
                  {filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: Brand.navy, opacity: 0.2 }} />
                        <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                          {documents.length === 0 ? 'No documents uploaded yet' : 'No documents match your filters'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.has(doc.id)}
                            onChange={() => toggleDocumentSelection(doc.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 flex-shrink-0" style={{ color: Brand.teal }} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: Brand.navy }}>{doc.title}</p>
                              {doc.file_name && (
                                <p className="text-xs truncate" style={{ color: Brand.navy, opacity: 0.5 }}>{doc.file_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-1 rounded text-xs font-medium uppercase" style={{ background: Brand.sand, color: Brand.navy }}>
                            {doc.file_format || 'N/A'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: Brand.navy }}>
                          {formatFileSize(doc.file_size)}
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: Brand.navy }}>
                          {doc.word_count ? doc.word_count.toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium" style={{ color: Brand.orange }}>
                          {doc.token_count ? doc.token_count.toLocaleString() : '-'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(doc.processing_status)}
                            <span className="text-sm" style={{ color: Brand.navy }}>
                              {getStatusText(doc.processing_status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color: Brand.navy }}>
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingDocument(doc)}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" style={{ color: Brand.teal }} />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Delete document"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
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
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold" style={{ color: Brand.navy }}>
                    {viewingDocument.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-sm" style={{ color: Brand.navy, opacity: 0.7 }}>
                    <span className="px-2 py-1 rounded text-xs font-medium uppercase" style={{ background: Brand.sand }}>
                      {viewingDocument.file_format || 'N/A'}
                    </span>
                    <span>{formatFileSize(viewingDocument.file_size)}</span>
                    {viewingDocument.word_count && viewingDocument.word_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{viewingDocument.word_count.toLocaleString()} words</span>
                      </>
                    )}
                    {viewingDocument.page_count && viewingDocument.page_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{viewingDocument.page_count} pages</span>
                      </>
                    )}
                  </div>
                  {viewingDocument.extraction_quality_score && (
                    <div className="mt-2">
                      <span className="text-xs font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>
                        Extraction Quality: {viewingDocument.extraction_quality_score.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <XIcon className="w-5 h-5" style={{ color: Brand.navy }} />
                </button>
              </div>
              {viewingDocument.error_message && (
                <div className="mt-4 p-3 rounded-lg" style={{ background: '#fef2f2', borderLeft: '3px solid #ef4444' }}>
                  <p className="text-xs font-medium" style={{ color: '#991b1b' }}>Processing Error:</p>
                  <p className="text-xs mt-1" style={{ color: '#7f1d1d' }}>{viewingDocument.error_message}</p>
                </div>
              )}
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {viewingDocument.ai_summary ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-lg mb-3" style={{ color: Brand.navy }}>
                      AI Summary
                    </h4>
                    <div className="prose prose-sm max-w-none" style={{ color: Brand.navy }}>
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                        {viewingDocument.ai_summary}
                      </pre>
                    </div>
                  </div>

                  {viewingDocument.key_concepts?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-lg mb-3" style={{ color: Brand.navy }}>
                        Key Concepts ({viewingDocument.key_concepts.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {viewingDocument.key_concepts.map((concept: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-4 rounded-lg border"
                            style={{ borderColor: Brand.line }}
                          >
                            <p className="font-medium text-sm mb-1" style={{ color: Brand.navy }}>
                              {concept.concept}
                            </p>
                            <p className="text-xs" style={{ color: Brand.navy, opacity: 0.7 }}>
                              {concept.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg" style={{ background: Brand.sand }}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Document Type</p>
                      <p className="text-sm font-medium mt-1" style={{ color: Brand.navy }}>{viewingDocument.document_type}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Grade Level</p>
                      <p className="text-sm font-medium mt-1" style={{ color: Brand.navy }}>{viewingDocument.grade_level}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Subject</p>
                      <p className="text-sm font-medium mt-1" style={{ color: Brand.navy }}>{viewingDocument.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Status</p>
                      <p className="text-sm font-medium mt-1" style={{ color: Brand.navy }}>
                        {viewingDocument.is_active ? 'Active in AI' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Loader className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: Brand.teal }} />
                  <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                    Document is being processed. AI summary will appear here once complete.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t" style={{ borderColor: Brand.line }}>
              <button
                onClick={() => setViewingDocument(null)}
                className="px-6 py-2.5 rounded-lg w-full font-medium"
                style={{ background: Brand.teal, color: '#fff' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIKnowledgeBase;
