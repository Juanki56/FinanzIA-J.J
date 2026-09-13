# FinanzIA — Backend

API en Express + TypeScript sobre Supabase (Postgres + Auth + RLS + Vault).

## Arranque

```bash
cp .env.example .env   # completa con tus credenciales reales
npm install
npm run dev             # http://localhost:3001
```

## Variables de entorno

| Variable | Para qué | Obligatoria |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Cliente normal, respeta RLS | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo la usa el cron de sincronización de correos (ver abajo). Salta RLS — nunca se usa fuera de ese cron. | No (sin ella, el cron simplemente no arranca; el resto del backend funciona igual) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | OAuth de Gmail (conexión de correo) | Sí, para la sección de Conexiones |
| `FRONTEND_URL` | A dónde redirige Google tras el consentimiento | Sí (default `http://localhost:5173`) |
| `SYNC_INTERVAL_MINUTOS` | Cada cuánto corre el cron de sincronización | No (default 30) |
| `GEMINI_API_KEY` | Sugerencia de categoría con IA | No (sin ella, ese endpoint responde 503, el resto sigue igual) |
| `GEMINI_MODEL` | Modelo de Gemini a usar | No (default `gemini-3.5-flash-lite` — Google renombra modelos cada pocos meses, confirma en [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) si deja de existir) |

## Funcionalidad principal

Cuentas, movimientos, transferencias, categorías, presupuestos, objetivos de ahorro y transacciones recurrentes — CRUD estándar por usuario, con RLS.

## Conexión con Gmail y captura automática de movimientos

**Cómo funciona:**
1. El usuario conecta su Gmail desde el frontend (OAuth, `GET /api/conexiones/google` → redirect a Google → `GET /api/conexiones/google/callback`). Tokens cifrados en Supabase Vault, nunca en texto plano.
2. El usuario elige una **cuenta predeterminada** (`PATCH /api/conexiones/:id` con `cuenta_predeterminada_id`) — es la cuenta de FinanzIA a la que se atribuyen los movimientos detectados. Sin esto configurado, sincronizar falla con un 400 explicando qué falta.
3. La sincronización (`services/sincronizacion.service.ts`) lee los correos de Bancolombia no vistos, los parsea con regex (`parsers/bancolombia.ts` — sin IA, sin costo), busca una categoría en `reglas_categorizacion` si alguna coincide, y crea el movimiento con `estado: 'pending'` y `requiere_revision: true` **siempre** — nunca confirma nada automáticamente.
4. Cada correo queda registrado en `fuentes_movimiento` (deduplicado por hash del contenido), con `estado_procesamiento` en `pending | processed | ignored | error`.

**Dos formas de disparar la sincronización:**
- **Manual**: botón "Sincronizar ahora" en la pantalla de Conexiones del frontend (`POST /api/conexiones/:id/sincronizar`).
- **Automática**: un cron (`node-cron`, cada `SYNC_INTERVAL_MINUTOS`) que recorre las conexiones activas de todos los usuarios usando la `service_role key`.

**Importante — el cron automático solo corre mientras este proceso de Node esté vivo.** No es un servicio aparte: si cierras el `npm run dev` o el servidor se reinicia, el cron se detiene con él. Ver la sección de despliegue más abajo — esto tiene implicaciones si despliegas en una plataforma serverless.

**Reglas de categorización** (`GET/POST/PATCH/DELETE /api/reglas-categorizacion`): el usuario puede crear reglas tipo "si el comercio contiene 'Spotify', usar categoría Suscripciones" (`campo_objetivo`: `comercio | descripcion | remitente | asunto`; `operador`: `equals | contains | starts_with | ends_with`, siempre insensible a mayúsculas; `prioridad`, número más bajo se evalúa primero).

**Nequi**: todavía no tiene parser — el registro de bancos está diseñado para agregar `parsers/nequi.ts` sin tocar el de Bancolombia cuando haya ejemplos reales.

## Sugerencia de categoría con IA (Gemini, opcional)

`POST /api/movimientos/:id/sugerir-categoria` — para un movimiento ya existente sin categoría, manda un payload **minimizado** (comercio, descripción, tipo, rango de monto — nunca el monto exacto ni datos del usuario) a Gemini, y guarda la sugerencia en `procesamientos_ia`. La IA **nunca** escribe `categoria_id` directamente — el usuario confirma con un `PATCH` normal a `/api/movimientos/:id`.

Nivel gratuito de Gemini: Google puede usar el contenido enviado para mejorar sus modelos (por eso la minimización de datos no es opcional). `GET /api/movimientos/:id/procesamientos-ia` muestra el historial de sugerencias de un movimiento.

## Arquitectura de seguridad — qué usa `service_role` y por qué

Todo el backend usa el cliente normal atado al JWT del usuario (`crearClienteConToken`), que respeta RLS. La **única** excepción es `src/cron/sincronizacionCron.ts`, que necesita listar conexiones de todos los usuarios sin que nadie esté logueado. Para eso:

- Usa `lib/supabaseAdmin.ts` (cliente de `service_role`), **exclusivo de ese archivo**.
- Llama a 3 funciones RPC pensadas para esto (`listar_conexiones_activas_servicio`, `leer_tokens_conexion_servicio`, `actualizar_tokens_conexion_servicio`), distintas de las RPC normales (que dependen de `auth.uid()` y no funcionan bajo `service_role`).
- Toda consulta a `movimientos` / `fuentes_movimiento` dentro de `services/sincronizacion.service.ts` lleva su propio `.eq('usuario_id', ...)` explícito, sin importar si el cliente ya lo filtraría — es la única parte del proyecto sin la red de RLS detrás.

## Despliegue

**Nada de esto está desplegado todavía.** Antes de hacerlo, dos cosas que hay que resolver primero — ver la conversación con Claude Code para el detalle completo:

1. El cron (`node-cron`) asume un proceso de Node siempre encendido. Eso **no funciona en plataformas serverless** (Vercel, y similares) sin cambios — ahí hay que migrar a un cron nativo de la plataforma que invoque un endpoint HTTP en vez de un scheduler en memoria.
2. `lib/oauthStateStore.ts` guarda el estado del flujo de OAuth de Gmail **en memoria del proceso**. Funciona bien con un solo proceso persistente; en cualquier plataforma con múltiples instancias o funciones efímeras, hay que moverlo a una tabla de Postgres o similar antes de desplegar, o el login con Google fallará de forma intermitente.
