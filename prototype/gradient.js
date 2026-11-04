export const DEFAULT_GRADIENT = { end: { x: .060697, y: .422407 }, opacity: .7 };

// A CSS gradient's first stop projects through the top-left corner for this
// quadrant. A stop at this distance therefore passes through the chosen point.
export function gradientGeometry(settings, width, height) {
  const x = settings.end.x * width, y = settings.end.y * height;
  return {
    x, y,
    angle: 180 - Math.atan2(x, y) * 180 / Math.PI,
    distance: Math.max(1, Math.hypot(x, y)),
  };
}

export function mountGradient({ world }) {
  return {
    update(width, height) {
      const geometry = gradientGeometry(DEFAULT_GRADIENT, width, height);
      world.style.setProperty('--scrim-angle', `${geometry.angle}deg`);
      world.style.setProperty('--scrim-distance', `${geometry.distance}px`);
      world.style.setProperty('--scrim-opacity', DEFAULT_GRADIENT.opacity);
    },
  };
}
