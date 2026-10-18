import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { Dialog } from '@base-ui/react/dialog';
import { Collapsible } from '@base-ui/react/collapsible';
import { Button } from '@base-ui/react/button';
import { motion, useReducedMotion, useScroll } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Moon, Play, Sun, X } from 'lucide-react';
import Wordmark from './Wordmark';
import SpaceScene from './SpaceScene';
import { LiquidButton } from './components/ui/liquid-glass-button';
import type { RobotMoment, RobotPhase } from './RobotScene';

const DayExperience = lazy(() => import('./DayExperience'));
const StyleGuide = lazy(() => import('./StyleGuide'));
const RobotScene = lazy(() => import('./RobotScene'));

const moments = [
  { id: 'medicine', label: 'Medicine', title: 'Move pills to the bedside table', copy: 'After confirmation, the arm opens a compartment in the weekly organizer, picks up the pills, and places them in a dish on the nearby bedside table.', note: 'Medication delivery concept. The compartment is preset in this simulation; medicine and dose selection are not automated.' },
  { id: 'mug', label: 'Mug', title: 'Bring a mug closer', copy: 'Choose a mug with your gaze, then confirm the pickup. The simulated arm brings it toward the front of the desk.' },
  { id: 'water', label: 'Water', title: 'Reach for water', copy: 'Select a water bottle and confirm when you want it moved. The gripper closes around the bottle and brings it within reach.' },
  { id: 'phone', label: 'Phone', title: 'Move a phone within reach', copy: 'Explore phone pickup as a future use case. This animation shows the interaction without claiming that the physical prototype has demonstrated it.' },
] satisfies { id: RobotMoment; label: string; title: string; copy: string; note?: string }[];

const technology = [
  { name: 'Eye tracking', label: 'Select', copy: 'Calibration maps the user’s gaze to objects detected in the workspace camera.' },
  { name: 'Chalk', label: 'Add context', copy: 'Patterns in interaction history help rank possible targets when gaze evidence is ambiguous.' },
  { name: 'Blink or Grok', label: 'Confirm', copy: 'A deliberate blink or a spoken response interpreted by Grok confirms the selected object.' },
  { name: 'SO-101 + LeRobot', label: 'Reach', copy: 'The tabletop follower arm provides the hardware, with LeRobot supporting calibration and movement development.' },
];

function VideoLink() {
  return <Dialog.Root>
    <Dialog.Trigger className="video-link"><Play size={13} aria-hidden="true" />Watch video<span className="soon-label">Coming soon</span></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className="dialog-backdrop" />
      <Dialog.Popup className="dialog-popup">
        <Dialog.Close className="icon-button dialog-close" aria-label="Close video information"><X size={20} /></Dialog.Close>
        <Dialog.Title>Prototype video</Dialog.Title>
        <Dialog.Description>The recording will be added here when it is ready. You can explore the simulated interaction now.</Dialog.Description>
        <a href="/demo" className="button button-primary">Explore the demo <ArrowRight size={17} /></a>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}

function ArmPreview({ moment }: { moment: RobotMoment }) {
  const [phase, setPhase] = useState<RobotPhase>('idle');
  const label = moment === 'medicine' ? 'pill delivery' : 'pickup';
  return <div className="landing-arm-preview">
    <Suspense fallback={<div className="arm-preview-loading" role="status">Loading arm model…</div>}>
      <RobotScene moment={moment} phase={phase} onComplete={() => setPhase('done')} />
    </Suspense>
    <div className="arm-preview-controls">
      <span role="status">{phase === 'reaching' ? 'Playing the delivery sequence…' : phase === 'done' ? 'Delivery preview complete' : 'Explore the tabletop arm'}</span>
      <button type="button" onClick={() => setPhase(phase === 'reaching' ? 'idle' : 'reaching')}>{phase === 'reaching' ? 'Stop preview' : `${phase === 'done' ? 'Replay' : 'Preview'} ${label}`}<Play size={12} aria-hidden="true" /></button>
    </div>
  </div>;
}

function StoryTabs() {
  return <Tabs.Root className="story-tabs" defaultValue="medicine">
    <Tabs.List className="tab-list" aria-label="Objects to explore" activateOnFocus>
      {moments.map(moment => <Tabs.Tab className="moment-tab" key={moment.id} value={moment.id}>{moment.label}</Tabs.Tab>)}
      <Tabs.Indicator className="tab-indicator" />
    </Tabs.List>
    <div className="story-panels">
      {moments.map(moment => <Tabs.Panel className="story-panel" key={moment.id} value={moment.id}>
        <div className="story-object-copy"><h3>{moment.title}</h3><p>{moment.copy}</p>{moment.note && <p className="story-concept-note">{moment.note}</p>}<a className="text-link" href={`/demo?object=${moment.id}`}>Try the guided demo <ArrowUpRight size={16} /></a></div><ArmPreview moment={moment.id} />
      </Tabs.Panel>)}
    </div>
  </Tabs.Root>;
}

function Technology() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollXProgress } = useScroll({ container, axis: 'x', trackContentSize: true });
  const reduceMotion = useReducedMotion();
  const [position, setPosition] = useState({ back: false, next: true, overflow: true });

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const update = () => {
      const remaining = element.scrollWidth - element.clientWidth - element.scrollLeft;
      setPosition({ back: element.scrollLeft > 2, next: remaining > 2, overflow: element.scrollWidth > element.clientWidth + 2 });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener('scroll', update, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener('scroll', update); };
  }, []);

  function move(direction: number) {
    const element = container.current;
    if (!element) return;
    const card = element.querySelector('article');
    element.scrollBy({ left: direction * ((card?.getBoundingClientRect().width ?? 300) + 32), behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  return <section className="technology-section container" id="technology" aria-labelledby="technology-title">
    <div className="section-heading"><h2 id="technology-title">How the prototype works</h2><div className="rail-controls" hidden={!position.overflow}><button type="button" className="icon-button" aria-label="Previous technology component" disabled={!position.back} onClick={() => move(-1)}><ArrowLeft size={18} /></button><button type="button" className="icon-button" aria-label="Next technology component" disabled={!position.next} onClick={() => move(1)}><ArrowRight size={18} /></button></div></div>
    <p className="section-intro">The system is designed around four stages, with confirmation required before a grasp.</p>
    <div className="tech-rail" ref={container} tabIndex={0} role="region" aria-label="Technology components" onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); } }}>
      {technology.map((item) => <article className="tech-item" key={item.name}><div className="tech-label"><span>{item.label}</span></div><h3>{item.name}</h3><p>{item.copy}</p></article>)}
    </div>
    <div className="scroll-track" aria-hidden="true" hidden={!position.overflow}><motion.div className="scroll-progress" style={{ scaleX: scrollXProgress }} /></div>
    <Collapsible.Root className="build-details"><Collapsible.Trigger className="build-trigger">Background analysis and build details <ChevronDown size={16} /></Collapsible.Trigger><Collapsible.Panel className="build-panel"><div className="build-grid"><div><h3>Factory Droid</h3><p>Background analysis turns interaction history into routine suggestions for Chalk. Development uses synthetic routine examples, and this analysis sits outside the live confirmation sequence.</p></div><div><h3>Prototype scope</h3><p>The self-printed arm build is estimated at $100–150 by the team, excluding a complete system cost. The website demonstrates the interaction through a simulation.</p></div></div><a className="text-link" href="https://github.com/THEschildkrote/armtracking" target="_blank" rel="noreferrer">View the project <ArrowUpRight size={15} /></a></Collapsible.Panel></Collapsible.Root>
  </section>;
}

function ThemeToggle() {
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark');
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try { localStorage.setItem('look-theme', next ? 'dark' : 'light'); } catch { /* Appearance does not depend on storage. */ }
  }
  return <Button className="theme-toggle" onClick={toggle} aria-label={dark ? 'Switch to light appearance' : 'Switch to dark appearance'} aria-pressed={dark}>{dark ? <Sun size={17} /> : <Moon size={17} />}</Button>;
}

function Home() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header container"><Wordmark /><nav aria-label="Main navigation"><a href="#story">Explore</a><a href="#technology">Technology</a></nav><a className="header-cta" href="/demo">Try the demo <ArrowUpRight size={16} /></a></header>
    <main id="main">
      <section className="hero container" aria-labelledby="hero-title"><div className="hero-copy"><h1 id="hero-title">An assistive arm<br /><em>guided by your gaze</em></h1><p className="hero-description">Look is an assistive robotics prototype for people with limited hand mobility, designed to put everyday objects within reach.</p><div className="hero-actions"><LiquidButton href="/demo">Explore the demo <ArrowUpRight size={17} aria-hidden="true" /></LiquidButton><VideoLink /></div></div><SpaceScene /></section>
      <section className="story-section container" id="story" aria-labelledby="story-title"><div className="section-heading"><h2 id="story-title">Everyday assistance within reach</h2><p>Explore the tabletop arm with a weekly pill organizer, then try other everyday objects.</p></div><StoryTabs /></section>
      <Technology />
    </main>
    <footer className="site-footer container"><Wordmark /><a href="/style-guide">Style guide <ArrowUpRight size={13} /></a><ThemeToggle /></footer>
  </>;
}

function NotFound() {
  return <div className="not-found container"><Wordmark /><main><p className="eyebrow">404</p><h1>Page not found</h1><p>Return to the Look website to explore the prototype.</p><a href="/" className="button button-primary">Back to Look <ArrowRight size={17} /></a></main></div>;
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  useEffect(() => { document.title = (path === '/demo' || path === '/day') ? 'Interactive demo — Look' : path === '/style-guide' ? 'Look — Style guide' : path === '/' ? 'Look — An assistive arm guided by your gaze' : 'Page not found — Look'; }, [path]);
  return <Suspense fallback={<div className="route-loading" role="status">Loading Look…</div>}>{path === '/' ? <Home /> : (path === '/demo' || path === '/day') ? <DayExperience /> : path === '/style-guide' ? <StyleGuide /> : <NotFound />}</Suspense>;
}
