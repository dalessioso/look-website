import { useCallback, useEffect, useRef, useState } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { ArrowLeft, ArrowRight, Check, Eye, Mic, RotateCcw } from 'lucide-react';
import './day.css';
import Wordmark from './Wordmark';
import RobotScene, { type RobotPhase } from './RobotScene';
import SpaceScene from './SpaceScene';

const objects = [
  {
    id: 'medicine', label: 'Medicine', title: 'Move pills to the bedside table', object: 'pills',
    body: 'Select the pills in the weekly organizer, then confirm to open the compartment and move them to the dish on the bedside table.',
  },
  {
    id: 'mug', label: 'Mug', title: 'Bring a mug closer', object: 'mug',
    body: 'Select the mug on the desk, then confirm when you want the arm to bring it closer.',
  },
  {
    id: 'water', label: 'Water', title: 'Reach for water', object: 'water bottle',
    body: 'Choose the water bottle and try either confirmation method to see the arm move it within reach.',
  },
  {
    id: 'phone', label: 'Phone', title: 'Move a phone within reach', object: 'phone',
    body: 'Explore how an assistive arm could bring your phone closer after you select and confirm it.',
  },
] as const;

type ObjectOption = typeof objects[number];
type ObjectId = ObjectOption['id'];
type Confirmation = 'blink' | 'voice' | null;

function ObjectPanel({ item, active, onNext }: { item: ObjectOption; active: boolean; onNext: () => void }) {
  const [phase, setPhase] = useState<RobotPhase>('idle');
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [run, setRun] = useState(0);
  const runRef = useRef(0);
  const activeRef = useRef(active);
  const phaseRef = useRef<RobotPhase>(phase);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<'choose' | 'confirm' | 'cancel' | 'next' | null>(null);

  activeRef.current = active;
  phaseRef.current = phase;

  useEffect(() => () => {
    runRef.current += 1;
    phaseRef.current = 'idle';
  }, []);

  useEffect(() => {
    if (!active) {
      runRef.current += 1;
      setRun(runRef.current);
      phaseRef.current = 'idle';
      pendingFocus.current = null;
      setPhase('idle');
      setConfirmation(null);
      return;
    }
    const target = pendingFocus.current;
    const element = target === 'choose' ? chooseRef.current
      : target === 'confirm' ? confirmRef.current
      : target === 'cancel' ? cancelRef.current
      : target === 'next' ? nextRef.current : null;
    if (element) {
      pendingFocus.current = null;
      element.focus();
    }
  }, [active, phase]);

  const completeReach = useCallback(() => {
    // Reject late callbacks after cancellation, a tab change, or a newer request.
    if (!activeRef.current || phaseRef.current !== 'reaching' || runRef.current !== run) return;
    phaseRef.current = 'done';
    if (document.activeElement === cancelRef.current || pendingFocus.current === 'cancel') pendingFocus.current = 'next';
    setPhase('done');
  }, [run]);

  function choose() {
    if (phase === 'selected') {
      confirmRef.current?.focus();
      return;
    }
    if (phase !== 'idle') return;
    pendingFocus.current = 'confirm';
    phaseRef.current = 'selected';
    setPhase('selected');
  }

  function reset() {
    runRef.current += 1;
    setRun(runRef.current);
    phaseRef.current = 'idle';
    pendingFocus.current = 'choose';
    setPhase('idle');
    setConfirmation(null);
  }

  function confirm(method: Exclude<Confirmation, null>) {
    if (!activeRef.current || phaseRef.current !== 'selected') return;
    runRef.current += 1;
    setRun(runRef.current);
    phaseRef.current = 'reaching';
    pendingFocus.current = 'cancel';
    setConfirmation(method);
    setPhase('reaching');
  }

  const status = {
    idle: `Select the ${item.object} to try the interaction.`,
    selected: `Confirm that you want the ${item.object} brought closer.`,
    reaching: item.id === 'medicine' ? 'Opening the compartment and moving the pills to the bedside table.' : `The simulated arm is bringing the ${item.object} closer after your ${confirmation === 'blink' ? 'blink' : 'voice'} confirmation.`,
    done: item.id === 'medicine' ? 'The simulated arm has placed the pills in the dish on the bedside table.' : `The simulated arm has delivered the ${item.object} within reach.`,
  }[phase];

  return (
    <div className="day-moment">
      <div className="day-moment-top">
        <div className="day-object-copy">
          <div className="day-astronaut"><SpaceScene compact phase={phase} /></div>
          <h2>{item.title}</h2>
          <p>{item.body}</p>
          {item.id === 'medicine' && <p className="day-concept-note">Medication delivery concept. The compartment is preset in this simulation; medicine and dose selection are not automated.</p>}
          {item.id === 'phone' && <p className="day-concept-note">Phone pickup is a future concept and has not been demonstrated by the current prototype.</p>}
          <a className="text-link day-tech-link" href="/#technology">How Look works<ArrowRight size={15} aria-hidden="true" /></a>
        </div>
        <div className="day-scene">
          <RobotScene
            className="day-robot-scene"
            phase={phase}
            moment={item.id}
            interactive={active && (phase === 'idle' || phase === 'selected')}
            onSelect={choose}
            onComplete={completeReach}
          />
        </div>
      </div>

      <div className="day-control-bar">
        <div className="day-progress-copy">
          <ol className="day-step-list" aria-label="Interaction progress">
            <li data-current={phase === 'idle'} data-complete={phase !== 'idle'}><span>{phase === 'idle' ? '1' : <Check size={11} aria-hidden="true" />}</span>Select</li>
            <li data-current={phase === 'selected'} data-complete={phase === 'reaching' || phase === 'done'}><span>{phase === 'reaching' || phase === 'done' ? <Check size={11} aria-hidden="true" /> : '2'}</span>Confirm</li>
            <li data-current={phase === 'reaching' || phase === 'done'} data-complete={phase === 'done'}><span>{phase === 'done' ? <Check size={11} aria-hidden="true" /> : '3'}</span>Complete</li>
          </ol>
          <p className="day-status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
        </div>
        <div className="day-action-area">
          {phase === 'idle' && <button ref={chooseRef} type="button" className="button button-primary day-action" onClick={choose}>Select the {item.object}<ArrowRight size={16} aria-hidden="true" /></button>}
          {phase === 'selected' && <div className="day-confirm-actions">
            <button ref={confirmRef} type="button" className="button button-primary day-action" onClick={() => confirm('blink')}><Eye size={17} aria-hidden="true" />Simulate a blink</button>
            <button type="button" className="button day-secondary-button" onClick={() => confirm('voice')}><Mic size={16} aria-hidden="true" />Simulate “yes”</button>
          </div>}
          {phase === 'reaching' && <span className="day-reaching-label">Bringing the {item.object} closer…</span>}
          {phase === 'done' && <button ref={nextRef} type="button" className="button button-primary day-action" onClick={onNext}>{item.id === 'phone' ? 'Back to medicine' : 'Choose another object'}<ArrowRight size={16} aria-hidden="true" /></button>}
          {phase !== 'idle' && <button ref={cancelRef} type="button" className="day-reset" onClick={reset}>{phase === 'done' ? <><RotateCcw size={13} aria-hidden="true" />Try again</> : 'Cancel'}</button>}
        </div>
      </div>
    </div>
  );
}

export default function DayExperience() {
  const tabRefs = useRef<Record<string, HTMLElement | null>>({});
  const focusNextObject = useRef(false);
  const [activeObject, setActiveObject] = useState<ObjectId>(() => {
    const parameters = new URLSearchParams(window.location.search);
    const legacyObjects: Record<string, ObjectId> = { morning: 'mug', afternoon: 'water', evening: 'phone' };
    const requested = parameters.get('object') ?? legacyObjects[parameters.get('moment') ?? ''];
    return objects.find(item => item.id === requested)?.id ?? 'medicine';
  });

  useEffect(() => {
    if (!focusNextObject.current) return;
    focusNextObject.current = false;
    tabRefs.current[activeObject]?.focus();
  }, [activeObject]);

  return (
    <div className="day-page">
      <a className="skip-link" href="#day-main">Skip to content</a>
      <header className="container day-header">
        <Wordmark />
        <a href="/" className="text-link day-back"><ArrowLeft size={15} aria-hidden="true" />Home</a>
      </header>
      <main className="container day-main" id="day-main">
        <div className="day-heading-row">
          <h1>Explore assistive reach</h1>
          <p className="day-intro">Select an object, confirm your choice, and see how an assistive arm could bring it within reach.</p>
        </div>
        <Tabs.Root className="day-tabs" value={activeObject} onValueChange={(value) => setActiveObject(value as ObjectId)}>
          <Tabs.List className="day-tab-list" aria-label="Objects to explore" activateOnFocus>
            {objects.map((item) => <Tabs.Tab ref={(element) => { tabRefs.current[item.id] = element; }} key={item.id} className="day-tab" value={item.id}>{item.label}</Tabs.Tab>)}
            <Tabs.Indicator className="day-tab-indicator" />
          </Tabs.List>
          <div className="day-panels">
            {objects.map((item, index) => <Tabs.Panel className="day-panel" key={item.id} value={item.id}><ObjectPanel item={item} active={activeObject === item.id} onNext={() => { focusNextObject.current = true; setActiveObject(objects[(index + 1) % objects.length].id); }} /></Tabs.Panel>)}
          </div>
        </Tabs.Root>
        <p className="day-demo-note">This is a button-controlled demonstration; no camera, microphone, or robot is connected.</p>
      </main>
      <footer className="container day-footer"><a href="/">Look</a><a href="/style-guide">Style guide</a></footer>
    </div>
  );
}
