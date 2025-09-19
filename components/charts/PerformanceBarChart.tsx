import React, { memo } from 'react';
import { TimeOfDayData, WeekdayData } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PerformanceBarChartProps {
  data: (TimeOfDayData | WeekdayData)[];
  dataKey: 'hour' | 'weekday';
  barColor: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const formattedValue = typeof value === 'number' ? value.toFixed(2) : 'N/A';
    const tradeCount = payload[0].payload.tradeCount || 0;
    
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 p-3 rounded-md shadow-lg text-sm">
        <p className="label font-semibold text-gray-200">{`${label}`}</p>
        <p className="intro text-cyan-400">{`Net PnL: ${formattedValue}`}</p>
        <p className="desc text-gray-400">{`Trade Count: ${tradeCount}`}</p>
      </div>
    );
  }
  return null;
};

const PerformanceBarChart: React.FC<PerformanceBarChartProps> = ({ data, dataKey }) => {

  return (
    <div style={{ width: '100%', height: 300 }} className="my-6 font-sans">
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: -10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
          <XAxis dataKey={dataKey} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
          <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}/>
          <Bar dataKey="pnl">
            {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22d3ee' : '#f59e0b'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default memo(PerformanceBarChart);
