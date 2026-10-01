"""Contribution UI regressions. Service writes are isolated with explicit response fixtures."""
import json,sys
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait

base=sys.argv[1]
options=webdriver.ChromeOptions()
for arg in ('--headless=new','--no-sandbox','--disable-dev-shm-usage','--window-size=1280,1100'):options.add_argument(arg)
driver=webdriver.Chrome(options=options);driver.set_page_load_timeout(30);wait=WebDriverWait(driver,15)
evidence=Path('browser-evidence');evidence.mkdir(exist_ok=True)

def get(path):
    driver.get(base+path);wait.until(lambda d:d.find_elements(By.TAG_NAME,'main'))

def fixture(mode='success',reports=None):
    driver.execute_script('''
    const original=window.fetch.bind(window);window.testRequests=[];window.testMode=arguments[0];const reports=arguments[1];
    window.fetch=async (input,opts={})=>{
      const url=String(input);
      if(url.endsWith('/api/submissions')){window.testRequests.push(JSON.parse(opts.body));return new Response(JSON.stringify(window.testMode==='fail'?{error:'Temporary test-storage failure'}:{id:window.testRequests.at(-1).id,status:'pending'}),{status:window.testMode==='fail'?503:201,headers:{'Content-Type':'application/json'}});}
      if(url.endsWith('/api/results'))return new Response(JSON.stringify({reports,candidates:[],automaticApplication:false}),{headers:{'Content-Type':'application/json'}});
      return original(input,opts);
    };''',mode,reports or [])

try:
    get('knowledge-preview/models/qwen3-8b/')
    assert not driver.find_elements(By.CSS_SELECTOR,'nav[aria-label="Site"] a[href*="/tests/"]')
    assert not driver.find_element(By.CSS_SELECTOR,'.article-contents').get_attribute('open')
    sources=driver.find_element(By.CSS_SELECTOR,'.article-sources')
    assert sources.tag_name=='details' and not sources.get_attribute('open')
    driver.find_element(By.CSS_SELECTOR,'.article-contents > summary').click()
    driver.find_element(By.CSS_SELECTOR,'.article-contents a[href="#'+sources.get_attribute('id')+'"]').click()
    wait.until(lambda d:d.find_element(By.CSS_SELECTOR,'.article-sources').get_attribute('open'))
    assert not driver.find_element(By.CSS_SELECTOR,'.article-contents').get_attribute('open')
    invite=driver.find_element(By.CSS_SELECTOR,'.article-test-invite')
    assert 'Have you tried this LLM?' in invite.text
    invite.find_element(By.TAG_NAME,'a').click()
    wait.until(lambda d:d.find_elements(By.ID,'test-form'))
    assert 'model=model-7' in driver.current_url and 'from=models%2Fqwen3-8b' in driver.current_url
    wait.until(lambda d:'Qwen3' in d.find_element(By.ID,'model').get_attribute('value'))
    assert driver.find_element(By.ID,'hardware').get_attribute('value')==''
    hardware=json.loads(Path('site/tests/catalogue.json').read_text())['hardware']
    driver.find_element(By.ID,'hardware').send_keys(next(x['name'] for x in hardware if x['id']=='rtx-3060'))
    assert driver.find_element(By.ID,'article-return').is_displayed()
    assert driver.find_element(By.ID,'contextTokens').get_attribute('value')=='','Planner context must not be presented as an actual tested setting'
    assert not driver.find_element(By.ID,'extra-details').get_attribute('open')
    driver.find_element(By.CSS_SELECTOR,'#test-guide > summary').click()
    wait.until(lambda d:d.find_element(By.ID,'test-guide').get_attribute('open'))
    assert len(driver.find_elements(By.CSS_SELECTOR,'.baseline-prompt'))==1
    assert driver.find_element(By.ID,'test-guide').find_element(By.XPATH,'..').get_attribute('id')=='test-form'
    assert not driver.find_elements(By.CSS_SELECTOR,'.test-nav')
    scenario=driver.find_element(By.ID,'testScenario')
    from selenium.webdriver.support.ui import Select
    Select(scenario).select_by_value('baseline-code-v1')
    assert 'Python function' in driver.find_element(By.CSS_SELECTOR,'.baseline-prompt blockquote').text
    Select(scenario).select_by_value('custom')
    assert not driver.find_elements(By.CSS_SELECTOR,'.baseline-prompt')
    Select(scenario).select_by_value('baseline-writing-v1')
    driver.find_element(By.CSS_SELECTOR,'.baseline-prompt button').click()
    assert driver.find_element(By.ID,'testScenario').get_attribute('value')=='baseline-writing-v1'
    assert not driver.find_elements(By.CSS_SELECTOR,'[name="response"],[name="reply"],[name="answer"]')
    fixture('fail')
    driver.find_element(By.ID,'submit-test').click()
    wait.until(lambda d:d.find_element(By.ID,'form-error').is_displayed())
    assert 'Choose how' in driver.find_element(By.ID,'form-error').text
    driver.find_element(By.CSS_SELECTOR,'input[value="runs"]').click()
    driver.find_element(By.CSS_SELECTOR,'.import-panel summary').click()
    driver.find_element(By.ID,'test-output').send_keys('prompt eval rate: 900 tokens/s\neval rate: 24.5 tokens/s\nPRIVATE PROMPT AND /private/path')
    driver.find_element(By.ID,'read-output').click()
    assert driver.find_element(By.ID,'generationTps').get_attribute('value')=='24.5'
    driver.find_element(By.ID,'submit-test').click()
    wait.until(lambda d:'Temporary test-storage failure' in d.find_element(By.ID,'form-error').text)
    assert driver.find_element(By.ID,'hardware').get_attribute('value')
    assert driver.find_element(By.ID,'submit-test').is_enabled()
    driver.execute_script("window.testMode='success'")
    driver.find_element(By.ID,'submit-test').click()
    wait.until(lambda d:d.find_element(By.ID,'success').is_displayed())
    sent=driver.execute_script('return window.testRequests.at(-1)')
    assert sent['generationTps']==24.5 and sent['hardwareId']=='rtx-3060'
    assert 'PRIVATE' not in json.dumps(sent) and 'rawLog' not in sent
    assert sent['calibrationEligible'] is False
    assert sent['testScenario']=='baseline-writing-v1'
    assert 'Awaiting review' in driver.find_element(By.ID,'success').text
    driver.save_screenshot(str(evidence/'community-saved.png'))
    driver.find_element(By.ID,'another').click()
    assert driver.find_element(By.ID,'hardware').get_attribute('value')==''
    driver.find_element(By.ID,'hardware').send_keys('Test computer')
    driver.find_element(By.ID,'model').send_keys('Test model')
    driver.find_element(By.CSS_SELECTOR,'input[value="unable"]').click()
    assert not driver.find_element(By.ID,'speed-entry').is_displayed()
    driver.find_element(By.ID,'submit-test').click()
    wait.until(lambda d:d.find_element(By.ID,'success').is_displayed())
    assert driver.execute_script('return window.testRequests.at(-1).generationTps') is None

    for width in (360,390,768,1280):
        driver.set_window_size(width,1000)
        get('tests/?hardware=rtx-3060&model=model-10')
        wait.until(lambda d:d.find_element(By.ID,'hardware').get_attribute('value'))
        assert driver.execute_script('return document.documentElement.scrollWidth<=innerWidth'),f'Overflow at {width}px'
        driver.save_screenshot(str(evidence/f'community-form-{width}.png'))
        assert driver.find_element(By.ID,'submit-test').is_displayed()

    # Install result fixtures before its initial fetch.
    script='''const original=window.fetch.bind(window);window.fetch=async(input,opts)=>String(input).endsWith('/api/results')?new Response(JSON.stringify({reports:[],candidates:[]}),{headers:{'Content-Type':'application/json'}}):original(input,opts);'''
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument',{'source':script})
    get('tests/results.html')
    wait.until(lambda d:'0 reviewed reports' in d.find_element(By.ID,'results-count').text)
    assert 'first reviewed results' in driver.find_element(By.ID,'reviewed-results').text
    assert driver.execute_script('return document.documentElement.scrollWidth<=innerWidth')
    driver.save_screenshot(str(evidence/'community-results-empty.png'))
    get('knowledge-preview/hardware/rtx-3060-12gb/')
    driver.find_element(By.CSS_SELECTOR,'.article-test-invite a').click()
    wait.until(lambda d:'3060' in d.find_element(By.ID,'hardware').get_attribute('value'))
    assert 'hardware=rtx-3060' in driver.current_url
    assert driver.find_element(By.ID,'model').get_attribute('value')==''
    get('knowledge-preview/models/qwen3-14b/#section-3')
    wait.until(lambda d:d.find_element(By.CSS_SELECTOR,'.editor-checklist').get_attribute('open'))
    get('knowledge-preview/')
    assert len(driver.find_elements(By.CSS_SELECTOR,'[data-reference-search]'))==280
    assert not driver.find_elements(By.CSS_SELECTOR,'.reference-list li p')
    driver.find_element(By.ID,'reference-search').send_keys('Qwen3 8B')
    wait.until(lambda d:'matching' in d.find_element(By.ID,'reference-search-status').text)
    assert any('Qwen3 8B' in x.text for x in driver.find_elements(By.CSS_SELECTOR,'[data-reference-search]:not([hidden])'))
    print('Community browser checks passed: article prefill, baseline prompts, minimal required input, pasted-speed privacy, failure/retry, durable-receipt UI, no-load reports, empty results and responsive layouts.')
finally:driver.quit()
