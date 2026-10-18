import publishedRelay from './data/public-relay.json' with { type: 'json' };

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
function publicRelayConfig(config) {
  try {
    const base = new URL(config.baseUrl);
    const expiresAt = Date.parse(config.expiresAt);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !Number.isFinite(expiresAt)) return null;
    base.pathname = base.pathname.replace(/\/$/, '') + '/';
    return { base, expiresAt };
  } catch { return null; }
}

export function initializeStreams({ relay = publishedRelay, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  disposeStreams?.();
  const events = new AbortController();
  const listen = (target, type, fn) => target.addEventListener(type, fn, { signal: events.signal });
  const keys = ['wrist', 'overhead', 'user'];
  const states = {};
  const help = document.getElementById('stream-help');
  const publicButton = document.getElementById('connect-live-feeds');
  const publicHint = document.getElementById('public-relay-hint');
  const localButton = document.getElementById('local-a2000');
  const published = publicRelayConfig(relay);
  let expiryTimer;
  let sources = {};
  let automaticConnectionPending = true;
  let manuallyDisconnected = false;
  let pageHidden = false;
  let leaseEnded = false;
  const viewVisible = () => !pageHidden && !document.hidden && document.body.dataset.page === 'studio';
  const isPublishedSource = source => {
    if (!published || !source) return false;
    const url = new URL(source.url);
    return url.origin === published.base.origin && url.pathname.startsWith(published.base.pathname);
  };
  localButton.hidden = location.protocol === 'https:';
  publicButton.hidden = !published;
  publicButton.disabled = false;
  publicButton.textContent = 'Reconnect live feeds';
  publicHint.hidden = !published;
  if (published) publicHint.textContent = `Temporary live session until ${new Date(published.expiresAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}.`;
  else help.textContent = 'Add camera URLs below to connect a feed. No live session is configured.';

  const feeds = Object.fromEntries(keys.map(key => [key, createFeedConnection({
    image: document.getElementById('feed-' + key),
    setTimer, clearTimer, now,
    onState(state) {
      states[key] = state;
      const status = document.getElementById('status-' + key);
      status.textContent = state === 'Unavailable' ? 'Retrying' : state === 'Not connected' ? 'Disconnected' : state;
      status.classList.toggle('live', state === 'Connected');
      document.getElementById('empty-' + key).hidden = state === 'Connected';
      const message = document.getElementById('empty-message-' + key);
      if (message) message.textContent = state === 'Connecting'
        ? key === 'wrist' ? 'Waiting for a fresh wrist alignment frame…' : 'Connecting to the camera…'
        : state === 'Unavailable'
          ? key === 'wrist' ? 'No fresh wrist alignment frame yet. Retrying…' : 'Camera image unavailable. Retrying…'
          : state === 'Paused' ? 'Feed paused while this view is hidden.'
            : state === 'Connected' ? 'Camera image received.' : 'Feed disconnected.';
      const connected = Object.values(states).filter(value => value === 'Connected').length;
      const activity = connected ? `${connected} feed${connected === 1 ? '' : 's'} connected`
        : Object.values(states).includes('Paused') ? 'Feeds paused'
        : Object.values(states).includes('Connecting') ? 'Connecting feeds'
        : Object.values(states).includes('Unavailable') ? 'Retrying feeds' : 'No feeds connected';
      document.getElementById('activity').textContent = activity;
      document.querySelector('.connection .dot').classList.toggle('live', connected > 0);
    },
  })]));
  function checkLease() {
    if (!published || now() < published.expiresAt) return true;
    clearTimer(expiryTimer);
    expiryTimer = undefined;
    publicButton.disabled = true;
    publicButton.textContent = 'Live session ended';
    publicHint.textContent = 'This temporary camera session has ended.';
    let disconnected = false;
    for (const key of keys) {
      if (isPublishedSource(sources[key])) {
        feeds[key].disconnect();
        sources[key] = null;
        disconnected = true;
      }
    }
    if (disconnected || !leaseEnded) help.textContent = 'Live session ended. Temporary camera feeds have been disconnected.';
    leaseEnded = true;
    return false;
  }
  function scheduleExpiry() {
    if (!published || !checkLease()) return;
    expiryTimer = setTimer(() => {
      expiryTimer = undefined;
      if (checkLease()) scheduleExpiry();
    }, Math.min(published.expiresAt - now(), 2147483647));
  }
  const pause = () => {
    const leaseActive = checkLease();
    Object.values(feeds).forEach(feed => feed.setSuspended(!viewVisible()));
    if (viewVisible() && automaticConnectionPending && !manuallyDisconnected && leaseActive) {
      automaticConnectionPending = false;
      connectPublishedSources();
    }
  };
  function connectSources() {
    checkLease();
    let nextSources;
    try {
      nextSources = Object.fromEntries(keys.map(key => [key, parseStreamUrl(document.getElementById('source-' + key).value, location.protocol)]));
      if (published && now() >= published.expiresAt && Object.values(nextSources).some(isPublishedSource)) {
        throw new Error('Live session ended. This temporary relay is no longer available.');
      }
    } catch (error) { help.textContent = error.message; return; }
    sources = nextSources;
    keys.forEach(key => feeds[key].connect(sources[key]));
    help.textContent = Object.values(sources).some(Boolean)
      ? 'Camera images refresh automatically. Feeds pause when this view is hidden and are not recorded here.'
      : 'Enter a camera source to connect a feed.';
  }
  listen(document.getElementById('stream-form'), 'submit', event => {
    event.preventDefault();
    automaticConnectionPending = false;
    manuallyDisconnected = false;
    connectSources();
  });
  function connectPublishedSources() {
    if (!published || !checkLease()) return;
    const paths = { wrist: 'wrist.jpg', overhead: 'side.jpg', user: 'front.png' };
    let connected = 0;
    for (const key of keys) {
      const input = document.getElementById('source-' + key);
      // A preset must not replace an active custom feed or even an unsubmitted
      // custom URL. Those remain under the custom form's explicit control.
      if (sources[key] && !isPublishedSource(sources[key])) continue;
      if (input.value.trim()) {
        try {
          if (!isPublishedSource(parseStreamUrl(input.value, location.protocol))) continue;
        } catch { continue; }
      }
      const nextSource = parseStreamUrl(new URL(paths[key], published.base).href, location.protocol);
      input.value = nextSource.url;
      sources[key] = nextSource;
      feeds[key].connect(nextSource);
      connected++;
    }
    if (connected) help.textContent = 'Live camera images refresh automatically while this view is open. The wrist view appears when a fresh alignment image is available.';
    else help.textContent = 'Custom camera sources are preserved. Use Connect custom feeds to connect or change them.';
  }
  listen(publicButton, 'click', () => {
    if (!published || !checkLease()) return;
    automaticConnectionPending = false;
    manuallyDisconnected = false;
    connectPublishedSources();
  });
  listen(document.getElementById('disconnect-streams'), 'click', () => {
    automaticConnectionPending = false;
    manuallyDisconnected = true;
    Object.values(feeds).forEach(feed => feed.disconnect());
    sources = {};
    help.textContent = 'Feeds disconnected. Select Reconnect live feeds or Connect custom feeds to resume.';
  });
  listen(localButton, 'click', () => {
    if (location.protocol === 'https:') return;
    automaticConnectionPending = false;
    document.getElementById('source-wrist').value = 'http://127.0.0.1:18771/wrist.jpg';
    document.getElementById('source-overhead').value = 'http://127.0.0.1:18771/side.jpg';
    document.getElementById('source-user').value = 'http://127.0.0.1:18771/front.png';
    help.textContent = 'A2000 camera sources filled in. Start the SSH tunnel, then select Connect feeds. Wrist alignment images are available during pickup.';
  });
  listen(document, 'visibilitychange', pause);
  listen(window, 'look:page', pause);
  listen(window, 'pagehide', () => { pageHidden = true; pause(); });
  listen(window, 'pageshow', () => { pageHidden = false; pause(); });
  Object.values(feeds).forEach(feed => feed.disconnect());
  pause();
  scheduleExpiry();
  const cleanup = () => { events.abort(); clearTimer(expiryTimer); Object.values(feeds).forEach(feed => feed.disconnect()); };
  disposeStreams = cleanup;
  return cleanup;
}
if (import.meta.hot) import.meta.hot.dispose(() => disposeStreams?.());
