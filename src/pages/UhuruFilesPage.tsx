import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Upload, Calendar, Users, BookOpen, ClipboardCheck,
  ArrowLeft, Plus, Filter, X, Loader, AlertTriangle,
  FileText, Download, Trash2, Edit, MoreVertical, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  uploadFile,
  searchFiles,
  deleteFile,
  getFileDownloadUrl,
  UserFile,
  getUserStorageUsed
} from '../services/fileService';

type TabType = 'attendance' | 'lesson-plans';
type ViewMode = 'grid' | 'list' | 'calendar';

const UhuruFilesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [files, setFiles] = useState<UserFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [classroomFilter, setClassroomFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadFiles();
      loadStorageUsage();
    }
  }, [user, activeTab, dateFilter, classroomFilter]);

  useEffect(() => {
    if (user) {
      const timeoutId = setTimeout(() => {
        loadFiles();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

  const loadFiles = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const category = activeTab === 'attendance' ? 'attendance' : 'lesson_plan';
      const result = await searchFiles(
        user.id,
        searchQuery || undefined,
        undefined,
        [category],
        100
      );

      if (result.success && result.files) {
        const sortedFiles = [...result.files].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setFiles(sortedFiles);
      } else {
        setError(result.error || 'Could not load your files');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStorageUsage = async () => {
    if (!user) return;

    try {
      const result = await getUserStorageUsed(user.id);
      if (result.success) {
        setStorageUsed(result.bytesUsed || 0);
      }
    } catch (error: any) {
      console.error('Error loading storage usage:', error);
    }
  };

  const handleFileUpload = async (uploadedFiles: FileList) => {
    if (!user || uploadedFiles.length === 0) return;

    setIsUploading(true);
    const category = activeTab === 'attendance' ? 'attendance' : 'lesson_plan';

    const uploadPromises = Array.from(uploadedFiles).map(async (file) => {
      return uploadFile(file, user.id, file.name, [category]);
    });

    try {
      const results = await Promise.all(uploadPromises);
      const failedUploads = results.filter(r => !r.success);

      if (failedUploads.length > 0) {
        setError(`${failedUploads.length} file(s) failed to upload`);
      }

      await loadFiles();
      await loadStorageUsage();
      setShowUploadModal(false);
    } catch (error: any) {
      setError(error.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFiles = async () => {
    if (!user || selectedFiles.size === 0) return;

    if (!confirm(`Delete ${selectedFiles.size} file(s)?`)) return;

    setIsLoading(true);
    const deletePromises = Array.from(selectedFiles).map(fileId =>
      deleteFile(fileId, user.id)
    );

    try {
      await Promise.all(deletePromises);
      setSelectedFiles(new Set());
      await loadFiles();
      await loadStorageUsage();
    } catch (error: any) {
      setError(error.message || 'Failed to delete files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFile = async (file: UserFile) => {
    try {
      const result = await getFileDownloadUrl(file.storage_path);
      if (result.success && result.url) {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = file.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error: any) {
      setError('Could not download file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStoragePercentage = (): number => {
    const maxStorageBytes = 1 * 1024 * 1024 * 1024;
    return Math.min((storageUsed / maxStorageBytes) * 100, 100);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-teal transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Chat</span>
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

            <div className="flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-teal" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Teacher Files</h1>
                <p className="text-sm text-gray-600">Attendance Records & Lesson Plans</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Storage Indicator */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    getStoragePercentage() > 90 ? 'bg-red-500' :
                    getStoragePercentage() > 75 ? 'bg-orange-500' :
                    'bg-teal'
                  }`}
                  style={{ width: `${getStoragePercentage()}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 font-medium">
                {formatFileSize(storageUsed)} / 1 GB
              </span>
            </div>

            <motion.button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-teal text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Upload className="w-4 h-4" />
              Upload {activeTab === 'attendance' ? 'Attendance' : 'Lesson Plan'}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'attendance'
                ? 'bg-teal text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ClipboardCheck className="w-5 h-5" />
            Attendance Records
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/20">
              {files.filter(f => f.tags?.includes('attendance')).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('lesson-plans')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'lesson-plans'
                ? 'bg-teal text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Lesson Plans
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/20">
              {files.filter(f => f.tags?.includes('lesson_plan')).length}
            </span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'attendance' ? 'attendance records' : 'lesson plans'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-teal focus:border-teal focus:bg-white transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal focus:border-teal text-sm"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="this-semester">This Semester</option>
            </select>

            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-colors"
            >
              {viewMode === 'grid' ? 'List View' : 'Grid View'}
            </button>
          </div>
        </div>

        {/* Selected Files Actions */}
        {selectedFiles.size > 0 && (
          <div className="mt-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
            <span className="text-sm text-blue-800 font-medium">
              {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteFiles}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <Loader className="w-12 h-12 text-teal animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading your files</h3>
              <p className="text-gray-600">Getting everything ready...</p>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center max-w-md">
              {activeTab === 'attendance' ? (
                <ClipboardCheck className="w-24 h-24 text-gray-300 mx-auto mb-6" />
              ) : (
                <BookOpen className="w-24 h-24 text-gray-300 mx-auto mb-6" />
              )}
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchQuery ? 'No files found' : `No ${activeTab === 'attendance' ? 'attendance records' : 'lesson plans'} yet`}
              </h3>
              <p className="text-gray-600 text-lg mb-8">
                {searchQuery
                  ? 'No files match your search criteria'
                  : `Upload your first ${activeTab === 'attendance' ? 'attendance record' : 'lesson plan'} to get started`
                }
              </p>
              {!searchQuery && (
                <motion.button
                  onClick={() => setShowUploadModal(true)}
                  className="px-8 py-4 bg-teal text-white rounded-lg hover:bg-teal/90 transition-all duration-200 flex items-center gap-2 mx-auto font-semibold shadow-sm hover:shadow-md"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Upload className="w-5 h-5" />
                  Upload {activeTab === 'attendance' ? 'Attendance' : 'Lesson Plan'}
                </motion.button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-lg border transition-all duration-200 hover:shadow-lg group ${
                  selectedFiles.has(file.id)
                    ? 'border-teal bg-teal/5 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {activeTab === 'attendance' ? (
                        <ClipboardCheck className="w-5 h-5 text-teal" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-blue-500" />
                      )}
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => {
                          const newSelected = new Set(selectedFiles);
                          if (newSelected.has(file.id)) {
                            newSelected.delete(file.id);
                          } else {
                            newSelected.add(file.id);
                          }
                          setSelectedFiles(newSelected);
                        }}
                        className="rounded border-gray-300 text-teal focus:ring-teal w-4 h-4"
                      />
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2">
                    {file.title}
                  </h3>

                  <div className="text-sm text-gray-600 space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(file.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{formatFileSize(file.file_size)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="flex-1 px-3 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedFiles.size === files.length && files.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles(new Set(files.map(f => f.id)));
                        } else {
                          setSelectedFiles(new Set());
                        }
                      }}
                      className="rounded border-gray-300 text-teal focus:ring-teal w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Size</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedFiles.has(file.id) ? 'bg-teal/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => {
                          const newSelected = new Set(selectedFiles);
                          if (newSelected.has(file.id)) {
                            newSelected.delete(file.id);
                          } else {
                            newSelected.add(file.id);
                          }
                          setSelectedFiles(newSelected);
                        }}
                        className="rounded border-gray-300 text-teal focus:ring-teal w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {activeTab === 'attendance' ? (
                          <ClipboardCheck className="w-5 h-5 text-teal" />
                        ) : (
                          <BookOpen className="w-5 h-5 text-blue-500" />
                        )}
                        <span className="font-medium text-gray-900">{file.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(file.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="p-2 text-teal hover:bg-teal/10 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              className="bg-white rounded-xl shadow-xl max-w-lg w-full"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Upload {activeTab === 'attendance' ? 'Attendance Record' : 'Lesson Plan'}
                  </h3>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-teal hover:bg-teal/5 transition-all duration-300 cursor-pointer group"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-teal/20 transition-colors">
                    <Upload className="w-8 h-8 text-teal group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-gray-800 font-semibold mb-2">Click to select files</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload {activeTab === 'attendance' ? 'attendance records' : 'lesson plans'} in any format
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Maximum file size: 2GB per file</p>
                    <p className="text-xs text-gray-600 font-medium">
                      Storage remaining: {formatFileSize((1024 * 1024 * 1024) - storageUsed)}
                    </p>
                  </div>
                </div>

                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFileUpload(e.target.files);
                    }
                  }}
                />

                {isUploading && (
                  <div className="flex items-center justify-center py-4 mt-4">
                    <Loader className="w-6 h-6 text-teal animate-spin mr-3" />
                    <span className="text-gray-600">Uploading files...</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UhuruFilesPage;
