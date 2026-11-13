import { CornerDownRight, MessagesSquare, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import type { Post, PostKind } from '../lib/types'
import { useApp } from '../state/app'
import { useRequireAccount } from '../state/hooks'
import { Button, Chip, Field, fieldClass } from './ui'

// Tablón del evento: preguntas y comentarios de la gente, con respuestas del organizador.
export function EventBoard({ eventId }: { eventId: string }) {
  const { t, td, fullDate } = useT()
  const { postsFor, addPost } = useApp()
  const requireAccount = useRequireAccount()
  const [text, setText] = useState('')
  const [kind, setKind] = useState<PostKind>('question')
  const [replyTo, setReplyTo] = useState<Post | null>(null)
  const [error, setError] = useState('')

  const posts = postsFor(eventId)
  const threads = useMemo(() => {
    const top = posts.filter((p) => !p.replyTo)
    return top.map((p) => ({ post: p, replies: posts.filter((r) => r.replyTo === p.id) }))
  }, [posts])

  const authorOf = (p: Post) => p.author ?? (p.authorKey ? td(p.authorKey) : '')
  const bodyOf = (p: Post) => p.text ?? (p.textKey ? td(p.textKey) : '')

  const submit = () =>
    requireAccount(() => {
      if (text.trim().length < 3) {
        setError(t('bd.err'))
        return
      }
      setError('')
      addPost(eventId, text, replyTo ? 'comment' : kind, replyTo?.id)
      setText('')
      setReplyTo(null)
    })

  const renderMessage = (p: Post, nested?: boolean) => (
    <motion.li
      key={p.id}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={nested ? 'ms-6 border-s-2 border-line ps-3' : ''}
    >
      <p className="mb-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
        {nested && <CornerDownRight size={14} className="rtl:-scale-x-100" aria-hidden />}
        <span className="font-semibold text-ink">{authorOf(p)}</span>
        {p.organizer && <Chip>{t('bd.organizer')}</Chip>}
        {!nested && <Chip tone="outline">{p.kind === 'question' ? t('bd.kind.question') : t('bd.kind.comment')}</Chip>}
        <span>{fullDate(p.createdAt)}</span>
      </p>
      <p className="text-base">{bodyOf(p)}</p>
      {!nested && (
        <button
          type="button"
          onClick={() => setReplyTo(p)}
          className="mt-1 inline-flex min-h-11 items-center text-base font-medium text-accent-strong underline underline-offset-2"
        >
          {t('bd.reply')}
        </button>
      )}
    </motion.li>
  )

  return (
    <section aria-labelledby="board-h">
      <h3 id="board-h" className="flex items-center gap-2 text-lg font-semibold">
        <MessagesSquare size={18} className="text-accent" aria-hidden />
        {t('bd.title')}
        <span className="text-sm font-normal text-muted">({t('bd.count', { n: posts.length })})</span>
      </h3>
      <p className="mb-3 text-sm text-muted">{t('bd.intro')}</p>

      {threads.length === 0 ? (
        <p className="mb-3 rounded-control border border-dashed border-ink/30 px-3 py-4 text-center text-base text-muted">
          {t('bd.empty')}
        </p>
      ) : (
        <ul className="mb-4 space-y-4">
          <AnimatePresence initial={false}>
            {threads.map(({ post, replies }) => (
              <li key={post.id}>
                <ul className="space-y-3">
                  {renderMessage(post)}
                  {replies.map((r) => renderMessage(r, true))}
                </ul>
              </li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="space-y-3 rounded-control border border-line p-3"
      >
        {replyTo ? (
          <p className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
            {t('bd.replyingTo', { name: authorOf(replyTo) })}
            <button type="button" onClick={() => setReplyTo(null)} className="min-h-11 text-accent-strong underline underline-offset-2">
              {t('bd.cancelReply')}
            </button>
          </p>
        ) : (
          <fieldset>
            <legend className="mb-1.5 text-base font-medium">{t('bd.kind')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['question', 'comment'] as const).map((k) => (
                <label
                  key={k}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-control border px-3 text-base font-medium has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                    kind === k ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink'
                  }`}
                >
                  <input type="radio" name={`post-kind-${eventId}`} className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
                  {k === 'question' ? t('bd.kind.question') : t('bd.kind.comment')}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <Field label={t('bd.write')} error={error}>
          {(p) => (
            <textarea {...p} rows={3} className={`${fieldClass} resize-none`} value={text} maxLength={300} onChange={(e) => setText(e.target.value)} />
          )}
        </Field>
        <Button type="submit" className="w-full">
          <Send size={18} className="rtl:-scale-x-100" aria-hidden />
          {t('bd.send')}
        </Button>
      </form>
    </section>
  )
}
