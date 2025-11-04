import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, PanelLeft, ArrowDown, Menu, Image, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserFile, searchFiles, uploadChatImage, uploadChatDocument } from '../../services/fileService';

import ConversationList from './ConversationList';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import ModelSelector from './ModelSelector';
import ImageModelSelector, { ImageModel } from './ImageModelSelector';
import RegionSelector from '../RegionSelector';
import FilesBrowser from './FilesBrowser';
import SettingsModal from '../Settings/SettingsModal';
import ImageGenerationLoader from '../ImageGenerationLoader';
import Particles from '../Particles';
import { useTheme } from '../../context/ThemeContext';

import { useConversations } from '../../context/ConversationContext';
import { useAuth } from '../../context/AuthContext';

import {
  streamResponse,
  addMessage,
  updateMessage,
  deleteMessagesAfter,
  generateImage,
} from '../../services/chatService';
import { LONG_RESPONSE_THRESHOLD, REGIONS } from '../../utils/constants';
import { Conversation } from '../../types/chat';
import { supabase } from '../../services/authService';
import { saveChatStateBackup, clearChatStateBackup } from '../../utils/chatStateRecovery';

interface TypingState {
  isTyping: boolean;
  message: string;
}

interface ChatInterfaceProps {
  onClose: () => void;
  userSubscription: any;
}

type ModelVer = "2.0";
type Verbosity = "low" | "medium" | "high";

export default function ChatInterface({
  onClose,
  userSubscription,
}: ChatInterfaceProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { theme } = useTheme(); // Get theme from context
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(240);

  const [typingState, setTypingState] = useState<TypingState>({ isTyping: false, message: '' });
  const [webFetchingState, setWebFetchingState] = useState<{ isFetching: boolean; status: string }>({
    isFetching: false,
    status: '',
  });
  const [editingUserMessage, setEditingUserMessage] = useState<{ content: string; index: number; id?: string } | null>(null);
  const [showUserCancellationMessage, setShowUserCancellationMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Image generation state
  const [showImageInput, setShowImageInput] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModel>(() => {
    try {
      const saved = localStorage.getItem('uhuru-image-model');
      if (saved && (saved === 'craft-1' || saved === 'craft-2')) {
        return saved as ImageModel;
      }
    } catch {}
    return 'craft-1';
  });

  // Model selector state
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [modelSelectorAnchorEl, setModelSelectorAnchorEl] = useState<HTMLElement | null>(null);

  // Region selector state
  const [regionSelectorOpen, setRegionSelectorOpen] = useState(false);
  const [regionSelectorAnchorEl, setRegionSelectorAnchorEl] = useState<HTMLElement | null>(null);

  // Image model selector state
  const [imageModelSelectorOpen, setImageModelSelectorOpen] = useState(false);
  const [imageModelSelectorAnchorEl, setImageModelSelectorAnchorEl] = useState<HTMLElement | null>(null);

  // Files browser state
  const [filesBrowserOpen, setFilesBrowserOpen] = useState(false);
  const [filesBrowserAnchorEl, setFilesBrowserAnchorEl] = useState<HTMLElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // File management state
  const [recentFiles, setRecentFiles] = useState<UserFile[]>([]);
  const [fileSearchResults, setFileSearchResults] = useState<UserFile[]>([]);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const [modelVersion, setModelVersion] = useState<ModelVer>(() => {
    try {
      const saved = localStorage.getItem("uhuru-last-model");
      if (saved && saved === "2.0") {
        return saved as ModelVer;
      }
    } catch {}
    return "2.0"; // Default to Uhuru 2.0
  });

  const [deepThinkMap, setDeepThinkMap] = useState<Record<ModelVer, Verbosity>>(() => {
    try {
      return JSON.parse(localStorage.getItem("uhuru-deepthink-map") || "") || { "2.0":"low" };
    } catch {
      return { "2.0":"low" };
    }
  });
  
  const verbosity = deepThinkMap[modelVersion] ?? "low";
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [selectedRegion, setSelectedRegion] = useState('global');
  
  // State to track processed message IDs to prevent duplicates
  const processedMessageIds = useRef<Set<string>>(new Set());
  
  // Refs for streaming state - moved to component level to avoid hook call errors
  const assistantIndexRef = useRef<number | null>(null);
  const completionSeenRef = useRef<boolean>(false);
  const assistantLocalIdRef = useRef<string | null>(null);
  
  // Detect admin status from profile team_role
  const isAdmin = profile?.team_role === 'supa_admin' || profile?.team_role === 'admin';

  // Update sidebar width when collapse state changes
  useEffect(() => {
    setSidebarWidth(isSidebarCollapsed ? 64 : 240);
  }, [isSidebarCollapsed]);

  // Save model version to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem("uhuru-last-model", modelVersion);
    } catch {}
  }, [modelVersion]);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isTeamAccount =
    profile?.team_role === 'supa_admin' ||
    profile?.team_role === 'admin' ||
    profile?.team_role === 'prime';

  // Generate model label for the trigger button
  const getModelLabel = () => {
    const currentVerbosity = deepThinkMap[modelVersion] ?? 'low';
    const verbosityMap = {
      'low': 'Default',
      'medium': 'Long',
      'high': 'Extra Long'
    };

    return verbosityMap[currentVerbosity];
  };

  // Generate region label for the trigger button
  const getRegionLabel = () => {
    const selectedRegionObject = REGIONS.find(region => region.code === selectedRegion) || REGIONS[0];
    return selectedRegionObject.flag
      ? `${selectedRegionObject.flag} ${selectedRegionObject.name}`
      : selectedRegionObject.name;
  };

  // Generate image model label for the trigger button
  const getImageModelLabel = () => {
    return selectedImageModel === 'craft-1' ? 'Craft-1' : 'Craft-2';
  };

  // Handle toggling model selector (click to open, click again to close)
  const handleOpenModelSelector = useCallback((anchorEl: HTMLElement) => {
    if (modelSelectorOpen) {
      // If already open, close it
      setModelSelectorOpen(false);
      setModelSelectorAnchorEl(null);
    } else {
      // Otherwise, open it
      setModelSelectorAnchorEl(anchorEl);
      setModelSelectorOpen(true);
    }
  }, [modelSelectorOpen]);

  // Handle closing model selector
  const handleCloseModelSelector = useCallback(() => {
    setModelSelectorOpen(false);
    setModelSelectorAnchorEl(null);
  }, []);

  // Handle toggling region selector (click to open, click again to close)
  const handleOpenRegionSelector = useCallback((anchorEl: HTMLElement) => {
    if (regionSelectorOpen) {
      // If already open, close it
      setRegionSelectorOpen(false);
      setRegionSelectorAnchorEl(null);
    } else {
      // Otherwise, open it
      setRegionSelectorAnchorEl(anchorEl);
      setRegionSelectorOpen(true);
    }
  }, [regionSelectorOpen]);

  // Handle closing region selector
  const handleCloseRegionSelector = useCallback(() => {
    setRegionSelectorOpen(false);
    setRegionSelectorAnchorEl(null);
  }, []);

  // Handle toggling image model selector
  const handleOpenImageModelSelector = useCallback((anchorEl: HTMLElement) => {
    if (imageModelSelectorOpen) {
      setImageModelSelectorOpen(false);
      setImageModelSelectorAnchorEl(null);
    } else {
      setImageModelSelectorAnchorEl(anchorEl);
      setImageModelSelectorOpen(true);
    }
  }, [imageModelSelectorOpen]);

  // Handle closing image model selector
  const handleCloseImageModelSelector = useCallback(() => {
    setImageModelSelectorOpen(false);
    setImageModelSelectorAnchorEl(null);
  }, []);

  // Handle toggling files browser (click to open, click again to close)
  const handleOpenFilesBrowser = useCallback((anchorEl: HTMLElement) => {
    if (filesBrowserOpen) {
      setFilesBrowserOpen(false);
      setFilesBrowserAnchorEl(null);
    } else {
      setFilesBrowserAnchorEl(anchorEl);
      setFilesBrowserOpen(true);
    }
  }, [filesBrowserOpen]);

  // Handle closing files browser
  const handleCloseFilesBrowser = useCallback(() => {
    setFilesBrowserOpen(false);
    setFilesBrowserAnchorEl(null);
  }, []);

  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    createNewConversation,
    updateConversation,
  } = useConversations();

  // Restore state from session storage on mount
  const hasBootstrapped = useRef(false);
  useEffect(() => {
    // Ensure we always have a conversation to display
    if (!hasBootstrapped.current && !currentConversation) {
      hasBootstrapped.current = true;

      // ConversationContext should always provide a conversation
      // If not, create one as fallback
      if (conversations.length > 0) {
        setCurrentConversation(conversations[0]);
      } else {
        createNewConversation()
          .then((c) => {
            setCurrentConversation(c);
          })
          .catch((e) => console.error('Error creating initial conversation:', e));
      }
    }
  }, [currentConversation, conversations]);

  // Save chat state backup periodically
  useEffect(() => {
    if (currentConversation && currentConversation.messages.length > 0) {
      saveChatStateBackup(currentConversation);
    }
  }, [currentConversation]);

  // Clear backup on successful unmount (user navigated away intentionally)
  useEffect(() => {
    return () => {
      // Only clear if component is unmounting cleanly (not crashing)
      const isIntentionalNavigation = true; // Assume intentional unless error boundary catches it
      if (isIntentionalNavigation) {
        clearChatStateBackup();
      }
    };
  }, []);

  // Handle image generation request
  const handleImageGenerationRequest = async () => {
    if (!imagePrompt.trim() || !user) return;

    // If no conversation exists, create one first
    let conversationToUse = currentConversation;
    if (!conversationToUse) {
      try {
        conversationToUse = await createNewConversation();
        setCurrentConversation(conversationToUse);
      } catch (error) {
        console.error('Error creating conversation for image generation:', error);
        setError('Failed to create conversation. Please try again.');
        return;
      }
    }

    setIsGeneratingImage(true);
    setShowImageInput(false);

    try {
      // Map Craft model to backend model ID
      const backendModelId = selectedImageModel === 'craft-1' ? 'uhuru-craft-1' : 'uhuru-image-2.1';

      // Generate the image using Uhuru AI with selected Craft model
      const result = await generateImage(
        imagePrompt.trim(),
        user.id,
        '1024x1024',
        'white',
        backendModelId
      );

      if (!result.success || !result.images) {
        throw new Error(result.error || 'Failed to generate image');
      }

      // result.images now contains persistent public URLs from Supabase Storage
      const imageUrls = result.images;

      // Create multimodal content with just the generated images (no text prompt)
      const imageContent = imageUrls.map(url => ({
        type: 'image_url',
        image_url: { url }
      }));

      // Add the generated images as an assistant message
      const assistantMessage = {
        id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        role: 'assistant' as const,
        content: imageContent,
        timestamp: new Date(),
        isLongResponse: false
      };

      // Update conversation with the new message
      const updatedConversation = {
        ...conversationToUse,
        messages: [...conversationToUse.messages, assistantMessage],
        updatedAt: new Date()
      };

      setCurrentConversation(updatedConversation);
      updateConversation(updatedConversation);

      // Save to database
      if (user) {
        addMessage(conversationToUse.id, 'assistant', imageContent, user.id)
          .catch(error => console.error('Error saving image generation message:', error));
      }

      // Reset image prompt and hide input
      setImagePrompt('');
      setShowImageInput(false);
    } catch (error: any) {
      console.error('Error generating image:', error);
      setError(error.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Handle file attached via navigation state
  useEffect(() => {
    const fileToAttach = (location.state as any)?.fileToAttach;
    if (fileToAttach && user) {
      (async () => {
        try {
          const result = await getFileContent(fileToAttach.storage_path);
          const fileContent =
            (result.success && result.content) ? result.content : (fileToAttach.content_preview || 'Content not available');
          const attachedFile = new File([fileContent], fileToAttach.file_name, { type: fileToAttach.file_type });
          setSelectedFiles([attachedFile]);
        } catch (err) {
          console.error('Error attaching file from navigation:', err);
        } finally {
          navigate('/', { replace: true });
        }
      })();
    }
  }, [location.state, navigate, user]);

  // Scroll helpers
  const scrollToBottom = useCallback((instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
  }, []);

  // Instant scroll to bottom for conversation loading
  const scrollToBottomInstant = useCallback(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 100;
    setShowScrollToBottom(!isNearBottom);
  }, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll to bottom when messages change (smooth scroll for new messages)
  const previousMessageCountRef = useRef<number>(0);

  useEffect(() => {
    if (currentConversation?.messages.length) {
      const currentCount = currentConversation.messages.length;
      const previousCount = previousMessageCountRef.current;

      // If message count increased by 1, it's a new message - smooth scroll
      if (currentCount === previousCount + 1) {
        scrollToBottom(false);
      } else {
        // Otherwise, it's a conversation switch or initial load - instant scroll
        scrollToBottomInstant();
      }

      previousMessageCountRef.current = currentCount;
    }
  }, [currentConversation?.messages, scrollToBottom, scrollToBottomInstant]);

  // Auto-scroll when image generation starts
  useEffect(() => {
    if (isGeneratingImage) {
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        scrollToBottom(false);
      });
    }
  }, [isGeneratingImage, scrollToBottom]);

  // Load recent files when user changes
  useEffect(() => {
    if (user) {
      loadRecentFiles();
    }
  }, [user]);

  // Load recent files
  const loadRecentFiles = async () => {
    console.log('🔍 [DEBUG] loadRecentFiles called.');
    if (!user) return;

    setIsLoadingFiles(true);
    try {
      const result = await searchFiles(user.id, undefined, undefined, undefined, 20); // Get top 20 recent files
      console.log('📁 [DEBUG] searchFiles result:', result);
      if (result.success && result.files) {
        console.log('📁 [DEBUG] Setting recent files:', result.files.length, 'files');
        setRecentFiles(result.files);
      } else {
        console.error('📁 [DEBUG] Failed to load files:', result.error);
      }
    } catch (error) {
      console.error('Error loading recent files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Handle file search
  const handleFileSearch = async (query: string) => {
    console.log('🔍 [DEBUG] handleFileSearch called with query:', query);
    if (!user) return;
    
    setFileSearchQuery(query);
    
    if (!query.trim()) {
      setFileSearchResults([]);
      return;
    }
    
    setIsLoadingFiles(true);
    try {
      const result = await searchFiles(user.id, query, undefined, undefined, 10);
      if (result.success && result.files) {
        setFileSearchResults(result.files);
      }
    } catch (error) {
      console.error('Error searching files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Handle opening files page
  const handleOpenFilesPage = () => {
    console.log('🔍 [DEBUG] handleOpenFilesPage called.');
    navigate('/uhuru-files');
  };

  // Store abort controller in a ref to avoid cleanup on every change
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update ref when abortController changes
  useEffect(() => {
    abortControllerRef.current = abortController;
  }, [abortController]);

  // Only abort stream on actual unmount (not on re-renders)
  useEffect(() => {
    return () => {
      // Only abort if there's an active stream when component truly unmounts
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort('Component unmounting');
        } catch (e) {
          console.error('Error aborting stream on unmount:', e);
        }
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  const handleCancelResponse = () => {
    console.log('🔍 [DEBUG] handleCancelResponse called.');
    if (abortController) {
      abortController.abort('User cancelled request');
      setAbortController(null);
      setTypingState({ isTyping: false, message: '' });
    }
  };

  const processStreamEvent = useCallback((
    type: string,
    payload: any,
    assistantIndexRef: React.MutableRefObject<number | null>,
    completionSeenRef: React.MutableRefObject<boolean>,
    conversationForUpdate: Conversation,
    isEditingUserMessage: boolean
  ) => {
    if (type === 'message.delta') {
      const delta = payload.text ?? payload.textDelta ?? payload.delta ?? '';
      if (!delta) return;

      setCurrentConversation((prev) => {
        if (!prev) return prev;
        const conv = { ...prev, messages: [...prev.messages] }; // Ensure messages array is new reference

        if (assistantIndexRef.current === null) {
          const localId = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
          const msg = {
            localId,
            id: undefined, // Will be set when message is saved to database
            role: 'assistant' as const,
            content: delta,
            isLongResponse: delta.length > LONG_RESPONSE_THRESHOLD,
            timestamp: new Date(),
          };
          conv.messages = [...conv.messages, msg];
          assistantIndexRef.current = conv.messages.length - 1;
          assistantLocalIdRef.current = localId; // Store the local ID for deduplication
        } else {
          const msg = { ...conv.messages[assistantIndexRef.current] };
          msg.content = (msg.content || '') + delta;
          msg.isLongResponse = (msg.content?.length || 0) > LONG_RESPONSE_THRESHOLD; // Update long response flag
          conv.messages[assistantIndexRef.current] = msg;
        }

        return conv;
      });
    } else if (type === 'message.completed') {
      if (completionSeenRef.current) return;
      completionSeenRef.current = true;
      

      let finalConversation: Conversation | null = null;

      setCurrentConversation(prev => {
        if (!prev) return prev;
        const conv = { ...prev };

        if (assistantIndexRef.current !== null) {
          const msg = { ...conv.messages[assistantIndexRef.current] };
          // Use payload.text as authoritative source, only fall back to accumulated content if truly empty
          const finalTextToUse = payload.text || msg.content || '';
          msg.content = finalTextToUse; // Ensure final content is set
          msg.isLongResponse = (finalTextToUse.length || 0) > LONG_RESPONSE_THRESHOLD;
          conv.messages[assistantIndexRef.current] = msg;
        } else {
          // edge case: no deltas received
          const localId = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
          conv.messages = [...conv.messages, {
            localId,
            id: undefined, // Will be set when message is saved to database
            role: 'assistant' as const,
            content: payload.text ?? '',
            isLongResponse: (payload.text?.length || 0) > LONG_RESPONSE_THRESHOLD,
            timestamp: new Date(),
          }];
          assistantIndexRef.current = conv.messages.length - 1;
        } // else: this should not happen if deltas were received

        // Store the final conversation state for sidebar update
        finalConversation = conv;
        return conv;
      });
      
      // Save message to database and update sidebar (outside of state update)
      if (user && finalConversation && assistantIndexRef.current !== null) {
        const messageToSave = finalConversation.messages[assistantIndexRef.current].content;
        const localAssistantId = assistantLocalIdRef.current;
        
        console.log('🔍 [PROCESSSTREAM] About to save assistant message to database:', {
          conversationId: finalConversation.id.substring(0, 8) + '...',
          messageIndex: assistantIndexRef.current,
          contentLength: typeof messageToSave === 'string' ? messageToSave.length : Array.isArray(messageToSave) ? JSON.stringify(messageToSave).length : 0,
          localId: localAssistantId,
          isTemporary: finalConversation.isTemporary || false
        });

        // Pass the isTemporary flag (should be false by now since user message would have persisted it)
        addMessage(finalConversation.id, 'assistant', messageToSave, user.id, finalConversation.isTemporary || false)
          .then((result) => {
            console.log('🔍 [PROCESSSTREAM] addMessage result for assistant:', result);
            if (result.success && result.messageId && assistantIndexRef.current !== null) {
              console.log('🔍 [PROCESSSTREAM] ✅ Assistant message saved successfully, updating local ID');
              // Update the message with the database-assigned ID (but keep localId stable)
              setCurrentConversation((current) => {
                if (!current || assistantIndexRef.current === null) return current;
                const updatedConv = { ...current };
                const messageToUpdate = { ...updatedConv.messages[assistantIndexRef.current] };
                messageToUpdate.id = result.messageId;
                // Keep localId unchanged for stable React keys
                updatedConv.messages[assistantIndexRef.current] = messageToUpdate;

                // If this was a temporary conversation that got persisted, update the conversation ID
                if (result.actualConversationId && result.actualConversationId !== updatedConv.id) {
                  console.log('🔍 [PROCESSSTREAM] Temporary conversation persisted with new ID:', result.actualConversationId);
                  updatedConv.id = result.actualConversationId;
                  updatedConv.isTemporary = false;

                  // Ensure the persisted conversation appears in the sidebar
                  console.log('🔍 [PROCESSSTREAM] Updating sidebar after assistant message persistence');
                  queueMicrotask(() => {
                    updateConversation(updatedConv);
                  });
                }

                return updatedConv;
              });
            } else {
              console.warn('🔍 [PROCESSSTREAM] ⚠️ Assistant message save result was not fully successful:', result);
            }
          })
          .catch((error) => {
            console.error('🔍 [PROCESSSTREAM] ❌ Error saving assistant message to database:', error);
          });
      }
      
      // Update sidebar with the final conversation state (only if not editing)
      if (finalConversation && !isEditingUserMessage) {
        queueMicrotask(() => {
          updateConversation(finalConversation!);
        });
      }
    } else if (type === 'run.status') {
      const label =
        ({
          thinking: 'Uhuru is Thinking',
          calling_tools: 'Working…',
          waiting: 'Waiting for results…',
          finalizing: 'Composing answer…',
        } as any)[payload.phase] ?? 'Working…';
      setWebFetchingState({ isFetching: true, status: label });
    } else if (type === 'web.status' || type === 'tool.placeholder') {
      setWebFetchingState({ isFetching: true, status: payload.status || payload.label });
    } else if (type === 'error') {
      setError(payload.message ?? 'Something went wrong.');
    }
  }, []);

  // New function to start streaming, consolidating logic
  const startStreamingResponse = useCallback(async (
    conversationToStream: Conversation,
    userMessageContent: string,
    isEditing: boolean
  ) => {
    // Cancel any existing stream first
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort('Starting new stream');
      } catch (e) {
        console.error('Error aborting previous stream:', e);
      }
    }

    const ac = new AbortController();
    abortControllerRef.current = ac;
    setAbortController(ac);
    setTypingState({ isTyping: true, message: '' });

    // Clear any existing processed message IDs for this new stream
    if (!isEditing) {
      processedMessageIds.current.clear();
    }

    // Reset streaming refs for new stream
    assistantIndexRef.current = null;
    completionSeenRef.current = false;
    assistantLocalIdRef.current = null;

    try {
      await streamResponse({
        conversation: conversationToStream.messages,
        language: selectedLanguage,
        region: selectedRegion,
        modelVersion,
        verbosity,
        displayName: user?.user_metadata?.name || profile?.full_name || undefined,
        signal: ac.signal,
        onEvent: (type, payload) => processStreamEvent(
          type,
          payload,
          assistantIndexRef,
          completionSeenRef,
          conversationToStream,
          isEditing
        ),
      });
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        return;
      } else {
        console.error('Error details:', e);
        setError(e?.message ?? 'Connection interrupted. Please try again.');
      }
    } finally {
      setAbortController(null);
      setTypingState({ isTyping: false, message: '' });
      setWebFetchingState({ isFetching: false, status: '' });
    }
  }, [selectedLanguage, selectedRegion, modelVersion, verbosity, selectedAgent, processStreamEvent]);

  const handleSendMessage = useCallback(async (data: { text: string; files: File[]; isWebSearchActive: boolean }) => {
    if (!currentConversation || !user) return;

    const { text: message, files, isWebSearchActive } = data;

    // Handle message editing (rewind functionality)
    if (editingUserMessage) {

      try {
        // Find the message being edited
        const messageToEdit = currentConversation.messages[editingUserMessage.index];
        if (!messageToEdit || !(messageToEdit as any).id) {
          setEditingUserMessage(null);
          return;
        }

        const messageId = (messageToEdit as any).id;
        
        // Delete all messages after the edited message from the database
        await deleteMessagesAfter(currentConversation.id, messageId, user.id);
        
        // Update the edited message in the database
        await updateMessage(messageId, message, user.id);

        // Update local conversation state - rewind to the edited message
        const messagesUpToEdit = currentConversation.messages.slice(0, editingUserMessage.index);
        const editedMessage = {
          ...messageToEdit,
          content: message,
          timestamp: new Date()
        }; // Ensure content is updated
        
        const rewindedConversation = {
          ...currentConversation,
          messages: [...messagesUpToEdit, editedMessage],
          updatedAt: new Date()
        };
        
        // Update conversation state and set as current
        setCurrentConversation(rewindedConversation);
        updateConversation(rewindedConversation); // Update in the list

        // Clear editing state
        setEditingUserMessage(null);

        // Now generate new response from the edited conversation
        await startStreamingResponse(
          rewindedConversation,
          message, // The edited user message content
          true // Indicate this is an editing flow
        );
        return; // Exit early for edit case
      } catch (editError: any) {
        console.error('Error handling message edit:', editError);
        setError(editError.message || 'Failed to edit message. Please try again.');
        setEditingUserMessage(null);
        setTypingState({ isTyping: false, message: '' });
        setWebFetchingState({ isFetching: false, status: '' });
        setAbortController(null);
        return;
      }
    }

    // --- Normal message sending flow ---
    // Build multimodal payload
    let finalMessageContent = message;
    let displayContent = message;
    const multimodalContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    if (message?.trim()) multimodalContent.push({ type: 'text', text: message });

    // Create the user message immediately for optimistic UI
    let newUserMessage: any;
    
    if (files?.length) {
      // First, add all files to multimodal content with temporary representations
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          try {
            // Add image with Data URL for immediate display
            const reader = new FileReader();
            const dataUrl: string = await new Promise((resolve, reject) => {
              // Set up error handler
              reader.onerror = () => {
                const error = reader.error;
                console.error('[ChatInterface] FileReader error:', {
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type,
                  error
                });
                reject(new Error(`Failed to read file "${file.name}". The file may be corrupted or inaccessible.`));
              };

              // Set up success handler
              reader.onload = () => {
                const result = reader.result;
                if (!result || typeof result !== 'string') {
                  reject(new Error(`Failed to process file "${file.name}". Invalid file data.`));
                  return;
                }
                console.log('[ChatInterface] FileReader success:', {
                  fileName: file.name,
                  dataUrlLength: result.length,
                  dataUrlPrefix: result.substring(0, 50)
                });
                resolve(result);
              };

              // Set up abort handler
              reader.onabort = () => {
                reject(new Error(`File reading was cancelled for "${file.name}".`));
              };

              // Start reading with timeout protection
              try {
                reader.readAsDataURL(file);

                // Timeout after 30 seconds
                setTimeout(() => {
                  if (reader.readyState === 1) { // LOADING state
                    reader.abort();
                    reject(new Error(`File reading timed out for "${file.name}". The file may be too large or corrupted.`));
                  }
                }, 30000);
              } catch (readError: any) {
                console.error('[ChatInterface] FileReader.readAsDataURL error:', readError);
                reject(new Error(`Cannot read file "${file.name}": ${readError.message}`));
              }
            });

            multimodalContent.push({ type: 'image_url', image_url: { url: dataUrl } });
          } catch (fileError: any) {
            console.error('[ChatInterface] Error processing image file:', {
              fileName: file.name,
              error: fileError.message,
              stack: fileError.stack
            });

            // Show error to user but continue processing other files
            setNotification({
              message: `Failed to load image "${file.name}": ${fileError.message}`,
              type: 'error'
            });

            // Skip this file and continue with others
            continue;
          }
        }
      }
      
      // Create display content for UI
      const imageParts = files.filter(f => f.type.startsWith('image/')).length;
      const docParts = files.filter(f => !f.type.startsWith('image/')).length;
      const parts: string[] = [];
      if (imageParts) parts.push(`🖼️ ${imageParts} image${imageParts > 1 ? 's' : ''}`);
      if (docParts) parts.push(`📎 ${docParts} document${docParts > 1 ? 's' : ''}`);
      displayContent = parts.length > 0 ? `${parts.join(', ')}: ${files.map(f => f.name).join(', ')}\n\n${message}` : message;
    }

    // Create user message for optimistic UI
    const userLocalId = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    newUserMessage = multimodalContent.length > 1 || 
      (multimodalContent.length === 1 && multimodalContent[0].type === 'image_url')
      ? {
          localId: userLocalId,
          id: undefined, // Will be set when message is saved to database
          role: 'user' as const,
          content: multimodalContent,
          displayContent,
          timestamp: new Date(),
          originalContent: message,
        }
      : {
          localId: userLocalId,
          id: undefined, // Will be set when message is saved to database
          role: 'user' as const,
          content: finalMessageContent,
          displayContent,
          timestamp: new Date(),
          originalContent: message,
        };

    // Update UI immediately (optimistic update)
    const optimisticConversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, newUserMessage],
      updatedAt: new Date()
    };
    setCurrentConversation(optimisticConversation);

    // Scroll to bottom to show the new user message
    setTimeout(() => scrollToBottom(false), 100);

    // Now process files in the background - upload and add to multimodal content
    if (files?.length) {
      const updatedMultimodalContent = [...multimodalContent];
      let uploadSuccessful = true;
      const uploadErrors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          if (file.type.startsWith('image/')) {
            // Upload image to get persistent URL
            const uploadResult = await uploadChatImage(file, user.id);
            if (uploadResult.success && uploadResult.url) {
              // Find the corresponding image_url item (by counting images before this one)
              const imagesBefore = files.slice(0, i).filter(f => f.type.startsWith('image/')).length;
              let imageIndex = -1;
              let imagesFound = 0;

              for (let j = 0; j < updatedMultimodalContent.length; j++) {
                if (updatedMultimodalContent[j].type === 'image_url') {
                  if (imagesFound === imagesBefore) {
                    imageIndex = j;
                    break;
                  }
                  imagesFound++;
                }
              }

              if (imageIndex !== -1) {
                // Update with persistent URL
                updatedMultimodalContent[imageIndex] = {
                  type: 'image_url',
                  image_url: { url: uploadResult.url }
                };
              }
            } else {
              console.error('[ChatInterface] Failed to upload image:', {
                fileName: file.name,
                error: uploadResult.error
              });
              uploadSuccessful = false;

              // Provide helpful guidance based on error
              let errorMessage = uploadResult.error || 'Unknown error';
              if (errorMessage.includes('Unicode') || errorMessage.includes('escape sequence')) {
                errorMessage += ' Try renaming the file to use only English letters and numbers.';
              } else if (errorMessage.includes('too large')) {
                errorMessage += ' Please compress the image or use a smaller file.';
              }

              uploadErrors.push(`${file.name}: ${errorMessage}`);
            }
          } else {
            // Upload document to get persistent URL
            const uploadResult = await uploadChatDocument(file, user.id);
            if (uploadResult.success && uploadResult.url) {
              // Add document as input_file type with filename and mime type
              updatedMultimodalContent.push({
                type: 'input_file',
                file_url: uploadResult.url,
                filename: file.name,
                mimeType: file.type
              });
            } else {
              console.error('[ChatInterface] Failed to upload document:', {
                fileName: file.name,
                error: uploadResult.error
              });
              uploadSuccessful = false;

              // Provide helpful guidance based on error
              let errorMessage = uploadResult.error || 'Unknown error';
              if (errorMessage.includes('Unicode') || errorMessage.includes('escape sequence')) {
                errorMessage += ' Try renaming the file to use only English letters and numbers.';
              } else if (errorMessage.includes('too large')) {
                errorMessage += ' Please use a smaller file or compress it.';
              } else if (errorMessage.includes('unsupported')) {
                errorMessage += ' Please use PDF, Word, Excel, or text files.';
              }

              uploadErrors.push(`${file.name}: ${errorMessage}`);
            }
          }
        } catch (err: any) {
          console.error('[ChatInterface] Error processing file:', {
            fileName: file.name,
            error: err.message,
            stack: err.stack
          });
          uploadSuccessful = false;

          // Provide user-friendly error message with guidance
          let errorMessage = err.message || 'Unknown error occurred';
          if (errorMessage.includes('Unicode') || errorMessage.includes('escape')) {
            errorMessage = 'File contains special characters. Try renaming it to use only English letters and numbers.';
          }

          uploadErrors.push(`${file.name}: ${errorMessage}`);
        }
      }

      // Update the conversation state with uploaded file URLs
      setCurrentConversation(prev => {
        if (!prev) return prev;
        const updatedConv = { ...prev };
        const messages = [...updatedConv.messages];
        const lastMessage = { ...messages[messages.length - 1] };
        lastMessage.content = updatedMultimodalContent;
        messages[messages.length - 1] = lastMessage;
        updatedConv.messages = messages;
        return updatedConv;
      });

      // Always clear selected files after processing, regardless of upload success
      // This prevents files from staying in the input area after the user has sent them
      setSelectedFiles([]);

      // Show error notification if any uploads failed
      // This happens after clearing the files so the user knows what went wrong
      if (!uploadSuccessful) {
        setError(`Some files failed to upload:\n${uploadErrors.join('\n')}`);
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
      }

      // Save the final message content with uploaded file URLs to database
      try {
        // Use the updated multimodal content that includes uploaded file URLs
        const contentForDb = updatedMultimodalContent;

        // Pass the isTemporary flag to handle temporary conversation persistence
        addMessage(currentConversation.id, 'user', contentForDb, user.id, currentConversation.isTemporary || false)
          .then((result) => {
            if (result.success && result.messageId) {
              // Update the message with the database-assigned ID (but keep localId stable)
              setCurrentConversation((current) => {
                if (!current) return current;
                const updatedConv = { ...current };
                const messages = [...updatedConv.messages];
                const lastMessage = { ...messages[messages.length - 1] };
                lastMessage.id = result.messageId;
                // Keep localId unchanged for stable React keys
                messages[messages.length - 1] = lastMessage;
                updatedConv.messages = messages;

                // If this was a temporary conversation that got persisted, update the conversation ID
                if (result.actualConversationId && result.actualConversationId !== updatedConv.id) {
                  console.log('🔍 [CHATINTERFACE] Temporary conversation persisted with new ID:', result.actualConversationId);
                  updatedConv.id = result.actualConversationId;
                  updatedConv.isTemporary = false;

                  // Update the conversation in the sidebar - this will add it if it doesn't exist
                  console.log('🔍 [CHATINTERFACE] Updating sidebar with persisted conversation');
                  queueMicrotask(() => {
                    updateConversation(updatedConv);
                  });
                }

                return updatedConv;
              });
            }
          })
          .catch((error) => {
            console.error('Error saving user message to database:', error);
            if (newUserMessage.localId) {
              processedMessageIds.current.delete(newUserMessage.localId);
            }
          });
      } catch (error) {
        console.error('Error saving user message to database:', error);
      }
    } else {
      // No files to upload, clear immediately
      setSelectedFiles([]);

      // Save the message content to database (no files)
      try {
        const contentForDb = newUserMessage.content;

        // Pass the isTemporary flag to handle temporary conversation persistence
        addMessage(currentConversation.id, 'user', contentForDb, user.id, currentConversation.isTemporary || false)
          .then((result) => {
            if (result.success && result.messageId) {
              // Update the message with the database-assigned ID (but keep localId stable)
              setCurrentConversation((current) => {
                if (!current) return current;
                const updatedConv = { ...current };
                const messages = [...updatedConv.messages];
                const lastMessage = { ...messages[messages.length - 1] };
                lastMessage.id = result.messageId;
                // Keep localId unchanged for stable React keys
                messages[messages.length - 1] = lastMessage;
                updatedConv.messages = messages;

                // If this was a temporary conversation that got persisted, update the conversation ID
                if (result.actualConversationId && result.actualConversationId !== updatedConv.id) {
                  console.log('🔍 [CHATINTERFACE] Temporary conversation persisted with new ID:', result.actualConversationId);
                  updatedConv.id = result.actualConversationId;
                  updatedConv.isTemporary = false;

                  // Update the conversation in the sidebar - this will add it if it doesn't exist
                  console.log('🔍 [CHATINTERFACE] Updating sidebar with persisted conversation');
                  queueMicrotask(() => {
                    updateConversation(updatedConv);
                  });
                }

                return updatedConv;
              });
            }
          })
          .catch((error) => {
            console.error('Error saving user message to database:', error);
            if (newUserMessage.localId) {
              processedMessageIds.current.delete(newUserMessage.localId);
            }
          });
      } catch (error) {
        console.error('Error saving user message to database:', error);
      }
    }

    // Stream assistant response using the consolidated function
    // Get the current conversation state for streaming
    const conversationForStreaming = await new Promise<Conversation>((resolve) => {
      setCurrentConversation((current) => {
        if (current) resolve(current);
        return current;
      });
    });
    
    await startStreamingResponse(
      conversationForStreaming,
      message, // The user message content
      false // Not an editing flow
    );
  }, [currentConversation, user, editingUserMessage, startStreamingResponse, setCurrentConversation, updateConversation, setEditingUserMessage, setTypingState, setWebFetchingState, setAbortController, setError]);

  const availableLanguages =
    userSubscription?.tier === 'pro'
      ? ['english', 'setswana', 'swahili', 'zulu', 'french', 'yoruba', 'igbo', 'hausa', 'amharic', 'arabic', 'portuguese', 'lingala', 'kinyarwanda', 'luganda', 'twi', 'shona', 'sesotho', 'bemba', 'wolof', 'malagasy', 'somali', 'oromo', 'tigrinya', 'ndebele', 'kirundi', 'xhosa', 'afrikaans']
      : ['english', 'setswana', 'swahili'];


  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#F8F9FA] via-white to-[#FEF7E8] z-50 flex flex-col overflow-hidden">
      {/* Sidebar collapse/expand button */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="fixed top-4 z-50 text-[#0170b9] hover:text-[#f5b233] transition-all duration-700 ease-in-out hidden md:block"
        style={{ left: `${sidebarWidth - 4}px` }}
        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <PanelLeft
          className={`w-5 h-5 transition-all duration-1000 ease-out ${isSidebarCollapsed ? 'rotate-180 scale-110' : 'scale-100'}`}
          style={{ stroke: '#0170b9' }}
        />
      </button>

      {/* Mobile menu button - only visible on mobile when sidebar is hidden */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-12 text-[#002F4B] bg-white hover:bg-[#FEF7E8] transition-colors duration-150 ease-out md:hidden border border-[#f5b233]/20 shadow-sm"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}


      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:relative inset-y-0 left-0 z-40 flex-shrink-0 transition-all duration-700 ease-in-out border-r border-[#f5b233]/20 bg-white`}
          style={{ width: `${sidebarWidth}px` }}
        >
          <ConversationList
            onClose={() => setShowSidebar(false)}
            onSignOut={onClose}
            isCollapsed={isSidebarCollapsed}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>

        {showSidebar && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowSidebar(false)} />}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
          {/* Particles Background - Only visible when no messages */}
          {(!currentConversation || currentConversation?.messages.length === 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 z-0"
            >
              <Particles
                particleColors={['#0170b9', '#f5b233']}
                particleCount={285}
                particleSpread={10}
                speed={0.1}
                particleBaseSize={70}
                moveParticlesOnHover={true}
                alphaParticles={false}
                disableRotation={false}
              />
            </motion.div>
          )}

          {/* Empty State - Centered Input */}
          {(!currentConversation || currentConversation?.messages.length === 0) && !isGeneratingImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-3 sm:px-6 pb-20 z-10"
            >
              <div className="w-full max-w-3xl space-y-6">
                {/* Heading */}
                <motion.h1
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-center mb-8"
                >
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0170b9] to-[#f5b233]">
                    What are we learning today?
                  </span>
                </motion.h1>

                {/* Centered Chat Input */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {error && !showUserCancellationMessage && (
                    <div className="mb-4">
                      <div className="bg-gradient-to-r from-red/10 to-red-50 border border-red/20 rounded-xl p-4 text-center">
                        <p className="text-red-700 font-medium">{error}</p>
                        <button onClick={() => setError(null)} className="mt-2 text-red-600 hover:text-red-800 text-sm underline">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {showUserCancellationMessage && (
                    <div className="mb-4">
                      <div className="bg-gradient-to-r from-[#0170b9]/10 to-[#f5b233]/10 border border-[#0170b9]/20 rounded-xl p-4 text-center">
                        <p className="text-[#002F4B] font-medium">No worries, take your time</p>
                      </div>
                    </div>
                  )}

                  <ChatInput
                    onSendMessage={handleSendMessage}
                    isTyping={typingState.isTyping}
                    onCancelResponse={handleCancelResponse}
                    selectedFiles={selectedFiles}
                    onFileSelect={setSelectedFiles}
                    onRemoveFile={(index) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
                    imagePrompt={imagePrompt}
                    setImagePrompt={setImagePrompt}
                    isGeneratingImage={isGeneratingImage}
                    onImageGenerate={handleImageGenerationRequest}
                    modelLabel={getModelLabel()}
                    onOpenModelSelector={handleOpenModelSelector}
                    regionLabel={getRegionLabel()}
                    onOpenRegionSelector={handleOpenRegionSelector}
                    onOpenFilesBrowser={handleOpenFilesBrowser}
                    imageModelLabel={getImageModelLabel()}
                    onOpenImageModelSelector={handleOpenImageModelSelector}
                    isImageMode={showImageInput}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Messages Container - Only visible when there are messages or image generation is active */}
          <div
            ref={messagesContainerRef}
            className={`flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-4 pb-48 ${
              (!currentConversation || currentConversation?.messages.length === 0) && !isGeneratingImage ? 'invisible' : 'visible'
            }`}
          >
            {currentConversation && currentConversation?.messages.length > 0 && (
              <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                {currentConversation?.messages.map((message, index) => (
                  // Generate stable key that doesn't change when DB ID is assigned
                  (() => {
                    const stableKey =
                      (message as any).id
                      ?? (message as any).localId
                      ?? (message.timestamp ? new Date(message.timestamp as any).getTime() : undefined)
                      ?? `msg-${index}`;
                    
                    return (
                  <MessageBubble
                    key={String(stableKey)}
                    messageId={(message as any).id}
                    role={message.role}
                    content={message.content}
                    timestamp={message.timestamp}
                    isLongResponse={message.isLongResponse}
                    messageIndex={index}
                    displayContent={message.displayContent}
                    isStreaming={
                      typingState.isTyping &&
                      index === (currentConversation?.messages.length ?? 0) - 1 &&
                      message.role === 'assistant'
                    }
                    onRegenerate={() => {
                      const userMessageIndex = index - 1;
                      if (userMessageIndex >= 0 && currentConversation.messages[userMessageIndex].role === 'user') {
                        const userMessage = currentConversation.messages[userMessageIndex];
                        const text = (userMessage as any).originalContent ?? (typeof userMessage.content === 'string' ? userMessage.content : '');
                        if (text) handleSendMessage({ text, files: [], isWebSearchActive: false });
                      }
                    }}
                    onInlineEditCompleteAndResend={(content: string, msgIndex: number) => {
                      // Set the editing state to trigger the rewind logic in handleSendMessage
                      const messageToEdit = currentConversation.messages[msgIndex];
                      if (messageToEdit && (messageToEdit as any).id) {
                        setEditingUserMessage({ 
                          content,
                          index: msgIndex,
                          id: (messageToEdit as any).id
                        });
                        // Trigger handleSendMessage with the edited content
                        handleSendMessage({ text: content, files: [], isWebSearchActive: false });
                      }
                    }}
                    userSubscription={userSubscription}
                    onEdit={(content, msgIndex) => setEditingUserMessage({ content, index: msgIndex })}
                  onSave={async (newContent: string) => {
                    try {
                      if ((message as any).id && user) {
                        await updateMessage((message as any).id, newContent, user.id);
                      }
                      // reflect in local conversation immediately
                      setCurrentConversation(prev => {
                        if (!prev) return prev;
                        const conv = { ...prev };
                        const msgs = [...conv.messages];
                        msgs[index] = { ...msgs[index], content: newContent };
                        conv.messages = msgs;
                        updateConversation(conv);
                        return conv;
                      });
                    } catch (e) {
                      console.error('Persist edit failed:', e);
                    }
                  }}
                  />
                    );
                  })()


                ))}

                {/* Image generation loader as assistant message */}
                {isGeneratingImage && (
                  <ImageGenerationLoader modelVersion={modelVersion} />
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Scroll to bottom */}
          {showScrollToBottom && (
            <div className="absolute bottom-32 right-4 z-10">
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                onClick={scrollToBottom}
                className="p-2 bg-white border border-[#0170b9]/20 rounded-full shadow-lg text-[#002F4B] hover:bg-[#FEF7E8] hover:border-[#f5b233]/40 transition-all duration-150 ease-out"
              >
                <ArrowDown className="w-5 h-5" />
              </motion.button>
            </div>
          )}

          {/* Crafting indicator - positioned above chat input */}
          {(typingState.isTyping || webFetchingState.isFetching) && currentConversation?.messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 px-3 sm:px-6 pb-2"
            >
              <div className="max-w-4xl mx-auto flex justify-start">
                <div className="ml-2">
                  <span className="text-sm text-[#0170b9] font-medium">
                    Crafting response...
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Bottom Input - Only shown when there are messages or image generation is active */}
          {currentConversation && (currentConversation?.messages.length > 0 || isGeneratingImage) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="flex-shrink-0 p-3 sm:p-6 bg-white border-t border-[#f5b233]/20"
            >
              <div className="max-w-4xl mx-auto">
                {error && !showUserCancellationMessage && (
                  <div className="mb-4">
                    <div className="bg-gradient-to-r from-red/10 to-red-50 border border-red/20 rounded-xl p-4 text-center">
                      <p className="text-red-700 font-medium">{error}</p>
                      <button onClick={() => setError(null)} className="mt-2 text-red-600 hover:text-red-800 text-sm underline">
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {showUserCancellationMessage && (
                  <div className="mb-4">
                    <div className="bg-gradient-to-r from-[#0170b9]/10 to-[#f5b233]/10 border border-[#0170b9]/20 rounded-xl p-4 text-center">
                      <p className="text-[#002F4B] font-medium">No worries, take your time</p>
                    </div>
                  </div>
                )}

                <ChatInput
                  onSendMessage={handleSendMessage}
                  isTyping={typingState.isTyping}
                  onCancelResponse={handleCancelResponse}
                  selectedFiles={selectedFiles}
                  onFileSelect={setSelectedFiles}
                  onRemoveFile={(index) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
                  imagePrompt={imagePrompt}
                  setImagePrompt={setImagePrompt}
                  isGeneratingImage={isGeneratingImage}
                  onImageGenerate={handleImageGenerationRequest}
                  modelLabel={getModelLabel()}
                  onOpenModelSelector={handleOpenModelSelector}
                  regionLabel={getRegionLabel()}
                  onOpenRegionSelector={handleOpenRegionSelector}
                  onOpenFilesBrowser={handleOpenFilesBrowser}
                  imageModelLabel={getImageModelLabel()}
                  onOpenImageModelSelector={handleOpenImageModelSelector}
                  isImageMode={showImageInput}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Model Selector - Rendered as portal when open */}
      {modelSelectorOpen && modelSelectorAnchorEl && (
        <ModelSelector
          modelVersion={modelVersion}
          setModelVersion={setModelVersion}
          deepThinkMap={deepThinkMap}
          setDeepThinkMap={setDeepThinkMap}
          isAdmin={isAdmin}
          disabled={false}
          open={modelSelectorOpen}
          onClose={handleCloseModelSelector}
          anchorEl={modelSelectorAnchorEl}
        />
      )}

      {/* Region Selector - Rendered as portal when open */}
      {regionSelectorOpen && regionSelectorAnchorEl && (
        <RegionSelector
          selectedRegion={selectedRegion}
          onChange={(region) => {
            setSelectedRegion(region);
            handleCloseRegionSelector();
          }}
          open={regionSelectorOpen}
          onClose={handleCloseRegionSelector}
          anchorEl={regionSelectorAnchorEl}
        />
      )}

      {/* Image Model Selector - Rendered as portal when open */}
      {imageModelSelectorOpen && imageModelSelectorAnchorEl && (
        <ImageModelSelector
          selectedModel={selectedImageModel}
          onModelChange={(model) => {
            setSelectedImageModel(model);
            handleCloseImageModelSelector();
          }}
          open={imageModelSelectorOpen}
          onClose={handleCloseImageModelSelector}
          anchorEl={imageModelSelectorAnchorEl}
        />
      )}

      {/* Files Browser - Rendered as portal when open */}
      {filesBrowserOpen && filesBrowserAnchorEl && (
        <FilesBrowser
          recentFiles={recentFiles}
          selectedFiles={selectedFiles}
          onFileSelect={setSelectedFiles}
          onRemoveFile={(index) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
          onFileSearch={handleFileSearch}
          onOpenFilesPage={handleOpenFilesPage}
          isLoadingFiles={isLoadingFiles}
          fileSearchResults={fileSearchResults}
          fileSearchQuery={fileSearchQuery}
          open={filesBrowserOpen}
          onClose={handleCloseFilesBrowser}
          anchorEl={filesBrowserAnchorEl}
        />
      )}

      {/* Image Generation Input Panel */}

      {/* Settings */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          interfaceLanguage={selectedLanguage}
          responseLanguage={selectedLanguage}
          onLanguageChange={(type, language) => {
            if (type === 'interface' || type === 'response') setSelectedLanguage(language);
          }}
          onSignOut={onClose}
          userSubscription={userSubscription}
        />
      )}
    </div>
  );
}