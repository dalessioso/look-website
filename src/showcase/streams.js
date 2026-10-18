// Image display only. These connections never send robot commands.
export function parseStreamUrl(value, pageProtocol) {
  if (!value.trim()) return null;
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Use an HTTP(S) camera URL without embedded credentials.');
  }
  if (pageProtocol === 'https:' && url.protocol !== 'https:') {
    throw new Error('This hosted page requires HTTPS camera URLs. Use the local website for an HTTP SSH relay.');
  }
  return { url: url.href, snapshot: /\.(jpe?g|png|webp)$/i.test(url.pathname) };
}

export function createFeedConnection({ image, onState, setTimer = setTimeout, clearTimer = clearTimeout, now = Date.now }) {
  let source = null;
  let generation = 0;
  let refreshTimer;
  let deadlineTimer;
  let suspended = false;
  function clear() {
    generation++;
    clearTimer(refreshTimer);
    clearTimer(deadlineTimer);
    refreshTimer = deadlineTimer = undefined;
    image.onload = image.onerror = null;
    image.removeAttribute('src');
    image.hidden = true;
  }
  function request() {
    if (!source || suspended) return;
    clearTimer(refreshTimer);
    clearTimer(deadlineTimer);
    refreshTimer = deadlineTimer = undefined;
    const id = ++generation;
    const active = () => id === generation && source && !suspended;
    let connected = false;
    if (!source.snapshot) {
      // A fresh MJPEG connection must prove it has decoded a new image. In
      // particular, a stopped stream's final frame cannot satisfy the deadline.
      image.onload = image.onerror = null;
      image.removeAttribute('src');
      image.hidden = true;
      onState('Connecting');
    }
    function unavailable() {
      if (!active()) return;
      clear();
      onState('Unavailable');
      const retryGeneration = generation;
      refreshTimer = setTimer(() => {
        if (retryGeneration !== generation || !source || suspended) return;
        refreshTimer = undefined;
        request();
      }, 3000);
    }
    function ready() {
      if (!active() || connected) return;
      connected = true;
      clearTimer(deadlineTimer);
      deadlineTimer = undefined;
      image.hidden = false;
      onState('Connected');
      // Some browsers report a clean multipart EOF as load, not error. Renew
      // each connection after at most 15 seconds, without extending that bound
      // for repeated load events from the same request.
      refreshTimer = setTimer(() => {
        if (!active()) return;
        refreshTimer = undefined;
        request();
      }, source.snapshot ? 750 : 15000);
    }
    image.onload = ready;
    image.onerror = unavailable;
    const url = new URL(source.url);
    if (source.snapshot) url.searchParams.set('_look_frame', String(now()));
    image.src = url.href;
    deadlineTimer = setTimer(() => {
      if (!active()) return;
      deadlineTimer = undefined;
      // Some browsers keep MJPEG open without emitting load for each frame.
      if (!source.snapshot && image.naturalWidth > 0) ready();
      else unavailable();
    }, 10000);
  }
  return {
    connect(nextSource) {
      clear();
      source = nextSource;
      onState(source ? suspended ? 'Paused' : 'Connecting' : 'Not connected');
      request();
    },
    disconnect() {
      clear();
      source = null;
      onState('Not connected');
    },
    setSuspended(value) {
      if (suspended === value) return;
      suspended = value;
      clear();
      if (!source) return;
      onState(suspended ? 'Paused' : 'Connecting');
      request();
    },
  };
}

let disposeStreams;
export function initializeStreams() {
  disposeStreams?.();
  const events = new AbortController();
  const listen = (target, type, fn) => target.addEventListener(type, fn, { signal: events.signal });
  const keys = ['wrist', 'overhead', 'user'];
  const states = {};
  const help = document.getElementById('stream-help');
  const feeds = Object.fromEntries(keys.map(key => [key, createFeedConnection({
    image: document.getElementById('feed-' + key),
    onState(state) {
      states[key] = state;
      const status = document.getElementById('status-' + key);
      status.textContent = state;
      status.classList.toggle('live', state === 'Connected');
      document.getElementById('empty-' + key).hidden = state === 'Connected';
      const connected = Object.values(states).filter(value => value === 'Connected').length;
      const activity = connected ? `${connected} feed${connected === 1 ? '' : 's'} connected`
        : Object.values(states).includes('Paused') ? 'Feeds paused'
        : Object.values(states).includes('Connecting') ? 'Connecting feeds'
        : Object.values(states).includes('Unavailable') ? 'Feeds unavailable' : 'No feeds connected';
      document.getElementById('activity').textContent = activity;
      document.querySelector('.connection .dot').classList.toggle('live', connected > 0);
    },
  })]));
  const pause = () => Object.values(feeds).forEach(feed => feed.setSuspended(document.hidden || document.body.dataset.page !== 'studio'));
  listen(document.getElementById('stream-form'), 'submit', event => {
    event.preventDefault();
    let sources;
    try {
      sources = Object.fromEntries(keys.map(key => [key, parseStreamUrl(document.getElementById('source-' + key).value, location.protocol)]));
    } catch (error) { help.textContent = error.message; return; }
    keys.forEach(key => feeds[key].connect(sources[key]));
    help.textContent = Object.values(sources).some(Boolean)
      ? 'Camera images refresh automatically. Feeds pause when this view is hidden and are not recorded here.'
      : 'Enter a camera source to connect a feed.';
  });
  listen(document.getElementById('disconnect-streams'), 'click', () => {
    Object.values(feeds).forEach(feed => feed.disconnect());
    help.textContent = 'Feeds disconnected.';
  });
  listen(document.getElementById('local-a2000'), 'click', () => {
    document.getElementById('source-wrist').value = '';
    document.getElementById('source-overhead').value = 'http://127.0.0.1:18771/side.jpg';
    document.getElementById('source-user').value = 'http://127.0.0.1:18771/front.png';
    help.textContent = location.protocol === 'https:'
      ? 'Local relay addresses filled in. Open the local HTTP website to use these SSH feeds; Vercel requires an HTTPS relay.'
      : 'A2000 workspace and glasses sources filled in. Start the SSH tunnel, then select Connect feeds. The wrist source is unavailable.';
  });
  listen(document, 'visibilitychange', pause);
  listen(window, 'look:page', pause);
  listen(window, 'pagehide', () => Object.values(feeds).forEach(feed => feed.setSuspended(true)));
  listen(window, 'pageshow', pause);
  pause();
  const cleanup = () => { events.abort(); Object.values(feeds).forEach(feed => feed.disconnect()); };
  disposeStreams = cleanup;
  return cleanup;
}
if (import.meta.hot) import.meta.hot.dispose(() => disposeStreams?.());
