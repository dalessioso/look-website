# Look website

A standalone React and TypeScript website for Look, built with Vite, Base UI, Motion, and Three.js. This repository contains the website only; it does not run robotics control services.

[Live website](https://look-website-kappa.vercel.app)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/dalessioso/look-website)

## Work in Codespaces

Use the button above to create your own Codespace from `dalessioso/look-website`. The devcontainer uses the [official Node.js 24 image](https://github.com/devcontainers/images/tree/main/src/typescript-node) and installs dependencies with `npm ci`. Once setup finishes, start the development server in the terminal:

```sh
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS="${CODESPACE_NAME}-8780.app.github.dev" \
  npm run dev -- --host 0.0.0.0 --strictPort
```

Open port **8780**, labeled **Look**, from the **Ports** panel. Forwarded ports are [private by default](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace#sharing-a-port); keep that visibility for your development session. The command allows only this Codespace's hostname through [Vite's host check](https://vite.dev/config/server-options#server-allowedhosts). The server starts only when you run the command; stop it with **Ctrl+C**.

Each contributor should use their own Codespace and branch. From an up-to-date `main`, create a branch such as `codex/update-homepage`, make changes, and run `npm run build`. Commit and push that branch, then open a pull request into `main`. Review its Vercel preview before merging. Stop the Codespace when you finish working.

## Run locally

Use Node.js 24. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:8780`. Build with `npm run build`; preview the production output with `npm run preview` after stopping the development server.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Technical shuttle illustration, prominent tabletop medication-delivery concept, object tabs, and technology overview |
| `/demo` | Button-controlled simulation of selecting and confirming an object |
| `/demo?object=medicine` | Open a specific object; accepts medicine, mug, water, or phone, with medicine as the default |
| `/day` | Compatibility alias for the object demonstration |
| `/style-guide` | Visual reference for the design system |
| Any other path | Designed recovery screen |

The object demonstration does not connect to hardware, eye tracking, a camera, or a microphone. Both confirmation paths are explicit button-driven simulations. Phone pickup is labeled a future concept. The video link opens a coming-soon dialog until a real video URL is available.

## Deploy on Vercel

For a new deployment, import `dalessioso/look-website` into Vercel and use the repository root (`.`) as **Root Directory**. Select the **Vite** framework preset and **Node.js 24.x**. The install command is `npm ci`, the build command is `npm run build`, and the output directory is `dist`. No deployment environment variables are needed. `vercel.json` provides direct-link support for the site routes.

The repository is connected to Vercel. Push changes to a feature branch on GitHub to create a preview, then review it through a pull request. Merging into `main` updates the production website. Check Vercel's build status and preview before merging.

## Design system

Read [STYLE-GUIDE.md](STYLE-GUIDE.md) and preview `/style-guide`. Shared colors and typography live in `src/styles.css`. `src/Wordmark.tsx` is the shared custom SVG Look wordmark, with bold rounded L and k letterforms and an almond-shaped eye inside each elliptical o. It uses a 132 × 44 viewBox and one `currentColor`, with no separate left-hand icon or font dependency. Product-specific styles are in `src/day.css`; the guide is isolated in `src/style-guide.css`.

The active tab pill and panel transitions are inspired by [Chetan Verma’s Animated Tabs](https://21st.dev/@chetanverma16/components/animated-tabs), implemented here with [Base UI Tabs](https://base-ui.com/react/components/tabs) and CSS. Dialog and Collapsible use Base UI. The horizontal technology rail uses Motion `useScroll` to connect actual horizontal scroll progress to `scaleX`, with keyboard controls and reduced-motion support. Fonts are self-hosted through Fontsource. No third-party analytics or trackers are included.

The shared `LiquidButton` in `src/components/ui/liquid-glass-button.tsx` is adapted from [Ali Imam’s Liquid Glass Button](https://21st.dev/@designali-in/components/liquid-glass-button). It uses native links or buttons and scoped CSS alongside the existing Base UI components, without a Tailwind or shadcn migration. Layered glass highlights and backdrop refraction leave text unfiltered, with dark-mode, reduced-motion, forced-color, and fallback treatments. The style guide includes working demo links for its pinned hover, focus, and pressed appearances, plus a native disabled example.

## Content and assets

The hero uses an editable SVG illustration in `src/SpaceScene.tsx`, styled by `src/space-scene.css`. It shows an adult-proportioned astronaut with a closed visor, a shuttle, and a visibly connected mechanical arm holding a wrench, using the website's linen, sage, and metallic palette. Movement is slow and subtle, with native play/pause controls, a static reduced-motion default, and animation suspended offscreen. The shared component supports `compact`, `phase`, and `className` props; its compact form accompanies interaction states in the object demonstration without replacing the text status.

The SO-101-style tabletop arm remains a procedural Three.js illustration in `src/RobotScene.tsx`. Its geometry, materials, lighting, joints, and animation are editable source code rather than a downloaded 3D asset or an engineering twin of the physical arm.

The landing page prominently renders `<RobotScene moment="medicine" />` rather than limiting the model to the demo route. This medication-delivery concept shows a seven-day plastic pill organizer on the main desk and a shallow dish on a separate bedside table. After confirmation, the arm opens a compartment, collects loose pills, and places them individually into the dish. The scene does not determine medication or dose and makes no clinical claim.

`RobotScene` is shared by the landing page, object demonstration, and style guide. The landing model defaults to a static pose, with `ArmPreview` in `src/App.tsx` providing native “Preview pill delivery,” “Stop preview,” and replay controls. This on-demand preview starts directly; the full `/demo` interaction still requires selection and confirmation. The guide specimen stays static.

The demo uses `RobotMoment` values `medicine`, `mug`, `water`, and `phone` and `RobotPhase` values `idle`, `selected`, `reaching`, and `done`. Selection highlights the target without moving the arm. Confirmation starts the medicine sequence of opening the compartment and transferring individual pills over approximately 10–12 seconds; other objects retain the approximately four-second pickup sequence. The scene signals completion through its callback. Reset and object changes cancel the sequence; reduced motion shows the completed state directly. Keep the text status synchronized with the scene.

The supported introduction is “Look explores how gaze-controlled robotics can make everyday objects easier to reach for people with limited hand mobility.” The astronaut represents possibility, without inventing a person, equating disability with wearing a spacesuit, or claiming NASA involvement or flight readiness. The tabletop scene illustrates intended interaction and does not reproduce calibrated kinematics, physical grasp performance, or real robot control.

The $100–150 figure is the team’s estimate for the self-printed arm build, not a full system cost. No measured efficacy or task-success figures are presented.

When the video is ready, update `VideoLink` in `src/App.tsx` with its actual destination and remove the coming-soon treatment. Use a descriptive title and accessible captions for the published video.
