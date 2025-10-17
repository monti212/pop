// Formula Engine for Uhuru Sheets
// Supports basic spreadsheet functions like SUM, AVERAGE, MIN, MAX, COUNT, etc.

import { evaluate } from 'mathjs';

export interface CellReference {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellReference;
  end: CellReference;
}

export interface FormulaResult {
  value: any;
  error?: string;
  dependencies: CellReference[];
}

export class FormulaEngine {
  private data: any[][];
  private headers: string[];

  constructor(data: any[][], headers: string[]) {
    this.data = data;
    this.headers = headers;
  }

  // Convert column letter to index (A=0, B=1, etc.)
  private columnLetterToIndex(letter: string): number {
    let result = 0;
    for (let i = 0; i < letter.length; i++) {
      result = result * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return result - 1;
  }

  // Convert column index to letter (0=A, 1=B, etc.)
  private columnIndexToLetter(index: number): string {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode((index % 26) + 'A'.charCodeAt(0)) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  }

  // Parse cell reference like "A1" to {row: 0, col: 0}
  private parseCellReference(cellRef: string): CellReference | null {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;

    const col = this.columnLetterToIndex(match[1]);
    const row = parseInt(match[2]) - 1; // Convert to 0-based index

    return { row, col };
  }

  // Parse range like "A1:B5" to {start: {row: 0, col: 0}, end: {row: 4, col: 1}}
  private parseRange(rangeStr: string): CellRange | null {
    const parts = rangeStr.split(':');
    if (parts.length !== 2) return null;

    const start = this.parseCellReference(parts[0]);
    const end = this.parseCellReference(parts[1]);

    if (!start || !end) return null;

    return { start, end };
  }

  // Get cell value by reference
  private getCellValue(ref: CellReference): any {
    if (ref.row < 0 || ref.row >= this.data.length || 
        ref.col < 0 || ref.col >= this.data[ref.row].length) {
      return 0; // Return 0 for out-of-bounds references
    }
    
    const value = this.data[ref.row][ref.col];
    
    // If the value is a formula, we need to evaluate it
    if (typeof value === 'string' && value.startsWith('=')) {
      // Prevent circular references by returning 0
      return 0;
    }
    
    // Convert to number if possible
    const numValue = parseFloat(value);
    return isNaN(numValue) ? value : numValue;
  }

  // Get values from a range
  private getRangeValues(range: CellRange): any[] {
    const values = [];
    for (let row = range.start.row; row <= range.end.row; row++) {
      for (let col = range.start.col; col <= range.end.col; col++) {
        values.push(this.getCellValue({ row, col }));
      }
    }
    return values;
  }

  // Get all cell references from a formula
  private extractCellReferences(formula: string): CellReference[] {
    const cellRefRegex = /([A-Z]+\d+)/g;
    const matches = formula.match(cellRefRegex) || [];
    const references: CellReference[] = [];

    for (const match of matches) {
      const ref = this.parseCellReference(match);
      if (ref) {
        references.push(ref);
      }
    }

    return references;
  }

  // Built-in functions
  private functions = {
    SUM: (values: any[]): number => {
      return values.filter(v => typeof v === 'number').reduce((sum, val) => sum + val, 0);
    },

    AVERAGE: (values: any[]): number => {
      const numbers = values.filter(v => typeof v === 'number');
      return numbers.length > 0 ? this.functions.SUM(numbers) / numbers.length : 0;
    },

    MIN: (values: any[]): number => {
      const numbers = values.filter(v => typeof v === 'number');
      return numbers.length > 0 ? Math.min(...numbers) : 0;
    },

    MAX: (values: any[]): number => {
      const numbers = values.filter(v => typeof v === 'number');
      return numbers.length > 0 ? Math.max(...numbers) : 0;
    },

    COUNT: (values: any[]): number => {
      return values.filter(v => typeof v === 'number').length;
    },

    COUNTA: (values: any[]): number => {
      return values.filter(v => v !== null && v !== undefined && v !== '').length;
    },

    IF: (condition: any, trueValue: any, falseValue: any): any => {
      return condition ? trueValue : falseValue;
    },

    ROUND: (value: number, digits: number = 0): number => {
      return Math.round(value * Math.pow(10, digits)) / Math.pow(10, digits);
    },

    ABS: (value: number): number => {
      return Math.abs(value);
    },

    SQRT: (value: number): number => {
      return value >= 0 ? Math.sqrt(value) : NaN;
    },

    POWER: (base: number, exponent: number): number => {
      return Math.pow(base, exponent);
    }
  };

  // Evaluate a formula
  public evaluateFormula(formula: string): FormulaResult {
    try {
      // Remove the leading = sign
      formula = formula.substring(1).toUpperCase();

      // Extract dependencies
      const dependencies = this.extractCellReferences(formula);

      // Replace cell references with actual values
      let processedFormula = formula;
      
      // Handle ranges first (A1:B5)
      const rangeRegex = /([A-Z]+\d+):([A-Z]+\d+)/g;
      processedFormula = processedFormula.replace(rangeRegex, (match, start, end) => {
        const range = this.parseRange(match);
        if (range) {
          const values = this.getRangeValues(range);
          return `[${values.join(',')}]`;
        }
        return match;
      });

      // Handle individual cell references
      const cellRefRegex = /([A-Z]+\d+)/g;
      processedFormula = processedFormula.replace(cellRefRegex, (match) => {
        const ref = this.parseCellReference(match);
        if (ref) {
          const value = this.getCellValue(ref);
          return typeof value === 'number' ? value.toString() : `"${value}"`;
        }
        return match;
      });

      // Handle function calls
      const functionRegex = /([A-Z]+)\(([^)]*)\)/g;
      processedFormula = processedFormula.replace(functionRegex, (match, funcName, args) => {
        if (this.functions[funcName]) {
          try {
            // Parse arguments
            let parsedArgs;
            if (args.startsWith('[') && args.endsWith(']')) {
              // Handle array arguments (from ranges)
              const arrayContent = args.slice(1, -1);
              parsedArgs = arrayContent ? arrayContent.split(',').map(arg => {
                const trimmed = arg.trim();
                const num = parseFloat(trimmed);
                return isNaN(num) ? trimmed.replace(/"/g, '') : num;
              }) : [];
            } else {
              // Handle individual arguments
              parsedArgs = args.split(',').map(arg => {
                const trimmed = arg.trim();
                if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                  return trimmed.slice(1, -1);
                }
                const num = parseFloat(trimmed);
                return isNaN(num) ? trimmed : num;
              });
            }

            const result = this.functions[funcName](parsedArgs);
            return result.toString();
          } catch (error) {
            throw new Error(`Error in ${funcName}: ${error.message}`);
          }
        } else {
          throw new Error(`Unknown function: ${funcName}`);
        }
      });

      // Evaluate mathematical expressions using mathjs (safe alternative to eval)
      try {
        // Basic safety check - only allow numbers, operators, parentheses
        if (!/^[\d+\-*/().\s]+$/.test(processedFormula)) {
          throw new Error('Invalid formula syntax');
        }

        // Use mathjs evaluate instead of eval for security
        const result = evaluate(processedFormula);

        return {
          value: result,
          dependencies
        };
      } catch (error) {
        throw new Error(`Formula evaluation error: ${error.message}`);
      }

    } catch (error) {
      return {
        value: `#ERROR!`,
        error: error.message,
        dependencies: []
      };
    }
  }

  // Check if a string is a formula
  public static isFormula(value: string): boolean {
    return typeof value === 'string' && value.startsWith('=');
  }

  // Get a list of available functions
  public getAvailableFunctions(): string[] {
    return Object.keys(this.functions);
  }

  // Update data reference (called when spreadsheet data changes)
  public updateData(data: any[][], headers: string[]): void {
    this.data = data;
    this.headers = headers;
  }
}

// Helper function to format cell address
export const getCellAddress = (row: number, col: number): string => {
  let colStr = '';
  let colIndex = col;
  while (colIndex >= 0) {
    colStr = String.fromCharCode((colIndex % 26) + 'A'.charCodeAt(0)) + colStr;
    colIndex = Math.floor(colIndex / 26) - 1;
  }
  return `${colStr}${row + 1}`;
};