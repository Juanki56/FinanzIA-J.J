# FinanzIA

Aplicación personal de finanzas: ingresos, gastos, transferencias entre cuentas,
presupuestos y objetivos de ahorro. (Captura automática con IA y Gmail: fuera de
alcance por ahora, planeada para una fase futura.)

Este repositorio contiene dos proyectos independientes:

- **[`Backend/`](./Backend)** — API en Express + TypeScript sobre Supabase (Postgres + Auth).
- **[`Frontend/`](./Frontend)** — React + TypeScript + Vite, con Supabase Auth, TanStack Query,
  React Hook Form + Zod y Tailwind CSS.

Cada carpeta tiene su propio `package.json`, `.env.example` e instrucciones de
instalación en su respectivo README.

## Arranque rápido

```bash
# Backend (puerto 3001)
cd Backend
cp .env.example .env   # completa con tus credenciales de Supabase
npm install
npm run dev

# Frontend (puerto 5173), en otra terminal
cd Frontend
cp .env.example .env   # completa con las mismas credenciales de Supabase
npm install
npm run dev
```
