// Table Detection Utility for Auto-saving tables to Uhuru Sheets
// Detects tables in various formats: Markdown, CSV, TSV, pipe-delimited

export interface TableData {
  headers: string[];
  data: any[][];
}

/**
 * Detect and parse tables from text content
 * @param content Text content to analyze
 * @returns TableData if table found, null otherwise
 */
export const detectTableInContent = (content: string): TableData | null => {
  // Try different table formats
  return detectMarkdownTable(content) ||
         detectCSVTable(content) ||
         detectTSVTable(content) ||
         detectPipeDelimitedTable(content);
};

/**
 * Detect Markdown tables (| Header | Header |)
 */
const detectMarkdownTable = (content: string): TableData | null => {
  const lines = content.split('\n');
  let tableStart = -1;
  let headerLine = -1;
  
  // Find table start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('|') && line.split('|').length >= 3) {
      // Check if next line is a separator (contains dashes)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.includes('-') && nextLine.includes('|')) {
          tableStart = i;
          headerLine = i;
          break;
        }
      }
    }
  }
  
  if (tableStart === -1) return null;
  
  // Parse header
  const headerRow = lines[headerLine].trim();
  const headers = headerRow.split('|')
    .map(cell => cell.trim())
    .filter(cell => cell !== '');
  
  if (headers.length === 0) return null;
  
  // Parse data rows
  const data: any[][] = [];
  for (let i = tableStart + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.includes('|')) break;
    
    const cells = line.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell !== '');
    
    if (cells.length === headers.length) {
      // Convert numeric values
      const processedCells = cells.map(cell => {
        const num = parseFloat(cell);
        return isNaN(num) ? cell : num;
      });
      data.push(processedCells);
    }
  }
  
  return data.length > 0 ? { headers, data } : null;
};

/**
 * Detect CSV tables (comma-separated)
 */
const detectCSVTable = (content: string): TableData | null => {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return null;
  
  // Check if content looks like CSV (has commas and consistent structure)
  const commaCount = lines[0].split(',').length;
  if (commaCount < 2) return null;
  
  // Verify other lines have similar comma count
  const isConsistent = lines.slice(0, 5).every(line => 
    Math.abs(line.split(',').length - commaCount) <= 1
  );
  
  if (!isConsistent) return null;
  
  // Parse headers and data
  const headers = lines[0].split(',').map(cell => cell.trim().replace(/"/g, ''));
  const data: any[][] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
    if (cells.length === headers.length) {
      const processedCells = cells.map(cell => {
        const num = parseFloat(cell);
        return isNaN(num) ? cell : num;
      });
      data.push(processedCells);
    }
  }
  
  return data.length > 0 ? { headers, data } : null;
};

/**
 * Detect TSV tables (tab-separated)
 */
const detectTSVTable = (content: string): TableData | null => {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return null;
  
  // Check if content has tabs
  const tabCount = lines[0].split('\t').length;
  if (tabCount < 2) return null;
  
  // Verify consistency
  const isConsistent = lines.slice(0, 5).every(line => 
    Math.abs(line.split('\t').length - tabCount) <= 1
  );
  
  if (!isConsistent) return null;
  
  // Parse headers and data
  const headers = lines[0].split('\t').map(cell => cell.trim());
  const data: any[][] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t').map(cell => cell.trim());
    if (cells.length === headers.length) {
      const processedCells = cells.map(cell => {
        const num = parseFloat(cell);
        return isNaN(num) ? cell : num;
      });
      data.push(processedCells);
    }
  }
  
  return data.length > 0 ? { headers, data } : null;
};

/**
 * Detect pipe-delimited tables (| separated but not markdown)
 */
const detectPipeDelimitedTable = (content: string): TableData | null => {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return null;
  
  // Look for pipe-separated content without markdown table indicators
  const firstLine = lines[0].trim();
  if (!firstLine.includes('|')) return null;
  
  // Skip if it looks like markdown (has separator line with dashes)
  if (lines.length > 1 && lines[1].includes('-') && lines[1].includes('|')) {
    return null; // This would be handled by markdown detector
  }
  
  const pipeCount = firstLine.split('|').length;
  if (pipeCount < 3) return null; // Need at least 2 columns
  
  // Parse headers and data
  const headers = firstLine.split('|')
    .map(cell => cell.trim())
    .filter(cell => cell !== '');
  
  const data: any[][] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.includes('|')) continue;
    
    const cells = line.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell !== '');
    
    if (cells.length === headers.length) {
      const processedCells = cells.map(cell => {
        const num = parseFloat(cell);
        return isNaN(num) ? cell : num;
      });
      data.push(processedCells);
    }
  }
  
  return data.length > 0 ? { headers, data } : null;
};

/**
 * Convert table data to CSV format
 */
export const tableToCSV = (tableData: TableData): string => {
  const csvRows = [tableData.headers.join(',')];
  
  tableData.data.forEach(row => {
    const csvRow = row.map(cell => {
      const cellStr = String(cell || '');
      // Escape cells that contain commas, quotes, or newlines
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',');
    csvRows.push(csvRow);
  });
  
  return csvRows.join('\n');
};

/**
 * Convert table data to TSV format
 */
export const tableToTSV = (tableData: TableData): string => {
  const tsvRows = [tableData.headers.join('\t')];
  
  tableData.data.forEach(row => {
    const tsvRow = row.map(cell => String(cell || '').replace(/\t/g, ' ')).join('\t');
    tsvRows.push(tsvRow);
  });
  
  return tsvRows.join('\n');
};