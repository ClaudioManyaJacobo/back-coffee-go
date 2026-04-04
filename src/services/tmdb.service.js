const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
    language: 'es-ES'
  }
});

const getTrendingMovies = async () => {
  const { data } = await tmdbApi.get('/trending/movie/week');
  return data.results;
};

const getTrendingSeries = async () => {
  const { data } = await tmdbApi.get('/trending/tv/week');
  return data.results;
};

const getPopularMovies = async (page = 1) => {
  const { data } = await tmdbApi.get('/movie/popular', { params: { page } });
  return data;
};

const getPopularSeries = async (page = 1) => {
  const { data } = await tmdbApi.get('/tv/popular', { params: { page } });
  return data;
};

const searchMedia = async (query, page = 1) => {
  const { data } = await tmdbApi.get('/search/multi', { params: { query, page } });
  return data;
};

const getMovieDetails = async (id, type = 'movie') => {
  const { data } = await tmdbApi.get(`/${type}/${id}`);
  return data;
};

module.exports = {
  getTrendingMovies,
  getTrendingSeries,
  getPopularMovies,
  getPopularSeries,
  searchMedia,
  getMovieDetails
};
