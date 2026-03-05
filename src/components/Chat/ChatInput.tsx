import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Image, Search, PenTool as Tool, FileText, RefreshCw, FolderOpen, ChevronUp, ChevronDown, Mic, MicOff } from 'lucide-react';
import { UserFile } from '../../services/fileService';

interface ChatInputProps {
  onSendMessage: (data: { text: string; files: File[]; isWebSearchActive: boolean }) => void;
  isTyping: boolean;
  onCancelResponse?: () => void;
  editingUserMessage?: { content: string; index: number } | null;
  onCancelEdit?: () => void;
  onShowImageGen?: () => void;
  selectedFiles?: File[];
  onFileSelect?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  onOpenFilesBrowser?: (anchorEl: HTMLElement) => void;
  imagePrompt?: string;
  setImagePrompt?: (prompt: string) => void;
  isGeneratingImage?: boolean;
  onImageGenerate?: () => void;
  modelLabel?: string;
  onOpenModelSelector?: (anchorEl: HTMLElement) => void;
  regionLabel?: string;
  onOpenRegionSelector?: (anchorEl: HTMLElement) => void;
  imageModelLabel?: string;
  onOpenImageModelSelector?: (anchorEl: HTMLElement) => void;
  isImageMode?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isTyping,
  onCancelResponse,
  editingUserMessage,
  onCancelEdit,
  onShowImageGen,
  selectedFiles = [],
  onFileSelect,
  onRemoveFile,
  onOpenFilesBrowser,
  imagePrompt = '',
  setImagePrompt,
  isGeneratingImage = false,
  onImageGenerate,
  modelLabel,
  onOpenModelSelector,
  regionLabel,
  onOpenRegionSelector,
  imageModelLabel,
  onOpenImageModelSelector,
  isImageMode = false,
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const DRAFT_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes in milliseconds
  const [showImagePromptInput, setShowImagePromptInput] = useState(false);
  const [isCraftMode, setIsCraftMode] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState<'craft-1' | 'craft-2'>(() => {
    try {
      const saved = localStorage.getItem('uhuru-image-model');
      if (saved && (saved === 'craft-1' || saved === 'craft-2')) {
        return saved as 'craft-1' | 'craft-2';
      }
    } catch {}
    return 'craft-1'; // Default to Craft-1
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userStoppedListening, setUserStoppedListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [microphonePermissionError, setMicrophonePermissionError] = useState<string | null>(null);
  const [fileLimitError, setFileLimitError] = useState<string | null>(null);

  // Undo/Redo functionality
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [lastSavedMessage, setLastSavedMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const browseButtonRef = useRef<HTMLButtonElement>(null);
  const modelSelectorBtnRef = useRef<HTMLButtonElement>(null);
  const regionSelectorBtnRef = useRef<HTMLButtonElement>(null);
  const imageModelSelectorBtnRef = useRef<HTMLButtonElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const baseMessageRef = useRef<string>('');
  
  // Document upload limit
  const MAX_DOCUMENTS = 10;

  // Sync local showImagePromptInput state with parent's isImageMode prop
  // This ensures the input reverts to text mode after image generation
  useEffect(() => {
    setShowImagePromptInput(isImageMode);
  }, [isImageMode]);

  // Handle file upload button click
  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFileSelect) {
      // Check 10-document limit
      const availableSlots = MAX_DOCUMENTS - selectedFiles.length;
      
      if (availableSlots <= 0) {
        setFileLimitError(`You can only attach up to ${MAX_DOCUMENTS} documents at once. Remove some files to add new ones.`);
        e.target.value = ''; // Reset input
        return;
      }
      
      // Take only the number of files that fit within the limit
      const fileArray = Array.from(files).slice(0, availableSlots);
      
      // Show warning if some files were excluded
      if (files.length > availableSlots) {
        setFileLimitError(`Only ${availableSlots} of ${files.length} files were added due to the ${MAX_DOCUMENTS}-document limit.`);
      } else {
        setFileLimitError(null); // Clear any previous errors
      }

      onFileSelect(fileArray);
    }
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  };
  // Handle remove file
  const handleRemoveFile = (index: number) => {
    if (onRemoveFile) {
      onRemoveFile(index);
    }
  };
  
  // Handle UserFile selection (from recent files or search)
  const handleUserFileSelect = async (userFile: UserFile) => {
    // Check 10-document limit
    if (selectedFiles.length >= MAX_DOCUMENTS) {
      setFileLimitError(`You can only attach up to ${MAX_DOCUMENTS} documents at once. Remove some files to add this one.`);
      return;
    }
    
    try {
      // Convert UserFile to File object
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-files/${userFile.storage_path}`);
      const blob = await response.blob();
      const file = new File([blob], userFile.file_name, { type: userFile.file_type });
      
      if (onFileSelect) {
        const newFiles = [...selectedFiles, file];
        onFileSelect(newFiles);
      }
      setFileLimitError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error loading file:', error);
      setFileLimitError('Error loading file. Please try again.');
    }
  };
  
  // Load draft from sessionStorage on mount
  useEffect(() => {
    try {
      const draftKey = 'uhuru-chat-draft';
      const savedDraft = sessionStorage.getItem(draftKey);

      if (savedDraft) {
        const { text, timestamp } = JSON.parse(savedDraft);
        const now = Date.now();

        // Check if draft is less than 2 minutes old
        if (now - timestamp < DRAFT_EXPIRY_MS) {
          setMessage(text);
          // Adjust textarea height after loading draft
          setTimeout(() => {
            if (textareaRef.current) {
              adjustTextareaHeight();
            }
          }, 0);
        } else {
          // Clear expired draft
          sessionStorage.removeItem(draftKey);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, []);

  // Save draft to sessionStorage with debouncing
  useEffect(() => {
    const draftKey = 'uhuru-chat-draft';

    if (message.trim()) {
      const timeoutId = setTimeout(() => {
        try {
          const draft = {
            text: message,
            timestamp: Date.now()
          };
          sessionStorage.setItem(draftKey, JSON.stringify(draft));
        } catch (error) {
          console.error('Error saving draft:', error);
        }
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    } else {
      // Clear draft if message is empty
      sessionStorage.removeItem(draftKey);
    }
  }, [message]);

  // Update input field when editing a message
  useEffect(() => {
    if (editingUserMessage) {
      setMessage(editingUserMessage.content);
      // Focus the textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
        }
      }, 0);
    } else {
      setMessage('');
    }
  }, [editingUserMessage]);
  
  // Auto-focus textarea when Uhuru finishes responding
  useEffect(() => {
    if (!isTyping && !editingUserMessage && textareaRef.current) {
      // Small delay to ensure the UI has updated
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [isTyping, editingUserMessage]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if ((message.trim() || selectedFiles.length > 0) && !isTyping && !showImagePromptInput && !isGeneratingImage) {
      // Check if in craft mode and handle image generation
      if (isCraftMode && message.trim().toLowerCase().startsWith('craft:')) {
        const imageDescription = message.substring(6).trim(); // Remove "Craft:" prefix
        if (imageDescription && setImagePrompt && onImageGenerate) {
          // Send the user's message first
          onSendMessage({ text: imageDescription, files: [], isWebSearchActive: false });

          // Then trigger image generation with the description
          setImagePrompt(imageDescription);
          setTimeout(() => {
            onImageGenerate();
          }, 0);

          setMessage('');
          setIsCraftMode(false);
          return;
        }
      }

      onSendMessage({ text: message, files: selectedFiles, isWebSearchActive: false });
      setMessage('');
      setIsCraftMode(false);

      // Clear draft from sessionStorage after successful send
      try {
        sessionStorage.removeItem('uhuru-chat-draft');
      } catch (error) {
        console.error('Error clearing draft:', error);
      }

      // If we were editing, clear the editing state
      if (editingUserMessage && onCancelEdit) {
        onCancelEdit();
      }

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };
  
  const handleButtonClick = () => {
    if (isTyping && onCancelResponse) {
      onCancelResponse();
    } else {
      handleSubmit(new Event('submit') as any);
    }
  };
  
  const handleCancelEdit = () => {
    if (onCancelEdit) {
      onCancelEdit();
    }
    setMessage('');
  };

  // Save current message to undo stack
  const saveToUndoStack = (currentMessage: string) => {
    // Only save if the message has actually changed
    if (currentMessage !== lastSavedMessage) {
      setUndoStack(prev => [...prev, lastSavedMessage].slice(-50)); // Keep last 50 states
      setLastSavedMessage(currentMessage);
      setRedoStack([]); // Clear redo stack on new input
    }
  };

  // Handle undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, message]);
    setUndoStack(prev => prev.slice(0, -1));
    setMessage(previousState);
    setLastSavedMessage(previousState);

    // Restore cursor position and adjust height
    setTimeout(() => {
      if (textareaRef.current) {
        adjustTextareaHeight();
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Handle redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, message]);
    setRedoStack(prev => prev.slice(0, -1));
    setMessage(nextState);
    setLastSavedMessage(nextState);

    // Restore cursor position and adjust height
    setTimeout(() => {
      if (textareaRef.current) {
        adjustTextareaHeight();
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Handle message change with undo tracking
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    saveToUndoStack(message);
    setMessage(newMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Ctrl+Z (Undo)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }

    // Handle Ctrl+Shift+Z or Ctrl+Y (Redo)
    if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
      e.preventDefault();
      handleRedo();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape' && editingUserMessage) {
      e.preventDefault();
      handleCancelEdit();
    }
  };
  
  // Auto-resize textarea with smooth transitions
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to calculate scrollHeight
      textarea.style.height = 'auto';

      // Calculate new height with proper min/max constraints
      const minHeight = 52; // Single line height
      const maxHeight = 180; // ~6 lines
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));

      // Apply new height with smooth transition
      textarea.style.height = `${newHeight}px`;
    }
  };
  
  // Close tools panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node) && !toolsCollapsed) {
        // Don't auto-close since tools are now permanent
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [toolsCollapsed]);
  
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);
  
  
  // Initialize speech recognition if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const isAndroid = /android/i.test(navigator.userAgent);
        recognitionRef.current = new SpeechRecognition();
        // Android Chrome freezes with continuous=true; use single-shot mode instead
        recognitionRef.current.continuous = !isAndroid;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event: any) => {
          let fullFinal = '';
          let interimText = '';

          // Rebuild the complete transcript from ALL results (index 0)
          // to avoid duplication from overlapping resultIndex values
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              fullFinal += result[0].transcript;
            } else {
              interimText += result[0].transcript;
            }
          }

          // Update interim transcript for real-time display
          setInterimTranscript(interimText);

          // Set message to base text + all finalized transcript so far
          const base = baseMessageRef.current;
          const newMessage = base
            ? `${base} ${fullFinal}`.trim()
            : fullFinal.trim();
          setMessage(newMessage);
          setTimeout(adjustTextareaHeight, 0);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          // Only log errors if user didn't intentionally stop
          if (!userStoppedListening) {
            console.error('Speech recognition error:', event.error);
            
            // Handle permission errors specifically
            if (event.error === 'not-allowed' || event.error === 'permission-denied') {
              setMicrophonePermissionError(
                'Microphone access is needed for voice input. Please allow microphone access in your browser settings and try again.'
              );
            } else if (event.error === 'no-speech') {
              // Don't show error for no speech - this is normal
            } else {
              setMicrophonePermissionError(
                'Voice input encountered an issue. Please check your microphone and try again.'
              );
            }
          }
          // Clean up state on error
          setIsListening(false);
          setUserStoppedListening(false);
          setInterimTranscript('');
        };
        
        recognitionRef.current.onend = () => {
          // Only commit remaining interim text that never became final
          setInterimTranscript(prev => {
            if (prev.trim()) {
              setMessage(current => current ? `${current} ${prev.trim()}` : prev.trim());
            }
            return '';
          });

          // On Android (non-continuous mode), auto-restart if user hasn't stopped
          const isAndroidDevice = /android/i.test(navigator.userAgent);
          if (isAndroidDevice && !userStoppedListening && recognitionRef.current) {
            try {
              // Update base to include everything accumulated so far
              setMessage(current => {
                baseMessageRef.current = current;
                return current;
              });
              recognitionRef.current.start();
              return; // Don't reset isListening — keep the mic active
            } catch (e) {
              // If restart fails, fall through to stop
            }
          }

          setIsListening(false);
          setUserStoppedListening(false);
          setTimeout(adjustTextareaHeight, 0);
        };
      }
    }

    // Cleanup: stop recognition if active when component unmounts
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore — may not be started
        }
      }
    };
  }, []);
  
  // Helper function to request microphone permission
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicrophonePermissionError(
          'Microphone access was denied. Please allow microphone access in your browser settings to use voice input.'
        );
      } else if (error.name === 'NotFoundError') {
        setMicrophonePermissionError(
          'No microphone found. Please connect a microphone and try again.'
        );
      } else {
        setMicrophonePermissionError(
          'Could not access microphone. Please check your device settings and try again.'
        );
      }
      return false;
    }
  };
  
  // Handle microphone click
  const handleMicrophoneClick = async () => {
    if (isListening) {
      // Stop listening - let onend handler commit any remaining transcript
      setUserStoppedListening(true);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // isListening will be set to false by onend handler
    } else {
      // Start listening
      setUserStoppedListening(false);
      setMicrophonePermissionError(null); // Clear any previous errors
      setInterimTranscript('');
      if (recognitionRef.current) {
        // Request microphone permission first
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          return; // Permission denied, error message already set
        }
        
        try {
          // Save current message as the base before recording starts
          baseMessageRef.current = message;
          recognitionRef.current.start();
          setIsListening(true);
          
          // Focus the textarea and set cursor to end
          if (textareaRef.current) {
            textareaRef.current.focus();
            const textLength = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(textLength, textLength);
          }
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
          setMicrophonePermissionError(
            'Could not start voice input. Please check your microphone and try again.'
          );
        }
      } else {
        console.log('Speech recognition not supported in this browser');
        setMicrophonePermissionError(
          'Voice input is not supported in this browser. Try using Chrome, Edge, or Safari.'
        );
      }
    }
  };
  
  // Function to clean Markdown formatting from pasted text
  const cleanMarkdownText = (text: string): string => {
    return text
      // Remove header markers (# ## ### etc.)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold markers (**text** or __text__)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      // Remove italic markers (*text* or _text_)
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
      .replace(/(?<!_)_([^_]+)_(?!_)/g, '$1')
      // Remove strikethrough markers (~~text~~)
      .replace(/~~(.*?)~~/g, '$1')
      // Remove blockquote markers (> text)
      .replace(/^>\s+/gm, '')
      // Remove code block markers (```text```)
      .replace(/```[\s\S]*?```/g, (match) => {
        // Extract content between code block markers
        return match.replace(/```[a-zA-Z]*\n?/g, '').replace(/```$/g, '');
      })
      // Remove inline code markers (`text`)
      .replace(/`([^`]+)`/g, '$1')
      // Remove link markers ([text](url))
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove image markers (![alt](url))
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Remove horizontal rule markers (--- or ***)
      .replace(/^[-*]{3,}$/gm, '')
      // Clean up multiple whitespace and newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };
  
  // Handle paste events to clean Markdown formatting
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();

    // Save current state to undo stack before pasting
    saveToUndoStack(message);

    // Get the pasted text
    const pastedText = e.clipboardData.getData('text/plain');

    // Clean the Markdown formatting
    const cleanedText = cleanMarkdownText(pastedText);

    // Get current cursor position
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert cleaned text at cursor position
      const newMessage = message.substring(0, start) + cleanedText + message.substring(end);
      setMessage(newMessage);
      setLastSavedMessage(newMessage); // Update last saved message

      // Restore cursor position after the inserted text
      setTimeout(() => {
        if (textarea) {
          const newCursorPosition = start + cleanedText.length;
          textarea.setSelectionRange(newCursorPosition, newCursorPosition);
          textarea.focus();
        }
      }, 0);
    }
  };
  
  return (
    <div className="relative">
      
      {/* Microphone Permission Error */}
      <AnimatePresence>
        {microphonePermissionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <Mic className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium mb-1">Microphone Access Required</p>
                <p className="text-xs text-red-600">{microphonePermissionError}</p>
              </div>
              <button
                onClick={() => setMicrophonePermissionError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* File Limit Error */}
      <AnimatePresence>
        {fileLimitError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-orange-700 font-medium mb-1">Document Limit</p>
                <p className="text-xs text-orange-600">{fileLimitError}</p>
              </div>
              <button
                onClick={() => setFileLimitError(null)}
                className="text-orange-400 hover:text-orange-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-16 shadow-[0_0_20px_8px_rgba(1,112,185,0.15),0_0_0_2px_rgba(245,178,51,0.2)] hover:shadow-[0_0_25px_10px_rgba(1,112,185,0.25),0_0_0_2px_rgba(245,178,51,0.3)] transition-shadow duration-200"
      >
        {/* Permanent Tools Menu - positioned above textarea, slightly darker than input */}
              <div data-element="chat-tools-menu" className="flex items-center gap-2 px-4 py-2 bg-sand-200/40">
                {/* Image button */}
                <button
                  type="button"
                  onClick={() => {
                    // Prevent opening image generation if files are attached
                    if (selectedFiles.length > 0) {
                      setFileLimitError('Cannot generate images while files are attached. Please remove files first or send them separately.');
                      setTimeout(() => setFileLimitError(null), 3000);
                      return;
                    }
                    setShowImagePromptInput(!showImagePromptInput);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 ${
                    showImagePromptInput
                      ? 'bg-[#0170b9]/10 text-[#0170b9] border border-[#0170b9]/20'
                      : 'hover:bg-white hover:shadow-sm text-gray-600 hover:text-gray-800'
                  }`}
                  title="Generate image"
                >
                  <Image className="w-4 h-4" />
                  <span>Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleFileUploadClick();
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 ${
                    selectedFiles.length > 0
                      ? 'bg-[#0170b9]/10 text-[#0170b9] border border-[#0170b9]/20'
                      : 'hover:bg-white hover:shadow-sm text-gray-600 hover:text-gray-800'
                  }`}
                  title="Upload file"
                >
                  <FileText className="w-4 h-4" />
                  <span>Upload</span>
                  {selectedFiles.length > 0 && (
                    <span className="bg-[#0170b9] text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                      {selectedFiles.length}
                    </span>
                  )}
                  {selectedFiles.length >= MAX_DOCUMENTS && (
                    <span className="bg-[#f5b233] text-white rounded-full text-xs px-1.5 py-0.5 flex items-center justify-center">
                      MAX
                    </span>
                  )}
                </button>
                
                {/* U Files button removed as requested */}
                
                {/* Region Selector Trigger */}
                {regionLabel && onOpenRegionSelector && (
                  <button
                    type="button"
                    ref={regionSelectorBtnRef}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenRegionSelector(regionSelectorBtnRef.current!);
                    }}
                    className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 hover:bg-white hover:shadow-sm text-gray-600 hover:text-gray-800"
                    title="Select region"
                  >
                    <span className="font-medium">{regionLabel}</span>
                  </button>
                )}

                {/* Model Selector Trigger */}
                {modelLabel && onOpenModelSelector && (
                  <button
                    type="button"
                    ref={modelSelectorBtnRef}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenModelSelector(modelSelectorBtnRef.current!);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 hover:bg-white hover:shadow-sm text-gray-600 hover:text-gray-800"
                    title="Select AI model"
                  >
                    <span className="font-medium">{modelLabel}</span>
                  </button>
                )}
              </div>

        {/* Image Generation Input */}
        <AnimatePresence>
          {showImagePromptInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 bg-gradient-to-r from-[#FEF7E8] to-blue-50 border-b border-[#f5b233]/30"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-[#0170b9] mb-1 block">
                    Describe the image you want to create
                  </label>
                  <input
                    type="text"
                    value={imagePrompt || ''}
                    onChange={(e) => setImagePrompt?.(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && imagePrompt?.trim()) {
                        e.preventDefault();
                        onImageGenerate?.();
                      } else if (e.key === 'Escape') {
                        setShowImagePromptInput(false);
                        setImagePrompt?.('');
                      }
                    }}
                    placeholder="e.g., A serene African sunset over the savanna..."
                    disabled={isGeneratingImage}
                    autoCapitalize="none"
                    className="w-full px-3 py-2 border border-[#f5b233]/40 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#f5b233] focus:border-[#f5b233] transition-all disabled:opacity-60"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-[#0170b9]">
                      Powered by Uhuru AI Image Generation • Press Enter to generate or Esc to cancel
                    </p>
                    {imageModelLabel && onOpenImageModelSelector && (
                      <button
                        type="button"
                        ref={imageModelSelectorBtnRef}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onOpenImageModelSelector(imageModelSelectorBtnRef.current!);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors duration-200 hover:bg-white hover:shadow-sm text-[#0170b9] font-medium border border-[#f5b233]/20"
                        title="Select image model"
                      >
                        <span>{imageModelLabel}</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  {isGeneratingImage ? (
                    <div className="p-2.5 text-[#f5b233]">
                      <div className="w-5 h-5 border-2 border-[#f5b233] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={() => {
                        if (imagePrompt?.trim()) {
                          onImageGenerate?.();
                        }
                      }}
                      disabled={!imagePrompt?.trim() || isGeneratingImage}
                      className="p-2.5 text-[#0170b9] hover:text-[#f5b233] hover:bg-[#FEF7E8] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Generate image"
                    >
                      <Image className="w-5 h-5" />
                    </motion.button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowImagePromptInput(false);
                      setImagePrompt?.('');
                    }}
                    className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end relative">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.json,image/*"
          />

          {/* Static Placeholder */}
          {!message && !editingUserMessage && !showImagePromptInput && selectedFiles.length === 0 && !isFocused && (
            <div className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center pl-[0.95cm]">
              <span className="text-sm text-[#19324A]/50">
                Ask me anything...
              </span>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={message + (interimTranscript ? (message ? ' ' : '') + interimTranscript : '')}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder=""
            rows={1}
            disabled={isTyping || isListening || isGeneratingImage}
            autoCapitalize="none"
            className="flex-1 py-3 sm:py-4 px-4 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-sm text-black disabled:opacity-60 transition-all duration-200"
            style={{
              fontSize: '16px',
              minHeight: '52px',
              maxHeight: '180px',
              height: '52px',
              overflow: 'hidden'
            }}
          />
          
          {/* Editing indicator */}
          {editingUserMessage && (
            <div className="absolute top-1 right-14 sm:right-16 flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
              <RefreshCw className="w-3 h-3" />
              <span>Editing</span>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {/* Action buttons */}
          <div className="flex items-center">
            {/* Cancel edit button */}
            {editingUserMessage && onCancelEdit && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-2 sm:p-2.5 text-gray-400 hover:text-gray-600 transition-colors duration-200 min-h-[44px] mr-1"
                title="Cancel edit"
              >
                <X className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            )}
            
            {/* Microphone button */}
            <motion.button
              type="button"
              onClick={handleMicrophoneClick}
              className={`p-2 sm:p-2.5 ${
                isListening
                  ? 'text-red-500 hover:text-red-600 bg-red-50 rounded-lg'
                  : recognitionRef.current
                    ? 'text-[#f5b233] hover:text-[#f5b233]/80'
                    : 'text-gray-400 cursor-not-allowed'
              } transition-colors duration-200 min-h-[44px] mr-1`}
              whileHover={recognitionRef.current ? { scale: 1.05 } : {}}
              whileTap={recognitionRef.current ? { scale: 0.95 } : {}}
              title={
                isListening 
                  ? "Stop listening" 
                  : recognitionRef.current 
                    ? "Click to dictate" 
                    : "Voice input not supported"
              }
              disabled={!recognitionRef.current}
            >
              {isListening ? (
                <MicOff className="w-4 sm:w-5 h-4 sm:h-5 animate-pulse" />
              ) : (
                <Mic className="w-4 sm:w-5 h-4 sm:h-5" />
              )}
            </motion.button>
            
            {/* Send/Resend button */}
            <motion.button
              type="button"
              onClick={handleButtonClick}
              className={`p-2 sm:p-2.5 ${
                isTyping
                  ? 'p-1.5 sm:p-2 border-2 border-red-500 text-red-500 hover:border-red-600 hover:text-red-600 rounded-lg bg-transparent'
                  : (message.trim() || selectedFiles.length > 0) && !showImagePromptInput && !isGeneratingImage
                    ? 'p-2 sm:p-2.5 text-[#f5b233] hover:text-[#f5b233]/80'
                    : 'text-gray-400 cursor-not-allowed'
              } transition-colors duration-200 ${isTyping ? 'min-h-[36px]' : 'min-h-[44px]'} group`}
              whileHover={isTyping || ((message.trim() || selectedFiles.length > 0) && !showImagePromptInput && !isGeneratingImage) ? { scale: 1.05 } : {}}
              whileTap={isTyping || ((message.trim() || selectedFiles.length > 0) && !showImagePromptInput && !isGeneratingImage) ? { scale: 0.95 } : {}}
              title={isTyping ? "Cancel response" : editingUserMessage ? "Resend message" : "Send message"}
              disabled={showImagePromptInput || isGeneratingImage}
            >
              {isTyping ? (
                <X className="w-4 h-4" />
              ) : (
                <Send className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              )}
            </motion.button>
          </div>
        </div>
        
        {message && (
          <button
            type="button"
            onClick={() => setMessage('')}
            className="absolute top-1 right-16 sm:right-20 p-0.5 rounded-full bg-sand dark:bg-navy/70 text-navy/70 dark:text-white/70 hover:bg-sand/80 dark:hover:bg-navy/60 transition-colors duration-200"
            aria-label="Clear message"
          >
            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        )}
      </form>

      {/* Uploaded Files Display - Behind chat input */}
      {selectedFiles.length > 0 && (
        <FilePreviewThumbnails files={selectedFiles} onRemove={handleRemoveFile} />
      )}
    </div>
  );
};

/**
 * Extracted component for file preview thumbnails.
 * Creates blob URLs via useMemo and revokes them on cleanup to prevent memory leaks.
 */
const FilePreviewThumbnails: React.FC<{ files: File[]; onRemove: (index: number) => void }> = ({ files, onRemove }) => {
  // Create stable blob URLs and revoke on change/unmount
  const previews = useMemo(() => {
    return files.map(file =>
      file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    );
  }, [files]);

  useEffect(() => {
    return () => {
      previews.forEach(url => { if (url) URL.revokeObjectURL(url); });
    };
  }, [previews]);

  return (
    <div className="absolute left-4 flex gap-2" style={{ bottom: '-32px', zIndex: -1 }}>
      {files.map((file, index) => (
        <div
          key={index}
          className="relative w-24 h-10 rounded-t-lg border border-b-0 border-borders bg-white shadow-sm overflow-hidden"
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          {previews[index] ? (
            <img src={previews[index]!} alt={file.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
            title="Remove file"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ChatInput;