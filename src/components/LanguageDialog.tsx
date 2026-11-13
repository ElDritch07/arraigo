import { useT } from '../i18n'
import { useUi } from '../state/ui'
import { LanguageChips } from './LanguageChips'
import { Modal } from './Modal'

export function LanguageDialog() {
  const { t } = useT()
  const { closeModal } = useUi()
  return (
    <Modal title={t('a11y.lang')} onClose={closeModal}>
      <div className="p-5">
        <LanguageChips />
      </div>
    </Modal>
  )
}
