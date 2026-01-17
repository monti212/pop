import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Copy, RefreshCw, Check, Download, FileText, Grid2x2 as Grid, FileEdit as Edit3, MessageCircle, X, Search } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import atomDark from 'react-syntax-highlighter/dist/esm/styles/prism/atom-dark';
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { detectTableInContent } from '../../utils/tableDetection';
import { convertMarkdownToHtml, stripMarkdown } from '../../utils/markdownConverter';
import { MessageContent, TextContent, ImageUrlContent, InputFileContent } from '../../types/chat';
import StreamMarkdown from '../StreamMarkdown';
import FileAttachment from './FileAttachment';
import { containsLessonPlanKeywords } from '../../utils/lessonPlanDetection';
import { autoSaveLessonPlan } from '../../services/lessonPlanService';
import { useAuth } from '../../context/AuthContext';

// Content-aware components for fluid assistant styling - NO BORDERS

// Helper function to extract text content from MessageContent
const extractTextFromMessageContent = (content: MessageContent): string => {
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    return content
      .filter(part => part.type === 'text')
      .map(part => (part as TextContent).text)
      .join('\n\n');
  }
  
  return '';
};

// Helper function to count words in a string
const countWords = (text: string): number => {
  const trimmedText = text.trim();
  return trimmedText === '' ? 0 : trimmedText.split(/\s+/).length;
};

// Parse "search: ...", "image: ...", etc.
const parseUserIntent = (t: string) => {
  const m = t.match(/^(search|image|summari[sz]e):\s*/i);
  return { intent: m?.[1]?.toLowerCase() ?? null, clean: m ? t.slice(m[0].length) : t };
};

const Chip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border border-[#0170b9]/20 bg-white text-[#002F4B]/80">
    {icon}<span>{label}</span>
  </span>
);

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: MessageContent;
  timestamp?: Date | string | number | null;
  isLongResponse?: boolean;
  messageId?: string;
  messageIndex?: number; // Keep this prop for inline editing
  displayContent?: string;
  isStreaming?: boolean;
  channel?: string;
  deliveryStatus?: string;
  conversationId?: string; // Add conversation ID for lesson plan linking
  onRegenerate?: (messageContent: string) => void;
  onSave?: (messageContent: string) => void;
  onLike?: (messageId: string) => void;
  onDislike?: (messageId: string) => void;
  onEdit?: (content: string, index: number) => void;
  onInlineEditCompleteAndResend?: (content: string, index: number) => void;
  onOpenCanvas?: () => void;
  userSubscription?: any; // This prop is unused, but keeping it for now as per previous instruction
  darkMode?: boolean; // Add darkMode prop here
}

// Helper function to auto-save table data to Uhuru Sheets
const autoSaveToUhuruSheets = (tableData: any, sourceContent: string) => {
  try {
    const sheetData = {
      id: crypto.randomUUID(),
      title: 'Table from Chat',
      data: tableData.data,
      headers: tableData.headers,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isAutoSaved: true,
      source: 'chat'
    };

    const existingSheets = JSON.parse(localStorage.getItem('uhuru-sheets-documents') || '[]');
    existingSheets.unshift(sheetData);
    localStorage.setItem('uhuru-sheets-documents', JSON.stringify(existingSheets));
  } catch (error) {
    console.error('Error auto-saving to Uhuru Sheets:', error);
  }
};

// Light markdown components for user messages
const userMarkdownComponents = {
  p: (props: any) => <p {...props} className="leading-6 text-[13px] whitespace-pre-wrap break-words" />,
  ul: (props: any) => <ul {...props} className="list-disc pl-5 my-2 text-[13px]" />,
  ol: (props: any) => <ol {...props} className="list-decimal pl-5 my-2 text-[13px]" />,
  pre: () => null, // Suppress block code in user bubbles
  code: ({ inline, ...props }: any) => {
    if (inline) {
      return <code {...props} className="px-1 rounded bg-slate-100 text-[12px]" />;
    }
    return null; // Suppress block code in user bubbles
  },
  a: (props: any) => <a {...props} className="underline underline-offset-2 decoration-slate-300 hover:decoration-slate-500" />,
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  timestamp,
  isLongResponse = false,
  messageId,
  messageIndex,
  displayContent,
  isStreaming = false,
  channel = 'web',
  deliveryStatus,
  conversationId,
  onRegenerate,
  onSave, // Keeping this prop as it's still in the interface, but removing the button
  onEdit,
  onInlineEditCompleteAndResend,
  onOpenCanvas,
  darkMode, // Add darkMode prop here
  onAssistantEdit,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State to hold parsed content from jsonb database column
  const [parsedContent, setParsedContent] = useState<MessageContent>(content);

  // Parse content if it's a JSON string from the database
  useEffect(() => {
    if (typeof content === 'string') {
      // Check if it's a JSON string that needs parsing
      if (content.trim().startsWith('[') && content.trim().endsWith(']')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setParsedContent(parsed);
            return;
          }
        } catch (error) {
          console.warn('Failed to parse content as JSON, treating as plain text:', error);
        }
      }
      // If it's not JSON or parsing failed, treat as plain text
      setParsedContent(content);
    } else {
      // Content is already an array, use it directly
      setParsedContent(content);
    }
  }, [content]);

  // Define rawText and isAssistantLong at the top of component
  const rawText = typeof parsedContent === 'string' ? parsedContent : extractTextFromMessageContent(parsedContent);
  const isAssistantLongMessage = role === 'assistant' && isLongResponse && !isStreaming;
  
  // Compute intent for user string messages (safe; no effect on arrays/files)
  const userText = role === 'user' && typeof parsedContent === 'string' ? parsedContent : null;
  const userIntent = userText ? parseUserIntent(userText) : { intent: null, clean: userText };

  // Detect search intent for command styling
  const isSearchIntent = rawText.toLowerCase().startsWith('search: ');
  const searchQuery = isSearchIntent ? rawText.substring(rawText.indexOf(':') + 1).trim() : '';
  
  const [showActions, setShowActions] = useState(false); // Controls hover actions for the whole bubble
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [editedContent, setEditedContent] = useState(parsedContent);
  
  // ✅ NEW state for assistant inline edit
  const [assistEditing, setAssistEditing] = useState(false);
  const [assistDraft, setAssistDraft] = useState<string>(() => extractTextFromMessageContent(parsedContent));
  const editableAssistRef = useRef<HTMLDivElement>(null);

  // selection popover
  const [showSelTools, setShowSelTools] = useState(false);
  const [selBox, setSelBox] = useState<{top:number;left:number} | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [replaceText, setReplaceText] = useState('');

  // Refs for managing inline editing
  const editableRef = useRef<HTMLDivElement>(null); // For contentEditable div
  const caretPositionRef = useRef(0);

  // Lesson plan detection state
  const [isLessonPlanDetected, setIsLessonPlanDetected] = useState(false);
  const [lessonPlanSaved, setLessonPlanSaved] = useState(false);
  const [isSavingLessonPlan, setIsSavingLessonPlan] = useState(false);

  // Detect lesson plans in assistant messages
  useEffect(() => {
    if (role === 'assistant' && !isStreaming && rawText && rawText.length > 200) {
      const hasLessonPlanKeywords = containsLessonPlanKeywords(rawText);
      setIsLessonPlanDetected(hasLessonPlanKeywords);

      // Auto-save lesson plan if detected and user is authenticated
      if (hasLessonPlanKeywords && user && !lessonPlanSaved && !isSavingLessonPlan) {
        handleAutoSaveLessonPlan();
      }
    }
  }, [role, isStreaming, rawText, user]);

  // Auto-save lesson plan function
  const handleAutoSaveLessonPlan = async () => {
    if (!user || lessonPlanSaved || isSavingLessonPlan) return;

    setIsSavingLessonPlan(true);
    try {
      const result = await autoSaveLessonPlan(
        rawText,
        user.id,
        conversationId,
        messageId
      );

      if (result.success) {
        setLessonPlanSaved(true);
        console.log('Lesson plan auto-saved successfully:', result.documentId);
      } else {
        console.error('Failed to auto-save lesson plan:', result.error);
      }
    } catch (error) {
      console.error('Error auto-saving lesson plan:', error);
    } finally {
      setIsSavingLessonPlan(false);
    }
  };

  // Define markdownComponentsFluid inside the component to access darkMode
  const markdownComponentsFluid = {
    p: (props: any) => <p {...props} className="leading-relaxed" />,
    h1: (props: any) => <h1 {...props} className="mt-6 mb-3 text-xl font-semibold" />,
    h2: (props: any) => <h2 {...props} className="mt-5 mb-2 text-lg font-semibold" />,
    h3: (props: any) => <h3 {...props} className="mt-4 mb-2 text-base font-semibold" />,

    ul: (props: any) => <ul {...props} className="my-3 list-disc pl-5" />,
    ol: (props: any) => <ol {...props} className="my-3 list-decimal pl-5" />,

    blockquote: ({node, ...props}: any) => (
      <blockquote
        {...props}
        className="my-4 rounded-xl bg-slate-50/70 px-4 py-3 italic text-slate-700 dark:bg-slate-800/40"
      />
    ),

    // Enhanced code blocks with syntax highlighting and copy button
    pre: ({node, ...props}: any) => {
     // Expect: children[0] is the <code> element ReactMarkdown creates for code blocks
     const child: any = Array.isArray(props.children) ? props.children[0] : props.children;
     const className = child?.props?.className || '';
     const match = /language-(\w+)/.exec(className);
     const codeContent = String(child?.props?.children ?? '').replace(/\n$/, '');
     const language = match ? match[1] : 'text';
      
      return (
        <div className="my-4 relative rounded-xl overflow-hidden bg-gray-100 dark:bg-navy-600">
          <button
            onClick={() => {
              navigator.clipboard.writeText(codeContent);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-black/30 text-white hover:bg-black/50 transition-colors duration-200"
            title={isCopied ? "Copied!" : "Copy code"}
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>

          <SyntaxHighlighter
            style={darkMode ? atomDark : oneLight}
            language={language}
            PreTag="div"
            showLineNumbers
            wrapLines
            customStyle={{
              margin: 0,
              padding: '1rem',
             backgroundColor: 'transparent',
              overflowX: 'auto',
            }}
          >
            {codeContent}
          </SyntaxHighlighter>
        </div>
      );
    },
   code: ({ inline, children, ...props }: any) => {
     // ✅ Render inline code only; block code is rendered by <pre> above
     if (inline) {
       return (
         <code
           {...props}
           className="rounded-md bg-slate-100 px-1 py-0.5 text-[0.95em] dark:bg-slate-800/70"
         >
           {children}
         </code>
       );
     }
     return null; // prevent duplicate block rendering
   },

    // Soft "card" for tables - NO BORDER
    table: ({node, ...props}: any) => (
      <div className="my-4 overflow-x-auto rounded-xl bg-slate-50/70 dark:bg-slate-900/40">
        <table {...props} className="w-full text-left text-sm">
          {props.children}
        </table>
      </div>
    ),
    th: (props: any) => <th {...props} className="px-3 py-2 font-semibold" />,
    td: (props: any) => <td {...props} className="px-3 py-2 align-top" />,

    hr: () => <hr className="my-6 border-slate-200/50 dark:border-slate-700/50" />,

    a: (props: any) => <a {...props} className="font-medium underline decoration-slate-300 underline-offset-[3px] hover:decoration-slate-500" />,

    img: ({src, alt}: any) => (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="my-3 max-h-[520px] w-auto rounded-xl shadow-sm"
      />
    ),
  };

  // Don't render system messages or thinking messages
  if (role === 'system' || role === 'thinking') {
    return null;
  }
  
  // Convert Markdown to HTML for long responses
  useEffect(() => {
    if (isLongResponse && role === 'assistant') {
      convertMarkdownToHtml(extractTextFromMessageContent(parsedContent)).then(setHtmlContent);
    }
  }, [isLongResponse, role, parsedContent]);

  // Check if the message contains a table
  const hasTable = role === 'assistant' && detectTableInContent(extractTextFromMessageContent(parsedContent));
  
  const handleCopy = () => {
    navigator.clipboard.writeText(extractTextFromMessageContent(parsedContent)); // Copies the entire message bubble content
    setIsCopied(true); // This state is for the overall message bubble copy button
    setTimeout(() => setIsCopied(false), 2000); // Reset copy status after 2 seconds
  };

  const handleEdit = () => { // This is for the main edit button, not inline
    if (onEdit && messageIndex !== undefined) {
     console.log('🔍 [DEBUG] handleEdit called for messageIndex:', messageIndex);
     onEdit(extractTextFromMessageContent(parsedContent), messageIndex);
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(extractTextFromMessageContent(parsedContent)); // Regenerates the assistant's response
    }
  };
  
  const handleStartInlineEdit = () => {
   console.log('🔍 [DEBUG] handleStartInlineEdit called');
    setIsEditingInline(true);
    setEditedContent(parsedContent);
  };

  const handleFinishInlineEdit = () => { // For user message inline editing
   console.log('🔍 [DEBUG] handleFinishInlineEdit called with content:', typeof editedContent === 'string' ? editedContent.substring(0, 50) : 'non-string');
    if (onInlineEditCompleteAndResend && messageIndex !== undefined && typeof editedContent === 'string' && editedContent.trim()) {
      onInlineEditCompleteAndResend(editedContent.trim(), messageIndex);
    }
    setIsEditingInline(false);
  };

  const handleCancelInlineEdit = () => {
   console.log('🔍 [DEBUG] handleCancelInlineEdit called');
    setIsEditingInline(false);
    setEditedContent(parsedContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { // For inline editing textarea
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFinishInlineEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelInlineEdit();
    }
  };

  // ✅ NEW: Assistant edit actions
  const enterAssistEdit = () => {
    setAssistDraft(rawText);
    setAssistEditing(true);
    setShowSelTools(false);
    setReplaceMode(false);
  };

  const exitAssistEdit = () => {
    setAssistEditing(false);
    setShowSelTools(false);
    setReplaceMode(false);
  };

  const saveAssistEdit = () => {
    // Emit to parent if provided
    if (typeof onSave === 'function') onSave(assistDraft);
    exitAssistEdit();
  };

  const copyAssistant = () => {
    navigator.clipboard.writeText(rawText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const replaceSelection = () => {
    const el = editableAssistRef.current;
    const sel = window.getSelection?.();
    if (!el || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);

    // Replace range DOM
    range.deleteContents();
    range.insertNode(document.createTextNode(replaceText));
    // sync back to state
    const newText = el.innerText; // preserves simple newlines; fine for markdown text edits
    setAssistDraft(newText);
    setReplaceMode(false);
    setShowSelTools(false);
  };

  const wrapSelection = (wrapper: '**' | '*') => {
    const el = editableAssistRef.current;
    const sel = window.getSelection?.();
    if (!el || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const selected = range.toString();

    // Replace DOM
    range.deleteContents();
    range.insertNode(document.createTextNode(`${wrapper}${selected}${wrapper}`));

    // Sync to state
    setAssistDraft(el.innerText);
    setShowSelTools(false);
  };
  
  const handleOpenUhuruDocs = (messageContent?: string) => {
    // Auto-save to Uhuru Office when user clicks "Open in Uhuru Docs" (for long assistant messages)
    const contentToSave = messageContent || extractTextFromMessageContent(parsedContent);
    const words = contentToSave.replace(/[#*_`]/g, '').trim().split(/\s+/);
    const title = words.slice(0, 6).join(' ').substring(0, 50) + (words.length > 6 ? '...' : '') || 'Document from Chat';
    
    try {
      // Convert markdown to HTML
      convertMarkdownToHtml(contentToSave).then(htmlContent => {
        // Save to Uhuru Office
        const documentData = {
          id: crypto.randomUUID(),
          title: title,
          content: htmlContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          isAutoSaved: true,
          source: 'chat'
        };
        
        // Get existing documents
        const existingDocs = JSON.parse(localStorage.getItem('uhuru-office-documents') || '[]');
        
        // Add new document to the beginning
        existingDocs.unshift(documentData);
        
        // Save back to localStorage
        localStorage.setItem('uhuru-office-documents', JSON.stringify(existingDocs));
      });
    } catch (saveError) {
      console.error('Error auto-saving to Uhuru Office:', saveError);
    }
    
    // Navigate to Uhuru Docs with the message content
    navigate('/uhuru-office', {
      state: {
        content: messageContent || extractTextFromMessageContent(parsedContent),
        title: 'Document from Chat'
      }
    });
  };

  const handleOpenUhuruSheets = (messageContent?: string) => {
    // Find table data in the content
    const tableData = detectTableInContent(messageContent || extractTextFromMessageContent(parsedContent));
    if (tableData) { // Only auto-save if a table is detected
      // Auto-save the table when the user explicitly opens it in Uhuru Sheets
      autoSaveToUhuruSheets(tableData, messageContent || extractTextFromMessageContent(parsedContent));
    }
    if (tableData) {
      navigate('/uhuru-sheets', {
        state: {
          data: tableData.data,
          headers: tableData.headers,
          title: 'Table from Chat'
        }
      });
    }
  };
  
  // Function to handle image download
  const handleImageDownload = (url: string, format: 'png' | 'jpeg' = 'png') => {
    // Create a temporary link element
    const link = document.createElement('a');
    
    // Set the href to the image URL
    link.href = url;
    
    // Set the download attribute with a filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `uhuru-image-${timestamp}.${format}`;
    
    // Append to the document
    document.body.appendChild(link);
    
    // Trigger the download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  };

  // Custom component to render images with download button
  const ImageWithDownload = ({ src, alt }: { src: string; alt?: string }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Add download button to generated images (detected by URL patterns)
    const isGeneratedImage = src.includes('generation') ||
                            src.includes('generated') ||
                            src.includes('supabase.co/storage');

    return (
      <div 
        className="relative inline-block group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img 
          src={src} 
          alt={alt || 'Generated image'} 
          className="max-w-full rounded-lg shadow-sm transition-shadow duration-300 hover:shadow-md"
          style={{ maxHeight: '512px' }}
        />
        {isGeneratedImage && isHovered && (
          <motion.div 
            className="absolute top-2 right-2 flex gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <button 
              onClick={(e) => {
                e.preventDefault();
                handleImageDownload(src, 'png');
              }}
              className="p-2 bg-black/70 hover:bg-black/80 text-white rounded-lg transition-colors duration-200"
              title="Download PNG"
            >
              <Download className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    );
  };
  
  // Check if the message is about uploaded files
  const isFileUploadMessage = role === 'user' && 
    ((typeof parsedContent === 'string' && parsedContent.startsWith('[Uploaded')) ||
     (Array.isArray(parsedContent) && parsedContent.some(part => 
       part.type === 'text' && (part as TextContent).text.includes('[Uploaded File:'))));
  
  // Enhanced file upload message detection
  const isEnhancedFileUploadMessage = role === 'user' && 
    (displayContent && displayContent.includes('📎 Uploaded')) ||
    (displayContent && displayContent.includes('🖼️')) ||
    (Array.isArray(parsedContent) && parsedContent.some(part => part.type === 'image_url'));
    
  // Check if message is a file upload based on content structure  
  const isFileUploadMessageFromContent = role === 'user' && 
    ((typeof parsedContent === 'string' && parsedContent.startsWith('[Uploaded')) ||
     (Array.isArray(parsedContent) && parsedContent.some(part => 
       part.type === 'text' && (part as TextContent).text.includes('[Uploaded File:'))));
  
  // Format file upload messages for better display
  const formatFileUploadContent = (content: MessageContent) => {
    if (Array.isArray(content)) {
      // Handle multimodal content - extract text parts
      const textParts = content.filter(part => part.type === 'text') as TextContent[];
      const textContent = textParts.map(part => part.text).join('\n\n');
      return textContent;
    }
    
    if (typeof content !== 'string') return '';
    if (!isFileUploadMessageFromContent && !isEnhancedFileUploadMessage) return content;
    
    // Split the content into file sections and user message
    const sections = content.split(/\n\n\[User Message\]\n/);
    const filesSection = sections[0];
    const userMessage = sections[1];
    
    // Parse file sections
    const fileMatches = filesSection.match(/\[Uploaded File: ([^\]]+)\]\n([\s\S]*?)(?=\n\[Uploaded File:|$)/g);
    
    if (fileMatches) {
      let formattedContent = '';
      
      fileMatches.forEach((fileMatch, index) => {
        const fileNameMatch = fileMatch.match(/\[Uploaded File: ([^\]]+)\]/);
        const fileName = fileNameMatch ? fileNameMatch[1] : `File ${index + 1}`;
        const fileContent = fileMatch.replace(/\[Uploaded File: [^\]]+\]\n/, '');
        
        formattedContent += `**📄 ${fileName}**\n`;
        formattedContent += `${fileContent.substring(0, 300)}${fileContent.length > 300 ? '...' : ''}\n\n`;
      });
      
      if (userMessage) {
        formattedContent += `**💬 Your Message**\n${userMessage}`;
      }
      
      return formattedContent;
    }
    
    return content;
  };

  // Get channel display info
  const getChannelInfo = () => {
    switch (channel) {
      case 'whatsapp':
        return { icon: <MessageCircle className="w-3 h-3 text-green-500" />, label: 'WhatsApp' };
      case 'sms':
        return { icon: <MessageCircle className="w-3 h-3 text-blue-500" />, label: 'SMS' };
      case 'api':
        return { icon: <MessageCircle className="w-3 h-3 text-purple-500" />, label: 'API' };
      default:
        return null;
    }
  };
  const channelInfo = getChannelInfo();
  
  // Render multimodal content (text + images + files)
  const renderMultimodalContent = (content: (TextContent | ImageUrlContent | InputFileContent)[]) => {
    return (
      <div className="space-y-3">
        {content.map((part, index) => {
          if (part.type === 'text') {
            return (
              <div key={index} className="uhuru-office-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({node, ...props}) => <p {...props} />,
                    h1: ({node, ...props}) => <h1 {...props} />,
                    h2: ({node, ...props}) => <h2 {...props} />,
                    h3: ({node, ...props}) => <h3 {...props} />,
                    h4: ({node, ...props}) => <h4 {...props} />,
                    h5: ({node, ...props}) => <h5 {...props} />,
                    h6: ({node, ...props}) => <h6 {...props} />,
                    ul: ({node, ...props}) => <ul {...props} />,
                    ol: ({node, ...props}) => <ol {...props} />,
                    li: ({node, ...props}) => <li {...props} />,
                    a: ({node, ...props}) => <a {...props} />,
                    blockquote: ({node, ...props}) => <blockquote {...props} />,
                    pre: ({ children, ...props }: any) => {
                      const child: any = Array.isArray(children) ? children[0] : children;
                      const className = child?.props?.className || '';
                      const match = /language-(\w+)/.exec(className);
                      const codeContent = String(child?.props?.children ?? '').replace(/\n$/, '');
                      const language = match ? match[1] : 'text';

                      return (
                        <div className="my-4 relative rounded-xl overflow-hidden bg-gray-100 dark:bg-navy-600">
                          <SyntaxHighlighter
                            style={darkMode ? atomDark : oneLight}
                            language={language}
                            PreTag="div"
                            showLineNumbers
                            wrapLines
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              backgroundColor: 'transparent',
                              overflowX: 'auto',
                            }}
                          >
                            {codeContent}
                          </SyntaxHighlighter>
                        </div>
                      );
                    },
                    code: ({ inline, children, ...props }: any) => {
                      if (inline) {
                        return <code {...props}>{children}</code>;
                      }
                      return null; // block handled by <pre>
                    },
                    table: ({node, ...props}) => <div className="overflow-x-auto"><table {...props} /></div>,
                    th: ({node, ...props}) => <th {...props} />,
                    td: ({node, ...props}) => <td {...props} />,
                    hr: ({node, ...props}) => <hr {...props} />,
                    img: ({node, ...props}) => <ImageWithDownload src={props.src || ''} alt={props.alt} />
                  }}
                >
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          } else if (part.type === 'image_url') {
            return (
              <div key={index} className="my-2">
                <ImageWithDownload
                  src={part.image_url.url}
                  alt="Uploaded image for analysis"
                />
              </div>
            );
          } else if (part.type === 'input_file') {
            return (
              <div key={index} className="my-2">
                <FileAttachment
                  filename={part.filename}
                  fileUrl={part.file_url}
                  mimeType={part.mimeType}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  // Save cursor position when content changes
  const saveCaretPosition = () => {
    if (editableRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        caretPositionRef.current = range.startOffset;
      }
    }
  };

  // Restore cursor position
  const restoreCaretPosition = () => {
    if (editableRef.current) {
      const range = document.createRange();
      const sel = window.getSelection();
      
      if (sel && editableRef.current.firstChild) {
        try {
          const textNode = editableRef.current.firstChild;
          const position = Math.min(caretPositionRef.current, textNode.textContent?.length || 0);
          range.setStart(textNode, position);
          range.setEnd(textNode, position);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e) {
          // Fallback to end of content if positioning fails
          range.selectNodeContents(editableRef.current);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
  };

  // Focus and set initial caret position when starting inline edit
  useEffect(() => {
    if (isEditingInline && editableRef.current) {
      editableRef.current.focus();
      // Set initial caret position to the end for new edits
      if (caretPositionRef.current === 0) {
        const range = document.createRange();
        const sel = window.getSelection();
        if (sel && editableRef.current.childNodes.length > 0) {
          range.selectNodeContents(editableRef.current);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          caretPositionRef.current = extractTextFromMessageContent(editedContent).length;
        }
      }
    }
  }, [isEditingInline, editedContent]);

  
  return (
    <motion.div
      className={`group relative my-1 flex ${role === 'user' ? 'justify-end pr-3' : 'justify-start pl-3'}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Action buttons positioned at top right/left of message bubble */}
      {showActions && (
        <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 flex items-center gap-1 z-20`}>
          {role === 'user' ? (
            // No actions for user messages in hover state
            null
          ) : role === 'assistant' ? (
            <>
              {/* U Docs button (only when long enough) */}
              {isAssistantLongMessage && !assistEditing && (
                <>
                  <button
                    onClick={() => handleOpenUhuruDocs()}
                    className="text-xs font-medium text-navy hover:text-orange transition-colors duration-150 ease-out bg-white/90 backdrop-blur-sm rounded-md px-2 py-0.5"
                    title="Open in U Docs"
                  >
                    U Docs
                  </button>
                  <span className="text-navy/30 mx-1">|</span>
                </>
              )}

              {/* Edit (only when long enough) */}
              {isAssistantLongMessage && !assistEditing && (
                <>
                  <button
                    onClick={enterAssistEdit}
                    className="text-xs font-medium text-navy hover:text-orange transition-colors duration-150 ease-out bg-white/90 backdrop-blur-sm rounded-md px-2 py-0.5"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <span className="text-navy/30 mx-1">|</span>
                </>
              )}

              <button
                onClick={copyAssistant}
                className="text-xs font-medium text-navy hover:text-orange transition-colors duration-150 ease-out bg-white/90 backdrop-blur-sm rounded-md px-2 py-0.5"
                title={isCopied ? "Copied!" : "Copy"}
              >
                {isCopied ? "Copied!" : "Copy"}
              </button>

            </>
          ) : null}
        </div>
      )}
      
      <div
        className={[
          'max-w-[min(720px,92%)] min-h-0 px-4 py-3 rounded-2xl shadow-sm',
          role === 'user'
            ? 'bg-gradient-to-br from-[#FEF7E8] to-[#FFF9F0] text-[#002F4B] border border-[#f5b233]/30 rounded-lg md:rounded-md shadow-sm'
           : 'rounded-2xl bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 ring-1 ring-[#0170b9]/10'
        ].join(' ')}
      >
        {/* Message content */}
        {role === 'user' && isEditingInline ? (
          <div className="space-y-2">
            <div
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const newContent = e.currentTarget.textContent || '';
               console.log('🔍 [DEBUG] Inline edit content changed to:', newContent.substring(0, 50));
                setEditedContent(newContent);
              }}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[1.5rem] outline-none focus:outline-none bg-transparent text-[#002F4B] whitespace-pre-wrap"
              style={{ wordBreak: 'break-word' }}
              ref={(el) => {
                if (el && isEditingInline) {
                  // For multimodal content, only show the text parts for editing
                  const textContent = Array.isArray(parsedContent) 
                    ? parsedContent.filter(part => part.type === 'text').map(part => (part as TextContent).text).join('\n\n')
                    : extractTextFromMessageContent(editedContent);
                  el.textContent = textContent;
                  el.focus();
                  // Set cursor to end
                  const range = document.createRange();
                  const sel = window.getSelection();
                  if (sel && el.childNodes.length > 0) {
                    range.selectNodeContents(el);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                  }
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelInlineEdit}
                className="px-3 py-1 text-xs text-[#002F4B]/70 hover:text-[#002F4B] transition-colors duration-150 ease-out"
              >
                Cancel
              </button>
              <button
                onClick={handleFinishInlineEdit}
                className="px-3 py-1 text-xs bg-[#0170b9] text-white rounded-md hover:bg-[#f5b233] transition-colors duration-150 ease-out"
              >
               Send
              </button>
            </div>
          </div>
        ) : (
          <div className="chat-message-content relative w-full overflow-visible">
            {role === 'user' ? (
              <>
                {/* Header chips for user intent (search/files/channel) */}
                {role === 'user' && userText && !(isFileUploadMessage || isEnhancedFileUploadMessage) && (
                  <div className="mb-1 flex items-center gap-2">
                    {userIntent.intent === 'search' && <Chip icon={<Search className="w-3 h-3" />} label="Web search" />}
                    {channelInfo && <Chip icon={channelInfo.icon} label={channelInfo.label} />}
                  </div>
                )}
                
                {Array.isArray(parsedContent) ? (
                  // Render multimodal content (images + text)
                  <div className="prose prose-sm max-w-none text-[#002F4B]">
                     {renderMultimodalContent(parsedContent)}
                  </div>
                ) : (isFileUploadMessage || isEnhancedFileUploadMessage) ? (
                  // For file upload messages, render with special formatting
                  <div className="prose prose-sm max-w-none text-[#002F4B] relative">
                    {/* Edit button for user messages */}
                    {!isEditingInline && onEdit && messageIndex !== undefined && (
                      <button
                        onClick={handleStartInlineEdit}
                        className="absolute -top-3 right-2 px-1.5 py-0.5 rounded-md bg-white/90 text-gray-600 hover:text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out"
                        title="Edit message"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Use the same light markdown components for file upload messages
                        p: userMarkdownComponents.p,
                        ul: userMarkdownComponents.ul,
                        ol: userMarkdownComponents.ol,
                        h1: ({node, ...props}) => <h1 className="text-sm font-bold text-[#002F4B] mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-sm font-bold text-[#002F4B] mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-sm font-bold text-[#002F4B] mb-2" {...props} />,
                        h4: ({node, ...props}) => <h4 className="text-sm font-bold text-[#002F4B] mb-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-[#002F4B]" {...props} />,
                        pre: ({ children, ...props }: any) => {
                          const child: any = Array.isArray(children) ? children[0] : children;
                          const className = child?.props?.className || '';
                          const match = /language-(\w+)/.exec(className);
                          const codeContent = String(child?.props?.children ?? '').replace(/\n$/, '');
                          const language = match ? match[1] : 'text';

                          return (
                            <div className="my-4 relative rounded-xl overflow-hidden bg-gray-100 dark:bg-navy-600">
                              <SyntaxHighlighter
                                style={darkMode ? atomDark : oneLight}
                                language={language}
                                PreTag="div"
                                showLineNumbers
                                wrapLines
                                customStyle={{
                                  margin: 0,
                                  padding: '1rem',
                                  backgroundColor: 'transparent',
                                  overflowX: 'auto',
                                }}
                              >
                                {codeContent}
                              </SyntaxHighlighter>
                            </div>
                          );
                        },
                        code: ({ inline, children, ...props }: any) => {
                          if (inline) {
                            return (
                              <code className="bg-[#0170b9]/10 px-1 py-0.5 rounded text-xs font-mono text-[#002F4B]" {...props}>
                                {children}
                              </code>
                            );
                          }
                          return null;
                        },
                      }}
                    >
                      {formatFileUploadContent(parsedContent)}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm text-[#002F4B] whitespace-pre-wrap">
                     {displayContent ? displayContent : (typeof parsedContent === 'string' ? parsedContent : extractTextFromMessageContent(parsedContent))}
                  </div>
                )}
              </>
            ) : (
              // Assistant messages
              assistEditing ? (
                <div className="relative">
                  <div
                    ref={editableAssistRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="w-full min-h-[1.5rem] outline-none focus:outline-none bg-transparent text-[#002F4B] whitespace-pre-wrap overflow-visible"
                    style={{ wordBreak: 'break-word' }}
                  >
                    {assistDraft}
                  </div>
                  {/* Inline selection toolbar */}
                  {showSelTools && selBox && !replaceMode && (
                    <div
                      className="fixed z-50 bg-white border border-borders rounded-md shadow-md px-2 py-1 flex gap-2"
                      style={{ top: selBox.top, left: selBox.left }}
                    >
                      <button className="text-xs hover:underline" onClick={() => setReplaceMode(true)}>Edit</button>
                      <button className="text-xs hover:underline" onClick={() => wrapSelection('**')}>Bold</button>
                    </div>
                  )}

                  {/* Replace mode input */}
                  {replaceMode && (
                    <div className="fixed z-50 bg-white border border-borders rounded-md shadow-md p-2">
                      <input
                        type="text"
                        value={replaceText}
                        onChange={(e) => setReplaceText(e.target.value)}
                        placeholder="Replace with..."
                        className="border border-borders rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={replaceSelection}
                          className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => setReplaceMode(false)}
                          className="px-2 py-1 bg-gray-300 text-xs rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Edit controls */}
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={exitAssistEdit}
                      className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveAssistEdit}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : isStreaming ? (
                <StreamMarkdown content={rawText} />
              ) : Array.isArray(parsedContent) ? (
                // Render multimodal content (images + text + files) for assistant
                <div className="prose prose-sm max-w-none text-[#002F4B]">
                   {renderMultimodalContent(parsedContent as (TextContent | ImageUrlContent | InputFileContent)[])}
                </div>
              ) : (
                // Fallback for text-only assistant messages
                <div className="prose prose-sm max-w-none text-[#002F4B]">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponentsFluid}
                  >
                    {rawText}
                  </ReactMarkdown>
                </div>
              )
            )}
          </div>
        )}
        
        {/* Delivery status for WhatsApp messages */}
        {channel === 'whatsapp' && deliveryStatus && deliveryStatus !== 'sent' && (
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[#002F4B]/45">
            <span className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                deliveryStatus === 'delivered' ? 'bg-blue-500' :
                deliveryStatus === 'read' ? 'bg-green-500' :
                deliveryStatus === 'failed' ? 'bg-red-500' :
                'bg-gray-400'
              }`} />
            </span>
          </div>
        )}

        {/* Lesson Plan Detection Indicator */}
        {role === 'assistant' && isLessonPlanDetected && !isStreaming && (
          <div className="mt-3 pt-3 border-t border-orange/20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange" />
                <span className="text-sm text-navy font-medium">
                  {lessonPlanSaved ? 'Lesson Plan Saved' : 'Lesson Plan Detected'}
                </span>
                {isSavingLessonPlan && (
                  <div className="w-3 h-3 border-2 border-orange border-t-transparent rounded-full animate-spin"></div>
                )}
                {lessonPlanSaved && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="flex items-center gap-2">
                {lessonPlanSaved && (
                  <>
                    <button
                      onClick={() => navigate('/greyed-class')}
                      className="px-3 py-1.5 text-xs bg-orange/10 text-orange rounded-lg hover:bg-orange/20 transition-colors duration-200 font-medium"
                    >
                      View in GreyEd Teach
                    </button>
                    <button
                      onClick={() => {
                        // Navigate to GreyEd Pages with lesson plan content
                        navigate('/uhuru-office', {
                          state: {
                            content: rawText,
                            title: 'Lesson Plan'
                          }
                        });
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium"
                    >
                      Edit in U Pages
                    </button>
                  </>
                )}
              </div>
            </div>
            {lessonPlanSaved && (
              <p className="mt-2 text-xs text-navy/60">
                Saved to: Lesson Plans/{new Date().getFullYear()}/{String(new Date().getMonth() + 1).padStart(2, '0')}/{String(new Date().getDate()).padStart(2, '0')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Edit button for user messages - positioned below the message bubble */}
      {role === 'user' && !isEditingInline && onEdit && messageIndex !== undefined && (
        <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out">
          <button
            onClick={handleStartInlineEdit}
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#0170b9]/60 hover:text-[#0170b9] transition-colors duration-150"
            title="Edit message"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(MessageBubble);