import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export const RiskChart = ({ data = [] }) => {
  // Format data
  const chartData = data.map((d, index) => ({
    time: d.time || `T-${index}`,
    risk: Number(d.risk ?? d.risk_score ?? d.riskScore ?? 18),
    event: d.event || d.event_type || 'Security Evaluation',
    level: d.level || (d.risk >= 81 ? 'CRITICAL' : d.risk >= 61 ? 'HIGH' : d.risk >= 31 ? 'MEDIUM' : 'LOW'),
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '10px 14px',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.time}</div>
          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#FFFFFF', marginTop: '2px' }}>
            {p.event}
          </div>
          <div style={{ fontSize: '0.8rem', color: p.risk >= 61 ? 'var(--color-purple)' : p.risk >= 31 ? 'var(--color-orange)' : 'var(--color-green)', marginTop: '4px' }}>
            Risk Score: <strong>{p.risk}</strong> / 100 ({p.level})
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '240px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} />
          <YAxis domain={[0, 100]} stroke="#64748B" fontSize={11} tickLine={false} ticks={[0, 30, 60, 80, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={30} stroke="rgba(34, 197, 94, 0.3)" strokeDasharray="2 2" />
          <ReferenceLine y={60} stroke="rgba(245, 158, 11, 0.3)" strokeDasharray="2 2" />
          <ReferenceLine y={80} stroke="rgba(239, 68, 68, 0.4)" strokeDasharray="2 2" />
          <Line
            type="monotone"
            dataKey="risk"
            stroke="#A855F7"
            strokeWidth={3}
            dot={{ r: 4, fill: '#A855F7', strokeWidth: 1, stroke: '#FFFFFF' }}
            activeDot={{ r: 6, fill: '#EF4444' }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RiskChart;
