export enum MessageType {
  USER = 'user',
  BOT = 'bot'
}

// Multimodal content types for image and document support
export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageUrlContent {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export interface InputFileContent {
  type: 'input_file';
  file_url: string;
  filename: string;
  mimeType?: string;
}

export type MessageContent = string | (TextContent | ImageUrlContent | InputFileContent)[];

export interface Message {
  id: string;
  type: MessageType;
  content: MessageContent;
  textContent?: string; // Extracted text content for safe string operations
  timestamp: Date;
  originalContent?: MessageContent; // Preserve original format for API calls
}

export interface Conversation {
  id: string;
  title: string;
  isTemporary?: boolean; // Flag to indicate if conversation is not yet saved to database
  messages: ({
    id?: string;
    role: 'user' | 'assistant' | 'system' | 'thinking';
    content: MessageContent;
    textContent?: string; // Extracted text content for safe string operations
    displayContent?: string; // Optional display content that differs from the actual content
    isLongResponse?: boolean; // Flag for long responses that can be edited in canvas
    timestamp: Date;
  }[];
  )
  createdAt: Date;
  updatedAt: Date;
}