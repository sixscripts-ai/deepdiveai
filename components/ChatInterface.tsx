import React, { useState, useRef, useEffect, memo } from 'react';
import type { ChatMessage } from '../types';
import { BrainCircuitIcon, SendIcon, LightbulbIcon } from './icons/Icons';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  suggestedQuestions?: string[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading, suggestedQuestions }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleSuggestionClick = (question: string) => {
    if (!isLoading) {
      onSendMessage(question);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as any);
    }
  }

  const renderSuggestions = () => {
    if (messages.length > 0 || !suggestedQuestions || suggestedQuestions.length === 0) {
      return null;
    }

    return (
      <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
            <LightbulbIcon className="h-4 w-4 mr-2 text-cyan-400" />
            Suggested Questions
          </h4>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(q)}
                className="text-sm bg-gray-700/70 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto">
      <h3 className="text-xl font-bold text-gray-200 mb-4 flex-shrink-0">Chat with your Data</h3>
      <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0"><BrainCircuitIcon className="w-5 h-5 text-cyan-400" /></div>}
            <div className={`px-4 py-3 rounded-2xl max-w-lg whitespace-pre-wrap ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-lg' : 'bg-gray-800 text-gray-300 rounded-bl-lg'}`}>
              {msg.text}
              {isLoading && msg.role === 'model' && index === messages.length -1 && <span className="inline-block w-1 h-4 bg-gray-400 ml-1 animate-pulse"></span>}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0"><BrainCircuitIcon className="w-5 h-5 text-cyan-400" /></div>
                <div className="px-4 py-3 rounded-2xl max-w-lg bg-gray-800 text-gray-300 rounded-bl-lg">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-0"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-4 flex-shrink-0">
        {renderSuggestions()}
        <form onSubmit={handleSubmit}>
            <div className="relative">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question..."
                rows={1}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-4 pr-14 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow resize-none"
                disabled={isLoading}
            />
            <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-cyan-500 text-gray-950 hover:bg-cyan-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
            >
                <SendIcon className="w-5 h-5" />
            </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default memo(ChatInterface);