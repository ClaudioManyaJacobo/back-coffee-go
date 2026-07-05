# GiMovie API — Backend (Express)

El motor principal de **GiMovie**, encargado de gestionar las peticiones a la API de TMDB, implementar caché en memoria y asegurar la protección de las llaves de acceso. Basado en **Node.js** y **Express**.

## 🛠️ Tecnologías Utilizadas

- **Express 5.2**: Framework minimalista para Node.js.
- **Axios**: Cliente HTTP para conectar con TMDB.
- **Dotenv**: Gestión de variables de entorno seguras.
- **CORS**: Habilitación para peticiones desde el frontend de Angular.
- **Caché en Memoria**: Implementación de un sistema TTL (Time-To-Live) para búsquedas optimizadas.

## 📁 Estructura del Proyecto

```bash
backend/
├── src/
│   ├── index.js          # Punto de entrada y definición de rutas
│   └── services/
│       └── tmdb.service.js # Lógica de comunicación con TMDB (Servicio)
├── .env                  # Variables de entorno (NO se sube a GitHub)
├── .gitignore            # Archivos excluidos de Git
└── package.json          # Dependencias y scripts
```

## 🚀 Instalación y Uso

### 1. Clonar y preparar
```bash
git clone https://github.com/ClaudioManyaJacobo/coffee-go.git
cd coffee-go/backend
npm install
```

### 2. Configuración (.env)
Crea un archivo llamado `.env` en la raíz de la carpeta `backend` con lo siguiente:
```env
TMDB_API_KEY=tu_api_key_aqui
PORT=3000
LANGUAGE=es-MX
```

### 3. Iniciar Servidor
```bash
# Modo Producción
npm start
```

## 🛰️ Endpoints Principales

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| **GET** | `/api/trending` | Películas y Series en tendencia. |
| **GET** | `/api/search?q=busqueda` | Búsqueda multiplataforma con caché. |
| **GET** | `/api/details/:id/:type` | Información detallada (actores, trailers, similares). |
| **GET** | `/api/details/tv/:id/season/:num` | Episodios de una temporada específica. |

## ☕ Optimización y Caché

El backend cuenta con un sistema de caché de 5 minutos (`CACHE_TTL_MS`) para las búsquedas. Esto reduce el consumo de la cuota de la API de TMDB y acelera la respuesta para el usuario final drásticamente.

---

Desarrollado con ❤️ para la comunidad de **GiMovie**.
