import React, { createContext, useContext, useState, useEffect } from 'react';
import { Conversation } from '../types/chat';
import { useAuth } from './AuthContext';
import { createConversation, getConversations, getConversationMessages, deleteConversation as deleteConversationService, addMessage } from '../services/chatService';
import { filterSystemMessages, sanitizeMessages } from '../components/MessageFilter';
import { MessageContent } from '../types/chat';

interface ConversationContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation | null) => void;
  createNewConversation: () => Promise<Conversation>;
  updateConversation: (updatedConversation: Conversation) => void;
  deleteConversation: (id: string) => void;
  loadConversationMessages: (conversation: Conversation) => Promise<void>;
  addMessageToConversation: (
    conversationId: string,
    role: 'user' | 'assistant',
    content: MessageContent,
    userId: string,
    isTemporaryConversation?: boolean
  ) => Promise<{ success: boolean; messageId?: string; actualConversationId?: string; error?: string }>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const useConversations = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversations must be used within a ConversationProvider');
  }
  return context;
};


export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [pendingConversation, setPendingConversation] = useState<Conversation | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const currentConversationIdRef = React.useRef<string | null>(null);

  // Restore current conversation from session storage on mount
  useEffect(() => {
    const savedConversationId = sessionStorage.getItem('uhuru_current_conversation_id');
    if (savedConversationId) {
      currentConversationIdRef.current = savedConversationId;
    }
  }, []);

  // Load user's conversations when user changes or authentication state changes
  useEffect(() => {
    // Only proceed if we're not already loading conversations
    if (!loadingConversations) {
      loadUserConversations();
    }
  }, [user, isAuthenticated]);

  // Load messages for a specific conversation (called on-demand)
  const loadConversationMessages = async (conversation: Conversation) => {
    if (!user) return;

    try {
      // Load messages for this conversation
      const messages = await getConversationMessages(conversation.id, user.id, 100);

      // Filter out system messages
      const filteredMessages = messages.filter(msg => msg.role !== 'system');

      // Update conversation with loaded messages
      const updatedConversation = {
        ...conversation,
        messages: filteredMessages
      };

      setCurrentConversation(updatedConversation);

      // Also update in conversations list
      setConversations(prev =>
        prev.map(c => c.id === conversation.id ? updatedConversation : c)
      );
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      // Set conversation anyway with empty messages
      setCurrentConversation(conversation);
    }
  };

  // Load user's conversations (optimized - metadata only)
  const loadUserConversations = async () => {
    // Set loading flag to prevent concurrent calls
    setLoadingConversations(true);

    try {
      if (isAuthenticated && user) {
        try {
          // Load only conversation metadata (no messages) for performance
          const userConversations = await getConversations(user.id, 50);

          // Conversations come with empty messages array from optimized query
          setConversations(userConversations);

          // If no conversations exist for this user, create one
          // Restore saved conversation if available
          if (currentConversationIdRef.current && userConversations.length > 0) {
            const savedConversation = userConversations.find(
              c => c.id === currentConversationIdRef.current
            );
            if (savedConversation) {
              // Load messages for the saved conversation
              await loadConversationMessages(savedConversation);
            } else {
              // If saved conversation not found, use the most recent one
              await loadConversationMessages(userConversations[0]);
            }
          } else if (userConversations.length === 0) {
            // Don't create a conversation in the database yet
            // Just create a temporary local conversation that will be persisted when the user sends their first message
            const localConversation = createLocalConversation();
            setConversations([localConversation]);
            setCurrentConversation(localConversation);
          } else {
            // Set conversations and load messages for the most recent one
            setConversations(userConversations);
            // Load messages for the most recent conversation
            await loadConversationMessages(userConversations[0]);
          }
          
          setIsInitialized(true);
        } catch (error) {
          // Check if this is a fetch/network error and handle gracefully
          if (error instanceof Error && (
            error.message.includes('fetch') || 
            error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('TypeError: Failed to fetch')
          )) {
            console.info('Database connection failed, using sample conversations');
          } else {
            console.error('Error loading conversations:', error);
          }
          
          // For any errors, start with empty state
          console.warn('Starting with empty conversation state due to error:', error);
          const localConversation = createLocalConversation();
          setConversations([localConversation]);
          setCurrentConversation(localConversation);
          setIsInitialized(true);
        }
      } else {
        // For unauthenticated users, start with empty conversation
        const localConversation = createLocalConversation();
        setConversations([localConversation]);
        setCurrentConversation(localConversation);
        setIsInitialized(true);
      }
    } finally {
      // Always reset loading flag when done
      setLoadingConversations(false);
    }
  };

  // Create a local conversation (for fallback)
  const createLocalConversation = () => {
    const newConversation = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [],
      isTemporary: true, // Mark as temporary (not yet saved to DB)
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return newConversation;
  };

  // Create a new conversation
  const createNewConversation = async (): Promise<Conversation> => {
    // Always create a local/temporary conversation first for instant response
    // It will be persisted to the database when the first message is sent
    const localConversation = createLocalConversation();
    setCurrentConversation(localConversation);
    
    return localConversation;
  };
  
  const updateConversation = (updatedConversation: Conversation) => {
    // Update or add conversation in the list
    setConversations(prevConversations => {
      const existingIndex = prevConversations.findIndex(conv => conv.id === updatedConversation.id);

      if (existingIndex >= 0) {
        // Update existing conversation
        const updated = [...prevConversations];
        updated[existingIndex] = { ...updatedConversation, updatedAt: new Date() };
        return updated;
      } else {
        // Add new conversation at the top of the list
        console.log('🔍 [CONTEXT] Adding new conversation to list:', updatedConversation.id.substring(0, 8) + '...');
        return [{ ...updatedConversation, updatedAt: new Date() }, ...prevConversations];
      }
    });

    // Update current conversation if it's the one being updated
    if (currentConversation?.id === updatedConversation.id) {
      setCurrentConversation({ ...updatedConversation, updatedAt: new Date() });
    }
  };

  // Add centralized message adding function
  const addMessageToConversation = async (
    conversationId: string,
    role: 'user' | 'assistant',
    content: MessageContent,
    userId: string,
    isTemporaryConversation: boolean = false
  ): Promise<{ success: boolean; messageId?: string; actualConversationId?: string; error?: string }> => {
    try {
      console.log('🔍 [CONTEXT] Adding message to conversation:', conversationId.substring(0, 8) + '...', 'role:', role);

      const result = await addMessage(conversationId, role, content, userId, isTemporaryConversation);

      if (result.success && result.actualConversationId && result.actualConversationId !== conversationId) {
        // Temporary conversation was persisted with a new ID, update our state
        console.log('🔍 [CONTEXT] Temporary conversation persisted with new ID:', result.actualConversationId);

        // Get the temporary conversation from state or current conversation
        const tempConversation = conversations.find(c => c.id === conversationId) || currentConversation;

        if (tempConversation && tempConversation.id === conversationId) {
          const persistedConversation = {
            ...tempConversation,
            id: result.actualConversationId,
            isTemporary: false,
            updatedAt: new Date()
          };

          // Remove the temporary conversation and add the persisted one
          setConversations(prevConversations => {
            const filtered = prevConversations.filter(c => c.id !== conversationId);
            // Check if persisted conversation already exists in list
            const exists = filtered.some(c => c.id === result.actualConversationId);
            if (exists) {
              return filtered.map(c =>
                c.id === result.actualConversationId ? persistedConversation : c
              );
            } else {
              // Add as new conversation at the top
              console.log('🔍 [CONTEXT] Adding persisted conversation to list');
              return [persistedConversation, ...filtered];
            }
          });

          // Update current conversation if it was the temporary one
          if (currentConversation?.id === conversationId) {
            console.log('🔍 [CONTEXT] Updating current conversation ID from temp to persisted');
            setCurrentConversation(persistedConversation);
            // Also update session storage
            currentConversationIdRef.current = result.actualConversationId;
            sessionStorage.setItem('uhuru_current_conversation_id', result.actualConversationId);
          }
        }
      }

      return result;
    } catch (error: any) {
      console.error('🔍 [CONTEXT] Error in addMessageToConversation:', error);
      return {
        success: false,
        error: error.message || 'Failed to add message to conversation'
      };
    }
  };

  // Custom setCurrentConversation that saves to session storage
  const setCurrentConversationWithCleanup = (conversation: Conversation | null) => {
    setCurrentConversation(conversation);
    if (conversation) {
      currentConversationIdRef.current = conversation.id;
      sessionStorage.setItem('uhuru_current_conversation_id', conversation.id);
    } else {
      currentConversationIdRef.current = null;
      sessionStorage.removeItem('uhuru_current_conversation_id');
    }
  };
  
  const deleteConversation = (id: string) => {
    // For authenticated users, delete from database
    if (isAuthenticated && user) {
      deleteConversationService(id, user.id)
        .catch(error => {
          // Check if this is a Supabase configuration error
          const isConfigError = error.message && (
            error.message.includes('Supabase Not Configured') ||
            error.message.includes('missing Supabase configuration') ||
            error.message.includes('Failed to fetch')
          );
          
          if (!isConfigError) {
            // Only log non-configuration errors
            console.error('Error deleting conversation from database:', error);
          }
        });
    }
    
    setConversations(prevConversations => 
      prevConversations.filter(conv => conv.id !== id)
    );

    // If we're deleting the current conversation, set the first available one as current
    if (currentConversation?.id === id) {
      const remainingConversations = conversations.filter(conv => conv.id !== id);
      if (remainingConversations.length > 0) {
        setCurrentConversationWithCleanup(remainingConversations[0]);
      } else {
        // If no conversations left, create a new one
        const newConversation = createNewConversation();
        setCurrentConversationWithCleanup(newConversation);
      }
    }
  };

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        currentConversation,
        setCurrentConversation: setCurrentConversationWithCleanup,
        createNewConversation,
        updateConversation,
        deleteConversation,
        loadConversationMessages,
        addMessageToConversation
      }}
    >
      {isInitialized ? children : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-10 h-10 border-4 border-teal border-t-transparent rounded-full"></div>
        </div>
      )}
    </ConversationContext.Provider>
  );
};

export default ConversationContext;