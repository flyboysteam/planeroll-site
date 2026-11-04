// Follow the viewer's local clock and locale's 12/24-hour convention.
// iOS omits the AM/PM marker from the status bar.
export function formatStatusTime(date, locale) {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })
    .formatToParts(date)
    .filter(part => part.type !== 'dayPeriod')
    .map(part => part.value)
    .join('')
    .trim();
}

export function mountStatusClock(element) {
  let timer;
  function stop() { clearTimeout(timer); }
  function sync() {
    stop();
    if (document.hidden) return;
    const now = new Date();
    element.textContent = formatStatusTime(now, navigator.language);
    element.dateTime = now.toISOString();
    // Align with the next real minute, avoiding interval drift and scroll work.
    timer = setTimeout(sync, 60000 - now.getTime() % 60000 + 20);
  }
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('focus', sync);
  window.addEventListener('pageshow', sync);
  window.addEventListener('pagehide', stop);
  sync();
  return () => {
    stop();
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('focus', sync);
    window.removeEventListener('pageshow', sync);
    window.removeEventListener('pagehide', stop);
  };
}
