const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { PORT } = require('./config/config');
const dataRoutes = require('./routes/dataRoutes');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api', dataRoutes);

// Global error handler fallback (in case any middleware throws)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Unexpected server error' });
});

app.listen(PORT, () => {
  console.log(`Wind Forecast Monitoring backend listening on port ${PORT}`);
});
