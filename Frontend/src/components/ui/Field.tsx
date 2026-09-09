import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { clsx } from 'clsx'

const baseFieldClasses =
  'w-full rounded-xl bg-bg-deep/60 border border-white/10 px-3.5 py-2.5 text-ink-100 placeholder:text-ink-500 outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50'

interface WrapperProps {
  label?: string
  error?: string
  hint?: string
  children: ReactNode
  required?: boolean
}

export function FieldWrapper({ label, error, hint, children, required }: WrapperProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-ink-200">
          {label}
          {required && <span className="text-coral-400"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-coral-400">{error}</span>}
    </label>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, required, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <input
        ref={ref}
        className={clsx(baseFieldClasses, error && 'border-coral-500/60 focus:border-coral-400 focus:ring-coral-500/30', className)}
        {...props}
      />
    </FieldWrapper>
  )
)
Input.displayName = 'Input'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, required, children, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <select
        ref={ref}
        className={clsx(baseFieldClasses, 'appearance-none bg-[image:none]', error && 'border-coral-500/60', className)}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  )
)
Select.displayName = 'Select'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, required, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <textarea
        ref={ref}
        className={clsx(baseFieldClasses, 'min-h-[80px] resize-y', error && 'border-coral-500/60', className)}
        {...props}
      />
    </FieldWrapper>
  )
)
Textarea.displayName = 'Textarea'
