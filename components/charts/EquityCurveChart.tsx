import React, { memo } from 'react';
import { EquityCurveDataPoint } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface EquityCurveChartProps {
  data: EquityCurveDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const formattedValue = typeof value === 'number' ? value.toFixed(2) : 'N/A';
    
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 p-3 rounded-md shadow-lg text-sm">
        <p className="label font-semibold text-gray-200">{`Trade #${label}`}</p>
        <p className="intro text-cyan-400">{`Cumulative PnL: ${formattedValue}`}</p>
      </div>
    );
  }
  return null;
};

const EquityCurveChart: React.FC<EquityCurveChartProps> = ({ data }) => {

  return (
    <div style={{ width: '100%', height: 300 }} className="my-6 font-sans">
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: -10,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
          <XAxis dataKey="tradeNumber" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
          <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#a1a1aa', strokeWidth: 1, strokeDasharray: '3 3' }}/>
          <ReferenceLine y={0} stroke="#a1a1aa" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="cumulativePnl" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorPnl)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default memo(EquityCurveChart);
