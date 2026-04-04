const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const tmdbService = require('./services/tmdb.service');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Logs minimalistas
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Endpoints principales
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

app.listen(PORT, () => {
  console.log(`🚀 CoffeeGo API: http://localhost:${PORT}`);
});
