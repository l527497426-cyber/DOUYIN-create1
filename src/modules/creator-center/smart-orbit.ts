export const smartDistance = (index: number, phase: number, count: number) => {
  let distance = (index - phase) % count
  if (distance > count / 2) distance -= count
  if (distance < -count / 2) distance += count
  return distance
}

export const smartOrbGeometry = (index: number, phase: number, count: number, width = 371, expanded = false) => {
  if (expanded && width >= 640) return { distance: 0, size: Math.min(140, width / count - 24), offset: (index - (count - 1) / 2) * width / count }
  const distance = smartDistance(index, phase, count)
  const spacing = Math.max(1, Math.min(1.2, width / 371))
  return {
    distance,
    size: 64 + 76 * Math.exp(-1.558 * distance * distance),
    offset: (101 * distance + 19 * Math.sin(Math.PI * distance / 2)) * spacing,
  }
}

// Shared clock keeps WebGL spheres, hit targets and labels moving together.
export const smartFloat = (index: number, time: number) => 6 + Math.sin(time * 0.001 * (0.82 + index * 0.045) + index * 1.3) * 4
