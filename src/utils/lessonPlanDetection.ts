// Lesson Plan Detection Utility
// Detects lesson plans in AI-generated content and formats them appropriately

export interface LessonPlanData {
  isLessonPlan: boolean;
  confidence: number; // 0-1 score
  title: string;
  subject?: string;
  gradeLevel?: string;
  content: string;
  formattedContent: string; // With proper header and spacing
  sections: {
    objectives?: string;
    materials?: string;
    activities?: string;
    assessment?: string;
    [key: string]: string | undefined;
  };
}

// Keywords that indicate a lesson plan
const LESSON_PLAN_KEYWORDS = [
  'lesson plan',
  'learning objectives',
  'learning goals',
  'learning outcomes',
  'materials needed',
  'materials required',
  'lesson activities',
  'lesson procedure',
  'teaching activities',
  'instructional activities',
  'assessment methods',
  'assessment strategies',
  'homework assignment',
  'closure activity',
  'differentiation strategies',
  'accommodations',
  'standards addressed',
  'curriculum standards'
];

// Section headers commonly found in lesson plans
const SECTION_PATTERNS = {
  title: /^#+\s*(?:Lesson Plan:?|Title:?)\s*(.+)/im,
  subject: /^#+\s*(?:Subject|Topic|Area):?\s*(.+)/im,
  grade: /^#+\s*(?:Grade Level|Grade|Year):?\s*(.+)/im,
  objectives: /^#+\s*(?:Learning Objectives?|Goals?|Outcomes?):?/im,
  materials: /^#+\s*(?:Materials?|Resources?|Supplies?):?/im,
  activities: /^#+\s*(?:Activities?|Procedures?|Steps?|Instruction):?/im,
  assessment: /^#+\s*(?:Assessment|Evaluation|Grading):?/im,
};

/**
 * Detect if content is a lesson plan
 * @param content Text content to analyze
 * @returns LessonPlanData with detection results
 */
export const detectLessonPlan = (content: string): LessonPlanData => {
  const lowerContent = content.toLowerCase();
  let confidence = 0;

  // Count keyword matches
  let keywordMatches = 0;
  for (const keyword of LESSON_PLAN_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      keywordMatches++;
    }
  }

  // Calculate confidence based on keyword matches
  // Need at least 3 keywords for basic confidence
  if (keywordMatches >= 3) {
    confidence = Math.min(0.3 + (keywordMatches * 0.1), 1.0);
  }

  // Check for structured sections (increases confidence)
  let sectionMatches = 0;
  for (const pattern of Object.values(SECTION_PATTERNS)) {
    if (pattern.test(content)) {
      sectionMatches++;
    }
  }

  if (sectionMatches >= 2) {
    confidence += 0.2 * sectionMatches;
  }

  // Check for list items (common in lesson plans)
  const hasLists = /^[\s]*[-*•]\s+.+/m.test(content) || /^\d+\.\s+.+/m.test(content);
  if (hasLists) {
    confidence += 0.1;
  }

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  // Consider it a lesson plan if confidence >= 0.5
  const isLessonPlan = confidence >= 0.5;

  // Extract title
  let title = extractTitle(content);

  // Extract subject and grade if available
  const subject = extractPattern(content, SECTION_PATTERNS.subject);
  const gradeLevel = extractPattern(content, SECTION_PATTERNS.grade);

  // Extract sections
  const sections = extractSections(content);

  // Format content with proper header and spacing
  const formattedContent = formatLessonPlan(content, title);

  return {
    isLessonPlan,
    confidence,
    title,
    subject,
    gradeLevel,
    content,
    formattedContent,
    sections
  };
};

/**
 * Extract title from content
 */
const extractTitle = (content: string): string => {
  // Try to find explicit title
  const titleMatch = content.match(SECTION_PATTERNS.title);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }

  // Try to find first heading
  const headingMatch = content.match(/^#+\s*(.+)/m);
  if (headingMatch && headingMatch[1]) {
    return headingMatch[1].trim();
  }

  // Try to extract from first line if it looks like a title
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    // If first line is short and doesn't have common markdown, use it as title
    if (firstLine.length < 100 && !firstLine.includes('|') && !firstLine.includes('```')) {
      return firstLine.replace(/^#+\s*/, '').trim();
    }
  }

  // Default title
  return 'Lesson Plan';
};

/**
 * Extract a pattern from content
 */
const extractPattern = (content: string, pattern: RegExp): string | undefined => {
  const match = content.match(pattern);
  return match && match[1] ? match[1].trim() : undefined;
};

/**
 * Extract sections from lesson plan
 */
const extractSections = (content: string): Record<string, string> => {
  const sections: Record<string, string> = {};

  // Split content by markdown headers
  const lines = content.split('\n');
  let currentSection = '';
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is a header
    if (/^#+\s+/.test(line)) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }

      // Start new section
      currentSection = line.replace(/^#+\s+/, '').toLowerCase().trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
};

/**
 * Format lesson plan with proper header and spacing
 * Format: Title on first line, 3 blank lines, then content
 */
const formatLessonPlan = (content: string, title: string): string => {
  // Remove title from content if it's there
  let cleanContent = content;

  // Remove first line if it matches the title
  const lines = content.split('\n');
  if (lines.length > 0) {
    const firstLine = lines[0].replace(/^#+\s*/, '').trim();
    if (firstLine === title || firstLine.includes(title)) {
      cleanContent = lines.slice(1).join('\n').trim();
    }
  }

  // Format: Title + 3 blank lines + content
  return `# ${title}\n\n\n\n${cleanContent}`;
};

/**
 * Generate a filename for the lesson plan
 */
export const generateLessonPlanFilename = (lessonPlan: LessonPlanData): string => {
  // Create a safe filename from title
  const safeTitle = lessonPlan.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  // Add timestamp to ensure uniqueness
  const timestamp = Date.now();

  return `lesson-plan-${safeTitle}-${timestamp}.md`;
};

/**
 * Get the current date folder path
 */
export const getDateFolderPath = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `Lesson Plans/${year}/${month}/${day}`;
};

/**
 * Check if content contains lesson plan keywords (quick check)
 */
export const containsLessonPlanKeywords = (content: string): boolean => {
  const lowerContent = content.toLowerCase();
  let matches = 0;

  for (const keyword of LESSON_PLAN_KEYWORDS.slice(0, 5)) { // Check first 5 keywords
    if (lowerContent.includes(keyword)) {
      matches++;
    }
  }

  return matches >= 2;
};
