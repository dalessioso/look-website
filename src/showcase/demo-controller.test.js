import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoController, demoObjectLabels, DemoControllerError } from './demo-controller.js';

const hasCode = code => error => error instanceof DemoControllerError && error.code === code;
const startReach = (controller, label = 'mug') => {
  controller.performAction('select', { label });
  return controller.performAction('confirm').animation_id;
};

test('selection is required before confirmation and only confirmation starts a reach', () => {
  const controller = createDemoController();
  assert.throws(() => controller.performAction('confirm'), hasCode('confirmation_required'));
  assert.equal(controller.readState().arm, 'idle');
  const selected = controller.performAction('select', { label: 'water_bottle' });
  assert.equal(selected.arm, 'awaiting confirmation');
  assert.equal(selected.animation_id, null);
  const confirmed = controller.performAction('confirm');
  assert.equal(confirmed.arm, 'grabbing');
  assert.equal(typeof confirmed.animation_id, 'string');
  assert.throws(() => controller.performAction('confirm'), hasCode('confirmation_required'));
});

test('all supported labels work and invalid labels cannot alter the current selection', () => {
  const controller = createDemoController();
  for (const label of demoObjectLabels) {
    assert.equal(controller.performAction('select', { label }).selected, label);
  }
  const before = controller.readState();
  for (const label of ['medicine', 'water', '__proto__', 'constructor', '', null, 1]) {
    assert.throws(() => controller.performAction('select', { label }), hasCode('invalid_object'));
    assert.deepEqual(controller.readState(), before);
  }
});

test('a running reach cannot be replaced by another selection', () => {
  const controller = createDemoController();
  const nonce = startReach(controller);
  assert.throws(() => controller.performAction('select', { label: 'phone' }), hasCode('reach_in_progress'));
  assert.equal(controller.readState().selected, 'mug');
  assert.equal(controller.readState().animation_id, nonce);
});

test('only the current acknowledgement completes a reach; duplicates do not add events', () => {
  const controller = createDemoController();
  const nonce = startReach(controller);
  assert.throws(() => controller.performAction('animation_complete', { animation_id: 'stale' }), hasCode('stale_animation'));
  assert.throws(() => controller.performAction('animation_complete', {}), hasCode('stale_animation'));
  assert.equal(controller.readState().arm, 'grabbing');
  const finished = controller.performAction('animation_complete', { animation_id: nonce });
  assert.equal(finished.arm, 'delivered');
  assert.equal(finished.animation_id, nonce);
  assert.throws(() => controller.performAction('animation_complete', { animation_id: nonce }), hasCode('stale_animation'));
  assert.deepEqual(controller.readState(), finished);
});

test('page reset cancels the reach and old completion cannot finish a newer request', () => {
  const controller = createDemoController();
  const oldNonce = startReach(controller);
  const cleared = controller.performAction('reset');
  assert.equal(cleared.arm, 'idle');
  assert.equal(cleared.selected, null);
  assert.equal(cleared.animation_id, null);
  assert.throws(() => controller.performAction('confirm'), hasCode('confirmation_required'));
  assert.throws(() => controller.performAction('animation_complete', { animation_id: oldNonce }), hasCode('stale_animation'));
  const newNonce = startReach(controller, 'medication');
  assert.notEqual(newNonce, oldNonce);
  assert.throws(() => controller.performAction('animation_complete', { animation_id: oldNonce }), hasCode('stale_animation'));
  assert.equal(controller.readState().arm, 'grabbing');
  assert.equal(controller.performAction('animation_complete', { animation_id: newNonce }).arm, 'delivered');
});

test('separate controllers keep selections, nonces and resets isolated', () => {
  const first = createDemoController();
  const second = createDemoController();
  const firstNonce = startReach(first, 'mug');
  assert.equal(second.readState().selected, null);
  const secondNonce = startReach(second, 'phone');
  assert.notEqual(secondNonce, firstNonce);
  assert.throws(() => second.performAction('animation_complete', { animation_id: firstNonce }), hasCode('stale_animation'));
  first.performAction('reset');
  assert.equal(second.readState().selected, 'phone');
  assert.equal(second.readState().arm, 'grabbing');
  assert.equal(second.performAction('animation_complete', { animation_id: secondNonce }).arm, 'delivered');
});

test('state snapshots cannot mutate the private session', () => {
  const controller = createDemoController();
  controller.performAction('select', { label: 'mug' });
  const snapshot = controller.readState();
  snapshot.selected = 'phone';
  snapshot.events[0].message = 'Changed';
  snapshot.events.push({ kind: 'fake', message: 'Injected' });
  assert.equal(controller.readState().selected, 'mug');
  assert.equal(controller.readState().events.length, 1);
  assert.equal(controller.readState().events[0].message, 'Selected the mug in the 3D demo.');
});

test('browser interactions never fabricate provider reports or context responses', () => {
  const controller = createDemoController();
  const before = controller.readState();
  assert.throws(() => controller.performAction('context', { hour: 9, profile: 'new-user' }), hasCode('context_unavailable'));
  assert.deepEqual(controller.readState(), before);
  const nonce = startReach(controller, 'medication');
  controller.performAction('animation_complete', { animation_id: nonce });
  const state = controller.readState();
  assert.equal(state.mode, 'browser-demo');
  assert.equal(state.cloud, null);
  assert.equal(state.factory, null);
  assert.equal(state.evaluation, null);
  assert.equal(state.context_busy, false);
  assert.equal('latency_ms' in state, false);
  assert.equal('query_id' in state, false);
  assert.equal('hour' in state, false);
  assert.throws(() => controller.performAction('connect_hardware'), hasCode('unsupported_action'));
});
