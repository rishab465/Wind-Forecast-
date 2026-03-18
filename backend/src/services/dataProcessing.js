const { MIN_DATA_DATE_UTC } = require('../config/config');

function clampToDataWindow(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const min = MIN_DATA_DATE_UTC;

  const clampedStart = start < min ? min : start;
  return { start: clampedStart, end };
}

/**
 * Build a map of ACTUAL wind generation values keyed by ISO timestamp.
 *
 * BMRS FUELHH fields used:
 * - startTime (UTC timestamp)
 * - generation (MW)
 */
function buildActualMap(actualRecords, startDate, endDate) {
  const { start, end } = clampToDataWindow(startDate, endDate);

  const map = new Map();

  for (const row of actualRecords) {
    if (!row.startTime || row.generation == null) continue;

    const t = new Date(row.startTime);
    if (Number.isNaN(t.getTime())) continue;

    if (t < start || t > end) continue;

    const key = t.toISOString();
    map.set(key, {
      time: t,
      actual: Number(row.generation)
    });
  }

  return map;
}

/**
 * Group forecast rows by their target datetime.
 *
 * BMRS WINDFOR fields used (assumed):
 * - startTime (target time, UTC)
 * - publishTime (publish time, UTC)
 * - generation (MW)
 */
function groupForecastsByTarget(forecastRecords, startDate, endDate) {
  const { start, end } = clampToDataWindow(startDate, endDate);

  const groups = new Map();

  for (const row of forecastRecords) {
    if (!row.startTime || !row.publishTime || row.generation == null) {
      continue;
    }

    const target = new Date(row.startTime);
    const publish = new Date(row.publishTime);

    if (Number.isNaN(target.getTime()) || Number.isNaN(publish.getTime())) {
      continue;
    }

    // Ignore forecasts that are published after the target time (negative horizon),
    // since they are not valid predictions for that delivery period.
    if (publish > target) {
      continue;
    }

    if (target < start || target > end) continue;

    const targetKey = target.toISOString();

    if (!groups.has(targetKey)) {
      groups.set(targetKey, []);
    }

    const horizonHours = (target.getTime() - publish.getTime()) / (60 * 60 * 1000);

    groups.get(targetKey).push({
      targetTime: target,
      publishTime: publish,
      horizonHours,
      forecast: Number(row.generation)
    });
  }

  return groups;
}

/**
 * Given all forecasts for a target time, select the one that matches the requested horizon.
 *
 * Primary rule:
 *  - publishTime <= T - horizon
 *  - among those, pick the latest publishTime (closest to T).
 *
 * Fallback:
 *  - if no forecast satisfies the rule, fall back to the closest earlier
 *    publishTime (if any), while logging that a fallback was used.
 */
function selectForecastForHorizon(forecastEntries, requestedHorizonHours, debugKey) {
  if (!forecastEntries || forecastEntries.length === 0) return null;

  const targetTime = forecastEntries[0].targetTime;
  const cutoff = new Date(targetTime.getTime() - requestedHorizonHours * 60 * 60 * 1000);

  // Apply the formal rule: publishTime <= T - horizon.
  const primaryCandidates = forecastEntries.filter(entry => entry.publishTime <= cutoff);

  let chosen = null;
  let fallbackUsed = false;

  if (primaryCandidates.length > 0) {
    // Pick the latest publishTime among valid candidates.
    primaryCandidates.sort((a, b) => a.publishTime - b.publishTime);
    chosen = primaryCandidates[primaryCandidates.length - 1];
  } else {
    // Fallback: choose the closest earlier publishTime (<= targetTime), if any.
    const earlier = forecastEntries.filter(entry => entry.publishTime <= targetTime);
    if (earlier.length > 0) {
      earlier.sort((a, b) => a.publishTime - b.publishTime);
      chosen = earlier[earlier.length - 1];
      fallbackUsed = true;
    }
  }

  if (!chosen) {
    if (process.env.DEBUG_HORIZON === '1') {
      console.debug('[horizon-debug] no forecast candidate (even with fallback)', {
        key: debugKey,
        targetTime: targetTime.toISOString(),
        horizonHours: requestedHorizonHours
      });
    }
    return null;
  }

  if (process.env.DEBUG_HORIZON === '1') {
    console.debug('[horizon-debug] selected forecast', {
      key: debugKey,
      targetTime: targetTime.toISOString(),
      horizonHours: requestedHorizonHours,
      publishTime: chosen.publishTime.toISOString(),
      effectiveHorizonHours:
        (targetTime.getTime() - chosen.publishTime.getTime()) / (60 * 60 * 1000),
      fallbackUsed
    });
  }

  return chosen;
}

/**
 * Build the merged time series for given horizon.
 */
function buildTimeSeries(actualMap, forecastGroups, horizonHours) {
  const allKeys = new Set([
    ...Array.from(actualMap.keys()),
    ...Array.from(forecastGroups.keys())
  ]);

  const sortedKeys = Array.from(allKeys).sort();

  const series = [];

  for (const key of sortedKeys) {
    const actualEntry = actualMap.get(key) || null;
    const forecastEntries = forecastGroups.get(key) || null;

    const selectedForecast = forecastEntries
      ? selectForecastForHorizon(forecastEntries, horizonHours, key)
      : null;

    if (!actualEntry && !selectedForecast) {
      continue;
    }

    const time = actualEntry?.time || selectedForecast?.targetTime;
    const actual = actualEntry ? actualEntry.actual : null;
    const forecast = selectedForecast ? selectedForecast.forecast : null;

    let error = null;
    if (actual != null && forecast != null) {
      // Error is defined as actual - forecast.
      error = actual - forecast;

      if (process.env.DEBUG_HORIZON === '1') {
        console.debug('[horizon-debug] pair', {
          time: time.toISOString(),
          actual,
          forecast,
          error
        });
      }
    }

    series.push({
      time: time.toISOString(),
      actual,
      forecast,
      error
    });
  }

  return series;
}

/**
 * Compute basic error metrics (MAE, max, min) for a series.
 */
function computeErrorMetrics(series) {
  const errors = series
    .map(p => (p.error != null ? Math.abs(p.error) : null))
    .filter(v => v != null && !Number.isNaN(v));

  if (errors.length === 0) {
    return {
      mae: null,
      maxError: null,
      minError: null
    };
  }

  const sumAbs = errors.reduce((sum, v) => sum + v, 0);
  const mae = sumAbs / errors.length;
  const maxError = Math.max(...errors);
  const minError = Math.min(...errors);

  return {
    mae,
    maxError,
    minError
  };
}

module.exports = {
  buildActualMap,
  groupForecastsByTarget,
  selectForecastForHorizon,
  buildTimeSeries,
  computeErrorMetrics
};
