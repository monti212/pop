import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Download, FileSpreadsheet, File, ArrowLeft, Plus, Folder, Trash2, Copy, Check, Calculator, Grid, FunctionSquare as Function } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { FormulaEngine, getCellAddress } from '../utils/formulaEngine';
import { useAuth } from '../context/AuthContext';

interface UhuruSheet {
  id: string;
  title: string;
  data: any[][];
  headers: string[];
  created_at: string;
  updated_at: string;
  isAutoSaved?: boolean;
  source?: string;
}

interface CellPosition {
  row: number;
  col: number;
}

const UhuruSheetsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [title, setTitle] = useState('Untitled Sheet');
  const [showDocuments, setShowDocuments] = useState(false);
  const [savedSheets, setSavedSheets] = useState<UhuruSheet[]>([]);
  const [currentSheet, setCurrentSheet] = useState<UhuruSheet | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [cellValue, setCellValue] = useState('');
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [showFormulas, setShowFormulas] = useState(false);
  const [formulaEngine, setFormulaEngine] = useState<FormulaEngine | null>(null);
  const [calculatedValues, setCalculatedValues] = useState<any[][]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showAutoSavedOnly, setShowAutoSavedOnly] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formulaBarRef = useRef<HTMLInputElement | null>(null);
  const { profile: _profile } = useAuth();

  // Default spreadsheet with 20 rows and 10 columns
  const initializeEmptySheet = () => {
    const defaultHeaders = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const defaultData = Array(20).fill(null).map(() => Array(10).fill(''));
    return { headers: defaultHeaders, data: defaultData };
  };

  // Get initial content from navigation state or initialize empty
  useEffect(() => {
    const initialData = location.state?.data;
    const initialHeaders = location.state?.headers;
    const initialTitle = location.state?.title;
    
    if (initialData && initialHeaders) {
      setData(initialData);
      setHeaders(initialHeaders);
    } else {
      const { headers, data } = initializeEmptySheet();
      setData(data);
      setHeaders(headers);
    }
    
    if (initialTitle) {
      setTitle(initialTitle);
    }
    
    // Load saved sheets
    loadSavedSheets();
  }, [location.state]);

  // Auto-save functionality
  useEffect(() => {
    if (data.length > 0 && data.some(row => row.some(cell => cell !== ''))) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        if (document.hasFocus()) {
          handleAutoSave();
        }
      }, 5000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, headers]);

  // Focus input when editing cell
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    } else if (selectedCell && formulaBarRef.current && !editingCell) {
      formulaBarRef.current.focus();
    }
  }, [editingCell]);

  // Initialize formula engine when data changes
  useEffect(() => {
    if (data.length > 0 && headers.length > 0) {
      const engine = new FormulaEngine(data, headers);
      setFormulaEngine(engine);
      recalculateFormulas(data, engine);
    }
  }, [data, headers]);

  // Recalculate all formulas in the spreadsheet
  const recalculateFormulas = (currentData: any[][], engine?: FormulaEngine) => {
    const formulaEngineToUse = engine || formulaEngine;
    if (!formulaEngineToUse) return;

    const newCalculatedValues = currentData.map((row, _rowIndex) =>
      row.map((cell, _colIndex) => {
        if (typeof cell === 'string' && cell.startsWith('=')) {
          formulaEngineToUse.updateData(currentData, headers);
          const result = formulaEngineToUse.evaluateFormula(cell);
          return result.error ? result.value : result.value;
        }
        return cell;
      })
    );

    setCalculatedValues(newCalculatedValues);
  };

  const loadSavedSheets = () => {
    const saved = localStorage.getItem('uhuru-sheets-documents');
    if (saved) {
      setSavedSheets(JSON.parse(saved));
    }
  };

  const handleAutoSave = () => {
    if (currentSheet) {
      handleSaveSheet(false);
    }
  };

  const handleSaveSheet = (showNotification = true) => {
    setIsSaving(true);
    
    const sheetData: UhuruSheet = {
      id: currentSheet?.id || crypto.randomUUID(),
      title: title || 'Untitled Sheet',
      data,
      headers,
      created_at: currentSheet?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Save to localStorage
    const existingSheets = JSON.parse(localStorage.getItem('uhuru-sheets-documents') || '[]');
    const sheetIndex = existingSheets.findIndex((sheet: UhuruSheet) => sheet.id === sheetData.id);
    
    if (sheetIndex >= 0) {
      existingSheets[sheetIndex] = sheetData;
    } else {
      existingSheets.unshift(sheetData);
    }
    
    localStorage.setItem('uhuru-sheets-documents', JSON.stringify(existingSheets));
    
    setCurrentSheet(sheetData);
    setSavedSheets(existingSheets);
    setLastSaved(new Date());
    setIsSaving(false);
    
    if (showNotification) {
      setTimeout(() => setLastSaved(null), 3000);
    }
  };

  const handleNewSheet = () => {
    setCurrentSheet(null);
    const { headers, data } = initializeEmptySheet();
    setData(data);
    setHeaders(headers);
    setTitle('Untitled Sheet');
    setShowDocuments(false);
  };

  const handleLoadSheet = (sheet: UhuruSheet) => {
    setCurrentSheet(sheet);
    setData(sheet.data);
    setHeaders(sheet.headers);
    setTitle(sheet.title);
    setShowDocuments(false);
  };

  const handleDeleteSheet = (sheetId: string) => {
    if (!confirm('Are you sure you want to delete this sheet?')) return;
    
    const existingSheets = JSON.parse(localStorage.getItem('uhuru-sheets-documents') || '[]');
    const filteredSheets = existingSheets.filter((sheet: UhuruSheet) => sheet.id !== sheetId);
    
    localStorage.setItem('uhuru-sheets-documents', JSON.stringify(filteredSheets));
    setSavedSheets(filteredSheets);
    
    if (currentSheet?.id === sheetId) {
      handleNewSheet();
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (editingCell) {
      handleCellSave();
    }
    setSelectedCell({ row, col });
    
    const cellContent = data[row]?.[col] || '';
    setFormulaBarValue(cellContent);
    setCellValue(showFormulas ? cellContent : (calculatedValues[row]?.[col] || cellContent));
  };

  const handleCellSave = () => {
    if (editingCell) {
      const newData = [...data];
      newData[editingCell.row][editingCell.col] = cellValue;
      setData(newData);
      
      // Recalculate formulas after data change
      if (formulaEngine) {
        recalculateFormulas(newData);
      }
      
      setEditingCell(null);
      setCellValue('');
    }
  };

  const handleFormulaBarChange = (value: string) => {
    setFormulaBarValue(value);
    if (selectedCell) {
      const newData = [...data];
      newData[selectedCell.row][selectedCell.col] = value;
      setData(newData);
      
      // Recalculate formulas
      if (formulaEngine) {
        recalculateFormulas(newData);
      }
    }
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
    setEditingCell({ row, col });
    setCellValue(data[row]?.[col] || '');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
      // Move to next row
      if (selectedCell && selectedCell.row < data.length - 1) {
        setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col });
        setFormulaBarValue(data[selectedCell.row + 1]?.[selectedCell.col] || '');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellSave();
      // Move to next column
      if (selectedCell && selectedCell.col < headers.length - 1) {
        setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 });
        setFormulaBarValue(data[selectedCell.row]?.[selectedCell.col + 1] || '');
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setCellValue('');
    }
  };

  const handleArrowNavigation = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;
    
    let newRow = selectedCell.row;
    let newCol = selectedCell.col;
    
    switch (e.key) {
      case 'ArrowUp':
        newRow = Math.max(0, selectedCell.row - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(data.length - 1, selectedCell.row + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, selectedCell.col - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(headers.length - 1, selectedCell.col + 1);
        break;
      default:
        return;
    }
    
    e.preventDefault();
    setSelectedCell({ row: newRow, col: newCol });
    setFormulaBarValue(data[newRow]?.[newCol] || '');
  };

  const addRow = () => {
    const newRow = Array(headers.length).fill('');
    const newData = [...data, newRow];
    setData(newData);
    if (formulaEngine) {
      recalculateFormulas(newData);
    }
  };

  const addColumn = () => {
    const nextLetter = String.fromCharCode(65 + headers.length);
    const newHeaders = [...headers, nextLetter];
    const newData = data.map(row => [...row, '']);
    setHeaders(newHeaders);
    setData(newData);
    if (formulaEngine) {
      recalculateFormulas(newData);
    }
  };

  const downloadAsExcel = () => {
    setIsDownloading(true);
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data with headers
      const sheetData = [headers, ...data];
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31)); // Excel sheet names are limited to 31 chars
      
      // Save file
      XLSX.writeFile(wb, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel file:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAsCSV = () => {
    setIsDownloading(true);
    try {
      // Prepare data with headers
      const csvData = [headers, ...data];
      
      // Convert to CSV
      const csvContent = csvData.map(row => 
        row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating CSV file:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const copyToClipboard = () => {
    // Create tab-separated values for easy pasting into Excel/Sheets
    const tsvContent = [headers, ...data].map(row => 
      row.map(cell => String(cell || '')).join('\t')
    ).join('\n');
    
    navigator.clipboard.writeText(tsvContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Get display value for a cell (formula result or raw value)
  const getCellDisplayValue = (row: number, col: number) => {
    if (showFormulas) {
      return data[row]?.[col] || '';
    }
    return calculatedValues[row]?.[col] || data[row]?.[col] || '';
  };

  return (
    <div className="h-screen bg-sand-200 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-card border-b border-borders px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left side - Back button */}
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-12 hover:bg-sand-200 text-navy transition-colors flex items-center gap-2"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Back</span>
          </button>
          
          {/* Center - Title and sheet name */}
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Grid className="w-5 h-5 text-teal mr-2" />
              <h1 className="text-xl font-bold text-gray-800">Uhuru Sheets</h1>
            </div>
            
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-1 border border-borders rounded-12 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent text-navy bg-white"
              placeholder="Sheet title..."
            />
          </div>
          
          {/* Right side - Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDocuments(!showDocuments)}
             className="p-2 rounded-12 hover:bg-sand-200 text-navy transition-colors flex items-center gap-1"
              aria-label="My sheets"
            >
              <Folder className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Sheets</span>
            </button>
            
            <button
              onClick={handleNewSheet}
             className="p-2 rounded-12 hover:bg-sand-200 text-navy transition-colors flex items-center gap-1"
              aria-label="New sheet"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">New</span>
            </button>
            
            <button
              onClick={copyToClipboard}
             className="px-3 py-2 rounded-12 bg-white text-navy hover:bg-sand-200 transition-colors duration-200 flex items-center gap-2 text-sm border border-borders"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  const menu = document.getElementById('download-menu');
                  menu?.classList.toggle('hidden');
                }}
                className="px-3 py-2 rounded-12 bg-white text-navy hover:bg-sand-200 transition-colors duration-200 flex items-center gap-2 text-sm border border-borders"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              
              <div id="download-menu" className="hidden absolute right-0 top-full mt-2 bg-white rounded-12 shadow-card z-10 min-w-[160px] overflow-hidden border border-borders">
                <button
                  onClick={() => {
                    downloadAsExcel();
                    document.getElementById('download-menu')?.classList.add('hidden');
                  }}
                  disabled={isDownloading}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-left transition-colors duration-200 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-800">Export as Excel</div>
                    <div className="text-xs text-gray-500">Microsoft Excel format</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    downloadAsCSV();
                    document.getElementById('download-menu')?.classList.add('hidden');
                  }}
                  disabled={isDownloading}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-left transition-colors duration-200 disabled:opacity-50"
                >
                  <File className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-800">Export as CSV</div>
                    <div className="text-xs text-gray-500">Comma-separated values</div>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={() => handleSaveSheet()}
              disabled={isSaving}
             className="px-3 py-2 rounded-12 bg-teal text-white hover:bg-teal/90 transition-colors duration-200 flex items-center gap-2 text-sm shadow-card"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Saving</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Documents Modal */}
      {showDocuments && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-16 shadow-card max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-borders flex justify-between items-center">
              <h3 className="font-semibold text-lg text-navy">My Sheets</h3>
              <button
                onClick={() => setShowDocuments(false)}
                className="p-2 rounded-12 hover:bg-sand-200 text-navy"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(80vh-8rem)]">
              {savedSheets.length === 0 ? (
                <div className="p-8 text-center">
                  <Grid className="w-12 h-12 mx-auto text-navy/30 mb-3" />
                  <h4 className="text-lg font-medium text-navy mb-1">No sheets yet</h4>
                  <p className="text-sm text-navy/70 mb-4">
                    Start creating spreadsheets or tables will be auto-saved from chat
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-borders">
                  {/* Filter buttons */}
                  <div className="p-4 border-b border-borders">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAutoSavedOnly(false)}
                        className={`px-3 py-1 rounded text-sm ${
                          !showAutoSavedOnly 
                            ? 'bg-teal text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All Sheets
                      </button>
                      <button
                        onClick={() => setShowAutoSavedOnly(true)}
                        className={`px-3 py-1 rounded text-sm ${
                          showAutoSavedOnly 
                            ? 'bg-teal text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Auto-saved from Chat
                      </button>
                    </div>
                  </div>
                  
                  {savedSheets
                    .filter(sheet => showAutoSavedOnly ? sheet.isAutoSaved : true)
                    .map(sheet => (
                    <div key={sheet.id} className="p-4 hover:bg-sand-200/50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-800">{sheet.title}</h4>
                            {sheet.isAutoSaved && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                Auto-saved
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            Last edited: {new Date(sheet.updated_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {sheet.data.length} rows × {sheet.headers.length} columns
                          </p>
                          {sheet.source && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Source: {sheet.source}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadSheet(sheet)}
                            className="px-3 py-1 rounded-12 bg-teal text-white hover:bg-teal/90 transition-colors text-sm"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => handleDeleteSheet(sheet.id)}
                           className="p-2 rounded-12 hover:bg-red-50 text-red-500 transition-colors"
                            title="Delete sheet"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto-save status indicator */}
      {(isSaving || lastSaved) && (
        <div className="px-6 py-2 bg-sand-200 border-b border-borders text-xs text-navy/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSaving ? (
              <>
                <div className="w-3 h-3 border border-teal border-t-transparent rounded-full animate-spin"></div>
                <span>Auto-saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Saved at {lastSaved.toLocaleTimeString()}</span>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Main Spreadsheet Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-borders px-4 py-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={addRow}
             className="px-3 py-1 rounded-12 bg-white text-navy hover:bg-sand-200 transition-colors text-sm flex items-center gap-1 border border-borders"
            >
              <Plus className="w-3 h-3" />
              Add Row
            </button>
            <button
              onClick={addColumn}
             className="px-3 py-1 rounded-12 bg-white text-navy hover:bg-sand-200 transition-colors text-sm flex items-center gap-1 border border-borders"
            >
              <Plus className="w-3 h-3" />
              Add Column
            </button>
            
            <button
              onClick={() => setShowFormulas(!showFormulas)}
             className={`px-3 py-1 rounded-12 text-sm flex items-center gap-1 transition-colors ${
                showFormulas 
                  ? 'bg-teal text-white' 
                 : 'bg-white text-navy hover:bg-sand-200 border border-borders'
              }`}
            >
              <Function className="w-3 h-3" />
              {showFormulas ? 'Show Values' : 'Show Formulas'}
            </button>
          </div>
          
          {selectedCell && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calculator className="w-4 h-4" />
              <span>Cell: {getCellAddress(selectedCell.row, selectedCell.col)}</span>
            </div>
          )}
        </div>

        {/* Formula Bar */}
        <div className="bg-white border-b border-borders px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-navy/70 min-w-[60px]">
              <Calculator className="w-4 h-4" />
              <span>{selectedCell ? getCellAddress(selectedCell.row, selectedCell.col) : 'A1'}</span>
            </div>
            <input
              ref={formulaBarRef}
              type="text"
              value={formulaBarValue}
              onChange={(e) => setFormulaBarValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFormulaBarChange(formulaBarValue);
                  setEditingCell(null);
                } else if (e.key === 'Escape') {
                  if (selectedCell) {
                    setFormulaBarValue(data[selectedCell.row]?.[selectedCell.col] || '');
                  }
                }
                handleArrowNavigation(e);
              }}
              className="flex-1 px-3 py-1 border border-borders rounded-12 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent text-sm"
              placeholder="Enter value or formula (e.g., =SUM(A1:A5))"
            />
          </div>
          {formulaEngine && (
            <div className="mt-1 text-xs text-navy/70">
              Available functions: {formulaEngine.getAvailableFunctions().join(', ')}
            </div>
          )}
        </div>

        {/* Spreadsheet Grid */}
        <div className="flex-1 overflow-auto bg-white" onKeyDown={handleArrowNavigation} tabIndex={0}>
          <div className="inline-block min-w-full">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-12 h-8 border border-gray-300 bg-gray-100 text-center text-xs font-medium text-gray-500">#</th>
                  {headers.map((header, colIndex) => (
                    <th
                      key={colIndex}
                      className="min-w-[120px] h-8 border border-gray-300 bg-gray-50 text-center text-xs font-medium text-gray-700 px-2"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="w-12 h-8 border border-gray-300 bg-gray-50 text-center text-xs font-medium text-gray-500">
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, colIndex) => (
                      <td
                        key={colIndex}
                        className={`min-w-[120px] h-8 border border-gray-300 cursor-cell hover:bg-blue-50 relative ${
                          selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                            ? 'bg-blue-100 ring-2 ring-blue-400'
                            : ''
                        }`}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                      >
                        {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={cellValue}
                            onChange={(e) => setCellValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={handleKeyPress}
                            className="w-full h-full border-none outline-none bg-white px-2 text-sm"
                          />
                        ) : (
                          <div className={`px-2 py-1 text-sm min-h-[24px] flex items-center ${
                            typeof cell === 'string' && cell.startsWith('=') 
                              ? 'text-blue-600 font-mono' 
                              : 'text-gray-800'
                          }`}>
                            {getCellDisplayValue(rowIndex, colIndex)}
                          </div>
                        )}
                        {/* Formula indicator */}
                        {typeof cell === 'string' && cell.startsWith('=') && !showFormulas && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full opacity-75"></div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Function Help Panel */}
        {selectedCell && formulaBarValue.startsWith('=') && (
          <div className="bg-blue-50 border-t border-blue-200 p-3">
            <div className="text-sm">
              <div className="font-medium text-blue-800 mb-2">Formula Help:</div>
              <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
                <div>
                  <strong>Functions:</strong> SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, IF, ROUND, ABS, SQRT, POWER
                </div>
                <div>
                  <strong>Examples:</strong> =SUM(A1:A5), =AVERAGE(B1:B10), =IF(C1&gt;100,"High","Low")
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default UhuruSheetsPage;