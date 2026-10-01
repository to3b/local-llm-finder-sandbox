# UI cleanup: sandbox first

Production Finder base: `to3b/local-llm-finder@9eaad0eb611760802093bc52983adb8927785fad`.
Knowledge preview base: `to3b/local-llm-finder-knowledge@1a10ffd513d1047b0db77cc7620e0a8fddcb2703`.

## Community tests approval gate

The October community-tests addition is sandbox-only. `prepare-sandbox.mjs` connects it only when `SITE_BASE` contains `sandbox`; the production exporter copies only its existing UI stylesheet overrides and does not include `tests/` or `test-links.js`. The live Finder, Knowledge, content Sheet and calibration table are unchanged.

Before promotion, the owner reviews the form, test instructions, privacy explanation, moderation flow and mobile experience. Then create a separate production submission environment, set its owner secrets and approved frontend origins, and explicitly port the navigation/actions. Do not mix synthetic sandbox checks into production hardware evidence.

Applying exported calibration candidates is a separate change: reproduce representative measurements, inspect differing runtimes/settings and uncertainty, update the engine/data contract and corresponding fallback/schema/tests together, and validate existing recommendation journeys. Quick observations, imported files, publication and candidate selection do not automatically tune the tool. A content article may use actual reviewed/reproduced evidence with its conditions and limitations; adding a submission feature alone does not establish originality or Google-policy compliance.

The sandbox build preserves the recommendation engine, catalogue, live-sheet schema,
transactional validation, fallback data and publisher links. It applies UI changes at
build time, runs the complete regression suite again, then checks browser interactions
and responsive widths of 360, 390, 768 and 1280px before deploying.

## What changed

- Neutral surfaces and consistent selected/focus states; no decorative gradients.
- Compact settings with separators and clearer result-toolbar hierarchy.
- Hardware-aware speed availability; speed values remain visible on mobile.
- Task fit in collapsed results; expanded rows add context rather than repeat metrics.
- Keyboard-accessible, mutually exclusive Find / Improve / Upgrade tabs.
- Aligned worked-example table generated from bundled data and a working setup link.
- Compact Knowledge availability note and a local reference-page preview.
- Smaller reference-page headings and fully visible mobile navigation.
- No-match search wording and preserved shared minimum-speed values.

## Prepare the Finder production candidate

Start with a clean checkout of the pinned Finder base. Do not point the exporter at
an already-transformed sandbox build. From this sandbox repository:

```sh
node scripts/export-production.mjs /path/to/clean-finder /path/to/empty-candidate
```

The exporter uses `/` as the production base, keeps the production `CNAME`, canonical
URLs and indexability, omits the local Knowledge preview, and runs `npm test`.
Review the candidate diff against the clean Finder checkout. Intended files:

- `index.html`, `dist/index.html`
- `dist/app.js`, `dist/journeys.js`, `dist/recommend.js`, `dist/copy-tune.js`
- `dist/ui-state.js`, `dist/sandbox-refine.css`
- `dist/methodology.html`, `dist/privacy.html`, `dist/terms.html`, `knowledge.html`
- `tests/release.test.js`, `tests/share-state.test.js`

No data/model/calibration files should change. Open a production PR, rerun checks,
review the sandbox, then merge only after the owner approves the live release.
If the production base has moved, rebase the transforms and recheck rather than
copying stale complete files over newer work.

## Knowledge production candidate

A concrete Knowledge candidate can be generated with:

```sh
node scripts/export-knowledge.mjs /path/to/clean-knowledge /path/to/empty-knowledge-candidate
```

The separate Knowledge site uses the Finder's shared styles. To port the tested
list layout, copy `overrides/dist/sandbox-refine.css` to `sandbox-refine.css` in
Knowledge and add a final stylesheet link to `index.html`. Keep all `data-copy-*`
and `data-knowledge-pages` hooks. Include the same final stylesheet in
`scripts/build-articles.mjs`'s generated head using `../../sandbox-refine.css`, so
future published articles receive the same styling. Do not copy the sandbox's
local URL rewrites into production. Leave the Sheet publishing controls,
`knowledge-data.js`, CNAME and article generator behavior intact.

## Release and rollback

Preview: https://to3b.github.io/local-llm-finder-sandbox/

After approval, deploy the Finder PR and Knowledge stylesheet PR. Recheck exact-GPU,
Mac, RAM-only, all journeys, shared links, filters, search, publisher links and legal
navigation on the live domains. Roll back by reverting those UI commits; data and
sheet contracts are unchanged. The sandbox contains no production CNAME and stays
noindex/nofollow, including its Knowledge preview.
