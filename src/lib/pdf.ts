// Generador mínimo de PDF de una página con texto (Helvetica, WinAnsi). Sin dependencias.

function esc(text: string) {
  let out = ''
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (ch === '\\' || ch === '(' || ch === ')') out += `\\${ch}`
    else if (code < 32) out += ' '
    else if (code > 126) out += code < 256 ? `\\${code.toString(8).padStart(3, '0')}` : '?'
    else out += ch
  }
  return out
}

export function makePdf(title: string, lines: string[]): Blob {
  const content: string[] = ['BT', '/F1 16 Tf', '56 780 Td', '22 TL', `(${esc(title)}) Tj`, '/F1 11 Tf', '16 TL', 'T*']
  for (const line of lines) content.push(`(${esc(line)}) '`)
  content.push('ET')
  const stream = content.join('\n')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
