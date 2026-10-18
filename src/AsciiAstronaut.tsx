import { useEffect, useRef, useState } from 'react';
import './ascii-astronaut.css';

type AstronautPhase = 'idle' | 'selected' | 'reaching' | 'done';
type Expression = 'open' | 'blink' | 'look' | 'smile';
type Hand = 'down' | 'raised' | 'wave';
type Frame = { expression: Expression; hand: Hand; arm?: number };
type AsciiAstronautProps = { compact?: boolean; phase?: AstronautPhase; className?: string };

const WIDTH = 49;
const FRAME_TIME = 200;
// Every pose uses the same text grid; only the face and glove characters change.
const SUIT = String.raw`                  .-""""""""-.
               .-'            '-.
             .'    .--------.    '.
            /    .'          '.    \
           /    /              \    \
          |    |    o    o      |    |
          |    |      __       |    |
          |    |    \____/     |    |
          |     \              /    |
           \     '------------'    /
            '.                    .'
              '-.______________.-'
             ___|====[  ]====|___
        .---'   |            |   '---.
       /  .--.  |   L O O K  |  .--.  \
      /  /   |  | .--------. |  |   \  \
     |  |    |  | | []  [] | |  |    |  |
     |  |    |  | |   o    | |  |    |  |
     |  |    |  | '--------' |  |    |  |
     |==|    |  |            |  |    |==|
     /  \    |  '------------'  |    /  \
    | || |   | .--------------. |   | || |
    | || |   | |==============| |   | || |
     \__/    | '--------------' |    \__/
             |   .---.  .---.   |
             |   |   |  |   |   |
             |   |   |  |   |   |
             |===|   |  |   |===|
             |   |   |  |   |   |
             |   |   |  |   |   |
             |___|___|  |___|___|
            /        |  |        \
           /_________|  |_________\
`;

const BASE_ROWS = SUIT.trimEnd().split('\n').map(row => row.padEnd(WIDTH, ' '));
const frames = {
  open: { expression: 'open', hand: 'down' },
  blink: { expression: 'blink', hand: 'down' },
  look: { expression: 'look', hand: 'down' },
  smile: { expression: 'smile', hand: 'down' },
  raised: { expression: 'smile', hand: 'raised' },
  wave: { expression: 'smile', hand: 'wave' },
} satisfies Record<string, Frame>;

const LOOP: Frame[] = [
  ...Array<Frame>(5).fill({ ...frames.open, arm: 0 }),
  { ...frames.blink, arm: 0 }, { ...frames.look, arm: 0 },
  { ...frames.look, arm: 1 }, { ...frames.look, arm: 1 },
  { ...frames.look, arm: 2 }, { ...frames.look, arm: 2 },
  { ...frames.look, arm: 3 }, { ...frames.look, arm: 3 },
  { ...frames.smile, arm: 4 },
  ...Array<Frame>(8).fill({ ...frames.smile, arm: 4 }),
  { ...frames.blink, arm: 4 }, { ...frames.smile, arm: 4 },
  { ...frames.look, arm: 3 }, { ...frames.look, arm: 3 },
  { ...frames.look, arm: 2 }, { ...frames.look, arm: 2 },
  { ...frames.open, arm: 1 }, { ...frames.open, arm: 1 },
  ...Array<Frame>(4).fill({ ...frames.open, arm: 0 }),
];
const PHASE_FRAMES: Record<AstronautPhase, Frame[]> = {
  idle: [frames.open, frames.open, frames.blink, frames.open],
  selected: [frames.open, frames.blink, frames.look],
  reaching: [frames.blink, frames.blink, ...Array<Frame>(15).fill(frames.look), frames.open],
  done: [frames.smile, frames.raised, frames.wave, frames.wave, frames.raised, frames.raised, frames.wave, frames.wave, frames.smile],
};

function drawFrame(frame: Frame) {
  const grid = BASE_ROWS.map(row => row.split(''));
  const put = (x: number, y: number, content: string) => {
    [...content].forEach((character, index) => { if (grid[y] && x + index < WIDTH) grid[y][x + index] = character; });
  };
  const eyes = frame.expression === 'blink' ? '-    -' : frame.expression === 'look' ? '>    >' : frame.expression === 'smile' ? '^    ^' : 'o    o';
  put(20, 5, eyes);
  put(20, 7, frame.expression === 'smile' ? '\\____/' : frame.expression === 'blink' ? ' ____ ' : '  __  ');
  if (frame.hand !== 'down') {
    // Lift the left glove while the suit, helmet and boots remain registered.
    for (let y = 14; y <= 23; y++) put(0, y, ' '.repeat(13));
    const raised = frame.hand === 'raised'
      ? ['  _ _ ', ' | | |', ' | | |', ' |   |', '  \\_/ ', '   || ', '   || ', '   \\  ', '    \\ ', '     \\___', '      |==|', '      |  |', '      \\__|']
      : [' \\ | /', '  \\|/ ', '  |  |', '  |  |', '  \\_/ ', '   || ', '   || ', '   \\  ', '    \\ ', '     \\___', '      |==|', '      |  |', '      \\__|'];
    raised.forEach((row, index) => put(2, 7 + index, row));
    put(8, 15, '_____/');
  }
  return grid.map(row => row.join(''));
}

// A side view of an orbiter with an open payload bay. All parts are text.
const SPACE_WIDTH = 67;
const SPACE_HEIGHT = 37;
const BAY_ASTRONAUT = String.raw`     .-""""-.
   .' .----. '.
  / .'      '. \
 | |  o  o   | |
 | |   __    | |
 | |  \__/   | |
  \ '------' /
   '._====_.'
    /|LOOK|\
   / |[]o | \
  (==|____|==)
  / /|====|\ \
 [ ] | || | [ ]
     | || |
     |=||=|
     | || |
    _|_||_|_
   /___||___\
`;
const ARM_POSES = [
  { elbow: [12, 10], wrist: [22, 12] },
  { elbow: [14, 9], wrist: [23, 13] },
  { elbow: [16, 8], wrist: [25, 15] },
  { elbow: [18, 9], wrist: [25, 16] },
  { elbow: [20, 10], wrist: [26, 17] },
] as const;

function drawSpaceFrame(frame: Frame) {
  const grid = Array.from({ length: SPACE_HEIGHT }, () => Array<string>(SPACE_WIDTH).fill(' '));
  const put = (x: number, y: number, text: string) => {
    [...text].forEach((character, index) => { if (grid[y] && x + index >= 0 && x + index < SPACE_WIDTH) grid[y][x + index] = character; });
  };
  // Bresenham paths keep every arm segment connected on the character grid.
  const line = (x0: number, y0: number, x1: number, y1: number, glyph?: string) => {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let error = dx - dy;
    const diagonal = sx === sy ? '\\' : '/';
    let lastY = Number.NaN;
    for (;;) {
      const character = glyph ?? (dy === 0 ? '_' : dx === 0 ? '|' : dx > dy && lastY === y0 ? '_' : diagonal);
      put(x0, y0, character);
      lastY = y0;
      if (x0 === x1 && y0 === y1) break;
      const doubled = 2 * error;
      if (doubled > -dy) { error -= dy; x0 += sx; }
      if (doubled < dx) { error += dx; y0 += sy; }
    }
  };
  put(8, 3, '+'); put(56, 3, '.'); put(30, 1, '.');
  // Orbiter silhouette, swept wing, cockpit and rear engines.
  line(9, 24, 9, 16); line(9, 16, 16, 24);
  line(24, 29, 38, 35); line(38, 35, 55, 29);
  line(30, 30, 39, 33); line(39, 33, 49, 30);
  line(10, 24, 50, 24); line(50, 24, 53, 22);
  line(53, 22, 57, 22); line(57, 22, 62, 25);
  line(62, 25, 65, 27); line(65, 27, 65, 28);
  line(65, 28, 61, 30); line(61, 30, 12, 30);
  line(12, 30, 9, 28); line(9, 28, 9, 24);
  put(4, 25, '((==|'); put(4, 27, '((==|'); put(4, 29, '((==|');
  put(52, 24, '[__][_]'); put(60, 26, '.---.');
  put(16, 23, '.--------------------------------.');
  put(16, 24, '|                                |');
  put(16, 25, '|________________________________|');
  put(17, 28, '____  ____  ____  ____  ____  ____');
  // The astronaut's boot restraints are fixed to the payload-bay floor.
  BAY_ASTRONAUT.trimEnd().split('\n').forEach((row, y) => put(34, 5 + y, row));
  put(40, 23, '| |  | |');
  put(39, 24, '[___][___]');
  const eyes = frame.expression === 'blink' ? '-  -' : frame.expression === 'look' ? '<  <' : frame.expression === 'smile' ? '^  ^' : 'o  o';
  put(40, 8, eyes);
  put(40, 10, frame.expression === 'smile' ? '\\__/' : ' __ ');

  const poseIndex = frame.arm ?? (frame.expression === 'smile' ? 4 : frame.expression === 'look' ? 3 : 0);
  const pose = ARM_POSES[poseIndex];
  const root = [18, 24] as const;
  for (const offset of [-1, 1]) {
    line(root[0] + offset, root[1] - 1, pose.elbow[0] + offset, pose.elbow[1], '=');
    line(pose.elbow[0] + offset, pose.elbow[1], pose.wrist[0] + offset, pose.wrist[1], '=');
  }
  put(root[0] - 3, root[1], '[=(O)=]');
  put(pose.elbow[0] - 1, pose.elbow[1], '(O)');
  put(pose.wrist[0] - 1, pose.wrist[1], '(O)==[=|=]');
  // The wrench is held by the gripper through approach, assist and return.
  const toolX = pose.wrist[0] + 6;
  put(toolX, pose.wrist[1] - 2, 'U');
  put(toolX, pose.wrist[1] - 1, '|');
  put(toolX, pose.wrist[1], '|');
  put(toolX, pose.wrist[1] + 1, '|');
  put(toolX, pose.wrist[1] + 2, 'o');
  return grid.map(row => row.join(''));
}

const DESCRIPTIONS: Record<AstronautPhase, string> = {
  idle: 'An ASCII astronaut with a round helmet, a friendly face and a pressure suit with a Look chest patch.',
  selected: 'The ASCII astronaut looks towards the selected object.',
  reaching: 'The ASCII astronaut watches the pickup with a focused expression.',
  done: 'The ASCII astronaut smiles after the interaction.',
};

export default function AsciiAstronaut({ compact = false, phase, className = '' }: AsciiAstronautProps) {
  const figure = useRef<HTMLElement>(null);
  const userChosePlay = useRef(false);
  const standalone = phase === undefined && !compact;
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(!document.hidden);
  const [frameIndex, setFrameIndex] = useState(0);
  const sequence = standalone ? LOOP : PHASE_FRAMES[phase ?? 'idle'];

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => {
      setReducedMotion(preference.matches);
      if (preference.matches && !userChosePlay.current) setPlaying(false);
    };
    const visibility = () => setDocumentVisible(!document.hidden);
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)), { threshold: 0.05 });
    if (figure.current) observer.observe(figure.current);
    preference.addEventListener('change', change);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', change);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(() => { setFrameIndex(0); }, [phase, compact]);

  useEffect(() => {
    if (!visible || !documentVisible) return;
    if (standalone ? !playing : reducedMotion || sequence.length < 2) return;
    if (!standalone && frameIndex >= sequence.length - 1) return;
    const timer = window.setTimeout(() => {
      setFrameIndex(previous => standalone ? (previous + 1) % sequence.length : Math.min(previous + 1, sequence.length - 1));
    }, FRAME_TIME);
    return () => window.clearTimeout(timer);
  }, [standalone, playing, visible, documentVisible, reducedMotion, sequence, frameIndex]);

  const activeIndex = !standalone && reducedMotion ? sequence.length - 1 : Math.min(frameIndex, sequence.length - 1);
  // The compact crop shows the helmet and chest; omit off-crop glove poses.
  const frame = compact ? { ...sequence[activeIndex], hand: 'down' as const } : sequence[activeIndex];
  const fullText = drawFrame(frame);
  const text = compact ? fullText.slice(0, 16).map(row => row.slice(8, 43)) : drawSpaceFrame(frame);
  const label = compact && (!phase || phase === 'idle')
    ? 'An ASCII astronaut’s helmet and friendly face above a Look chest patch.'
    : compact ? DESCRIPTIONS[phase ?? 'idle']
    : 'An ASCII space concept: an astronaut is secured inside a shuttle payload bay while a large robotic arm, mounted to the shuttle, holds a wrench beside the astronaut.';
  const toggle = () => {
    userChosePlay.current = !playing;
    setPlaying(!playing);
  };

  return <figure ref={figure} className={`ascii-astronaut ${compact ? 'ascii-astronaut--compact' : 'ascii-astronaut--space'} ${className}`} data-phase={phase ?? 'ambient'}>
    <div className="ascii-astronaut-stage" role="img" aria-label={label}>
      <pre className="ascii-astronaut-art" aria-hidden="true">{text.map((row, index) => <span key={index} className={compact ? (index >= 5 && index <= 7 ? 'ascii-astronaut-face' : index === 14 ? 'ascii-astronaut-patch' : undefined) : (index >= 8 && index <= 10 ? 'ascii-astronaut-face' : undefined)}>{row}{index < text.length - 1 ? '\n' : ''}</span>)}</pre>
    </div>
    {standalone && <figcaption className="ascii-astronaut-controls"><span>Space concept</span><button type="button" onClick={toggle} aria-label={playing ? 'Pause astronaut animation' : 'Play astronaut animation'} aria-pressed={playing}><span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span>{playing ? 'Pause' : 'Play'}</button></figcaption>}
  </figure>;
}
