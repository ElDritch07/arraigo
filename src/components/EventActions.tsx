import { Bookmark, Heart, Share2 } from 'lucide-react'
import { useT } from '../i18n'
import type { CommunityEvent } from '../lib/types'
import { eventTitle, useApp } from '../state/app'
import { useUi } from '../state/ui'

// Me gusta (ayuda a ver los más interesantes), guardar (para decidir más tarde) y compartir con un enlace al evento.
export function EventActions({ event }: { event: CommunityEvent }) {
  const { t, td } = useT()
  const { likesOf, hasLiked, toggleLike, hasSaved, toggleSave } = useApp()
  const { showToast } = useUi()
  const liked = hasLiked(event.id)
  const saved = hasSaved(event.id)
  const title = eventTitle(event, td)

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?event=${encodeURIComponent(event.id)}`
    const text = t('share.text', { title })
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      showToast(t('toast.copied'))
    } catch {
      showToast(url)
    }
  }

  const base =
    'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control border px-2 text-base font-medium transition-colors'
  const idle = 'border-line bg-surface text-ink hover:bg-canvas'
  const on = 'border-accent bg-accent-soft text-accent-strong'

  return (
    <div className="flex gap-2">
      <button
        type="button"
        aria-pressed={liked}
        aria-label={`${liked ? t('ev.liked') : t('ev.like')}, ${t('ev.likes', { n: likesOf(event.id) })}`}
        onClick={() => toggleLike(event.id)}
        className={`${base} ${liked ? on : idle}`}
      >
        <Heart size={18} aria-hidden className={liked ? 'fill-current' : ''} />
        <span className="tabular-nums">{likesOf(event.id)}</span>
      </button>
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => {
          toggleSave(event.id)
          if (!saved) showToast(t('toast.saved'))
        }}
        className={`${base} ${saved ? on : idle}`}
      >
        <Bookmark size={18} aria-hidden className={saved ? 'fill-current' : ''} />
        {saved ? t('ev.saved') : t('ev.save')}
      </button>
      <button type="button" onClick={share} className={`${base} ${idle}`}>
        <Share2 size={18} aria-hidden />
        {t('ev.share')}
      </button>
    </div>
  )
}
