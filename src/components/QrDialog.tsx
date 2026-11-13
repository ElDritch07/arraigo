import { Copy, Download, Share2 } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { PUBLIC_URL } from '../lib/links'
import { useUi } from '../state/ui'
import { Modal } from './Modal'
import { Button } from './ui'

// Código QR de la dirección pública para abrir la app desde otro móvil.
export function QrDialog() {
  const { t } = useT()
  const { closeModal, showToast } = useUi()
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(PUBLIC_URL, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#14212b', light: '#ffffff' },
    }).then(setSrc)
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PUBLIC_URL)
      showToast(t('toast.copied'))
    } catch {
      showToast(PUBLIC_URL)
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: t('app.name'), url: PUBLIC_URL })
    } catch {
      // la persona cerró el menú de compartir
    }
  }

  return (
    <Modal title={t('qr.title')} onClose={closeModal}>
      <div className="space-y-4 p-5 text-center">
        <p className="text-base text-muted">{t('qr.text')}</p>
        <div className="mx-auto flex size-64 items-center justify-center rounded-control border border-line bg-white p-2 sm:size-72">
          {src ? (
            <img src={src} alt={t('qr.alt')} className="size-full" />
          ) : (
            <span
              className="size-6 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none"
              role="status"
              aria-label={t('common.loading')}
            />
          )}
        </div>
        <p className="break-all text-base font-medium">
          <a href={PUBLIC_URL} className="text-accent-strong underline underline-offset-2">
            {PUBLIC_URL}
          </a>
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={copy}>
            <Copy size={18} aria-hidden />
            {t('qr.copy')}
          </Button>
          {src && (
            <a
              href={src}
              download="qr-arraigo.png"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 py-2 text-base font-medium text-ink hover:bg-canvas"
            >
              <Download size={18} aria-hidden />
              {t('qr.download')}
            </a>
          )}
          {typeof navigator.share === 'function' && (
            <Button className="sm:col-span-2" onClick={share}>
              <Share2 size={18} aria-hidden />
              {t('ev.share')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
