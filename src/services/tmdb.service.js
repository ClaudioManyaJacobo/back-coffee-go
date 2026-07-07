const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const LANGUAGE = process.env.LANGUAGE;
const TMDB_TIMEOUT = 4000;

// Configuración global de la instancia de axios para TMDB
const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: TMDB_TIMEOUT,
  params: {
    api_key: TMDB_API_KEY,
    language: LANGUAGE
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

const getMovieDetails = async (id, type = 'movie') => {
  const { data } = await tmdbApi.get(`/${type}/${id}`, {
    params: {
      append_to_response: 'videos,credits,similar,translations',
      // Trae trailers priorizando idiomas específicos
      include_video_language: 'es-MX,es,es-ES,en-US,en,null' 
    }
  });

  // Fallback de sinopsis (overview)
  // Si en el idioma principal (es-MX) no hay descripción, la buscamos en las traducciones
  if (!data.overview || data.overview === '') {
    if (data.translations && data.translations.translations) {
      // Priorizar otros dialectos de español, luego inglés
      const esTranslation = data.translations.translations.find(t => t.iso_639_1 === 'es' && t.data.overview);
      const enTranslation = data.translations.translations.find(t => t.iso_639_1 === 'en' && t.data.overview);
      
      if (esTranslation) {
        data.overview = esTranslation.data.overview;
      } else if (enTranslation) {
        data.overview = enTranslation.data.overview;
      }
    }
  }

  return data;
};

const getSeasonDetails = async (id, seasonNumber) => {
  const { data } = await tmdbApi.get(`/tv/${id}/season/${seasonNumber}`);
  return data;
};

const searchMulti = async (query, page = 1) => {
  const p = parseInt(page);
  const { data } = await tmdbApi.get('/search/multi', { params: { query, page: p } });
  const results = (data.results ?? [])
    .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
    .slice(0, 20);
  return {
    page: data.page ?? p,
    results,
    total_pages: data.total_pages ?? 1,
    total_results: data.total_results ?? 0
  };
};

const searchSuggestions = async (query) => {
  const { data } = await tmdbApi.get('/search/multi', { params: { query, page: 1 } });
  const results = (data.results ?? [])
    .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
    .slice(0, 8);
  return { results, total_results: data.total_results ?? 0 };
};

module.exports = {
  getTrendingMovies,
  getTrendingSeries,
  getPopularMovies,
  getPopularSeries,
  searchMulti,
  searchSuggestions,
  getMovieDetails,
  getSeasonDetails
};
