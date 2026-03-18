import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ControlsForm from './components/ControlsForm.jsx';
import ChartPanel from './components/ChartPanel.jsx';
import MetricsPanel from './components/MetricsPanel.jsx';

const DEFAULT_HORIZON = 1; // hours (displayed)
const COMPARISON_HORIZONS = [0, 4, 8, 12, 24];
const MIN_PICKER_DATE = new Date('2025-01-01T00:00:00Z');

// Base URL for the backend API.
// In development, Vite proxies "/api" to the local backend so this can stay empty.
// In production (Vercel), set VITE_API_BASE_URL to your deployed backend URL
// (for example: "https://your-heroku-app.herokuapp.com").
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper to format Date to ISO string without milliseconds for inputs (UTC based)
function toInputValue(date) {
  if (!date) return '';
  const iso = date.toISOString();
  return iso.substring(0, 16); // "YYYY-MM-DDTHH:MM" (interpreted as UTC)
}

// Parse a datetime-local string ("YYYY-MM-DDTHH:MM") as a UTC instant
// so that values entered in the picker correspond directly to NESO's UTC times.
function datetimeLocalToUtcIso(value) {
  if (!value) return null;
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  const d = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return d.toISOString();
}

function App() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);

  const [data, setData] = useState([]);
  const [mae, setMae] = useState(null);
  const [maxError, setMaxError] = useState(null);
  const [minError, setMinError] = useState(null);
  const [horizonMetrics, setHorizonMetrics] = useState({});
  const [insight, setInsight] = useState('');
  const [forecastMissingInfo, setForecastMissingInfo] = useState(null);
  const [maxPickerDate, setMaxPickerDate] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialise default time window to a known period
  // where both actual and forecast BMRS data exist.
  useEffect(() => {
    const startDate = new Date('2025-01-01T00:00:00Z');
    const endDate = new Date('2025-01-02T00:00:00Z');
    setStart(toInputValue(startDate));
    setEnd(toInputValue(endDate));

    // Limit calendar to the range where the app is intended
    // to provide meaningful comparisons: from MIN_PICKER_DATE
    // up to "now" (no future dates where actuals are unavailable).
    setMaxPickerDate(new Date());
  }, []);

  const fetchData = async (overrideParams) => {
    const startValue = overrideParams?.start ?? start;
    const endValue = overrideParams?.end ?? end;
    const horizonValue = overrideParams?.horizon ?? horizon;

    if (!startValue || !endValue) {
      setError('Start and end time are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = {
        start: datetimeLocalToUtcIso(startValue),
        end: datetimeLocalToUtcIso(endValue),
        horizon: horizonValue
      };

      const response = await axios.get(`${API_BASE_URL}/api/data`, { params });
      setData(response.data.data || []);
      setMae(
        response.data.mae ??
          (response.data.metrics && response.data.metrics.mae) ??
          null
      );
      setMaxError(
        response.data.maxError ??
          (response.data.metrics && response.data.metrics.maxError) ??
          null
      );
      setMinError(
        response.data.minError ??
          (response.data.metrics && response.data.metrics.minError) ??
          null
      );

      const missingCount = response.data.forecastMissingCount ?? 0;
      const totalCount = response.data.count ?? (response.data.data || []).length;
      setForecastMissingInfo({ missingCount, totalCount });

      // Also compute MAE for a fixed set of comparison horizons
      // to support multi-horizon analysis in the UI.
      const horizonResults = {};
      for (const h of COMPARISON_HORIZONS) {
        try {
          const cmpResp = await axios.get(`${API_BASE_URL}/api/data`, {
            params: { ...params, horizon: h }
          });
          horizonResults[h] = {
            mae:
              cmpResp.data.mae ??
              (cmpResp.data.metrics && cmpResp.data.metrics.mae) ??
              null,
            count: (cmpResp.data.data || []).length
          };
        } catch (cmpErr) {
          console.error('Failed to fetch comparison horizon', h, cmpErr);
        }
      }

      setHorizonMetrics(horizonResults);

      // Derive a simple insight from the MAEs.
      const valid = Object.entries(horizonResults)
        .filter(([_, v]) => v.mae != null && Number.isFinite(v.mae))
        .map(([h, v]) => ({ horizon: Number(h), mae: v.mae }));

      if (valid.length > 1) {
        valid.sort((a, b) => a.horizon - b.horizon);
        const best = valid.reduce((min, cur) => (cur.mae < min.mae ? cur : min));
        const worst = valid.reduce((max, cur) => (cur.mae > max.mae ? cur : max));

        if (worst.horizon > best.horizon && worst.mae > best.mae * 1.1) {
          setInsight(
            `Forecast error increases with horizon: best MAE at ${best.horizon}h, ` +
              `worst at ${worst.horizon}h.`
          );
        } else {
          setInsight(
            `Forecast accuracy is relatively stable across horizons; best MAE at ${best.horizon}h.`
          );
        }
      } else {
        setInsight('');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch data');
      setData([]);
      setMae(null);
      setMaxError(null);
      setMinError(null);
      setForecastMissingInfo(null);
      setHorizonMetrics({});
      setInsight('');
    } finally {
      setLoading(false);
    }
  };

  // Trigger initial fetch when defaults are set.
  useEffect(() => {
    if (start && end) {
      fetchData({ start, end, horizon });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Wind Forecast Monitoring</h1>
        <p>Compare actual vs forecast wind-related series with horizon-based error analysis.</p>
      </header>

      <main className="app-main">
        <section className="controls-section">
          <ControlsForm
            start={start}
            end={end}
            horizon={horizon}
            minTime={toInputValue(MIN_PICKER_DATE)}
            maxTime={toInputValue(maxPickerDate)}
            onChangeStart={setStart}
            onChangeEnd={setEnd}
            onChangeHorizon={setHorizon}
            onSubmit={() => fetchData()}
            loading={loading}
          />
          <MetricsPanel
            mae={mae}
            maxError={maxError}
            minError={minError}
            count={data.length}
            horizon={horizon}
            horizonMetrics={horizonMetrics}
            insight={insight}
            forecastMissingInfo={forecastMissingInfo}
          />
          {error && <div className="error-message">{error}</div>}
        </section>

        <section className="chart-section">
          <ChartPanel data={data} loading={loading} />
        </section>
      </main>
    </div>
  );
}

export default App;
