import { CheckCircle2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Wordmark } from '@/components/brand'
import { LoginForm } from '../components/login-form'

const gridMotif = {
  backgroundImage:
    'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
  backgroundSize: '34px 34px',
}

export function LoginPage() {
  const location = useLocation()
  const justReset = Boolean(
    (location.state as { passwordReset?: boolean } | null)?.passwordReset,
  )

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
            Turn spreadsheets into decisions.
          </h1>
          <p className="text-background/60 mt-3 text-base">
            Import your data and watch it become dashboards and AI-written
            reports.
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
              <CardTitle className="text-xl">Sign in</CardTitle>
              <CardDescription>Access your workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              {justReset && (
                <div
                  role="status"
                  className="border-border bg-muted mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm"
                >
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                  <span>Password reset. Sign in with your new password.</span>
                </div>
              )}
              <LoginForm />
            </CardContent>
          </Card>
          <p className="text-muted-foreground mt-6 text-center text-sm">
            New here?{' '}
            <Link
              to="/register"
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
