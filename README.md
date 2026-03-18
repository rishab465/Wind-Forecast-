# Wind Forecast Monitoring

A small full‑stack app to compare actual vs forecast wind‑related series with horizon‑based error analysis.

The repository also includes an exploratory analysis notebook (WindForecastAnalysis.ipynb) that documents data understanding, checks, and prototype visualisations used while designing the app.

## Tech Stack
- Backend: Node.js, Express
- Frontend: React + Vite, Recharts

## Local Development
1. Install dependencies:
   - `cd backend && npm install`
   - `cd ../frontend && npm install`
2. Start backend:
   - `cd backend && npm run dev` (defaults to port 4000)
3. Start frontend:
   - `cd frontend && npm run dev` (defaults to port 5173)

The Vite dev server proxies `/api` to the backend.

## Deployment
- **Frontend (Vercel)**: deploy the `frontend` folder, build with `npm run build` and output `dist`.
- **Backend (Render/Heroku)**: deploy the `backend` folder; it exposes `/api` and `/health`.
- Configure the frontend with the backend URL via environment variable:
   - `VITE_API_BASE_URL=https://your-backend-url` (e.g. Render or Heroku app URL).

## Analysis Notebook
- WindForecastAnalysis.ipynb: Google Colab–style notebook showing data exploration, cleaning steps, and example plots that informed the final dashboard.
