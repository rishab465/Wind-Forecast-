import React from 'react';

/**
 * MetricsPanel shows summary metrics like MAE, max/min error and point count,
 * plus optional multi-horizon comparison, data-availability warning and insight text.
 */
function MetricsPanel({ mae, maxError, minError, count, horizon, horizonMetrics, insight, forecastMissingInfo }) {
  const horizons = horizonMetrics ? Object.keys(horizonMetrics).map(Number).sort((a, b) => a - b) : [];

  return (
    <div className="metrics-panel">
      <div className="metric-item">
        <span className="metric-label">Forecast horizon:</span>
        <span className="metric-value">{horizon} hours</span>
      </div>
      <div className="metric-item">
        <span className="metric-label">Data points:</span>
        <span className="metric-value">{count}</span>
      </div>
      <div className="metric-item">
        <span className="metric-label">Mean Absolute Error (MAE):</span>
        <span className="metric-value">
          {mae == null ? 'N/A' : mae.toFixed(2)}
        </span>
      </div>
      <div className="metric-item">
        <span className="metric-label">Max error (actual - forecast):</span>
        <span className="metric-value">
          {maxError == null ? 'N/A' : maxError.toFixed(2)}
        </span>
      </div>
      <div className="metric-item">
        <span className="metric-label">Min error (actual - forecast):</span>
        <span className="metric-value">
          {minError == null ? 'N/A' : minError.toFixed(2)}
        </span>
      </div>

      {forecastMissingInfo && forecastMissingInfo.totalCount !== 0 && (
        (() => {
          const missing = forecastMissingInfo.missingCount;
          const total = forecastMissingInfo.totalCount;
          const ratio = total > 0 ? missing / total : 0;

          if (ratio > 0.3) {
            return (
              <div className="metric-item warning-box">
                <span className="metric-label">Note:</span>
                <span className="metric-value">
                  Some forecast values are unavailable for the selected horizon due to data
                  constraints.
                </span>
              </div>
            );
          }
          return null;
        })()
      )}

      {horizons.length > 0 && (
        <div className="metric-item metric-table">
          <span className="metric-label">MAE by horizon:</span>
          <table>
            <thead>
              <tr>
                <th>Horizon (h)</th>
                <th>Points</th>
                <th>MAE</th>
              </tr>
            </thead>
            <tbody>
              {horizons.map((h) => {
                const m = horizonMetrics[h] || {};
                return (
                  <tr key={h}>
                    <td>{h}</td>
                    <td>{m.count ?? '—'}</td>
                    <td>{m.mae == null ? 'N/A' : m.mae.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {insight && (
        <div className="metric-item insight-box">
          <span className="metric-label">Insight:</span>
          <span className="metric-value">{insight}</span>
        </div>
      )}
    </div>
  );
}

export default MetricsPanel;
