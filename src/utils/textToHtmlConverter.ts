/**
 * Convert plain text to structured HTML for rich text editor
 * Intelligently detects document structure and applies appropriate formatting
 */

export const convertTextToStructuredHtml = (plainText: string): string => {
  if (!plainText || plainText.trim() === '') {
    return '<p><br></p>';
  }

  const lines = plainText.split('\n').map(line => line.trim());
  const htmlParts: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

    // Skip empty lines between paragraphs
    if (line === '' && htmlParts.length > 0) {
      // Close any open lists
      if (inList && listType) {
        htmlParts.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      continue;
    }

    // Skip standalone empty lines
    if (line === '') {
      continue;
    }

    // Detect and format headings
    // Pattern 1: ALL CAPS (likely a title)
    if (line === line.toUpperCase() && line.length > 3 && line.length < 100 && /[A-Z]/.test(line)) {
      if (inList && listType) {
        htmlParts.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      htmlParts.push(`<h2><strong>${escapeHtml(line)}</strong></h2>`);
      continue;
    }

    // Pattern 2: Lines followed by dashes or equals (markdown-style headers)
    if (nextLine && /^[=-]{3,}$/.test(nextLine)) {
      if (inList && listType) {
        htmlParts.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      const level = nextLine[0] === '=' ? 'h1' : 'h2';
      htmlParts.push(`<${level}><strong>${escapeHtml(line)}</strong></${level}>`);
      i++; // Skip the underline
      continue;
    }

    // Pattern 3: Lines starting with numbers (1., 2., etc.) or Roman numerals
    if (/^(I{1,3}V?|IV|VI{0,3}|IX|X{1,3})\.\s/.test(line) || /^[IVX]+\)\s/.test(line)) {
      if (inList && listType) {
        htmlParts.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      htmlParts.push(`<h3><strong>${escapeHtml(line)}</strong></h3>`);
      continue;
    }

    // Pattern 4: Lines ending with colon (section headers)
    if (line.endsWith(':') && line.length < 80 && !line.match(/^[a-z]/)) {
      if (inList && listType) {
        htmlParts.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      htmlParts.push(`<h3><strong>${escapeHtml(line)}</strong></h3>`);
      continue;
    }

    // Detect numbered lists (1. 2. 3. or 1) 2) 3))
    const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (numberedMatch) {
      const itemText = numberedMatch[2];

      if (!inList || listType !== 'ol') {
        if (inList && listType) {
          htmlParts.push(`</${listType}>`);
        }
        htmlParts.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      htmlParts.push(`<li>${formatInlineText(itemText)}</li>`);
      continue;
    }

    // Detect bullet points (• - * or starting with dash)
    const bulletMatch = line.match(/^[•\-*]\s+(.+)$/);
    if (bulletMatch) {
      const itemText = bulletMatch[1];

      if (!inList || listType !== 'ul') {
        if (inList && listType) {
          htmlParts.push(`</${listType}>`);
        }
        htmlParts.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      htmlParts.push(`<li>${formatInlineText(itemText)}</li>`);
      continue;
    }

    // Close list if we're in one and this isn't a list item
    if (inList && listType) {
      htmlParts.push(`</${listType}>`);
      inList = false;
      listType = null;
    }

    // Detect bold text patterns (text between ** or __)
    const formattedText = formatInlineText(line);

    // Regular paragraph
    if (line.length > 0) {
      htmlParts.push(`<p>${formattedText}</p>`);
    }
  }

  // Close any remaining open lists
  if (inList && listType) {
    htmlParts.push(`</${listType}>`);
  }

  // If no content was generated, return a placeholder
  if (htmlParts.length === 0) {
    return '<p><br></p>';
  }

  return htmlParts.join('\n');
};

/**
 * Format inline text with bold, italic, and other formatting
 */
const formatInlineText = (text: string): string => {
  let formatted = escapeHtml(text);

  // Bold patterns: **text** or __text__
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic patterns: *text* or _text_
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>');

  // Detect URLs and make them links
  formatted = formatted.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return formatted;
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
};

/**
 * Check if content is already HTML
 */
export const isHtml = (content: string): boolean => {
  const htmlPattern = /<\/?[a-z][\s\S]*>/i;
  return htmlPattern.test(content);
};

/**
 * Smart content converter - checks if content is HTML or plain text
 */
export const smartConvertContent = (content: string): string => {
  if (!content || content.trim() === '') {
    return '<p><br></p>';
  }

  // If already HTML, return as-is
  if (isHtml(content)) {
    return content;
  }

  // Convert plain text to structured HTML
  return convertTextToStructuredHtml(content);
};
