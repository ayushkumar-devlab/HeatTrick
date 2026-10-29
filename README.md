# HeatTrick

A heat and humidity explorer for Indian cities, built as a research and learning project.

A thermometer reading only says so much. At 38°C with high humidity the body struggles far more than it does in dry air at the same temperature, and what counts as a heatwave depends on where you are. HeatTrick puts the forecast, the heatwave thresholds and a few thermal-stress indicators side by side so the numbers are easier to interpret.

Live site: https://heat-trick.vercel.app/

HeatTrick is not an official warning service. For forecasts and advisories you can act on, use the [India Meteorological Department (IMD)](https://mausam.imd.gov.in/) and the [National Disaster Management Authority (NDMA)](https://ndma.gov.in/).

---

## Why I built it

I got interested in how heatwave warnings work in India and how little a plain temperature tells you about heat stress. Showing a number wasn't enough for me. I wanted to see how it compares with the thresholds, and what temperature and humidity together do to the body.

Right now the app:

- shows current weather and a seven-day forecast for a chosen location
- compares forecast highs with basic heatwave thresholds
- estimates heat indicators from temperature and humidity
- explains the assumptions behind each result

It is unfinished. The basics work, and the more ambitious research ideas are still on the list at the bottom.

## What's in the app

**Overview.** Current temperature, forecast high and low, and a seven-day chart, with the forecast set against the threshold for that region.

**Heatwave Analysis.** Forecast temperatures checked against these baseline thresholds:

| Region | Threshold |
|---|---:|
| Plains | 40°C |
| Coastal areas | 37°C |
| Hilly regions | 30°C |

Treat this as a rough guide, not a classification. IMD also looks at how far a day departs from the local climatological normal, and this version doesn't calculate that.

**Thermal Stress.** From air temperature and relative humidity the app works out:

- NOAA Heat Index, which is how hot it feels once humidity is included
- wet-bulb temperature, using the Stull approximation
- a WBGT estimate for shade, with no solar radiation
- dew point

These are for exploring conditions. They don't replace instruments or medical advice, and the WBGT figure in particular ignores sunshine, so it will read low in direct sun.

**Seven-day Forecast.** Daily highs and lows for the coming week. They are approximations from the forecast steps, not guaranteed extremes.

**Methods & Sources.** Where the data comes from, how each indicator is calculated, and what the app can't show. I think a research tool should say what it assumes, not just draw charts.

---

## Data source

Forecasts come from the [MET Norway Locationforecast API](https://api.met.no/weatherapi/locationforecast/2.0/documentation), used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) with attribution to MET Norway.

Some things to keep in mind:

- It's model output, not observation. The values are for a grid point near your location and can differ from a real weather station.
- Daily highs and lows are derived from the forecast steps. Later in the week the steps get wider, so short peaks and dips can be missed.
- Days are grouped in Indian Standard Time (`Asia/Kolkata`), so the first and last day of the forecast may be partial.
- If the source has no value, the app shows it as unavailable. It never fills in zero.

If the weather service fails, the app can show older cached data, clearly marked as old, and lets you retry.

## What it doesn't do

- Issue official heatwave warnings, emergency alerts or notifications.
- Calculate local climatological normals or apply IMD's departure-from-normal rule.
- Compute WBGT from measured solar radiation.
- Use machine learning to predict heatwaves.
- Model spatial vulnerability or mortality risk.
- Replace official forecasts, professional heat-stress assessment or public-health guidance.

Some of these may come later, but none of them are claimed today.

## Tech stack

| Part | Tools |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Lucide icons |
| Charts | Hand-written SVG |
| Backend | Python 3.10+, FastAPI, Uvicorn, Pydantic, httpx |
| Weather data | MET Norway Locationforecast |
| Hosting | Vercel (frontend), Render (backend) |
| Checks | Pytest, TypeScript checks, production build |

## Project layout

```text
HeatTrick/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── tests/
└── frontend/
    ├── package.json
    └── src/
        ├── components/
        ├── lib/
        ├── utils/
        ├── data/
        └── services/
```

The backend fetches and processes weather data. The frontend handles the interface, the charts and the calculations you see.

## API

| Endpoint | What it does |
|---|---|
| `GET /api/health` | Confirms the backend is running |
| `GET /api/weather?latitude=...&longitude=...` | Weather, forecast highs and lows, and source details |
| `GET /api/thermal?temp_c=...&rh=...` | Thermal indicators, with methods and limitations |

A healthy `/api/health` returns:

```json
{
  "status": "ok",
  "app": "HeatTrick"
}
```

The weather service follows the source's caching rules where they apply, and missing values are passed through as missing, not as measurements.

---

## Running it locally

You need Python 3.10 or later and Node.js.

**1. Clone**

```powershell
git clone https://github.com/ayushkumar-devlab/HeatTrick.git
cd HeatTrick
```

**2. Start the backend** (from the repository root)

```powershell
python -m venv backend\venv
.\backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\backend\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Leave that terminal open. The API runs at `http://127.0.0.1:8000` and its docs are at `http://127.0.0.1:8000/docs`. Run the command from the repository root, not from inside `backend`, or the imports will fail.

**3. Start the frontend** (second terminal, from the repository root)

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open the address Vite prints, usually `http://localhost:5173`. Vite forwards `/api` to port 8000 during development, so both servers must be running.

**4. Run the checks**

```powershell
.\backend\venv\Scripts\python.exe -m pytest backend\tests
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run lint
```

A passing build only means the frontend compiles. Read the lint output separately.

---

## Deployment

The two halves are deployed separately.

**Backend on Render**

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Frontend on Vercel**

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL`, set to the backend URL with no trailing slash

The backend only accepts requests from approved origins, so if the frontend moves to a new domain, add it to the backend's allowed list.

On Render's free tier the backend sleeps when idle, so the first request after a quiet period can be slow. While it wakes up, the app may show older data marked as such.

---

## What I want to do next

- Add reliable climatological normals so IMD's heatwave criteria can be applied properly.
- Bring in solar-radiation data for a fuller WBGT.
- Compare forecasts with observed weather to see how accurate they are.
- Cover more locations and improve search.
- Look at spatial vulnerability and richer heat-risk models.

What happens next depends on what data I can get, how well I can validate it, and where the research goes.

## Credits and rights

HeatTrick is by Ayush Kumar, an Electronics and Communication Engineering undergraduate at RV Institute of Technology and Management, Bengaluru.

Forecast data comes from MET Norway's Locationforecast API under CC BY 4.0. See the original source for its attribution terms.

Copyright © 2026 Ayush Kumar. All rights reserved.

The code is public so it can be read and evaluated. That does not give permission to copy, modify, redistribute or reuse it; please ask the copyright holder in writing first. This notice covers the project's code only, not third-party data, libraries or dependencies.

---

*HeatTrick is still in progress. The aim is to make local heat easier to understand and to be straight about the data and limits behind every number.*
