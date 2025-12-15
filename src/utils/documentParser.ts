// Lazy load heavy document parsing libraries for better performance
// This reduces initial bundle size significantly (35MB pdfjs + 7MB xlsx + 2MB mammoth)

// Dynamic imports for document parsers
let mammothModule: any = null;
let xlsxModule: any = null;
let pdfjsModule: any = null;
let pdfWorkerUrl: string | null = null;

const loadMammoth = async () => {
  if (!mammothModule) {
    mammothModule = await import('mammoth');
  }
  return mammothModule;
};

const loadXLSX = async () => {
  if (!xlsxModule) {
    xlsxModule = await import('xlsx');
  }
  return xlsxModule;
};

const loadPDFJS = async () => {
  if (!pdfjsModule) {
    pdfjsModule = await import('pdfjs-dist');
    const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfWorkerUrl = workerModule.default;
    pdfjsModule.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
  return pdfjsModule;
};

// Maximum characters for extracted document content to prevent token limit issues
const MAX_DOCUMENT_CHARS = 15000;

/**
 * Parse document content based on file type
 * @param file File to parse
 * @returns Promise with the extracted text content
 */
export const parseDocumentContent = async (file: File): Promise<string> => {
  try {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop() || '';
    
    let extractedText = '';
    
    // Handle Word documents
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        extension === 'docx') {
      extractedText = await parseWordDocument(file);
    }
    
    // Handle older Word documents
    else if (fileType === 'application/msword' || extension === 'doc') {
      extractedText = `[Word Document: ${file.name}] - Legacy Word documents (.doc) cannot be parsed in the browser. Consider saving as .docx format.`;
    }
    
    // Handle PDF documents
    else if (fileType === 'application/pdf' || extension === 'pdf') {
      extractedText = await parsePdfDocument(file);
    }
    
    // Handle Excel documents
    else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        fileType === 'application/vnd.ms-excel' ||
        extension === 'xlsx' || 
        extension === 'xls') {
      extractedText = await parseExcelDocument(file);
    }
    
    // Handle CSV files
    else if (fileType === 'text/csv' || extension === 'csv') {
      extractedText = await parseTextFile(file);
    }
    
    // Handle PowerPoint documents
    else if (fileType.includes('presentation') || extension === 'pptx' || extension === 'ppt') {
      extractedText = `[PowerPoint Document: ${file.name}] - PowerPoint documents cannot be parsed directly in the browser.`;
    }
    
    // Handle plain text and other simple formats
    else if (fileType === 'text/plain' || 
        fileType === 'text/markdown' || 
        fileType === 'application/json' || 
        extension === 'txt' || 
        extension === 'md' || 
        extension === 'json') {
      extractedText = await parseTextFile(file);
    }
    
    else {
      // Default fallback for unsupported types
      extractedText = `[${extension.toUpperCase()} Document: ${file.name}] - This file format cannot be parsed directly. Consider converting to a supported format like PDF, DOCX, or TXT.`;
    }
    
    // Truncate content if it exceeds the maximum length
    if (extractedText.length > MAX_DOCUMENT_CHARS) {
      extractedText = extractedText.substring(0, MAX_DOCUMENT_CHARS) + 
        `\n\n[Note: Document content has been truncated to ${MAX_DOCUMENT_CHARS} characters to stay within processing limits. The full document contains ${extractedText.length} characters.]`;
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error parsing document:', error);
    return `[Error: Failed to parse ${file.name}. The file may be corrupted or in an unsupported format.]`;
  }
};

/**
 * Parse a Word document (.docx)
 * @param file Word document file
 * @returns Promise with extracted text
 */
const parseWordDocument = async (file: File): Promise<string> => {
  try {
    const mammoth = await loadMammoth();
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || `[No text content found in ${file.name}]`;
  } catch (error: any) {
    console.error('Error parsing Word document:', error);
    throw new Error(`Failed to parse Word document: ${error.message}`);
  }
};

/**
 * Parse a PDF document
 * @param file PDF file
 * @returns Promise with extracted text
 */
const parsePdfDocument = async (file: File): Promise<string> => {
  try {
    const pdfjsLib = await loadPDFJS();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    const maxPages = pdf.numPages;

    // Only process up to first 50 pages to avoid memory issues
    const pagesToProcess = Math.min(maxPages, 50);

    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Preserve structure by maintaining line breaks and spacing
      let pageText = '';
      let lastY = -1;

      textContent.items.forEach((item: any, index: number) => {
        const currentY = item.transform[5];

        // Add line break if Y position changed significantly (new line)
        if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
          pageText += '\n';
        }

        // Add space if items are on same line but separated
        if (index > 0 && Math.abs(currentY - lastY) <= 5) {
          pageText += ' ';
        }

        pageText += item.str;
        lastY = currentY;
      });

      fullText += pageText.trim() + '\n\n';
    }

    if (maxPages > pagesToProcess) {
      fullText += `[Note: Document contains ${maxPages} pages. Only the first ${pagesToProcess} pages were processed.]`;
    }

    return fullText || `[No text content found in ${file.name}]`;
  } catch (error: any) {
    console.error('Error parsing PDF document:', error);
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  }
};

/**
 * Parse an Excel document
 * @param file Excel file
 * @returns Promise with extracted text
 */
const parseExcelDocument = async (file: File): Promise<string> => {
  try {
    const XLSX = await loadXLSX();
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let result = '';
    
    // Process only first 10 sheets to avoid memory issues
    const sheetNames = workbook.SheetNames.slice(0, 10);
    
    sheetNames.forEach(sheetName => {
      result += `Sheet: ${sheetName}\n`;
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert worksheet to JSON
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      // Format as a simple table
      if (json.length > 0) {
        // Get headers
        const headers = Object.keys(json[0]);
        result += headers.join('\t') + '\n';
        
        // Get rows (limit to 100 rows per sheet)
        const rowsToProcess = json.slice(0, 100);
        rowsToProcess.forEach((row: any) => {
          result += headers.map(header => row[header] || '').join('\t') + '\n';
        });
        
        if (json.length > 100) {
          result += `[Note: Sheet contains ${json.length} rows. Only the first 100 rows were processed.]\n`;
        }
      } else {
        result += '[Empty sheet]\n';
      }
      
      result += '\n';
    });
    
    if (workbook.SheetNames.length > 10) {
      result += `[Note: Workbook contains ${workbook.SheetNames.length} sheets. Only the first 10 sheets were processed.]`;
    }
    
    return result || `[No content found in ${file.name}]`;
  } catch (error: any) {
    console.error('Error parsing Excel document:', error);
    throw new Error(`Failed to parse Excel document: ${error.message}`);
  }
};

/**
 * Parse a plain text file
 * @param file Text file
 * @returns Promise with text content
 */
const parseTextFile = async (file: File): Promise<string> => {
  try {
    return await file.text();
  } catch (error: any) {
    console.error('Error parsing text file:', error);
    throw new Error(`Failed to parse text file: ${error.message}`);
  }
};