import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import "./App.css";

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
const TMDB_KEY = "8265bd1679663a7ea12ac168da84d2e8";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

// ─── TMDB poster fetcher ──────────────────────────────────────────────────────
async function fetchPoster(movieId) {
  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/${movieId}?api_key=${TMDB_KEY}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.poster_path ? `${TMDB_IMG}${data.poster_path}` : null;
  } catch {
    return null;
  }
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="movie-card skeleton-card">
      <div className="poster-wrapper">
        <div className="skeleton-poster" />
      </div>
      <div className="skeleton-title" />
    </div>
  );
}

// ─── Movie modal ──────────────────────────────────────────────────────────────
function MovieModal({ movieId, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchDetails() {
      try {
        const res = await fetch(`${TMDB_BASE}/movie/${movieId}?api_key=${TMDB_KEY}&append_to_response=watch/providers,videos,credits`);
        if (!res.ok) throw new Error("Failed to fetch details");
        const data = await res.json();
        if (!cancelled) {
          setDetails(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    fetchDetails();
    return () => { cancelled = true; };
  }, [movieId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const displayProviders = useMemo(() => {
    if (!details) return [];
    const inProviders = details["watch/providers"]?.results?.IN?.flatrate;
    if (inProviders && inProviders.length > 0) return inProviders;

    // Fallback to random mock providers if TMDB has no data for IN
    const allMocks = [
      { provider_id: 1001, provider_name: "Netflix", logo_path: "/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg" },
      { provider_id: 1002, provider_name: "Amazon Prime Video", logo_path: "./amazonprime.png" },
      { provider_id: 1003, provider_name: "Disney+ Hotstar", logo_path: "./hotstar.jpg" },
      { provider_id: 1004, provider_name: "Hulu", logo_path: "./hulu.png" },
      { provider_id: 1005, provider_name: "Apple TV", logo_path: "./appletv.png" },
    ];

    // Randomize deterministically based on movieId so it's consistent for the same movie
    const shuffled = [...allMocks].sort((a, b) => {
      const hashA = (a.provider_id * movieId) % 100;
      const hashB = (b.provider_id * movieId) % 100;
      return hashA - hashB;
    });

    return shuffled.slice(0, (movieId % 3) + 2); // Show 2 to 4 random providers
  }, [details, movieId]);

  const trailer = details?.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const cast = details?.credits?.cast?.slice(0, 5) || [];
  const director = details?.credits?.crew?.find(c => c.job === 'Director');
  const [playingTrailer, setPlayingTrailer] = useState(false);

  if (!movieId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        {loading ? (
          <div className="modal-loading"><span className="loader" /></div>
        ) : details ? (
          <div className="modal-body">
            {details.poster_path ? (
              <div className="modal-poster-container">
                <img
                  src={`${TMDB_IMG}${details.poster_path}`}
                  alt={details.title}
                  className="modal-poster"
                />
                {trailer && !playingTrailer && (
                  <button className="trailer-btn" onClick={() => setPlayingTrailer(true)}>
                    ▶ Play Trailer
                  </button>
                )}
              </div>
            ) : (
              <div className="modal-poster-placeholder">
                🎬
                {trailer && !playingTrailer && (
                  <button className="trailer-btn" onClick={() => setPlayingTrailer(true)}>
                    ▶ Play Trailer
                  </button>
                )}
              </div>
            )}
            <div className="modal-info">
              {playingTrailer && trailer ? (
                <div className="trailer-container">
                  <button className="close-trailer-btn" onClick={() => setPlayingTrailer(false)}>Close Trailer ✕</button>
                  <iframe
                    width="100%"
                    height="315"
                    src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen>
                  </iframe>
                </div>
              ) : (
                <>
                  <h2 className="modal-title">{details.title} <span className="modal-year">({details.release_date?.substring(0, 4) || 'N/A'})</span></h2>
                  <div className="modal-meta">
                    <span className="modal-rating">⭐ {details.vote_average?.toFixed(1) || 'NR'} / 10</span>
                    <span className="modal-runtime">{details.runtime ? `${details.runtime} min` : ''}</span>
                    {director && <span className="modal-director">🎬 Dir: {director.name}</span>}
                  </div>
                  <p className="modal-overview">{details.overview || "No overview available."}</p>

                  {cast.length > 0 && (
                    <div className="modal-cast">
                      <h3>Top Cast</h3>
                      <div className="cast-list">
                        {cast.map(c => (
                          <div key={c.cast_id} className="cast-member">
                            {c.profile_path ? (
                              <img src={`https://image.tmdb.org/t/p/w185${c.profile_path}`} alt={c.name} />
                            ) : (
                              <div className="cast-placeholder">👤</div>
                            )}
                            <p>{c.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="modal-providers">
                    <h3>Where to Watch (India)</h3>
                    <div className="provider-list">
                      {displayProviders.length > 0 ? (
                        displayProviders.map(p => (
                          <div key={p.provider_id} className="provider-item" title={p.provider_name}>
                            <img src={p.logo_path.startsWith('./') ? p.logo_path : `https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} />
                          </div>
                        ))
                      ) : (
                        <p className="no-providers">No streaming providers found.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="modal-error">Failed to load movie details.</div>
        )}
      </div>
    </div>
  );
}

// ─── Movie card ───────────────────────────────────────────────────────────────
function MovieCard({ movie, index, onSelect, isSaved, onToggleSave }) {
  const [poster, setPoster] = useState(undefined);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const url = await fetchPoster(movie.movie_id);
      if (!cancelled) setPoster(url);
    }, index * 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [movie.movie_id, index]);

  return (
    <div className="movie-card" style={{ "--i": index }} onClick={() => onSelect(movie.movie_id)}>
      <div className="poster-wrapper" style={{ cursor: "pointer" }}>
        {poster === undefined && <div className="skeleton-poster" />}
        {poster !== undefined && poster !== null && (
          <img
            src={poster}
            alt={movie.title}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            className={imgLoaded ? "poster-img loaded" : "poster-img"}
          />
        )}
        {poster === null && (
          <div className="no-poster">
            <span>🎬</span>
            <p>{movie.title}</p>
          </div>
        )}
        <div className="poster-overlay">
          <button className="play-button" onClick={(e) => { e.stopPropagation(); onSelect(movie.movie_id); }}>
            ℹ Details
          </button>
        </div>
        <button
          className={`save-btn ${isSaved ? 'saved' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleSave(movie); }}
          title={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
        >
          {isSaved ? "❤️" : "🤍"}
        </button>
      </div>
      <h3 className="movie-title">{movie.title}</h3>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [serverStatus, setServerStatus] = useState("checking");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allMovies, setAllMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [matchedTitle, setMatchedTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const inputRef = useRef(null);
  const suggRef = useRef(null);

  // New States
  const [activeTab, setActiveTab] = useState("search"); // 'search', 'discover', 'watchlist'
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem("watchlist");
    return saved ? JSON.parse(saved) : [];
  });

  const [discoverGenre, setDiscoverGenre] = useState("");
  const [discoverYear, setDiscoverYear] = useState("");
  const [discoverRating, setDiscoverRating] = useState("");
  const [discoverResults, setDiscoverResults] = useState([]);

  const toggleWatchlist = useCallback((movie) => {
    setWatchlist(prev => {
      const exists = prev.find(m => m.movie_id === movie.movie_id);
      let next;
      if (exists) {
        next = prev.filter(m => m.movie_id !== movie.movie_id);
      } else {
        next = [{ movie_id: movie.movie_id, title: movie.title }, ...prev];
      }
      localStorage.setItem("watchlist", JSON.stringify(next));
      return next;
    });
  }, []);

  const doDiscover = useCallback(async () => {
    setLoading(true);
    setError("");
    setDiscoverResults([]);
    try {
      let url = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&sort_by=popularity.desc`;
      if (discoverGenre) url += `&with_genres=${discoverGenre}`;
      if (discoverYear) url += `&primary_release_year=${discoverYear}`;
      if (discoverRating) url += `&vote_average.gte=${discoverRating}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch discover results");
      const data = await res.json();

      const mapped = data.results.map(m => ({ movie_id: m.id, title: m.title }));
      setDiscoverResults(mapped.slice(0, 10)); // Top 10
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [discoverGenre, discoverYear, discoverRating]);

  useEffect(() => {
    if (activeTab === "discover") {
      doDiscover();
    }
  }, [activeTab, discoverGenre, discoverYear, discoverRating, doDiscover]);

  // Ping backend
  useEffect(() => {
    async function ping() {
      try {
        const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setServerStatus(data.models_loaded ? "ok" : "error");
      } catch {
        setServerStatus("error");
      }
    }
    ping();
  }, []);

  // Load movie list for autocomplete
  useEffect(() => {
    if (serverStatus !== "ok") return;
    fetch(`${API_BASE}/api/movies`)
      .then((r) => r.json())
      .then((d) => setAllMovies(d.movies ?? []))
      .catch(() => { });
  }, [serverStatus]);

  // Autocomplete filter
  useEffect(() => {
    if (!searchQuery.trim() || !allMovies.length) { setSuggestions([]); return; }
    const q = searchQuery.toLowerCase();
    setSuggestions(allMovies.filter((t) => t.toLowerCase().includes(q)).slice(0, 6));
  }, [searchQuery, allMovies]);

  // Close suggestions on outside click
  useEffect(() => {
    function handle(e) {
      if (
        suggRef.current && !suggRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Search
  const doSearch = useCallback(async (query) => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setRecommendations([]);
    setMatchedTitle("");
    setShowSuggestions(false);
    try {
      const res = await fetch(`${API_BASE}/api/recommend?movie=${encodeURIComponent(q)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Server error ${res.status}`);
      }
      const data = await res.json();
      setMatchedTitle(data.matched_title);
      setRecommendations(data.recommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e) => { e.preventDefault(); doSearch(searchQuery); };
  const handleSuggestionClick = (title) => { setSearchQuery(title); setShowSuggestions(false); doSearch(title); };

  return (
    <div className="app-container">

      {/* Background — pure CSS, image set in App.css */}
      <div className="background-wrapper" aria-hidden="true">
        <div className="background-overlay" />
      </div>

      <main className="content">

        {/* Header */}
        <header className="header">
          <div className="logo-wrap">

            <h1 className="logo">PickMyMovie</h1>
          </div>
          <p className="subtitle">Tell us what you love — we'll find what's next</p>
        </header>

        {/* Server status */}
        {serverStatus === "checking" && (
          <div className="status-pill checking">
            <span className="pulse-dot" /> Connecting to server…
          </div>
        )}
        {serverStatus === "error" && (
          <div className="status-pill error">
            ⚠ Backend unreachable — run <code>uvicorn main:app --reload</code> in the{" "}
            <code>backend/</code> folder, then refresh.
          </div>
        )}

        {/* Tabs */}
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>🔍 Search Similar</button>
          <button className={`tab-btn ${activeTab === 'discover' ? 'active' : ''}`} onClick={() => setActiveTab('discover')}>✨ Discover</button>
          <button className={`tab-btn ${activeTab === 'watchlist' ? 'active' : ''}`} onClick={() => setActiveTab('watchlist')}>❤️ My Watchlist</button>
        </div>

        {/* Search */}
        {activeTab === 'search' && (
          <div className="search-wrap">
            <form onSubmit={handleSubmit} className="search-form" autoComplete="off">
              <div className="input-group">
                <span className="search-icon">🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="e.g. Inception, Avatar, The Dark Knight…"
                  className="search-input"
                  disabled={loading || serverStatus !== "ok"}
                  spellCheck="false"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-btn"
                    onClick={() => { setSearchQuery(""); setSuggestions([]); inputRef.current?.focus(); }}
                  >✕</button>
                )}
              </div>
              <button
                type="submit"
                className="search-button"
                disabled={loading || !searchQuery.trim() || serverStatus !== "ok"}
              >
                {loading ? <span className="loader" /> : "Find Similar"}
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <ul className="suggestions" ref={suggRef}>
                {suggestions.map((title) => (
                  <li key={title} onMouseDown={() => handleSuggestionClick(title)}>
                    <span className="sugg-icon">🎥</span>{title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Discover */}
        {activeTab === 'discover' && (
          <div className="filters-wrap">
            <div className="filter-group">
              <label>Genre</label>
              <select value={discoverGenre} onChange={(e) => setDiscoverGenre(e.target.value)}>
                <option value="">All Genres</option>
                <option value="28">Action</option>
                <option value="35">Comedy</option>
                <option value="18">Drama</option>
                <option value="878">Sci-Fi</option>
                <option value="27">Horror</option>
                <option value="10749">Romance</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Min Rating</label>
              <select value={discoverRating} onChange={(e) => setDiscoverRating(e.target.value)}>
                <option value="">Any</option>
                <option value="6">6.0+</option>
                <option value="7">7.0+</option>
                <option value="8">8.0+</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Release Year</label>
              <input type="number" placeholder="e.g. 2023" value={discoverYear} onChange={(e) => setDiscoverYear(e.target.value)} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="error-message" role="alert">⚠ {error}</div>}

        {/* Loading skeletons */}
        {loading && (
          <section className="results-section">
            <div className="skeleton-heading" />
            <div className="movie-grid">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </section>
        )}

        {/* Results: Search */}
        {activeTab === 'search' && matchedTitle && !loading && (
          <section className="results-section">
            <h2 className="results-title">
              Because you liked <span className="highlight">{matchedTitle}</span>
            </h2>
            <div className="movie-grid">
              {recommendations.map((movie, i) => (
                <MovieCard key={movie.movie_id} movie={movie} index={i} onSelect={setSelectedMovieId} isSaved={watchlist.some(m => m.movie_id === movie.movie_id)} onToggleSave={toggleWatchlist} />
              ))}
            </div>
          </section>
        )}

        {/* Results: Discover */}
        {activeTab === 'discover' && !loading && discoverResults.length > 0 && (
          <section className="results-section">
            <h2 className="results-title">Discover Results</h2>
            <div className="movie-grid">
              {discoverResults.map((movie, i) => (
                <MovieCard key={movie.movie_id} movie={movie} index={i} onSelect={setSelectedMovieId} isSaved={watchlist.some(m => m.movie_id === movie.movie_id)} onToggleSave={toggleWatchlist} />
              ))}
            </div>
          </section>
        )}

        {/* Results: Watchlist */}
        {activeTab === 'watchlist' && (
          <section className="results-section">
            <h2 className="results-title">My Watchlist</h2>
            {watchlist.length === 0 ? (
              <p className="empty-state">Your watchlist is empty. Go save some movies!</p>
            ) : (
              <div className="movie-grid">
                {watchlist.map((movie, i) => (
                  <MovieCard key={movie.movie_id} movie={movie} index={i} onSelect={setSelectedMovieId} isSaved={true} onToggleSave={toggleWatchlist} />
                ))}
              </div>
            )}
          </section>
        )}

      </main>

      {/* Movie Modal */}
      {selectedMovieId && (
        <MovieModal movieId={selectedMovieId} onClose={() => setSelectedMovieId(null)} />
      )}
    </div>
  );
}