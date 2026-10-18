import savedEvaluation from './data/saved-evaluation.json' with { type: 'json' };
import { renderEvaluation } from './presentation.js';

/** Restore a verified historical report; this does not execute an evaluation. */
export function initializeSavedEvaluation() {
  renderEvaluation(savedEvaluation, false);
  const fullReport = document.getElementById('evaluation');
  if (fullReport) {
    fullReport.textContent = [
      savedEvaluation.text,
      '',
      'SAVED INPUTS',
      ...savedEvaluation.provenance.input_files.map(input => `${input.role}: ${input.name} · ${input.event_count} generated events\nSHA-256: ${input.sha256}`),
      '',
      'Input hashes were verified against the saved local files. Raw input events are not published.',
      '',
      'FULL SANITIZED REPORT AND PROVENANCE',
      JSON.stringify(savedEvaluation, null, 2),
    ].join('\n');
  }
}
