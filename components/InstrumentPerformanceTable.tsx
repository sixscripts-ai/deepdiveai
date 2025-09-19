import React, { useState, useMemo, memo } from 'react';
import { InstrumentPerformanceData } from '../types';
import { ArrowUpIcon, ArrowDownIcon } from './icons/Icons';

type SortKey = keyof InstrumentPerformanceData;
type SortDirection = 'asc' | 'desc';

interface InstrumentPerformanceTableProps {
    data: InstrumentPerformanceData[];
}

const SortableHeader: React.FC<{
    label: string;
    sortKey: SortKey;
    currentSortKey: SortKey;
    sortDirection: SortDirection;
    onSort: (key: SortKey) => void;
}> = ({ label, sortKey, currentSortKey, sortDirection, onSort }) => {
    const isCurrentKey = currentSortKey === sortKey;
    return (
        <th 
            className="p-3 text-sm font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition-colors"
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-2">
                {label}
                {isCurrentKey && (
                    sortDirection === 'asc' 
                    ? <ArrowUpIcon className="h-4 w-4" /> 
                    : <ArrowDownIcon className="h-4 w-4" />
                )}
            </div>
        </th>
    );
};

const InstrumentPerformanceTable: React.FC<InstrumentPerformanceTableProps> = ({ data }) => {
    const [sortKey, setSortKey] = useState<SortKey>('netPnl');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    };

    const sortedData = useMemo(() => {
        const sorted = [...data].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return aVal.localeCompare(bVal);
            }
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
            return 0;
        });
        return sortDirection === 'asc' ? sorted : sorted.reverse();
    }, [data, sortKey, sortDirection]);

    const formatPnl = (pnl: number) => {
        const color = pnl > 0 ? 'text-green-400' : pnl < 0 ? 'text-red-400' : 'text-gray-300';
        return <span className={color}>{pnl.toFixed(2)}</span>;
    };

    const formatNumber = (value: any, decimals: number = 2): string => {
        if (value === null || value === undefined) return 'N/A';
        const num = typeof value === 'number' ? value : parseFloat(value);
        return isNaN(num) ? 'N/A' : num.toFixed(decimals);
    };

    return (
        <div className="overflow-x-auto my-6 rounded-lg border border-gray-700/50">
            <table className="w-full text-left">
                <thead className="bg-gray-800/60">
                    <tr>
                        <SortableHeader label="Instrument" sortKey="instrument" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Net PnL" sortKey="netPnl" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Win Rate (%)" sortKey="winRate" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Total Trades" sortKey="totalTrades" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Profit Factor" sortKey="profitFactor" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, index) => (
                        <tr key={index} className="border-t border-gray-800/80 hover:bg-gray-800/40">
                            <td className="p-3 text-sm font-medium text-gray-100">{row.instrument}</td>
                            <td className="p-3 text-sm font-mono">{formatPnl(row.netPnl)}</td>
                            <td className="p-3 text-sm text-gray-300">{formatNumber(row.winRate)}%</td>
                            <td className="p-3 text-sm text-gray-300">{row.totalTrades || 0}</td>
                            <td className="p-3 text-sm text-gray-300">{formatNumber(row.profitFactor)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default memo(InstrumentPerformanceTable);
