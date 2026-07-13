import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWorkspaceStore } from '@/features/organizations/store'
import { useRegister } from '../hooks'
import { useAuthStore } from '../store'

const signupSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'At least 8 characters.'),
  organizationName: z.string().min(1, 'Enter your company or team name.'),
})

type SignupValues = z.infer<typeof signupSchema>

function getRegisterErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 429) {
      return 'Too many attempts. Please wait a minute and try again.'
    }
    if (error.response?.status === 400) {
      const data = error.response.data
      if (data && typeof data === 'object') {
        for (const value of Object.values(data)) {
          if (Array.isArray(value) && typeof value[0] === 'string') {
            return value[0]
          }
          if (typeof value === 'string') {
            return value
          }
        }
      }
    }
  }
  return 'Something went wrong. Please try again.'
}

export function SignupForm() {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useRegister()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setCurrentOrganization = useWorkspaceStore(
    (state) => state.setCurrentOrganization,
  )
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await mutateAsync(values)
      // Set tokens AND the brand-new workspace together, then land on the Home
      // hub — a fresh account has exactly one org, so we skip the picker.
      setTokens({ access: result.access, refresh: result.refresh })
      setCurrentOrganization(result.organization.id)
      navigate('/')
    } catch (error) {
      setError('root', { message: getRegisterErrorMessage(error) })
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="organizationName">Company or team name</Label>
        <Input
          id="organizationName"
          type="text"
          autoComplete="organization"
          placeholder="Acme Inc."
          aria-invalid={Boolean(errors.organizationName)}
          {...register('organizationName')}
        />
        {errors.organizationName && (
          <p className="text-sm text-destructive">
            {errors.organizationName.message}
          </p>
        )}
      </div>

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

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      {errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" className="mt-2 w-full" disabled={isPending}>
        {isPending ? 'Creating your workspace…' : 'Create workspace'}
      </Button>
    </form>
  )
}
