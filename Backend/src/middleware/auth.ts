import type { Request, Response, NextFunction } from 'express';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { crearClienteConToken } from '../lib/supabase.js';

declare global {
  namespace Express {
    interface Request {
      supabase: SupabaseClient;
      authUser: User;
      usuario: {
        id: string;
        nombre: string;
        email: string;
        moneda_principal: string;
        zona_horaria: string;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta el token de autenticación' });
  }

  const token = authHeader.slice('Bearer '.length);
  const supabase = crearClienteConToken(token);

  // 1. Validar el JWT contra Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // 2. Buscar el usuario de FinanzIA vinculado.
  //    Esta consulta pasa por RLS: solo puede traer la fila propia (auth_user_id = auth.uid()).
  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('id, nombre, email, moneda_principal, zona_horaria')
    .single();

  if (usuarioError || !usuario) {
    return res.status(404).json({
      error: 'No existe un usuario de FinanzIA vinculado a esta cuenta de Supabase Auth',
    });
  }

  req.supabase = supabase;
  req.authUser = authData.user;
  req.usuario = usuario;

  next();
}