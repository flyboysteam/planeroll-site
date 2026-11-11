// The scroll-only screenshots should never compete with the initial hero.
// Keep one promise for repeated scroll events and decode every layer before
// crossfading away from the captured photo, including restored scroll positions.
export function createStoryImageLoader(images) {
  let pending;
  return {
    load() {
      pending ??= Promise.all(images.map(image => {
        image.fetchPriority = 'low';
        if (image.dataset.srcset) image.srcset = image.dataset.srcset;
        image.src = image.dataset.src;
        return image.decode();
      }));
      return pending;
    },
  };
}
