# Look website

A standalone Vite website for Look with a dark, eye-centered showcase, read-only camera views, and a saved evaluation report. The current homepage and workspace no longer contain the 3D arm demonstration. The earlier React, Base UI, and Motion experience remains available through legacy routes. This repository contains the website frontend and an optional read-only snapshot bridge; it does not run robotics control services.

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

Open `http://127.0.0.1:8780`. Build with `npm run build`; preview the production output with `npm run preview` after stopping the development server. Run `npm test` for the automated checks. The current build and all 15 tests pass; local browser checks are recorded in [IMPORT-NOTES.md](IMPORT-NOTES.md). Production verification of this revision remains pending.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Current dark, eye-centered showcase and product introduction |
| `/#studio` | Live views: read-only wrist, overhead, and user-perspective camera panels |
| `/#routines` | Routine-context explanation and an empty analysis state when no report is available |
| `/#evaluation` | Saved historical synthetic intent-prediction evaluation, with its source and limits |
| `/demo` | Retained linen React object demonstration |
| `/demo?object=medicine` | Legacy object deep link; accepts medicine, mug, water, or phone |
| `/day` | Compatibility alias for the legacy object demonstration |
| `/classic` | Earlier linen landing page with the shuttle illustration and liquid-glass button |
| `/style-guide` | Archived linen design-system reference, including the live liquid-glass button examples |

The current showcase uses hash navigation inside `index.html`; the Live views navigation item keeps the `#studio` URL for compatibility. The retained `/demo`, `/day`, `/classic`, and `/style-guide` routes load the React application through the separate `legacy.html` entry. The historical style guide does not define the current dark design.

The current workspace has no object-selection, reach-confirmation, or simulated activity controls. Camera display does not command physical hardware or perform gaze, blink, or speech recognition. Routine and evaluation views do not run Chalk, Factory, or Python analysis in this deployment. The site does not automatically request browser camera or microphone access.

## Camera sources

Open **Live views**, expand **Connect video streams**, enter the source URLs, and choose **Connect feeds**. Image endpoints ending in `.jpg`, `.jpeg`, `.png`, or `.webp` refresh as snapshots; custom MJPEG endpoints display as streams. Connections start only after that explicit action, pause while the workspace is off-page or the document is hidden, and are cleaned up when disconnected. Streams are not recorded by this frontend.

SSH access to A2000 has been restored. The previous services on ports 8080 and 8769 were unavailable. The existing `scene.live_objects` and `gaze.live --sidecam --arm` processes own the cameras and must remain running; the website does not interrupt them or open the cameras itself.

The standard-library-only [snapshot bridge](tools/feed-snapshot-bridge.py) reads images already written by those processes. It listens on remote loopback port **8771**, reached through local SSH port **18771**:

| View | Existing image | Local source URL | Verified state |
| --- | --- | --- | --- |
| Overhead workspace | `side_check.jpg` | `http://127.0.0.1:18771/side.jpg` | Live, displayed at 640 × 480 |
| Outward-facing glasses | `front_now.png` | `http://127.0.0.1:18771/front.png` | Live, displayed at 240 px source width |
| Wrist camera | `wrist_check.jpg` | `http://127.0.0.1:18771/wrist.jpg` | Stale; returns HTTP 503 and stays disconnected |

The website's local preset fills only the workspace and glasses URLs, leaving wrist blank; choose **Connect feeds** to start displaying them. The bridge serves only the three allowlisted image routes and `/status`, requires frames no older than **10 seconds**, and returns HTTP 503 when a frame is stale or unavailable. `/status` reports current availability without exposing source paths. A feed that worked during verification can become unavailable if its upstream process stops updating images.

For a fresh setup, replace the example remote paths with the bridge location and existing snapshot directory. Start the bridge in the foreground in one terminal; skip this step if it is already running:

```sh
ssh A2000 'python3 /path/to/look-website/tools/feed-snapshot-bridge.py --logs /path/to/existing/snapshot-directory --port 8771'
```

In a second local terminal, keep the SSH forward running:

```sh
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:18771:127.0.0.1:8771 A2000
```

`A2000` is the user's configured SSH alias; no account identity or credentials are embedded in these examples. Stop the bridge and forward with **Ctrl+C** in their respective terminals. The bridge contains no hardware imports, camera-opening code, or robot-control calls. Only its reusable source is included in this repository; raw logs and camera images are not.

These loopback addresses are private to the machine running the tunnel. The HTTPS Vercel site needs browser-reachable **HTTPS camera relay URLs**. A temporary public relay has not been enabled and is awaiting the user's decision; the verified feeds remain private. Keep credentials out of URLs and frontend code, and expose only camera images through any relay, never robot-control endpoints. Production deployment of this revision has not yet been verified.

## Saved evaluation

The evaluation page restores historical run `9141cc2558a74fbc9d8d0eb8bfa0cbdd`, recorded on **18 October 2026 at 06:48 UTC**. This is a synthetic intent-prediction evaluation: each method has **6 fixations**, gaze-only and gaze-plus-history both show **100%** top-choice accuracy at 300 ms before confirmation, and the observed difference is **0 percentage points**.

These results come from that small saved synthetic run, not a new evaluation performed in the browser. They are not CASAS activity-prediction results, physical pickup outcomes, or clinical evidence, and they do not demonstrate a measured benefit from adding history. The CASAS description on the Routines page is separate. Missing or invalid reports must still produce an honest unavailable state.

## Deploy on Vercel

For a new deployment, import `dalessioso/look-website` into Vercel and use the repository root (`.`) as **Root Directory**. Select the **Vite** framework preset and **Node.js 24.x**. The install command is `npm ci`, the build command is `npm run build`, and the output directory is `dist`. No sponsor credentials or backend environment variables are needed for this frontend deployment.

The build includes both the current showcase and the retained React entry. Keep the route handling in `vite.config.ts` and `vercel.json` aligned so direct visits to the legacy routes load `legacy.html`, while showcase navigation uses the URL hash.

The repository is connected to Vercel. Push changes to a feature branch on GitHub to create a preview, then review it through a pull request. Merging into `main` updates the production website. Check Vercel's build status and preview before merging.

## Editing the current showcase

The current visual direction comes from the website frontend in [THEschildkrote/armtracking at commit `3dc2aff4ed5e6c858199e6da2ec9d191fae93d1d`](https://github.com/THEschildkrote/armtracking/tree/3dc2aff4ed5e6c858199e6da2ec9d191fae93d1d), under `sponsors/showcase`. See [IMPORT-NOTES.md](IMPORT-NOTES.md) for the integration boundary and validation targets.

Edit the page structure and content in `index.html`, the current dark visual system in `src/showcase/showcase.css`, and the browser modules in `src/showcase/`. Those modules handle showcase navigation, the animated iris, camera connections, and report presentation. Keep the current workspace read-only; the 3D object preview and confirmation flow belong only to the retained legacy experience.

## Archived linen design system

[STYLE-GUIDE.md](STYLE-GUIDE.md) and `/style-guide` preserve version 1.6 of the earlier linen and sage design. They remain useful for the legacy React pages and components and have not been automatically merged with the dark showcase. Legacy colors and typography live in `src/styles.css`, object-demo styles in `src/day.css`, and guide styles in `src/style-guide.css`.

The retained `src/Wordmark.tsx` provides the custom SVG Look signature. `src/SpaceScene.tsx` and `src/space-scene.css` contain the technical shuttle illustration. The shared `LiquidButton` in `src/components/ui/liquid-glass-button.tsx` is adapted from [Ali Imam’s Liquid Glass Button](https://21st.dev/@designali-in/components/liquid-glass-button), with native links or buttons and scoped CSS alongside Base UI. Its enabled guide examples link to `/demo`; the disabled example uses native disabled behavior.

The legacy `src/RobotScene.tsx` uses procedural Three.js geometry for an SO-101-style illustration. It is not a calibrated engineering model or evidence of a physical pickup. Its medication scene moves illustrated pills from a weekly organizer to a bedside dish; it does not choose a medication or dose. Preserve the legacy selection, confirmation, completion, and cancellation sequence when editing that component.

The legacy animated tabs were inspired by [Chetan Verma’s Animated Tabs](https://21st.dev/@chetanverma16/components/animated-tabs) and implemented with [Base UI Tabs](https://base-ui.com/react/components/tabs). Legacy fonts remain self-hosted through Fontsource. These references describe the retained implementation, not an additional dependency or redesign of the current showcase.

## Content boundaries

The frontend import excludes sponsor credentials and the hardware backend. The separately restored saved evaluation is a specific historical report, not a live service or a general import of evidence logs. Neither that synthetic report, the camera display, nor the legacy browser illustration establishes measured physical task success or clinical efficacy. Every evaluation report must identify its source and distinguish prediction or replay metrics from physical grasp outcomes.

The $100–150 figure in the retained material is the team's estimate for the self-printed arm build, not a verified complete-system price. The legacy video remains unavailable until a real destination is supplied to `VideoLink` in `src/App.tsx`; use accessible captions when publishing it. Space imagery in the archived design is a concept and does not claim NASA involvement or flight readiness.
