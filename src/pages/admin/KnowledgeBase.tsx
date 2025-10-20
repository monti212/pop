import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Trash2, RefreshCw, Search, Filter, CheckCircle, XCircle, Clock, AlertCircle, Tag, FolderOpen, Download, Play } from 'lucide-react';
import { supabase } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { KnowledgeBaseService } from '../../services/knowledgeBaseService';

const Brand = {
  sand: '#F7F5F2',
  navy: '#19324A',
  teal: '#0096B3',
  sky: '#7DF9FF',
  orange: '#FF6A00',
  line: '#EAE7E3',
};

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  document_count: number;
}

interface Document {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  category_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count: number;
  embedding_count: number;
  metadata: any;
  uploaded_by: string;
  processed_at: string;
  created_at: string;
}

interface Stats {
  totalDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  processingDocs: number;
  completedDocs: number;
  failedDocs: number;
  totalStorageSize: number;
}

const KnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [categoriesRes, documentsRes] = await Promise.all([
        supabase.from('knowledge_base_categories').select('*').order('name'),
        supabase.from('knowledge_base_documents').select('*').order('created_at', { ascending: false })
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (documentsRes.data) {
        setDocuments(documentsRes.data);

        const totalSize = documentsRes.data.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
        const totalChunks = documentsRes.data.reduce((sum, doc) => sum + (doc.chunk_count || 0), 0);
        const totalEmbeddings = documentsRes.data.reduce((sum, doc) => sum + (doc.embedding_count || 0), 0);

        setStats({
          totalDocuments: documentsRes.data.length,
          totalChunks,
          totalEmbeddings,
          processingDocs: documentsRes.data.filter(d => d.status === 'processing').length,
          completedDocs: documentsRes.data.filter(d => d.status === 'completed').length,
          failedDocs: documentsRes.data.filter(d => d.status === 'failed').length,
          totalStorageSize: totalSize,
        });
      }
    } catch (error) {
      console.error('Error fetching knowledge base data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileUpload = async (file: File, categoryId: string, title: string) => {
    if (!user) return;

    try {
      setIsUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `knowledge-base/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('knowledge_base_documents')
        .insert({
          title: title || file.name,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath,
          category_id: categoryId === 'none' ? null : categoryId,
          status: 'pending',
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      await fetchData();
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this document? This will also remove all associated chunks and embeddings.')) {
      return;
    }

    try {
      await supabase.storage.from('user-files').remove([storagePath]);
      await supabase.from('knowledge_base_documents').delete().eq('id', docId);
      await fetchData();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleProcessDocument = async (docId: string) => {
    if (!confirm('Process this document to generate chunks and embeddings? This may take a few moments.')) {
      return;
    }

    try {
      await KnowledgeBaseService.processDocument(docId);
      alert('Document processing started! Refresh to see progress.');
      await fetchData();
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Failed to process document. Please try again.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-600 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'all' || doc.category_id === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;
    const matchesSearch = searchQuery === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: Brand.teal }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: Brand.navy }}>Knowledge Base</h2>
          <p className="text-sm mt-1" style={{ color: Brand.navy, opacity: 0.7 }}>
            Manage training documents and AI knowledge sources
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg hover:bg-white/80 transition-colors"
            style={{ color: Brand.navy, border: `1px solid ${Brand.line}` }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors"
            style={{ background: Brand.teal }}
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid md:grid-cols-4 gap-4">
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            title="Total Documents"
            value={stats.totalDocuments.toString()}
            subtitle={formatFileSize(stats.totalStorageSize)}
            color={Brand.teal}
          />
          <StatCard
            icon={<Tag className="w-5 h-5" />}
            title="Chunks Created"
            value={stats.totalChunks.toLocaleString()}
            subtitle={`${stats.totalEmbeddings.toLocaleString()} embeddings`}
            color={Brand.orange}
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            title="Completed"
            value={stats.completedDocs.toString()}
            subtitle={`${stats.processingDocs} processing`}
            color={Brand.navy}
          />
          <StatCard
            icon={<FolderOpen className="w-5 h-5" />}
            title="Categories"
            value={categories.length.toString()}
            subtitle={stats.failedDocs > 0 ? `${stats.failedDocs} failed` : 'All active'}
            color={Brand.sky}
          />
        </div>
      )}

      <div className="rounded-2xl border p-4" style={{ borderColor: Brand.line, background: '#fff' }}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4" style={{ color: Brand.navy, opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-sm"
              style={{ color: Brand.navy }}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ borderColor: Brand.line, color: Brand.navy }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ borderColor: Brand.line, color: Brand.navy }}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: Brand.navy }} />
              <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
                {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'No documents match your filters'
                  : 'No documents uploaded yet. Upload your first document to get started.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: Brand.line }}>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Document</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Category</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Status</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Size</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Chunks</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Uploaded</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: Brand.navy, opacity: 0.7 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map(doc => {
                  const category = categories.find(c => c.id === doc.category_id);
                  return (
                    <tr key={doc.id} className="border-b hover:bg-gray-50" style={{ borderColor: Brand.line }}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium" style={{ color: Brand.navy }}>{doc.title}</p>
                          <p className="text-xs opacity-60" style={{ color: Brand.navy }}>{doc.file_name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {category ? (
                          <span
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            style={{ background: `${category.color}20`, color: category.color }}
                          >
                            {category.name}
                          </span>
                        ) : (
                          <span className="text-xs opacity-40" style={{ color: Brand.navy }}>Uncategorized</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(doc.status)}
                          <span className="text-xs capitalize">{doc.status}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: Brand.navy }}>{formatFileSize(doc.file_size)}</td>
                      <td className="py-3 px-4 text-xs" style={{ color: Brand.navy }}>
                        {doc.chunk_count > 0 ? `${doc.chunk_count} chunks` : '-'}
                      </td>
                      <td className="py-3 px-4 text-xs" style={{ color: Brand.navy }}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(doc.status === 'pending' || doc.status === 'failed') && (
                            <button
                              onClick={() => handleProcessDocument(doc.id)}
                              className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                              title="Process document"
                            >
                              <Play className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDocument(doc.id, doc.storage_path)}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUploadModal && (
        <UploadModal
          categories={categories}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
          isUploading={isUploading}
        />
      )}
    </div>
  );
};

function StatCard({
  icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl p-4 border" style={{ borderColor: Brand.line, background: '#fff' }}>
      <div className="flex items-center gap-2 mb-3" style={{ color }}>
        {icon}
        <span className="text-xs uppercase tracking-wide opacity-80">{title}</span>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: Brand.navy }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: Brand.navy, opacity: 0.6 }}>
        {subtitle}
      </div>
    </div>
  );
}

function UploadModal({
  categories,
  onClose,
  onUpload,
  isUploading,
}: {
  categories: Category[];
  onClose: () => void;
  onUpload: (file: File, categoryId: string, title: string) => Promise<void>;
  isUploading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('none');
  const [dragActive, setDragActive] = useState(false);

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (!title) setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    await onUpload(file, categoryId, title || file.name);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6" style={{ maxHeight: '90vh', overflow: 'auto' }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: Brand.navy }}>Upload Document</h3>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 transition-colors ${
            dragActive ? 'border-teal bg-teal/5' : ''
          }`}
          style={{ borderColor: dragActive ? Brand.teal : Brand.line }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {file ? (
            <div>
              <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: Brand.teal }} />
              <p className="font-medium" style={{ color: Brand.navy }}>{file.name}</p>
              <p className="text-xs mt-1" style={{ color: Brand.navy, opacity: 0.6 }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                onClick={() => setFile(null)}
                className="text-xs mt-2 underline"
                style={{ color: Brand.teal }}
              >
                Choose different file
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: Brand.navy, opacity: 0.3 }} />
              <p className="mb-2" style={{ color: Brand.navy }}>Drag and drop or</p>
              <label className="inline-block px-4 py-2 rounded-lg cursor-pointer font-medium text-white"
                style={{ background: Brand.teal }}>
                Choose File
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={handleFileChange}
                />
              </label>
              <p className="text-xs mt-3" style={{ color: Brand.navy, opacity: 0.6 }}>
                Supported formats: PDF, DOC, DOCX, TXT, MD
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: Brand.navy }}>
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
              className="w-full px-3 py-2 rounded-lg border outline-none"
              style={{ borderColor: Brand.line }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: Brand.navy }}>
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border outline-none"
              style={{ borderColor: Brand.line }}
            >
              <option value="none">No Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 px-4 py-2 rounded-lg border font-medium transition-colors"
            style={{ borderColor: Brand.line, color: Brand.navy }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: Brand.teal }}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default KnowledgeBase;
