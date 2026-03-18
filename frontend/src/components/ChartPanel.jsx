import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// Custom tooltip to display actual, forecast and error for each point.
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="tooltip-box">
      <div className="tooltip-title">{label}</div>
      <div>Actual: {point.actual?.toFixed?.(0) ?? point.actual}</div>
      <div>Forecast: {point.forecast?.toFixed?.(0) ?? point.forecast}</div>
      <div>Error (actual - forecast): {point.error?.toFixed?.(0) ?? point.error}</div>
    </div>
  );
};

/**
 * ChartPanel renders the Actual vs Forecast line chart using Recharts.
 */
function ChartPanel({ data, loading }) {
  if (loading) {
    return <div className="chart-placeholder">Loading chart data…</div>;
  }

  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No data available for selected filters.</div>;
  }

  // Map time into a more compact label for the axis.
  const totalPoints = data.length;
  const forecastPoints = data.filter((d) => d.forecast != null).length;

  // Frontend debug logging to verify what the chart receives.
  // This helps confirm that forecast values are present and numeric.
  // eslint-disable-next-line no-console
  console.log('[chart-debug] data summary', {
    totalPoints,
    forecastPoints,
    sample: data.slice(0, 5)
  });

  const chartData = data.map((d) => ({
    ...d,
    timeLabel: new Date(d.time).toLocaleString('en-GB', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }));

  const hasForecast = forecastPoints > 0;
  const connectForecastNulls = hasForecast && forecastPoints <= 3;

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timeLabel" angle={-45} textAnchor="end" height={70} />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#60a5fa"
            strokeOpacity={0.9}
            dot={false}
            strokeWidth={2}
            connectNulls={false}
            name="Actual"
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#f97316"
            strokeOpacity={1}
            dot
            activeDot
            strokeWidth={4}
            connectNulls={connectForecastNulls}
            name="Forecast"
          />
        </LineChart>
      </ResponsiveContainer>

      {!hasForecast && (
        <div className="chart-placeholder" style={{ marginTop: '0.75rem' }}>
          No forecast data available for selected horizon.
        </div>
      )}

      <div className="error-chart">
        <div className="error-chart-title">Error (actual - forecast)</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="timeLabel" hide />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="error" fill="#f97316" name="Error" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ChartPanel;
