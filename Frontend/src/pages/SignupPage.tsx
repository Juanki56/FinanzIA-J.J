import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, MailCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

const schema = z
  .object({
    email: z.string().min(1, 'Ingresa tu correo').email('Ese correo no parece válido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
type FormValues = z.infer<typeof schema>

export function SignupPage() {
  const { session, signUp } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const { error, needsConfirmation } = await signUp(values.email, values.password)
    if (error) {
      setServerError(error)
      return
    }
    if (needsConfirmation) {
      setConfirmationSent(values.email)
    }
  }

  if (confirmationSent) {
    return (
      <AuthLayout>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500">
            <MailCheck className="size-7 text-white" />
          </div>
          <h1 className="font-display text-xl text-ink-100">¡Casi listo! Revisa tu correo 📬</h1>
          <p className="mt-2 text-sm text-ink-400">
            Enviamos un enlace de confirmación a <strong className="text-ink-200">{confirmationSent}</strong>.
            Confírmalo para poder iniciar sesión en FinanzIA.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block font-semibold text-violet-300 hover:text-violet-200"
          >
            Volver a iniciar sesión
          </Link>
        </motion.div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl text-ink-100">Crea tu cuenta 🚀</h1>
      <p className="mt-1 text-sm text-ink-400">Empieza a registrar tus finanzas en segundos.</p>

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
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {serverError && (
          <div className="rounded-xl bg-coral-500/10 px-3.5 py-2.5 text-sm text-coral-300 ring-1 ring-coral-500/30">
            {serverError}
          </div>
        )}

        <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
          <UserPlus className="size-4" />
          Crear cuenta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold text-violet-300 hover:text-violet-200">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
