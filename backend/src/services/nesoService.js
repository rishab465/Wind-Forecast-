const axios = require('axios');
const { BMRS_BASE_URL, DATASETS, MIN_DATA_DATE_UTC } = require('../config/config');

function formatDateYYYYMMDD(date) {
  const d = new Date(date.getTime());
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractRecords(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

/**
 * Fetch ACTUAL wind generation (FUELHH) for the given window.
 * - Filters by fuelType = WIND
 * - Uses settlementDateFrom/To based on start/end.
 */
async function fetchActualRecords(startDate, endDate) {
  const url = `${BMRS_BASE_URL}/datasets/${DATASETS.ACTUAL}/stream`;

  const settlementDateFrom = formatDateYYYYMMDD(
    new Date(Math.max(startDate.getTime(), MIN_DATA_DATE_UTC.getTime()))
  );
  const settlementDateTo = formatDateYYYYMMDD(endDate);

  const response = await axios.get(url, {
    headers: { Accept: 'application/json' },
    params: {
      settlementDateFrom,
      settlementDateTo,
      fuelType: 'WIND'
    }
  });

  return extractRecords(response.data);
}

/**
 * Fetch wind generation forecasts (WINDFOR) for the given window.
 *
 * To support horizons up to 48 hours, we include forecasts published
 * from (start - 48h) to end.
 */
async function fetchForecastRecords(startDate, endDate) {
  const url = `${BMRS_BASE_URL}/datasets/${DATASETS.FORECAST}/stream`;

  const publishFrom = new Date(
    Math.max(startDate.getTime() - 48 * 60 * 60 * 1000, MIN_DATA_DATE_UTC.getTime())
  );
  const publishTo = endDate;

  const response = await axios.get(url, {
    headers: { Accept: 'application/json' },
    params: {
      publishDateTimeFrom: publishFrom.toISOString(),
      publishDateTimeTo: publishTo.toISOString()
    }
  });

  return extractRecords(response.data);
}

module.exports = {
  fetchActualRecords,
  fetchForecastRecords
};
