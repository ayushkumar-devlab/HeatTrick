# HeatTrick

**Localized heat, clearly explained.**

HeatTrick is a small web app that shows the weather forecast for locations across India and puts it in the context of heat risk. For a chosen station, it tells you in plain language how the forecast high compares with the temperatures India's weather department (IMD) uses to define a heatwave, and how humid air can make the heat harder on the body.

It started as a college research project on localized heatwave early warning and human thermal stress in India. It is still a prototype, and it is **not** an official warning service. For real advisories, follow [IMD](https://mausam.imd.gov.in/) and [NDMA](https://ndma.gov.in/).

**Live site:** https://heat-trick.vercel.app/

## What it does today

- **Overview:** a plain-language headline such as "Forecast high of 33.4 °C is 6.6 °C below the 40 °C line IMD uses for heatwaves on the plains", the current temperature, today's high and low, and a 7-day chart of daily highs.
- **Heatwave Analysis:** compares the forecast high with the base thresholds for plains, coastal and hilly stations (40 °C, 37 °C and 30 °C). It is a basic threshold check, not an official classification.
- **Thermal Stress:** computes the NOAA Heat Index from air temperature and humidity, and a dew point derived from the same two values. It only shows a number when the inputs are valid.
- **Forecast:** the full 7-day outlook with daily highs and lows.
- **Methods & sources:** how everything is calculated, where the data comes from, and what the app cannot do.

Pick a station from the selector and every page updates. If the weather service can't be reached, the app says so, shows the last data it had, and lets you retry. It never fills the gap with made-up numbers.

## What it doesn't do (yet)

Being honest about this matters more than looking impressive:

- It does not issue heatwave warnings or alerts.
- It does not know a station's climatological normal, so IMD's "departure from normal" rule can't be applied. The app says when a heatwave "can't be confirmed" for that reason.
- WBGT and other solar-radiation-based indices are not computed, because the weather source doesn't provide solar radiation. They're listed as planned.
- There is no machine learning, vulnerability mapping or mortality modelling.

## Where the data comes from

Weather data comes from the [MET Norway Locationforecast API](https://api.met.no/weatherapi/locationforecast/2.0/documentation), used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and adapted by HeatTrick.

Some things worth knowing:

- The values are **model forecasts for a grid point**, not readings from a weather station.
- Daily highs and lows are taken from discrete forecast steps (hourly early on, every 6 hours later in the week), so they can understate the true peak a little.
- Days are grouped by India local date (Asia/Kolkata). The first and last days can be partial.

## Tech stack

| Part | Tools |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Lucide icons (charts are hand-written SVG) |
| Backend | Python 3.10, FastAPI, Uvicorn, Pydantic, httpx |
| Hosting | Vercel (frontend), Render (backend) |

## Project layout

```
HeatTrick/
├── backend/            FastAPI service (main.py) and tests
│   ├── main.py
│   ├── requirements.txt
│   └── tests/
└── frontend/           React app
    └── src/
        ├── components/ pages, charts, layout
        ├── lib/        heatwave rules, dew point, forecast helpers
        ├── utils/      Heat Index
        ├── data/       reference stations
        └── services/   API client
```

## API

| Endpoint | What it returns |
|---|---|
| `GET /api/health` | `{"status": "ok", "app": "HeatTrick"}` |
| `GET /api/weather?latitude=..&longitude=..` | Current conditions, 7-day daily highs and lows, units and source metadata |

Fields the source doesn't provide come back as `null`, and the frontend shows them as missing, never as zero. Responses are cached on the server according to MET Norway's cache headers.

## Run it locally

You need Python 3.10+ and Node.js 18+.

**1. Backend**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

It listens on http://127.0.0.1:8000, with interactive docs at `/docs`. Keep this terminal open.

**2. Frontend** (in a second terminal)

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open http://localhost:5173. In development, Vite forwards `/api` calls to the backend on port 8000, so you don't need any configuration.

**Tests and checks**

```powershell
cd backend;  .\venv\Scripts\python.exe -m pytest
cd frontend; npm.cmd run build; npm.cmd run lint
```

## Deployment

- **Backend (Render):** root directory `backend`, build command `pip install -r requirements.txt`, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- **Frontend (Vercel):** root directory `frontend`, build command `npm run build`, output directory `dist`. Set the environment variable `VITE_API_BASE_URL` to the backend's URL (no trailing slash).
- The backend only accepts browser requests from the origins listed in `main.py`. If you deploy the frontend to a new domain, add it there.
- On Render's free plan the backend sleeps when idle, so the first request after a break can take up to a minute.

## Roadmap

- Load climatological normals so IMD's departure-from-normal rule can be applied.
- Add WBGT once a source with solar radiation is available.
- Compare forecasts with observations to see how well the thresholds hold up.
- More stations, and a way to search for any location.

## Credits and licence

Built by Ayush Kumar, ECE undergraduate at RV Institute of Technology and Management, Bengaluru, as a research and learning project.

Weather data: © MET Norway, CC BY 4.0.

Code released under the [MIT License](LICENSE).
