import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConfirmPasswordReset } from '../hooks'

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'At least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

function getResetErrorMessage(error: unknown): {
  field: 'root' | 'newPassword'
  message: string
} {
  if (isAxiosError(error)) {
    if (error.response?.status === 429) {
      return {
        field: 'root',
        message: 'Too many attempts. Please wait and try again.',
      }
    }
    if (error.response?.status === 400) {
      const data = error.response.data
      if (data && typeof data === 'object') {
        // Token error → the link is invalid or expired
        if ('token' in data) {
          const tokenErrors = (data as Record<string, unknown>).token
          if (
            Array.isArray(tokenErrors) &&
            typeof tokenErrors[0] === 'string'
          ) {
            return { field: 'root', message: tokenErrors[0] }
          }
          return {
            field: 'root',
            message: 'This reset link is invalid or has expired.',
          }
        }
        // Password policy error → show inline on the field
        if ('new_password' in data) {
          const pwErrors = (data as Record<string, unknown>).new_password
          if (Array.isArray(pwErrors) && typeof pwErrors[0] === 'string') {
            return { field: 'newPassword', message: pwErrors[0] }
          }
        }
      }
    }
  }
  return { field: 'root', message: 'Something went wrong. Please try again.' }
}

export function ResetPasswordForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const uid = searchParams.get('uid')
  const token = searchParams.get('token')
  const { mutateAsync, isPending } = useConfirmPasswordReset()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // If uid or token are missing the link is malformed — render an error state.
  if (!uid || !token) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-destructive" data-testid="invalid-link">
          This reset link is invalid. It may have been copied incorrectly.
        </p>
        <Link
          to="/forgot-password"
          className="text-foreground text-sm font-medium underline-offset-4 hover:underline"
        >
          Request a new link
        </Link>
      </div>
    )
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync({
        uid,
        token,
        newPassword: values.newPassword,
      })
      navigate('/login', { state: { passwordReset: true } })
    } catch (error) {
      const mapped = getResetErrorMessage(error)
      setError(mapped.field, { message: mapped.message })
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.newPassword)}
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p className="text-sm text-destructive">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" className="mt-2 w-full" disabled={isPending}>
        {isPending ? 'Resetting…' : 'Reset password'}
      </Button>
    </form>
  )
}
