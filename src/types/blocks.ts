export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'numberedList'
  | 'quote'
  | 'code'
  | 'divider'
  | 'callout'
  | 'toggle';

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  metadata?: {
    language?: string; // for code blocks
    icon?: string; // for callouts
    color?: string; // for callouts
    collapsed?: boolean; // for toggle blocks
    [key: string]: any;
  };
  order: number;
}

export interface SlashCommand {
  id: string;
  label: string;
  icon: string;
  type: BlockType;
  description: string;
  keywords: string[];
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'paragraph',
    label: 'Text',
    icon: 'Type',
    type: 'paragraph',
    description: 'Plain text paragraph',
    keywords: ['text', 'paragraph', 'p']
  },
  {
    id: 'heading1',
    label: 'Heading 1',
    icon: 'Heading1',
    type: 'heading1',
    description: 'Large section heading',
    keywords: ['heading', 'h1', 'title']
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    icon: 'Heading2',
    type: 'heading2',
    description: 'Medium section heading',
    keywords: ['heading', 'h2', 'subtitle']
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    icon: 'Heading3',
    type: 'heading3',
    description: 'Small section heading',
    keywords: ['heading', 'h3']
  },
  {
    id: 'bulletList',
    label: 'Bulleted List',
    icon: 'List',
    type: 'bulletList',
    description: 'Create a bullet list',
    keywords: ['bullet', 'list', 'ul', 'unordered']
  },
  {
    id: 'numberedList',
    label: 'Numbered List',
    icon: 'ListOrdered',
    type: 'numberedList',
    description: 'Create a numbered list',
    keywords: ['number', 'list', 'ol', 'ordered']
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: 'Quote',
    type: 'quote',
    description: 'Capture a quote',
    keywords: ['quote', 'blockquote', 'cite']
  },
  {
    id: 'code',
    label: 'Code',
    icon: 'Code',
    type: 'code',
    description: 'Code block with syntax highlighting',
    keywords: ['code', 'snippet', 'programming']
  },
  {
    id: 'divider',
    label: 'Divider',
    icon: 'Minus',
    type: 'divider',
    description: 'Visual divider',
    keywords: ['divider', 'separator', 'hr', 'line']
  },
  {
    id: 'callout',
    label: 'Callout',
    icon: 'MessageSquare',
    type: 'callout',
    description: 'Important note or tip',
    keywords: ['callout', 'note', 'info', 'tip']
  },
  {
    id: 'toggle',
    label: 'Toggle',
    icon: 'ChevronRight',
    type: 'toggle',
    description: 'Collapsible section',
    keywords: ['toggle', 'collapse', 'accordion', 'details']
  }
];

export const createBlock = (type: BlockType, content: string = '', order: number = 0): ContentBlock => {
  return {
    id: crypto.randomUUID(),
    type,
    content,
    metadata: {},
    order
  };
};

export const convertMarkdownToBlocks = (markdown: string): ContentBlock[] => {
  const blocks: ContentBlock[] = [];
  const lines = markdown.split('\n');
  let order = 0;
  let currentBlock: ContentBlock | null = null;
  let codeBlockContent: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = line.trim().substring(3);
        codeBlockContent = [];
      } else {
        blocks.push({
          ...createBlock('code', codeBlockContent.join('\n'), order++),
          metadata: { language: codeLanguage }
        });
        inCodeBlock = false;
        codeBlockContent = [];
        codeLanguage = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Handle headings
    if (line.startsWith('# ')) {
      blocks.push(createBlock('heading1', line.substring(2), order++));
    } else if (line.startsWith('## ')) {
      blocks.push(createBlock('heading2', line.substring(3), order++));
    } else if (line.startsWith('### ')) {
      blocks.push(createBlock('heading3', line.substring(4), order++));
    } else if (line.startsWith('> ')) {
      blocks.push(createBlock('quote', line.substring(2), order++));
    } else if (line.trim() === '---' || line.trim() === '***') {
      blocks.push(createBlock('divider', '', order++));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push(createBlock('bulletList', line.substring(2), order++));
    } else if (/^\d+\.\s/.test(line)) {
      blocks.push(createBlock('numberedList', line.replace(/^\d+\.\s/, ''), order++));
    } else if (line.trim() !== '') {
      blocks.push(createBlock('paragraph', line, order++));
    }
  }

  return blocks.length > 0 ? blocks : [createBlock('paragraph', '', 0)];
};

export const convertBlocksToMarkdown = (blocks: ContentBlock[]): string => {
  return blocks.map(block => {
    switch (block.type) {
      case 'heading1':
        return `# ${block.content}`;
      case 'heading2':
        return `## ${block.content}`;
      case 'heading3':
        return `### ${block.content}`;
      case 'quote':
        return `> ${block.content}`;
      case 'code':
        const lang = block.metadata?.language || '';
        return `\`\`\`${lang}\n${block.content}\n\`\`\``;
      case 'divider':
        return '---';
      case 'bulletList':
        return `- ${block.content}`;
      case 'numberedList':
        return `1. ${block.content}`;
      case 'callout':
        return `> 💡 ${block.content}`;
      case 'toggle':
        return `<details>\n<summary>${block.content.split('\n')[0]}</summary>\n${block.content.split('\n').slice(1).join('\n')}\n</details>`;
      case 'paragraph':
      default:
        return block.content;
    }
  }).join('\n\n');
};
