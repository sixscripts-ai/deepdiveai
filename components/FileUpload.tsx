import React, { useState, useCallback, memo } from 'react';
import type { UploadedFile } from '../types';
import { UploadCloudIcon } from './icons/Icons';

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
}

const binaryTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    const reader = new FileReader();
    const isBinary = binaryTypes.includes(file.type) || file.name.endsWith('.pdf') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx');

    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const newFile: UploadedFile = {
          id: `${file.name}-${new Date().toISOString()}`,
          name: file.name,
          type: file.type,
          content: isBinary ? result.split(',')[1] : result, // For data URLs, strip the meta prefix
          isBinary: isBinary,
        };
        onFileUpload(newFile);
      }
    };
    reader.onerror = (err) => {
        console.error("FileReader error: ", err);
    };

    if (isBinary) {
        reader.readAsDataURL(file);
    } else {
        reader.readAsText(file);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onFileUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`w-full max-w-lg p-8 border-2 border-dashed rounded-xl transition-colors duration-300 ${isDragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-gray-700 hover:border-gray-600 bg-gray-800/20'}`}
    >
        <div className="flex flex-col items-center justify-center text-center">
            <UploadCloudIcon className={`h-12 w-12 mb-4 transition-colors duration-300 ${isDragging ? 'text-cyan-400' : 'text-gray-500'}`} />
            <p className="font-semibold text-gray-200">
                <label htmlFor="file-upload" className="text-cyan-400 cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded">
                Click to upload
                </label>
                {' '}or drag and drop
            </p>
            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv, .json, .txt, .pdf, .sql, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
            <p className="text-xs text-gray-500 mt-1">Supports: CSV, JSON, TXT, PDF, SQL, XLS, XLSX</p>
        </div>
    </div>
  );
};

export default memo(FileUpload);