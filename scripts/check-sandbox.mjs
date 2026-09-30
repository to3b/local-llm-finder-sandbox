import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(process.argv[2] || 'site');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const rootHtml = read('index.html');
const distHtml = read('dist/index.html');
const app = read('dist/app.js');
const journeys = read('dist/journeys.js');
const copyTune = read('dist/copy-tune.js');
const css = read('dist/sandbox-refine.css');

for (const [name, html] of [['root', rootHtml], ['dist', distHtml]]) {
  assert.equal((html.match(/class="journey-nav"/g) || []).length, 1, `${name} must render one journey selector before JS runs`);
  assert.equal((html.match(/class="priority-step"/g) || []).length, 5, `${name} must render all five priority choices before JS runs`);
  assert.ok(html.includes('priority-control priority-enhanced'), `${name} must not flash the native range before enhancement`);
  assert.ok(html.includes('Context length'), `${name} must use the clarified context label at first paint`);
  assert.ok(html.includes('Model filters'), `${name} must use the model-filter label at first paint`);
  assert.ok(html.includes('aria-current="page"'), `${name} must expose the active Finder navigation state`);
  assert.ok(html.includes('sandbox-refine.css'), `${name} must load the sandbox refinement layer`);
  assert.equal((html.match(/src="\.\/journeys\.js\?v=sandbox-/g) || []).length, 1, `${name} must explicitly execute the journey module once`);
  assert.ok(html.includes('app.js?v=sandbox-'), `${name} must cache-bust the build-time modified app module`);
  assert.ok(html.includes('copy-tune.js?v=sandbox-'), `${name} must cache-bust the build-time modified enhancement module`);
}

assert.ok(app.includes("new URL('/local-llm-finder-sandbox/', window.location.origin)"), 'sandbox share links must stay inside the sandbox');
assert.ok(app.includes('Top match for your settings'), 'top recommendation copy must be calibrated');
assert.ok(app.includes('Context used for this estimate'), 'expanded results must expose estimate context');
assert.ok(app.includes('Model context limit'), 'expanded results must distinguish model context limit');
assert.ok(app.includes('Select your GPU to estimate speed'), 'unknown speed copy must state the next action');
assert.ok(app.includes('fit · ${parameterText'), 'collapsed rows must expose a task-fit reason');

assert.ok(journeys.includes("if (!document.querySelector('.journey-nav'))"), 'journey code must not duplicate the static selector');
assert.ok(journeys.includes("b.setAttribute('aria-selected'"), 'journey tabs must synchronize aria-selected');
assert.ok(journeys.includes("new URL('/local-llm-finder-sandbox/', location.origin)"), 'journey hashes must stay inside the sandbox');
assert.ok(journeys.includes('Capacity comparison'), 'upgrade view must identify itself as a capacity comparison');
assert.ok(journeys.includes('Model context limit'), 'comparison cards must distinguish the model context limit');

assert.ok(copyTune.includes("steps.dataset.priorityClick = 'true'"), 'pre-rendered priority choices must receive one click handler');
assert.ok(!copyTune.includes('watchGeneratedCopy'), 'sandbox must not use generated-result mutation watching');
assert.ok(!copyTune.includes('tuneGeneratedCopy'), 'sandbox must not rewrite live results after render');

assert.ok(css.includes('--accent: #9cbfff'), 'sandbox style layer must use the restrained blue accent');
assert.ok(css.includes('box-shadow: inset 3px 0 0 var(--accent)'), 'selected controls need a non-colour state marker');
assert.ok(css.includes('font-variant-numeric: tabular-nums'), 'comparison numbers should use tabular numerals');
assert.ok(css.includes('min-height: 44px'), 'primary controls should meet the touch-target target');

console.log('Sandbox first-paint, module-loading, interaction and style-guide smoke checks passed.');
