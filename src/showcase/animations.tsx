import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import RobotScene, { type RobotMoment, type RobotPhase } from '../RobotScene';
import SpaceScene from '../SpaceScene';
import { createDemoController } from './demo-controller.js';
import './animations.css';

const objects: { moment: RobotMoment; label: string; backend: string }[] = [
  { moment: 'medicine', label: 'Medicine', backend: 'medication' },
  { moment: 'mug', label: 'Mug', backend: 'mug' },
  { moment: 'water', label: 'Water bottle', backend: 'water_bottle' },
  { moment: 'phone', label: 'Phone', backend: 'phone' },
];

function ArmAnimation() {
  const [controller] = useState(createDemoController);
  const [state, setState] = useState(controller.readState);
  const [moment, setMoment] = useState<RobotMoment>('medicine');
  const current = objects.find(object => object.moment === moment)!;
  const stateRef = useRef(state);
  stateRef.current = state;
  const reaching = state.arm === 'grabbing';
  const phase: RobotPhase = state.arm === 'awaiting confirmation' ? 'selected' : reaching ? 'reaching' : state.arm === 'delivered' ? 'done' : 'idle';
  const select = (next: RobotMoment) => {
    if (reaching) return;
    const object = objects.find(item => item.moment === next)!;
    setMoment(next);
    setState(controller.performAction('select', { label: object.backend }));
  };
  const complete = () => {
    const snapshot = stateRef.current;
    if (snapshot.arm !== 'grabbing' || !snapshot.animation_id) return;
    setState(controller.performAction('animation_complete', { animation_id: snapshot.animation_id }));
  };
  const status = reaching
    ? moment === 'medicine' ? 'Opening the compartment and transferring the pills to the bedside dish…' : `Moving the ${current.label.toLowerCase()} across the desk…`
    : phase === 'done' ? 'The illustrated delivery is complete.'
      : phase === 'selected' ? `Confirm to start the ${current.label.toLowerCase()} animation.`
        : 'Select an object to begin.';

  return <>
    <div className="animation-objects" role="group" aria-label="Choose an object to animate">
      {objects.map(object => <button key={object.moment} type="button" aria-pressed={moment === object.moment} disabled={reaching} onClick={() => select(object.moment)}>{object.label}</button>)}
    </div>
    <RobotScene key={moment} moment={moment} phase={phase} interactive onSelect={() => select(moment)} onComplete={complete} />
    <div className="animation-actions">
      <p role="status">{status}</p>
      <div>
        <button type="button" className="primary" disabled={phase !== 'selected'} onClick={() => setState(controller.performAction('confirm'))}>{reaching ? 'Animating…' : 'Confirm animation'}</button>
        <button type="button" onClick={() => setState(controller.performAction('reset'))}>{reaching ? 'Stop animation' : 'Reset'}</button>
      </div>
    </div>
    <p className="animation-note">{moment === 'medicine'
      ? 'A concept sequence showing a weekly organizer opening and two illustrative pills moving to a bedside dish. It does not select medication or determine a dose.'
      : 'The SO-101-inspired model shows how a connected gripper can bring the chosen object closer.'} These controls operate this browser illustration only.</p>
  </>;
}

function Animations() {
  const [scene, setScene] = useState<'desk' | 'space'>('desk');
  return <section className="panel animation-panel" aria-label="Illustrative arm animations">
    <div className="animation-scenarios" role="group" aria-label="Choose a scenario">
      <button type="button" aria-pressed={scene === 'desk'} onClick={() => setScene('desk')}>Desk assistance · 3D</button>
      <button type="button" aria-pressed={scene === 'space'} onClick={() => setScene('space')}>Shuttle concept</button>
    </div>
    {scene === 'desk' ? <ArmAnimation /> : <>
      <SpaceScene />
      <p className="animation-note">A coded illustration of a deck-mounted arm holding a tool beside an astronaut in the shuttle payload bay. This is an exploratory use case.</p>
    </>}
  </section>;
}

export function mountAnimations(container: HTMLElement) {
  const root = createRoot(container);
  root.render(<Animations />);
  return () => root.unmount();
}
