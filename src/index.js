const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const dotenv = require('dotenv');
const tmdbService = require('./services/tmdb.service');

// Cargar configuración de .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_DEV = process.env.NODE_ENV !== 'production';

// ── 1. SEGURIDAD DE CABECERAS (Helmet) ────────────────────────
// Configura cabeceras HTTP de seguridad (CSP, HSTS, etc.)
app.use(helmet());

// ── 2. LIMITACIÓN DE TASA (Rate Limit) ────────────────────────
// Protege contra ataques de fuerza bruta o DoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por ventana por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiadas solicitudes, intenta de nuevo más tarde.' }
});
app.use('/api/', limiter);

// ── 3. CONFIGURACIÓN DE CORS ──────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (ej: curl, postman en dev) o de orígenes permitidos
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acceso denegado por política CORS'));
    }
  },
  methods: ['GET'], // Capamos a solo GET por seguridad del catálogo
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── 4. MIDDLEWARES BÁSICOS ────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Límite de tamaño para evitar payloads pesados
app.use(morgan(IS_DEV ? 'dev' : 'combined'));

// ── 5. CACHÉ EN MEMORIA (Optimización TMDB) ──────────────────
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX    = 100;
const memoryCache  = new Map();

function getCached(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { memoryCache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  if (memoryCache.size >= CACHE_MAX) memoryCache.delete(memoryCache.keys().next().value);
  memoryCache.set(key, { ts: Date.now(), data });
}

// ── 6. RUTAS DE ESTADO ────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ ok: true, status: 'CoffeeGo Protected API ☕', version: '1.1.0' });
});

app.get('/api/status', (req, res) => {
  res.json({ ok: true, server: 'online', secure: true });
});

// ═══════════════════════════════════════════════════════════════
//  Endpoints de Negocio
// ═══════════════════════════════════════════════════════════════

// Tendencias
app.get('/api/trending', async (req, res, next) => {
  const cacheKey = 'trending:week';
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ok: true, ...cached });

  try {
    const [movies, series] = await Promise.all([
      tmdbService.getTrendingMovies(),
      tmdbService.getTrendingSeries()
    ]);
    const data = { movies: movies || [], series: series || [] };
    setCache(cacheKey, data);
    res.json({ ok: true, ...data });
  } catch (error) {
    next(error);
  }
});

// Películas Populares
app.get('/api/movies/popular', async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const cacheKey = `movies:popular:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ok: true, ...cached });

  try {
    const data = await tmdbService.getPopularMovies(page);
    setCache(cacheKey, data);
    res.json({ ok: true, ...data });
  } catch (error) {
    next(error);
  }
});

// Series Populares
app.get('/api/series/popular', async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const cacheKey = `series:popular:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ok: true, ...cached });

  try {
    const data = await tmdbService.getPopularSeries(page);
    setCache(cacheKey, data);
    res.json({ ok: true, ...data });
  } catch (error) {
    next(error);
  }
});

// Búsqueda con sanitización básica
app.get('/api/search', async (req, res, next) => {
  const query = (req.query.q || '').toString().trim().toLowerCase().slice(0, 100);
  const page  = Math.max(1, parseInt(req.query.page) || 1);

  if (!query) return res.status(400).json({ ok: false, message: 'La consulta no puede estar vacía.' });

  const cacheKey = `search:${query}:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ok: true, ...cached });

  try {
    const data = await tmdbService.searchMedia(query, page);
    setCache(cacheKey, data);
    res.json({ ok: true, ...data });
  } catch (error) {
    next(error);
  }
});

// Detalles de Temporada
app.get('/api/details/tv/:id/season/:seasonNumber', async (req, res, next) => {
  const id           = parseInt(req.params.id);
  const seasonNumber = parseInt(req.params.seasonNumber);

  if (isNaN(id) || isNaN(seasonNumber) || id < 1 || seasonNumber < 0) {
    return res.status(400).json({ ok: false, message: 'Parámetros inválidos.' });
  }

  try {
    const data = await tmdbService.getSeasonDetails(id, seasonNumber);
    res.json({ ok: true, ...data });
  } catch (error) {
    next(error);
  }
});

// Detalles Generales
app.get('/api/details/:type/:id', async (req, res, next) => {
  const { type, id } = req.params;
  if (!['movie', 'tv'].includes(type) || isNaN(parseInt(id))) {
    return res.status(400).json({ ok: false, message: 'Contenido no válido.' });
  }

  try {
    const data = await tmdbService.getMovieDetails(parseInt(id), type);
    res.json({ ok: true, ...data });
  } catch (error) {
    next(error);
  }
});

// ── 6. MANEJO DE ERRORES (CENTRALIZADO) ───────────────────────

// 404 - Not Found
app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'El recurso solicitado no fue encontrado.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[Error del Servidor] ${new Date().toISOString()}:`, err.message);
  
  // En producción no devolvemos el stack ni detalles internos
  const message = IS_DEV ? err.message : 'Ocurrió un error inesperado. Inténtalo más tarde.';
  res.status(500).json({ ok: false, message });
});

app.listen(PORT, () => {
  console.log(`🚀 CoffeeGo API Protegida lista en puerto ${PORT}`);
});
