import { Check, Share2 } from 'lucide-react'
import { useState } from 'react'

/**
 * Copies the dashboard's URL to the clipboard so it can be shared with a
 * teammate in the same workspace. Confirms inline ("¡Copiado!") for a moment —
 * no toast system in the app yet.
 */
export function ShareButton() {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be denied; leave the label unchanged.
    }
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="border-g200 text-g700 font-display hover:bg-g100 inline-flex items-center gap-1.5 rounded-[11px] border bg-white px-[14px] py-[9px] text-[12.5px] font-semibold transition-colors"
    >
      {copied ? (
        <Check className="size-[14px]" strokeWidth={1.5} />
      ) : (
        <Share2 className="size-[14px]" strokeWidth={1.5} />
      )}
      {copied ? '¡Copiado!' : 'Compartir'}
    </button>
  )
}
