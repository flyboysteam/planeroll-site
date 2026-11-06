import { mountStatusClock } from './status-clock.js';
import { mountGradient } from './gradient.js?v=4';
import { createScrollMotion, motionKeyframes } from './scroll-motion.js?v=1';

// After the one-time entrance, positions and blends follow scroll progress.
// The return journey crossfades to the camera instead of reversing the shutter.
const $ = id => document.getElementById(id);
const unmountStatusClock = mountStatusClock($('phone-time'));
const elements = Object.fromEntries(['stage', 'phone', 'world', 'airfield', 'viewfinder', 'camera-window', 'camera-app', 'photo-review', 'captured-photo', 'spot-app', 'capture-shutter', 'shutter-blade-top', 'shutter-blade-bottom', 'shutter', 'final-screen', 'final-screen-symbol', 'final-screen-copy'].map(id => [id, $(id)]));
const gradient = mountGradient({ world: elements.world });
// Leave a beat after the scrim finishes, then reveal text before the phone.
const intro = { scrimDelay: 500, scrimDuration: 1200, revealGap: 250, textDuration: 900, stagger: 250, phoneDuration: 900 };
const textIntroStart = intro.scrimDelay + intro.scrimDuration + intro.revealGap;
const phoneIntroStart = textIntroStart + intro.stagger + intro.textDuration;
const scrollCueIntroStart = phoneIntroStart + intro.phoneDuration + 250;
elements.stage.style.setProperty('--scrim-reveal-delay', `${intro.scrimDelay}ms`);
elements.stage.style.setProperty('--scrim-reveal-duration', `${intro.scrimDuration}ms`);
elements.stage.style.setProperty('--intro-delay', `${textIntroStart}ms`);
elements.stage.style.setProperty('--intro-text-duration', `${intro.textDuration}ms`);
elements.stage.style.setProperty('--intro-stagger', `${intro.stagger}ms`);
elements.stage.style.setProperty('--scroll-cue-delay', `${scrollCueIntroStart}ms`);
const scene = {
  image: new Image(),
  // The supplied terminal photograph, aimed at the central Delta aircraft.
  // The background, live view, and captured photo share it.
  source: './prototype/airport-terminal-v2.png',
  // Keep the camera foreground's coordinate scale and the new image's aspect ratio.
  width: 3200,
  height: 3200 * 1632 / 2592,
  // Aim at the fuselage's visual center, below the top of the tail.
  target: { x: 1725, y: 1160 },
  captureWidth: 1240,
};
const cameraScene = {
  extension: new Image(),
  source: './prototype/airport-camera-ground.jpg',
  width: 3200,
  height: 4600,
  canvas: document.createElement('canvas'),
};
const CENTER_HOLD_SCROLL_PX = 1000;
const LIVERY_END_HOLD_SCROLL_PX = 250;
const FLEET_ZOOM_SCROLL_PX = 1100;
const FLEET_END_HOLD_SCROLL_PX = 300;
const FINAL_SCREEN_SCROLL_PX = 500;
const FINAL_SCREEN_DURATION_MS = 6000;
const FINAL_SCREEN_FADE_MS = 450;
const SPLASH_FLICKER_STEP_MS = 55;
const SPLASH_FLICKER_YELLOW_HOLD_MS = 150;
const SPLASH_FLICKER_PHASE_HOLD_MS = 250;
const SPLASH_FLICKER_TOTAL_MS = SPLASH_FLICKER_PHASE_HOLD_MS + 250 + SPLASH_FLICKER_STEP_MS * 5;
const fleetHome = $('collection-home');
const collectionNavigation = $('collection-navigation');
const fleetScreenshot = $('collection-screenshot');
const PHONE_VERTICAL_MARGIN_PX = 32;
const PHONE_HORIZONTAL_MARGIN_PX = 24;
const PHONE_PREFERRED_MIN_HEIGHT_PX = 440;
// The button press spans 3% of scene travel (1.5× its original 2%), ending at blade closure's start.
const timeline = { introHeadline: [0, 0.26], rise: [0.025, 0.37], press: [0.46, 0.49], shutter: [0.49, 0.55], fade: [0.51, 0.62], photoToSpot: [0.80, 0.92], settle: [0.55, 0.80] };
const clamp = value => Math.max(0, Math.min(1, value));
const range = (p, [start, end]) => clamp((p - start) / (end - start));
const smooth = value => value * value * (3 - 2 * value);
const mix = (a, b, amount) => a + (b - a) * amount;
// Planeroll's onboarding shutter uses cubic-bezier(.22, 1, .36, 1).
// Invert its x curve so it can be scrubbed directly by scroll progress.
function captureEase(progress) {
  let t = progress;
  for (let i = 0; i < 5; i++) {
    const x = ((0.58 * t - 0.24) * t + 0.66) * t;
    t = clamp(t - (x - progress) / (1.74 * t * t - 0.48 * t + 0.66));
  }
  return 1 - (1 - t) ** 3;
}
// Mobile splash easing: Easing.bezier(.23, 1, .32, 1).
function splashFlickerEase(progress) {
  let t = progress;
  for (let i = 0; i < 5; i++) {
    const x = ((.73 * t - .42) * t + .69) * t;
    t = clamp(t - (x - progress) / (2.19 * t * t - .84 * t + .69));
  }
  return 1 - (1 - t) ** 3;
}
function splashFlickerOpacity(elapsed) {
  const step = (start, from, to) => mix(from, to, splashFlickerEase(clamp((elapsed - start) / SPLASH_FLICKER_STEP_MS)));
  if (elapsed <= 0) return 0;
  if (elapsed < 55) return step(0, 0, 1);
  if (elapsed < 55 + SPLASH_FLICKER_YELLOW_HOLD_MS) return 1;
  if (elapsed < 260) return step(205, 1, .25);
  if (elapsed < 315) return step(260, .25, 1);
  if (elapsed < 555) return 1;
  if (elapsed < 610) return step(555, 1, .25);
  if (elapsed < 665) return step(610, .25, 1);
  if (elapsed < 720) return step(665, 1, .2);
  if (elapsed < SPLASH_FLICKER_TOTAL_MS) return step(720, .2, 1);
  return 1;
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const story = $('scroll-story');
const siteFooter = $('site-footer');
const introCopy = $('intro-copy');
story.style.setProperty('--center-hold-scroll', `${CENTER_HOLD_SCROLL_PX}px`);
const worldContext = elements.airfield.getContext('2d');
const cameraContext = elements.viewfinder.getContext('2d');
const photoContext = elements['captured-photo'].getContext('2d');
const planespotScreenshot = $('spot-screenshot');
const planespotBlankScreenshot = $('spot-blank-screenshot');
const planespotDetailsBackground = $('spot-details-background');
const planespotArtworkHeightPercent = parseFloat(getComputedStyle(elements['spot-app']).getPropertyValue('--spot-artwork-height'));
const phoneScreen = elements.phone.querySelector('.phone-screen');
const scrollMotion = createScrollMotion(elements.phone, elements.viewfinder);
let width = 0, height = 0, scale = 1, frame = 0, loaded = false, disposed = false, worldDirty = true;
let deviceWidth = 0, deviceHeight = 0;
let worldWidth = 0, worldHeight = 0;
let contentHeight = 0;
let liveryScanScrollPx = 1;
let pixelRatio = 1;
let previousScrollPosition = null, returningToCamera = false;
let cameraLayout = null;
let cameraRasterKey = null;
let scrollDistance = 1, sceneDistance = 1, storyTop = 0;
let measurementKey = null;
let introStartedAt = null, introComplete = false;
let captureStartedAt = null, captureHasSnapped = false;
let scrollCueDismissed = false;
let finalScreenStartedAt = null;
const finalScreenCopy = elements['final-screen-copy'].textContent.trim();

function resizeCanvas(canvas, cssWidth, cssHeight) {
  const w = Math.max(1, Math.round(cssWidth * pixelRatio));
  const h = Math.max(1, Math.round(cssHeight * pixelRatio));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  canvas.getContext('2d').setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}
function measure() {
  width = elements.stage.clientWidth;
  height = elements.stage.clientHeight;
  const nextWorldWidth = elements.world.clientWidth;
  const nextWorldHeight = elements.world.clientHeight;
  const nextPixelRatio = Math.min(devicePixelRatio || 1, 2);
  const footerHeightPx = siteFooter.getBoundingClientRect().height;
  const nextMeasurementKey = [width, height, nextWorldWidth, nextWorldHeight, nextPixelRatio, footerHeightPx, loaded].join(':');
  if (measurementKey === nextMeasurementKey) { requestRender(); return; }
  measurementKey = nextMeasurementKey;
  const worldResized = worldWidth !== nextWorldWidth || worldHeight !== nextWorldHeight || pixelRatio !== nextPixelRatio;
  worldWidth = nextWorldWidth;
  worldHeight = nextWorldHeight;
  gradient.update(worldWidth, worldHeight);
  pixelRatio = nextPixelRatio;
  deviceWidth = elements.phone.offsetWidth;
  deviceHeight = elements.phone.offsetHeight;
  contentHeight = Math.max(1, height - footerHeightPx);
  const availableHeight = Math.max(1, contentHeight - PHONE_VERTICAL_MARGIN_PX * 2);
  const availableWidth = Math.max(1, width - PHONE_HORIZONTAL_MARGIN_PX * 2);
  const preferredScale = Math.max(PHONE_PREFERRED_MIN_HEIGHT_PX / deviceHeight, Math.min(1, availableHeight / deviceHeight));
  // A 440px phone plus both margins needs 504px above the fixed footer.
  // Below that (or in very narrow windows), fitting takes priority over the soft floor.
  scale = Math.min(preferredScale, availableHeight / deviceHeight, availableWidth / deviceWidth);
  // One page-scroll pixel moves the beam one rendered screen pixel, including
  // when the device scales down. Keep a short completed-render hold afterward.
  liveryScanScrollPx = phoneScreen.clientHeight * scale * planespotArtworkHeightPercent / 100;
  story.style.setProperty('--livery-scroll', `${liveryScanScrollPx + LIVERY_END_HOLD_SCROLL_PX}px`);
  // Browser chrome may change the visible stage, but must not remap the
  // scroll journey mid-gesture. The mobile world uses the stable large viewport.
  sceneDistance = worldHeight * 4.2;
  scrollDistance = sceneDistance + CENTER_HOLD_SCROLL_PX + liveryScanScrollPx + LIVERY_END_HOLD_SCROLL_PX + FLEET_ZOOM_SCROLL_PX + FLEET_END_HOLD_SCROLL_PX + FINAL_SCREEN_SCROLL_PX;
  story.style.height = `${Math.ceil(height + scrollDistance)}px`;
  storyTop = story.offsetTop;
  if (worldResized) {
    resizeCanvas(elements.airfield, worldWidth, worldHeight);
    worldDirty = true;
    // Resizing clears a canvas. Repaint in this same callback so Safari cannot
    // composite a blank backing surface before the next animation frame.
    if (loaded) paintWorld();
  }
  // Match Planeroll's Add Plane camera layout at a scaled 440pt viewport.
  // Source: planeroll/app/(add-plane)/add-plane.tsx and constants/theme.ts.
  const feedWidth = elements.viewfinder.parentElement.clientWidth;
  const cameraUnit = feedWidth / 440;
  const screenHeight = elements.viewfinder.parentElement.clientHeight;
  const footerHeight = (144 + 32) * cameraUnit;
  const headerHeight = (62 + 44) * cameraUnit;
  const availableViewfinderHeight = screenHeight - 144 * cameraUnit - headerHeight;
  const viewfinderHeight = Math.min(feedWidth * 4 / 3, availableViewfinderHeight);
  const viewfinderWidth = viewfinderHeight * 3 / 4;
  const viewfinderTop = screenHeight - footerHeight - viewfinderHeight;
  cameraLayout = { width: feedWidth, height: screenHeight, viewfinderHeight, viewfinderTop, screenTop: phoneScreen.offsetTop + elements.phone.clientTop };
  elements['camera-app'].style.setProperty('--camera-unit', `${cameraUnit}px`);
  phoneScreen.style.setProperty('--phone-unit', `${cameraUnit}px`);
  phoneScreen.style.setProperty('--viewfinder-top', `${viewfinderTop}px`);
  phoneScreen.style.setProperty('--viewfinder-width', `${viewfinderWidth}px`);
  phoneScreen.style.setProperty('--viewfinder-height', `${viewfinderHeight}px`);
  const rasterKey = `${feedWidth}:${screenHeight}:${pixelRatio}`;
  if (loaded && cameraRasterKey !== rasterKey) {
    prepareViewfinder();
    paintCapturedPhoto();
    cameraRasterKey = rasterKey;
  }
  syncScrollMotion();
  requestRender();
}
function paintWorld() {
  // Minimum cover scale: preserve as much of the aircraft as possible without
  // exposing empty space at the viewport edges.
  const cover = Math.max(worldWidth / scene.width, worldHeight / scene.height);
  const centeredX = (width - scene.width * cover) / 2;
  const narrowCrop = clamp((1.35 - worldWidth / worldHeight) / 0.85);
  const cropX = width <= 600 ? width * .5 - scene.target.x * cover : mix(centeredX, width * .55 - scene.target.x * cover, narrowCrop);
  const x = Math.max(width - scene.width * cover, Math.min(0, cropX));
  const y = (worldHeight - scene.height * cover) / 2;
  if (worldDirty) {
    worldContext.clearRect(0, 0, worldWidth, worldHeight);
    // Offset only the scenery; retain the original projection for phone motion
    // and the independent viewfinder/captured-photo framing.
    worldContext.drawImage(scene.image, x - (width <= 600 ? 64 : 0), y - (width <= 600 ? 64 : 0), scene.width * cover, scene.height * cover);
    worldDirty = false;
  }
  return { cover, x, y, targetX: x + scene.target.x * cover, targetY: y + scene.target.y * cover };
}
function getCameraFrame() {
  const sourceWidth = scene.captureWidth;
  const sourceHeight = sourceWidth * cameraLayout.viewfinderHeight / cameraLayout.width;
  return {
    width: sourceWidth,
    height: sourceHeight,
    x: Math.max(sourceWidth / 2, Math.min(scene.width - sourceWidth / 2, scene.target.x)),
    y: Math.max(sourceHeight / 2, Math.min(scene.height - sourceHeight / 2, scene.target.y)),
  };
}
function buildCameraScene() {
  // The camera can look below the supplied photo. Cache the extended ground
  // once, retaining the original aircraft/sky and blending only the foreground.
  const ratio = .5;
  const canvas = cameraScene.canvas;
  canvas.width = cameraScene.width * ratio;
  canvas.height = cameraScene.height * ratio;
  const context = canvas.getContext('2d');
  context.drawImage(cameraScene.extension, 0, 0, canvas.width, canvas.height);
  // Register the generated foreground to the original sill/pavement lines.
  // The small scale correction was measured against the overlapping photo.
  context.drawImage(cameraScene.extension, -10 * ratio, 0, 3200 * .972 * ratio, 4800 * .972 * ratio);
  const original = document.createElement('canvas');
  original.width = scene.width * ratio;
  original.height = scene.height * ratio;
  const originalContext = original.getContext('2d');
  originalContext.drawImage(scene.image, 0, 0, original.width, original.height);
  const blend = originalContext.createLinearGradient(0, 0, 0, original.height);
  blend.addColorStop(0, '#fff');
  // Keep the entire final 3:4 viewfinder above the foreground blend, including
  // when the aim moves lower. Its half-height is at most 2/3 of captureWidth.
  const finalFrameBottom = scene.target.y + scene.captureWidth * 2 / 3;
  const blendStart = Math.min(1, Math.max(.94, (finalFrameBottom + 4) / scene.height));
  blend.addColorStop(blendStart, '#fff');
  blend.addColorStop(1, '#fff0');
  originalContext.globalCompositeOperation = 'destination-in';
  originalContext.fillStyle = blend;
  originalContext.fillRect(0, 0, original.width, original.height);
  context.drawImage(original, 0, 0);
}
function viewfinderTransform(phoneX, phoneY, framedX, framedY) {
  const framing = getCameraFrame();
  const ratio = cameraLayout.width / framing.width;
  // One browser pixel of phone movement produces one opposite browser pixel
  // of image movement inside it. The scene stays anchored in browser space:
  // there is no second easing curve, per-frame clamp, lag, or changing zoom.
  const windowCenter = cameraLayout.viewfinderTop + cameraLayout.viewfinderHeight / 2;
  const initialVisibleBottom = deviceHeight / 2 - cameraLayout.screenTop;
  const groundRoom = (cameraScene.height - framing.y - 2) * ratio - (initialVisibleBottom - windowCenter);
  const fullWindowRoom = (cameraScene.height - framing.y - 2) * ratio - cameraLayout.viewfinderHeight / 2;
  const phoneTravel = Math.max(1, (height - framedY) / scale);
  const revealTravel = cameraLayout.viewfinderTop + cameraLayout.viewfinderHeight - initialVisibleBottom;
  // Very tall windows may exceed the extra ground. Choose one constant gain
  // for the entire path, rather than changing speed when an edge is reached.
  const panGain = reducedMotion.matches ? 0 : Math.min(1, groundRoom / phoneTravel, fullWindowRoom / Math.max(1, phoneTravel - revealTravel));
  const imageX = cameraLayout.width / 2 - framing.x * ratio - (phoneX - framedX) / scale * panGain;
  const imageY = windowCenter - framing.y * ratio - (phoneY - framedY) / scale * panGain;
  // Pan a prepainted layer with the device. No canvas raster/upload per scroll frame.
  return `translate3d(${imageX}px,${imageY - cameraLayout.height}px,0)`;
}
function prepareViewfinder() {
  const ratio = cameraLayout.width / getCameraFrame().width;
  const imageWidth = cameraScene.width * ratio;
  const imageHeight = cameraScene.height * ratio;
  const skyHeight = cameraLayout.height;
  elements.viewfinder.style.width = `${imageWidth}px`;
  elements.viewfinder.style.height = `${imageHeight + skyHeight}px`;
  resizeCanvas(elements.viewfinder, imageWidth, imageHeight + skyHeight);
  cameraContext.clearRect(0, 0, imageWidth, imageHeight + skyHeight);
  // Cache the reflected sky above the original image, preserving the old crop.
  cameraContext.save();
  cameraContext.translate(0, skyHeight);
  cameraContext.scale(1, -1);
  cameraContext.drawImage(cameraScene.canvas, 0, 0, imageWidth, imageHeight);
  cameraContext.restore();
  cameraContext.drawImage(cameraScene.canvas, 0, skyHeight, imageWidth, imageHeight);
}

function paintCapturedPhoto() {
  if (!loaded) return;
  const canvas = elements['captured-photo'];
  const photoWidth = parseFloat(getComputedStyle(canvas).width);
  const photoHeight = photoWidth * 3 / 2;
  phoneScreen.style.setProperty('--photo-height', `${photoHeight}px`);
  phoneScreen.style.setProperty('--photo-top', `${(phoneScreen.clientHeight - photoHeight) / 2}px`);
  resizeCanvas(canvas, photoWidth, photoHeight);
  // Freeze the camera's final field of view, cropping its sides to 2:3.
  // This renders only the photographed scene, without camera chrome or grid.
  const framing = getCameraFrame();
  const sourceHeight = framing.height;
  const sourceWidth = sourceHeight * 2 / 3;
  // Camera framing uses scene units; drawImage's source crop uses native pixels.
  // Convert both axes so replacement images keep the same captured framing.
  const pixelsPerUnitX = scene.image.naturalWidth / scene.width;
  const pixelsPerUnitY = scene.image.naturalHeight / scene.height;
  photoContext.drawImage(scene.image,
    (framing.x - sourceWidth / 2) * pixelsPerUnitX,
    (framing.y - sourceHeight / 2) * pixelsPerUnitY,
    sourceWidth * pixelsPerUnitX, sourceHeight * pixelsPerUnitY,
    0, 0, photoWidth, photoHeight);
}
function phonePose(progress, introProgress = 1) {
  const rise = smooth(range(progress, timeline.rise));
  const settle = smooth(range(progress, timeline.settle));
  const projection = paintWorld();
  const phoneWidth = deviceWidth * scale, phoneHeight = deviceHeight * scale;
  const phoneStartY = width <= 600 ? contentHeight + phoneHeight / 6 : height;
  const targetX = width <= 600 ? width / 2 : Math.max(phoneWidth / 2 + PHONE_HORIZONTAL_MARGIN_PX, Math.min(width - phoneWidth / 2 - PHONE_HORIZONTAL_MARGIN_PX, projection.targetX));
  const targetY = Math.max(phoneHeight / 2 + PHONE_VERTICAL_MARGIN_PX, Math.min(contentHeight - phoneHeight / 2 - PHONE_VERTICAL_MARGIN_PX, projection.targetY));
  let x = mix(width * 0.5, targetX, rise);
  // Mobile starts with a third of the device visible above the footer.
  let y = mix(phoneStartY, targetY, rise);
  x = mix(x, width * 0.5, settle);
  y = mix(y, contentHeight * 0.5, settle);
  if (reducedMotion.matches) { x = width * 0.5; y = contentHeight * 0.5; }
  // Compose the entrance with the existing scroll pose. Applying the same y
  // to the camera keeps its scene projection matched to the moving device.
  // Scrolling can advance naturally without waiting for this timed entrance.
  y += (phoneHeight / 2 + 32) * (1 - captureEase(introProgress)) * (1 - rise);
  return { x, y, targetX, targetY };
}
function phoneTransform({ x, y }) {
  return `translate3d(${x - deviceWidth / 2}px,${y - deviceHeight / 2}px,0) scale(${scale})`;
}
function cameraTransform({ x, y, targetX, targetY }) {
  return viewfinderTransform(x, y, targetX, targetY);
}
function syncScrollMotion() {
  if (!loaded || !cameraLayout || !introComplete || reducedMotion.matches) {
    scrollMotion.cancel();
    elements.stage.dataset.motionDriver = 'javascript';
    return;
  }
  const stops = [0, ...timeline.rise, ...timeline.settle];
  scrollMotion.update({
    phoneFrames: motionKeyframes(stops, progress => phoneTransform(phonePose(progress))),
    cameraFrames: motionKeyframes(stops, progress => cameraTransform(phonePose(progress))),
    start: storyTop,
    end: storyTop + sceneDistance * timeline.settle[1],
  });
  elements.stage.dataset.motionDriver = scrollMotion.active ? 'native-scroll' : 'javascript';
}
function render(now) {
  frame = 0;
  if (disposed || !loaded || !width || !height) return;
  const scrollPosition = Math.max(0, scrollY - storyTop);
  if (!scrollCueDismissed && scrollPosition > 0) {
    scrollCueDismissed = true;
    elements.stage.dataset.scrollCueDismissed = 'true';
  }
  if (introStartedAt === null) {
    introStartedAt = now;
    // Restored scroll positions resume directly at their scene pose.
    introComplete = scrollPosition > 0 || reducedMotion.matches;
  }
  if (reducedMotion.matches) introComplete = true;
  const wasIntroComplete = introComplete;
  const phoneIntroProgress = introComplete ? 1 : clamp((now - introStartedAt - phoneIntroStart) / intro.phoneDuration);
  if (phoneIntroProgress === 1) introComplete = true;
  elements.stage.dataset.intro = introComplete ? 'complete' : 'running';
  if (introComplete && !reducedMotion.matches && scrollMotion.available && (!wasIntroComplete || !scrollMotion.active)) syncScrollMotion();
  const holdStart = sceneDistance * timeline.settle[1];
  // Insert a fixed 1,000 CSS-pixel pause at the centred pose. The scene clock
  // stops while native page scrolling continues, then resumes for the crossfade.
  const holdConsumed = Math.min(CENTER_HOLD_SCROLL_PX, Math.max(0, scrollPosition - holdStart));
  const holding = scrollPosition >= holdStart && scrollPosition <= holdStart + CENTER_HOLD_SCROLL_PX;
  const p = holding ? timeline.settle[1] : clamp((scrollPosition - holdConsumed) / sceneDistance);
  const pageProgress = clamp(scrollPosition / scrollDistance);
  if (previousScrollPosition !== null && scrollPosition < previousScrollPosition) returningToCamera = true;
  // Keep the return path when direction changes within the capture interval.
  // Rearm the shutter only after the camera is fully restored, before its press.
  if (p <= timeline.press[0]) {
    returningToCamera = false;
    captureStartedAt = null;
    captureHasSnapped = false;
  }
  // Upward scrolling cancels the clock; returning to the camera rearms it.
  if (returningToCamera) captureStartedAt = null;
  if (!returningToCamera && p >= timeline.shutter[0] && captureStartedAt === null) captureStartedAt = now;
  const captureElapsed = captureStartedAt === null ? 0 : now - captureStartedAt;
  if (!returningToCamera && captureStartedAt !== null && captureElapsed >= 180) captureHasSnapped = true;
  previousScrollPosition = scrollPosition;
  if (!scrollMotion.active) {
    const pose = phonePose(p, phoneIntroProgress);
    elements.phone.style.transform = phoneTransform(pose);
    elements.viewfinder.style.transform = cameraTransform(pose);
  }
  // Text and capture events still follow the same physical scroll positions.
  introCopy.style.opacity = 1 - range(p, timeline.introHeadline);
  const shutterProgress = returningToCamera ? range(p, timeline.shutter) : clamp(captureElapsed / 540);
  // Same close / hold / open proportions as PaywallOnboardingScene.tsx:
  // 180ms, 120ms, 240ms. Play the blades only on the forward capture path.
  const closing = clamp(shutterProgress / (180 / 540));
  const opening = clamp((shutterProgress - 300 / 540) / (240 / 540));
  const closure = returningToCamera ? 0 : captureEase(closing) * (1 - captureEase(opening));
  const bladeOffset = reducedMotion.matches ? 0 : (1 - closure) * 100;
  elements['shutter-blade-top'].style.transform = `translateY(${-bladeOffset}%)`;
  elements['shutter-blade-bottom'].style.transform = `translateY(${bladeOffset}%)`;
  elements['capture-shutter'].style.opacity = reducedMotion.matches ? closure : 1;
  elements['capture-shutter'].style.visibility = closure > 0 ? 'visible' : 'hidden';
  const pressProgress = clamp(captureElapsed / 180);
  const press = returningToCamera ? 0 : pressProgress < 0.4 ? captureEase(pressProgress / 0.4) : 1 - captureEase((pressProgress - 0.4) / 0.6);
  const snapped = captureHasSnapped;
  const photoReveal = !snapped ? 0 : returningToCamera ? smooth(shutterProgress) : 1;
  phoneScreen.dataset.capture = snapped ? 'photo' : 'camera';
  const captureFinished = returningToCamera || captureElapsed >= 540;
  const spotReveal = captureFinished ? smooth(range(p, timeline.photoToSpot)) : 0;
  // Start the loading treatment after the blades reopen. Stop its animations
  // while hidden, and let the existing screen crossfades reveal/hide it.
  elements['photo-review'].dataset.analyzing = photoReveal > 0 && captureFinished && spotReveal < 1 ? 'true' : 'false';
  elements.shutter.style.transform = `scale(${reducedMotion.matches ? 1 : 1 - press * 0.16})`;
  const backgroundFade = !snapped ? 0 : returningToCamera ? smooth(range(p, timeline.fade)) : smooth(clamp((captureElapsed - 180) / 600));
  elements.world.style.opacity = mix(1, 0.11, backgroundFade);
  // Scrolling upward in the collection must not restore the camera beneath
  // translucent layers. Restore it only when the photo itself fades back out.
  const cameraVisible = !snapped || (returningToCamera && photoReveal < 1);
  elements['camera-app'].style.opacity = cameraVisible ? 1 : 0;
  // Remove the live canvas from compositing after capture, rather than leaving
  // an opacity-zero canvas beneath the shutter/photo layers on mobile WebKit.
  elements['camera-app'].style.visibility = cameraVisible ? 'visible' : 'hidden';
  elements['photo-review'].style.opacity = photoReveal;
  elements['spot-app'].style.opacity = snapped ? spotReveal : 0;
  // After the photo crossfade and the existing settled-screen pause, scrub the
  // app's vertical reveal directly from scroll pixels. Returning restores the
  // blank below the beam, with no timed playback, easing, or direction latch.
  const liveryStart = sceneDistance + CENTER_HOLD_SCROLL_PX;
  const liveryProgress = snapped && captureFinished ? clamp((scrollPosition - liveryStart) / liveryScanScrollPx) : 0;
  // Latch for this page load: the details keep revealing even if scrolling
  // stops or reverses, and returning to the blank aircraft never covers them.
  if (liveryProgress > 0 && elements['spot-app'].dataset.detailsRevealed !== 'true') {
    elements['spot-app'].dataset.detailsRevealed = 'true';
  }
  const scanOpacity = Math.min(clamp(liveryProgress / 0.33), clamp((1 - liveryProgress) / 0.33));
  elements['spot-app'].style.setProperty('--spot-scan-y', `${reducedMotion.matches ? 0 : liveryProgress * planespotArtworkHeightPercent}%`);
  elements['spot-app'].style.setProperty('--spot-blank-opacity', reducedMotion.matches ? 1 - liveryProgress : 1);
  elements['spot-app'].style.setProperty('--spot-scan-opacity', reducedMotion.matches ? 0 : scanOpacity);
  // App step 3 → 4: 1100ms zoom to .22, with a quicker 650ms UI fade.
  // Map those proportions to scroll distance so the complete reveal reverses.
  const fleetStart = liveryStart + liveryScanScrollPx + LIVERY_END_HOLD_SCROLL_PX;
  const fleetProgress = snapped && captureFinished ? clamp((scrollPosition - fleetStart) / FLEET_ZOOM_SCROLL_PX) : 0;
  const fleetZoom = captureEase(fleetProgress);
  const fleetFade = captureEase(clamp(fleetProgress * 1100 / 650));
  fleetHome.style.opacity = fleetFade;
  collectionNavigation.style.opacity = snapped ? spotReveal : 0;
  fleetHome.style.setProperty('--fleet-scale', reducedMotion.matches ? 1 : mix(1 / .22, 1, fleetZoom));
  elements['spot-app'].style.transformOrigin = '50% 35%';
  elements['spot-app'].style.transform = reducedMotion.matches ? 'none' : `translateY(${cameraLayout.height * .214 * fleetZoom}px) scale(${mix(1, .22, fleetZoom)})`;
  elements['spot-app'].style.opacity = snapped ? spotReveal * (1 - fleetFade) : 0;
  // Keep the photo from showing through the shrinking planespot.
  elements['photo-review'].style.opacity = photoReveal * (1 - spotReveal);
  // Scrolling only starts or resets this closing sequence. Once triggered, its
  // fade, flicker, lift, and typewriter play on a single elapsed-time clock.
  const finalScreenTrigger = fleetStart + FLEET_ZOOM_SCROLL_PX + FLEET_END_HOLD_SCROLL_PX;
  const finalScreenTriggered = snapped && captureFinished && scrollPosition >= finalScreenTrigger;
  if (finalScreenTriggered && finalScreenStartedAt === null) finalScreenStartedAt = now;
  if (!finalScreenTriggered && finalScreenStartedAt !== null) finalScreenStartedAt = null;
  const finalElapsed = finalScreenStartedAt === null ? 0 : now - finalScreenStartedAt;
  const finalOverlayProgress = reducedMotion.matches ? Number(finalScreenTriggered) : captureEase(clamp(finalElapsed / FINAL_SCREEN_FADE_MS));
  const finalFlickerElapsed = finalElapsed - FINAL_SCREEN_FADE_MS;
  const finalFlicker = reducedMotion.matches ? Number(finalScreenTriggered) : splashFlickerOpacity(finalFlickerElapsed);
  const finalLiftStart = FINAL_SCREEN_FADE_MS + SPLASH_FLICKER_TOTAL_MS;
  const finalLiftProgress = reducedMotion.matches ? Number(finalScreenTriggered) : captureEase(clamp((finalElapsed - finalLiftStart) / 400));
  const finalTypeProgress = reducedMotion.matches ? Number(finalScreenTriggered) : clamp((finalElapsed - finalLiftStart - 400) / 4200);
  elements['final-screen'].style.visibility = finalScreenTriggered ? 'visible' : 'hidden';
  elements['final-screen'].style.opacity = finalOverlayProgress;
  elements['final-screen-symbol'].style.opacity = finalFlicker;
  elements['final-screen-symbol'].style.transform = `translate(-50%, -50%) translateY(${-60 * cameraLayout.width / 440 * finalLiftProgress}px)`;
  elements['final-screen-copy'].style.opacity = finalTypeProgress > 0 ? 1 : 0;
  const finalText = finalScreenTriggered ? finalScreenCopy.slice(0, Math.ceil(finalScreenCopy.length * finalTypeProgress)) : finalScreenCopy;
  if (elements['final-screen-copy'].textContent !== finalText) elements['final-screen-copy'].textContent = finalText;
  elements['final-screen-copy'].dataset.typing = finalScreenTriggered && finalTypeProgress > 0 && finalTypeProgress < 1 ? 'true' : 'false';
  elements.stage.dataset.fleetProgress = fleetProgress.toFixed(4);
  elements.stage.dataset.screen = finalOverlayProgress > .5 ? 'final' : fleetProgress > .5 ? 'home' : photoReveal < 0.5 ? 'camera' : spotReveal > 0.5 ? 'spot' : 'photo';
  elements.stage.dataset.capturePath = returningToCamera ? 'return' : 'forward';
  elements.stage.dataset.phase = p < 0.12 ? 'ready' : !snapped ? 'framing' : spotReveal === 0 ? 'captured' : 'collection';
  elements.stage.dataset.captureElapsed = captureElapsed.toFixed(0);
  elements.stage.dataset.progress = pageProgress.toFixed(4);
  elements.stage.dataset.sceneProgress = p.toFixed(4);
  elements.stage.dataset.holdStart = holdStart.toFixed(2);
  elements.stage.dataset.holdEnd = (holdStart + CENTER_HOLD_SCROLL_PX).toFixed(2);
  elements.stage.dataset.liveryProgress = liveryProgress.toFixed(4);
  elements.stage.dataset.liveryStart = liveryStart.toFixed(2);
  elements.stage.dataset.liveryEnd = (liveryStart + liveryScanScrollPx).toFixed(2);
  elements.stage.dataset.ready = 'true';
  if (!introComplete || (!returningToCamera && captureStartedAt !== null && captureElapsed < 780) || (finalScreenStartedAt !== null && finalElapsed < FINAL_SCREEN_DURATION_MS)) requestRender();
}
function requestRender() { if (!frame && !disposed) frame = requestAnimationFrame(render); }
const observer = new ResizeObserver(measure);
observer.observe(elements.stage);
observer.observe(siteFooter);
window.addEventListener('scroll', requestRender, { passive: true });
window.addEventListener('resize', measure, { passive: true });
window.addEventListener('pageshow', measure);
function onMotionPreferenceChange() { syncScrollMotion(); requestRender(); }
reducedMotion.addEventListener('change', onMotionPreferenceChange);
scene.image.src = scene.source;
cameraScene.extension.src = cameraScene.source;
Promise.all([document.fonts.ready, scene.image.decode(), cameraScene.extension.decode(), planespotScreenshot.decode(), planespotBlankScreenshot.decode(), planespotDetailsBackground.decode(), fleetScreenshot.decode()]).then(() => {
  if (disposed) return;
  buildCameraScene();
  loaded = true;
  measure();
}).catch(() => { $('scene-description').textContent = 'Preview imagery could not load. Refresh to try again.'; });
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  disposed = true;
  unmountStatusClock();
  cancelAnimationFrame(frame);
  observer.disconnect();
  window.removeEventListener('scroll', requestRender);
  window.removeEventListener('resize', measure);
  window.removeEventListener('pageshow', measure);
  reducedMotion.removeEventListener('change', onMotionPreferenceChange);
  scrollMotion.cancel();
});
