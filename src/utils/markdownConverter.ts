import { marked } from 'marked';

/**
 * Convert Markdown text to HTML
 * @param markdown The markdown text to convert
 * @returns Promise<string> The converted HTML
 */
export const convertMarkdownToHtml = async (markdown: string): Promise<string> => {
  try {
    // Configure marked options for better HTML output
    marked.setOptions({
      breaks: true, // Convert line breaks to <br>
      gfm: true, // Enable GitHub Flavored Markdown
      headerIds: false, // Disable header IDs for cleaner output
      mangle: false, // Don't mangle autolinked email addresses
    });

    // Convert markdown to HTML
    const html = await marked.parse(markdown);
    return html;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    // Return original content as fallback
    return markdown;
  }
};

/**
 * Strip markdown formatting from text for clean display during streaming
 * @param text The markdown text to strip
 * @returns Plain text without markdown formatting
 */
export const stripMarkdown = (text: string): string => {
  if (!text) return '';
  
  try {
    let stripped = text;
    
    // Remove header markers (# ## ### etc.)
    stripped = stripped.replace(/^#{1,6}\s+/gm, '');
    
    // Remove bold markers (**text** or __text__)
    stripped = stripped.replace(/\*\*(.*?)\*\*/g, '$1');
    stripped = stripped.replace(/__(.*?)__/g, '$1');
    
    // Remove italic markers (*text* or _text_) - be careful not to affect ** bold
    stripped = stripped.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1');
    stripped = stripped.replace(/(?<!_)_([^_]+)_(?!_)/g, '$1');
    
    // Remove strikethrough markers (~~text~~)
    stripped = stripped.replace(/~~(.*?)~~/g, '$1');
    
    // Remove code block markers (```text```)
    stripped = stripped.replace(/```[\s\S]*?```/g, (match) => {
      // Extract content between code block markers
      return match.replace(/```[a-zA-Z]*\n?/g, '').replace(/```$/g, '');
    });
    
    // Remove inline code markers (`text`)
    stripped = stripped.replace(/`([^`]+)`/g, '$1');
    
    // Remove link markers ([text](url))
    stripped = stripped.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Remove image markers (![alt](url))
    stripped = stripped.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
    
    // Remove blockquote markers (> text)
    stripped = stripped.replace(/^>\s+/gm, '');
    
    // Remove horizontal rule markers (--- or ***)
    stripped = stripped.replace(/^[-*]{3,}$/gm, '');
    
    // Remove list markers (- text, * text, 1. text)
    stripped = stripped.replace(/^\s*[-*+]\s+/gm, '');
    stripped = stripped.replace(/^\s*\d+\.\s+/gm, '');
    
    // Clean up multiple whitespace and newlines
    stripped = stripped.replace(/\n{3,}/g, '\n\n');
    stripped = stripped.trim();
    
    return stripped;
  } catch (error) {
    console.error('Error stripping markdown:', error);
    // Return original text if stripping fails
    return text;
  }
};