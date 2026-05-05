from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pickle
import os
import random
import time

app = FastAPI(title="PickMyMovie API")

# ─── CORS ─────────────────────────────────────────────────────────────────────
# This MUST come before any route definitions.
# allow_origins=["*"] lets your Vite frontend (any port) talk to this server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # must be False when allow_origins is "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model globals ────────────────────────────────────────────────────────────
movies     = None
similarity = None

@app.on_event("startup")
def load_models():
    global movies, similarity
    models_dir       = os.path.join(os.path.dirname(__file__), "models")
    movies_path      = os.path.join(models_dir, "movies.pkl")
    similarity_path  = os.path.join(models_dir, "similarity.pkl")

    if os.path.exists(movies_path) and os.path.exists(similarity_path):
        with open(movies_path, "rb") as f:
            movies = pickle.load(f)
        with open(similarity_path, "rb") as f:
            similarity = pickle.load(f)
        print(f"Models loaded - {len(movies['title'])} movies ready.")
    else:
        print("Model files not found in ./models/  - run train.py first!")


def require_models():
    """Call at the top of every route that needs the models."""
    if movies is None or similarity is None:
        raise HTTPException(
            status_code=503,
            detail="Models not loaded yet. Run train.py then restart the server.",
        )


# ─── Health check — hit this first to confirm the server is alive ─────────────
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "models_loaded": movies is not None and similarity is not None,
        "movie_count": len(movies["title"]) if movies is not None else 0,
    }


# ─── All movie titles (for autocomplete) ─────────────────────────────────────
@app.get("/api/movies")
def get_all_movies():
    require_models()
    return {"movies": sorted(set(movies["title"].values()))}


# ─── Random movies for the animated background ───────────────────────────────
@app.get("/api/trending")
def get_trending():
    require_models()
    all_keys    = list(movies["title"].keys())
    sample_keys = random.sample(all_keys, min(20, len(all_keys)))
    return {
        "trending": [
            {"movie_id": int(movies["movie_id"][k]), "title": str(movies["title"][k])}
            for k in sample_keys
        ]
    }


# ─── Recommendation endpoint ──────────────────────────────────────────────────
@app.get("/api/recommend")
def recommend(movie: str):
    require_models()

    from fuzzywuzzy import process   # lazy import — avoids slow startup

    try:
        t0         = time.time()
        all_titles = list(movies["title"].values())
        best       = process.extractOne(movie, all_titles)
        t1         = time.time()

        if not best or best[1] < 60:
            raise HTTPException(
                status_code=404,
                detail=f"Couldn't find a good match for '{movie}'. Try a different title.",
            )

        matched_name  = best[0]
        matched_index = next(
            (k for k, v in movies["title"].items() if v == matched_name), None
        )
        if matched_index is None:
            raise HTTPException(status_code=404, detail="Index lookup failed.")

        t2       = time.time()
        scores   = similarity[matched_index]
        top5     = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[1:6]
        t3       = time.time()

        recommendations = [
            {"movie_id": int(movies["movie_id"][i]), "title": str(movies["title"][i])}
            for i, _ in top5
        ]
        t4 = time.time()

        print(
            f"[recommend] fuzzy={t1-t0:.3f}s  idx={t2-t1:.3f}s  "
            f"sort={t3-t2:.3f}s  build={t4-t3:.3f}s"
        )

        return {"matched_title": matched_name, "recommendations": recommendations}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))