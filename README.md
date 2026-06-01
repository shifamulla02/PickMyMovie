# 🎬 PickMyMovie

A content-based movie recommendation system built with a FastAPI backend and React frontend. Enter any movie you love and get 5 similar recommendations, complete with posters fetched live from TMDB.

![Python](https://img.shields.io/badge/Python-3.9+-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5+-646CFF?style=flat-square&logo=vite)

---

## How it works

1. Movie metadata (genres, keywords, cast, director, overview) is combined into a single "tags" string per movie
2. Tags are stemmed and vectorized using `CountVectorizer` (5000 features)
3. Dimensions are reduced via `TruncatedSVD` (LSA) to capture latent semantic relationships
4. Cosine similarity is computed across all movie pairs and saved to disk
5. At query time, fuzzy matching finds the closest title to what you typed, then the top 5 most similar movies are returned

---

## Project structure

```
pickmymovie/
├── backend/
│   ├── main.py              ← FastAPI server
│   ├── train.py             ← Model training script (run once)
│   ├── models/              ← Auto-created by train.py
│   │   ├── movies.pkl
│   │   └── similarity.pkl
│   └── data/
│       ├── tmdb_5000_movies.csv
│       └── tmdb_5000_credits.csv
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── App.css
    ├── .env                 ← Backend URL config
    └── package.json
```

---

## Prerequisites

- Python 3.9+
- Node.js 18+
- A free [TMDB API key](https://www.themoviedb.org/settings/api)
- The [TMDB 5000 Movie Dataset](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata) — download both CSVs from Kaggle and place them in `backend/data/`

---

## Running the app

You need **two terminals open simultaneously** every time you use the app:

| Terminal | Command | What it does |
|----------|---------|--------------|
| 1 | `cd backend && uvicorn main:app --reload` | Runs the API server |
| 2 | `cd frontend && npm run dev` | Runs the React dev server |

---

## Tech stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — API framework
- [scikit-learn](https://scikit-learn.org/) — CountVectorizer, TruncatedSVD, cosine similarity
- [NLTK](https://www.nltk.org/) — Porter stemmer
- [fuzzywuzzy](https://github.com/seatgeek/fuzzywuzzy) — Fuzzy title matching
- [pandas](https://pandas.pydata.org/) — Data processing

**Frontend**
- [React 18](https://react.dev/) — UI framework
- [Vite](https://vitejs.dev/) — Dev server and bundler
- [TMDB API](https://developer.themoviedb.org/) — Movie posters and metadata

**Dataset**
- [TMDB 5000 Movie Dataset](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata) via Kaggle

---

