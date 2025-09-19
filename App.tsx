import React, { useState, useCallback, useEffect } from 'react';
import { UploadedFile, ChatMessage, ChatRole, AnalysisResult } from './types';
import Sidebar from './components/Sidebar';
import FileUpload from './components/FileUpload';
import ReportDisplay from './components/ReportDisplay';
import { analyzeTradingData, continueChatStream } from './services/geminiService';
import { AnalyticsIcon, BrainCircuitIcon, LogoIcon, UploadCloudIcon } from './components/icons/Icons';

const loadingMessages = [
  'Performing deep dive into your trading data...',
  'Identifying performance patterns and correlations...',
  'Analyzing profitability by time of day...',
  'Checking instrument performance concentration...',
  'Compiling brutally honest recommendations...',
];

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>(() => {
    try {
      const savedFiles = localStorage.getItem('deepdive-trading-files');
      return savedFiles ? JSON.parse(savedFiles) : [];
    } catch (error) {
      console.error("Error reading files from localStorage", error);
      return [];
    }
  });

  const [cachedReports, setCachedReports] = useState<Record<string, AnalysisResult>>(() => {
    try {
      const savedReports = localStorage.getItem('deepdive-trading-reports');
      return savedReports ? JSON.parse(savedReports) : {};
    } catch (error) {
      console.error("Error reading reports from localStorage", error);
      return {};
    }
  });
  
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const savedChats = localStorage.getItem('deepdive-trading-chats');
      return savedChats ? JSON.parse(savedChats) : {};
    } catch (error) {
      console.error("Error reading chats from localStorage", error);
      return {};
    }
  });


  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(loadingMessages[0]);

  useEffect(() => {
    localStorage.setItem('deepdive-trading-files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('deepdive-trading-reports', JSON.stringify(cachedReports));
  }, [cachedReports]);
  
  useEffect(() => {
    localStorage.setItem('deepdive-trading-chats', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingText(prevText => {
          const currentIndex = loadingMessages.indexOf(prevText);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleFileUpload = (file: UploadedFile) => {
    const newFiles = [...files, file];
    setFiles(newFiles);
    setSelectedFile(file);
    setAnalysisResult(null);
    setError(null);
  };

  const handleFileSelect = (file: UploadedFile) => {
    setSelectedFile(file);
    setAnalysisResult(cachedReports[file.id] || null);
    setError(null);
  };

  const handleFileDelete = (fileId: string) => {
    const remainingFiles = files.filter(f => f.id !== fileId);
    setFiles(remainingFiles);

    setCachedReports(prevReports => {
        const newReports = { ...prevReports };
        delete newReports[fileId];
        return newReports;
    });

    setChatHistory(prevChats => {
      const newChats = { ...prevChats };
      delete newChats[fileId];
      return newChats;
    });

    if (selectedFile?.id === fileId) {
      const newSelectedFile = remainingFiles.length > 0 ? remainingFiles[0] : null;
      setSelectedFile(newSelectedFile);
      setAnalysisResult(newSelectedFile ? (cachedReports[newSelectedFile.id] || null) : null);
      setError(null);
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setLoadingText(loadingMessages[0]);
    setError(null);
    setChatHistory(prev => ({...prev, [selectedFile.id]: []})); // Clear chat on re-analysis

    try {
      const result = await analyzeTradingData(selectedFile);
      setAnalysisResult(result);
      setCachedReports(prev => ({ ...prev, [selectedFile.id]: result }));
    } catch (err) {
      console.error(err);
      setError('An error occurred during analysis. Please check the console for details and ensure your API key is configured correctly.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!selectedFile || !analysisResult?.markdownReport || isChatLoading) return;

    const currentFileId = selectedFile.id;
    const currentHistory = chatHistory[currentFileId] || [];

    const newUserMessage: ChatMessage = { role: 'user', text: message };
    const optimisticHistory = [...currentHistory, newUserMessage];
    
    setChatHistory(prev => ({ ...prev, [currentFileId]: optimisticHistory }));
    setIsChatLoading(true);
    setError(null);

    try {
        const stream = await continueChatStream(selectedFile, analysisResult.markdownReport, optimisticHistory, message);
        
        let modelResponse = '';
        const modelMessage: ChatMessage = { role: 'model', text: '' };
        const finalHistory = [...optimisticHistory, modelMessage];
        setChatHistory(prev => ({ ...prev, [currentFileId]: finalHistory }));

        for await (const chunk of stream) {
            modelResponse += chunk.text;
            setChatHistory(prev => {
                const updatedHistory = [...(prev[currentFileId] || [])];
                if (updatedHistory.length > 0 && updatedHistory[updatedHistory.length - 1].role === 'model') {
                    updatedHistory[updatedHistory.length - 1].text = modelResponse;
                }
                return { ...prev, [currentFileId]: updatedHistory };
            });
        }

    } catch (err) {
        console.error(err);
        setError('An error occurred during chat. Please try again.');
        const finalHistory = [...optimisticHistory]; // Revert optimistic update on error
        setChatHistory(prev => ({...prev, [currentFileId]: finalHistory}));
    } finally {
        setIsChatLoading(false);
    }
  }, [selectedFile, analysisResult, chatHistory, isChatLoading]);
  
  const renderMainContent = () => {
    if (error) {
       return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-red-900/30 rounded-lg border border-red-500/50 backdrop-blur-sm">
          <h2 className="text-2xl font-semibold text-red-400 mb-2">Operation Failed</h2>
          <p className="text-gray-300 max-w-md">{error}</p>
        </div>
      );
    }
    
    if (analysisResult) {
        return <ReportDisplay 
            analysisResult={analysisResult} 
            onReanalyze={handleAnalyze} 
            isLoading={isLoading}
            chatHistory={chatHistory[selectedFile?.id || ''] || []}
            onSendMessage={handleSendMessage}
            isChatLoading={isChatLoading}
        />;
    }
    
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <BrainCircuitIcon className="h-16 w-16 text-cyan-400 animate-spin mb-6" />
          <h2 className="text-2xl font-semibold text-gray-100 mb-2">AI Analysis in Progress</h2>
          <p className="text-gray-400 max-w-md transition-opacity duration-500">{loadingText}</p>
        </div>
      );
    }

    if (selectedFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <AnalyticsIcon className="h-16 w-16 text-gray-500 mb-6" />
            <h2 className="text-2xl font-semibold text-gray-100 mb-2">Ready for Analysis</h2>
            <p className="text-gray-400 max-w-md mb-8">
              You've selected <span className="font-semibold text-cyan-400">{selectedFile.name}</span>. Click the button below to start the deep dive performance analysis.
            </p>
            <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold py-3 px-6 rounded-lg flex items-center transition-all duration-300 shadow-lg shadow-cyan-500/20 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <BrainCircuitIcon className="h-5 w-5 mr-2" />
                Analyze Performance
            </button>
        </div>
      );
    }

    // Welcome Screen when no files are uploaded
    if (files.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <LogoIcon className="h-20 w-20 text-cyan-400 mb-4" />
          <h2 className="text-4xl font-bold text-gray-100 mb-2">Welcome to DeepDive AI</h2>
          <p className="text-lg text-gray-400 max-w-xl mb-10">
            Upload your trading journal to receive a comprehensive performance report, uncover hidden patterns, and get brutally honest, AI-powered recommendations to improve your results.
          </p>
          <FileUpload onFileUpload={handleFileUpload} />
        </div>
      );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <UploadCloudIcon className="h-16 w-16 text-gray-600 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-200 mb-2">Select a file or upload a new one</h2>
            <p className="text-gray-400 max-w-lg mb-8">Select a trading journal from the sidebar to view its report, or upload a new file to begin analysis.</p>
            <FileUpload onFileUpload={handleFileUpload} />
        </div>
    );
  };

  return (
    <div className="flex h-screen bg-transparent font-sans">
      <Sidebar
        files={files}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        onFileDelete={handleFileDelete}
      />
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="flex-1 bg-gray-900/60 rounded-2xl border border-gray-500/20 shadow-2xl shadow-black/30 p-4 sm:p-6 lg:p-8 backdrop-blur-xl">
            {renderMainContent()}
        </div>
      </main>
    </div>
  );
};

export default App;