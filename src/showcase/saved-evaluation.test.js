import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeSavedEvaluation } from './saved-evaluation.js';

const snapshot = JSON.parse(readFileSync(new URL('./data/saved-evaluation.json', import.meta.url), 'utf8'));

test('the restored report preserves the verified synthetic run and its equal baseline results', () => {
  assert.equal(snapshot.run_id, '9141cc2558a74fbc9d8d0eb8bfa0cbdd');
  assert.equal(snapshot.report.synthetic, true);
  assert.equal(snapshot.report.backend, 'local');
  assert.equal(snapshot.provenance.source_commit, 'c2c9b3a35a74c7ebae6fc885c44a0ba32e486175');
  assert.equal(snapshot.provenance.source_evaluation_sha256, 'fd31f1a49994d989d4434a84179e988c184d51d236e9cac6469e9a749724169b');
  assert.equal(snapshot.provenance.saved_at.slice(0, 10), '2026-10-18');
  assert.match(snapshot.provenance.saved_at_basis, /file modification time/);
  for (const method of ['gaze only', 'gaze + history']) {
    const result = snapshot.report.results[method];
    assert.equal(result.fixations, 6);
    assert.equal(result.top1_at_300ms, 1);
    assert.equal(result.prehovers, 8);
    assert.equal(result.false_prehover, 0.125);
  }
  assert.equal(snapshot.report.results['gaze + history'].top1_at_300ms - snapshot.report.results['gaze only'].top1_at_300ms, 0);
  assert.match(snapshot.text, /SYNTHETIC SMOKE TEST ONLY/);
  assert.match(snapshot.text, /not measured user or hardware performance/);
  assert.equal('Hour-aware population' in snapshot.report.results, false);
});

test('published provenance contains verified input metadata without private paths or raw events', () => {
  assert.equal(snapshot.provenance.input_hashes_verified, true);
  assert.deepEqual(snapshot.input_sha256, {
    'synthetic-train.jsonl': 'f31835c00028d10058a021320004ce7d207481c325234b4c6957b3cf74877e62',
    'synthetic-test.jsonl': '801614fbe92900c0566c0626f3bda2aaa04c3a9dbb12fd8d79bf98b054dc85ce',
  });
  assert.deepEqual(snapshot.provenance.input_files.map(input => [input.role, input.event_count]), [['training', 542], ['test', 556]]);
  for (const input of snapshot.provenance.input_files) {
    assert.deepEqual(Object.keys(input).sort(), ['event_count', 'name', 'role', 'sha256']);
    assert.equal(input.sha256, snapshot.input_sha256[input.name]);
  }
  function inspect(value) {
    if (typeof value === 'string') {
      assert.doesNotMatch(value, /(?:\/Users\/|\/home\/|(?:^|\s)[A-Za-z]:[\\/]|file:\/\/|XAI_API_KEY|CHALK_CLIENT_SECRET|Bearer\s|-----BEGIN)/i);
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        assert.doesNotMatch(key, /^(?:\/|[A-Za-z]:[\\/])/);
        inspect(child);
      }
    }
  }
  inspect(snapshot);
  assert.deepEqual(Object.keys(snapshot.report.safety), ['synthetic-test.jsonl']);
  assert.deepEqual(Object.keys(snapshot.report.chalk_ops), ['synthetic-test.jsonl']);
  assert.deepEqual(Object.keys(snapshot.report.voice_corrections), ['synthetic-test.jsonl']);
  assert.equal(snapshot.report.chalk_ops['synthetic-test.jsonl'].queries, 0);
});

// A minimal DOM surface exercises the actual presentation code without a browser
// or a test-only rendering path; only standard text/element operations are needed.
class Element {
  constructor() { this.children = []; this.style = {}; this.attributes = {}; this.value = ''; }
  set textContent(value) { this.value = String(value); this.children = []; }
  get textContent() { return this.value + this.children.map(child => child.textContent).join(' '); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.value = ''; this.children = children; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
}

test('the visible report discloses synthetic scope, date, small sample and zero improvement', t => {
  const elements = new Map(['eval-visual', 'eval-title', 'evaluation'].map(id => [id, new Element()]));
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    getElementById: id => elements.get(id) ?? null,
    createElement: () => new Element(),
  } });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  });

  initializeSavedEvaluation();

  const visible = elements.get('eval-visual').textContent;
  assert.match(elements.get('eval-title').textContent, /synthetic replay/i);
  assert.match(visible, /October 18, 2026/);
  assert.match(visible, /6 synthetic fixations/);
  assert.match(visible, /100\.00%/);
  assert.match(visible, /0\.00 pp/);
  assert.match(visible, /improvement is 0 percentage points/);
  assert.match(visible, /does not measure people, physical grasps, or real-world performance/);
  assert.match(visible, /No Chalk API call was made/);

  const full = elements.get('evaluation').textContent;
  assert.match(full, /542 generated events/);
  assert.match(full, /556 generated events/);
  assert.match(full, /Raw input events are not published/);
  assert.doesNotMatch(full, /\/Users\/|\/home\//);
  const included = JSON.parse(full.split('FULL SANITIZED REPORT AND PROVENANCE\n')[1]);
  assert.deepEqual(included, snapshot);
});
