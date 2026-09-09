# FinanzIA · Frontend

Frontend de FinanzIA: una app personal de finanzas con una vibra gaming/anime en
lugar de la típica estética bancaria. Consume la API de `Backend/` tal como está,
usando Supabase Auth para login y JWT como bearer token en cada request.

## Stack

- React + TypeScript + Vite
- Supabase Auth (`@supabase/supabase-js`) — login con email/password
- TanStack Query para todo el estado de servidor (nada de `useState` a mano para loading/error)
- React Hook Form + Zod para formularios y validación
- Tailwind CSS v4 + Framer Motion para estilos y micro-interacciones
- React Router para las rutas protegidas

## Configuración

1. Copia `.env.example` a `.env` y completa las variables:

   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_API_URL=http://localhost:3001/api
   ```

   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` deben coincidir con los mismos
   valores de Supabase que usa `Backend/.env` (`SUPABASE_URL` / `SUPABASE_ANON_KEY`).

2. Instala dependencias y levanta el servidor de desarrollo:

   ```bash
   npm install
   npm run dev
   ```

   El backend (`Backend/`) debe estar corriendo en paralelo con `npm run dev` en
   `http://localhost:3001`.

## Scripts

- `npm run dev` — servidor de desarrollo (Vite)
- `npm run build` — type-check (`tsc -b`) + build de producción
- `npm run lint` — ESLint
- `npm run preview` — sirve el build de producción localmente

## Estructura

```
src/
  components/    Componentes de UI reutilizables y por feature (accounts, movements, ...)
  context/       AuthContext (sesión de Supabase)
  hooks/         Hooks de TanStack Query por recurso de la API (useCuentas, useMovimientos, ...)
  lib/           Clientes de Supabase, fetch wrapper de la API, QueryClient
  pages/         Una página por ruta
  types/         Tipos que reflejan uno a uno los recursos del backend
  utils/         Formato de moneda/fecha, metadatos de UI, helpers varios
```

## Notas importantes

- El perfil de FinanzIA (`GET /api/me`) se crea del lado del backend/Supabase al
  registrarse; si un usuario recién autenticado todavía no tiene perfil vinculado
  (`404`), se muestra una pantalla de espera con reintento en vez de fallar.
- `saldo_inicial` de una cuenta es inmutable después de creada, y `saldo_actual`
  lo calcula el backend — el frontend nunca los edita directamente.
- "Eliminar" una cuenta en realidad la archiva (`PATCH { activa: false }`).
- Las transferencias no se pueden editar una vez creadas; solo se pueden cancelar
  (lo que revierte el efecto en los saldos) y crear una nueva.
- Todavía no hay nada de IA, Gmail ni categorización automática — eso llega en
  una fase posterior, fuera del alcance de este frontend.
