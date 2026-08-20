import React, { useState } from 'react'

type Props = {
  value?: number
  size?: number
  readonly?: boolean
  onChange?: (v: number) => void
  className?: string
}

export default function RatingStars({ value = 0, size = 18, readonly = false, onChange, className = '' }: Props) {
  const [hover, setHover] = useState(0)
  const [justRated, setJustRated] = useState<number | null>(null)
  const display = hover || value

  const pick = (e: React.MouseEvent<SVGSVGElement>, i: number) => {
    const { left, width } = e.currentTarget.getBoundingClientRect()
    return e.clientX < left + width / 2 ? i - 0.5 : i
  }

  const handleClick = (e: React.MouseEvent<SVGSVGElement>, i: number) => {
    if (readonly || !onChange) return
    const v = pick(e, i)
    onChange(v)
    setJustRated(i)
    setTimeout(() => setJustRated(null), 400)
  }

  return (
    <div
      className={`flex items-center gap-px ${className}`}
      onMouseLeave={() => !readonly && setHover(0)}
    >
      {[1, 2, 3, 4, 5].map(i => {
        const full = display >= i
        const half = !full && display >= i - 0.5
        const isJustRated = justRated === i
        return (
          <svg
            key={i}
            onMouseMove={e => !readonly && setHover(pick(e, i))}
            onClick={e => handleClick(e, i)}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            style={{
              width: size, height: size,
              cursor: readonly ? 'default' : 'pointer',
              transform: isJustRated ? 'scale(1.4)' : hover >= i - 0.5 && hover < i + 0.5 && !readonly ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: 'transform',
            }}
            className="shrink-0"
          >
            <defs>
              <linearGradient id={`h${i}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="#f5c842" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.84-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"
              fill={full ? '#f5c842' : half ? `url(#h${i})` : 'none'}
              stroke={full || half ? '#f5c842' : '#38385a'}
              strokeWidth={1.5}
              style={{ transition: 'fill 0.15s ease, stroke 0.15s ease' }}
            />
          </svg>
        )
      })}
      {!readonly && display > 0 && (
        <span className="ml-1.5 text-xs font-semibold text-accent tabular-nums"
              style={{ transition: 'all 0.15s ease' }}>
          {display}
        </span>
      )}
    </div>
  )
}
