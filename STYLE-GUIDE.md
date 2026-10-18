# Look Website Style Guide

Version 1.5 · October 18, 2026

Look uses a minimal linen and sage interface, editorial typography, a technical SVG shuttle illustration, and a visible SO-101 medication-delivery concept. The landing page presents the opportunity for greater agency alongside both the space concept and the tabletop hardware illustration.

This specification governs the website at `/` and `/demo`, with `/day` retained as a compatibility alias. The interactive reference lives at `/style-guide` and is linked from the footer. The pitch deck remains a separate artifact with its own visual style.

## Design direction

The approved hero headline is “An assistive arm guided by your gaze.” Use descriptive headings and connected prose rather than paired short sentence fragments or repeated slogans. Give each section one purpose, with space and alignment providing structure before adding a card.

Use a mature technical SVG illustration of an astronaut on a shuttle with a large connected mechanical arm holding a wrench. Give the astronaut adult proportions and a closed visor, with a restrained pose and recognizable suit construction. Keep the procedural tabletop arm prominent in a separate landing-page section, with a weekly pill organizer and loose-pill delivery to a separate bedside table. Linen, sage, and restrained metallic materials define the scene. Omit decorative section numbers, hero eyebrows, decorative caption pills, introductory bands, repeated closing calls to action, and repeated routine-versus-choice statements. Full-page shaders, violet glows, decorative dashboards, and competing accent colors are outside this system.

The supported introduction is “Look explores how gaze-controlled robotics can make everyday objects easier to reach for people with limited hand mobility.” Empowerment is expressed through agency and opportunity, without an invented biography, testimonial, or promise of restored ability. The astronaut is a visual metaphor for possibility; it does not equate disability with a spacesuit or establish a space-ready product.

## Color system

### Brand signature

Use the custom SVG Look wordmark through `src/Wordmark.tsx`, with rounded, bold L and k letterforms and two elliptical o’s. Each o contains an almond-shaped eye outline and a slightly right-looking pupil. The lettering and eyes form one mark, without a separate icon or font dependency.

The SVG viewBox is `0 0 132 44`, with 7-unit rounded letter strokes, 1.4-unit eye outlines, and filled pupils. Render it at 132 × 44 px in the header, 112 × 38 px on mobile, and 108 × 36 px in the footer; keep the rendered width at least 108 px. Preserve the original geometry and spacing with the SVG’s aspect-ratio behavior. Use `currentColor`, mapped to Ink or inverse text color, rather than changing individual features. Keep clear space around the mark and do not add gradients, distort it, or substitute a generic font.

### Palette

| Token | Light value | Dark value | Purpose |
| --- | --- | --- | --- |
| `--paper` | `#F6F3EC` | `#202720` | Page background |
| `--surface` | `#FFFDF8` | `#29322A` | Cards, dialogs, and selected tabs |
| `--ink` | `#303B34` | `#F0F1E7` | Headings and primary text |
| `--muted` | `#656D64` | `#B3BDAF` | Supporting copy and metadata |
| `--sage` | `#4A6152` | `#C1D0B7` | Links, focus, and purposeful emphasis |
| `--line` | `#DEDFD4` | `#404B40` | Decorative dividers and quiet panel outlines |
| `--soft-sage` | `#E8ECE1` | `#303E32` | Subtle filled supporting surfaces |

The footer theme control switches these tokens without changing the layout or interaction model. Keep the arm, desk, and selected object easy to distinguish in both appearances, without tinting the entire scene with an accent color.

Use solid-color text at full opacity. Calculated light-theme contrast ratios are 10.52:1 for Ink on Paper, 4.83:1 for Muted on Paper, 6.07:1 for Sage on Paper, 11.47:1 for Ink on Surface, 5.26:1 for Muted on Surface, and 6.61:1 for Surface on Sage. Recheck contrast whenever opacity, imagery, or gradients change the background.

Line on Paper is only 1.21:1. It is decorative and must not be the sole visible boundary of a meaningful control. Use Sage or another verified contrasting treatment when a boundary is required to understand an input or control.

## Typography

Use locally bundled DM Sans for the interface and body copy, with weights 400, 500, 600, and 700. Use locally bundled Instrument Serif at weight 400 for display headings, with italic 400 for a short, meaningful emphasis. Keep italics out of long paragraphs and control labels.

| Role | Typeface | Size and leading | Usage |
| --- | --- | --- | --- |
| H1 | Instrument Serif 400 | `clamp(60px, 6vw, 88px)` / approximately 1.03–1.1 | One main headline |
| H2 | Instrument Serif 400 | `clamp(42px, 4.2vw, 60px)` / approximately 1.03–1.1 | Major content sections |
| Hero copy | DM Sans 400 | 18 px / 29 px desktop; 16 px mobile | Short introduction |
| Body | DM Sans 400 | 16 px / 26 px desktop; 14 px mobile | Main reading content |
| UI | DM Sans 500 | 13–14 px / 1.4–1.6 | Buttons and navigation |
| Eyebrow | DM Sans 600 | 11 px / 1.5 | Uppercase, 1.7 px tracking |
| Compact supporting copy | DM Sans 400 | 12–14 px / 1.6–1.7 | Captions and technical notes |
| Decorative metadata | DM Sans 400 | 10–12 px / 1.5–1.7 | Nonessential scene labels and timestamps |

Keep body copy around 45–65 characters per line. Use a single H1 and a logical heading sequence. Display headings may use modest negative tracking; do not tighten paragraph text. At narrow widths, wrap naturally and use a local size adjustment only when needed to prevent overflow.

## Layout and spacing

The outer container is at most 1344 px wide, including 48 px insets on both sides. Mobile insets are 22 px. At full width, this yields a 1248 px content region. Use a two-column hero on wider screens and stack text before imagery on smaller screens.

The spacing scale is 4, 8, 12, 16, 24, 32, 48, 64, 96, and 128 px. Use 64–128 px between major sections according to the composition, with smaller values on mobile. Favor 24–32 px within panels and 16–24 px between related items.

Use 14 px corners for the tabletop scene on desktop and 10 px on mobile, 24 px for dialogs, and a full pill radius for primary buttons and tab containers. Most content sits directly on the page rather than inside a bordered or filled card. Dividers are 1 px and appear only where they clarify structure. Shadows are reserved for controls that need depth.

## Components

### Primary and supporting actions

The landing page’s primary action uses a restrained silver gradient with graphite text: `linear-gradient(174deg, #FDFDFC 0%, #E1E3DF 42%, #C6CBC3 55%, #EEF0EA 100%)`. Its border is `#FFFFFF`, with a 1 px outer edge of `#BFC5BB`, a light inset edge, and a subtle shadow. Use a 50 px minimum height and a full pill radius. Hover lifts the button by 2 px with a 200 ms state transition; pressing may move it down by 1 px. Reduced motion removes that movement.

Use solid Ink with inverse text for task confirmation buttons and the video dialog action. Use one primary action per section. A sage text link provides the secondary action. Label each control with the action it performs. An unavailable video must be visibly labeled as unavailable or forthcoming; do not imply that a working recording exists before its URL is supplied.

Disabled controls use a native disabled state and remain clearly identifiable. Static state specimens in the guide are labeled as specimens rather than presented as functioning controls.

### Tabs

Use Base UI Tabs with real tab and panel semantics. The visual reference is the user’s [animated tabs example from 21st.dev](https://21st.dev/@chetanverma16/components/animated-tabs): one quiet moving selection pill, familiar labels, and a stable surrounding layout. It informs the interaction direction; the implementation uses Base UI rather than assuming that an external component has been copied.

Use Medicine, Mug, Water, and Phone as the object labels, with Medicine selected by default and a 250 ms sliding indicator. The newly active panel fades in while rising 5 px over 220 ms; the outgoing panel does not crossfade. The indicator follows Base UI’s active-tab position and size variables. Keep inactive panels inaccessible and never change the selected object automatically. The guide’s tabs activate on keyboard focus; use Left and Right Arrow keys within the tab list. [Base UI Tabs documentation](https://base-ui.com/react/components/tabs)

### Dialogs and disclosures

Use Base UI Dialog for short supplementary content. Provide an accessible title and description, a visible close button, focus containment, Escape dismissal, and focus return to the trigger. Use a 24 px radius, an unobtrusive translucent backdrop, and a maximum height that permits scrolling on small screens.

Use Base UI Collapsible when supporting detail belongs directly below its trigger. The trigger must describe the content and expose its expanded state. Do not hide information essential to understanding the primary action.

### Technology rail

Present four concise stages in order: gaze and scene vision, Chalk context, blink or voice confirmation, and SO-101 hardware with LeRobot. Keep Factory in a separate disclosure below the sequence because it analyzes interaction history in the background.

Use native horizontal overflow where the rail exceeds its container. Bind Motion’s `useScroll({ container })` output `scrollXProgress` to the progress bar’s `scaleX`, with a left transform origin. Measure the actual overflow and show the bar only when the rail can scroll. The bar indicates position within this rail, not time, process completion, or vertical page progress.

Make the bar decorative with `aria-hidden="true"`. Give the scroll container an accessible name and keyboard access, retain native touch and trackpad scrolling, and allow visitors to reach every stage without dragging. Do not hijack vertical scrolling. Reduced motion removes animated scrolling, smoothing, and snapping; direct position updates remain available.

## Motion

| Behavior | Duration | Rule |
| --- | --- | --- |
| Tab indicator | 250 ms | `cubic-bezier(.22, 1, .36, 1)` |
| Panel entrance | 220 ms | Fade in and rise 5 px, stable layout |
| Button feedback | 200 ms | 2 px hover lift and purposeful state change |
| Horizontal scroll progress | Direct position mapping | `scaleX` follows actual `scrollXProgress`; no spring or automatic advancement |
| Shuttle illustration | Slow, subtle cycle | Accessible play and pause controls; suspend animation offscreen |
| Medicine interaction | Approximately 10–12 seconds | Open the compartment and transfer loose pills individually to the bedside dish; then signal completion |
| Other object interactions | Approximately 4 seconds (4.2 seconds in code) | Approach, grasp, lift, deliver, and release; then signal completion |
| Reduced motion | 0 ms | Remove decorative transitions and movement |

Respect `prefers-reduced-motion: reduce` with a static shuttle illustration and direct completed poses for confirmed arm interactions. Preserve every action, label, and status. Keep continuous motion limited to the pausable shuttle illustration, without parallax, autoplay video, rapid flashing, or animation behind reading content. Suspend decorative animation while the scene is offscreen. A simulation can show progress, but its state must also be explained in text and must not depend on motion alone.

## Technical shuttle illustration

Use the shared `src/SpaceScene.tsx` component and `src/space-scene.css` to draw the shuttle, astronaut, connected mechanical arm, and wrench as editable SVG. The astronaut has adult proportions, a closed visor, and a restrained working pose. Use clear suit panels, mechanical joints, and structural connections, with linen, sage, and metallic materials that belong to the surrounding page.

Keep the arm attached to the shuttle and the wrench aligned with its gripper throughout movement. Use slow, subtle articulation within a stable composition. Keep native play and pause controls available, suspend animation offscreen, and start with a static scene for reduced motion. Avoid exaggerated gestures, camera effects, and rapid flashing.

Use the full shuttle composition in the hero and the guide specimen. The component supports `compact`, `phase`, and `className` props. Its compact form beside the SO-101 scene may reflect selection, confirmation, and completion, while adjacent text remains the explanation of the interaction. Provide one concise accessible description of the scene and keep decorative SVG details out of the accessibility tree.

Space is a visual metaphor and a possible future context. Do not imply NASA involvement, flight readiness, space qualification, or that using a spacesuit is equivalent to living with a disability.

## Procedural tabletop scene

Use the shared `src/RobotScene.tsx` component to show an SO-101-style arm on a desk. Build the model from editable Three.js geometry with a recognizable base, articulated links, servo housings, and two-finger gripper. Use restrained materials, soft lighting, a fixed camera, and an uncluttered tabletop that fits the linen and sage page.

The primary scene uses `<RobotScene moment="medicine" />` with a seven-day plastic pill organizer on the main desk and a shallow receiving dish on a separate bedside table. After selection and confirmation, animate the compartment lid opening, the gripper collecting loose pills, and the individual pills being placed in the bedside dish. Keep the organizer and both tables stationary. The scene does not determine which medication or dose to take, schedule medication, or claim clinical effectiveness. Place the concise label “Medication delivery concept” beside the scene.

Keep the wrist coupler, jaw guide, and finger carriages visibly connected throughout the full opening range. The object must stay between the contact pads during transport, and the gripper must clear the desk in every scenario.

The landing-page model starts in a static pose. Its native “Preview pill delivery” button starts the sequence directly, “Stop preview” resets it, and replay becomes available after completion. This optional visual preview is implemented by `ArmPreview` in `src/App.tsx` and is distinct from the guided demonstration at `/demo?object=medicine`, which requires selection followed by confirmation. The style-guide specimen stays static. Keep the arm free of idle loops, automatic camera movement, and autoplay.

The component supports `RobotMoment` values `medicine`, `mug`, `water`, and `phone`, and `RobotPhase` values `idle`, `selected`, `reaching`, and `done`. Use these states consistently:

| Phase | Visual behavior |
| --- | --- |
| `idle` | Arm rests beside the current scene’s object |
| `selected` | The target is highlighted while the arm remains stationary |
| `reaching` | Guided confirmation or an explicit landing preview begins the scenario’s sequence: compartment opening and individual pill transfer for Medicine, or the shorter pickup sequence for other objects |
| `done` | The delivered object and arm rest in the completed pose |

Shoulder, elbow, and gripper articulation should make the movement understandable. The scene signals completion only after the sequence finishes, and the parent interface updates its text status from that callback. Resetting or changing objects cancels the active sequence and prevents an obsolete completion from affecting the new scene.

With reduced motion, move directly to the completed pose after guided confirmation or an explicit preview request, preserving completion status without playing the path. Provide a useful text description and equivalent native controls outside the canvas so the action remains understandable and operable without interpreting animation.

Label the scene as an illustration or simulation. The model is not a downloaded 3D asset, an engineering twin, calibrated robot kinematics, or evidence of a physical pickup; its animation timing is an interface choice rather than a measured hardware result.

## Writing and evidence

Use complete descriptions such as “Explore how an assistive arm could bring everyday objects within reach.” Avoid paired fragments, theatrical pauses, repetitive statements about choice, and headings split into two miniature slogans. Labels may remain concise when they name an action or topic clearly.

Write directly about loose pills, a mug, water bottle, or phone rather than assigning these needs to an invented person or schedule. Use “Medication delivery concept” for the organizer-to-bedside sequence, without dosing or clinical claims. Phone pickup remains a future use case. Do not add biographies, testimonials, or unsupported statistics.

Describe agency, access, and opportunities to act without implying that Look replaces care or fixes people. Avoid pity, rescue narratives, and promises of restored ability.

Separate a website simulation from the physical prototype. Both blink and voice confirmation are part of the planned booth demonstration; a browser interaction must be labeled if it simulates either path. Do not imply that a button click is live gaze, blink, or speech detection.

The self-printed build estimate is $100–150, as supplied by the team, with the included parts still to be itemized. Do not present it as a verified complete commercial-system price or claim a cost advantage without a comparable scope. No recorded trial count was supplied. Do not carry over the pitch deck’s unverified success percentage, trial placeholder, incident count, or delivery time as measured website results.

Use direct sentences with enough detail to explain the idea naturally. Avoid absolute claims about independence, restored ability, safety, clinical effectiveness, or suitability. Use “prototype,” “illustrative,” or “estimate” beside the specific statement that needs the qualification, rather than relying on a distant disclaimer.

The technology section describes the prototype architecture rather than measured physical performance. Label synthetic routine examples and identify the website as a simulation. Do not present browser interactions as evidence of a completed hardware integration.

## Accessibility requirements

Target WCAG 2.2 AA. Normal text requires at least 4.5:1 contrast; qualifying large text requires at least 3:1. The interface target for meaningful non-text controls and states is at least 3:1 against adjacent colors. [WCAG text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

Use a preferred minimum target of 44 × 44 CSS px for interactive controls. WCAG 2.2 AA’s minimum target criterion is 24 × 24 CSS px, subject to its specified exceptions; 44 px is this product’s more generous design target. [WCAG target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

Use a 3 px Sage focus outline with a 5 px offset on light surfaces. Never remove keyboard focus. Maintain a logical Tab order, semantic landmarks, a single H1, descriptive control names, and meaningful image alternatives. Decorative art should be hidden from assistive technology. Dialogs must manage focus without leaving a keyboard trap after closing.

Review at 320 CSS px wide and at 200% text zoom. Ensure no essential content is clipped, no horizontal page scrolling is needed, and no meaning relies on color alone. Respect reduced motion. A functional object simulation must have text status, a reset path, and no unsolicited camera or microphone request.

These are acceptance targets, not a claim that the entire website has been certified. The guide includes a manual release checklist whose selections last only for the current page session.

## Page structure and delivery

The landing page at `/` keeps both visual concepts visible:

1. A product introduction with the approved headline, technical shuttle illustration and assisting arm, and one primary route into `/demo`.
2. A prominent inline SO-101 medication-delivery scene with optional Preview, Stop, and Replay controls, linked to `/demo?object=medicine`.
3. Medicine, Mug, Water, and Phone tabs describing the object interactions.
4. A concise horizontal technology rail, with Factory background analysis in a supporting disclosure.

A secondary “Watch video” action stays subordinate and reflects the video’s actual availability. The object demonstration uses a consistent select, confirm, and assist sequence, clearly identified as a website simulation. Direct links may select an object with `/demo?object=medicine`, `/demo?object=mug`, `/demo?object=water`, or `/demo?object=phone`; Medicine is the default when no supported object is specified.

The style guide at `/style-guide` is a reference for the team, reached through the footer rather than the main navigation. Use Vercel’s configured SPA fallback so direct visits to `/demo`, its `/day` compatibility alias, and `/style-guide` resolve correctly. Build and preview the production bundle before release, then check all routes, shuttle play/pause and offscreen suspension, scene rendering, mobile layout, keyboard navigation, dialogs, confirmation behavior, cancellation, and reduced motion.

## Editable scene source

The shuttle scene is authored as SVG in `src/SpaceScene.tsx`, with materials and motion in `src/space-scene.css`. The tabletop illustration is authored in `src/RobotScene.tsx` using Three.js rather than a photograph or downloaded model. Edit geometry, joint hierarchy, materials, camera, and animation in source, and keep the shared components consistent across the landing page, object demonstration, and guide.

Suggested caption: “Illustrative SO-101 tabletop simulation.” The accessible description should identify the arm, the current object, and the demonstrated state without claiming that a physical robot moved.

The local source files for the interactive guide are `src/StyleGuide.tsx` and `src/style-guide.css`. All guide classes use the `sg-` prefix so the reference page does not override product styles.
