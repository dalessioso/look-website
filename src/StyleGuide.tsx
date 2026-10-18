import { useState } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { Dialog } from '@base-ui/react/dialog';
import { Collapsible } from '@base-ui/react/collapsible';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Copy, X } from 'lucide-react';
import './style-guide.css';
import Wordmark from './Wordmark';
import RobotScene from './RobotScene';
import SpaceScene from './SpaceScene';

const colors = [
  { name: 'Paper', hex: '#F6F3EC', usage: 'The main page background.', token: '--paper' },
  { name: 'Surface', hex: '#FFFDF8', usage: 'Panels and selected tabs.', token: '--surface' },
  { name: 'Ink', hex: '#303B34', usage: 'Headings and primary reading.', token: '--ink' },
  { name: 'Muted', hex: '#656D64', usage: 'Supporting text and metadata.', token: '--muted' },
  { name: 'Sage', hex: '#4A6152', usage: 'Links, emphasis, and focus.', token: '--sage' },
  { name: 'Line', hex: '#DEDFD4', usage: 'Quiet, decorative divisions.', token: '--line' },
];

const sections = [
  ['foundation', 'Color'], ['type', 'Typography'], ['components', 'Components'],
  ['layout', 'Layout'], ['motion', 'Motion'], ['voice', 'Voice & access'],
];

const reviewItems = [
  'Every control works with a keyboard and has a visible focus state.',
  'The page reflows at 320 px, and text remains usable at 200% zoom.',
  'Text and meaningful interface boundaries meet their contrast targets.',
  'Reduced motion removes decorative movement and animated transitions.',
  'The shuttle scene is labeled as a concept and the loose-pill delivery scene as a simulation.',
  'Horizontal progress reflects actual overflow, and the technology rail works with a keyboard.',
  'The guided demo requires confirmation, landing previews require an explicit button press, and the shuttle animation has play and pause controls.',
  'Prototype behavior, estimates, and measured results are clearly distinguished.',
];

function SectionTitle({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="sg-section-heading"><div><h2>{title}</h2><p>{children}</p></div></div>;
}

export default function StyleGuide() {
  const [copied, setCopied] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [reviewed, setReviewed] = useState<string[]>([]);

  async function copyColor(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setCopyMessage(`${hex} copied to clipboard.`);
    } catch {
      setCopyMessage(`Copy is unavailable here. The color value is ${hex}.`);
    }
  }

  return <main className="sg-page" id="main-content">
    <div className="sg-container">
      <header className="sg-intro">
        <div className="sg-intro-top"><a href="/" className="sg-back-link">← Back to Look</a><span className="sg-version">Website system · Version 1.5</span></div>
        <h1>Look <em>style guide</em></h1>
        <div className="sg-intro-bottom"><div><h2>Website design system</h2><p>A minimal website for an assistive robotics prototype, with linen surfaces, sage accents, a technical SVG shuttle scene, and a visible SO-101 medication-delivery concept.</p></div><a className="sg-text-link" href="/">View the website <ArrowUpRight size={16} aria-hidden="true" /></a></div>
      </header>

      <nav className="sg-index" aria-label="Style guide sections">{sections.map(([id, name]) => <a key={id} href={`#sg-${id}`}>{name}</a>)}</nav>

      <section className="sg-section" id="sg-foundation" aria-labelledby="sg-color-heading">
        <SectionTitle title="Color and identity">Use linen for the page and sage for links, focus, and selected states, with a restrained technical illustration and an uncluttered tabletop demonstration.</SectionTitle>
        <h3 id="sg-color-heading" className="sg-sr-only">Color palette</h3>
        <div className="sg-brand-row"><div className="sg-brand-example"><Wordmark /><span>Shared website signature</span></div><div><h3>The Look signature</h3><p>Use the custom SVG Look wordmark with rounded, bold L and k letterforms and two elliptical o’s, each containing an almond-shaped eye and a slightly right-looking pupil. The mark uses one currentColor and has no separate icon or font dependency.</p><p className="sg-small">SVG viewBox: 132 × 44. Header: 132 × 44 px. Mobile: 112 × 38 px. Footer and minimum width: 108 × 36 px. Letter strokes: 7 units; eye outlines: 1.4 units.</p><code>src/Wordmark.tsx</code></div></div>
        <div className="sg-swatches">{colors.map((color) => <button key={color.name} className="sg-swatch" type="button" onClick={() => copyColor(color.hex)} aria-label={`Copy ${color.name} color ${color.hex}`}><span className="sg-swatch-color" style={{ backgroundColor: color.hex }}><span>{copied === color.hex ? <Check size={15} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}</span></span><span className="sg-swatch-name">{color.name}<code>{color.hex}</code></span><span className="sg-swatch-usage">{color.usage}</span><code className="sg-token">{color.token}</code></button>)}</div>
        <p className="sg-small sg-copy-status" role="status">{copyMessage || 'Default light palette. Select a swatch to copy its hex value.'}</p>
        <div className="sg-note"><strong>Accent restraint</strong><p>Linen and sage define the website. Keep the shuttle and tabletop scenes simple, with linen, sage, and restrained metallic materials. Full-page shaders, violet glows, saturated gradients, and competing accent colors are outside this system.</p></div>
        <div className="sg-theme-spec"><div><h3>Light and dark appearances</h3><p>The footer theme control switches the reading surface to these dark values while keeping the arm, tabletop, and selected object easy to distinguish.</p></div><table className="sg-theme-table"><caption>Dark appearance tokens</caption><thead><tr><th scope="col">Token</th><th scope="col">Dark value</th></tr></thead><tbody>{[['Paper', '#202720'], ['Surface', '#29322A'], ['Ink', '#F0F1E7'], ['Muted', '#B3BDAF'], ['Sage', '#C1D0B7'], ['Line', '#404B40'], ['Soft Sage', '#303E32']].map(([name, hex]) => <tr key={name}><th scope="row">{name}</th><td><span style={{ backgroundColor: hex }} aria-hidden="true" /><code>{hex}</code></td></tr>)}</tbody></table></div>
        <div className="sg-contrast-row"><span><strong>10.52:1</strong> Ink on Paper</span><span><strong>4.83:1</strong> Muted on Paper</span><span><strong>6.07:1</strong> Sage on Paper</span><p>Calculated for solid colors at full opacity. Line is decorative; it is not a sufficient control boundary.</p></div>
      </section>

      <section className="sg-section" id="sg-type">
        <SectionTitle title="Typography">Pair Instrument Serif headings with DM Sans body text and controls, using natural line breaks and descriptive language.</SectionTitle>
        <div className="sg-type-pair"><div className="sg-type-card"><span className="sg-eyebrow">Display / Instrument Serif</span><div className="sg-serif-specimen">Aa <em>Aa</em></div><p>Regular 400 · Italic 400</p><span className="sg-small">Headlines and a single, meaningful italic emphasis.</span></div><div className="sg-type-card"><span className="sg-eyebrow">Interface / DM Sans</span><div className="sg-sans-specimen">Aa 0123</div><p>400 · 500 · 600 · 700</p><span className="sg-small">Body copy, navigation, labels, and controls.</span></div></div>
        <div className="sg-type-scale">
          <div><span className="sg-spec-label">H1 / 60–88 px</span><p className="sg-spec-h1">An assistive arm <em>guided by your gaze</em></p></div>
          <div><span className="sg-spec-label">H2 / 42–60 px</span><p className="sg-spec-h2">How the prototype works</p></div>
          <div><span className="sg-spec-label">Hero / 18 px desktop · 16 px mobile</span><p className="sg-spec-hero">Look explores how gaze-controlled robotics can make everyday objects easier to reach for people with limited hand mobility.</p></div>
          <div><span className="sg-spec-label">Body / 16 px desktop · 14 px mobile</span><p className="sg-spec-body">Use short paragraphs, concrete actions, and familiar words. Give every section one clear purpose.</p></div>
          <div><span className="sg-spec-label">Eyebrow / 11 px</span><p className="sg-eyebrow">Object selection</p></div>
        </div>
        <p className="sg-small">Display type uses fluid sizes: H1 clamp(60px, 6vw, 88px), H2 clamp(42px, 4.2vw, 60px). Display line-height stays around 1.03–1.1. Keep body lines around 45–65 characters. Supporting copy is 12–14 px; decorative metadata is 10–12 px.</p>
      </section>

      <section className="sg-section" id="sg-components">
        <SectionTitle title="Components">Use one primary action and accessible Base UI primitives for tabs, dialogs, and supporting disclosures.</SectionTitle>
        <div className="sg-component-grid">
          <div className="sg-component-card"><span className="sg-eyebrow">Primary action</span><div className="sg-control-display"><a href="/demo" className="sg-primary">Explore the demo <ArrowRight size={16} aria-hidden="true" /></a></div><p>Use silver for the landing action and solid Ink for task confirmation. Both use dark or inverse lettering and a full pill radius. This example opens the object demonstration.</p></div>
          <div className="sg-component-card"><span className="sg-eyebrow">Supporting action</span><div className="sg-control-display"><a href="#sg-motion" className="sg-text-link">Read the motion rules <ArrowRight size={15} aria-hidden="true" /></a></div><p>Use a sage text link when a second solid button would compete with the main action.</p></div>
        </div>
        <div className="sg-button-states" aria-label="Visual button state specimens"><div><span className="sg-static-button sg-state-hover" aria-hidden="true">Explore the demo <ArrowRight size={14} /></span><span>Hover specimen</span></div><div><span className="sg-static-button sg-state-focus" aria-hidden="true">Explore the demo <ArrowRight size={14} /></span><span>Focus specimen</span></div><div><span className="sg-static-button sg-state-pressed" aria-hidden="true">Explore the demo <ArrowRight size={14} /></span><span>Pressed specimen</span></div><div><button className="sg-primary" disabled type="button">Unavailable</button><span>Disabled specimen</span></div></div>
        <p className="sg-small">Hover, focus, and pressed examples above are static visual specimens. The disabled example is intentionally inactive.</p>

        <div className="sg-tabs-example"><div className="sg-example-heading"><h3>Animated tabs</h3><span>Live component</span></div>
          <Tabs.Root defaultValue="medicine" className="sg-tabs-root">
            <Tabs.List className="sg-tab-list" aria-label="Example objects" activateOnFocus>
              <Tabs.Tab value="medicine" className="sg-tab">Medicine</Tabs.Tab><Tabs.Tab value="mug" className="sg-tab">Mug</Tabs.Tab><Tabs.Tab value="water" className="sg-tab">Water</Tabs.Tab><Tabs.Tab value="phone" className="sg-tab">Phone</Tabs.Tab><Tabs.Indicator className="sg-tab-indicator" />
            </Tabs.List>
            <div className="sg-panel-stack">
              <Tabs.Panel value="medicine" className="sg-tab-panel"><h4>Deliver pills to a bedside table</h4><p>After confirmation, the arm opens a compartment in the weekly organizer and moves loose pills into a shallow dish on a separate bedside table.</p><span className="sg-small">Medication delivery concept</span></Tabs.Panel>
              <Tabs.Panel value="mug" className="sg-tab-panel"><h4>Bring a mug within reach</h4><p>Select the mug, then confirm to explore how the simulated arm approaches, lifts, and delivers it.</p></Tabs.Panel>
              <Tabs.Panel value="water" className="sg-tab-panel"><h4>Reach a water bottle</h4><p>Explore the same selection and confirmation sequence with a bottle on the tabletop.</p></Tabs.Panel>
              <Tabs.Panel value="phone" className="sg-tab-panel"><h4>Explore phone pickup</h4><p>Phone pickup is a future use case shown as a simulation, rather than a demonstrated physical capability.</p></Tabs.Panel>
            </div>
          </Tabs.Root>
          <p className="sg-small">Use Left and Right Arrow keys inside the tab list. A selected pill slides in 250 ms; the new panel fades in and rises 5 px over 220 ms. Object selection never changes automatically.</p>
        </div>

        <div className="sg-component-grid sg-primitive-grid">
          <div className="sg-component-card"><span className="sg-eyebrow">Dialog / For focused details</span><h3>Supplementary information</h3><p>Open short supplementary content on request, with a clear way back.</p>
            <Dialog.Root><Dialog.Trigger className="sg-outline-button">View dialog specification <ArrowUpRight size={15} aria-hidden="true" /></Dialog.Trigger><Dialog.Portal><Dialog.Backdrop className="sg-dialog-backdrop" /><Dialog.Popup className="sg-dialog"><Dialog.Close className="sg-dialog-close" aria-label="Close dialog"><X size={20} aria-hidden="true" /></Dialog.Close><span className="sg-eyebrow">Component specification</span><Dialog.Title className="sg-dialog-title">Dialog behavior</Dialog.Title><Dialog.Description className="sg-dialog-description">Use Base UI Dialog for supplementary information, with a clear title, a short explanation, and a close control.</Dialog.Description><ul className="sg-dialog-list"><li>Move focus into the dialog when it opens.</li><li>Keep keyboard focus within the modal.</li><li>Escape closes it and focus returns to the trigger.</li><li>Use a 24 px radius and a quiet translucent backdrop.</li></ul><Dialog.Close className="sg-primary">Return to the guide <ArrowRight size={15} aria-hidden="true" /></Dialog.Close></Dialog.Popup></Dialog.Portal></Dialog.Root>
          </div>
          <div className="sg-component-card"><span className="sg-eyebrow">Disclosure / For supporting context</span><h3>Technical details</h3><p>Keep supplementary explanations adjacent to the material they clarify.</p><Collapsible.Root className="sg-disclosure"><Collapsible.Trigger className="sg-disclosure-trigger">Writing checklist <ChevronDown size={17} aria-hidden="true" /></Collapsible.Trigger><Collapsible.Panel className="sg-disclosure-panel"><ul><li>Use complete descriptions instead of paired slogan fragments.</li><li>Use a short, descriptive control label.</li><li>State what a prototype actually demonstrates.</li><li>Keep an estimate beside its scope.</li></ul></Collapsible.Panel></Collapsible.Root></div>
        </div>
      </section>

      <section className="sg-section" id="sg-layout">
        <SectionTitle title="Layout and illustration">Keep the technical shuttle hero and the tabletop arm both visible on the landing page, with generous spacing and few borders.</SectionTitle>
        <div className="sg-layout-grid"><div><h3>The spacing scale</h3><div className="sg-spacing-list">{[4, 8, 12, 16, 24, 32, 48, 64, 96, 128].map((size) => <div key={size}><code>{size}</code><span style={{ width: `${size}px` }} /><small>px</small></div>)}</div></div><div><h3>The page grid</h3><div className="sg-grid-diagram" aria-label="1344 pixel maximum container with 48 pixel desktop padding at each side and 1248 pixels of content"><div className="sg-grid-gutter">48</div><div className="sg-grid-content">Content</div><div className="sg-grid-content">Content</div><div className="sg-grid-gutter">48</div></div><dl className="sg-spec-list"><div><dt>Maximum content width</dt><dd>1248 px</dd></div><div><dt>Outer container</dt><dd>1344 px, including insets</dd></div><div><dt>Desktop inset</dt><dd>48 px each side</dd></div><div><dt>Mobile inset</dt><dd>22 px each side</dd></div><div><dt>Section spacing</dt><dd>64–128 px, by composition</dd></div><div><dt>Scene / dialog radius</dt><dd>14 px desktop, 10 px mobile / 24 px</dd></div><div><dt>Button radius</dt><dd>Full pill</dd></div></dl></div></div>
        <div className="sg-page-structure"><h3>Landing page structure</h3><ol><li><strong>Introduction:</strong> one descriptive headline, one primary action, and an adult-proportioned astronaut on a shuttle with a connected mechanical arm holding a wrench.</li><li><strong>Tabletop concept:</strong> a prominent SO-101 scene beside a weekly pill organizer, with an optional delivery preview and a link to the guided demonstration.</li><li><strong>Objects:</strong> Medicine, Mug, Water, and Phone tabs, with Medicine selected by default.</li><li><strong>Technology:</strong> a horizontal sequence for gaze, Chalk, confirmation, and the SO-101, with Factory explained separately in a disclosure.</li></ol><p className="sg-small">Omit decorative section numbers, hero eyebrows, introductory bands, repeated closing calls to action, and repeated statements about routine and choice.</p></div>
        <div className="sg-imagery sg-space-example"><div className="sg-space-specimen"><SpaceScene /></div><div><span className="sg-eyebrow">Technical SVG illustration</span><h3>Show the arm assisting on a shuttle</h3><p>Use an adult-proportioned astronaut with a closed visor, a structured shuttle, and a visibly connected mechanical arm holding a wrench.</p><p>Keep the materials in the linen, sage, and metal palette. Preserve the connections between the shuttle, articulated joints, gripper, and tool throughout movement.</p><p>Use subtle, slow movement with native play and pause controls. Keep reduced motion static and suspend animation offscreen. Present the scene as a future concept rather than evidence of space readiness.</p><code>src/SpaceScene.tsx</code></div></div>
        <div className="sg-imagery"><div className="sg-robot-example"><RobotScene moment="medicine" /><p className="sg-small">Medication delivery concept</p></div><div><span className="sg-eyebrow">Coded illustration</span><h3>Retain the tabletop SO-101 model</h3><p>Show a seven-day plastic pill organizer on the main desk and a shallow receiving dish on a separate bedside table, with the familiar articulated arm and gripper.</p><p>After confirmation, the guided demo opens a compartment, collects loose pills, and delivers them individually to the dish; the scene does not choose medication or determine a dose.</p><p>The landing page also offers an explicit Preview pill delivery control, with Stop preview and Replay actions. This guide specimen stays static.</p><a href="/demo?object=medicine" className="sg-text-link">Explore medication delivery <ArrowUpRight size={16} aria-hidden="true" /></a><br /><code>src/RobotScene.tsx</code></div></div>
      </section>

      <section className="sg-section" id="sg-motion">
        <SectionTitle title="Motion and scroll progress">Animate changes of state and actual scroll position without delaying access to the content.</SectionTitle>
        <div className="sg-motion-grid"><div><span className="sg-motion-number">250<span>ms</span></span><h3>Tab selection</h3><p>A sliding pill identifies the selected object. Ease with cubic-bezier(.22, 1, .36, 1).</p></div><div><span className="sg-motion-number">220<span>ms</span></span><h3>Content change</h3><p>The new panel fades in and rises 5 px. Keep its layout stable and reading position predictable.</p></div><div><span className="sg-motion-number">0<span>ms</span></span><h3>Reduced motion</h3><p>Remove decorative movement and transitions when the system requests reduced motion. Preserve every action and state.</p></div></div>
        <p className="sg-small">Keep continuous motion limited to the pausable shuttle illustration and leave essential reading content still. The object simulation also describes its state in text.</p>
        <div className="sg-scroll-spec"><h3>Shuttle animation</h3><p>Use slow, subtle SVG movement to show the connected arm assisting with a wrench. Keep the astronaut’s adult proportions and closed visor consistent, with a stable composition and no camera effects.</p><p>Keep native play and pause controls available, suspend motion offscreen, and use a static reduced-motion default. The compact scene beside the tabletop arm may reflect interaction state, while adjacent text remains the explanation of selection, confirmation, and completion.</p></div>
        <div className="sg-scroll-spec"><h3>User-initiated arm animation</h3><p>Selection highlights the target while the arm stays still. Confirmation starts the medicine sequence of opening the compartment and moving loose pills to the bedside dish over approximately 10–12 seconds; other objects use the shorter pickup sequence.</p><p>The landing preview starts directly from its native button, while the full demo requires selection and confirmation. Stop preview, reset, or an object change cancels the sequence, and reduced motion moves directly to the completed state.</p><p>The scene is a procedural illustration, not an engineering model, a downloaded 3D asset, or evidence of a physical pickup.</p></div>
        <div className="sg-scroll-spec"><h3>Horizontal technology rail</h3><p>Use Motion’s <code>{'useScroll({ container })'}</code> to bind <code>scrollXProgress</code> to a bar’s <code>scaleX</code>, with its transform origin on the left. Measure the rail’s actual horizontal overflow and show the bar only when content can scroll.</p><p>Keep the bar decorative with <code>aria-hidden="true"</code>, make the rail keyboard reachable, and retain native touch and trackpad scrolling. Do not map vertical page scrolling onto horizontal movement.</p><p>Reduced motion removes smoothing, snapping, and animated scrolling; the bar may update directly with the user’s position.</p></div>
      </section>

      <section className="sg-section" id="sg-voice">
        <SectionTitle title="Writing and accessibility">Describe the person’s intention and the prototype’s role in complete, plain language, with qualifications beside the claims they affect.</SectionTitle>
        <div className="sg-voice-grid"><div><h3>Writing principles</h3><ul className="sg-principle-list"><li><strong>Complete descriptions:</strong> use natural sentences and descriptive headings instead of paired fragments or repeated slogans.</li><li><strong>Agency and opportunity:</strong> describe what people can choose and explore, without inventing a person, biography, or testimonial.</li><li><strong>Clear evidence:</strong> distinguish the coded illustration, website simulation, prototype capabilities, and future use cases.</li><li><strong>Space imagery:</strong> use the astronaut as a visual metaphor for possibility, without equating disability with a spacesuit or claiming flight readiness.</li></ul></div><div className="sg-copy-example"><span className="sg-eyebrow">Preferred phrasing</span><blockquote>“Explore how an assistive arm could bring everyday objects within reach.”</blockquote><p>Describe the opportunity for greater agency without pity, a rescue narrative, or a promise to fix people.</p></div></div>
        <div className="sg-access"><div><h3>Accessibility targets</h3><p>Target WCAG 2.2 AA. Treat these as implementation and review requirements, not a claim of certification.</p></div><dl className="sg-spec-list"><div><dt>Normal text contrast</dt><dd>At least 4.5:1</dd></div><div><dt>Large text / meaningful UI</dt><dd>At least 3:1</dd></div><div><dt>Preferred control target</dt><dd>44 × 44 CSS px or larger</dd></div><div><dt>Focus treatment</dt><dd>3 px Sage outline, 5 px offset</dd></div><div><dt>Keyboard</dt><dd>Logical Tab order; visible focus; no traps</dd></div><div><dt>Semantics</dt><dd>Named controls, landmarks, heading order, useful alt text</dd></div></dl></div>
        <div className="sg-review"><div className="sg-example-heading"><h3>Release review</h3><span>{reviewed.length} / {reviewItems.length} checked</span></div><p className="sg-small">A manual checklist for the next release. Selections are kept only while this page is open.</p>{reviewItems.map((item) => <label key={item} className="sg-review-item"><input type="checkbox" checked={reviewed.includes(item)} onChange={(event) => setReviewed((current) => event.target.checked ? [...current, item] : current.filter((entry) => entry !== item))} /><span>{item}</span></label>)}</div>
      </section>

      <footer className="sg-end"><div><span className="sg-eyebrow">The experience</span><p>Landing → Object demonstration</p><span className="sg-small">The style guide stays in the footer, outside the primary navigation.</span></div><a href="/demo" className="sg-text-link">Explore the experience <ArrowUpRight size={16} aria-hidden="true" /></a></footer>
      <div className="sg-sources"><span>Design and implementation references</span><a href="https://21st.dev/@chetanverma16/components/animated-tabs" target="_blank" rel="noreferrer">Animated tabs inspiration <ArrowUpRight size={12} aria-hidden="true" /></a><a href="https://base-ui.com/react/components/tabs" target="_blank" rel="noreferrer">Base UI tabs <ArrowUpRight size={12} aria-hidden="true" /></a><a href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" target="_blank" rel="noreferrer">WCAG contrast <ArrowUpRight size={12} aria-hidden="true" /></a><a href="https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html" target="_blank" rel="noreferrer">WCAG target size <ArrowUpRight size={12} aria-hidden="true" /></a></div>
    </div>
  </main>;
}
