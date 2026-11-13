// Gota de agua con cara y un globo de diálogo: el agua nutre las plantas y el globo indica que es un asistente.
export function DropletIcon({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        d="M24 6 C24 6 7 24 7 34 A17 17 0 0 0 41 34 C41 24 24 6 24 6Z"
        className="fill-water"
      />
      <path d="M15 33 C15 29 17 26 20 23" className="stroke-white" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.55" />
      <circle cx="19" cy="35" r="2.3" className="fill-white" />
      <circle cx="29" cy="35" r="2.3" className="fill-white" />
      <path d="M19.5 40.5 Q24 44.5 28.5 40.5" className="stroke-white" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path
        d="M34 4 h14 a4 4 0 0 1 4 4 v8 a4 4 0 0 1 -4 4 h-7 l-5 5 v-5 h-2 a4 4 0 0 1 -4 -4 v-8 a4 4 0 0 1 4 -4z"
        className="fill-white stroke-water"
        strokeWidth="2"
      />
      <circle cx="37.5" cy="12" r="1.5" className="fill-water" />
      <circle cx="41.5" cy="12" r="1.5" className="fill-water" />
      <circle cx="45.5" cy="12" r="1.5" className="fill-water" />
    </svg>
  )
}
