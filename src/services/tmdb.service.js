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
  const targetCount = 20; // Queremos devolver aproximadamente 20 resultados por página
  const p = parseInt(page);
  const startIndex = (p - 1) * targetCount;
  const endIndex = startIndex + targetCount;

  // Calculamos las páginas de TMDB requeridas para rellenar los resultados
  // Dado que TMDB devuelve 'person' y otros tipos no deseados por el cliente, 
  // pedimos varias páginas en paralelo para filtrar.
  const maxTmdbPageToFetch = Math.max(2, p + Math.ceil(p / 2));
  const pagesToFetch = Array.from({ length: maxTmdbPageToFetch }, (_, i) => i + 1);

  const requests = pagesToFetch.map(pageNum =>
    tmdbApi.get('/search/multi', { params: { query, page: pageNum } }).catch(() => null)
  );

  const responses = await Promise.all(requests);

  let validItems = []; // Solo películas (movie) y series (tv)
  let totalTmdbPages = 1;

  for (const response of responses) {
    if (response && response.data) {
      totalTmdbPages = Math.max(totalTmdbPages, response.data.total_pages);
      const filtered = response.data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
      filtered.forEach(f => {
        // Evitar duplicados si aparecen en diferentes páginas
        if (!validItems.find(vi => vi.id === f.id && vi.media_type === f.media_type)) {
          validItems.push(f);
        }
      });
    }
  }

  const paginatedResults = validItems.slice(startIndex, endIndex);

  // Estimación del total de páginas útil tras el filtrado (~15% son personas)
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
