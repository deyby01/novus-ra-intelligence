import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRequestPasswordReset } from '../hooks'

const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

function getForgotPasswordErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 429) {
      return 'Too many attempts. Please wait and try again.'
    }
  }
  return 'Something went wrong. Please try again.'
}

export function ForgotPasswordForm() {
  const { mutateAsync, isPending } = useRequestPasswordReset()
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync({ email: values.email })
      setSubmitted(true)
    } catch (error) {
      setError('root', { message: getForgotPasswordErrorMessage(error) })
    }
  })

  if (submitted) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
            aria-hidden
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <p className="text-sm leading-relaxed" data-testid="confirmation">
          If that email is registered, we've sent a reset link. Check your
          inbox.
        </p>
        <Link
          to="/login"
          className="text-foreground text-sm font-medium underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <p className="text-muted-foreground text-sm">
        Enter the email address you used to create your account and we'll send
        you a link to reset your password.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" className="mt-2 w-full" disabled={isPending}>
        {isPending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  )
}
