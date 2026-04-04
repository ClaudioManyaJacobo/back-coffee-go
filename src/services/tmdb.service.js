const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const LANGUAGE = process.env.LANGUAGE;


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
  const targetCount = 20;
  const p = parseInt(page);
  const startIndex = (p - 1) * targetCount;
  const endIndex = startIndex + targetCount;

  // Calculamos las páginas de TMDB que necesitamos para rellenar.
  // Suponiendo que algunas son 'person', pedimos múltiples páginas en paralelo.
  // Pedimos desde la página 1 hasta la página requerida + un colchón extra.
  const maxTmdbPageToFetch = Math.max(2, p + Math.ceil(p / 2));
  const pagesToFetch = Array.from({ length: maxTmdbPageToFetch }, (_, i) => i + 1);

  const requests = pagesToFetch.map(pageNum =>
    tmdbApi.get('/search/multi', { params: { query, page: pageNum } }).catch(() => null)
  );

  const responses = await Promise.all(requests);

  let validItems = [];
  let totalTmdbPages = 1;

  for (const response of responses) {
    if (response && response.data) {
      totalTmdbPages = Math.max(totalTmdbPages, response.data.total_pages);
      const filtered = response.data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
      filtered.forEach(f => {
        if (!validItems.find(vi => vi.id === f.id && vi.media_type === f.media_type)) {
          validItems.push(f);
        }
      });
    }
  }

  const paginatedResults = validItems.slice(startIndex, endIndex);

  // Estimamos el total de páginas reales (restando un ~15% a ~20% de personas)
  const estimatedTotalPages = Math.max(1, Math.ceil(totalTmdbPages * 0.85));

  return {
    page: p,
    results: paginatedResults,
    total_pages: estimatedTotalPages
  };
};

const getMovieDetails = async (id, type = 'movie') => {
  const { data } = await tmdbApi.get(`/${type}/${id}`, {
    params: {
      append_to_response: 'videos,credits,similar,translations',
      include_video_language: 'es-MX,es,es-ES,en-US,en,null' // Trae trailers en orden de idioma
    }
  });

  // Fallback de sinopsis (overview)
  // Si en es-MX no tiene descripción, lo buscamos en los otros idiomas que trajimos
  if (!data.overview || data.overview === '') {
    if (data.translations && data.translations.translations) {
      // Buscar primero algún otro español y si no, inglés
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

module.exports = {
  getTrendingMovies,
  getTrendingSeries,
  getPopularMovies,
  getPopularSeries,
  searchMedia,
  getMovieDetails
};
