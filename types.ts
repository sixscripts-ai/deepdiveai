export interface UploadedFile {
    id: string;
    name: string;
    type: string;
    content: string; // File content as text or base64 encoded string
    isBinary: boolean;
}

export enum FileType {
    CSV = 'csv',
    JSON = 'json',
    Excel = 'excel',
    Sheets = 'sheets',
    PDF = 'pdf',
    SQL = 'sql',
    Other = 'other',
}

export type ChatRole = 'user' | 'model';

export interface ChatMessage { 
    role: ChatRole; 
    text: string; 
}

// Data structures for charts
export interface TimeOfDayData {
    hour: string;
    pnl: number;
    tradeCount: number;
}

export interface WeekdayData {
    weekday: string;
    pnl: number;
    tradeCount: number;
}

export interface EquityCurveDataPoint {
    tradeNumber: number;
    cumulativePnl: number;
}

export interface InstrumentPerformanceData {
    instrument: string;
    netPnl: number;
    winRate: number;
    totalTrades: number;
    profitFactor: number;
}

export interface ChartData {
    timeOfDay: TimeOfDayData[];
    weekday: WeekdayData[];
    equityCurve: EquityCurveDataPoint[];
    instrumentPerformance: InstrumentPerformanceData[];
}

// The comprehensive result from the analysis
export interface AnalysisResult {
    markdownReport: string;
    chartData: ChartData | null;
    suggestedQuestions: string[];
}