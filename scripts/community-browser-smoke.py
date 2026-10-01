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
    get('#d=gpu&g=rtx-3060&v=12&t=coding&r=32')
    wait.until(lambda d:d.find_elements(By.CSS_SELECTOR,'.model-row'))
    row=driver.find_element(By.CSS_SELECTOR,'.model-row');row.find_element(By.TAG_NAME,'summary').click()
    share=row.find_element(By.CSS_SELECTOR,'[data-share-test]');model_id=share.get_attribute('data-share-test');share.click()
    wait.until(lambda d:d.find_elements(By.ID,'test-form'))
    assert 'hardware=rtx-3060' in driver.current_url and 'model='+model_id in driver.current_url
    wait.until(lambda d:'3060' in d.find_element(By.ID,'hardware').get_attribute('value'))
    assert driver.find_element(By.ID,'model').get_attribute('value')
    assert driver.find_element(By.ID,'contextTokens').get_attribute('value')=='','Planner context must not be presented as an actual tested setting'
    assert not driver.find_element(By.ID,'extra-details').get_attribute('open')
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
    print('Community browser checks passed: Finder prefill, minimal required input, pasted-speed privacy, failure/retry, durable-receipt UI, no-load reports, empty results and responsive layouts.')
finally:driver.quit()
