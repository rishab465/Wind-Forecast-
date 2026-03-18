const express = require('express');
const router = express.Router();

const { fetchActualRecords, fetchForecastRecords } = require('../services/nesoService');
const {
  buildActualMap,
  groupForecastsByTarget,
  buildTimeSeries,
  computeErrorMetrics
} = require('../services/dataProcessing');

/**
 * GET /api/data
 *
 * Query params:
 * - start: ISO date-time string (UTC)
 * - end: ISO date-time string (UTC)
 * - horizon: integer hours (0–48)
 */
router.get('/data', async (req, res) => {
  try {
    const { start, end, horizon } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        error: 'Missing required query parameters: start, end'
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date format' });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'end must be after start' });
    }

    let horizonHours = 0;
    if (horizon !== undefined) {
      const parsed = parseInt(horizon, 10);
      if (!Number.isNaN(parsed)) {
        horizonHours = Math.min(Math.max(parsed, 0), 48);
      }
    }

    // Fetch raw datasets in parallel, constrained by the publish time window.
    const [actualRaw, forecastRaw] = await Promise.all([
      fetchActualRecords(startDate, endDate),
      fetchForecastRecords(startDate, endDate)
    ]);

    // Build structures for processing.
    const actualMap = buildActualMap(actualRaw, startDate, endDate);
    const forecastGroups = groupForecastsByTarget(forecastRaw, startDate, endDate);

    const series = buildTimeSeries(actualMap, forecastGroups, horizonHours);
    const { mae, maxError, minError } = computeErrorMetrics(series);

    const totalCount = series.length;
    const missingForecastCount = series.filter(p => p.forecast == null).length;
    const forecastMissingRatio = totalCount > 0 ? missingForecastCount / totalCount : 0;

    // Debug logging to help verify that forecast data is present and numeric.
    if (process.env.DEBUG_HORIZON === '1') {
      const validForecastPoints = series.filter(p => p.forecast != null);
      const samplePair = validForecastPoints.find(
        p => p.actual != null && p.forecast != null
      );

      console.log('[data-debug] /api/data summary', {
        horizonHours,
        totalPoints: totalCount,
        validForecastPoints: validForecastPoints.length,
        missingForecastPoints: missingForecastCount,
        forecastMissingRatio
      });

      if (samplePair) {
        console.log('[data-debug] example matched point', {
          time: samplePair.time,
          actual: samplePair.actual,
          forecast: samplePair.forecast,
          types: {
            actual: typeof samplePair.actual,
            forecast: typeof samplePair.forecast
          }
        });
      } else {
        console.log('[data-debug] no point with both actual and forecast for this request');
      }
    }

    return res.json({
      horizonHours,
      count: totalCount,
      mae,
      maxError,
      minError,
      forecastMissingCount: missingForecastCount,
      forecastMissingRatio,
      data: series
    });
  } catch (err) {
    console.error('Error in /api/data:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
