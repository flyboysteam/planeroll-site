// The app's saved-aircraft geometry, scaled from native points into the mock phone.
// References: AircraftViewPresentation, getFittedAircraftRunwayGeometry,
// runwayLineGeometry, and PaywallOnboardingScene's bundled Delta A330 anchors.
const slope = (555 - 904) / (751 - 86);
const geometry = { ground: { x: .14, y: .898 }, wingA: { x: .25, y: .229 }, wingB: { x: .882, y: .701 }, spanFt: 139.6 };
let artworkBounds;

function getBounds(image) {
  if (artworkBounds) return artworkBounds;
  if (!image.complete || !image.naturalWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] <= 24) continue;
      left = Math.min(left, x); right = Math.max(right, x + 1);
      top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
    }
  }
  artworkBounds = { left: left / canvas.width, right: right / canvas.width, top: top / canvas.height, bottom: bottom / canvas.height };
  return artworkBounds;
}

export function layoutPlanespot(root) {
  const width = root.clientWidth, height = root.clientHeight, unit = width / 440;
  root.style.setProperty('--spot-unit', `${unit}px`);
  const image = root.querySelector('.spot-aircraft img');
  const bounds = getBounds(image);
  if (!bounds || !width || !height) return;
  const imageWidth = (width - 64 * unit) / (bounds.right - bounds.left);
  const imageHeight = imageWidth * image.naturalHeight / image.naturalWidth;
  const left = 32 * unit - bounds.left * imageWidth;
  const top = height / 3 - (bounds.top + bounds.bottom) / 2 * imageHeight;
  const axis = Math.hypot(1, slope);
  Object.assign(image.style, {
    width: `${imageWidth}px`, height: `${imageHeight}px`,
    left: `${left + 8 * unit / axis}px`, top: `${top + 8 * unit * slope / axis}px`,
  });
  const anchor = { x: left + geometry.ground.x * imageWidth, y: top + geometry.ground.y * imageHeight };
  const span = Math.hypot((geometry.wingA.x - geometry.wingB.x) * imageWidth, (geometry.wingA.y - geometry.wingB.y) * imageHeight);
  drawRunway(root.querySelector('canvas'), width, height, anchor, span * 150 / geometry.spanFt);
}

function drawRunway(canvas, width, height, anchor, runwayWidth) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  const context = canvas.getContext('2d');
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  const scale = runwayWidth / 203.470981;
  const direction = { x: 1 / Math.hypot(1, slope), y: slope / Math.hypot(1, slope) };
  const across = { x: direction.x, y: -direction.y };
  const bleed = 32 * Math.max(1, scale);
  const line = offset => {
    const x = anchor.x + across.x * offset, y = anchor.y + across.y * offset;
    return [{ x: -bleed, y: y + (-bleed - x) * slope }, { x: width + bleed, y: y + (width + bleed - x) * slope }];
  };
  const [far, near] = [line(-runwayWidth / 2), line(runwayWidth / 2)];
  const polygon = points => {
    context.beginPath(); context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(p => context.lineTo(p.x, p.y)); context.closePath();
  };
  polygon([near[0], near[1], { x: near[1].x, y: near[1].y + 5 * scale }, { x: near[0].x, y: near[0].y + 5 * scale }]);
  context.fillStyle = 'rgba(255, 255, 255, .15)'; context.fill();
  context.save(); polygon([far[0], far[1], near[1], near[0]]); context.clip();
  const noise = document.createElement('canvas'); noise.width = noise.height = 32;
  const noiseContext = noise.getContext('2d'), pixels = noiseContext.createImageData(32, 32);
  let seed = 17;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
    pixels.data[i + 3] = (seed >>> 16) & 1 ? 36 : 15;
  }
  noiseContext.putImageData(pixels, 0, 0);
  context.fillStyle = context.createPattern(noise, 'repeat'); context.fillRect(0, 0, width, height); context.restore();
  function stroke(points, opacity, strokeWidth) {
    context.beginPath(); context.moveTo(points[0].x, points[0].y); context.lineTo(points[1].x, points[1].y);
    context.strokeStyle = `rgba(255,255,255,${opacity})`; context.lineWidth = strokeWidth;
    context.shadowColor = `rgba(255,255,255,${opacity * .35})`; context.shadowBlur = 4 * scale;
    context.stroke(); context.shadowBlur = 0;
  }
  stroke(line(-runwayWidth / 2 + 4 * scale), .25, 2 * scale);
  stroke(line(runwayWidth / 2 - 8 * scale), .25, 2 * scale);
  const dash = 48 * scale, pitch = dash * 2;
  const nearDistance = (-bleed - anchor.x) / direction.x, farDistance = (width + bleed - anchor.x) / direction.x;
  const atDistance = distance => ({ x: anchor.x + direction.x * distance, y: anchor.y + direction.y * distance });
  for (let i = Math.floor(nearDistance / pitch); i <= Math.ceil(farDistance / pitch); i++) {
    stroke([atDistance(i * pitch - dash / 2), atDistance(i * pitch + dash / 2)], 1, 3 * scale);
  }
}
