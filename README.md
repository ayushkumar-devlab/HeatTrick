# 🌡️ HeatTrick

**Localized heat, clearly explained.**

A heatwave doesn't hit every place the same way. Temperature is only half the story: add humidity, and the same 38 °C can feel very different on your body.

HeatTrick is a research-oriented web app that helps you make sense of a local weather forecast in the context of heatwave thresholds and human thermal stress. It puts forecast data, heatwave criteria and thermal calculations in one place, and, more importantly, tries to explain what the numbers actually mean.

🌐 **Try it live:** [heat-trick.vercel.app](https://heat-trick.vercel.app/)

> **A quick note:** HeatTrick is a research and learning prototype, not an official weather-warning service. For official forecasts and heatwave advisories, please check the [India Meteorological Department (IMD)](https://mausam.imd.gov.in/) and the [National Disaster Management Authority (NDMA)](https://ndma.gov.in/).

---

## Why I built this

I started HeatTrick while exploring localized heatwave early warning and human thermal stress in India. I didn't want to just show a temperature and call it a day. I wanted to build something that helps people understand why a number matters.

The idea is simple:

1. Show the forecast.
2. Compare it with the relevant heatwave temperature threshold.
3. Estimate how temperature and humidity together affect thermal comfort.
4. Be upfront about what the estimates can't tell you, instead of passing them off as facts.

This is an early step. Right now it's a working weather app with transparent, rule-based calculations, and the more ambitious research features are still ahead of me.

---

## What you can explore

### 1. Overview
A quick snapshot of the selected location: current temperature, forecast high and low, and a seven-day temperature chart. It also puts the forecast high in context, for example by showing how far it sits above or below the relevant IMD heatwave threshold.

### 2. Heatwave Analysis
Compare the forecast high against baseline heatwave thresholds for different terrain types:

| Region  | Threshold |
| ------- | --------- |
| Plains  | 40 °C     |
| Coastal | 37 °C     |
| Hilly   | 30 °C     |

This is a basic threshold comparison, **not** an official heatwave classification. IMD's assessment also looks at the departure from the climatological normal, which this version doesn't calculate yet.

### 3. Thermal Stress
Air temperature and relative humidity are used to calculate or estimate:

- **NOAA Heat Index**: roughly how hot it may *feel* once humidity is factored in.
- **Wet-bulb temperature**: calculated with the Stull approximation.
- **WBGT estimate**: a shade / no-radiation estimate of Wet-Bulb Globe Temperature.
- **Dew point**: derived from temperature and relative humidity.

These are meant for exploring conditions, not for replacing professional heat-stress measurement or medical advice. The WBGT value is an estimate, not a measurement, and it doesn't account for real solar radiation.

### 4. Seven-day Forecast
Daily highs and lows for the coming week, so you can see how conditions are likely to change rather than just how they look right now.

### 5. Methods & Sources
Where the data comes from, how each indicator is calculated, and what the current model can and can't establish. I think this page matters most: a good research tool should explain its assumptions and limits, not just show polished charts.

---

## How the weather data works

HeatTrick pulls forecasts from the [MET Norway Locationforecast API](https://api.met.no/weatherapi/locationforecast/2.0/documentation), used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) with attribution to MET Norway.

A few things worth knowing when you read the results:

- **Forecasts are not observations.** The data comes from a model grid point near your chosen location, not necessarily from a physical weather station.
- **Daily extremes are approximations.** Highs and lows are derived from the available forecast steps. Later in the week those steps get wider apart, so some peaks and dips can be missed.
- **Days follow Indian Standard Time.** Forecast days are grouped using `Asia/Kolkata`, so the first and last days of an outlook may be partial.
- **Missing data stays missing.** If the source doesn't provide a value, HeatTrick shows it as unavailable. It never invents a number or quietly shows zero.

If the weather service goes down, the app tells you, can show previously cached data (clearly marked as older), and gives you a way to retry.

---

## What HeatTrick can't do (yet)

These limits are deliberate, and it's important to understand them before relying on any result.

- ❌ It doesn't issue official heatwave warnings, public alerts or emergency notifications.
- ❌ It doesn't calculate location-specific climatological normals, so IMD's departure-from-normal criterion isn't applied.
- ❌ It doesn't compute a solar-radiation-based WBGT. The displayed value is a shade / no-radiation estimate.
- ❌ It has no machine-learning heatwave prediction, spatial vulnerability modelling or mortality-risk modelling.
- ❌ It doesn't replace official meteorological data, professional thermal-stress assessment or public-health guidance.

These are areas for future work, not features I'm claiming today.

---

## Tech stack

| Layer            | Technologies                                        |
| ---------------- | --------------------------------------------------- |
| Frontend         | React, TypeScript, Vite, Tailwind CSS, Lucide icons |
| Charts           | Custom SVG visualisations                           |
| Backend          | Python 3.10+, FastAPI, Uvicorn, Pydantic, httpx     |
| Weather data     | MET Norway Locationforecast API                     |
| Frontend hosting | Vercel                                              |
| Backend hosting  | Render                                              |
| Testing          | Pytest, TypeScript and production build checks      |

## Project structure

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

The backend handles API requests and weather-data processing. The frontend takes care of the interface, visualisations and calculations you see.

## API endpoints

| Endpoint                                      | What it does                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `GET /api/health`                             | Checks that the backend is running                                       |
| `GET /api/weather?latitude=...&longitude=...` | Returns conditions, forecast highs and lows, and source metadata         |
| `GET /api/thermal?temp_c=...&rh=...`          | Returns thermal indicators, calculation methods and relevant limitations |

A healthy `/api/health` response looks like this:

```json
{
  "status": "ok",
  "app": "HeatTrick"
}
```

The weather service respects the source's caching information where applicable, and both frontend and backend handle unavailable data so missing values are never passed off as real measurements.

---

## Run it locally

You'll need **Python 3.10+** and **Node.js**.

### 1. Clone the repo

```powershell
git clone https://github.com/ayushkumar-devlab/HeatTrick.git
cd HeatTrick
```

### 2. Start the backend

From the repository root:

```powershell
python -m venv backend\venv
.\backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\backend\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Leave this terminal open. The API will be at `http://127.0.0.1:8000`, with interactive docs at `http://127.0.0.1:8000/docs`.

### 3. Start the frontend

In a second terminal, from the repository root:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open the address Vite prints, usually `http://localhost:5173`. In development, Vite forwards `/api` requests to the backend on port 8000, so keep both running while you test.

### 4. Run the checks

Backend tests, from the repository root:

```powershell
.\backend\venv\Scripts\python.exe -m pytest backend\tests
```

Frontend build and lint:

```powershell
cd frontend
npm.cmd run build
npm.cmd run lint
```

A successful build means the frontend compiles, but do glance over any lint warnings or errors separately.

---

## Deployment

The frontend and backend are deployed separately.

### Backend on Render

- **Root directory:** `backend`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend on Vercel

- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `VITE_API_BASE_URL`, set to your deployed backend URL, with no trailing slash.

The backend only accepts browser requests from configured origins, so if you deploy the frontend to a new domain, add that origin to the backend configuration.

> **Heads-up:** On Render's free tier, the backend can be slow to respond after sitting idle. While a fresh request is in flight, HeatTrick may show previously retrieved data, labelled as older.

---

## What's next

HeatTrick is still evolving. Here's what I'd like to tackle:

- Add reliable climatological normals so IMD's heatwave criteria can be implemented more fully.
- Bring in solar-radiation data for a more complete WBGT calculation.
- Compare forecasts against observed weather to see how accurate threshold-based results really are.
- Cover more locations and make it easier to search beyond the predefined stations.
- Explore spatial vulnerability assessment and more advanced heat-risk modelling.

How far these go depends on data availability, validation and the scope of future development.

---

## Credits and licence

HeatTrick was built by **Ayush Kumar**, an Electronics and Communication Engineering undergraduate at RV Institute of Technology and Management, Bengaluru, as a research and learning project.

Weather data is provided by **MET Norway** through its Locationforecast API and used under **CC BY 4.0**. Please consult the data and source documentation for the applicable terms.

The code is released under the [MIT License](LICENSE).

---

*HeatTrick is a work in progress. The goal isn't just to show how hot a place might get, but to make the available information easier to understand, while staying honest about uncertainty and limitations.*
