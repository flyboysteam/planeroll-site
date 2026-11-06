import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createScrollMotion, motionKeyframes, SCROLL_EASING } from '../prototype/scroll-motion.js';

test('native keyframes preserve smoothstep motion, holds, and reverse positions', () => {
  const stops = [0, .025, .37, .55, .8];
  const smooth = t => t * t * (3 - 2 * t);
  const range = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
  const position = p => 890 + (390 - 890) * smooth(range(p, .025, .37))
    + (385 - 390) * smooth(range(p, .55, .8));
  const frames = motionKeyframes(stops, p => position(p));
  for (let step = 0; step <= 800; step++) {
    const p = step / 1000;
    const left = Math.min(stops.length - 2, Math.max(0, stops.findLastIndex(stop => stop <= p)));
    const t = range(p, stops[left], stops[left + 1]);
    // Native cubic-bezier(1/3,0,2/3,1) has x=t, y=3t²-2t³.
    const cubic = 3 * (1 - t) * t * t + t ** 3;
    const actual = frames[left].transform + (frames[left + 1].transform - frames[left].transform) * cubic;
    assert.ok(Math.abs(actual - position(p)) < 1e-9, `position at ${p}`);
  }
  assert.deepEqual(frames.map(frame => frame.offset), stops.map(stop => stop / .8));
  assert.ok(frames.every(frame => frame.easing === SCROLL_EASING));
});

function environment(supported = true) {
  globalThis.ScrollTimeline = supported ? class ScrollTimeline { constructor(options) { this.options = options; } } : undefined;
  globalThis.CSS = { supports: () => supported };
  globalThis.document = { documentElement: {} };
  const created = [];
  const element = {
    animate(frames, options) {
      const animation = { frames, ...options, cancelled: false, cancel() { this.cancelled = true; } };
      animation.effect = { setKeyframes(value) { animation.frames = value; } };
      created.push(animation);
      return animation;
    },
  };
  return { element, created };
}
const config = { phoneFrames: [{ transform: 'translateY(100px)' }], cameraFrames: [{ transform: 'translateY(-100px)' }], start: 0, end: 2856 };

test('phone and feed share a timeline with absolute scroll ranges; resizing updates existing animations', () => {
  const { element, created } = environment();
  const motion = createScrollMotion(element, element);
  motion.update(config);
  assert.equal(motion.active, true);
  assert.equal(created.length, 2);
  assert.equal(created[0].timeline, created[1].timeline);
  assert.equal(created[0].rangeEnd, '2856px');
  assert.equal(created[0].duration, 'auto');
  assert.equal(created[0].fill, 'both');
  motion.update({ ...config, end: 3000 });
  assert.equal(created.length, 2);
  assert.equal(created[0].rangeEnd, '3000px');
  motion.cancel();
  assert.equal(motion.active, false);
  assert.ok(created.every(animation => animation.cancelled));
});

test('unsupported browsers keep JavaScript motion', () => {
  const { element, created } = environment(false);
  const motion = createScrollMotion(element, element);
  motion.update(config);
  assert.equal(motion.active, false);
  assert.equal(motion.available, false);
  assert.equal(created.length, 0);
});

test('partial native setup failure cancels the first layer and falls back without retrying', () => {
  const { element, created } = environment();
  const motion = createScrollMotion(element, { animate() { throw Error('Unavailable'); } });
  motion.update(config);
  assert.equal(motion.active, false);
  assert.equal(motion.available, false);
  assert.equal(created[0].cancelled, true);
  motion.update(config);
  assert.equal(created.length, 1);
});
