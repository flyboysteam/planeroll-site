import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStoryImageLoader } from '../prototype/story-images.js';

function deferredImage() {
  let resolve, reject;
  const decoded = new Promise((yes, no) => { resolve = yes; reject = no; });
  const requests = [];
  const image = {
    dataset: { src: '/small.webp', srcset: '/small.webp 804w, /large.webp 1206w' },
    set src(value) { requests.push({ src: value, srcset: this.srcset }); },
    decode() { return decoded; },
  };
  return { image, resolve, reject, requests };
}

test('screenshots stay unfetched until requested and responsive sources are set before src', async () => {
  const first = deferredImage(), last = deferredImage();
  const loader = createStoryImageLoader([first.image, last.image]);
  assert.equal(first.requests.length, 0);
  const pending = loader.load();
  assert.equal(loader.load(), pending, 'repeated scroll events reuse the load');
  assert.deepEqual(first.requests, [{ src: '/small.webp', srcset: '/small.webp 804w, /large.webp 1206w' }]);
  let ready = false;
  pending.then(() => { ready = true; });
  first.resolve();
  await Promise.resolve();
  assert.equal(ready, false, 'do not expose an incomplete layered screenshot');
  last.resolve();
  await pending;
  assert.equal(ready, true);
});

test('a failed screenshot is reported so the caller can retain the captured photo', async () => {
  const frame = deferredImage();
  const loader = createStoryImageLoader([frame.image]);
  const pending = loader.load();
  frame.reject(new Error('Image unavailable'));
  await assert.rejects(pending, /Image unavailable/);
  assert.equal(loader.load(), pending, 'failure does not start a scroll-event request loop');
  assert.equal(frame.requests.length, 1);
});
