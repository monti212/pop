import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Upload, FileText, Grid2x2 as Grid, MessageSquare, Download, Trash2, FileEdit as Edit3, Tag, MoreVertical, FolderOpen, Plus, Filter, X, ArrowLeft, Folder, File, Image, FileSpreadsheet, FileCode, Loader, AlertTriangle, Check, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  uploadFile, 
  searchFiles, 
  deleteFile, 
  updateFile, 
  getFileDownloadUrl, 
  UserFile,
  getUserStorageUsed,
  createFocusSet,
  getUsersFocusSets,
  updateFocusSet,
  deleteFocusSet,
  addFilesToFocusSet,
  removeFilesFromFocusSet,
  getFilesInFocusSet,
  FocusSet
} from '../services/fileService';
import { parseDocumentContent } from '../utils/documentParser';
import { convertMarkdownToHtml } from '../utils/markdownConverter';
import { detectTableInContent } from '../utils/tableDetection';

const UhuruFilesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [files, setFiles] = useState<UserFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [focusSets, setFocusSets] = useState<FocusSet[]>([]);
  const [showFocusSetsPanel, setShowFocusSetsPanel] = useState(false);
  const [selectedFocusSet, setSelectedFocusSet] = useState<FocusSet | null>(null);
  const [showCreateFocusSet, setShowCreateFocusSet] = useState(false);
  const [editingFocusSet, setEditingFocusSet] = useState<FocusSet | null>(null);
  const [newFocusSetName, setNewFocusSetName] = useState('');
  const [newFocusSetDescription, setNewFocusSetDescription] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type' | 'size'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dragActive, setDragActive] = useState(false);
  const [openFileMenuId, setOpenFileMenuId] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  // Load files on component mount
  useEffect(() => {
    if (user) {
      loadFiles();
      loadFocusSets();
      loadStorageUsage();
    }
  }, [user]);

  // Search files when query changes
  useEffect(() => {
    if (user) {
      const timeoutId = setTimeout(() => {
        loadFiles();
      }, 500); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, selectedFileType, user]);

  // Close file menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setOpenFileMenuId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadFocusSets = async () => {
    if (!user) return;

    try {
      const result = await getUsersFocusSets(user.id);
      if (result.success && result.focusSets) {
        setFocusSets(result.focusSets);
      }
    } catch (error: any) {
      console.error('Error loading focus sets:', error);
    }
  };

  const loadStorageUsage = async () => {
    if (!user) return;

    setIsLoadingStorage(true);
    try {
      const result = await getUserStorageUsed(user.id);
      if (result.success) {
        setStorageUsed(result.bytesUsed || 0);
      } else {
        console.error('Error loading storage usage:', result.error);
      }
    } catch (error: any) {
      console.error('Error loading storage usage:', error);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const handleCreateFocusSet = async () => {
    if (!user || !newFocusSetName.trim()) return;

    try {
      const result = await createFocusSet(
        user.id,
        newFocusSetName.trim(),
        newFocusSetDescription.trim()
      );

      if (result.success && result.focusSet) {
        setFocusSets(prev => [result.focusSet!, ...prev]);
        setNewFocusSetName('');
        setNewFocusSetDescription('');
        setShowCreateFocusSet(false);
      } else {
        setError(result.error || 'I couldn\'t create that Focus Set. Want to try again?');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create focus set');
    }
  };

  const handleEditFocusSet = async (focusSet: FocusSet) => {
    if (!user) return;

    try {
      const result = await updateFocusSet(
        focusSet.id,
        user.id,
        {
          name: newFocusSetName.trim(),
          description: newFocusSetDescription.trim()
        }
      );

      if (result.success) {
        setFocusSets(prev => 
          prev.map(fs => 
            fs.id === focusSet.id 
              ? { ...fs, name: newFocusSetName.trim(), description: newFocusSetDescription.trim() }
              : fs
          )
        );
        setEditingFocusSet(null);
        setNewFocusSetName('');
        setNewFocusSetDescription('');
      } else {
        setError(result.error || 'Focus Set update isn\'t working. Try again?');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update focus set');
    }
  };

  const handleDeleteFocusSet = async (focusSetId: string) => {
    if (!user || !confirm('Are you sure you want to delete this Focus Set? Files will not be deleted.')) {
      return;
    }

    try {
      const result = await deleteFocusSet(focusSetId, user.id);
      if (result.success) {
        setFocusSets(prev => prev.filter(fs => fs.id !== focusSetId));
        if (selectedFocusSet?.id === focusSetId) {
          setSelectedFocusSet(null);
        }
      } else {
        setError(result.error || 'I couldn\'t delete that Focus Set. Try again?');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete focus set');
    }
  };

  const handleAddSelectedFilesToFocusSet = async (focusSetId: string) => {
    if (selectedFiles.size === 0) return;

    try {
      const result = await addFilesToFocusSet(focusSetId, Array.from(selectedFiles));
      if (result.success) {
        setSelectedFiles(new Set());
        // Optionally show success message
      } else {
        setError(result.error || 'I couldn\'t add those files to the Focus Set. Try again?');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to add files to focus set');
    }
  };

  const handleFilterByFocusSet = async (focusSet: FocusSet | null) => {
    setSelectedFocusSet(focusSet);
    
    if (!focusSet) {
      // Show all files
      loadFiles();
      return;
    }

    // Load files from the selected focus set
    try {
      const result = await getFilesInFocusSet(focusSet.id);
      if (result.success && result.files) {
        setFiles(result.files);
      } else {
        setError(result.error || 'I couldn\'t load those Focus Set files. Try again?');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load focus set files');
    }
  };

  const loadFiles = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await searchFiles(
        user.id,
        searchQuery || undefined,
        selectedFileType === 'all' ? undefined : selectedFileType,
        undefined,
        100
      );

      if (result.success && result.files) {
        // Sort files based on selected sort option
        const sortedFiles = [...result.files].sort((a, b) => {
          switch (sortBy) {
            case 'name':
              return a.title.localeCompare(b.title);
            case 'type':
              return a.file_type.localeCompare(b.file_type);
            case 'size':
              return b.file_size - a.file_size;
            case 'date':
            default:
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
        });
        
        setFiles(sortedFiles);
      } else {
        setError(result.error || 'I couldn\'t load your files right now. Try again?');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load files');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleFileUpload = async (uploadedFiles: FileList) => {
    if (!user || uploadedFiles.length === 0) return;

    setIsUploading(true);
    const uploadPromises = Array.from(uploadedFiles).map(async (file) => {
      return uploadFile(file, user.id, file.name);
    });

    try {
      const results = await Promise.all(uploadPromises);
      const failedUploads = results.filter(r => !r.success);
      
      if (failedUploads.length > 0) {
        console.warn('Some uploads failed:', failedUploads);
        setError(`Hmm, ${failedUploads.length} file(s) didn't want to upload. Try again?`);
      }

      // Reload files to show newly uploaded items
      await loadFiles();
      // Reload storage usage to reflect new uploads
      await loadStorageUsage();
      setShowUploadModal(false);
    } catch (error: any) {
      setError(error.message || 'File upload isn\'t cooperating right now. Want to try again?');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
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

  const handleFileSelect = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleDeleteFiles = async () => {
    if (!user || selectedFiles.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)?`)) {
      return;
    }

    setIsLoading(true);
    const deletePromises = Array.from(selectedFiles).map(fileId => 
      deleteFile(fileId, user.id)
    );
    try {
      await Promise.all(deletePromises);
      setSelectedFiles(new Set());
      await loadFiles();
      // Reload storage usage after deletions
      await loadStorageUsage();
    } catch (error: any) {
      setError(error.message || 'I couldn\'t delete those files. Try again?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInDocs = (file: UserFile) => {
    // Navigate to Uhuru Docs with file content
    navigate('/uhuru-office', {
      state: {
        content: file.content_preview || '',
        title: file.title
      }
    });
  };

  const handleOpenInSheets = (file: UserFile) => {
    // Try to parse table data from the file content
    const tableData = detectTableInContent(file.content_preview || '');
    
    if (tableData) {
      navigate('/uhuru-sheets', {
        state: {
          data: tableData.data,
          headers: tableData.headers,
          title: file.title
        }
      });
    } else {
      // If no table detected, still open in sheets with empty data
      navigate('/uhuru-sheets', {
        state: {
          data: [[]],
          headers: ['A'],
          title: file.title
        }
      });
    }
  };

  const handleSummarizeInChat = (file: UserFile) => {
    // Navigate back to chat with file attachment
    navigate('/', {
      state: {
        fileToAttach: {
          id: file.id,
          title: file.title,
          file_name: file.file_name,
          file_type: file.file_type,
          file_size: file.file_size,
          storage_path: file.storage_path,
          content_preview: file.content_preview
        }
      }
    });
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
      setError('I couldn\'t download that file for you. Try again?');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image/')) {
      return <Image className="w-5 h-5 text-blue-500" />;
    } else if (fileType.includes('spreadsheet') || fileType.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (fileType.includes('document') || fileType.includes('text')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    } else if (fileType.includes('code') || fileType.includes('json')) {
      return <FileCode className="w-5 h-5 text-gray-500" />;
    } else {
      return <File className="w-5 h-5 text-gray-500" />;
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

  const getFileTypes = () => {
    const types = new Set(files.map(f => f.file_type));
    return Array.from(types);
  };

  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getStoragePercentage = (): number => {
    const maxStorageBytes = 1 * 1024 * 1024 * 1024; // 1GB
    return Math.min((storageUsed / maxStorageBytes) * 100, 100);
  };

  return (
    <div className="h-screen bg-sand-200 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-card border-b border-borders px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-12 hover:bg-sand-200 text-navy hover:text-teal transition-colors flex items-center gap-2"
              aria-label="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Chat</span>
            </button>
            
            <div className="h-6 w-px bg-borders"></div>
            
            <div className="flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-teal" />
              <h1 className="text-2xl font-bold text-navy font-display">Uhuru Files</h1>
              
              {/* Storage Usage Indicator */}
              <div className="ml-4 flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        getStoragePercentage() > 90 ? 'bg-red-500' :
                        getStoragePercentage() > 75 ? 'bg-orange-500' :
                        'bg-teal'
                      }`}
                      style={{ width: `${getStoragePercentage()}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">
                    {isLoadingStorage ? (
                      <Loader className="w-3 h-3 animate-spin inline" />
                    ) : (
                      `${formatStorageSize(storageUsed)} / 1 GB`
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setShowFocusSetsPanel(!showFocusSetsPanel)}
              className={`px-6 py-3 rounded-16 transition-all duration-300 flex items-center gap-3 font-medium shadow-card hover:shadow-card border ${
                showFocusSetsPanel 
                  ? 'bg-gradient-to-r from-teal/10 to-blue-50 border-teal/30 text-teal shadow-card' 
                  : 'bg-white border-borders text-navy hover:border-teal/20 hover:bg-gradient-to-r hover:from-white hover:to-teal/5'
              }`}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`w-8 h-8 rounded-12 flex items-center justify-center transition-colors ${
                showFocusSetsPanel ? 'bg-teal/20' : 'bg-navy/10'
              }`}>
                <Folder className="w-4 h-4" />
              </div>
              <span>Focus Sets</span>
              <ChevronDown className={`w-4 h-4 transition-all duration-300 ${
                showFocusSetsPanel ? 'rotate-180 text-teal' : 'text-navy/70'
              }`} />
            </motion.button>
            
            <motion.button
              onClick={() => setShowUploadModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-teal to-teal-600 text-white rounded-16 font-semibold shadow-card hover:shadow-card transition-all duration-300 flex items-center gap-3 border border-teal/20"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-8 h-8 rounded-12 bg-white/20 flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <span>Upload Files</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Focus Sets Panel */}
      {showFocusSetsPanel && (
        <div className="bg-gradient-to-r from-white to-gray-50 border-b border-borders px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-navy font-display">Focus Sets</h3>
            <button
              onClick={() => setShowCreateFocusSet(true)}
              className="px-3 py-1.5 bg-teal text-white rounded-12 hover:bg-teal/90 hover:shadow-md transition-all duration-200 flex items-center gap-1.5 text-sm font-medium"
            >
              <Plus className="w-3 h-3" />
              New Set
            </button>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => handleFilterByFocusSet(null)}
              className={`px-3 py-1.5 rounded-12 text-sm transition-all duration-200 hover:shadow-sm ${
                !selectedFocusSet
                  ? 'bg-teal text-white shadow-card'
                  : 'bg-white text-navy border border-borders hover:bg-sand-200/50 hover:border-teal/20'
              }`}
            >
              All Files ({files.length})
            </button>
            
            {focusSets.map((focusSet) => (
              <button
                key={focusSet.id}
                onClick={() => handleFilterByFocusSet(focusSet)}
                className={`px-3 py-1.5 rounded-12 text-sm transition-all duration-200 hover:shadow-sm ${
                  selectedFocusSet?.id === focusSet.id
                    ? 'bg-teal text-white shadow-card'
                    : 'bg-white text-navy border border-borders hover:bg-sand-200/50 hover:border-teal/20'
                }`}
              >
                {focusSet.name}
              </button>
            ))}
          </div>
          
          {/* Focus Set Actions for Selected Files */}
          {selectedFiles.size > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-16 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">
                  {`Add ${selectedFiles.size} selected file${selectedFiles.size !== 1 ? 's' : ''} to:`}
                </span>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    {focusSets.map((focusSet) => (
                      <button
                        key={focusSet.id}
                        onClick={() => handleAddSelectedFilesToFocusSet(focusSet.id)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200 hover:shadow-sm transition-all duration-200 font-medium"
                      >
                        {focusSet.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search and Controls */}
        <div className="bg-white border-b border-borders px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-borders rounded-16 bg-sand-200/30 text-navy placeholder-navy/50 focus:ring-2 focus:ring-teal focus:border-teal focus:bg-white transition-all duration-200 shadow-sm"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="px-3 py-2.5 border border-borders rounded-16 bg-white text-navy focus:ring-2 focus:ring-teal focus:border-teal text-sm shadow-sm transition-all duration-200 hover:border-teal/20"
              >
                <option value="all">All Types</option>
                {getFileTypes().map((type) => (
                  <option key={type} value={type}>
                    {type.split('/')[1]?.toUpperCase() || type}
                  </option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2.5 border border-borders rounded-16 bg-white text-navy focus:ring-2 focus:ring-teal focus:border-teal text-sm shadow-sm transition-all duration-200 hover:border-teal/20"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="type">Sort by Type</option>
                <option value="size">Sort by Size</option>
              </select>
              
              <div className="flex items-center bg-white border border-borders rounded-16 shadow-sm overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 transition-all duration-200 ${viewMode === 'grid' ? 'bg-teal text-white shadow-sm' : 'text-navy/70 hover:bg-sand-200/50 hover:text-navy'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 transition-all duration-200 ${viewMode === 'list' ? 'bg-teal text-white shadow-sm' : 'text-navy/70 hover:bg-sand-200/50 hover:text-navy'}`}
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Selected Files Actions */}
          {selectedFiles.size > 0 && (
            <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-teal/5 to-blue-50 border border-teal/20 rounded-xl p-4 shadow-sm">
              <span className="text-sm text-blue-700 font-medium">
                {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteFiles}
                  className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 hover:shadow-sm transition-all duration-200 flex items-center gap-2 text-sm font-medium"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
                <button
                  onClick={() => setSelectedFiles(new Set())}
                  className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 hover:shadow-sm transition-all duration-200 text-sm font-medium"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Files Grid/List */}
        <div 
          className="flex-1 overflow-auto p-6"
          onDrop={handleDrop}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
        >
          {dragActive && (
            <div className="fixed inset-0 bg-teal/10 border-2 border-dashed border-teal rounded-xl flex items-center justify-center z-10">
              <div className="text-center">
                <Upload className="w-12 h-12 text-teal mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900">Drop files here to upload</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-red-800 font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-100 transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="text-center">
                <Loader className="w-12 h-12 text-teal animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-navy mb-2">Loading your files</h3>
                <p className="text-navy/70">Organizing your documents...</p>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="text-center max-w-md">
                <FolderOpen className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-navy mb-3">
                  {searchQuery ? 'No files found' : 'No files yet'}
                </h3>
                <p className="text-navy/70 text-lg mb-8">
                  {searchQuery ? 'No files match your search criteria' : 'Upload your first file to get started with Uhuru Files'}
                </p>
                <motion.button
                  onClick={() => setShowUploadModal(true)}
                  className="px-8 py-4 bg-teal text-white rounded-lg hover:bg-teal/90 transition-all duration-200 flex items-center gap-2 mx-auto font-semibold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Upload className="w-5 h-5" />
                  Upload Files
                </motion.button>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl border transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 group ${
                    selectedFiles.has(file.id) ? 'border-teal bg-gradient-to-br from-teal/5 to-teal/10 shadow-card' : 'border-gray-200 shadow-card hover:border-gray-300'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.file_type)}
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={() => handleFileSelect(file.id)}
                          className="rounded border-gray-300 text-teal focus:ring-teal focus:ring-offset-0 w-4 h-4"
                        />
                      </div>
                      
                      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFileMenuId(openFileMenuId === file.id ? null : file.id);
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {openFileMenuId === file.id && (
                          <motion.div
                            ref={fileMenuRef}
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-20 min-w-[180px] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenInDocs(file);
                                  setOpenFileMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <FileText className="w-4 h-4 text-blue-600" />
                                Open in Uhuru Docs
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenInSheets(file);
                                  setOpenFileMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                Open in Uhuru Sheets
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSummarizeInChat(file);
                                  setOpenFileMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <MessageSquare className="w-4 h-4 text-purple-600" />
                                Summarize in Chat
                              </button>
                              
                              <div className="border-t border-gray-100"></div>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadFile(file);
                                  setOpenFileMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Download className="w-4 h-4 text-gray-600" />
                                Download
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFiles(new Set([file.id]));
                                  handleDeleteFiles();
                                  setOpenFileMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                                Delete
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-navy mb-3 line-clamp-2 leading-tight">
                      {file.title}
                    </h3>
                    
                    <div className="text-sm text-gray-500 space-y-1.5 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatFileSize(file.file_size)}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span>{formatDate(file.created_at)}</span>
                      </div>
                    </div>
                    
                    {file.content_preview && (
                      <p className="text-xs text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                        {file.content_preview.substring(0, 100)}...
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenInDocs(file)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all duration-200 text-xs font-medium flex items-center justify-center gap-1.5 hover:shadow-sm"
                        title="Open in Uhuru Docs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Docs
                      </button>
                      
                      <button
                        onClick={() => handleOpenInSheets(file)}
                        className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all duration-200 text-xs font-medium flex items-center justify-center gap-1.5 hover:shadow-sm"
                        title="Open in Uhuru Sheets"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Sheets
                      </button>
                      
                      <button
                        onClick={() => handleSummarizeInChat(file)}
                        className="flex-1 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all duration-200 text-xs font-medium flex items-center justify-center gap-1.5 hover:shadow-sm"
                        title="Summarize in Chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                      </button>
                      
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="p-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:shadow-sm"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80 border-b border-gray-200">
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
                          className="rounded border-gray-300 text-teal focus:ring-teal focus:ring-offset-0 w-4 h-4"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-navy">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-navy">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-navy">Size</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-navy">Modified</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-navy">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {files.map((file) => (
                      <motion.tr
                        key={file.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`hover:bg-gray-50 transition-colors duration-200 group ${
                          selectedFiles.has(file.id) ? 'bg-gradient-to-r from-teal/5 to-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(file.id)}
                            onChange={() => handleFileSelect(file.id)}
                            className="rounded border-gray-300 text-teal focus:ring-teal focus:ring-offset-0 w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-4">
                            {getFileIcon(file.file_type)}
                            <div>
                              <p className="font-semibold text-navy">{file.title}</p>
                              {file.content_preview && (
                                <p className="text-xs text-gray-500 line-clamp-1">
                                  {file.content_preview.substring(0, 60)}...
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {file.file_type.split('/')[1]?.toUpperCase() || file.file_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatFileSize(file.file_size)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(file.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => handleOpenInDocs(file)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Open in Uhuru Docs"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleOpenInSheets(file)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                              title="Open in Uhuru Sheets"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleSummarizeInChat(file)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                              title="Summarize in Chat"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-premium max-w-lg w-full border border-gray-100"
          >
            <div className="p-8 text-center">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-navy font-display">Upload Files</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-teal hover:bg-teal/5 transition-all duration-300 cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-teal/20 transition-colors duration-300">
                    <Upload className="w-8 h-8 text-teal group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <p className="text-gray-800 font-semibold mb-2">Click to select files or drag and drop</p>
                  <p className="text-sm text-gray-600">Supports documents, images, spreadsheets, and more</p>
                  <div className="space-y-1 mt-3">
                    <p className="text-xs text-gray-500">Maximum file size: 2GB per file</p>
                    <p className="text-xs text-gray-500">Storage limit: 1GB total per user</p>
                    <p className="text-xs text-gray-600 font-medium">
                      Current usage: {formatStorageSize(storageUsed)} / 1 GB 
                      ({(100 - getStoragePercentage()).toFixed(1)}% remaining)
                    </p>
                  </div>
                </div>
                
                <input
                  ref={fileInputRef}
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
                  <div className="flex items-center justify-center py-4">
                    <Loader className="w-6 h-6 text-teal animate-spin mr-3" />
                    <span className="text-gray-600">Uploading files...</span>
                  </div>
                )}
                
                {/* Storage Warning */}
                {getStoragePercentage() > 80 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">Storage Almost Full</p>
                        <p className="text-xs text-orange-700 mt-1">
                          You're using {getStoragePercentage().toFixed(1)}% of your 1GB storage limit. 
                          Consider deleting unused files to free up space.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Focus Set Modal */}
      {showCreateFocusSet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-premium max-w-lg w-full border border-gray-100"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-navy font-display">Create Focus Set</h3>
                <button
                  onClick={() => {
                    setShowCreateFocusSet(false);
                    setNewFocusSetName('');
                    setNewFocusSetDescription('');
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-3">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newFocusSetName}
                    onChange={(e) => setNewFocusSetName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-navy focus:ring-2 focus:ring-teal focus:border-teal focus:shadow-md transition-all duration-200 shadow-sm"
                    placeholder="Enter focus set name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-navy mb-3">
                    Description (optional)
                  </label>
                  <textarea
                    value={newFocusSetDescription}
                    onChange={(e) => setNewFocusSetDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-navy focus:ring-2 focus:ring-teal focus:border-teal focus:shadow-md transition-all duration-200 shadow-sm resize-none"
                    rows={3}
                    placeholder="Enter description"
                  />
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleCreateFocusSet}
                    disabled={!newFocusSetName.trim()}
                    className="flex-1 px-6 py-3 bg-teal text-white rounded-xl hover:bg-teal/90 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateFocusSet(false);
                      setNewFocusSetName('');
                      setNewFocusSetDescription('');
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 hover:shadow-md transition-all duration-200 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default UhuruFilesPage;