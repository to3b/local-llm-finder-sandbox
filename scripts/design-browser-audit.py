"""Check every deployed sandbox HTML page at desktop and mobile widths."""
import json,sys
from pathlib import Path
from selenium import webdriver

base=sys.argv[1];root=Path(sys.argv[2] if len(sys.argv)>2 else 'site')
files=sorted(p.relative_to(root).as_posix() for p in root.rglob('*.html') if not any(x.startswith('.') or x=='node_modules' for x in p.relative_to(root).parts))
options=webdriver.ChromeOptions()
for arg in ('--headless=new','--no-sandbox','--disable-dev-shm-usage','--window-size=1280,1000'):options.add_argument(arg)
driver=webdriver.Chrome(options=options);driver.set_page_load_timeout(30)
failures=[];checked=0
try:
 for width in (1280,390):
  driver.set_window_size(width,1000)
  for rel in files:
   driver.get(base+rel)
   state=driver.execute_script('''
   const style=getComputedStyle(document.body);
   const rounded=[...document.body.querySelectorAll('*')].filter(e=>e.getClientRects().length && getComputedStyle(e).visibility!=='hidden' && getComputedStyle(e).borderRadius.split(' ').some(v=>parseFloat(v)>0)).slice(0,3).map(e=>e.tagName+'.'+e.className);
   const nav=[...document.querySelectorAll('nav[aria-label="Site"] a')].map(e=>({text:e.textContent.trim(),visible:!!e.getClientRects().length}));
   return {title:document.title,shared:!!document.querySelector('link[data-sandbox-design]'),background:style.backgroundColor,font:style.fontFamily,fontSize:style.fontSize,overflow:document.documentElement.scrollWidth>innerWidth,rounded,nav};''')
   problems=[]
   if not state['title'] or not state['shared']:problems.append('page/shared stylesheet missing')
   if state['background']!='rgb(21, 23, 25)' or state['fontSize']!='16px':problems.append('theme/body typography mismatch')
   if state['overflow']:problems.append('horizontal overflow')
   if state['rounded']:problems.append('rounded visible UI: '+str(state['rounded']))
   if any(x['text']=='Tests' or not x['visible'] for x in state['nav']):problems.append('global navigation mismatch')
   if problems:failures.append({'page':rel,'width':width,'problems':problems})
   checked+=1
 evidence=Path('browser-evidence');evidence.mkdir(exist_ok=True)
 for rel,name,width in [('knowledge-preview/models/qwen3-8b/index.html','article-context',1280),('tests/index.html?model=model-7&from=models%2Fqwen3-8b','square-test-form',1280),('tests/index.html?model=model-7','square-test-form-mobile',390)]:
  driver.set_window_size(width,1000);driver.get(base+rel);driver.save_screenshot(str(evidence/(name+'.png')))
 if failures:raise AssertionError(json.dumps(failures,indent=2))
 print(f'Design browser audit passed: all {len(files)} pages at desktop and mobile ({checked} page views), consistent backdrop/body type, square visible controls, complete navigation and no horizontal overflow.')
finally:driver.quit()
