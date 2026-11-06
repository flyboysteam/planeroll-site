// x(t) is linear for these control points, so y(t) exactly matches the
// JavaScript smoothstep t*t*(3 - 2*t), including on the return journey.
export const SCROLL_EASING = 'cubic-bezier(0.333333333333, 0, 0.666666666667, 1)';

export function motionKeyframes(stops, transformAt) {
  const end = stops.at(-1);
  return stops.map(progress => ({
    offset: progress / end,
    transform: transformAt(progress),
    easing: SCROLL_EASING,
  }));
}

// Both layers share the browser's scroll clock. No currentTime assignment or
// scroll-event transform writes: supported engines can sample on the scrolling
// thread, even when JavaScript is busy. Older engines keep the existing path.
export function createScrollMotion(phone, viewfinder) {
  let animations = [];
  let failed = false;
  let timeline;
  const supported = typeof ScrollTimeline !== 'undefined'
    && CSS.supports('animation-range', '0px 1px');
  function cancel() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }
  return {
    get active() { return animations.length === 2; },
    get available() { return supported && !failed; },
    cancel,
    update({ phoneFrames, cameraFrames, start, end }) {
      if (!supported || failed) return;
      try {
        timeline ??= new ScrollTimeline({ source: document.documentElement, axis: 'block' });
        const options = { timeline, duration: 'auto', fill: 'both', rangeStart: `${start}px`, rangeEnd: `${end}px` };
        if (!animations.length) {
          // Push separately so a failure on the second animation cancels both.
          animations.push(phone.animate(phoneFrames, { ...options, id: 'phone-scroll-motion' }));
          animations.push(viewfinder.animate(cameraFrames, { ...options, id: 'camera-scroll-motion' }));
        } else {
          animations.forEach((animation, index) => {
            animation.effect.setKeyframes(index === 0 ? phoneFrames : cameraFrames);
            animation.rangeStart = options.rangeStart;
            animation.rangeEnd = options.rangeEnd;
          });
        }
      } catch {
        cancel();
        failed = true;
      }
    },
  };
}
