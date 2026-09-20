import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const outlines: Record<string, string[]> = {
  "data": [
    "M3 11.9896V14.5C3 17.7998 3 19.4497 4.02513 20.4749C5.05025 21.5 6.70017 21.5 10 21.5H14C17.2998 21.5 18.9497 21.5 19.9749 20.4749",
    "M19.9749 20.4749C21 19.4497 21 17.7998 21 14.5V11.9896C21 10.3083 21 9.46773 20.6441 8.74005C20.2882 8.01237 19.6247 7.49628 18.2976 6.46411L16.2976 4.90855",
    "M16.2976 4.90855C14.2331 3.30285 13.2009 2.5 12 2.5C10.7991 2.5 9.76689 3.30285 7.70242 4.90855L5.70241 6.46411C4.37533 7.49628 3.71179 8.01237 3.3559 8.74005C3 9.46773 3 10.3083 3 11.9896L3.0 11.9896",
    "M15.0002 17C14.2007 17.6224 13.1504 18 12.0002 18C10.8499 18 9.79971 17.6224 9.00018 17"
  ],
  "content": [
    "M6 17.9745C6.1287 19.2829 6.41956 20.1636 7.07691 20.8209C8.25596 22 10.1536 22 13.9489 22C17.7442 22 19.6419 22 20.8209 20.8209C22 19.6419 22 17.7442 22 13.9489C22 10.1536 22 8.25596 20.8209 7.07691C20.1636 6.41956 19.2829 6.1287 17.9745 6",
    "M2 10C2 6.22876 2 4.34315 3.17157 3.17157C4.34315 2 6.22876 2 10 2C13.7712 2 15.6569 2 16.8284 3.17157C18 4.34315 18 6.22876 18 10C18 13.7712 18 15.6569 16.8284 16.8284C15.6569 18 13.7712 18 10 18C6.22876 18 4.34315 18 3.17157 16.8284C2 15.6569 2 13.7712 2 10Z",
    "M5 18C8.42061 13.2487 12.2647 6.9475 18 11.6734"
  ],
  "datacenter": [
    "M7 17L7 13",
    "M12 17L12 7",
    "M17 17L17 11",
    "M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z"
  ],
  "income": [
    "M14 3H5C3.89543 3 3 3.89543 3 5C3 6.10457 3.89543 7 5 7H18C18 6.07003 18 5.60504 17.8978 5.22354C17.6204 4.18827 16.8117 3.37962 15.7765 3.10222C15.395 3 14.93 3 14 3Z",
    "M3 5V15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15V13C21 10.1716 21 8.75736 20.1213 7.87868C19.2426 7 17.8284 7 15 7H7",
    "M21 12H19C18.535 12 18.3025 12 18.1118 12.0511C17.5941 12.1898 17.1898 12.5941 17.0511 13.1118C17 13.3025 17 13.535 17 14C17 14.465 17 14.6975 17.0511 14.8882C17.1898 15.4059 17.5941 15.8102 18.1118 15.9489C18.3025 16 18.535 16 19 16H21"
  ],
  "service": [
    "M4.11593 12.2764L8.61593 3.27639C8.70063 3.107 8.87376 3 9.06315 3H17.121C17.5097 3 17.7497 3.42399 17.5498 3.75725L15.4585 7.24275",
    "M15.4585 7.24275C15.2585 7.57601 15.4986 8 15.8872 8H20.6909C21.1505 8 21.3666 8.56776 21.0235 8.87338L7.38117 21.0236C7.00034 21.3628 6.41568 20.981 6.57301 20.4959",
    "M6.57301 20.4959L8.79194 13.6543C8.8967 13.3312 8.6559 13 8.31633 13H4.56314C4.19145 13 3.94971 12.6088 4.11593 12.2764L4.11593 12.2764"
  ]
}

// Hover poses keep the outer silhouette anchored. Internal strokes lead; accents finish later.
const ease = [0.22, 1, 0.36, 1] as const
const spark = 'M0 -2.5Q.5 -.5 2.5 0Q.5 .5 0 2.5Q-.5 .5 -2.5 0Q-.5 -.5 0 -2.5Z'
const accents: Record<string, { x: number; y: number; kind: 'spark' | 'coin' }[]> = {
  data: [],
  content: [{ x: 16.5, y: 5.5, kind: 'spark' }],
  datacenter: [{ x: 19, y: 5, kind: 'spark' }],
  income: [{ x: 11.5, y: 4, kind: 'coin' }],
  service: [{ x: 20, y: 3, kind: 'spark' }, { x: 3.5, y: 19, kind: 'spark' }],
}

function hoverStroke(name: string, index: number, d: string) {
  let shape = d
  let length = 1
  let offset = 0
  if (name === 'data' && index === 3) {
    // Keep the house rigid; the interior smile gently straightens and curves back.
    shape = 'M15.0002 17C14.2007 16.8 13.1504 16.7 12.0002 16.7C10.8499 16.7 9.79971 16.8 9.00018 17'
  }
  if (name === 'content' && index === 2) {
    // Preserve both card outlines and the curve's endpoints throughout the stroke.
    shape = 'M5 18C9.5 17 10.5 7 18 11.6734'
  }
  if (name === 'datacenter') {
    if (index < 3) shape = ['M6 16L10 11', 'M10 11L14 14', 'M14 14L17 9'][index]
    else { length = .86; offset = .12 }
  }
  return { d: shape, pathLength: length, pathOffset: offset }
}

function cycleStroke(name: string, index: number, d: string) {
  const pose = hoverStroke(name, index, d)
  return {
    d: [d, pose.d, pose.d, d],
    pathLength: 1,
    pathOffset: 0,
    x: name === 'income' && index === 2 ? [0, .8, .8, 0] : 0,
    strokeWidth: name === 'service' ? [2, 1.7, 2.15, 2] : 2,
  }
}

export default function CreatorNavGlyph({ name, size = 20 }: { name: string; size?: number | string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(false)
  const reduced = useReducedMotion()
  useEffect(() => {
    const button = ref.current?.closest('button')
    if (!button) return
    const sync = () => setActive(button.matches(':hover, :focus-visible'))
    const events = ['pointerenter', 'pointerleave', 'focus', 'blur']
    events.forEach(event => button.addEventListener(event, sync))
    return () => events.forEach(event => button.removeEventListener(event, sync))
  }, [])
  const playing = active && !reduced
  return (
    <span ref={ref} aria-hidden="true" className="creator-nav-morph inline-flex shrink-0 text-[var(--sidenav-icon,#252632)]">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ overflow: 'visible' }}>
        {outlines[name].map((d, i) => (
          <motion.path
            key={i} initial={false}
            d={d} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            animate={playing ? name === 'datacenter' ? hoverStroke(name, i, d) : cycleStroke(name, i, d) : { d, pathLength: 1, pathOffset: 0, x: 0, strokeWidth: 2 }}
            transition={{ duration: reduced ? 0 : playing ? name === 'datacenter' ? .58 : 1.1 : .25, delay: playing ? i * .035 : 0, times: [0, .35, .55, 1], ease }}
          />
        ))}
        {accents[name].map(({ x, y, kind }, i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <motion.g
              initial={false}
              animate={playing && name !== 'datacenter' ? {
                opacity: [0, 1, 1, 0], scale: [.15, 1, 1, .15],
                y: kind === 'coin' ? [5, 0, 0, 5] : [1.5, 0, 0, 0],
                rotate: [-30, 0, 0, 15],
              } : { opacity: playing ? 1 : 0, scale: playing ? 1 : .15, y: playing ? 0 : kind === 'coin' ? 5 : 1.5, rotate: playing ? 0 : -40 }}
              transition={{ duration: reduced ? 0 : playing ? name === 'datacenter' ? .42 : .8 : .18, delay: playing ? .2 + i * .07 : 0, times: [0, .3, .6, 1], ease }}
            >
              {kind === 'coin' ? (
                <><circle r="2.4" fill="white" stroke="currentColor" strokeWidth="1.5" /><path d="M0 -1V1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></>
              ) : <path d={spark} fill="white" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />}
            </motion.g>
          </g>
        ))}
      </svg>
    </span>
  )
}
