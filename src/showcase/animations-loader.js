// Load Three.js only when the animations page is opened. Leaving the page
// disposes its scene and cancels any unfinished browser demonstration.
let disposeAnimations;

export function initializeAnimations() {
  disposeAnimations?.();
  const container = document.getElementById('animations-root');
  if (!container) return () => {};
  const events = new AbortController();
  let disposed = false;
  let pageHidden = false;
  let loading = false;
  let mount;
  let unmount;
  const active = () => !disposed && !pageHidden && !document.hidden && document.body.dataset.page === 'animations';

  async function sync() {
    if (!active()) {
      unmount?.();
      unmount = undefined;
      return;
    }
    if (unmount || loading) return;
    if (!mount) {
      loading = true;
      try {
        ({ mountAnimations: mount } = await import('./animations'));
      } catch {
        container.replaceChildren();
        const message = document.createElement('p');
        message.className = 'note';
        message.textContent = 'The animation could not load. Return to this tab to try again.';
        container.append(message);
      } finally {
        loading = false;
      }
    }
    if (active() && mount && !unmount) unmount = mount(container);
  }

  const options = { signal: events.signal };
  window.addEventListener('look:page', sync, options);
  document.addEventListener('visibilitychange', sync, options);
  window.addEventListener('pagehide', () => { pageHidden = true; sync(); }, options);
  window.addEventListener('pageshow', () => { pageHidden = false; sync(); }, options);
  sync();
  const cleanup = () => {
    disposed = true;
    events.abort();
    unmount?.();
    if (disposeAnimations === cleanup) disposeAnimations = undefined;
  };
  disposeAnimations = cleanup;
  return cleanup;
}

if (import.meta.hot) import.meta.hot.dispose(() => disposeAnimations?.());
