
import React from 'react';

const CsvIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 16h-1a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1h1"/><path d="M11 11v6"/><path d="M14.5 11h-2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2"/><path d="m14.5 14-2-1.5 2-1.5"/></svg>
);

const JsonIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1"/><path d="M14 17a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1"/><path d="M8 12h1"/><path d="M15 17h-1"/></svg>
);

const ExcelIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m11.5 12-3 5"/><path d="m8.5 17 3-5"/><path d="m15.5 12-3 5"/><path d="m12.5 17 3-5"/></svg>
);

const PdfIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M5 12v-1h2a1 1 0 0 1 1 1 1 1 0 0 1-1 1h-1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1"/><path d="M12 18v-6h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1z"/><path d="M17 12h2a1 1 0 0 1 1 1v1h-3"/></svg>
);

const SqlIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>
);

const FileIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
);


export const getFileIcon = (fileName: string, className?: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'csv':
        case 'tsv':
            return <CsvIcon className={className} />;
        case 'json':
            return <JsonIcon className={className} />;
        case 'xls':
        case 'xlsx':
            return <ExcelIcon className={className} />;
        case 'pdf':
            return <PdfIcon className={className} />;
        case 'sql':
            return <SqlIcon className={className} />;
        default:
            return <FileIcon className={className} />;
    }
}
