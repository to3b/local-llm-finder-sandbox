# Knowledge article preview

`knowledge-articles.csv` is the six-article snapshot prepared on 1 October 2026
from the content workbook, with candidate publication dates for preview builds.
Production continues to read the Google Sheet; this snapshot does not publish
drafts there. Refresh it deliberately when reviewing another article batch.

The workflow builds this snapshot with the pinned Knowledge generator before
applying sandbox route transforms. Finder navigation and article links stay in
the sandbox, every HTML page is noindex/nofollow, and preview sitemaps are removed.

Browser checks cover every article at 360, 390, 768 and 1280 pixels, stylesheets,
heading links, sources, related references, backlinks, directory search, exact
GPU references and the Qwen3/gpt-oss comparison mappings.
