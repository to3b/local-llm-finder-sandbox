import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] || 'site');
const { recommend } = await import(pathToFileURL(path.join(root, 'dist/recommend.js')));
const { GPUs } = await import(pathToFileURL(path.join(root, 'dist/data.js')));
const basePath = process.env.SITE_BASE || '/local-llm-finder-sandbox/';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(root, rel), value);
function replace(text, before, after) {
  if (!text.includes(before)) throw new Error(`Cleanup target missing: ${before.slice(0, 90)}`);
  return text.replace(before, after);
}

// One shared source for unavailable-speed messages in all result views.
write('dist/ui-state.js', `export function speedAvailability(hardware) {
  if (hardware.customMemory) return 'Speed disabled by memory override';
  if (hardware.mode === 'mac') return 'Mac speed not estimated';
  if (hardware.mode === 'unsure') return 'CPU speed not estimated';
  return 'Choose a graphics card for speed estimates';
}\n`);
let app = read('dist/app.js');
app = "import { speedAvailability } from './ui-state.js?v=cleanup-1';\n" + app;
app = app.replace("const speed = unknown ? 'Select your GPU to estimate speed' : `${speedLow}–${speedHigh} tok/s · rough`;", "const speed = unknown ? speedAvailability(hardware) : `${speedLow}–${speedHigh} tok/s`;");
app = app.replace("const speedLabel = unknown ? 'Speed estimate' : 'Speed estimate · rough';", "const speedLabel = 'Estimated speed';");
app = app.replace("unknown ? ' · Speed not estimated' : ''", "''");
app = replace(app, '<span class="metric speed"><span>${speedLabel}</span><strong>${speed}</strong></span>', '${unknown ? \'\' : `<span class="metric speed"><span>${speedLabel}</span><strong>${speed}</strong></span>`}');
app = replace(app, '<details class="model-row ${extra', '<details class="model-row ${unknown ? \'speed-unavailable \' : \'\'}${extra');
// Summary already exposes task fit, memory and speed. Expansion adds context and rationale.
app = replace(app, '<div><span class="detail-label">Task fit</span><strong>${fitLabel(quality)}</strong></div>', '');
app = replace(app, '<div><span class="detail-label">Memory</span><strong>${fmt(requiredGB)} GB estimated</strong></div>', '');
app = replace(app, '<div><span class="detail-label">${speedLabel}</span><strong>${speed}</strong></div>', '');
app = replace(app, "const hardware = { mode, vramGB, ramGB, bandwidthGBs, deviceName, speedKnown, minSpeed };", "const hardware = { mode, vramGB, ramGB, bandwidthGBs, deviceName, speedKnown, minSpeed, customMemory: !!custom };");
app = replace(app, "let html = '';", "let html = `<p class=\"speed-availability\">${hardware.speedKnown ? 'Speed ranges are planning estimates, not benchmarks.' : speedAvailability(hardware) + '.'}</p>`;");
app = replace(app, 'results.querySelector(\'#catalog-count\').textContent = `Showing ${visible.length} of ${matches.length} matching models`;', "results.querySelector('#catalog-count').textContent = matches.length ? `Showing ${visible.length} of ${matches.length} matching models` : `No matches for “${search.value.trim()}”.`;");
app = replace(app, "results.querySelector('.catalog-no-results').hidden = matches.length !== 0;", "results.querySelector('.catalog-no-results').hidden = matches.length !== 0;\n  results.querySelector('.catalog-no-results').textContent = 'Clear the search or try another model or family.';");
app = app.replace('Try a shorter text limit, a looser Power User filter, or more available memory.', 'Try a shorter context, fewer model filters, or more available memory.');
write('dist/app.js', app);

let journeys = "import { speedAvailability } from './ui-state.js?v=cleanup-1';\n" + read('dist/journeys.js');
journeys = journeys.replace("`${item.speedLow}–${item.speedHigh} tok/s · rough` : 'Select your GPU to estimate speed'", "`${item.speedLow}–${item.speedHigh} tok/s` : speedAvailability(hardware)");
journeys = journeys.replace("hardware.speedKnown ? 'Speed estimate · rough' : 'Speed estimate'", "'Estimated speed'");
journeys = replace(journeys, 'hardware: { mode, vramGB, ramGB, bandwidthGBs, speedKnown, deviceName }', 'hardware: { mode, vramGB, ramGB, bandwidthGBs, speedKnown, deviceName, customMemory: !!custom }');
// Real tabs: one keyboard stop, arrow navigation, associated result panels.
journeys = journeys.replaceAll('role="tab" aria-pressed=', 'role="tab" aria-pressed=');
journeys = replace(journeys, "b.setAttribute('aria-selected', String(selected));", "b.setAttribute('aria-selected', String(selected)); b.tabIndex = selected ? 0 : -1;");
journeys = replace(journeys, "buttons.forEach(b => b.addEventListener('click', () => activate(b.dataset.journey)));", `buttons.forEach((b, index) => {
  const panel = b.dataset.journey === 'find' ? findView : b.dataset.journey === 'improve' ? improveView : upgradeView;
  b.id = 'mode-' + b.dataset.journey;
  b.setAttribute('aria-controls', panel.id);
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', b.id);
  b.addEventListener('click', () => activate(b.dataset.journey));
  b.addEventListener('keydown', event => {
    const next = event.key === 'ArrowRight' ? (index + 1) % buttons.length : event.key === 'ArrowLeft' ? (index + buttons.length - 1) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); activate(buttons[next].dataset.journey); buttons[next].focus();
  });
});`);
journeys = journeys.replaceAll(/<span class="decision-kicker">[^<]*<\/span>/g, '');
write('dist/journeys.js', journeys);

// Generate the static example from the actual bundled recommendation engine.
const gpu = GPUs.find(x => x.id === 'rtx-3060');
const sample = recommend({hardware:{mode:'gpu',vramGB:12,ramGB:32,bandwidthGBs:gpu.bandwidthGBs,speedKnown:true},useCases:['coding'],primaryUse:'coding',preference:3,minSpeed:1,contextK:8,quantization:'auto',maxWeightsGB:null,family:null}).matches.slice(0,3);
const fmt = n => Number.isInteger(n) ? String(n) : n.toFixed(1);
const exampleHash = new URLSearchParams({d:'gpu',g:gpu.id,t:'coding',p:'3',c:'8',r:'32',s:'1'});
const table = `<div class="example-table-wrap"><table class="example-table"><caption>Bundled catalogue example · estimated memory and speed</caption><thead><tr><th scope="col">Rank</th><th scope="col">Model</th><th scope="col">Quantization</th><th scope="col">Memory</th><th scope="col">Speed</th></tr></thead><tbody>${sample.map((item,i)=>`<tr><td>${i+1}</td><th scope="row">${item.model.name}</th><td>${item.quant.name}</td><td>${fmt(item.requiredGB)} GB</td><td>${item.speedLow}–${item.speedHigh} tok/s</td></tr>`).join('')}</tbody></table></div><a class="try-setup" href="${basePath}#${exampleHash}">Try this setup →</a>`;
for (const rel of ['index.html','dist/index.html']) {
 let html = read(rel);
 html = html.replace(/<section class="content-section knowledge-preview"[\s\S]*?<\/section>/, '<aside class="knowledge-availability">Model and hardware references are in preparation. <a href="https://knowledge.localllmfinder.com/">Knowledge preview →</a></aside>');
 html = html.replace(/<div class="info-grid">[\s\S]*?<\/div>/, table);
 html = html.replace('the current September 2026 catalogue ranks these three highest.', 'the bundled September 2026 catalogue ranks these three highest. Live catalogue updates may change the shortlist.');
 html = html.replace(' <a href="./methodology.html">Methodology</a> · <a href="./privacy.html">Privacy</a> · <a href="./terms.html">Terms</a></p>', ' <a href="./methodology.html">How estimates work</a></p>');
 // Move the utility action into the results heading without changing element IDs.
 const actions = html.match(/<div class="result-actions">[\s\S]*?<\/div>/)?.[0];
 if (!actions) throw new Error('Missing result actions');
 html = html.replace(actions, '');
 html = replace(html, '<span class="results-note" id="results-note">Catalogue Sep 2026</span>', `<div class="results-tools">${actions}<span class="results-note" id="results-note">Catalogue Sep 2026</span></div>`);
 html = html.replaceAll('>Knowledge</a>', '>Knowledge preview</a>');
 html = html.replace('<div class="tier-start"><small class="tier-label">Basic</small></div>', '');
 html = html.replace('<small class="tier-label">Advanced</small>Tune results', 'Tune results');
 html = html.replace('<small class="tier-label">Model filters</small>Model controls', 'Model filters');
 write(rel,html);
}
for (const rel of ['dist/methodology.html','dist/privacy.html','dist/terms.html','knowledge.html']) {
 let html = read(rel);
 html = replace(html, '</head>', `<link rel="stylesheet" href="${basePath}dist/sandbox-refine.css?v=${process.env.GITHUB_SHA || 'cleanup-2'}"></head>`);
 html = html.replaceAll('href="/knowledge.html"', `href="${basePath}knowledge.html"`);
 html = html.replaceAll('>Knowledge</a>', '>Knowledge preview</a>');
 if (rel.includes('privacy')) html = html.replace('Privacy, without the mystery','Privacy');
 if (rel.includes('terms')) html = html.replace('Use this as a starting point','Terms &amp; disclaimer');
 if (rel.includes('methodology')) html = html.replace('<a href="./methodology.html">Methodology</a>', '<a href="./methodology.html" aria-current="page">Methodology</a>');
 write(rel,html);
}

// Preview the separate Knowledge repository locally, keeping publishing/data contracts intact.
const knowledgeRoot = path.join(root,'knowledge-preview');
if (fs.existsSync(knowledgeRoot)) {
 let html = fs.readFileSync(path.join(knowledgeRoot,'index.html'),'utf8');
 html = html.replaceAll('https://localllmfinder.com/dist/', basePath+'dist/').replaceAll('https://localllmfinder.com/',basePath);
 html = replace(html,'</head>',`<link rel="stylesheet" href="${basePath}dist/sandbox-refine.css?v=${process.env.GITHUB_SHA || 'cleanup-2'}"></head>`);
 html = html.replace('class="knowledge-nav" href="/"',`class="knowledge-nav" href="${basePath}knowledge-preview/"`);
 fs.writeFileSync(path.join(knowledgeRoot,'index.html'),html);
 for (const rel of ['index.html','dist/index.html','dist/methodology.html','dist/privacy.html','dist/terms.html']) {
   write(rel,read(rel).replaceAll('https://knowledge.localllmfinder.com/',basePath+'knowledge-preview/'));
 }
}

// Preserve release checks against the new table and the configured deployment root.
let release = read('tests/release.test.js');
release = replace(release, 'const expected = `<article><span class="step-number">#${rank + 1}</span><h3>${item.model.name}</h3><p>${item.quant.name} · ${fmt(item.requiredGB)} GB estimated memory · ${item.speedLow}–${item.speedHigh} tok/s rough speed · ${fitLabel(item.quality)} coding fit.</p></article>`;', 'const expected = `<tr><td>${rank + 1}</td><th scope="row">${item.model.name}</th><td>${item.quant.name}</td><td>${fmt(item.requiredGB)} GB</td><td>${item.speedLow}–${item.speedHigh} tok/s</td></tr>`;');
if (fs.existsSync(knowledgeRoot)) release = release.replace("const knowledgeUrl = 'https://knowledge.localllmfinder.com/';", `const knowledgeUrl = '${basePath}knowledge-preview/';`);
release = release.split('\n').map(line => line.startsWith('assert.match(files.app, /new URL') ? `assert.ok(files.app.includes('new URL(${JSON.stringify(basePath)}, window.location.origin)'), 'Share links must use the configured site root');` : line.startsWith('assert.match(files.journeys, /new URL') ? `assert.ok(files.journeys.includes('new URL(${JSON.stringify(basePath)}, location.origin)'), 'Journey links must use the configured site root');` : line).join('\n');
write('tests/release.test.js', release);
let share = read('tests/share-state.test.js');
share = share.split('\n').map(line => line.startsWith('assert.match(app, /new URL') ? `assert.ok(app.includes('new URL(${JSON.stringify(basePath)}, window.location.origin)'), 'Shared links must stay at the configured site root');` : line).join('\n');
write('tests/share-state.test.js', share);

// Preserve shared speed floors, including a valid custom floor outside the preset list.
let tuning = read('dist/copy-tune.js');
tuning = replace(tuning, "if (input.value === '15' || input.value === '10' || !input.value) input.value = '1';", "if (!input.value) input.value = '1';");
tuning = replace(tuning, 'select.value = input.value;', `if (![...select.options].some(option => option.value === input.value)) {
    const option = document.createElement('option');
    option.value = input.value; option.textContent = input.value + ' tok/s'; select.append(option);
  }
  select.value = input.value;`);
tuning = replace(tuning, "control.classList.add('priority-enhanced');", "control.classList.add('priority-enhanced');\n  input.tabIndex = -1;");
write('dist/copy-tune.js', tuning);
if (fs.existsSync(knowledgeRoot)) {
 const file = path.join(knowledgeRoot, 'knowledge-data.js');
 let data = fs.readFileSync(file, 'utf8');
 data = replace(data, "return parsed.protocol === 'https:' ? parsed.href : '';", `if (parsed.origin === 'https://localllmfinder.com') return ${JSON.stringify(basePath)} + parsed.pathname.slice(1) + parsed.hash;
    if (parsed.href === 'https://knowledge.localllmfinder.com/') return ${JSON.stringify(basePath+'knowledge-preview/')};
    return parsed.protocol === 'https:' ? parsed.href : '';`);
 fs.writeFileSync(file, data);
}
let restoredApp = read('dist/app.js');
restoredApp += `
// Same-document links and browser Back/Forward must restore the shared controls too.
window.addEventListener('hashchange', () => {
  form.reset(); gpuInput.value = ''; vramInput.value = '';
  gpuSearch.hidden = true; gpuSearchToggle.setAttribute('aria-expanded', 'false');
  gpuSearchToggle.textContent = 'Search by card name';
  applyUrlState(); syncSecondaryTasks();
  lastMode = form.elements.device.value;
  const speedChoice = document.querySelector('#speed-choice');
  if (speedChoice) {
    const value = form.elements.speed.value;
    if (![...speedChoice.options].some(option => option.value === value)) {
      const option = document.createElement('option'); option.value = value; option.textContent = value + ' tok/s'; speedChoice.append(option);
    }
    speedChoice.value = value;
  }
  priorityInput.dispatchEvent(new Event('input', {bubbles:true}));
  const mode = new URLSearchParams(location.hash.slice(1)).get('j') || 'find';
  document.querySelector('[data-journey="' + (['find','improve','upgrade'].includes(mode) ? mode : 'find') + '"]')?.click();
});
`;
write('dist/app.js', restoredApp);
