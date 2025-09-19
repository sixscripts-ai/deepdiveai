import React, { useRef, useState } from 'react';
import { BrainCircuitIcon, RefreshIcon, DownloadIcon, InfoIcon } from './icons/Icons';
import ChatInterface from './ChatInterface';
import { ChatMessage, AnalysisResult } from '../types';
import { exportAsMarkdown, exportAsPdf } from '../utils/exportUtils';
import PerformanceBarChart from './charts/PerformanceBarChart';
import EquityCurveChart from './charts/EquityCurveChart';
import InstrumentPerformanceTable from './InstrumentPerformanceTable';

interface ReportDisplayProps {
  analysisResult: AnalysisResult;
  onReanalyze?: () => void;
  isLoading?: boolean;
  chatHistory?: ChatMessage[];
  onSendMessage?: (message: string) => void;
  isChatLoading?: boolean;
}

const metricTooltips: Record<string, string> = {
  'Total Net PnL': 'The total profit or loss across all trades after commissions and fees.',
  'Total Trades': 'The total number of executed trades in the journal.',
  'Win Rate': 'The percentage of trades that were profitable.',
  'Avg Win / Avg Loss': 'The average profit of winning trades compared to the average loss of losing trades. Also known as the Risk/Reward Ratio.',
  'Profit Factor': 'Gross profit divided by gross loss. A value greater than 1 is profitable. Higher is better.',
  'Sharpe Ratio': 'Measures return per unit of risk, assuming a 0% risk-free rate. A higher value indicates better risk-adjusted return.',
  'Sortino Ratio': 'Similar to the Sharpe Ratio, but only considers downside volatility. It measures return against harmful risk.',
  'Max Drawdown': 'The largest peak-to-trough decline in account value during a specific period.',
  'Longest Loss Streak': 'The highest number of consecutive losing trades.',
  'Average Holding Time': 'The average duration from trade entry to exit. Useful for understanding your trading style (e.g., scalper, day trader, swing trader).',
  'Max Win / Loss per Trade': 'The largest single winning trade and largest single losing trade.',
  'Best Day / Worst Day': 'The date with the highest total PnL and the lowest total PnL.'
};


const renderMarkdownBlocks = (markdown: string, chartData: AnalysisResult['chartData']): (JSX.Element | null)[] => {
  const elements: (JSX.Element | null)[] = [];
  const lines = markdown.split('\n');

  let skipTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('## Equity Curve')) {
        if (chartData?.equityCurve && chartData.equityCurve.length > 0) {
            elements.push(
                <div key="equity-curve-section">
                    <h2 className="text-2xl font-bold text-cyan-400 mt-8 mb-4 pb-2 border-b-2 border-gray-700">
                        Equity Curve
                    </h2>
                    <EquityCurveChart data={chartData.equityCurve} />
                </div>
            );
        }
        continue;
    }

    if (line.startsWith('## Instrument Performance')) {
        elements.push(
            <h2 key={i} className="text-2xl font-bold text-cyan-400 mt-8 mb-4 pb-2 border-b-2 border-gray-700">
                Instrument Performance
            </h2>
        );
        if (chartData?.instrumentPerformance && chartData.instrumentPerformance.length > 0) {
            elements.push(<InstrumentPerformanceTable key="instrument-table" data={chartData.instrumentPerformance} />);
            skipTable = true;
        } else {
            skipTable = false;
        }
        continue;
    }

    if (line.startsWith('## Time of Day (Open Hour)')) {
        elements.push(
            <h2 key={i} className="text-2xl font-bold text-cyan-400 mt-8 mb-4 pb-2 border-b-2 border-gray-700">
                Time of Day (Open Hour)
            </h2>
        );
        if (chartData?.timeOfDay && chartData.timeOfDay.length > 0) {
            elements.push(<PerformanceBarChart key="time-chart" data={chartData.timeOfDay} dataKey="hour" barColor="#22d3ee" />);
            skipTable = true; // Signal to skip the markdown table for this section
        } else {
            skipTable = false;
        }
        continue;
    }

    if (line.startsWith('## Weekday Performance')) {
        elements.push(
            <h2 key={i} className="text-2xl font-bold text-cyan-400 mt-8 mb-4 pb-2 border-b-2 border-gray-700">
                Weekday Performance
            </h2>
        );
        if (chartData?.weekday && chartData.weekday.length > 0) {
            elements.push(<PerformanceBarChart key="weekday-chart" data={chartData.weekday} dataKey="weekday" barColor="#22d3ee" />);
            skipTable = true;
        } else {
            skipTable = false;
        }
        continue;
    }

    // Table check - only render if we are not skipping
    if (!skipTable && line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const header = line.split('|').map(s => s.trim()).slice(1, -1);
      const rows = [];
      i += 2; // Move past header and separator
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map(s => s.trim()).slice(1, -1));
        i++;
      }
      i--; // Decrement because the outer for-loop will increment it

      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-6 rounded-lg border border-gray-700/50">
          <table className="w-full text-left">
            <thead className="bg-gray-800/60">
              <tr>
                {header.map((h, index) => (
                  <th key={index} className="p-3 text-sm font-semibold text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-gray-800/80 hover:bg-gray-800/40">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="p-3 text-sm text-gray-300">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    
    // After a table is processed (or skipped), reset the skip flag
    if (skipTable && !line.includes('|')) {
        skipTable = false;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-2xl font-bold text-cyan-400 mt-8 mb-4 pb-2 border-b-2 border-gray-700">
          {line.substring(3)}
        </h2>
      );
    } else if (line.startsWith('- **')) {
      const parts = line.substring(2).split(':**');
      if (parts.length === 2) {
        const metricName = parts[0].replace(/\*\*/g, '').trim();
        const tooltipText = metricTooltips[metricName];
        elements.push(
            <div key={i} className="flex justify-between items-baseline py-2 border-b border-gray-800/50">
                <span className="font-semibold text-gray-300 flex items-center">
                    {metricName}:
                    {tooltipText && (
                        <span className="metric-tooltip ml-2">
                           <InfoIcon className="h-4 w-4 text-gray-500" />
                           <span className="tooltip-text">{tooltipText}</span>
                        </span>
                    )}
                </span>
                <span className="font-mono text-gray-100 text-right">{parts[1].trim()}</span>
            </div>
        )
      }
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={i} className="mb-2 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-cyan-400">
            {line.substring(2)}
        </li>
      );
    } else if (line.trim().startsWith('**Guidance:**')) {
      elements.push(<p key={i} className="mt-4 text-cyan-200/80 italic bg-gray-800/40 p-3 rounded-md border-l-4 border-cyan-500">{line.replace('**Guidance:**', '').trim()}</p>);
    } else if(line.trim() !== '') {
      elements.push(<p key={i} className="my-2">{line}</p>);
    }
  }

  return elements;
};


const ReportDisplay: React.FC<ReportDisplayProps> = ({ analysisResult, onReanalyze, isLoading, chatHistory, onSendMessage, isChatLoading }) => {
  const reportContentRef = useRef<HTMLDivElement>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const { markdownReport, chartData, suggestedQuestions } = analysisResult;

  const handleExportMd = () => {
    exportAsMarkdown(markdownReport);
  };

  const handleExportPdf = async () => {
    if (!reportContentRef.current) return;
    setIsPdfLoading(true);
    // Add a small delay to allow UI to update before the heavy PDF generation task
    setTimeout(async () => {
        await exportAsPdf(reportContentRef.current);
        setIsPdfLoading(false);
    }, 100);
  };

  return (
    <div className="font-sans text-gray-300 leading-relaxed max-w-4xl mx-auto animate-fade-in h-full flex flex-col">
        <div className="flex-shrink-0">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-100 mb-2 font-sans">Performance Report</h1>
                    <p className="text-gray-500 text-sm">Generated by DeepDive AI</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportMd}
                        title="Export as Markdown"
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-4 rounded-lg flex items-center transition-all duration-300"
                    >
                        <DownloadIcon className="h-5 w-5 mr-2" />
                        MD
                    </button>
                     <button
                        onClick={handleExportPdf}
                        disabled={isPdfLoading}
                        title="Export as PDF"
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-4 rounded-lg flex items-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPdfLoading ? (
                            <>
                                <BrainCircuitIcon className="h-5 w-5 mr-2 animate-spin" />
                                PDF...
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="h-5 w-5 mr-2" />
                                PDF
                            </>
                        )}
                    </button>
                    {onReanalyze && (
                        <button
                            onClick={onReanalyze}
                            disabled={isLoading}
                            className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-4 rounded-lg flex items-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <BrainCircuitIcon className="h-5 w-5 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <RefreshIcon className="h-5 w-5 mr-2" />
                                    Re-analyze
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
            <div ref={reportContentRef} className="bg-gray-900/0 p-1">
              {renderMarkdownBlocks(markdownReport, chartData)}
            </div>
        </div>

        {onSendMessage && chatHistory && (
          <>
            <div className="mt-10 mb-6 border-t-2 border-gray-700/80"></div>
            <div className="flex-grow flex flex-col min-h-0">
                <ChatInterface 
                    messages={chatHistory} 
                    onSendMessage={onSendMessage} 
                    isLoading={isChatLoading || false}
                    suggestedQuestions={suggestedQuestions}
                />
            </div>
          </>
        )}
    </div>
  );
};

// Add a simple fade-in animation
const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
`;
document.head.appendChild(style);


export default ReportDisplay;