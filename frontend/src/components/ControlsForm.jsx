import React from 'react';

/**
 * ControlsForm renders the filter controls:
 * - Start time
 * - End time
 * - Forecast horizon (0–48 hours)
 */
function ControlsForm({
  start,
  end,
  horizon,
  minTime,
  maxTime,
  onChangeStart,
  onChangeEnd,
  onChangeHorizon,
  onSubmit,
  loading
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="controls-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Start time (UTC)
          <input
            type="datetime-local"
            value={start}
            min={minTime}
            max={maxTime}
            onChange={(e) => onChangeStart(e.target.value)}
          />
        </label>
        <label>
          End time (UTC)
          <input
            type="datetime-local"
            value={end}
            min={minTime}
            max={maxTime}
            onChange={(e) => onChangeEnd(e.target.value)}
          />
        </label>
      </div>

      <div className="form-row">
        <label>
          Horizon (hours)
          <input
            type="number"
            min={0}
            max={48}
            step={1}
            value={horizon}
            onChange={(e) => onChangeHorizon(Number(e.target.value))}
          />
        </label>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Loading…' : 'Apply Filters'}
      </button>
    </form>
  );
}

export default ControlsForm;
