import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedConnection, initializeStreams, parseStreamUrl } from './streams.js';

class Scheduler {
  time = 1000;
  nextId = 1;
  pending = new Map();
  setTimer = (callback, delay) => {
    const id = this.nextId++;
    this.pending.set(id, { callback, at: this.time + delay });
    return id;
  };
  clearTimer = id => { this.pending.delete(id); };
  now = () => this.time;
  advance(ms) {
    const end = this.time + ms;
    let steps = 0;
    for (;;) {
      const next = [...this.pending].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      assert.ok(++steps < 1000, 'Timers must not create a busy loop');
      this.time = next[1].at;
      this.pending.delete(next[0]);
      next[1].callback();
    }
    this.time = end;
  }
}

class FakeElement extends EventTarget {
  hidden = false;
  value = '';
  textContent = '';
  classes = new Set();
  classList = { toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name) };
}

class FakeImage extends FakeElement {
  hidden = true;
  naturalWidth = 0;
  requests = [];
  currentSrc = '';
  onload = null;
  onerror = null;
  set src(value) { this.currentSrc = value; this.requests.push(value); }
  get src() { return this.currentSrc; }
  removeAttribute(name) {
    if (name === 'src') { this.currentSrc = ''; this.naturalWidth = 0; }
  }
  load() { this.naturalWidth = 640; this.onload?.(); }
  fail() { this.onerror?.(); }
}

function fixture() {
  const scheduler = new Scheduler();
  const image = new FakeImage();
  const states = [];
  const feed = createFeedConnection({ image, onState: state => states.push(state),
    setTimer: scheduler.setTimer, clearTimer: scheduler.clearTimer, now: scheduler.now });
  return { scheduler, image, states, feed };
}
const snapshot = parseStreamUrl('http://127.0.0.1:18769/wrist.jpg?view=raw', 'http:');

// The image and clock doubles never issue HTTP requests.
test('snapshot feeds poll after a completed frame with a fresh cache key', () => {
  const { scheduler, image, states, feed } = fixture();
  feed.connect(snapshot);
  assert.deepEqual(states, ['Connecting']);
  assert.equal(image.requests.length, 1);
  assert.equal(new URL(image.src).searchParams.get('view'), 'raw');
  assert.equal(new URL(image.src).searchParams.get('_look_frame'), '1000');
  assert.equal(scheduler.pending.size, 1, 'Only the load deadline runs before a response');
  image.load();
  assert.equal(image.hidden, false);
  assert.equal(states.at(-1), 'Connected');
  assert.equal(scheduler.pending.size, 1, 'Successful load replaces the deadline with a refresh');
  scheduler.advance(749);
  assert.equal(image.requests.length, 1);
  scheduler.advance(1);
  assert.equal(image.requests.length, 2);
  assert.equal(new URL(image.src).searchParams.get('_look_frame'), '1750');
  scheduler.advance(749);
  assert.equal(image.requests.length, 2, 'A pending response must not start overlapping polls');
  image.load();
  scheduler.advance(750);
  assert.equal(image.requests.length, 3);
  feed.disconnect();
  assert.equal(scheduler.pending.size, 0);
});

test('failed loads clear the image, retry after three seconds, and can recover', () => {
  const { scheduler, image, states, feed } = fixture();
  feed.connect(snapshot);
  image.fail();
  assert.equal(image.hidden, true);
  assert.equal(image.src, '');
  assert.equal(states.at(-1), 'Unavailable');
  assert.equal(scheduler.pending.size, 1);
  scheduler.advance(2999);
  assert.equal(image.requests.length, 1);
  scheduler.advance(1);
  assert.equal(image.requests.length, 2);
  image.load();
  assert.equal(states.at(-1), 'Connected');
  assert.equal(image.hidden, false);
  feed.disconnect();
});

test('snapshot timeouts retry without overlapping a stuck request', () => {
  const { scheduler, image, states, feed } = fixture();
  feed.connect(snapshot);
  scheduler.advance(9999);
  assert.equal(image.requests.length, 1);
  assert.equal(states.at(-1), 'Connecting');
  scheduler.advance(1);
  assert.equal(states.at(-1), 'Unavailable');
  assert.equal(image.src, '');
  assert.equal(scheduler.pending.size, 1);
  scheduler.advance(3000);
  assert.equal(image.requests.length, 2);
  feed.disconnect();
});

test('disconnect cancels retries and invalidates already queued event callbacks', () => {
  const { scheduler, image, states, feed } = fixture();
  feed.connect(snapshot);
  const lateLoad = image.onload;
  const lateError = image.onerror;
  const lateDeadline = [...scheduler.pending.values()][0].callback;
  image.fail();
  const lateRetry = [...scheduler.pending.values()][0].callback;
  feed.disconnect();
  const settledStates = [...states];
  assert.equal(scheduler.pending.size, 0);
  lateLoad(); lateError(); lateDeadline(); lateRetry();
  scheduler.advance(60000);
  assert.deepEqual(states, settledStates);
  assert.equal(states.at(-1), 'Not connected');
  assert.equal(image.requests.length, 1);
  assert.equal(image.hidden, true);
  assert.equal(image.src, '');
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
  assert.equal(scheduler.pending.size, 0);
});

test('replacing a source rejects the previous source callbacks', () => {
  const { scheduler, image, states, feed } = fixture();
  feed.connect(snapshot);
  const oldLoad = image.onload;
  const oldError = image.onerror;
  feed.connect(parseStreamUrl('https://relay.example/side.jpg', 'https:'));
  oldLoad(); oldError();
  assert.equal(states.at(-1), 'Connecting');
  assert.equal(image.hidden, true);
  assert.equal(image.requests.length, 2);
  assert.equal(new URL(image.src).pathname, '/side.jpg');
  assert.equal(scheduler.pending.size, 1);
  image.load();
  assert.equal(states.at(-1), 'Connected');
  feed.disconnect();
});

test('suspension cancels an active poll and resumes only its retained source', () => {
  const { scheduler, image, states, feed } = fixture();
  feed.setSuspended(true);
  feed.connect(snapshot);
  assert.equal(states.at(-1), 'Paused');
  assert.equal(image.requests.length, 0);
  assert.equal(scheduler.pending.size, 0);
  feed.setSuspended(false);
  assert.equal(image.requests.length, 1);
  image.load();
  const lateRefresh = [...scheduler.pending.values()][0].callback;
  feed.setSuspended(true);
  lateRefresh();
  scheduler.advance(60000);
  assert.equal(image.requests.length, 1);
  assert.equal(image.hidden, true);
  assert.equal(scheduler.pending.size, 0);
  feed.setSuspended(false);
  assert.equal(image.requests.length, 2);
  feed.disconnect();
  feed.setSuspended(true);
  feed.setSuspended(false);
  assert.equal(image.requests.length, 2, 'Visibility changes must not reconnect a disconnected feed');
  assert.equal(scheduler.pending.size, 0);
});

test('MJPEG detects decoded frames without load events and periodically renews one connection', () => {
  const { scheduler, image, states, feed } = fixture();
  const stream = parseStreamUrl('http://127.0.0.1:18081/wrist', 'http:');
  feed.connect(stream);
  assert.equal(image.src, stream.url, 'Streaming URLs must not receive snapshot cache keys');
  image.naturalWidth = 640;
  scheduler.advance(10000);
  assert.equal(states.at(-1), 'Connected');
  assert.equal(image.hidden, false);
  assert.equal(scheduler.pending.size, 1, 'Decoded MJPEG must have a bounded renewal timer');
  scheduler.advance(14999);
  assert.equal(image.requests.length, 1);
  scheduler.advance(1);
  assert.equal(image.requests.length, 2);
  assert.equal(image.hidden, true);
  assert.equal(image.naturalWidth, 0, 'Renewal removes the previous image before opening another stream');
  assert.equal(states.at(-1), 'Connecting');
  assert.equal(scheduler.pending.size, 1);
  image.fail();
  assert.equal(states.at(-1), 'Unavailable');
  scheduler.advance(3000);
  assert.equal(image.requests.length, 3);
  feed.disconnect();
});

test('a clean MJPEG EOF cannot leave its final frame marked Connected indefinitely', () => {
  const { scheduler, image, states, feed } = fixture();
  feed.connect(parseStreamUrl('http://127.0.0.1:18081/wrist', 'http:'));
  image.load(); // A browser may emit load when the multipart response ends cleanly.
  const oldLoad = image.onload;
  const oldError = image.onerror;
  assert.equal(states.at(-1), 'Connected');
  scheduler.advance(15000);
  assert.equal(image.requests.length, 2);
  assert.equal(image.hidden, true);
  assert.equal(image.naturalWidth, 0);
  assert.equal(states.at(-1), 'Connecting');
  oldLoad(); oldError();
  assert.equal(states.at(-1), 'Connecting', 'Late events from the ended stream cannot restore its frame');
  // The next response never delivers a frame or an error event.
  scheduler.advance(10000);
  assert.equal(states.at(-1), 'Unavailable');
  assert.equal(image.hidden, true);
  assert.equal(image.src, '');
  assert.equal(scheduler.pending.size, 1, 'Only a single retry remains');
  feed.disconnect();
  scheduler.advance(60000);
  assert.equal(image.requests.length, 2);
  assert.equal(scheduler.pending.size, 0);
});

test('repeated load events neither duplicate timers nor postpone snapshot or MJPEG renewal', () => {
  for (const [source, interval] of [[snapshot, 750], [parseStreamUrl('http://127.0.0.1:18081/side', 'http:'), 15000]]) {
    const { scheduler, image, states, feed } = fixture();
    feed.connect(source);
    image.load();
    const renewalAt = [...scheduler.pending.values()][0].at;
    scheduler.advance(interval / 2);
    image.load(); image.load();
    assert.equal(scheduler.pending.size, 1);
    assert.equal([...scheduler.pending.values()][0].at, renewalAt);
    assert.equal(states.filter(state => state === 'Connected').length, 1);
    scheduler.advance(interval / 2);
    assert.equal(image.requests.length, 2);
    assert.equal(scheduler.pending.size, 1, 'The new request owns exactly one deadline');
    feed.disconnect();
    assert.equal(scheduler.pending.size, 0);
  }
});

test('disconnect invalidates a queued MJPEG renewal even after a different feed connects', () => {
  const { scheduler, image, states, feed } = fixture();
  feed.connect(parseStreamUrl('http://127.0.0.1:18081/wrist', 'http:'));
  image.load();
  const lateRenewal = [...scheduler.pending.values()][0].callback;
  feed.disconnect();
  feed.connect(snapshot);
  lateRenewal();
  assert.equal(image.requests.length, 2);
  assert.equal(states.at(-1), 'Connecting');
  assert.equal(scheduler.pending.size, 1);
  feed.disconnect();
});

test('URL validation rejects credentials, non-HTTP schemes, and HTTP on HTTPS pages', () => {
  assert.equal(parseStreamUrl('  ', 'https:'), null);
  for (const value of ['https://name:password@relay.example/wrist.jpg', 'https://name@relay.example/wrist',
    'file:///tmp/camera.jpg', 'data:image/jpeg;base64,AA==', 'javascript:alert(1)', 'ftp://relay.example/wrist']) {
    assert.throws(() => parseStreamUrl(value, 'http:'), /HTTP\(S\).*credentials/);
  }
  for (const value of ['http://127.0.0.1:18769/wrist.jpg', 'http://relay.example/front']) {
    assert.throws(() => parseStreamUrl(value, 'https:'), /requires HTTPS/);
  }
  assert.throws(() => parseStreamUrl('not a URL', 'http:'));
  assert.equal(parseStreamUrl(' https://relay.example/SIDE.JPEG?x=1 ', 'https:').snapshot, true);
  assert.equal(parseStreamUrl('https://relay.example/front', 'https:').snapshot, false);
  assert.equal(parseStreamUrl('http://127.0.0.1:18769/side_raw.jpg', 'http:').snapshot, true);
});

function installDom(t, { relay = null, protocol = 'http:', page = 'home', hidden = false, values = {} } = {}) {
  const scheduler = new Scheduler();
  const nodes = {};
  const keys = ['wrist', 'overhead', 'user'];
  for (const key of keys) {
    nodes['feed-' + key] = new FakeImage();
    for (const prefix of ['source-', 'status-', 'empty-', 'empty-message-']) nodes[prefix + key] = new FakeElement();
    nodes['source-' + key].value = values[key] || '';
  }
  for (const id of ['stream-help', 'stream-form', 'disconnect-streams', 'local-a2000', 'activity', 'connect-live-feeds', 'public-relay-hint']) nodes[id] = new FakeElement();
  const dot = new FakeElement();
  const document = new EventTarget();
  document.body = { dataset: { page } };
  document.hidden = hidden;
  document.getElementById = id => nodes[id];
  document.querySelector = selector => selector === '.connection .dot' ? dot : null;
  const window = new EventTarget();
  const globals = { document, window, location: { protocol }, setTimeout: scheduler.setTimer, clearTimeout: scheduler.clearTimer };
  const original = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  let cleanup = () => {};
  t.after(() => {
    cleanup();
    for (const [key, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  cleanup = initializeStreams({ relay, now: scheduler.now });
  return { scheduler, document, window, nodes, cleanup };
}

test('page and document visibility pause/resume feeds; disconnect and cleanup prevent restarts', t => {
  const { scheduler, document, window, nodes, cleanup } = installDom(t);
  const image = nodes['feed-wrist'];
  nodes['source-wrist'].value = snapshot.url;
  nodes['stream-form'].dispatchEvent(new Event('submit', { cancelable: true }));
  assert.equal(nodes['status-wrist'].textContent, 'Paused');
  assert.equal(image.requests.length, 0);
  document.body.dataset.page = 'studio';
  window.dispatchEvent(new Event('look:page'));
  assert.equal(image.requests.length, 1);
  image.load();
  assert.equal(nodes.activity.textContent, '1 feed connected');
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(nodes['status-wrist'].textContent, 'Paused');
  assert.equal(image.hidden, true);
  assert.equal(scheduler.pending.size, 0);
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(image.requests.length, 2);
  document.body.dataset.page = 'routines';
  window.dispatchEvent(new Event('look:page'));
  assert.equal(scheduler.pending.size, 0);
  document.body.dataset.page = 'studio';
  window.dispatchEvent(new Event('look:page'));
  assert.equal(image.requests.length, 3);
  window.dispatchEvent(new Event('pagehide'));
  assert.equal(scheduler.pending.size, 0);
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(image.requests.length, 4);
  nodes['disconnect-streams'].dispatchEvent(new Event('click'));
  window.dispatchEvent(new Event('pagehide'));
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(image.requests.length, 4);
  assert.equal(nodes.activity.textContent, 'No feeds connected');
  assert.equal(scheduler.pending.size, 0);
  nodes['local-a2000'].dispatchEvent(new Event('click'));
  assert.equal(nodes['source-wrist'].value, 'http://127.0.0.1:18771/wrist.jpg');
  assert.equal(nodes['source-overhead'].value, 'http://127.0.0.1:18771/side.jpg');
  assert.equal(nodes['source-user'].value, 'http://127.0.0.1:18771/front.png');
  assert.equal(image.requests.length, 4, 'Filling relay addresses does not connect them');
  cleanup();
  nodes['stream-form'].dispatchEvent(new Event('submit', { cancelable: true }));
  assert.equal(image.requests.length, 4, 'Disposed form listeners cannot reconnect');
  assert.equal(scheduler.pending.size, 0);
});

const publicRelay = { baseUrl: 'https://camera-session.trycloudflare.com', expiresAt: new Date(11000).toISOString() };

test('public HTTPS feeds wait for the studio view, auto-connect there, and disconnect clears frames', t => {
  const { scheduler, document, nodes, window, cleanup } = installDom(t, { relay: publicRelay, protocol: 'https:' });
  assert.equal(nodes['connect-live-feeds'].hidden, false);
  assert.equal(nodes['connect-live-feeds'].disabled, false);
  assert.equal(nodes['local-a2000'].hidden, true);
  assert.match(nodes['public-relay-hint'].textContent, /Temporary live session until/);
  assert.equal(nodes['feed-overhead'].requests.length, 0);
  assert.equal(nodes['feed-user'].requests.length, 0);
  nodes['local-a2000'].dispatchEvent(new Event('click'));
  assert.equal(nodes['source-overhead'].value, '', 'The hidden HTTP preset cannot fill hosted URL inputs');
  document.body.dataset.page = 'studio';
  window.dispatchEvent(new Event('look:page'));
  assert.equal(nodes['source-overhead'].value, publicRelay.baseUrl + '/side.jpg');
  assert.equal(nodes['source-user'].value, publicRelay.baseUrl + '/front.png');
  assert.equal(nodes['source-wrist'].value, publicRelay.baseUrl + '/wrist.jpg');
  assert.equal(nodes['feed-overhead'].requests.length, 1);
  assert.equal(nodes['feed-user'].requests.length, 1);
  assert.equal(nodes['feed-wrist'].requests.length, 1);
  nodes['feed-wrist'].load();
  nodes['feed-overhead'].load();
  nodes['feed-user'].load();
  assert.equal(nodes.activity.textContent, '3 feeds connected');
  assert.equal(nodes['connect-live-feeds'].textContent, 'Reconnect live feeds');
  nodes['disconnect-streams'].dispatchEvent(new Event('click'));
  assert.equal(nodes['feed-overhead'].src, '');
  assert.equal(nodes['feed-user'].src, '');
  assert.equal(nodes['feed-wrist'].src, '');
  assert.equal(nodes.activity.textContent, 'No feeds connected');
  assert.equal(scheduler.pending.size, 1, 'Only the lease deadline remains after disconnect');
  cleanup();
  assert.equal(scheduler.pending.size, 0);
});

test('public session expiry clears its frames, disables reconnect, and rejects pasted expired URLs', t => {
  const { scheduler, document, window, nodes } = installDom(t, { relay: publicRelay, protocol: 'https:' });
  document.body.dataset.page = 'studio';
  window.dispatchEvent(new Event('look:page'));
  nodes['feed-overhead'].load();
  nodes['feed-user'].load();
  nodes['feed-wrist'].load();
  scheduler.advance(10000);
  assert.equal(nodes['connect-live-feeds'].disabled, true);
  assert.equal(nodes['connect-live-feeds'].textContent, 'Live session ended');
  assert.match(nodes['stream-help'].textContent, /Live session ended/);
  assert.equal(nodes['feed-overhead'].src, '');
  assert.equal(nodes['feed-user'].src, '');
  assert.equal(nodes['feed-wrist'].src, '');
  assert.equal(nodes['feed-overhead'].hidden, true);
  assert.equal(scheduler.pending.size, 0);
  const requests = nodes['feed-overhead'].requests.length;
  nodes['connect-live-feeds'].dispatchEvent(new Event('click'));
  nodes['source-overhead'].value = publicRelay.baseUrl + '/side.jpg?manually=pasted';
  nodes['stream-form'].dispatchEvent(new Event('submit', { cancelable: true }));
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(nodes['feed-overhead'].requests.length, requests);
  assert.match(nodes['stream-help'].textContent, /temporary relay is no longer available/);
});

test('expiry on resume blocks stale public feeds even when its background timer was throttled', t => {
  const { scheduler, document, window, nodes } = installDom(t, { relay: publicRelay, protocol: 'https:' });
  document.body.dataset.page = 'studio';
  window.dispatchEvent(new Event('look:page'));
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  const requests = nodes['feed-overhead'].requests.length;
  scheduler.time = 12000; // Move the wall clock without delivering background timers.
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(nodes['feed-overhead'].requests.length, requests);
  assert.equal(nodes['feed-overhead'].src, '');
  assert.equal(nodes['connect-live-feeds'].disabled, true);
  assert.equal(scheduler.pending.size, 0);
});

test('public lease expiry preserves unrelated custom camera connections', t => {
  const { scheduler, document, window, nodes } = installDom(t, { relay: publicRelay, protocol: 'https:' });
  document.body.dataset.page = 'studio';
  window.dispatchEvent(new Event('look:page'));
  nodes['source-wrist'].value = 'https://private-camera.example/wrist';
  nodes['source-overhead'].value = publicRelay.baseUrl + '/side.jpg';
  nodes['stream-form'].dispatchEvent(new Event('submit', { cancelable: true }));
  nodes['feed-wrist'].load();
  nodes['feed-overhead'].load();
  const customRequests = nodes['feed-wrist'].requests.length;
  scheduler.advance(10000);
  assert.equal(nodes['feed-overhead'].src, '');
  assert.equal(nodes['feed-wrist'].src, 'https://private-camera.example/wrist');
  assert.equal(nodes['status-wrist'].textContent, 'Connected');
  assert.equal(nodes.activity.textContent, '1 feed connected');
  nodes['source-overhead'].value = '';
  nodes['source-user'].value = '';
  nodes['stream-form'].dispatchEvent(new Event('submit', { cancelable: true }));
  assert.equal(nodes['feed-wrist'].requests.length, customRequests + 1, 'Custom sources remain usable after the published lease');
});

test('missing or invalid relay config makes no public connection available', t => {
  const { nodes, scheduler } = installDom(t, { relay: { baseUrl: 'http://relay.example', expiresAt: publicRelay.expiresAt }, protocol: 'https:' });
  assert.equal(nodes['connect-live-feeds'].hidden, true);
  assert.equal(nodes['public-relay-hint'].hidden, true);
  nodes['connect-live-feeds'].dispatchEvent(new Event('click'));
  assert.equal(nodes['feed-overhead'].requests.length, 0);
  assert.equal(scheduler.pending.size, 0);
});

test('a direct visible studio visit starts public feeds once without a button click', t => {
  const { nodes, document, window } = installDom(t, { relay: publicRelay, protocol: 'https:', page: 'studio' });
  for (const key of ['wrist', 'overhead', 'user']) {
    assert.equal(nodes['feed-' + key].requests.length, 1);
    assert.equal(nodes['status-' + key].textContent, 'Connecting');
  }
  assert.match(nodes['empty-message-wrist'].textContent, /Waiting for a fresh wrist alignment/);
  assert.equal(nodes['empty-message-overhead'].textContent, 'Connecting to the camera…');
  window.dispatchEvent(new Event('look:page'));
  window.dispatchEvent(new Event('pageshow'));
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(nodes['feed-overhead'].requests.length, 1, 'Repeated visibility events must not create extra connections');
  nodes['feed-wrist'].fail();
  nodes['feed-overhead'].fail();
  assert.equal(nodes['status-wrist'].textContent, 'Retrying');
  assert.match(nodes['empty-message-wrist'].textContent, /No fresh wrist alignment frame yet/);
  assert.equal(nodes['status-overhead'].textContent, 'Retrying');
  assert.match(nodes['empty-message-overhead'].textContent, /Camera image unavailable.*Retrying/);
  nodes['feed-overhead'].load(); // The failed request has no surviving callback.
  assert.equal(nodes['empty-overhead'].hidden, false);
});

test('a hidden direct visit and pagehide do not start feeds until the studio is visible again', t => {
  const { nodes, document, window } = installDom(t, { relay: publicRelay, protocol: 'https:', page: 'studio', hidden: true });
  assert.equal(nodes['feed-overhead'].requests.length, 0);
  window.dispatchEvent(new Event('pagehide'));
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(nodes['feed-overhead'].requests.length, 0, 'A pagehide remains suspended until pageshow');
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(nodes['feed-overhead'].requests.length, 1);
  document.body.dataset.page = 'animations';
  window.dispatchEvent(new Event('look:page'));
  assert.equal(nodes['feed-overhead'].src, '');
  assert.equal(nodes['status-overhead'].textContent, 'Paused');
  document.body.dataset.page = 'studio';
  window.dispatchEvent(new Event('look:page'));
  assert.equal(nodes['feed-overhead'].requests.length, 2, 'Returning resumes the original connection');
});

test('manual Disconnect persists across navigation and visibility until explicit Reconnect', t => {
  const { nodes, document, window } = installDom(t, { relay: publicRelay, protocol: 'https:', page: 'studio' });
  nodes['disconnect-streams'].dispatchEvent(new Event('click'));
  assert.equal(nodes['status-overhead'].textContent, 'Disconnected');
  assert.equal(nodes['empty-message-overhead'].textContent, 'Feed disconnected.');
  document.body.dataset.page = 'home';
  window.dispatchEvent(new Event('look:page'));
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pagehide'));
  document.body.dataset.page = 'studio';
  window.dispatchEvent(new Event('look:page'));
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(nodes['feed-overhead'].requests.length, 1);
  assert.equal(nodes['feed-overhead'].src, '');
  nodes['connect-live-feeds'].dispatchEvent(new Event('click'));
  assert.equal(nodes['feed-overhead'].requests.length, 2);
  assert.equal(nodes['status-overhead'].textContent, 'Connecting');
});

test('automatic and explicit public reconnect preserve custom inputs and active custom sources', t => {
  const custom = 'https://private-camera.example/wrist';
  const { nodes, window } = installDom(t, { relay: publicRelay, protocol: 'https:', page: 'studio', values: { wrist: custom } });
  assert.equal(nodes['source-wrist'].value, custom);
  assert.equal(nodes['feed-wrist'].requests.length, 0, 'An unsubmitted custom URL must not be connected automatically');
  assert.equal(nodes['feed-overhead'].requests.length, 1);
  nodes['stream-form'].dispatchEvent(new Event('submit', { cancelable: true }));
  assert.equal(nodes['feed-wrist'].src, custom);
  nodes['source-wrist'].value = '';
  nodes['connect-live-feeds'].dispatchEvent(new Event('click'));
  assert.equal(nodes['source-wrist'].value, '', 'A public preset must not overwrite a custom input edit');
  assert.equal(nodes['feed-wrist'].requests.length, 1, 'The active custom source remains untouched even if its form field was edited');
  assert.equal(nodes['feed-wrist'].src, custom);
  window.dispatchEvent(new Event('look:page'));
  assert.equal(nodes['feed-wrist'].requests.length, 1);
});

test('an already expired lease and expiry before first visibility never auto-connect', t => {
  const expired = { ...publicRelay, expiresAt: new Date(500).toISOString() };
  const { nodes, document, window } = installDom(t, { relay: expired, protocol: 'https:', page: 'studio' });
  assert.equal(nodes['feed-overhead'].requests.length, 0);
  assert.equal(nodes['connect-live-feeds'].disabled, true);
  assert.match(nodes['stream-help'].textContent, /Live session ended/);
  document.body.dataset.page = 'home';
  window.dispatchEvent(new Event('look:page'));
  document.body.dataset.page = 'studio';
  window.dispatchEvent(new Event('look:page'));
  nodes['connect-live-feeds'].dispatchEvent(new Event('click'));
  assert.equal(nodes['feed-overhead'].requests.length, 0);
});

test('a hidden session that expires before becoming visible stays disconnected', t => {
  const { nodes, document, scheduler } = installDom(t, { relay: publicRelay, protocol: 'https:', page: 'studio', hidden: true });
  scheduler.time = 12000;
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(nodes['feed-overhead'].requests.length, 0);
  assert.equal(nodes['connect-live-feeds'].disabled, true);
  assert.equal(scheduler.pending.size, 0);
});
