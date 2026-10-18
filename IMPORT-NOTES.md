# Showcase import notes

The current homepage brings the dark, eye-centered website presentation from `THEschildkrote/armtracking` into the standalone Look website. The purpose is to preserve that presentation while keeping this repository editable, independently deployable on Vercel, and usable without robotics services.

## Source snapshot

- Repository: [THEschildkrote/armtracking](https://github.com/THEschildkrote/armtracking)
- Exact commit: [`3dc2aff4ed5e6c858199e6da2ec9d191fae93d1d`](https://github.com/THEschildkrote/armtracking/commit/3dc2aff4ed5e6c858199e6da2ec9d191fae93d1d)
- Frontend source: [`sponsors/showcase` at that commit](https://github.com/THEschildkrote/armtracking/tree/3dc2aff4ed5e6c858199e6da2ec9d191fae93d1d/sponsors/showcase)

The original import incorporated the website frontend, excluding evidence logs, sponsor credentials, Python services, and hardware-control code. The current revision separately restores one saved historical synthetic evaluation report and adds a standard-library-only, read-only image bridge described below. The snapshot reference identifies provenance; it does not establish that a service mentioned in the source is connected here.

## Integration

`index.html` contains the current page structure, `src/showcase/showcase.css` defines its dark visual system, and the modules in `src/showcase/` handle navigation and browser interaction. The public routes are `/`, `/#studio`, `/#routines`, and `/#evaluation`.

The current homepage's object tabs and 3D arm preview have been removed. `/#studio` keeps its URL but is named **Live views** and contains read-only camera panels and routine-context status. Its 3D arm, reach-confirmation controls, and simulated activity log have also been removed. The animated iris and its pause control remain.

The previous React application has its own `legacy.html` entry for `/demo`, `/day`, `/classic`, and `/style-guide`. Its object demonstration still uses the editable `src/RobotScene.tsx` source and installed dependencies. Its linen and sage design, including the liquid-glass button and technical shuttle illustration, remains historical reference material. `STYLE-GUIDE.md` documents that legacy system rather than the imported dark design.

## Camera-view boundary

The source presentation expects Python services with process-wide state and server-side sponsor credentials. A static frontend deployment cannot reproduce those services by including their scripts or configuration. The current showcase displays connected camera sources and saved data; it does not control the arm or run Chalk, Factory, gaze, blink, or voice services.

Visitors must explicitly connect supplied source URLs. `.jpg`, `.jpeg`, `.png`, and `.webp` image endpoints refresh as snapshots; custom MJPEG endpoints display as streams. Camera activity pauses when Live views is off-page or the document is hidden, and disconnect removes active sources and refresh work. The frontend does not record streams or automatically request camera or microphone access. Displaying a feed neither authorizes robot movement nor establishes robot performance.

SSH access to A2000 has been restored. Earlier services on ports 8080 and 8769 were unavailable; existing `scene.live_objects` and `gaze.live --sidecam --arm` processes already own the cameras and are left running. The new `tools/feed-snapshot-bridge.py` reads their existing image files instead of opening cameras or importing hardware code. It listens only on remote `127.0.0.1:8771`, forwarded to local `127.0.0.1:18771`.

The bridge allowlists `/side.jpg` from `side_check.jpg`, `/front.png` from `front_now.png`, and `/wrist.jpg` from `wrist_check.jpg`, plus `/status` for availability. Frames must be no older than 10 seconds; stale or unavailable image routes return HTTP 503. Workspace and outward-facing glasses feeds were displayed successfully in the browser at 640 × 480 and 240 px source width respectively. The wrist image was stale and correctly returned 503. The local website preset sets only `http://127.0.0.1:18771/side.jpg` and `http://127.0.0.1:18771/front.png`, leaving wrist blank.

The bridge source is included for reproducibility, with no raw logs, camera images, credentials, or hardware imports. [README.md](README.md#camera-sources) provides foreground bridge and SSH-forward examples using the configurable `A2000` alias. These verified connections remain private. The HTTPS Vercel deployment requires HTTPS relay URLs; enabling a temporary public feed relay is awaiting the user's decision. Credentials must not be placed in URLs, and a relay must not expose robot control.

## Restored historical evaluation

Run `9141cc2558a74fbc9d8d0eb8bfa0cbdd` was recorded on **18 October 2026 at 06:48 UTC**. It is a saved synthetic intent-prediction evaluation, with **6 fixations per method**. Gaze-only and gaze-plus-history both report **100%** top-choice accuracy at 300 ms before confirmation; the observed improvement is **0 percentage points**.

This report is not generated by a browser session and is not a CASAS evaluation. It does not measure physical grasp success, safety, or clinical outcomes, and its two equal scores do not establish a benefit from history. CASAS background information remains separate on the Routines page. The view must identify the saved run and synthetic scope, and continue to show an unavailable state for missing or invalid data. No Factory analysis or live Chalk connection is implied by restoring the report.

## Future service integration

A future authenticated backend can be connected separately through an explicit API. Keep sponsor credentials on that server and isolate state by authenticated session. Do not expose credentials in frontend source, bundled environment variables, or stream URLs. Camera access must stay separate from any robot-control endpoint.

Define the report schema and label the origin and scope of each result before changing the evaluation view. Distinguish prediction or replay metrics from physical grasp outcomes. Connecting a real robot requires its own control and authorization path; neither camera display nor the retained legacy animation is that path.

## Validation targets

These are review targets for the integration, not a record of completed checks:

- Build both HTML entries from source and installed dependencies.
- Open the showcase and each hash route directly, then exercise browser back and forward navigation.
- Open `/demo`, `/day`, `/classic`, and `/style-guide` directly in local preview and on Vercel; verify their retained behavior separately from the current showcase.
- Verify that the home and Live views pages contain no 3D object preview, selection/confirmation controls, or simulated activity log.
- Check that routine status remains disconnected without an actual service and does not call unavailable Python or sponsor endpoints.
- Verify the restored run ID, timestamp, six-fixation counts, equal 100% scores, zero-point difference, and explicit synthetic scope; test missing or invalid report data.
- Confirm that image snapshots refresh and custom MJPEG sources display only after an explicit connection, pause off-page and while hidden, clean up on disconnect, and show failure states honestly.
- Check workspace and outward-facing glasses through the private snapshot bridge; keep wrist disconnected while its source is stale. Validate `/status`, the 10-second freshness cutoff, and unavailable-source behavior. Validate any authorized HTTPS relay separately for Vercel.
- Check keyboard access, visible focus, descriptive controls, iris pause/resume, reduced motion, and narrow screens.
- Review the import for credentials, raw logs, camera images, hardware-control files, and copied compiled vendor code before publishing; the read-only bridge source is intentional.

## Verification recorded for the earlier import

The checks below were completed for the earlier version with the 3D showcase. They do not validate the current removal, refreshed camera transport, or restored report:

- `npm run build` passes for both entries; the existing Three.js chunk-size advisory remains.
- `npm test` passes all eight controller tests, including confirmation gates, stale completion IDs, cancellation, and independent sessions.
- Browser checks passed for an animated mug reach and reduced-motion medicine, water, and phone completion; leaving the studio cancels an active reach.
- All four showcase pages fit a 320 px viewport without horizontal page overflow. Iris pause/resume, reduced motion, keyboard object tabs, and explicit stream connect/disconnect were checked.
- Local direct visits to `/demo`, `/day`, `/style-guide`, and `/classic` load the retained React routes. No browser console errors were observed during these checks.

## Current verification status

The camera-only revision has the following completed checks:

- `npm test` passes all **15 tests**.
- `npm run build` passes; the retained legacy Three.js bundle still produces the existing chunk-size warning.
- Home, Live views, and Evaluation fit a **320 px** viewport without horizontal page overflow.
- The retained `/day` route renders the legacy experience.
- The evaluation page presents the saved run's actual data and full report text.
- The current showcase route contains only the iris canvas, with no 3D arm canvas.
- The private workspace and outward-facing glasses image feeds display successfully in the browser. The stale wrist source returns HTTP 503 and is not included in the preset.

Production deployment of this revision has not yet been verified. A public HTTPS feed relay has not been enabled; its use awaits the user's decision. The completed local checks do not establish public feed availability.
