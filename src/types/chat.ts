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

export interface DiagramLabel {
  name: string;
  description: string;
  x: number; // 0-1000
  y: number; // 0-1000
}

export interface DiagramData {
  diagram_title: string;
  topic: string;
  difficulty_level: string;
  labels: DiagramLabel[];
}

export interface EducationalData {
  key_concepts: string[];
  teacher_notes: string;
}

export interface DiagramContent {
  type: 'diagram';
  image_url: string;
  diagramData?: DiagramData;
  educationalData?: EducationalData;
}

export type MessageContent = string | (TextContent | ImageUrlContent | InputFileContent | DiagramContent)[];

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
  messages: {
    id?: string;
    role: 'user' | 'assistant' | 'system' | 'thinking';
    content: MessageContent;
    textContent?: string; // Extracted text content for safe string operations
    displayContent?: string; // Optional display content that differs from the actual content
    isLongResponse?: boolean; // Flag for long responses that can be edited in canvas
    timestamp: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}