import { isAxiosError } from 'axios'
import { Check, Loader2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useChangePassword, useMe, useUpdateMe } from '@/features/auth/hooks'
import type { User } from '@/features/auth/types'

const inputClass =
  'border-g200 focus-visible:ring-g900 w-full rounded-[10px] border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2'
const labelClass = 'text-g700 text-[13px] font-medium'
const primaryButton =
  'bg-g900 font-display hover:bg-g800 inline-flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="border-g200 rounded-2xl border bg-white p-6">
      <div className="mb-4">
        <h2 className="font-display text-g900 text-[17px] font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        <p className="text-g500 mt-0.5 text-[13px]">{description}</p>
      </div>
      {children}
    </section>
  )
}

function ProfileSection({ user }: { user: User }) {
  const update = useUpdateMe()
  const [name, setName] = useState(user.name)
  const [saved, setSaved] = useState(false)
  const trimmed = name.trim()
  const dirty = trimmed !== user.name

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!dirty || update.isPending) return
    update.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setSaved(true)
          window.setTimeout(() => setSaved(false), 2000)
        },
      },
    )
  }

  return (
    <Section title="Profile" description="Your name and email.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="display-name">
            Display name
          </label>
          <input
            id="display-name"
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className={`${inputClass} text-g500 bg-g50`}
            value={user.email}
            readOnly
            disabled
          />
          <p className="text-g400 text-[12px]">
            Your email can&apos;t be changed for now.
          </p>
        </div>

        {update.isError && (
          <p className="text-[12.5px] text-red-600">
            Couldn&apos;t save your changes. Please try again.
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!dirty || update.isPending}
            className={primaryButton}
          >
            {update.isPending && (
              <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
            )}
            Save changes
          </button>
          {saved && (
            <span className="text-g500 inline-flex items-center gap-1 text-[13px]">
              <Check className="size-4 text-green-600" strokeWidth={1.5} />
              Saved
            </span>
          )}
        </div>
      </form>
    </Section>
  )
}

function passwordChangeError(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      { current_password?: unknown; new_password?: string[] } | undefined
    if (data?.current_password) return 'Your current password is incorrect.'
    if (Array.isArray(data?.new_password) && data.new_password[0]) {
      return data.new_password[0]
    }
  }
  return "Couldn't change your password. Please try again."
}

function SecuritySection() {
  const change = useChangePassword()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const [done, setDone] = useState(false)

  const canSubmit = Boolean(current && next && confirm) && !change.isPending

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setMismatch(false)
    if (!canSubmit) return
    if (next !== confirm) {
      setMismatch(true)
      return
    }
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setDone(true)
          setCurrent('')
          setNext('')
          setConfirm('')
          window.setTimeout(() => setDone(false), 3000)
        },
      },
    )
  }

  const errorMessage = mismatch
    ? "New passwords don't match."
    : change.isError
      ? passwordChangeError(change.error)
      : null

  return (
    <Section
      title="Password"
      description="Change the password you sign in with."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="current-password">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            className={inputClass}
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            className={inputClass}
            value={next}
            onChange={(event) => setNext(event.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="confirm-password">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            className={inputClass}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
          />
        </div>

        {errorMessage && (
          <p className="text-[12.5px] text-red-600">{errorMessage}</p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={!canSubmit} className={primaryButton}>
            {change.isPending && (
              <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
            )}
            Change password
          </button>
          {done && (
            <span className="text-g500 inline-flex items-center gap-1 text-[13px]">
              <Check className="size-4 text-green-600" strokeWidth={1.5} />
              Password changed
            </span>
          )}
        </div>
      </form>
    </Section>
  )
}

/** Account settings: edit the display name and change the password. */
export function SettingsPage() {
  const { data: user, isPending } = useMe()

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-7 pb-[34px] pt-[26px]">
      <div>
        <h1 className="font-display text-g900 text-[28px] font-semibold tracking-[-0.02em]">
          Account settings
        </h1>
        <p className="text-g500 mt-0.5 text-sm">
          Manage your profile and password.
        </p>
      </div>

      {isPending && <div className="bg-g100 h-64 animate-pulse rounded-2xl" />}
      {user && (
        <>
          <ProfileSection user={user} />
          <SecuritySection />
        </>
      )}
    </div>
  )
}
