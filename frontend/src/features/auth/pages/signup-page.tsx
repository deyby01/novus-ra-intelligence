import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Wordmark } from '@/components/brand'
import { SignupForm } from '../components/signup-form'

const gridMotif = {
  backgroundImage:
    'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
  backgroundSize: '34px 34px',
}

export function SignupPage() {
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
            Your first dashboard is minutes away.
          </h1>
          <p className="text-background/60 mt-3 text-base">
            Create a workspace, import a spreadsheet, and get instant KPIs,
            charts, and AI-written reports.
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
              <CardTitle className="text-xl">Create your workspace</CardTitle>
              <CardDescription>
                Start turning your spreadsheets into decisions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignupForm />
            </CardContent>
          </Card>
          <p className="text-muted-foreground mt-6 text-center text-sm">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
