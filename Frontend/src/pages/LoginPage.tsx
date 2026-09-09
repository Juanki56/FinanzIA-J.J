import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogIn } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().min(1, 'Ingresa tu correo').email('Ese correo no parece válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { session, signInWithPassword } = useAuth()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (session) {
    const to = (location.state as { from?: string } | null)?.from ?? '/dashboard'
    return <Navigate to={to} replace />
  }

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const { error } = await signInWithPassword(values.email, values.password)
    if (error) setServerError(error)
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl text-ink-100">¡Bienvenido de vuelta! 👋</h1>
      <p className="mt-1 text-sm text-ink-400">Inicia sesión para seguir con tu partida financiera.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
        <Input
          label="Correo"
          type="email"
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        {serverError && (
          <div className="rounded-xl bg-coral-500/10 px-3.5 py-2.5 text-sm text-coral-300 ring-1 ring-coral-500/30">
            {serverError}
          </div>
        )}

        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
          <LogIn className="size-4" />
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        ¿Todavía no tienes cuenta?{' '}
        <Link to="/signup" className="font-semibold text-violet-300 hover:text-violet-200">
          Crea una aquí
        </Link>
      </p>
    </AuthLayout>
  )
}
