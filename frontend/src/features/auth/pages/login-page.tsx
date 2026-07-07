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
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
