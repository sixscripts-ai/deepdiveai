import React from 'react';
import { TimeOfDayData, WeekdayData } from '../../types';

// Since we are loading Recharts from a CDN, we need to declare the components we use
// for TypeScript to recognize them, as they will be globally available at runtime on the `Recharts` object.
declare const Recharts: any;

interface PerformanceBarChartProps {
  data: (TimeOfDayData | WeekdayData)[];
  dataKey: 'hour' | 'weekday';
  barColor: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 p-3 rounded-md shadow-lg text-sm">
        <p className="label font-semibold text-gray-200">{`${label}`}</p>
        <p className="intro text-cyan-400">{`Net PnL: ${payload[0].value.toFixed(2)}`}</p>
        <p className="desc text-gray-400">{`Trade Count: ${payload[0].payload.tradeCount}`}</p>
      </div>
    );
  }
  return null;
};

const PerformanceBarChart: React.FC<PerformanceBarChartProps> = ({ data, dataKey }) => {
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = Recharts;

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

export default PerformanceBarChart;
