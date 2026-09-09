export function traducirErrorAuth(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('already registered') || m.includes('already exists')) return 'Ya existe una cuenta con este correo.'
  if (m.includes('password should be at least')) return 'La contraseña es muy corta (mínimo 6 caracteres).'
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Ese correo no parece válido.'
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'
  return message
}
