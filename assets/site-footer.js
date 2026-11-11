// Keep the scene and fixed navigation on the same visible viewport as mobile
// browser chrome expands/retracts. Ignore pinch zoom so navigation remains zoomable.
const viewport = window.visualViewport;
function syncViewport() {
  if (viewport && Math.abs(viewport.scale - 1) > .01) return;
  const height = viewport?.height ?? window.innerHeight;
  const bottom = (viewport?.offsetTop ?? 0) + height;
  document.documentElement.style.setProperty('--site-viewport-height', `${height}px`);
  document.documentElement.style.setProperty('--site-viewport-bottom-offset', `${window.innerHeight - bottom}px`);
}
syncViewport();
viewport?.addEventListener('resize', syncViewport, { passive: true });
viewport?.addEventListener('scroll', syncViewport, { passive: true });
window.addEventListener('resize', syncViewport, { passive: true });
window.addEventListener('pageshow', syncViewport);

const footer = document.querySelector('.site-footer');
const nav = footer?.querySelector('.site-footer-links');
if (footer && nav) {
  const compact = matchMedia('(max-width: 1200px)');
  const toggle = document.createElement('button');
  toggle.className = 'site-footer-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Open navigation');
  nav.id = 'footer-navigation';
  toggle.setAttribute('aria-controls', nav.id);
  toggle.innerHTML = '<span></span><span></span>';
  footer.insertBefore(toggle, nav);
  footer.dataset.menuReady = 'true';
  const panel = document.createElement('div');
  panel.className = 'mobile-menu';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Navigation');
  panel.innerHTML = '<div class="mobile-menu-header"><img src="/assets/planeroll-symbol-with-effects.svg" width="826" height="702" alt="Planeroll"></div>';
  document.body.append(panel);
  const measureFooter = () => panel.style.setProperty('--menu-footer-height', `${footer.getBoundingClientRect().height}px`);
  const footerObserver = new ResizeObserver(measureFooter);
  footerObserver.observe(footer);
  measureFooter();
  const main = document.querySelector('main');
  let isOpen = false;
  function setOpen(open, restoreFocus = false) {
    open = open && compact.matches;
    isOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    panel.dataset.open = String(open);
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    document.documentElement.classList.toggle('mobile-menu-open', open);
    if (main) main.inert = open;
    if (restoreFocus) toggle.focus();
  }
  function syncLayout() {
    setOpen(false);
    (compact.matches ? panel : footer).append(nav);
  }
  syncLayout();
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', event => {
    if (!isOpen) return;
    if (event.key === 'Escape') setOpen(false, true);
    if (event.key === 'Tab') {
      const last = nav.querySelector('a:last-child');
      const brand = footer.querySelector('.site-footer-brand');
      if (event.shiftKey && document.activeElement === brand) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); brand.focus(); }
    }
  });
  compact.addEventListener('change', syncLayout);
}
