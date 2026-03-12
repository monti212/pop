import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, FileText, Upload, Search, Download, Eye, Trash2,
  Edit3, X, Loader, AlertTriangle, Calendar, Tag, File, HardDrive, CheckCircle2, Shield
} from 'lucide-react';
import {
  getClassFolders,
  getClassDocuments,
  getFolderDocuments,
  deleteDocument,
  ClassFolder,
  ClassDocument,
  DocumentWithFolder,
  uploadClassDocuments,
  getTotalStorageUsed,
  UploadProgress
} from '../services/classDocumentService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/authService';
import mammoth from 'mammoth';
import { validateImages, IMAGE_CONTENT_POLICY } from '../utils/imageValidator';

interface ClassDocumentsViewProps {
  classId: string;
  className: string;
}

const ClassDocumentsView: React.FC<ClassDocumentsViewProps> = ({ classId, className }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<ClassFolder[]>([]);
  const [documents, setDocuments] = useState<DocumentWithFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ClassFolder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ used: number; total: number }>({ used: 0, total: 1024 * 1024 * 1024 });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<DocumentWithFolder | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [docxHtmlContent, setDocxHtmlContent] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<{ file: string; warnings: string[] }[]>([]);
  const [showContentPolicy, setShowContentPolicy] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    loadFoldersAndDocuments();
    if (user) {
      loadStorageInfo();
    }
  }, [classId, user]);

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

  const loadStorageInfo = async () => {
    if (!user) return;

    const result = await getTotalStorageUsed(user.id);
    if (result.success && result.data) {
      setStorageInfo({
        used: result.data.totalBytes,
        total: 1024 * 1024 * 1024
      });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 5) {
      setError('You can upload up to 5 files at once');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidationWarnings([]);

    try {
      // Validate images
      const { validFiles, invalidFiles, warnings } = await validateImages(files);

      // If there are invalid files, show error and don't proceed
      if (invalidFiles.length > 0) {
        const errorMessages = invalidFiles.map(({ file, error }) => `${file.name}: ${error}`);
        setError(`The following files failed validation:\n\n${errorMessages.join('\n\n')}`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setIsValidating(false);
        return;
      }

      // If there are warnings, store them to show in the upload modal
      if (warnings.length > 0) {
        setValidationWarnings(warnings.map(w => ({
          file: w.file.name,
          warnings: w.warnings
        })));
      }

      setSelectedFiles(validFiles);
      setShowUploadModal(true);
    } catch (error: any) {
      setError('Failed to validate files: ' + error.message);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpload = async () => {
    if (!user || selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadClassDocuments(
        selectedFiles,
        classId,
        user.id,
        selectedFolder?.id || null,
        (progress) => setUploadProgress(progress)
      );

      if (result.success) {
        setShowUploadModal(false);
        setSelectedFiles([]);
        setUploadProgress([]);
        await loadFoldersAndDocuments();
        await loadStorageInfo();

        if (result.failedFiles && result.failedFiles.length > 0) {
          setError(`Some files failed to upload: ${result.failedFiles.map(f => f.fileName).join(', ')}`);
        }
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (error: any) {
      setError(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setShowUploadModal(false);
    setSelectedFiles([]);
    setUploadProgress([]);
    setValidationWarnings([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const handleViewDocument = async (doc: DocumentWithFolder) => {
    setPreviewDocument(doc);
    setShowPreviewModal(true);
    setIsLoadingPreview(true);
    setPreviewUrl(null);
    setDocxHtmlContent(null);

    try {
      // If there's a storage path, get the file from storage
      if (doc.storage_path) {
        const isDocx = doc.storage_path.toLowerCase().match(/\.(docx)$/i);

        if (isDocx) {
          // Load and convert DOCX to HTML
          const { data: fileData } = await supabase.storage
            .from('user-files')
            .download(doc.storage_path);

          if (fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setDocxHtmlContent(result.value);
          }
        } else {
          // For other files, just get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from('user-files')
            .getPublicUrl(doc.storage_path);
          setPreviewUrl(publicUrl);
        }
      }
    } catch (error: any) {
      setError('Failed to load document preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleEditDocument = (doc: DocumentWithFolder) => {
    // Navigate to U Docs with the document
    const params = new URLSearchParams({
      documentId: doc.id,
      documentTitle: doc.title,
      classId: classId,
      className: className
    });

    // Open U Docs in the same window
    window.location.href = `/uhuru-office?${params.toString()}`;
  };

  const handleDeleteDocument = async (doc: DocumentWithFolder) => {
    if (!confirm(`Are you sure you want to delete "${doc.title}"?`)) {
      return;
    }

    try {
      const result = await deleteDocument(doc.id);
      if (result.success) {
        // Refresh documents list
        if (selectedFolder) {
          await handleFolderClick(selectedFolder);
        } else {
          await loadFoldersAndDocuments();
        }
        await loadStorageInfo();
      } else {
        setError(result.error || 'Failed to delete document');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete document');
    }
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
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const getStoragePercentage = (): number => {
    return (storageInfo.used / storageInfo.total) * 100;
  };

  const getStorageColor = (): string => {
    const percentage = getStoragePercentage();
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    return 'bg-teal';
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

      {/* Storage Usage Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Storage Usage</span>
          </div>
          <span className="text-sm text-gray-600">
            {formatFileSize(storageInfo.used)} / {formatFileSize(storageInfo.total)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${getStorageColor()}`}
            style={{ width: `${Math.min(getStoragePercentage(), 100)}%` }}
          ></div>
        </div>
        {getStoragePercentage() >= 80 && (
          <p className="text-xs text-orange-600 mt-2">
            {getStoragePercentage() >= 90 ? 'Storage almost full!' : 'Storage getting full'}
          </p>
        )}
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            {selectedFolder ? `${selectedFolder.folder_name} Documents` : 'All Documents'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowContentPolicy(true)}
              className="px-3 py-2 text-sm text-gray-600 hover:text-teal hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              title="View upload guidelines"
            >
              <Shield className="w-4 h-4" />
              Guidelines
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.svg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={getStoragePercentage() >= 95 || isValidating}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                getStoragePercentage() >= 95 || isValidating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-teal text-white hover:bg-teal/90'
              }`}
            >
              {isValidating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Documents
                </>
              )}
            </button>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h4>
            <p className="text-gray-600 mb-6">
              {selectedFolder
                ? `No documents in ${selectedFolder.folder_name}`
                : 'Upload your first document to get started'
              }
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={getStoragePercentage() >= 95}
              className={`px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2 transition-colors ${
                getStoragePercentage() >= 95
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-teal text-white hover:bg-teal/90'
              }`}
            >
              <Upload className="w-5 h-5" />
              Upload Documents
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
                      onClick={() => handleViewDocument(doc)}
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      title="View document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditDocument(doc)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                      title="Edit document"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc)}
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

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Upload Documents</h3>
                  <button
                    onClick={handleCancelUpload}
                    disabled={isUploading}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  {selectedFolder && ` • Uploading to ${selectedFolder.folder_name}`}
                </p>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {validationWarnings.length > 0 && (
                  <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-orange-900 mb-2">Content Review Required</h4>
                        {validationWarnings.map((warning, idx) => (
                          <div key={idx} className="mb-2 last:mb-0">
                            <p className="text-sm font-medium text-orange-800">{warning.file}</p>
                            <ul className="list-disc list-inside text-sm text-orange-700 mt-1">
                              {warning.warnings.map((w, wIdx) => (
                                <li key={wIdx}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        <p className="text-xs text-orange-700 mt-2">
                          Please review these files to ensure they are appropriate for educational use before uploading.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    {selectedFiles.map((file, index) => {
                      const progress = uploadProgress.find(p => p.fileName === file.name);
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <File className="w-5 h-5 text-gray-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{file.name}</p>
                                <p className="text-xs text-gray-600">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            {progress?.status === 'completed' && (
                              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                            )}
                            {progress?.status === 'error' && (
                              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                          {progress && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600 capitalize">{progress.status}</span>
                                <span className="text-xs text-gray-600">{progress.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    progress.status === 'error' ? 'bg-red-500' :
                                    progress.status === 'completed' ? 'bg-green-500' : 'bg-teal'
                                  }`}
                                  style={{ width: `${progress.progress}%` }}
                                ></div>
                              </div>
                              {progress.error && (
                                <p className="text-xs text-red-600 mt-1">{progress.error}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={handleCancelUpload}
                  disabled={isUploading}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || selectedFiles.length === 0}
                  className="px-6 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && previewDocument && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getDocumentIcon(previewDocument.document_type)}</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{previewDocument.title}</h3>
                    <p className="text-sm text-gray-600">
                      {previewDocument.folder_name && `${previewDocument.folder_name} • `}
                      {formatDate(previewDocument.created_at)}
                      {previewDocument.file_size && ` • ${formatFileSize(previewDocument.file_size)}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewDocument(null);
                    setPreviewUrl(null);
                    setDocxHtmlContent(null);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                {/* Document Details Section */}
                <div className="mb-6 space-y-4">
                  {/* Type & Meta Row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      previewDocument.document_type === 'lesson_plan' ? 'bg-purple-100 text-purple-700' :
                      previewDocument.document_type === 'note' ? 'bg-blue-100 text-blue-700' :
                      previewDocument.document_type === 'report' ? 'bg-amber-100 text-amber-700' :
                      previewDocument.document_type === 'resource' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      <span>{getDocumentIcon(previewDocument.document_type)}</span>
                      {previewDocument.document_type === 'lesson_plan' ? 'Lesson Plan' :
                       previewDocument.document_type.charAt(0).toUpperCase() + previewDocument.document_type.slice(1)}
                    </span>
                    {previewDocument.is_lesson_plan && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Lesson Plan (confidence: {Math.round((previewDocument.lesson_plan_confidence || 0) * 100)}%)
                      </span>
                    )}
                    {previewDocument.auto_saved && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Auto-saved</span>
                    )}
                    {previewDocument.version > 1 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">v{previewDocument.version}</span>
                    )}
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {previewDocument.folder_name && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Folder</p>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                          {previewDocument.folder_name}
                        </p>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Created</p>
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(previewDocument.created_at)}
                      </p>
                    </div>
                    {previewDocument.updated_at && previewDocument.updated_at !== previewDocument.created_at && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Updated</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(previewDocument.updated_at)}</p>
                      </div>
                    )}
                    {previewDocument.file_size && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">File Size</p>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                          {formatFileSize(previewDocument.file_size)}
                        </p>
                      </div>
                    )}
                    {previewDocument.file_extension && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">File Type</p>
                        <p className="text-sm font-medium text-gray-900 uppercase">{previewDocument.file_extension}</p>
                      </div>
                    )}
                    {(previewDocument.view_count > 0 || previewDocument.download_count > 0) && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Activity</p>
                        <p className="text-sm font-medium text-gray-900">
                          {previewDocument.view_count > 0 && `${previewDocument.view_count} views`}
                          {previewDocument.view_count > 0 && previewDocument.download_count > 0 && ' • '}
                          {previewDocument.download_count > 0 && `${previewDocument.download_count} downloads`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {previewDocument.tags && previewDocument.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-4 h-4 text-gray-400" />
                      {previewDocument.tags.map((tag, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <hr className="border-gray-200 mb-6" />

                {/* Document Content / File Preview */}
                {isLoadingPreview ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader className="w-12 h-12 text-teal animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Loading file preview...</p>
                    </div>
                  </div>
                ) : docxHtmlContent ? (
                  <div className="prose max-w-none">
                    <div className="bg-white rounded-lg p-8 border border-gray-200">
                      <div
                        dangerouslySetInnerHTML={{ __html: docxHtmlContent }}
                        className="docx-preview"
                      />
                    </div>
                  </div>
                ) : previewUrl ? (
                  <div>
                    {previewDocument.storage_path?.toLowerCase().endsWith('.pdf') ? (
                      <iframe
                        src={previewUrl}
                        className="w-full min-h-[500px] rounded-lg border border-gray-200"
                        title={previewDocument.title}
                      />
                    ) : previewDocument.storage_path?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img
                        src={previewUrl}
                        alt={previewDocument.title}
                        className="max-w-full mx-auto rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 mb-4">File preview not available for this type</p>
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download File
                        </a>
                      </div>
                    )}
                  </div>
                ) : previewDocument.content ? (
                  <div className="prose max-w-none">
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <pre className="whitespace-pre-wrap font-sans text-gray-800 text-sm leading-relaxed">
                        {previewDocument.content}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No file content to preview</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => handleEditDocument(previewDocument)}
                    className="px-4 py-2 rounded-lg bg-teal text-white hover:bg-teal/90 transition-colors flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit in U Docs
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content Policy Modal */}
      <AnimatePresence>
        {showContentPolicy && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal/10 rounded-lg">
                      <Shield className="w-6 h-6 text-teal" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{IMAGE_CONTENT_POLICY.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{IMAGE_CONTENT_POLICY.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowContentPolicy(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[calc(85vh-12rem)] overflow-y-auto space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Content Requirements
                  </h4>
                  <ul className="space-y-2">
                    {IMAGE_CONTENT_POLICY.rules.map((rule, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal mt-2 flex-shrink-0"></span>
                        <span className="text-gray-700">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Acceptable Content Examples
                  </h4>
                  <ul className="space-y-2">
                    {IMAGE_CONTENT_POLICY.acceptableExamples.map((example, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-green-500 flex-shrink-0">✓</span>
                        <span className="text-gray-700">{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Automated Safety Checks</h4>
                  <p className="text-sm text-blue-800">
                    All uploaded images go through automated validation to check:
                  </p>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                    <li>File format and size limits</li>
                    <li>Image dimensions and quality</li>
                    <li>Basic content analysis</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-3">
                    While we perform automated checks, teachers are ultimately responsible for ensuring
                    all uploaded content is appropriate for their educational environment.
                  </p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Reporting Concerns</h4>
                  <p className="text-sm text-orange-800">
                    If you encounter inappropriate content, please report it immediately to your
                    administrator. Violations of content policy may result in account restrictions.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-end">
                <button
                  onClick={() => setShowContentPolicy(false)}
                  className="px-6 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClassDocumentsView;
