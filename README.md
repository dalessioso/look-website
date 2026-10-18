# Look website

A standalone Vite website for Look with a dark, eye-centered showcase and an interactive Three.js arm simulation. The earlier React, Base UI, and Motion experience remains available through legacy routes. This repository contains the website frontend only; it does not run robotics control services.

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

Open `http://127.0.0.1:8780`. Build with `npm run build`; preview the production output with `npm run preview` after stopping the development server. Run `npm test` to check the browser controller’s confirmation, cancellation, and session-isolation rules.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Current dark, eye-centered showcase and product introduction |
| `/#studio` | Interactive 3D arm demonstration with explicit selection and button confirmation |
| `/#routines` | Routine-context explanation and an empty analysis state when no report is available |
| `/#evaluation` | Evaluation-report presentation with an empty state; no invented benchmark results |
| `/demo` | Retained linen React object demonstration |
| `/demo?object=medicine` | Legacy object deep link; accepts medicine, mug, water, or phone |
| `/day` | Compatibility alias for the legacy object demonstration |
| `/classic` | Earlier linen landing page with the shuttle illustration and liquid-glass button |
| `/style-guide` | Archived linen design-system reference, including the live liquid-glass button examples |

The current showcase uses hash navigation inside `index.html`. The retained `/demo`, `/day`, and `/style-guide` routes load the React application through the separate `legacy.html` entry. The historical style guide does not define the current dark design.

The studio controller keeps demonstration state within the current browser tab. Native buttons select and confirm an illustrated reach; they do not perform gaze, blink, or speech recognition and do not command physical hardware. Routine and evaluation views do not run Chalk, Factory, or Python analysis in this deployment. Optional stream URLs are connected only when the visitor supplies them and chooses to connect; the site does not automatically request browser camera or microphone access.

## Deploy on Vercel

For a new deployment, import `dalessioso/look-website` into Vercel and use the repository root (`.`) as **Root Directory**. Select the **Vite** framework preset and **Node.js 24.x**. The install command is `npm ci`, the build command is `npm run build`, and the output directory is `dist`. No sponsor credentials or backend environment variables are needed for this frontend deployment.

The build includes both the current showcase and the retained React entry. Keep the route handling in `vite.config.ts` and `vercel.json` aligned so direct visits to the legacy routes load `legacy.html`, while showcase navigation uses the URL hash.

The repository is connected to Vercel. Push changes to a feature branch on GitHub to create a preview, then review it through a pull request. Merging into `main` updates the production website. Check Vercel's build status and preview before merging.

## Editing the current showcase

The current visual direction comes from the website frontend in [THEschildkrote/armtracking at commit `3dc2aff4ed5e6c858199e6da2ec9d191fae93d1d`](https://github.com/THEschildkrote/armtracking/tree/3dc2aff4ed5e6c858199e6da2ec9d191fae93d1d), under `sponsors/showcase`. See [IMPORT-NOTES.md](IMPORT-NOTES.md) for the integration boundary and validation targets.

Edit the page structure and content in `index.html`, the current dark visual system in `src/showcase/showcase.css`, and the browser modules in `src/showcase/`. Those modules handle showcase navigation, visual effects, the studio interaction, and report or stream presentation. The arm is shared from the editable original `src/RobotScene.tsx`; use the source component and installed dependencies rather than copied compiled vendor bundles.

The SO-101-style model uses procedural Three.js geometry, materials, joints, and animation. It is an illustration rather than a downloaded engineering twin, calibrated robot kinematics, or evidence of a physical pickup. The medication scene opens a weekly-organizer compartment and moves loose pills to a dish on a separate bedside table; it does not choose a medication or dose. Text status must remain synchronized with selection, confirmation, completion, and cancellation.

## Archived linen design system

[STYLE-GUIDE.md](STYLE-GUIDE.md) and `/style-guide` preserve version 1.6 of the earlier linen and sage design. They remain useful for the legacy React pages and components and have not been automatically merged with the dark showcase. Legacy colors and typography live in `src/styles.css`, object-demo styles in `src/day.css`, and guide styles in `src/style-guide.css`.

The retained `src/Wordmark.tsx` provides the custom SVG Look signature. `src/SpaceScene.tsx` and `src/space-scene.css` contain the technical shuttle illustration. The shared `LiquidButton` in `src/components/ui/liquid-glass-button.tsx` is adapted from [Ali Imam’s Liquid Glass Button](https://21st.dev/@designali-in/components/liquid-glass-button), with native links or buttons and scoped CSS alongside Base UI. Its enabled guide examples link to `/demo`; the disabled example uses native disabled behavior.

The legacy animated tabs were inspired by [Chetan Verma’s Animated Tabs](https://21st.dev/@chetanverma16/components/animated-tabs) and implemented with [Base UI Tabs](https://base-ui.com/react/components/tabs). Legacy fonts remain self-hosted through Fontsource. These references describe the retained implementation, not an additional dependency or redesign of the current showcase.

## Content boundaries

The frontend import excludes evidence logs, sponsor credentials, and the hardware backend. No measured task-success or clinical-efficacy result is established by the browser simulation. Any future evaluation report must identify its source and distinguish prediction or replay metrics from physical grasp outcomes.

The $100–150 figure in the retained material is the team's estimate for the self-printed arm build, not a verified complete-system price. The legacy video remains unavailable until a real destination is supplied to `VideoLink` in `src/App.tsx`; use accessible captions when publishing it. Space imagery in the archived design is a concept and does not claim NASA involvement or flight readiness.
