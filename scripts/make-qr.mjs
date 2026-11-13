import QRCode from 'qrcode'

const url = process.argv[2] ?? 'https://eldritch07.github.io/arraigo/'
await QRCode.toFile('qr-arraigo.png', url, { width: 1024, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#14212b', light: '#ffffff' } })
await QRCode.toFile('qr-arraigo.svg', url, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#14212b', light: '#ffffff' } })
console.log('QR generado para', url)
