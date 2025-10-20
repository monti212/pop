import { detectDeviceCapabilities, shouldProcessFile } from './deviceCapabilities';

const MAX_DOCUMENT_CHARS = 15000;

let pdfWorkerUrl: string | null = null;

const loadPdfWorker = async () => {
  if (!pdfWorkerUrl) {
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfWorkerUrl = worker.default;
  }
  return pdfWorkerUrl;
};

export const parseDocumentContent = async (file: File): Promise<string> => {
  try {
    const processCheck = shouldProcessFile(file.size);
    if (!processCheck.allowed) {
      return `[Error: ${processCheck.reason}]`;
    }

    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop() || '';

    let extractedText = '';

    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        extension === 'docx') {
      extractedText = await parseWordDocument(file);
    }
    else if (fileType === 'application/msword' || extension === 'doc') {
      extractedText = `[Word Document: ${file.name}] - Legacy Word documents (.doc) cannot be parsed in the browser. Consider saving as .docx format.`;
    }
    else if (fileType === 'application/pdf' || extension === 'pdf') {
      extractedText = await parsePdfDocument(file);
    }
    else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        fileType === 'application/vnd.ms-excel' ||
        extension === 'xlsx' ||
        extension === 'xls') {
      extractedText = await parseExcelDocument(file);
    }
    else if (fileType === 'text/csv' || extension === 'csv') {
      extractedText = await parseTextFile(file);
    }
    else if (fileType.includes('presentation') || extension === 'pptx' || extension === 'ppt') {
      extractedText = `[PowerPoint Document: ${file.name}] - PowerPoint documents cannot be parsed directly in the browser.`;
    }
    else if (fileType === 'text/plain' ||
        fileType === 'text/markdown' ||
        fileType === 'application/json' ||
        extension === 'txt' ||
        extension === 'md' ||
        extension === 'json') {
      extractedText = await parseTextFile(file);
    }
    else {
      extractedText = `[${extension.toUpperCase()} Document: ${file.name}] - This file format cannot be parsed directly. Consider converting to a supported format like PDF, DOCX, or TXT.`;
    }

    if (extractedText.length > MAX_DOCUMENT_CHARS) {
      extractedText = extractedText.substring(0, MAX_DOCUMENT_CHARS) +
        `\n\n[Note: Document content has been truncated to ${MAX_DOCUMENT_CHARS} characters to stay within processing limits. The full document contains ${extractedText.length} characters.]`;
    }

    return extractedText;
  } catch (error: any) {
    console.error('Error parsing document:', error);
    return `[Error: Failed to parse ${file.name}. ${error?.message || 'The file may be corrupted or in an unsupported format.'}]`;
  }
};

const parseWordDocument = async (file: File): Promise<string> => {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || `[No text content found in ${file.name}]`;
  } catch (error: any) {
    console.error('Error parsing Word document:', error);
    throw new Error(`Failed to parse Word document: ${error.message}`);
  }
};

const parsePdfDocument = async (file: File): Promise<string> => {
  try {
    const [pdfjsLib, workerUrl] = await Promise.all([
      import('pdfjs-dist'),
      loadPdfWorker()
    ]);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    const maxPages = pdf.numPages;
    const capabilities = detectDeviceCapabilities();
    const pagesToProcess = Math.min(maxPages, capabilities.maxPdfPages);

    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `Page ${i}:\n${pageText}\n\n`;

      if (i % 10 === 0 && typeof (globalThis as any).gc === 'function') {
        try {
          (globalThis as any).gc();
        } catch (e) {
        }
      }
    }

    if (maxPages > pagesToProcess) {
      fullText += `[Note: Document contains ${maxPages} pages. Only the first ${pagesToProcess} pages were processed to optimize performance on this device.]`;
    }

    pdf.destroy();
    return fullText || `[No text content found in ${file.name}]`;
  } catch (error: any) {
    console.error('Error parsing PDF document:', error);
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  }
};

const parseExcelDocument = async (file: File): Promise<string> => {
  try {
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    let result = '';
    const sheetNames = workbook.SheetNames.slice(0, 10);

    sheetNames.forEach(sheetName => {
      result += `Sheet: ${sheetName}\n`;
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (json.length > 0) {
        const headers = Object.keys(json[0]);
        result += headers.join('\t') + '\n';

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

const parseTextFile = async (file: File): Promise<string> => {
  try {
    return await file.text();
  } catch (error: any) {
    console.error('Error parsing text file:', error);
    throw new Error(`Failed to parse text file: ${error.message}`);
  }
};
