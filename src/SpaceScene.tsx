import { useEffect, useId, useRef, useState } from 'react';
import './space-scene.css';

type SpacePhase = 'idle' | 'selected' | 'reaching' | 'done';
type SpaceSceneProps = { compact?: boolean; phase?: SpacePhase; className?: string };
const CYCLE_MS = 8000;
const degrees = (angle: number) => angle * 180 / Math.PI;

function Joint({ radius = 11 }: { radius?: number }) {
  return <g>
    <circle r={radius} fill="#56655b" stroke="#303b34" strokeWidth="1.6" />
    <circle r={radius - 3.5} fill="#c3c9be" stroke="#7f8b80" strokeWidth="1" />
    <circle r="2.7" fill="#657469" />
    {[0, 90, 180, 270].map(angle => <circle key={angle} cx={Math.cos(angle * Math.PI / 180) * (radius - 2)} cy={Math.sin(angle * Math.PI / 180) * (radius - 2)} r="1" fill="#e7e8df" />)}
  </g>;
}

function ArmLink({ length, metal }: { length: number; metal: string }) {
  return <g>
    <rect x="0" y="-8" width={length} height="16" rx="7" fill={`url(#${metal})`} stroke="#647268" strokeWidth="1.7" />
    <path d={`M9 -3 H${length - 9}`} fill="none" stroke="#f3f3e9" strokeWidth="1.6" />
    <path d={`M13 4 H${length - 13}`} fill="none" stroke="#88968a" strokeWidth="1" />
    {[0.27, 0.48, 0.69].map(ratio => <rect key={ratio} x={length * ratio - 4} y="-2.3" width="8" height="4.6" rx="2.3" fill="#78877c" />)}
    <path d={`M5 10 C${length * .3} 17 ${length * .7} 14 ${length - 5} 9`} stroke="#44574b" strokeWidth="2.2" fill="none" />
    <path d={`M6 12 C${length * .3} 19 ${length * .7} 17 ${length - 6} 11`} stroke="#a49778" strokeWidth="1" fill="none" />
  </g>;
}

function Astronaut({ id, visorShift = 0 }: { id: string; visorShift?: number }) {
  return <g strokeLinejoin="round" strokeLinecap="round">
    {/* Life-support pack sits behind a three-quarter-view pressure suit. */}
    <path d="M466 217 L496 208 L522 218 L524 284 L503 299 L475 284Z" fill="#a8b3a6" stroke="#647367" strokeWidth="1.7" />
    <path d="M502 216 L519 221 L520 280 L504 289Z" fill="#8f9f90" />
    <path d="M508 227 L517 230 M508 237 L517 240 M508 270 L517 267" stroke="#c5cec0" strokeWidth="2" />
    <path d="M521 258 C546 280 529 323 499 340 C477 356 463 383 462 429" fill="none" stroke="#817d60" strokeWidth="3.6" />
    <path d="M521 258 C546 280 529 323 499 340 C477 356 463 383 462 429" fill="none" stroke="#c1b797" strokeWidth="1.4" />
    <circle cx="462" cy="429" r="4" fill="#a3afa0" stroke="#566b5b" strokeWidth="2" />
    {/* Far arm hangs close to the body, without a posed or waving gesture. */}
    <path d="M464 226 C454 230 449 246 447 262 L450 286 L464 286 L465 262 L475 240Z" fill="#d8dcd1" stroke="#6b7a6e" strokeWidth="1.6" />
    <g stroke="#a4afa1" strokeWidth="2">
      <path d="M448 258 L464 262 M448 263 L464 267 M449 268 L464 272 M450 273 L464 277" />
    </g>
    <path d="M449 284 L463 283 L466 298 L461 310 L453 310 L448 299Z" fill="#e8e9df" stroke="#788578" strokeWidth="1.4" />
    <path d="M454 293 L455 304 M458 292 L459 303" stroke="#a8b2a3" strokeWidth="1" />
    {/* Torso, restraint harness and equipment interfaces. */}
    <path d="M474 215 C466 218 460 226 459 240 L463 278 L467 302 Q489 313 509 299 L516 253 L511 229 L499 215Z" fill={`url(#${id}-suit)`} stroke="#68786b" strokeWidth="1.8" />
    <path d="M467 227 C468 247 469 275 475 299 M504 222 C508 246 506 276 502 300" stroke="#b2bba9" strokeWidth="2.4" fill="none" />
    <path d="M469 234 L502 232 L504 260 L471 264Z" fill="#dce0d4" stroke="#98a592" strokeWidth="1.2" />
    <path d="M475 240 L496 238 M475 246 L496 244" stroke="#b5bfae" strokeWidth="1.3" />
    <rect x="476" y="250" width="9" height="6" rx="1" fill="#748576" />
    <rect x="489" y="248" width="9" height="6" rx="1" fill="#a7b29f" stroke="#788b78" strokeWidth=".8" />
    <circle cx="475" cy="279" r="6" fill="#a8b5a2" stroke="#697e6c" strokeWidth="1.2" />
    <circle cx="475" cy="279" r="2.6" fill="#536c5c" />
    <circle cx="499" cy="276" r="6" fill="#b2bcaa" stroke="#697e6c" strokeWidth="1.2" />
    <circle cx="499" cy="276" r="2.6" fill="#6d7b6a" />
    <path d="M467 294 Q486 305 510 292 L509 304 Q487 315 469 306Z" fill="#aeb9a7" stroke="#758775" strokeWidth="1.2" />
    <path d="M478 299 L494 301 L493 309 L478 307Z" fill="#667b69" stroke="#d3d9c9" strokeWidth="1" />
    {/* Adult-length legs and ribbed knees lead to restrained boots. */}
    <path d="M470 306 L488 311 L487 345 L479 374 L477 401 L459 402 L461 371 L463 339Z" fill={`url(#${id}-suit)`} stroke="#73816f" strokeWidth="1.7" />
    <path d="M490 311 L508 305 L515 338 L515 369 L520 397 L501 401 L495 371 L492 343Z" fill={`url(#${id}-suit)`} stroke="#73816f" strokeWidth="1.7" />
    <path d="M465 342 L484 346 M464 347 L482 352 M463 352 L481 357 M462 357 L480 362" stroke="#aab59f" strokeWidth="2.2" />
    <path d="M495 343 L514 339 M496 349 L515 345 M497 355 L515 351 M498 361 L515 357" stroke="#aab59f" strokeWidth="2.2" />
    <path d="M460 399 L478 399 L481 412 L470 423 L447 424 L445 418 L458 409Z" fill="#d2d8ca" stroke="#687b68" strokeWidth="1.5" />
    <path d="M500 398 L519 395 L526 405 L543 410 L542 417 L516 419 L503 413Z" fill="#d2d8ca" stroke="#687b68" strokeWidth="1.5" />
    <path d="M446 420 L468 420 L480 410 M505 410 L518 415 L542 413" stroke="#879780" strokeWidth="2" fill="none" />
    <path d="M456 405 L474 409 M508 402 L522 399" stroke="#98a88e" strokeWidth="2" />
    {/* Forearm rests beside the tool offered by the deck-mounted arm. */}
    <path d="M507 226 C519 223 525 233 530 249 L537 262 L526 272 L515 257 L506 246Z" fill={`url(#${id}-suit)`} stroke="#6e7e6c" strokeWidth="1.6" />
    <path d="M528 255 L516 262 M530 259 L519 267 M533 263 L523 271" stroke="#a5b29b" strokeWidth="2.1" />
    <path d="M533 263 L550 276 L542 288 L525 274Z" fill="#e8e9df" stroke="#768775" strokeWidth="1.5" />
    <path d="M548 275 L555 280 L557 288 L550 296 L542 292 L538 287Z" fill="#eeeede" stroke="#7c8c76" strokeWidth="1.4" />
    <path d="M550 282 L553 286 M546 284 L550 289 M543 286 L546 291" stroke="#a6b29b" strokeWidth="1" />
    {/* Sealed collar and a reflective visor; there is no visible face. */}
    <ellipse cx="485" cy="216" rx="22" ry="7" fill="#aab7a4" stroke="#637662" strokeWidth="1.5" />
    <ellipse cx="486" cy="213" rx="21" ry="5.2" fill="#dce1d4" stroke="#87987d" strokeWidth="1.1" />
    <path d="M467 208 C458 201 457 182 466 172 C475 161 493 159 504 169 C516 179 517 197 507 207 Q488 220 467 208Z" fill={`url(#${id}-helmet)`} stroke="#6c7d6b" strokeWidth="1.7" />
    <path d="M477 171 C490 165 501 173 506 183 C512 198 502 207 490 209 C480 210 469 206 467 195 C465 183 468 176 477 171Z" fill={`url(#${id}-visor)`} stroke="#596b5d" strokeWidth="1.6" />
    <g clipPath={`url(#${id}-visor-clip)`}><g transform={`translate(${visorShift} 0)`}>
      <path d="M466 178 L499 165 L511 180 L476 192Z" fill="#d1d3b5" opacity=".30" />
      <path d="M468 201 L514 186 L516 194 L473 211Z" fill="#b5c3aa" opacity=".22" />
      <path d="M478 171 L483 171 L471 206 L468 203Z" fill="#f0edcf" opacity=".28" />
    </g></g>
    <path d="M463 183 L458 183 L458 197 L464 198" fill="#aab9a0" stroke="#758a70" strokeWidth="1.1" />
    <path d="M505 177 L512 181 L513 190" fill="none" stroke="#d9dfcc" strokeWidth="2.2" />
  </g>;
}

export default function SpaceScene({ compact = false, phase = 'idle', className = '' }: SpaceSceneProps) {
  const id = `space-${useId().replace(/:/g, '')}`;
  const figure = useRef<HTMLElement>(null);
  const elapsed = useRef(0);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setDocumentVisible(document.visibilityState !== 'hidden');
    updateMotion();
    updateVisibility();
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    const observer = new IntersectionObserver(entries => setInView(entries.some(entry => entry.isIntersecting)), { threshold: 0.08 });
    if (figure.current) observer.observe(figure.current);
    return () => {
      media.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
      observer.disconnect();
    };
  }, []);

  const playing = !compact && !paused && !reducedMotion && inView && documentVisible;
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    let lastPaint = 0;
    const tick = (now: number) => {
      elapsed.current += Math.min(now - previous, 80);
      previous = now;
      if (now - lastPaint >= 40) { setTime(elapsed.current); lastPaint = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const cycle = reducedMotion || compact ? 0 : (time % CYCLE_MS) / CYCLE_MS;
  const wave = Math.sin(cycle * Math.PI * 2);
  const amplitude = phase === 'reaching' ? 1.2 : 1;
  const wristX = 579 + wave * 4 * amplitude + (phase === 'done' ? -3 : 0);
  const wristY = 278 + Math.sin(cycle * Math.PI * 2 + .7) * 3 * amplitude;
  const dx = wristX - 659;
  const dy = wristY - 349;
  const upperLength = 88;
  const lowerLength = 72;
  const elbowAngle = -Math.acos(Math.max(-1, Math.min(1, (dx * dx + dy * dy - upperLength ** 2 - lowerLength ** 2) / (2 * upperLength * lowerLength))));
  const shoulderAngle = Math.atan2(dy, dx) - Math.atan2(lowerLength * Math.sin(elbowAngle), upperLength + lowerLength * Math.cos(elbowAngle));
  const toolAngle = Math.PI + wave * .025;
  const wristAngle = toolAngle - shoulderAngle - elbowAngle;
  const label = compact
    ? 'Technical illustration of an adult astronaut in a pressure suit with a sealed reflective visor and life-support backpack.'
    : 'Illustrative space concept showing an adult astronaut restrained inside an oblique shuttle payload bay. A robotic arm bolted to the deck holds a wrench beside the astronaut’s glove. The connected arm moves slowly; the visor remains closed.';

  return <figure ref={figure} className={`space-scene${compact ? ' space-scene--compact' : ''} ${className}`} data-playing={playing} data-cycle-progress={cycle.toFixed(3)} data-motion-frame={Math.floor(time / 40)} data-phase={phase}>
    <div className="space-scene-stage">
      <svg className="space-scene-art" viewBox={compact ? '436 155 123 158' : '0 0 840 620'} role="img" aria-label={label}>
        <defs>
          <linearGradient id={`${id}-hull`} x1=".1" y1="0" x2=".75" y2="1"><stop stopColor="#fffdf6" /><stop offset=".55" stopColor="#e6e8dd" /><stop offset="1" stopColor="#b9c4b3" /></linearGradient>
          <linearGradient id={`${id}-deck`} x1="0" y1="0" x2=".2" y2="1"><stop stopColor="#b9c7b7" /><stop offset="1" stopColor="#d8dfcf" /></linearGradient>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f1f2e9" /><stop offset=".4" stopColor="#b9c3b5" /><stop offset=".6" stopColor="#d8dfd0" /><stop offset="1" stopColor="#869786" /></linearGradient>
          <linearGradient id={`${id}-suit`} x1="0" y1="0" x2="1" y2=".25"><stop stopColor="#d5dccd" /><stop offset=".45" stopColor="#faf8ed" /><stop offset="1" stopColor="#c5d0bb" /></linearGradient>
          <linearGradient id={`${id}-helmet`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fbf9ed" /><stop offset=".55" stopColor="#e0e5d5" /><stop offset="1" stopColor="#abbca3" /></linearGradient>
          <linearGradient id={`${id}-visor`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#566d60" /><stop offset=".38" stopColor="#354b40" /><stop offset=".7" stopColor="#7b8b70" /><stop offset="1" stopColor="#b2ad8b" /></linearGradient>
          <clipPath id={`${id}-visor-clip`}><path d="M477 171 C490 165 501 173 506 183 C512 198 502 207 490 209 C480 210 469 206 467 195 C465 183 468 176 477 171Z" /></clipPath>
        </defs>
        {!compact && <g strokeLinejoin="round" strokeLinecap="round">
          {/* Orbiter silhouette, wing and vertical stabilizer give the bay its context. */}
          <path d="M493 424 L699 551 L676 390 L622 347Z" fill="#d3dbcb" stroke="#899986" strokeWidth="1.5" />
          <path d="M518 430 L686 531 L671 418" fill="none" stroke="#a6b39c" strokeWidth="1.1" />
          <path d="M681 294 L683 159 L741 267 L744 327Z" fill={`url(#${id}-hull)`} stroke="#7d907c" strokeWidth="1.7" />
          <path d="M687 174 L691 274 L735 295" fill="none" stroke="#a6b49c" strokeWidth="1.1" />
          <path d="M682 290 L683 250 L717 279 L733 323Z" fill="#657a66" />
          <path d="M71 454 C99 413 174 377 277 349 L655 263 L718 284 Q770 309 784 359 L743 415 L350 519 Q217 552 116 502Z" fill={`url(#${id}-hull)`} stroke="#7c8f7c" strokeWidth="2" />
          <path d="M71 454 C129 492 225 520 350 499 L745 391 L784 359 L743 415 L350 519 Q217 552 116 502Z" fill="#8e9f8b" stroke="#71876f" strokeWidth="1.4" />
          <path d="M92 470 C177 510 245 518 343 503 M362 500 L731 402" fill="none" stroke="#becab5" strokeWidth="1.5" />
          <path d="M144 418 L174 397 L210 387 L224 398 L191 421 L159 431Z" fill="#3d5345" stroke="#70866e" strokeWidth="1.5" />
          <path d="M172 400 L182 421 M193 393 L205 411" stroke="#b2bfa6" strokeWidth="2.3" />
          <path d="M149 418 L174 402 M185 400 L202 394" stroke="#9eaf95" strokeWidth="1.2" />
          <path d="M126 445 Q182 419 254 407 M152 471 Q203 445 268 435 M233 369 L266 431 M198 382 L226 449" fill="none" stroke="#b6c2aa" strokeWidth="1" />
          <ellipse cx="755" cy="345" rx="17" ry="22" transform="rotate(-20 755 345)" fill="#4d6553" stroke="#a9b7a0" strokeWidth="5" />
          <ellipse cx="762" cy="374" rx="14" ry="18" transform="rotate(-20 762 374)" fill="#394f41" stroke="#a9b7a0" strokeWidth="4" />
          {/* Open far door and interior ribs, drawn before the working deck. */}
          <path d="M295 363 L658 282 L648 219 Q484 227 302 300Z" fill="#e9ece0" stroke="#8f9f87" strokeWidth="1.7" />
          <path d="M307 345 L645 270 L638 232 Q464 250 313 307Z" fill="#dbe2d1" stroke="#c1cbb7" strokeWidth="1.2" />
          {[0, 1, 2, 3, 4].map(index => <path key={index} d={`M${333 + index * 66} ${350 - index * 15} L${327 + index * 66} ${298 - index * 14}`} stroke="#b2bfa7" strokeWidth="2.2" />)}
          <path d="M295 363 L658 282 L710 378 L349 471Z" fill={`url(#${id}-deck)`} stroke="#778d76" strokeWidth="1.8" />
          {[0, 1, 2, 3, 4, 5].map(index => <path key={index} d={`M${310 + index * 62} ${360 - index * 14} L${363 + index * 62} ${466 - index * 16}`} fill="none" stroke="#a4b39b" strokeWidth="1" />)}
          <path d="M312 388 L671 307 M325 414 L684 333 M338 442 L698 360" fill="none" stroke="#b2c0a7" strokeWidth="1" />
          <path d="M305 370 L658 291 M350 458 L704 370" stroke="#6f866f" strokeWidth="6" />
          <path d="M305 369 L658 290 M350 457 L704 369" stroke="#e7ebdd" strokeWidth="2" />
          {[0, 1, 2, 3, 4, 5, 6].map(index => <g key={index}><circle cx={316 + index * 54} cy={366 - index * 12} r="2.2" fill="#5c745e" /><circle cx={359 + index * 54} cy={454 - index * 13.5} r="2.2" fill="#5c745e" /></g>)}
          <path d="M377 404 L426 393 L440 419 L390 431Z M551 360 L598 349 L611 375 L565 387Z" fill="#cbd6c0" stroke="#94a68b" strokeWidth="1.1" />
          <path d="M385 408 L421 400 M559 364 L593 356" stroke="#e9edde" strokeWidth="2" />
          <path d="M349 471 L710 378 L744 421 L383 524Z" fill="#e3e8d9" stroke="#91a289" strokeWidth="1.7" />
          <path d="M364 479 L707 392 L729 420 L387 508Z" fill="#d2ddc7" stroke="#becdb3" strokeWidth="1" />
          {[0, 1, 2, 3, 4, 5].map(index => <path key={index} d={`M${384 + index * 59} ${464 - index * 15} L${402 + index * 59} ${507 - index * 15}`} stroke="#afbea4" strokeWidth="1.7" />)}
        </g>}
        <Astronaut id={id} visorShift={wave * 1.6} />
        {!compact && <g strokeLinejoin="round" strokeLinecap="round">
          {/* Boots are physically registered to two deck restraint fixtures. */}
          <path d="M444 425 L479 416 L486 424 L451 433Z M510 421 L543 412 L549 420 L517 430Z" fill="#809579" stroke="#566e56" strokeWidth="1.2" />
          <path d="M452 415 L454 427 L474 422 L473 411 M515 410 L517 423 L538 418 L537 409" fill="none" stroke="#8c9f83" strokeWidth="4" />
          <path d="M454 416 L455 424 L472 420 M518 411 L519 420 L536 416" fill="none" stroke="#e0e6d3" strokeWidth="1.2" />
          {/* Bolted pedestal and nested revolute joints keep every moving part connected. */}
          <path d="M634 367 L664 358 L687 370 L655 381Z" fill="#879b83" stroke="#536c55" strokeWidth="1.6" />
          <path d="M637 368 L655 375 L683 368 L683 374 L654 383 L636 375Z" fill="#aebca2" stroke="#718a6e" strokeWidth="1.1" />
          {[[640,369],[662,363],[679,371],[655,378]].map(([x,y]) => <g key={`${x}-${y}`}><ellipse cx={x} cy={y} rx="3.2" ry="2" fill="#d3ddc7" stroke="#5e795c" strokeWidth="1" /><path d={`M${x-1} ${y} H${x+1}`} stroke="#5d7258" /></g>)}
          <path d="M648 369 L647 344 L668 339 L674 364 L661 373Z" fill={`url(#${id}-metal)`} stroke="#5e765e" strokeWidth="1.7" />
          <path d="M652 347 L660 366 L669 363" fill="none" stroke="#c4d0b9" strokeWidth="1.1" />
          <path d="M646 359 C626 362 619 376 627 389" stroke="#5a705b" strokeWidth="2.6" fill="none" />
          <g transform={`translate(659 349) rotate(${degrees(shoulderAngle)})`}>
            <ArmLink length={upperLength} metal={`${id}-metal`} />
            <Joint radius={12} />
            <g transform={`translate(${upperLength} 0) rotate(${degrees(elbowAngle)})`}>
              <ArmLink length={lowerLength} metal={`${id}-metal`} />
              <Joint radius={10} />
              <g transform={`translate(${lowerLength} 0) rotate(${degrees(wristAngle)})`}>
                <rect x="-2" y="-7" width="14" height="14" rx="2" fill="#6f8370" stroke="#435d49" strokeWidth="1.4" />
                <rect x="9" y="-10" width="5" height="20" rx="1" fill="#b5c2ac" stroke="#5c755c" strokeWidth="1.2" />
                <path d="M12 -7 L26 -7 L26 -3 M12 7 L26 7 L26 3" fill="none" stroke="#4d6853" strokeWidth="4.2" />
                <path d="M14 -7 L24 -7 M14 7 L24 7" fill="none" stroke="#c2cdb7" strokeWidth="1" />
                {/* Wrench is in this same wrist group, held between the two contact pads. */}
                <g transform="translate(24 0)">
                  <path d="M-2 -17 L-7 -23 L-6 -30 L-2 -25 L3 -26 L5 -32 L9 -25 L7 -19 L3 -16 L3 20 L7 24 L6 31 L1 34 L-5 31 L-6 25 L-2 20Z" fill={`url(#${id}-metal)`} stroke="#5b7060" strokeWidth="1.4" />
                  <path d="M0 -15 L0 18" stroke="#eef0e5" strokeWidth="1.1" />
                  <path d="M-1 25 L2 24 L4 27 L2 30 L-1 29Z" fill="#7b907b" stroke="#5b7060" strokeWidth=".8" />
                </g>
                <rect x="22" y="-5" width="6" height="2" rx=".6" fill="#344e3e" />
                <rect x="22" y="3" width="6" height="2" rx=".6" fill="#344e3e" />
                <Joint radius={7} />
              </g>
            </g>
          </g>
        </g>}
      </svg>
    </div>
    {!compact && <figcaption className="space-scene-controls"><span>Illustrative space concept</span><button type="button" onClick={() => setPaused(value => !value)} disabled={reducedMotion} aria-label={reducedMotion ? 'Animation disabled by reduced motion preference' : paused ? 'Play space illustration' : 'Pause space illustration'}>
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">{paused || reducedMotion ? <path d="M4 2.5 13 8 4 13.5Z" fill="currentColor" /> : <path d="M4 3V13M11 3V13" stroke="currentColor" strokeWidth="2" />}</svg>{reducedMotion ? 'Reduced motion' : paused ? 'Play' : 'Pause'}
    </button></figcaption>}
  </figure>;
}
