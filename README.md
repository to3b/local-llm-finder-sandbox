# Local LLM Finder Sandbox

Safe staging environment for experimenting with the Local LLM Finder UI without changing production.

## How it works

The Pages workflow starts from the last known-good production snapshot:

`to3b/local-llm-finder@9eaad0eb611760802093bc52983adb8927785fad`

It then copies anything in `overrides/` on top of that snapshot, runs the production test suite, removes the production `CNAME`, blocks indexing, and deploys the result as this repository's GitHub Pages site.

This means design or interaction changes can be tested here first. Production is untouched until a change is deliberately ported back.

## Editing

Mirror the production path inside `overrides/`.

Examples:

- `overrides/index.html` replaces the production root page.
- `overrides/dist/palette.css` replaces the production palette.
- `overrides/dist/copy-tune.js` replaces that runtime module.

Avoid copying files that are not being changed; unchanged files continue to come from the pinned production snapshot.

## Pages

Enable GitHub Pages for this repository with **Settings → Pages → Source: GitHub Actions**.

Expected staging URL after the first successful deployment:

`https://to3b.github.io/local-llm-finder-sandbox/`

The sandbox is intentionally `noindex` and does not contain the production custom-domain `CNAME`.
