export function damp(current, target, smoothing, delta) {
  return current + (target - current) * (1 - Math.exp(-smoothing * delta));
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
