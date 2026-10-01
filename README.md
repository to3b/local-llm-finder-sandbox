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

## October UI cleanup

The sandbox now includes the UI cleanup and a local Knowledge preview. The build
runs regression tests before and after transforms, plus desktop/mobile browser
checks and screenshots. See [PROMOTION.md](PROMOTION.md) for the tested production
export and release procedure. The live domains are unchanged by sandbox commits.

## Editable Knowledge drafts

Knowledge previews now build from the same content Sheet as production and refresh at minutes 17 and 47 each hour. The initial catalogue is fully covered by 280 available pages, including 274 drafts. Use the Drafts filter and Edit this draft links to review pages in the Sheet.

The offline content snapshot is retained for reproducibility. The workflow uses a pinned generator and current Sheet rows; Published/Draft status changes are reflected on the next successful build. All sandbox HTML uses noindex/nofollow. Crawlers can read those tags, and no sandbox sitemap is deployed.

## Community tests — awaiting approval

The [Share a test page](https://to3b.github.io/local-llm-finder-sandbox/tests/) needs only hardware, model and outcome. No account/email is required. Finder links prefill known hardware and model; speed, settings and notes stay optional. Pasted/imported output is parsed in the browser, with raw logs/prompts/replies omitted from the saved report. Failed writes preserve input for retry.

Reports are stored by a separate sandbox service at `https://localllm-tests-sandbox.to3b.chatgpt.site`. Its Owner review link uses Sign in with ChatGPT for the site owner. Reports appear in Reviewed results only after approval. There are no invented benchmark results. The optional Python/Ollama helper runs five repeatable local measurements, saves a file, and never uploads automatically.

Only reviewed, explicitly selected and complete GPU measurements can be exported as calibration candidates. Generation speed does not measure answer quality, sparse evidence stays labelled, and candidates never alter rankings automatically. The production exporter intentionally omits this addition. See [PROMOTION.md](PROMOTION.md) before any production release.
