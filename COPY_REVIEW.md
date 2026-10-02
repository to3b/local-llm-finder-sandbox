# Sandbox copy and reading review

Scope: Finder (Find, Improve and Upgrade), Knowledge directory, all 280 available articles, methodology, and the test submission flow. Terms, Privacy and submission-privacy copy are excluded. Changes are sandbox-only; the live catalogue, ranking engine and content Sheet are unchanged.

## Findings

The problem is how much competes for attention, not simply the number of words. The Finder presents a long explanation before its controls, then repeats instructions under obvious choices. Its five priority buttons already explain the decision. Additional labels and helper sentences add another reading task without helping users choose.

The Knowledge directory has 280 article descriptions. Most draft descriptions repeat the title and a source-review warning. The same warning appears again on the destination page. This makes a directory look like a very long article, even though the visitor wants a particular model or card. Search already includes those descriptions, so removing their visible repetition does not remove search coverage.

Draft articles introduce their draft status in the title summary, badge, warning, opening paragraph, source explanation and editorial checklist. Visitors need the status and provenance, but the checklist is mainly for the editor. Keeping the actual catalogue figures visible and moving the checklist behind a disclosure creates a more useful reading order.

Published articles contain useful, model-specific distinctions: download size versus runtime allocation, native versus extended context, and exact hardware variants. Cutting these indiscriminately would make the pages less useful and could imply tested compatibility. Their factual bodies are retained. The supporting page navigation, sources, related links and incoming links do not all need to appear expanded alongside those explanations.

Methodology repeats its three central ideas in its introduction, summary cards and longer sections. Implementation wording such as “V1” and “prototype ranking inputs” makes readers work harder to understand practical limits. The rewrite answers three plain questions first: will it fit, why this model, and how fast. The weighting, tie behavior, filtering and MoE assumptions remain available in two disclosures.

The submission page makes users choose between a form, a separate results destination and a guide below the form. The guide shows two full prompts, repeated instructions and helper setup at once. The form only needs hardware, model and outcome; those should remain the obvious path. Prompts belong inside that path, as optional help, rather than as another page section to navigate.

## Changes

- Finder: one short instruction before controls; remove redundant tier/task copy, shorten conditional hardware and advanced-setting help, consolidate the footer estimate notice. Keep all working modes, controls, error states and result rationale.
- Knowledge directory: compact, two-column name lists on desktop and a single column on mobile. All 280 links, draft badges, categories, status filters and summary-based search remain.
- Articles: retain factual content and provenance. Fold the table of contents, sources and editor checklist. Merge incoming/related destinations into one deduplicated “Related reading” list. Fragment links reveal a collapsed destination, including direct links and browser history.
- Drafts: one explicit source-review notice above catalogue inputs. Remove the repeated summary and opening boilerplate. Keep draft status. Spreadsheet editing stays outside visitor-facing pages.
- Methodology: replace repeated framing with three short explanations and a download/buying check. Preserve consequential ranking and speed limitations in accessible disclosures.
- Test form: remove its sub-navigation and results-page exit after submission. Place an optional prompt section after hardware/model. Show one writing or coding prompt at a time, with an own-task option. Keep repeat-run settings and the automatic helper as secondary disclosures. Copying records the matching prompt version. Imports, saved drafts, failed-submit recovery and backend review are retained.

## Copy rules used

Use concrete nouns and verbs; do not add slogans, praise or promises of accuracy. Do not describe what the interface already shows. Place warnings beside the decision they qualify, and avoid repeating them. Distinguish catalogue estimates from measurements. Keep essential limitations visible; hide supporting detail only when the summary tells readers what they will find.

No facts or benchmark claims are added. Public article bodies and source URLs remain available. Removing a results navigation tab does not make reports automatically adjust recommendations: only reviewed evidence can inform future calibration.

## Static copy comparison

Counts exclude scripts, styles and metadata. They include hidden form states and disclosure contents, and omit prompts generated in JavaScript. They measure total bundled text, not words in the first viewport.

| Page | Before | After |
| --- | ---: | ---: |
| Finder | 412 | 344 |
| Knowledge directory | 6,266 | 1,604 |
| Methodology | 541 | 293 |
| Qwen3 14B draft | 376 | 321 |
| Test form | 531 | 307 |

The largest reduction is the directory: roughly 74% less visible listing text, with all article destinations retained. The test form has roughly 42% less static copy and only one example exposed at a time. Published article word counts change mainly through supporting navigation; their useful explanations are retained.

## Validation

Run recommendation/data regressions, complete page/source checks, contribution failure/retry tests, all-page desktop/mobile design checks, and live article-to-form verification before handoff. Confirm legal text is unchanged. Exercise both baseline prompts and own tasks, not only the initial form state.
