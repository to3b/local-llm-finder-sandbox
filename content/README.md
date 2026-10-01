# Knowledge article preview

The article snapshot contains 280 available references: the six published articles and 274 editable catalogue drafts (133 models and 141 GPUs). Drafts retain Status Draft and a blank Date Published.

The staged generator renders enabled drafts with a visible review notice, exact Google Sheet row editing link and noindex metadata. Published-only sitemaps and status transitions are covered by builder tests. The directory supports text search and Published/Drafts filters.

The sandbox builds the snapshot with its pinned generator plus the staged patch, then rewrites site navigation and reference links into the sandbox. Every staging HTML page is noindex/nofollow and preview sitemaps are removed.

Static checks open every generated reference and verify catalogue coverage and editing links. Browser checks cover representative published and draft model/GPU pages at 360, 390, 768 and 1280 pixels, status filtering, sources and entity mappings including IDs with dots.
