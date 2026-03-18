// Basic configuration constants for the BMRS (Elexon) APIs

module.exports = {
  PORT: process.env.PORT || 4000,

  // BMRS JSON API base URL (as per your sample)
  BMRS_BASE_URL: 'https://data.elexon.co.uk/bmrs/api/v1',

  // Datasets used in this application
  DATASETS: {
    ACTUAL: 'FUELHH',   // Half-hourly generation outturn by fuel type
    FORECAST: 'WINDFOR' // Wind generation forecast
  },

  // Only use data from January 2025 onwards
  MIN_DATA_DATE_UTC: new Date('2025-01-01T00:00:00Z')
};
