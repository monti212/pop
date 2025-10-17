import { Conversation } from '../types/chat';
import { logger } from './logger';

const CHAT_STATE_KEY = 'uhuru_chat_state_backup';
const RECOVERY_TIMEOUT = 30000; // 30 seconds

interface ChatStateBackup {
  conversationId: string;
  messages: any[];
  timestamp: number;
}

export const saveChatStateBackup = (conversation: Conversation | null) => {
  if (!conversation) return;

  try {
    const backup: ChatStateBackup = {
      conversationId: conversation.id,
      messages: conversation.messages,
      timestamp: Date.now(),
    };

    sessionStorage.setItem(CHAT_STATE_KEY, JSON.stringify(backup));
    logger.debug('Chat state backup saved', { conversationId: conversation.id });
  } catch (error) {
    logger.error('Failed to save chat state backup:', error);
  }
};

export const loadChatStateBackup = (): ChatStateBackup | null => {
  try {
    const backupStr = sessionStorage.getItem(CHAT_STATE_KEY);
    if (!backupStr) return null;

    const backup: ChatStateBackup = JSON.parse(backupStr);

    // Check if backup is still valid (not too old)
    if (Date.now() - backup.timestamp > RECOVERY_TIMEOUT) {
      logger.debug('Chat state backup expired, removing');
      clearChatStateBackup();
      return null;
    }

    return backup;
  } catch (error) {
    logger.error('Failed to load chat state backup:', error);
    return null;
  }
};

export const clearChatStateBackup = () => {
  try {
    sessionStorage.removeItem(CHAT_STATE_KEY);
    logger.debug('Chat state backup cleared');
  } catch (error) {
    logger.error('Failed to clear chat state backup:', error);
  }
};

export const shouldOfferRecovery = (currentConversationId: string | null): boolean => {
  const backup = loadChatStateBackup();
  if (!backup) return false;

  // Don't offer recovery if we're already viewing the backed-up conversation
  if (currentConversationId === backup.conversationId) return false;

  return true;
};
