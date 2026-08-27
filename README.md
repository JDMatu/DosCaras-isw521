# Las Dos Caras

Las Dos Caras es una aplicación web de una sola página para presentar dos perspectivas opuestas sobre temas sociales, políticos, económicos y culturales. Permite consultar publicaciones, comparar sus posturas, revisar fuentes, participar en conversaciones y gestionar contenido según el rol del usuario.

Proyecto integrador final del curso **Programación en Ambiente Web I — ISW-521** de la Universidad Técnica Nacional.

## Integrantes

- Joseph Moya
- Juan Diego Matute Guerrero

## Tecnologías

- Vue 3 con Composition API y componentes `<script setup>`
- TypeScript en modo estricto
- Vue Router
- Pinia
- Tailwind CSS
- Vite
- REST API con autenticación JWT

## Requisitos previos

- Node.js `^20.19.0` o `>=22.12.0`
- npm
- Acceso al REST API de Las Dos Caras

## Instalación

1. Clonar el repositorio:

   ```bash
   git clone git@github.com:JDMatu/DosCaras-isw521.git
   cd DosCaras-isw521
   ```

2. Instalar las dependencias:

   ```bash
   npm install
   ```

3. Crear el archivo de entorno a partir del ejemplo:

   ```bash
   cp .env.example .env
   ```

4. Configurar en `.env` la URL del API:

   ```env
   VITE_API_URL=http://localhost:3000
   ```

5. Iniciar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

La terminal mostrará la URL local donde está disponible la aplicación.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Vite en modo desarrollo. |
| `npm run build` | Comprueba los tipos y genera el build de producción. |
| `npm run preview` | Sirve localmente el build de producción. |
| `npm run type-check` | Ejecuta la comprobación de TypeScript y componentes Vue. |
| `npm run lint` | Ejecuta ESLint sin permitir advertencias. |

## Rutas

| Ruta | Acceso | Descripción |
| --- | --- | --- |
| `/` | Público | Tablero principal. |
| `/login` | Invitados | Inicio de sesión. |
| `/register` | Invitados | Registro y activación. |
| `/categories/:id` | Público | Publicaciones de una categoría. |
| `/views/:id` | Público | Detalle de una publicación. |
| `/views/new` | Autenticado | Creación de una publicación. |
| `/views/:id/edit` | Autor o superadmin | Edición de una publicación. |
| `/authors/:id` | Público | Perfil público de un autor. |
| `/search?q=` | Público | Resultados de búsqueda. |
| `/profile` | Autenticado | Perfil privado del usuario. |
| `/admin/users` | Superadmin | Gestión de usuarios. |
| `/admin/categories` | Superadmin | Gestión de categorías. |
| `/admin/moderation` | Superadmin | Moderación de publicaciones. |
| `/403` | Público | Acceso denegado. |

## Persistencia local

Las operaciones de persistencia de la aplicación se centralizan en `src/lib/cache.ts`. Cada entrada contiene su valor y la fecha en que fue escrita. La única lectura directa ocurre en `index.html`, antes de montar Vue, para aplicar el tema visual sin destellos.

| Clave | Contenido | Vigencia |
| --- | --- | --- |
| `lasdoscaras_auth` | Token JWT y perfil del usuario. | Hasta logout o respuesta 401. |
| `lasdoscaras_categories` | Categorías disponibles. | TTL de 1 hora. |
| `lasdoscaras_hashtags` | Hashtags para sugerencias. | TTL de 30 minutos. |
| `lasdoscaras_filters` | Últimos filtros del tablero. | Permanente. |
| `lasdoscaras_favorites` | IDs de publicaciones favoritas. | Sincronizado al iniciar sesión. |
| `lasdoscaras_draft` | Borrador de una publicación nueva. | Hasta publicar o descartar. |
| `lasdoscaras_theme` | Preferencia de tema claro u oscuro. | Permanente. |
| `lasdoscaras_history` | Últimas 20 publicaciones visitadas. | Permanente. |
| `lasdoscaras_board` | Última página principal disponible para modo offline. | Se reemplaza con datos frescos. |

## Manejo de errores y conectividad

La comunicación con el API está centralizada en `src/lib/http.ts`. Esta capa:

- Agrega el token JWT cuando existe una sesión activa.
- Traduce errores del API a mensajes apropiados para el usuario.
- Limpia la sesión y redirige al login cuando recibe un 401 autenticado.
- Distingue errores de red de errores HTTP.
- Reintenta una vez las solicitudes GET que fallan por conectividad.
- Notifica al store de conexión cuando el API deja de responder o vuelve a estar disponible.

Cuando no hay conexión, la aplicación muestra un banner y utiliza la información previamente almacenada cuando está disponible. Al recuperar la conexión se solicitan nuevamente los datos frescos.

## Estructura del proyecto

```text
src/
├── assets/          Estilos globales
├── components/      Componentes reutilizables de UI y dominio
├── composables/     Lógica reactiva reutilizable
├── lib/             Cliente HTTP, caché y utilidades
├── router/          Rutas y guards de acceso
├── services/        Integración con los endpoints del API
├── stores/          Estado global de la aplicación
├── types/           Modelos TypeScript del API
└── views/           Pantallas asociadas a rutas
```

Los componentes no realizan llamadas directas con `fetch`; consumen funciones de la capa de servicios. Los stores administran únicamente estado compartido o persistente.

## Validación antes de entregar

Antes de crear un Pull Request o entregar una versión se recomienda ejecutar:

```bash
npm run lint
npm run type-check
npm run build
```
