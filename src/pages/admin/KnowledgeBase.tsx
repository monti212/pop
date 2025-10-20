import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  File,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FolderOpen,
  Plus,
  Eye,
  Download
} from 'lucide-react';
import { supabase } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

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
  created_at: string;
  processed_at: string | null;
}

const KnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [categoriesResult, documentsResult] = await Promise.all([
        supabase.from('knowledge_base_categories').select('*').order('name'),
        supabase.from('knowledge_base_documents').select('*').order('created_at', { ascending: false })
      ]);

      if (categoriesResult.data) setCategories(categoriesResult.data);
      if (documentsResult.data) setDocuments(documentsResult.data);
    } catch (error) {
      console.error('Error fetching knowledge base data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, categoryId: string) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.type !== 'application/pdf') {
          alert(`${file.name} is not a PDF file. Only PDFs are supported.`);
          continue;
        }

        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `knowledge-base/${categoryId}/${timestamp}_${sanitizedFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-files')
          .upload(storagePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert(`Failed to upload ${file.name}`);
          continue;
        }

        const { error: dbError } = await supabase
          .from('knowledge_base_documents')
          .insert({
            title: file.name.replace('.pdf', ''),
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: storagePath,
            category_id: categoryId,
            status: 'pending',
            uploaded_by: user?.id
          });

        if (dbError) {
          console.error('Database error:', dbError);
          alert(`Failed to save ${file.name} metadata`);
        }
      }

      await fetchData();
      alert('Files uploaded successfully! Processing will begin shortly.');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm(`Delete "${doc.title}"? This will also remove all associated chunks and embeddings.`)) {
      return;
    }

    try {
      await supabase.storage.from('user-files').remove([doc.storage_path]);
      await supabase.from('knowledge_base_documents').delete().eq('id', doc.id);
      await fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    }
  };

  const handleProcessDocument = async (doc: Document) => {
    try {
      const { error } = await supabase
        .from('knowledge_base_documents')
        .update({ status: 'processing' })
        .eq('id', doc.id);

      if (error) throw error;

      alert('Document processing started. This may take a few minutes.');
      await fetchData();
    } catch (error) {
      console.error('Processing error:', error);
      alert('Failed to start processing');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'all' || doc.category_id === selectedCategory;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing': return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || Brand.teal;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: Brand.teal }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: Brand.navy }}>
            Knowledge Base
          </h2>
          <p className="text-sm mt-1" style={{ color: Brand.navy, opacity: 0.7 }}>
            Upload PDFs to train Uhuru AI with custom knowledge
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg hover:bg-white/80 transition-colors"
          style={{ color: Brand.navy }}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {categories.map(category => (
          <div
            key={category.id}
            className="rounded-2xl p-4 border cursor-pointer hover:shadow-md transition-all"
            style={{
              borderColor: category.color,
              background: '#fff',
              borderWidth: selectedCategory === category.id ? '2px' : '1px'
            }}
            onClick={() => setSelectedCategory(category.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: category.color }}
              />
              <h3 className="font-medium text-sm" style={{ color: Brand.navy }}>
                {category.name}
              </h3>
            </div>
            <p className="text-xs mb-3" style={{ color: Brand.navy, opacity: 0.6 }}>
              {category.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: Brand.navy, opacity: 0.7 }}>
                {category.document_count} docs
              </span>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, category.id)}
                  disabled={uploading}
                />
                <div
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: category.color }}
                >
                  <Upload className="w-4 h-4" />
                </div>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: Brand.line, background: '#fff' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: Brand.navy, opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border"
              style={{ borderColor: Brand.line, color: Brand.navy }}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 rounded-lg border"
            style={{ borderColor: Brand.line, color: Brand.navy }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {uploading && (
          <div className="mb-4 p-4 rounded-lg" style={{ background: 'rgba(0,150,179,0.1)' }}>
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ color: Brand.teal }} />
              <span style={{ color: Brand.navy }}>Uploading files...</span>
            </div>
          </div>
        )}

        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 mx-auto mb-3" style={{ color: Brand.navy, opacity: 0.3 }} />
            <p className="text-sm" style={{ color: Brand.navy, opacity: 0.6 }}>
              No documents found. Upload PDFs to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map(doc => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border hover:shadow-sm transition-all"
                style={{ borderColor: Brand.line }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="p-2 rounded-lg"
                    style={{ background: `${getCategoryColor(doc.category_id)}15` }}
                  >
                    <File className="w-5 h-5" style={{ color: getCategoryColor(doc.category_id) }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate" style={{ color: Brand.navy }}>
                        {doc.title}
                      </h4>
                      {getStatusIcon(doc.status)}
                    </div>
                    <p className="text-xs mb-2" style={{ color: Brand.navy, opacity: 0.6 }}>
                      {doc.file_name} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <div className="flex items-center gap-4 text-xs" style={{ color: Brand.navy, opacity: 0.7 }}>
                      <span>{doc.chunk_count} chunks</span>
                      <span>{doc.embedding_count} embeddings</span>
                      <span>Uploaded {new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.status === 'pending' && (
                      <button
                        onClick={() => handleProcessDocument(doc)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        style={{ color: Brand.teal }}
                        title="Start processing"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDocument(doc)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-6" style={{ borderColor: Brand.line, background: '#fff' }}>
        <h3 className="font-semibold mb-2" style={{ color: Brand.navy }}>
          How Knowledge Base Training Works
        </h3>
        <div className="space-y-3 text-sm" style={{ color: Brand.navy, opacity: 0.8 }}>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: Brand.teal, color: '#fff' }}>1</div>
            <div>
              <strong>Upload PDFs</strong> - Click the upload button on any category card to add PDF documents
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: Brand.teal, color: '#fff' }}>2</div>
            <div>
              <strong>Automatic Processing</strong> - Documents are extracted, chunked into manageable pieces, and converted to embeddings
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: Brand.teal, color: '#fff' }}>3</div>
            <div>
              <strong>Semantic Search</strong> - When users ask questions, Uhuru searches your knowledge base and includes relevant context in responses
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: Brand.teal, color: '#fff' }}>4</div>
            <div>
              <strong>Better Answers</strong> - Uhuru AI provides more accurate, contextual responses based on your organization's knowledge
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
