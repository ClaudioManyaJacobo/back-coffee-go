const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const tmdbService = require('./services/tmdb.service');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Caché en memoria para búsquedas y optimización ──────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // Tiempo de vida de 5 minutos
const CACHE_MAX    = 100;           // Límite de entradas en caché
const searchCache  = new Map();

function getCached(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { 
    searchCache.delete(key); 
    return null; 
  }
  return entry.data;
}

function setCache(key, data) {
  if (searchCache.size >= CACHE_MAX) {
    // Eliminar la entrada más antigua (primera en el Map)
    searchCache.delete(searchCache.keys().next().value);
  }
  searchCache.set(key, { ts: Date.now(), data });
}
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// Logs minimalistas para registro de peticiones
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Endpoints principales del servidor que consumen TMDB
app.get('/api/trending', async (req, res) => {
  try {
    const movies = await tmdbService.getTrendingMovies();
    const series = await tmdbService.getTrendingSeries();
    res.json({ movies: movies || [], series: series || [] });
  } catch (error) {
    res.status(500).json({ error: 'Error TMDB Trending' });
  }
});

app.get('/api/movies/popular', async (req, res) => {
  const page = req.query.page || 1;
  try {
    const data = await tmdbService.getPopularMovies(page);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error TMDB Movies' });
  }
});

app.get('/api/series/popular', async (req, res) => {
  const page = req.query.page || 1;
  try {
    const data = await tmdbService.getPopularSeries(page);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error TMDB Series' });
  }
});

app.get('/api/search', async (req, res) => {
  const query = req.query.q?.trim().toLowerCase();
  const page  = req.query.page || 1;
  if (!query) return res.status(400).json({ error: 'Falta parametro de busqueda' });

  const cacheKey = `${query}:${page}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.set('X-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    const data = await tmdbService.searchMedia(query, page);
    setCache(cacheKey, data);
    res.set('X-Cache', 'MISS');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error buscar' });
  }
});

// Ruta específica para episodios arriba de la genérica para evitar conflictos
app.get('/api/details/tv/:id/season/:seasonNumber', async (req, res) => {
  const { id, seasonNumber } = req.params;
  console.log(`[Solicitud de Temporada] ID: ${id}, Season: ${seasonNumber}`);
  try {
    const data = await tmdbService.getSeasonDetails(id, seasonNumber);
    res.json(data);
  } catch (error) {
    console.error('Error al cargar Temporada:', error.message);
    res.status(500).json({ error: 'Error cargar episodios de temporada' });
  }
});

app.get('/api/details/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  try {
    const data = await tmdbService.getMovieDetails(id, type);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error cargar detalles' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 CoffeeGo API: http://localhost:${PORT}`);
});
