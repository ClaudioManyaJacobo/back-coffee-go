const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const LANGUAGE = process.env.LANGUAGE;

// Configuración global de la instancia de axios para TMDB
const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
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

const searchMedia = async (query, page = 1) => {
  const p = parseInt(page);

  const [movieRes, tvRes] = await Promise.all([
    tmdbApi.get('/search/movie', { params: { query, page: p } }).catch(() => null),
    tmdbApi.get('/search/tv', { params: { query, page: p } }).catch(() => null)
  ]);

  const movies = (movieRes?.data?.results ?? []).map(m => ({ ...m, media_type: 'movie' }));
  const series = (tvRes?.data?.results ?? []).map(s => ({ ...s, media_type: 'tv' }));

  const results = [];
  const maxLen = Math.max(movies.length, series.length);
  for (let i = 0; i < maxLen; i++) {
    if (movies[i]) results.push(movies[i]);
    if (series[i]) results.push(series[i]);
  }

  return {
    page: p,
    results,
    total_pages: Math.max(movieRes?.data?.total_pages ?? 1, tvRes?.data?.total_pages ?? 1)
  };
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

module.exports = {
  getTrendingMovies,
  getTrendingSeries,
  getPopularMovies,
  getPopularSeries,
  searchMedia,
  getMovieDetails,
  getSeasonDetails
};
