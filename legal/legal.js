// Leave room to read the final paragraph above the fixed footer, including
// when its links wrap or browser text sizing changes. Content needs no JS.
const footer = document.getElementById('site-footer');
const measureFooter = () => document.body.style.setProperty('--footer-height', `${footer.getBoundingClientRect().height}px`);
const observer = new ResizeObserver(measureFooter);
observer.observe(footer);
measureFooter();
window.addEventListener('pagehide', event => { if (!event.persisted) observer.disconnect(); });
