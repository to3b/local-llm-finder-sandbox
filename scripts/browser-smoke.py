import sys
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select

url = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173/local-llm-finder-sandbox/'

options = webdriver.ChromeOptions()
options.add_argument('--headless=new')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--window-size=1440,1200')
options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(options=options)
driver.set_page_load_timeout(30)
wait = WebDriverWait(driver, 15)


def js_click(element):
    driver.execute_script('arguments[0].click()', element)


def visible(selector):
    return driver.execute_script(
        "const e=document.querySelector(arguments[0]); return !!e && !e.hidden && getComputedStyle(e).display !== 'none';",
        selector,
    )

try:
    driver.get(url)
    wait.until(lambda d: d.find_elements(By.ID, 'finder-form'))
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, '.journey-option')) == 3)

    assert len(driver.find_elements(By.CSS_SELECTOR, '.journey-nav')) == 1
    assert len(driver.find_elements(By.CSS_SELECTOR, '.priority-step')) == 5
    assert len(driver.find_elements(By.CSS_SELECTOR, '.stage-index')) == 3

    # The five-position control must be interactive, not only painted in static HTML.
    for value in [1, 5, 2, 4, 3, 1, 3]:
        button = driver.find_element(By.CSS_SELECTOR, f'.priority-step[data-priority="{value}"]')
        button.click()
        wait.until(lambda d, v=str(value): d.find_element(By.ID, 'priority-input').get_attribute('value') == v)

    # Exercise hardware and task changes repeatedly. This is where the previous render loop surfaced.
    gpu_radio = driver.find_element(By.CSS_SELECTOR, 'input[name="device"][value="gpu"]')
    js_click(gpu_radio)
    wait.until(lambda d: visible('#gpu-fields'))
    Select(driver.find_element(By.ID, 'gpu-vram')).select_by_value('12')
    coding = driver.find_element(By.CSS_SELECTOR, 'input[name="primaryUse"][value="coding"]')
    js_click(coding)
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, '#results-content .model-row')) > 0)

    # Selected states should use one visual language across journey, priority, hardware and task controls.
    selected_backgrounds = driver.execute_script("""
      return [
        '[data-journey="find"][aria-pressed="true"]',
        '.priority-step[aria-pressed="true"]',
        'input[name="device"]:checked + span',
        'input[name="primaryUse"]:checked + span'
      ].map(selector => getComputedStyle(document.querySelector(selector)).backgroundColor);
    """)
    assert len(set(selected_backgrounds)) == 1, f'Inconsistent selected-control backgrounds: {selected_backgrounds}'

    # The top recommendation should explain itself without requiring expansion.
    top_reason = wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '#results-content .top-choice .why-top-match'))
    assert 'Why this match' in top_reason.text
    assert 'coding fit' in top_reason.text
    assert 'ranks highest for Balanced priority' in top_reason.text

    # Advanced and model-filter controls should open without changing the journey or duplicating UI.
    advanced = driver.find_element(By.CSS_SELECTOR, '#advanced-settings > summary')
    advanced.click()
    assert driver.find_element(By.ID, 'advanced-settings').get_attribute('open') is not None
    Select(driver.find_element(By.ID, 'context-input')).select_by_value('16')
    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, '#results-content .model-row')) > 0)

    filters = driver.find_element(By.CSS_SELECTOR, '#power-settings > summary')
    filters.click()
    assert driver.find_element(By.ID, 'power-settings').get_attribute('open') is not None

    # Find / Improve / Upgrade must behave as one mutually-exclusive control.
    improve = driver.find_element(By.CSS_SELECTOR, '[data-journey="improve"]')
    improve.click()
    wait.until(lambda d: visible('#improve-results'))
    assert not visible('#results')
    assert improve.get_attribute('aria-selected') == 'true'

    current = driver.find_element(By.ID, 'current-model')
    current.clear()
    current.send_keys('Qwen3 8B')
    driver.execute_script("arguments[0].dispatchEvent(new Event('input', {bubbles:true}))", current)
    wait.until(lambda d: 'Choose the model you already run.' not in d.find_element(By.ID, 'improve-content').text)

    upgrade = driver.find_element(By.CSS_SELECTOR, '[data-journey="upgrade"]')
    upgrade.click()
    wait.until(lambda d: visible('#upgrade-results'))
    wait.until(lambda d: len(d.find_element(By.ID, 'upgrade-content').text.strip()) > 0)
    assert not visible('#improve-results')
    assert upgrade.get_attribute('aria-selected') == 'true'

    find = driver.find_element(By.CSS_SELECTOR, '[data-journey="find"]')
    find.click()
    wait.until(lambda d: visible('#results'))
    assert find.get_attribute('aria-selected') == 'true'

    # Rapid interactions should settle, stay responsive and never duplicate enhanced controls.
    started = time.monotonic()
    for _ in range(4):
        for value in [1, 2, 3, 4, 5, 3]:
            driver.find_element(By.CSS_SELECTOR, f'.priority-step[data-priority="{value}"]').click()
        improve.click()
        find.click()
    wait.until(lambda d: d.find_element(By.ID, 'priority-input').get_attribute('value') == '3')
    elapsed = time.monotonic() - started
    assert elapsed < 8, f'Interaction burst took too long: {elapsed:.2f}s'
    assert len(driver.find_elements(By.CSS_SELECTOR, '.journey-nav')) == 1
    assert len(driver.find_elements(By.CSS_SELECTOR, '.priority-step')) == 5
    assert len(driver.find_elements(By.CSS_SELECTOR, '#results-content .top-choice .why-top-match')) >= 1

    # Result expansion should still work after the interaction burst.
    first_row = driver.find_element(By.CSS_SELECTOR, '#results-content .model-row')
    first_row.find_element(By.CSS_SELECTOR, 'summary').click()
    wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '#results-content .model-row').get_attribute('open') is not None)
    assert 'Context used for this estimate:' in first_row.text
    assert 'Model context limit' in first_row.text

    # Shared links must not escape to the github.io account root in staging.
    share = driver.find_element(By.ID, 'share-setup')
    share.click()
    wait.until(lambda d: '/local-llm-finder-sandbox/' in d.current_url)
    assert driver.execute_script('return location.pathname') == '/local-llm-finder-sandbox/'

    selected_tabs = driver.find_elements(By.CSS_SELECTOR, '.journey-option[aria-selected="true"]')
    assert len(selected_tabs) == 1

    severe = []
    for entry in driver.get_log('browser'):
        message = entry.get('message', '')
        if any(token in message for token in ['Uncaught', 'TypeError', 'ReferenceError', 'RangeError', 'Maximum call stack']):
            severe.append(message)
    assert not severe, 'Browser console errors: ' + ' | '.join(severe)

    print('Headless browser smoke test passed: first-paint controls, consistent selection states, top-match rationale, rapid interactions, journeys, expansion and sandbox URLs are stable.')
finally:
    driver.quit()
