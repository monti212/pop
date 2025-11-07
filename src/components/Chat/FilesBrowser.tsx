import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Search, FileText, X, ChevronDown } from 'lucide-react';
import type { UserFile } from '../../services/fileService';

interface FilesBrowserProps {
  recentFiles: UserFile[];
  selectedFiles: File[];
  onFileSelect: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onFileSearch: (query: string) => void;
  onOpenFilesPage: () => void;
  isLoadingFiles: boolean;
  fileSearchResults: UserFile[];
  fileSearchQuery: string;
  open?: boolean;
  onClose?: () => void;
  anchorEl?: HTMLElement | null;
}

type Side = 'left' | 'right' | 'top' | 'bottom';

const FilesBrowser: React.FC<FilesBrowserProps> = ({
  recentFiles,
  selectedFiles,
  onFileSelect,
  onRemoveFile,
  onFileSearch,
  onOpenFilesPage,
  isLoadingFiles,
  fileSearchResults,
  fileSearchQuery,
  open = false,
  onClose,
  anchorEl
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    side: Side;
    arrowTop?: number;
    arrowLeft?: number;
    isMobile?: boolean;
  }>({
    top: 0,
    left: 0,
    side: 'top',
    arrowTop: 0,
    arrowLeft: 0,
    isMobile: false,
  });

  const popRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const performRecompute = () => {
    const pop = popRef.current;
    if (!anchorEl || !pop) return;

    if (isMobile) {
      setCoords({
        top: 0,
        left: 0,
        side: "bottom",
        isMobile: true,
      });
      return;
    }

    const GAP = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const popRect = pop.getBoundingClientRect();
    const bubbleW = Math.min(280, Math.max(220, vw * 0.28));
    const bubbleH = popRect.height || 260;

    const b = anchorEl.getBoundingClientRect();

    const side: Side = "top";

    let top = b.top - bubbleH - GAP - 38;
    let left = b.left; // left-align to trigger
    left = Math.max(GAP, Math.min(left, vw - bubbleW - GAP));

    top = Math.max(GAP, Math.min(top, vh - bubbleH - GAP));

    const arrowTop = bubbleH - 6;
    const arrowLeft = 16;

    setCoords({
      top,
      left,
      side,
      arrowTop,
      arrowLeft,
      isMobile: false
    });
  };

  useEffect(() => {
    if (open && anchorEl) {
      performRecompute();
      window.addEventListener('resize', performRecompute);
      window.addEventListener('scroll', performRecompute, true);
      return () => {
        window.removeEventListener('resize', performRecompute);
        window.removeEventListener('scroll', performRecompute, true);
      };
    }
  }, [open, anchorEl]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      if (
        popRef.current &&
        !popRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose?.();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorEl]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onFileSearch(value);
  };

  const displayFiles = searchQuery ? fileSearchResults : recentFiles;

  if (!open) return null;

  const content = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop for mobile */}
          {coords.isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-[9998]"
              onClick={() => onClose?.()}
            />
          )}

          {/* Main popup */}
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, scale: 0.95, y: coords.isMobile ? 20 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: coords.isMobile ? 20 : -10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`
              ${coords.isMobile
                ? 'fixed bottom-0 left-0 right-0 rounded-t-3xl'
                : 'fixed rounded-2xl'
              }
              bg-white border border-borders shadow-xl z-[9999] overflow-hidden
            `}
            style={
              coords.isMobile
                ? { maxHeight: '70vh' }
                : {
                    top: coords.top,
                    left: coords.left,
                    width: '280px',
                    maxHeight: '400px',
                  }
            }
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-borders">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#f5b233]" />
                <span className="text-sm font-medium text-[#19324A]">U Class</span>
              </div>
              <button
                onClick={() => onClose?.()}
                className="p-1 rounded-lg hover:bg-[#F5F7F9] text-[#19324A]/70 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-borders">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search files..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f5b233]/20 focus:border-[#f5b233]"
                />
              </div>
            </div>

            {/* File List */}
            <div className="overflow-y-auto max-h-64 p-2">
              {isLoadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[#f5b233] border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-[#19324A]/70">Loading files...</span>
                </div>
              ) : displayFiles.length > 0 ? (
                <div className="space-y-1">
                  {displayFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        // Handle file selection
                        console.log('File clicked:', file);
                      }}
                      className="w-full text-left p-3 rounded-lg hover:bg-[#F5F7F9] transition-colors duration-150 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded bg-[#f5b233]/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-[#f5b233]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#19324A] truncate">
                              {file.title || file.file_name || 'Untitled'}
                            </div>
                            <div className="text-xs text-[#19324A]/60 mt-0.5">
                              {file.file_size ? (file.file_size / 1024).toFixed(1) : '0'} KB
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <div className="text-sm text-[#19324A]/70">No files yet</div>
                  <div className="text-xs text-[#19324A]/50">Upload files to see them here</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-borders">
              <button
                onClick={() => {
                  onOpenFilesPage();
                  onClose?.();
                }}
                className="w-full px-3 py-2 bg-[#f5b233] text-white rounded-lg hover:bg-[#f5b233]/90 transition-colors duration-200 text-sm font-medium"
              >
                Open U Class
              </button>
            </div>

            {/* Arrow */}
            {!coords.isMobile && (
              <div
                className="absolute w-3 h-3 bg-white border-l border-t border-borders rotate-45 -z-10"
                style={{
                  top: coords.arrowTop,
                  left: coords.arrowLeft,
                }}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};

export default FilesBrowser;
