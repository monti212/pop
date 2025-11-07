import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen, FileText, Plus, Search, Download, Eye, Trash2,
  Edit3, X, Loader, AlertTriangle, Calendar, Tag, File
} from 'lucide-react';
import {
  getClassFolders,
  getClassDocuments,
  getFolderDocuments,
  createDocument,
  deleteDocument,
  ClassFolder,
  ClassDocument,
  DocumentWithFolder
} from '../services/classDocumentService';

interface ClassDocumentsViewProps {
  classId: string;
  className: string;
}

const ClassDocumentsView: React.FC<ClassDocumentsViewProps> = ({ classId, className }) => {
  const [folders, setFolders] = useState<ClassFolder[]>([]);
  const [documents, setDocuments] = useState<DocumentWithFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ClassFolder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadFoldersAndDocuments();
  }, [classId]);

  const loadFoldersAndDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [foldersResult, documentsResult] = await Promise.all([
        getClassFolders(classId),
        getClassDocuments(classId)
      ]);

      if (foldersResult.success && foldersResult.data) {
        setFolders(foldersResult.data);
      }

      if (documentsResult.success && documentsResult.data) {
        setDocuments(documentsResult.data);
      }

      if (!foldersResult.success) {
        setError(foldersResult.error || 'Failed to load folders');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = async (folder: ClassFolder) => {
    setSelectedFolder(folder);
    setIsLoading(true);

    try {
      const result = await getFolderDocuments(folder.id);
      if (result.success && result.data) {
        setDocuments(result.data as DocumentWithFolder[]);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load folder documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowAllDocuments = () => {
    setSelectedFolder(null);
    loadFoldersAndDocuments();
  };

  const getFilteredDocuments = () => {
    if (!searchTerm) return documents;

    return documents.filter(doc =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.content && doc.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const getFolderIcon = (folderType: string) => {
    switch (folderType) {
      case 'lesson_plans': return '📚';
      case 'notes': return '📝';
      case 'reports': return '📊';
      case 'resources': return '🗂️';
      default: return '📁';
    }
  };

  const getDocumentIcon = (docType: string) => {
    switch (docType) {
      case 'lesson_plan': return '📚';
      case 'note': return '📝';
      case 'report': return '📊';
      case 'resource': return '🗂️';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredDocuments = getFilteredDocuments();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader className="w-12 h-12 text-teal animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Folders Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {folders.map((folder) => (
          <motion.button
            key={folder.id}
            onClick={() => handleFolderClick(folder)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
              selectedFolder?.id === folder.id
                ? 'border-teal bg-teal/5 shadow-md'
                : 'border-gray-200 bg-white hover:border-teal/50 hover:shadow-md'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{getFolderIcon(folder.folder_type)}</span>
              <span className="px-2 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                {folder.document_count}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">{folder.folder_name}</h3>
            <p className="text-xs text-gray-500 capitalize">{folder.folder_type.replace('_', ' ')}</p>
          </motion.button>
        ))}
      </div>

      {/* Selected Folder Info */}
      {selectedFolder && (
        <div className="flex items-center justify-between bg-teal/5 border border-teal/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getFolderIcon(selectedFolder.folder_type)}</span>
            <div>
              <h4 className="font-semibold text-gray-900">{selectedFolder.folder_name}</h4>
              <p className="text-xs text-gray-600">{selectedFolder.document_count} documents</p>
            </div>
          </div>
          <button
            onClick={handleShowAllDocuments}
            className="px-3 py-1.5 text-sm font-medium text-teal hover:bg-teal/10 rounded-lg transition-colors"
          >
            Show All
          </button>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            {selectedFolder ? `${selectedFolder.folder_name} Documents` : 'All Documents'}
          </h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Document
          </button>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h4>
            <p className="text-gray-600 mb-6">
              {selectedFolder
                ? `No documents in ${selectedFolder.folder_name}`
                : 'Create your first document to get started'
              }
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl flex-shrink-0">{getDocumentIcon(doc.document_type)}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1 truncate">{doc.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        {doc.folder_name && (
                          <span className="flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" />
                            {doc.folder_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(doc.created_at)}
                        </span>
                        {doc.file_size && (
                          <span className="flex items-center gap-1">
                            <File className="w-3 h-3" />
                            {formatFileSize(doc.file_size)}
                          </span>
                        )}
                      </div>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          {doc.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      title="View document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                      title="Edit document"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
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
  );
};

export default ClassDocumentsView;
