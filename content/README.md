# Knowledge article preview

The initial snapshot contains 280 available references: six published articles and 274 editable catalogue drafts (133 models and 141 GPUs). It is retained for offline reproduction; production and sandbox builds read the live content Sheet.

The pinned generator renders enabled drafts with a visible review notice, exact Google Sheet row editing link and noindex metadata. Published-only sitemaps and status transitions are covered by builder tests. The directory supports text search and Published/Drafts filters.

The sandbox refreshes twice an hour from the Sheet, and can be refreshed with its Pages workflow. Edit Body Markdown and metadata in Knowledge Articles; fill Date Published and set Published after review. The browser checks derive counts from the generated directory so normal status changes are supported.

Sandbox navigation and reference links stay within staging. Every staging HTML page is noindex/nofollow and preview sitemaps are removed. Static checks open every generated page, and browser checks cover representative model/GPU pages at 360, 390, 768 and 1280 pixels, status filtering and exact entity mappings including IDs with dots.
