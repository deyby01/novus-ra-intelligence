import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Wordmark } from '@/components/brand'
import { ResetPasswordForm } from '../components/reset-password-form'

const gridMotif = {
  backgroundImage:
    'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
  backgroundSize: '34px 34px',
}

export function ResetPasswordPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <aside className="bg-foreground text-background relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={gridMotif}
        />
        <Wordmark tone="dark" className="relative" />
        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Almost there — pick a new password.
          </h1>
          <p className="text-background/60 mt-3 text-base">
            Choose something strong you'll remember. You'll be signed in right
            after.
          </p>
        </div>
        <p className="text-background/40 relative text-xs">
          © Novus RA Intelligence
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Wordmark />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Choose a new password</CardTitle>
              <CardDescription>
                Make it at least 8 characters long.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResetPasswordForm />
            </CardContent>
          </Card>
          <p className="text-muted-foreground mt-6 text-center text-sm">
            Need a fresh link?{' '}
            <Link
              to="/forgot-password"
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Request a new one
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
