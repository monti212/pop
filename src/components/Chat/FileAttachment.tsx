import React from 'react';
import { FileText, FileImage, FileSpreadsheet, FileCode, Download, File } from 'lucide-react';

interface FileAttachmentProps {
  filename: string;
  fileUrl: string;
  mimeType?: string;
}

const getFileIcon = (filename: string, mimeType?: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return <FileImage className="w-4 h-4" />;
  }

  if (mimeType?.includes('spreadsheet') || ['xlsx', 'xls', 'csv'].includes(ext || '')) {
    return <FileSpreadsheet className="w-4 h-4" />;
  }

  if (mimeType?.includes('pdf') || ext === 'pdf') {
    return <FileText className="w-4 h-4" />;
  }

  if (mimeType?.includes('word') || ['doc', 'docx'].includes(ext || '')) {
    return <FileText className="w-4 h-4" />;
  }

  if (mimeType?.includes('code') || ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(ext || '')) {
    return <FileCode className="w-4 h-4" />;
  }

  return <File className="w-4 h-4" />;
};

const FileAttachment: React.FC<FileAttachmentProps> = ({ filename, fileUrl, mimeType }) => {
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const truncateFilename = (name: string, maxLength: number = 30) => {
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - (ext?.length || 0) - 4);
    return `${truncated}...${ext ? `.${ext}` : ''}`;
  };

  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-[#0170b9]/10 rounded-lg border border-[#0170b9]/20 hover:bg-[#0170b9]/15 transition-colors duration-150 group">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-[#0170b9]">
          {getFileIcon(filename, mimeType)}
        </span>
        <span className="text-sm text-[#002F4B] font-medium truncate" title={filename}>
          {truncateFilename(filename)}
        </span>
      </div>
      <button
        onClick={handleDownload}
        className="text-[#0170b9] hover:text-[#f5b233] transition-colors duration-150 opacity-0 group-hover:opacity-100"
        title="Download file"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
};

export default FileAttachment;
