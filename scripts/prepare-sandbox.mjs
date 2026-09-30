import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'site');
const version = (process.env.GITHUB_SHA || 'sandbox').slice(0, 12);

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content);
}

function replaceRequired(text, search, replacement, label) {
  if (!text.includes(search)) throw new Error(`Sandbox transform could not find: ${label}`);
  return text.replace(search, replacement);
}

const journeyNav = `<nav class="journey-nav" aria-label="Choose what you want to do"><div class="journey-options" role="tablist" aria-label="Finder mode">
  <button type="button" class="journey-option" data-journey="find" role="tab" aria-pressed="true" aria-selected="true"><span>Find</span><small>Pick a model</small></button>
  <button type="button" class="journey-option" data-journey="improve" role="tab" aria-pressed="false" aria-selected="false"><span>Improve</span><small>Compare your model</small></button>
  <button type="button" class="journey-option" data-journey="upgrade" role="tab" aria-pressed="false" aria-selected="false"><span>Upgrade</span><small>See what memory unlocks</small></button>
</div></nav>`;

const prioritySteps = `<div class="priority-steps" role="group" aria-label="Speed versus quality priority">
  <button type="button" class="priority-step" data-priority="1" aria-pressed="false">Fastest</button>
  <button type="button" class="priority-step" data-priority="2" aria-pressed="false">Faster</button>
  <button type="button" class="priority-step" data-priority="3" aria-pressed="true">Balanced</button>
  <button type="button" class="priority-step" data-priority="4" aria-pressed="false">Stronger</button>
  <button type="button" class="priority-step" data-priority="5" aria-pressed="false">Strongest</button>
</div>`;

for (const rel of ['index.html', 'dist/index.html']) {
  let html = read(rel);

  if (!html.includes('sandbox-refine.css')) {
    html = replaceRequired(
      html,
      '</head>',
      `<link rel="stylesheet" href="./sandbox-refine.css?v=${version}"></head>`,
      `${rel} head`
    );
  }

  if (!html.includes('role="tablist" aria-label="Finder mode"')) {
    const heroForm = /(<section class="hero"[^>]*>[\s\S]*?<\/section>)(<form id="finder-form")/;
    if (!heroForm.test(html)) throw new Error(`Sandbox transform could not locate hero/form boundary in ${rel}`);
    html = html.replace(heroForm, `$1${journeyNav}$2`);
  }

  html = html.replace('<a href="/">Finder</a>', '<a href="/" aria-current="page">Finder</a>');
  html = html.replace('class="control-section computer-section"', 'class="control-section computer-section stage-section"');
  html = html.replace('class="control-section task-section"', 'class="control-section task-section stage-section"');
  html = html.replace('class="control-section priority-section"', 'class="control-section priority-section stage-section"');

  html = html.replace(
    '<div class="section-heading"><h2 id="computer-heading">Hardware</h2>',
    '<div class="section-heading"><span class="stage-index" aria-hidden="true">1</span><h2 id="computer-heading">Hardware</h2>'
  );
  html = html.replace(
    '<div class="section-heading"><h2 id="task-heading">Main use</h2>',
    '<div class="section-heading"><span class="stage-index" aria-hidden="true">2</span><h2 id="task-heading">Main use</h2>'
  );
  html = html.replace(
    '<div class="section-heading"><h2 id="priority-heading">Priority</h2>',
    '<div class="section-heading"><span class="stage-index" aria-hidden="true">3</span><h2 id="priority-heading">Priority</h2>'
  );

  html = html.replace('class="priority-control"', 'class="priority-control priority-enhanced"');
  if (!html.includes('class="priority-steps"')) {
    html = replaceRequired(
      html,
      '<div class="range-ends"><span>Faster</span><span>Stronger answers</span></div></div></section><details class="advanced tier-panel" id="advanced-settings">',
      `<div class="range-ends"><span>Faster</span><span>Stronger answers</span></div>${prioritySteps}</div></section><details class="advanced tier-panel" id="advanced-settings">`,
      `${rel} priority control`
    );
  }

  html = html.replace('<label for="context-input">Text limit</label>', '<label for="context-input">Context length</label>');
  html = html.replace('Includes prompt, pasted text and reply.', 'How much text the estimate should account for, including prompt, pasted text and reply.');
  html = html.replace('<small class="tier-label">Power user</small>Model controls', '<small class="tier-label">Model filters</small>Model controls');

  // The sandbox mutates these modules at build time, so every deployment gets a fresh URL.
  html = html.replaceAll('./app.js?v=20260929e', `./app.js?v=sandbox-${version}`);
  html = html.replaceAll('./journeys.js?v=20260929e', `./journeys.js?v=sandbox-${version}`);
  html = html.replaceAll('./copy-tune.js?v=20260929a', `./copy-tune.js?v=sandbox-${version}`);

  // The production snapshot preloads journeys.js but does not execute it directly.
  // Explicit execution makes Find / Improve / Upgrade deterministic on a clean sandbox origin.
  if (!html.includes('src="./journeys.js')) {
    html = replaceRequired(
      html,
      `<script type="module" src="./app.js?v=sandbox-${version}"></script><script type="module" src="./copy-tune.js?v=sandbox-${version}"></script>`,
      `<script type="module" src="./app.js?v=sandbox-${version}"></script><script type="module" src="./journeys.js?v=sandbox-${version}"></script><script type="module" src="./copy-tune.js?v=sandbox-${version}"></script>`,
      `${rel} journey module execution`
    );
  }

  write(rel, html);
}

let app = read('dist/app.js');
app = replaceRequired(
  app,
  "const url = new URL('/', window.location.origin);",
  "const url = new URL('/local-llm-finder-sandbox/', window.location.origin);",
  'sandbox share URL'
);
app = app.replaceAll("'Needs exact GPU'", "'Select your GPU to estimate speed'");
app = app.replaceAll('#1 choice', 'Top match for your settings');
app = app.replaceAll('<span class="detail-label">Text limit</span>', '<span class="detail-label">Model context limit</span>');
app = replaceRequired(
  app,
  '<div class="model-details"><p>${why} ${speedText}</p><div class="detail-grid">',
  '<div class="model-details"><p>${why} ${speedText}</p><p class="estimate-context">Context used for this estimate: ${(Number(form.elements.context.value) * 1000).toLocaleString(\'en-US\')} tokens.</p><div class="detail-grid">',
  'result estimate-context copy'
);
app = replaceRequired(
  app,
  '<small>${parameterText(model.parametersB)} parameters · ${quant.name}${slower ? \' · Below speed target\' : unknown ? \' · Speed not estimated\' : \'\'}</small>',
  '<small>${fitLabel(quality)} ${taskShortNames[primaryUse]} fit · ${parameterText(model.parametersB)} parameters · ${quant.name}${slower ? \' · Below speed target\' : unknown ? \' · Speed not estimated\' : \'\'}</small>',
  'collapsed result reason'
);
write('dist/app.js', app);

let journeys = read('dist/journeys.js');
journeys = replaceRequired(
  journeys,
  "hero.insertAdjacentHTML('afterend',",
  "if (!document.querySelector('.journey-nav')) hero.insertAdjacentHTML('afterend',",
  'journey static-nav guard'
);
journeys = journeys.replaceAll('<div class="journey-options">', '<div class="journey-options" role="tablist" aria-label="Finder mode">');
journeys = journeys.replace('class="journey-option" data-journey="find" aria-pressed="true"', 'class="journey-option" data-journey="find" role="tab" aria-pressed="true" aria-selected="true"');
journeys = journeys.replace('class="journey-option" data-journey="improve" aria-pressed="false"', 'class="journey-option" data-journey="improve" role="tab" aria-pressed="false" aria-selected="false"');
journeys = journeys.replace('class="journey-option" data-journey="upgrade" aria-pressed="false"', 'class="journey-option" data-journey="upgrade" role="tab" aria-pressed="false" aria-selected="false"');
journeys = journeys.replaceAll("new URL('/', location.origin)", "new URL('/local-llm-finder-sandbox/', location.origin)");
journeys = journeys.replaceAll("'Needs exact GPU'", "'Select your GPU to estimate speed'");
journeys = journeys.replaceAll('<dt>Context</dt>', '<dt>Model context limit</dt>');
journeys = journeys.replace('<span class="results-note">Capacity estimate</span>', '<span class="results-note">Capacity comparison</span>');
journeys = replaceRequired(
  journeys,
  "buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.journey === active)));",
  "buttons.forEach(b => { const selected = b.dataset.journey === active; b.setAttribute('aria-pressed', String(selected)); b.setAttribute('aria-selected', String(selected)); });",
  'journey tab semantics'
);
write('dist/journeys.js', journeys);

let copyTune = read('dist/copy-tune.js');
const enhancedPriority = `function enhancePriority() {
  const input = document.querySelector('#priority-input');
  const control = input?.closest('.priority-control');
  if (!input || !control) return;

  let steps = control.querySelector('.priority-steps');
  if (!steps) {
    steps = document.createElement('div');
    steps.className = 'priority-steps';
    steps.setAttribute('role', 'group');
    steps.setAttribute('aria-label', 'Speed versus quality priority');
    steps.innerHTML = PRIORITY_LABELS.map((label, index) =>
      \`<button type="button" class="priority-step" data-priority="\${index + 1}" aria-pressed="false">\${label}</button>\`
    ).join('');
    control.append(steps);
  }

  if (!steps.dataset.priorityClick) {
    steps.addEventListener('click', event => {
      const button = event.target.closest('[data-priority]');
      if (!button) return;
      input.value = button.dataset.priority;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    steps.dataset.priorityClick = 'true';
  }

  control.classList.add('priority-enhanced');
  const sync = () => {
    const value = Number(input.value);
    for (const button of control.querySelectorAll('[data-priority]')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.priority) === value));
    }
  };
  if (!input.dataset.prioritySync) {
    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
    input.dataset.prioritySync = 'true';
  }
  sync();
}`;
const priorityFunction = /function enhancePriority\(\) \{[\s\S]*?\n\}\n\nfunction syncSpeedSummary/;
if (!priorityFunction.test(copyTune)) throw new Error('Sandbox transform could not replace enhancePriority');
copyTune = copyTune.replace(priorityFunction, `${enhancedPriority}\n\nfunction syncSpeedSummary`);
write('dist/copy-tune.js', copyTune);

console.log('Sandbox build-time UI refinement applied.');
