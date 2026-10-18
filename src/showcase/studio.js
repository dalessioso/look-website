/* Browser-only studio: selection and confirmation drive the imported 3D scene. */
import { createDemoController } from './demo-controller.js';
import { renderEvaluation, renderRoutineHighlights } from './presentation.js';

const controller = createDemoController();
let state = controller.readState();
let studioMoment = 'mug';
let sceneReady = false;
let uiPending = false;
let lastScene = '';
let lastEvents = '';
let acknowledging = null;
let disposeStudio = null;

const $ = id => document.getElementById(id);
const text = (id, value) => { const element = $(id); if (element) element.textContent = value; };
const objectLabels = { medicine: 'Medicine', mug: 'Mug', water: 'Water bottle', phone: 'Phone' };
const backendLabels = { medicine: 'medication', mug: 'mug', water: 'water_bottle', phone: 'phone' };
const dispatch = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
const grabbing = () => state.arm === 'grabbing';
const studioActive = () => document.body.dataset.page === 'studio';

function syncScene(force = false) {
  if (!sceneReady || !studioActive()) return;
  const selected = state.selected === backendLabels[studioMoment];
  const phase = selected ? ({ 'awaiting confirmation': 'selected', grabbing: 'reaching', delivered: 'done' })[state.arm] || 'idle' : 'idle';
  const nonce = selected ? state.animation_id || null : null;
  const key = `${studioMoment}|${phase}|${nonce}`;
  if (force || lastScene !== key) {
    if (force || lastScene.split('|')[0] !== studioMoment) dispatch('look:studio-object', { moment: studioMoment });
    dispatch('look:studio-phase', { phase, animationId: nonce });
    lastScene = key;
  }
}

function updateControls() {
  const selected = state.selected === backendLabels[studioMoment] && state.arm === 'awaiting confirmation';
  document.querySelectorAll('[data-studio-object]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.studioObject === studioMoment));
    button.disabled = uiPending || grabbing();
  });
  const confirm = $('confirm-reach');
  if (confirm) {
    confirm.disabled = !selected || uiPending || grabbing();
    confirm.textContent = grabbing() ? 'Reaching…' : state.arm === 'delivered' && state.selected === backendLabels[studioMoment] ? 'Reach complete' : 'Confirm reach';
  }
  if (grabbing()) {
    text('studio-status', `Moving ${objectLabels[studioMoment].toLowerCase()} in 3D`);
    text('studio-hint', 'The 3D sequence is in progress.');
  } else if (state.arm === 'delivered' && state.selected === backendLabels[studioMoment]) {
    text('studio-status', '3D reach complete');
    text('studio-hint', 'Choose another object to continue.');
  } else if (selected) {
    text('studio-status', `${objectLabels[studioMoment]} selected`);
    text('studio-hint', 'Confirm to begin the 3D reach.');
  } else {
    text('studio-status', `${objectLabels[studioMoment]} in view`);
    text('studio-hint', 'Select the object, then confirm the 3D reach.');
  }
}

function updateContext() {
  text('context-signal', 'Chalk is not connected · you can still explore the 3D demo');
  $('context-dot')?.classList.remove('live');
  text('context-receipt', 'This tab runs an in-memory 3D demonstration.\nNo live hardware or provider is connected.\nNo Chalk query, latency measurement, or deployment receipt is available.');
  const source = document.querySelector('.context-source');
  if (source) source.textContent = 'Browser demonstration';
}

function refresh(forceScene = false) {
  state = controller.readState();
  text('activity', grabbing() ? '3D reach' : '3D demo');
  updateContext();
  updateControls();
  syncScene(forceScene);

  const events = state.events.slice(-6).reverse();
  const key = JSON.stringify(events);
  if (lastEvents !== key) {
    lastEvents = key;
    $('events')?.replaceChildren(...events.map(event => {
      const row = document.createElement('div');
      row.className = 'event';
      const kind = document.createElement('b');
      kind.textContent = event.kind.toUpperCase();
      const message = document.createElement('span');
      message.textContent = event.message;
      row.append(kind, message);
      return row;
    }));
  }
  text('factorybadge', 'No report available');
  text('factory-summary', 'No routine analysis report was supplied for this browser demo.');
  renderRoutineHighlights([]);
  text('report', 'No Factory Droid report was supplied.');
  renderEvaluation(null, false);
  text('evaluation', 'No evaluation report was supplied for this browser demo.');
}

function chooseObject(moment) {
  if (typeof moment !== 'string' || !Object.hasOwn(backendLabels, moment) || uiPending || grabbing() || !studioActive()) return;
  studioMoment = moment;
  lastScene = '';
  uiPending = true;
  updateControls();
  try {
    controller.performAction('select', { label: backendLabels[moment] });
    text('error', '');
  } catch (error) {
    text('error', error.message);
  } finally {
    uiPending = false;
    refresh();
  }
}

function confirmReach() {
  if (uiPending || grabbing() || !studioActive() || state.selected !== backendLabels[studioMoment] || state.arm !== 'awaiting confirmation') return;
  uiPending = true;
  updateControls();
  try {
    controller.performAction('confirm');
    text('error', '');
  } catch (error) {
    text('error', error.message);
  } finally {
    uiPending = false;
    refresh();
  }
}

function completeReach(event) {
  const { moment, animationId } = event.detail || {};
  if (!studioActive() || document.visibilityState === 'hidden' || !animationId || animationId !== state.animation_id || moment !== studioMoment || !grabbing() || acknowledging === animationId) return;
  acknowledging = animationId;
  try {
    controller.performAction('animation_complete', { animation_id: animationId });
  } catch (error) {
    text('error', error.message);
  } finally {
    acknowledging = null;
    refresh();
  }
}

function resetInactiveDemo() {
  controller.performAction('reset');
  uiPending = false;
  acknowledging = null;
  lastScene = '';
  // Also notify an already-mounted scene when its page is no longer active.
  dispatch('look:studio-phase', { phase: 'idle', animationId: null });
  text('error', '');
  refresh();
}

export function initializeStudio() {
  if (disposeStudio) return disposeStudio;
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const time = $('context-time');
  if (time) {
    time.value = '';
    time.disabled = true;
    time.title = 'Time-of-day context is unavailable because Chalk is not connected.';
    time.setAttribute('aria-describedby', 'context-signal');
  }
  document.querySelectorAll('[data-studio-object]').forEach(button => {
    button.addEventListener('click', () => chooseObject(button.dataset.studioObject), options);
  });
  $('confirm-reach')?.addEventListener('click', confirmReach, options);
  window.addEventListener('look:studio-ready', () => { sceneReady = true; syncScene(true); }, options);
  window.addEventListener('look:studio-select', event => chooseObject(event.detail?.moment), options);
  window.addEventListener('look:studio-complete', completeReach, options);
  window.addEventListener('look:page', event => {
    const page = typeof event.detail === 'string' ? event.detail : event.detail?.page;
    if (page === 'studio') { lastScene = ''; refresh(true); }
    else resetInactiveDemo();
  }, options);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') resetInactiveDemo();
    else refresh(true);
  }, options);
  window.addEventListener('pagehide', resetInactiveDemo, options);
  window.addEventListener('pageshow', () => refresh(true), options);

  refresh();
  disposeStudio = () => {
    listeners.abort();
    resetInactiveDemo();
    sceneReady = false;
    lastScene = '';
    disposeStudio = null;
  };
  return disposeStudio;
}
