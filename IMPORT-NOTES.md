# Showcase import notes

The current homepage brings the dark, eye-centered website presentation from `THEschildkrote/armtracking` into the standalone Look website. The purpose is to preserve that presentation while keeping this repository editable, independently deployable on Vercel, and usable without robotics services.

## Source snapshot

- Repository: [THEschildkrote/armtracking](https://github.com/THEschildkrote/armtracking)
- Exact commit: [`3dc2aff4ed5e6c858199e6da2ec9d191fae93d1d`](https://github.com/THEschildkrote/armtracking/commit/3dc2aff4ed5e6c858199e6da2ec9d191fae93d1d)
- Frontend source: [`sponsors/showcase` at that commit](https://github.com/THEschildkrote/armtracking/tree/3dc2aff4ed5e6c858199e6da2ec9d191fae93d1d/sponsors/showcase)

Only the website frontend is incorporated. Evidence logs, sponsor credentials, Python services, and hardware-control code are outside this import. The snapshot reference identifies provenance; it does not establish that a service mentioned in the source is connected here.

## Integration

`index.html` contains the current page structure, `src/showcase/showcase.css` defines its dark visual system, and the modules in `src/showcase/` handle navigation and browser interaction. The public routes are `/`, `/#studio`, `/#routines`, and `/#evaluation`.

The existing editable `src/RobotScene.tsx` is shared with the showcase through the Vite build. React, Three.js, and other dependencies continue to come from the project's package manifest and lockfile. Copied compiled vendor bundles are not the source of the arm implementation.

The previous React application has its own `legacy.html` entry for `/demo`, `/day`, and `/style-guide`. Its linen and sage design, including the liquid-glass button and technical shuttle illustration, remains historical reference material. `STYLE-GUIDE.md` documents that legacy system rather than the imported dark design.

## Browser demonstration boundary

The source presentation expects Python services with process-wide state and server-side sponsor credentials. A static frontend deployment cannot reproduce those services by including their scripts or configuration. This integration instead uses demonstration state scoped to the current browser tab, with explicit native controls for selection and confirmation.

The illustrated arm moves after confirmation and reports completion to the interface. It does not control a physical robot or establish a live Chalk, Factory, gaze, blink, or voice integration. Routines are described without running background analysis. Evaluation views retain an empty state when no report is available rather than inventing results.

Visitors may supply stream URLs and explicitly connect them for display. The site does not automatically request browser camera or microphone access. Stream display is separate from object selection and does not authorize a reach or supply evidence of robot performance.

## Future service integration

A future authenticated backend can be connected separately through an explicit API. Keep sponsor credentials on that server, isolate state by authenticated session, and validate selection, confirmation, cancellation, and completion there. Do not expose credentials in frontend source, bundled environment variables, or stream URLs.

Define the report schema and label the origin and scope of each result before populating the evaluation view. Distinguish prediction or replay metrics from physical grasp outcomes. Connecting a real robot also requires its own control and authorization path; the browser animation callback is only a presentation event.

## Validation targets

These are review targets for the integration, not a record of completed checks:

- Build both HTML entries from the source component and installed dependencies.
- Open the showcase and each hash route directly, then exercise browser back and forward navigation.
- Open `/demo`, `/day`, and `/style-guide` directly in local preview and on Vercel.
- Select and confirm each studio object; verify completion, reset, cancellation, and route changes without stale events.
- Check that separate tabs keep independent demonstration state and do not call unavailable Python or sponsor endpoints.
- Verify that routines and evaluation show accurate descriptions or empty states without fabricated results.
- Confirm that streams connect only after an explicit action, disconnect correctly, and present an unavailable state for failed URLs.
- Check keyboard access, visible focus, descriptive controls, reduced motion, narrow screens, and scene rendering.
- Review the import for credentials, evidence logs, backend files, and copied compiled vendor code before publishing.

## Verification for this import

- `npm run build` passes for both entries; the existing Three.js chunk-size advisory remains.
- `npm test` passes all eight controller tests, including confirmation gates, stale completion IDs, cancellation, and independent sessions.
- Browser checks passed for an animated mug reach and reduced-motion medicine, water, and phone completion; leaving the studio cancels an active reach.
- All four showcase pages fit a 320 px viewport without horizontal page overflow. Iris pause/resume, reduced motion, keyboard object tabs, and explicit stream connect/disconnect were checked.
- Local direct visits to `/demo`, `/day`, `/style-guide`, and `/classic` load the retained React routes. No browser console errors were observed during these checks.
