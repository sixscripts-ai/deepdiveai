import React from 'react';
import { UploadedFile } from '../types';
import { getFileIcon } from './icons/FileIcons';
import { DeleteIcon, LogoIcon } from './icons/Icons';

interface SidebarProps {
  files: UploadedFile[];
  selectedFile: UploadedFile | null;
  onFileSelect: (file: UploadedFile) => void;
  onFileDelete: (fileId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ files, selectedFile, onFileSelect, onFileDelete }) => {
  const handleDelete = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    onFileDelete(fileId);
  };
  
  return (
    <aside className="w-72 bg-gray-950/40 border-r border-gray-500/20 p-4 flex flex-col h-full backdrop-blur-xl">
      <div className="flex items-center mb-6 pb-4 border-b border-gray-800/80">
        <LogoIcon className="h-8 w-8 text-cyan-400" />
        <h1 className="text-xl font-bold text-gray-100 ml-3">DeepDive AI</h1>
      </div>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
        Uploaded Journals
      </h2>
      <div className="flex-1 overflow-y-auto -mr-2 pr-2">
        {files.length === 0 ? (
            <p className="text-gray-500 text-sm px-2">No files uploaded yet.</p>
        ) : (
          <ul>
            {files.map(file => (
              <li key={file.id}>
                <button
                  onClick={() => onFileSelect(file)}
                  className={`w-full text-left flex items-center p-2 rounded-lg transition-all duration-200 group relative ${
                    selectedFile?.id === file.id
                      ? 'bg-cyan-500/10 text-cyan-300'
                      : 'text-gray-300 hover:bg-gray-800/60 hover:text-gray-100'
                  }`}
                >
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-cyan-400 rounded-r-full transition-opacity duration-300 ${selectedFile?.id === file.id ? 'opacity-100' : 'opacity-0'}`}></span>
                  <div className="ml-2">
                    {getFileIcon(file.name, "h-5 w-5 flex-shrink-0")}
                  </div>
                  <span className="truncate flex-1 text-sm font-medium ml-3">{file.name}</span>
                  <div 
                    onClick={(e) => handleDelete(e, file.id)} 
                    className="ml-2 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                    aria-label={`Delete ${file.name}`}
                  >
                    <DeleteIcon className="h-4 w-4" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;