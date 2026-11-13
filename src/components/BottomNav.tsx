import { CalendarDays, HandHeart, MapPinned, MessageSquareText, UserRound } from 'lucide-react'
import { motion } from 'motion/react'
import { useT } from '../i18n'
import type { Tab } from '../lib/types'
import { useUi } from '../state/ui'

const ITEMS: { tab: Tab; icon: typeof CalendarDays; key: 'nav.events' | 'nav.volunteer' | 'nav.mailbox' | 'nav.points' | 'nav.profile' }[] = [
  { tab: 'events', icon: CalendarDays, key: 'nav.events' },
  { tab: 'volunteer', icon: HandHeart, key: 'nav.volunteer' },
  { tab: 'mailbox', icon: MessageSquareText, key: 'nav.mailbox' },
  { tab: 'points', icon: MapPinned, key: 'nav.points' },
  { tab: 'profile', icon: UserRound, key: 'nav.profile' },
]

export function BottomNav() {
  const { t } = useT()
  const { tab, setTab } = useUi()
  return (
    <nav
      aria-label={t('nav.label')}
      className="shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ tab: id, icon: Icon, key }) => {
          const active = tab === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-16 w-full flex-col items-center justify-center gap-1 px-0.5 py-2 text-xs font-medium leading-tight ${
                  active ? 'text-accent-strong' : 'text-muted'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-2 top-1 h-8 rounded-control bg-accent-soft"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    aria-hidden="true"
                  />
                )}
                <Icon size={22} className="relative" aria-hidden />
                <span className="relative max-w-full text-center">{t(key)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
