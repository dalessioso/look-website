/** Local 3D-demo state only. No storage, hardware transport, or provider requests. */
export const demoObjectLabels = Object.freeze(['medication', 'mug', 'water_bottle', 'phone']);
const validLabels = new Set(demoObjectLabels);
const names = { medication: 'medicine', mug: 'mug', water_bottle: 'water bottle', phone: 'phone' };
let fallbackInstance = 0;

export class DemoControllerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DemoControllerError';
    this.code = code;
  }
}

/** Every call owns an isolated session, including its animation acknowledgement IDs. */
export function createDemoController() {
  const instance = globalThis.crypto?.randomUUID?.() ?? `browser-demo-${Date.now()}-${++fallbackInstance}`;
  let requestNumber = 0;
  let eventNumber = 0;
  let state = {
    mode: 'browser-demo',
    arm: 'idle',
    selected: null,
    animation_id: null,
    busy: false,
    cloud: null,
    context_busy: false,
    context_error: null,
    factory: null,
    evaluation: null,
    events: [],
  };

  function readState() {
    return { ...state, events: state.events.map(event => ({ ...event })) };
  }

  function record(kind, message) {
    state.events = [...state.events, { id: ++eventNumber, kind, message }].slice(-50);
  }

  function performAction(action, payload = {}) {
    const data = payload && typeof payload === 'object' ? payload : {};
    if (action === 'select') {
      if (!validLabels.has(data.label)) throw new DemoControllerError('invalid_object', 'Choose an object supported by the 3D demo.');
      if (state.arm === 'grabbing') throw new DemoControllerError('reach_in_progress', 'Wait for the current 3D sequence to finish.');
      state.selected = data.label;
      state.arm = 'awaiting confirmation';
      state.animation_id = null;
      record('selection', `Selected the ${names[data.label]} in the 3D demo.`);
    } else if (action === 'confirm') {
      if (state.arm !== 'awaiting confirmation' || !validLabels.has(state.selected)) {
        throw new DemoControllerError('confirmation_required', 'Select an object before confirming its 3D reach.');
      }
      state.arm = 'grabbing';
      state.animation_id = `${instance}:${++requestNumber}`;
      record('confirmation', `Confirmed the ${names[state.selected]} reach in the 3D demo.`);
    } else if (action === 'animation_complete') {
      if (state.arm !== 'grabbing' || typeof data.animation_id !== 'string' || data.animation_id !== state.animation_id) {
        throw new DemoControllerError('stale_animation', 'This animation acknowledgement is no longer current.');
      }
      state.arm = 'delivered';
      record('animation', `The ${names[state.selected]} 3D sequence completed.`);
    } else if (action === 'reset') {
      const interrupted = state.arm === 'grabbing';
      const hadSelection = state.selected !== null;
      state.selected = null;
      state.arm = 'idle';
      state.animation_id = null;
      if (interrupted) record('cancelled', 'The 3D reach was cancelled when the demo became inactive.');
      else if (hadSelection) record('reset', 'The 3D selection was cleared.');
    } else if (action === 'context') {
      throw new DemoControllerError('context_unavailable', 'Chalk is not connected; no routine query was sent.');
    } else {
      throw new DemoControllerError('unsupported_action', 'This action is not available in the browser demonstration.');
    }
    return readState();
  }

  return Object.freeze({ readState, performAction });
}
