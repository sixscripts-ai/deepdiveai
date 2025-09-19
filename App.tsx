import React, { useState, useCallback, useEffect } from 'react';
import { UploadedFile, ChatMessage, AnalysisResult } from './types';
import Sidebar from './components/Sidebar';
import FileUpload from './components/FileUpload';
import ReportDisplay from './components/ReportDisplay';
import { analyzeTradingData, continueChatStream } from './services/geminiService';
import DatabaseClient from './services/databaseClient';
import { AnalyticsIcon, BrainCircuitIcon, LogoIcon, UploadCloudIcon, HomeIcon } from './components/icons/Icons';

const loadingMessages = [
  'Performing deep dive into your trading data...',
  'Identifying performance patterns and correlations...',
  'Analyzing profitability by time of day...',
  'Checking instrument performance concentration...',
  'Compiling brutally honest recommendations...',
];

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [cachedReports, setCachedReports] = useState<Record<string, AnalysisResult>>({});
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [dbClient] = useState(() => DatabaseClient.getInstance());
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);


  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(loadingMessages[0]);

  // Initialize database connection and load data
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Check database connection
        await dbClient.healthCheck();
        setIsDbConnected(true);
        setDbError(null);

        // Load data from database
        const [dbFiles, dbReports, dbChats] = await Promise.all([
          dbClient.getAllFiles(),
          dbClient.getAllAnalysisResults(),
          dbClient.getAllChatHistory()
        ]);

        setFiles(dbFiles);
        setCachedReports(dbReports);
        setChatHistory(dbChats);

        // Check if we need to migrate from localStorage
        const hasLocalStorageData = 
          localStorage.getItem('deepdive-trading-files') ||
          localStorage.getItem('deepdive-trading-reports') ||
          localStorage.getItem('deepdive-trading-chats');

        if (hasLocalStorageData && dbFiles.length === 0) {
          console.log('Migrating data from localStorage to database...');
          await dbClient.migrateFromLocalStorage();
          
          // Reload data after migration
          const [newFiles, newReports, newChats] = await Promise.all([
            dbClient.getAllFiles(),
            dbClient.getAllAnalysisResults(),
            dbClient.getAllChatHistory()
          ]);

          setFiles(newFiles);
          setCachedReports(newReports);
          setChatHistory(newChats);
        }

      } catch (error) {
        console.error('Database initialization failed:', error);
        setDbError(error instanceof Error ? error.message : 'Database connection failed');
        setIsDbConnected(false);
        
        // Fallback to localStorage if database is not available
        try {
          const savedFiles = localStorage.getItem('deepdive-trading-files');
          const savedReports = localStorage.getItem('deepdive-trading-reports');
          const savedChats = localStorage.getItem('deepdive-trading-chats');
          
          if (savedFiles) setFiles(JSON.parse(savedFiles));
          if (savedReports) setCachedReports(JSON.parse(savedReports));
          if (savedChats) setChatHistory(JSON.parse(savedChats));
        } catch (localError) {
          console.error('Failed to load from localStorage as fallback:', localError);
        }
      }
    };

    initializeDatabase();
  }, [dbClient]);

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

  const handleFileUpload = async (file: UploadedFile) => {
    try {
      if (isDbConnected) {
        await dbClient.uploadFile(file);
        const updatedFiles = await dbClient.getAllFiles();
        setFiles(updatedFiles);
      } else {
        // Fallback to localStorage
        const newFiles = [...files, file];
        setFiles(newFiles);
        localStorage.setItem('deepdive-trading-files', JSON.stringify(newFiles));
      }
      
      setSelectedFile(file);
      setAnalysisResult(null);
      setError(null);
    } catch (error) {
      console.error('Failed to upload file:', error);
      setError('Failed to upload file. Please try again.');
    }
  };

  const handleFileSelect = async (file: UploadedFile) => {
    try {
      setSelectedFile(file);
      setAnalysisResult(cachedReports[file.id] || null);
      setError(null);
      
      // Update file access time in database
      if (isDbConnected) {
        await dbClient.updateFileAccess(file.id);
      }
    } catch (error) {
      console.error('Failed to update file access:', error);
      // Don't show error to user for this non-critical operation
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      if (isDbConnected) {
        await dbClient.deleteFile(fileId);
        const [updatedFiles, updatedReports, updatedChats] = await Promise.all([
          dbClient.getAllFiles(),
          dbClient.getAllAnalysisResults(),
          dbClient.getAllChatHistory()
        ]);
        setFiles(updatedFiles);
        setCachedReports(updatedReports);
        setChatHistory(updatedChats);
      } else {
        // Fallback to localStorage
        const remainingFiles = files.filter(f => f.id !== fileId);
        setFiles(remainingFiles);
        localStorage.setItem('deepdive-trading-files', JSON.stringify(remainingFiles));

        const newReports = { ...cachedReports };
        delete newReports[fileId];
        setCachedReports(newReports);
        localStorage.setItem('deepdive-trading-reports', JSON.stringify(newReports));

        const newChats = { ...chatHistory };
        delete newChats[fileId];
        setChatHistory(newChats);
        localStorage.setItem('deepdive-trading-chats', JSON.stringify(newChats));
      }

      if (selectedFile?.id === fileId) {
        const remainingFiles = files.filter(f => f.id !== fileId);
        const newSelectedFile = remainingFiles.length > 0 ? remainingFiles[0] : null;
        setSelectedFile(newSelectedFile);
        setAnalysisResult(newSelectedFile ? (cachedReports[newSelectedFile.id] || null) : null);
        setError(null);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      setError('Failed to delete file. Please try again.');
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setLoadingText(loadingMessages[0]);
    setError(null);
    
    // Clear chat on re-analysis
    const emptyChat: ChatMessage[] = [];
    setChatHistory(prev => ({...prev, [selectedFile.id]: emptyChat}));
    
    if (isDbConnected) {
      try {
        await dbClient.setChatHistory(selectedFile.id, emptyChat);
      } catch (error) {
        console.warn('Failed to clear chat history in database:', error);
      }
    }

    try {
      const startTime = Date.now();
      const result = await analyzeTradingData(selectedFile);
      const processingTime = Date.now() - startTime;
      
      setAnalysisResult(result);
      setCachedReports(prev => ({ ...prev, [selectedFile.id]: result }));
      
      // Save to database
      if (isDbConnected) {
        try {
          await dbClient.saveAnalysisResult(selectedFile.id, result, processingTime);
        } catch (error) {
          console.warn('Failed to save analysis result to database:', error);
          // Fallback to localStorage
          const updatedReports = { ...cachedReports, [selectedFile.id]: result };
          localStorage.setItem('deepdive-trading-reports', JSON.stringify(updatedReports));
        }
      } else {
        // Fallback to localStorage
        const updatedReports = { ...cachedReports, [selectedFile.id]: result };
        localStorage.setItem('deepdive-trading-reports', JSON.stringify(updatedReports));
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during analysis. Please check the console for details and ensure your API key is configured correctly.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, isDbConnected, dbClient, cachedReports]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!selectedFile || !analysisResult?.markdownReport) return;

    const currentFileId = selectedFile.id;
    
    // Use functional update to get current chat history
    let currentHistory: ChatMessage[] = [];
    setChatHistory(prev => {
      currentHistory = prev[currentFileId] || [];
      return prev;
    });

    // Check if chat is already loading
    if (isChatLoading) return;

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

        // Save final chat history to database
        if (isDbConnected) {
            try {
                const finalHistory = [...optimisticHistory, { role: 'model' as const, text: modelResponse }];
                await dbClient.setChatHistory(currentFileId, finalHistory);
            } catch (error) {
                console.warn('Failed to save chat history to database:', error);
            }
        } else {
            // Fallback to localStorage
            const finalHistory = [...optimisticHistory, { role: 'model' as const, text: modelResponse }];
            const updatedChats = { ...chatHistory, [currentFileId]: finalHistory };
            localStorage.setItem('deepdive-trading-chats', JSON.stringify(updatedChats));
        }

    } catch (err) {
        console.error(err);
        setError('An error occurred during chat. Please try again.');
        const finalHistory = [...optimisticHistory]; // Revert optimistic update on error
        setChatHistory(prev => ({...prev, [currentFileId]: finalHistory}));
    } finally {
        setIsChatLoading(false);
    }
  }, [selectedFile, analysisResult, isDbConnected, dbClient]);

  const handleReturnToMain = useCallback(() => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setError(null);
    setIsChatLoading(false);
    setIsLoading(false);
  }, []);
  
  const renderMainContent = () => {
    if (error) {
       return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-red-900/30 rounded-lg border border-red-500/50 backdrop-blur-sm">
          <h2 className="text-2xl font-semibold text-red-400 mb-2">Operation Failed</h2>
          <p className="text-gray-300 max-w-md mb-4">{error}</p>
          {dbError && (
            <div className="text-sm text-yellow-400 bg-yellow-900/20 p-3 rounded border border-yellow-500/30">
              <p className="font-semibold">Database Status:</p>
              <p>{dbError}</p>
              <p className="mt-1 text-xs">Falling back to local storage</p>
            </div>
          )}
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
            onReturnToMain={handleReturnToMain}
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
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-4 p-4 bg-gray-900/80 rounded-xl border border-gray-500/30 backdrop-blur-xl">
          <div className="flex items-center space-x-3">
            <LogoIcon className="h-8 w-8 text-cyan-400" />
            <h1 className="text-xl font-bold text-gray-100">DeepDive AI</h1>
          </div>
          <button
            onClick={handleReturnToMain}
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-all duration-200 border border-cyan-500/30 hover:border-cyan-500/50"
            title="Return to Home"
          >
            <HomeIcon className="h-5 w-5" />
            <span className="font-medium">Home</span>
          </button>
        </div>
        
        <div className="flex-1 bg-gray-900/60 rounded-2xl border border-gray-500/20 shadow-2xl shadow-black/30 p-4 sm:p-6 lg:p-8 backdrop-blur-xl">
            {renderMainContent()}
        </div>
      </main>
    </div>
  );
};

export default App;