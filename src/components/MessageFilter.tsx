import { Message } from '../types/chat';

/**
 * Filters out system messages from a conversation
 * This ensures system prompts are never exposed to the frontend
 * 
 * @param messages Array of messages to filter
 * @returns Filtered array without system messages
 */
export const filterSystemMessages = (messages: Message[]): Message[] => {
  return messages.filter(message => message.role !== 'system');
};

/**
 * Filters sensitive information from a collection of messages
 * Applies different filters based on message role
 * 
 * @param messages Array of messages to sanitize
 * @returns Sanitized messages
 */
export const sanitizeMessages = (messages: any[]): any[] => {
  return messages.map(message => {
    // Don't include system messages at all
    if (message.role === 'system') {
      return null;
    }
    
    // For other messages, keep them but make sure displayContent is set
    return {
      ...message,
      // If a message has file content, use displayContent if available,
      // otherwise use the regular content
      content: message.displayContent || message.content
    };
  }).filter(Boolean); // Remove null items (system messages)
};