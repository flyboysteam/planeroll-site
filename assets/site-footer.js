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
  function setOpen(open, restoreFocus = false) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.hidden = compact.matches && !open;
    if (restoreFocus) toggle.focus();
  }
  setOpen(false);
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  document.addEventListener('click', event => { if (!footer.contains(event.target)) setOpen(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
  });
  compact.addEventListener('change', () => setOpen(false));
}
