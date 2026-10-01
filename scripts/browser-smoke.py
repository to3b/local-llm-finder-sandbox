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
    wait.until(lambda d: len(d.find_elements(By.ID, 'improve-results')) == 1 and len(d.find_elements(By.ID, 'upgrade-results')) == 1)

    assert len(driver.find_elements(By.CSS_SELECTOR, '.journey-nav')) == 1
    assert len(driver.find_elements(By.CSS_SELECTOR, '.priority-step')) == 5
    assert len(driver.find_elements(By.CSS_SELECTOR, '.stage-index')) == 3
    assert len(driver.find_elements(By.ID, 'improve-results')) == 1
    assert len(driver.find_elements(By.ID, 'upgrade-results')) == 1

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
    assert len(driver.find_elements(By.ID, 'improve-results')) == 1

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
    assert len(driver.find_elements(By.ID, 'upgrade-results')) == 1

    find = driver.find_element(By.CSS_SELECTOR, '[data-journey="find"]')
    find.click()
    wait.until(lambda d: visible('#results'))
    assert find.get_attribute('aria-selected') == 'true'

    # Rapid interactions should settle, stay responsive and never duplicate enhanced controls or journey views.
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
    assert len(driver.find_elements(By.ID, 'improve-results')) == 1
    assert len(driver.find_elements(By.ID, 'upgrade-results')) == 1
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

    # Shared speed floors must survive startup enhancement (previously 10/15 reset to 1).
    driver.get(url + '#d=gpu&g=rtx-3060&t=coding&p=3&c=8&r=32&s=15')
    wait.until(lambda d: d.find_elements(By.ID, 'speed-choice'))
    wait.until(lambda d: d.find_element(By.ID, 'speed-input').get_attribute('value') == '15')
    assert driver.find_element(By.ID, 'speed-input').get_attribute('value') == '15'
    assert driver.find_element(By.ID, 'speed-choice').get_attribute('value') == '15'

    # Hardware-aware availability copy is shared by shortlist and comparison views.
    js_click(driver.find_element(By.CSS_SELECTOR, 'input[name="device"][value="mac"]'))
    wait.until(lambda d: 'Mac speed not estimated' in d.find_element(By.ID, 'results-content').text)
    assert 'Needs exact GPU' not in driver.find_element(By.ID, 'results-content').text
    assert not driver.find_elements(By.CSS_SELECTOR, '#results-content .metric.speed')
    js_click(driver.find_element(By.CSS_SELECTOR, '[data-journey="improve"]'))
    current = driver.find_element(By.ID, 'current-model')
    current.clear(); current.send_keys('Qwen3 8B')
    wait.until(lambda d: 'Mac speed not estimated' in d.find_element(By.ID, 'improve-content').text)

    # Accessible tabs support keyboard navigation and a single tab stop.
    tab = driver.find_element(By.CSS_SELECTOR, '[data-journey="improve"]')
    from selenium.webdriver.common.keys import Keys
    tab.send_keys(Keys.ARROW_RIGHT)
    wait.until(lambda d: visible('#upgrade-results'))
    assert len(driver.find_elements(By.CSS_SELECTOR, '.journey-option[tabindex="0"]')) == 1

    import os
    os.makedirs('browser-evidence', exist_ok=True)
    # Actual viewport widths, including mobile layouts and long model names.
    for width in [360, 390, 768, 1280]:
        driver.set_window_size(width, 1000)
        driver.get(url + '#d=gpu&g=rtx-3060&t=coding&p=3&c=8&r=32&s=1')
        wait.until(lambda d: d.find_elements(By.CSS_SELECTOR, '#results-content .model-row'))
        assert driver.execute_script('return document.documentElement.scrollWidth <= innerWidth'), f'Finder overflow at {width}'
        assert all(link.is_displayed() for link in driver.find_elements(By.CSS_SELECTOR, '.site-nav a')), f'Hidden Finder navigation at {width}'
        assert driver.execute_script("return getComputedStyle(document.body).backgroundImage") == 'none'
        assert driver.execute_script("return getComputedStyle(document.querySelector('.metric.speed')).display") != 'none'
        reference = wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '[data-reference-id="model-11"] a'))
        assert '/knowledge-preview/models/qwen2-5-coder-14b/' in reference.get_attribute('href')
        hardware_reference = wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '.hardware-reference a'))
        assert '/knowledge-preview/hardware/rtx-3060-12gb/' in hardware_reference.get_attribute('href')
        draft_reference = wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '[data-reference-id="model-10"] a'))
        assert '/knowledge-preview/models/qwen2-5-coder-7b/' in draft_reference.get_attribute('href')
        assert '(draft)' in draft_reference.text
        driver.save_screenshot(f'browser-evidence/finder-{width}.png')
        driver.execute_script('window.scrollTo(0, document.body.scrollHeight)')
        driver.save_screenshot(f'browser-evidence/finder-footer-{width}.png')
        driver.execute_script('window.scrollTo(0, 0)')
        # All three journeys remain usable and mutually exclusive at every width.
        for mode in ['improve', 'upgrade', 'find']:
            driver.find_element(By.CSS_SELECTOR, f'[data-journey="{mode}"]').click()
            panel = '#results' if mode == 'find' else f'#{mode}-results'
            wait.until(lambda d, selector=panel: visible(selector))
            assert len(driver.find_elements(By.CSS_SELECTOR, '.journey-option[aria-selected="true"]')) == 1
        # Search empty-state and recovery.
        # Journey rendering can replace the catalogue after its panel becomes visible.
        from selenium.common.exceptions import StaleElementReferenceException, NoSuchElementException
        def open_catalog(d):
            try:
                catalog = d.find_element(By.CSS_SELECTOR, '.catalog')
                if catalog.get_attribute('open') is not None:
                    return True
                catalog.find_element(By.CSS_SELECTOR, 'summary').click()
                return False
            except (StaleElementReferenceException, NoSuchElementException):
                return False
        wait.until(open_catalog)
        search = driver.find_element(By.ID, 'catalog-search')
        search.send_keys('zzzz-no-model')
        wait.until(lambda d: 'No matches for' in d.find_element(By.ID, 'catalog-count').text)
        search.clear(); search.send_keys('Qwen')
        wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, '.catalog-list .model-row')) > 0)
        article_keys = ['models/qwen3-8b', 'models/qwen2-5-coder-14b', 'models/gpt-oss-20b', 'hardware/rtx-3060-12gb', 'guides/q4-vs-q5', 'guides/context-length', 'models/qwen2-5-coder-7b', 'models/glm-4-5-air', 'hardware/rtx-4090']
        for page in ['knowledge.html', 'dist/methodology.html', 'dist/privacy.html', 'dist/terms.html', 'knowledge-preview/'] + ['knowledge-preview/' + key + '/' for key in article_keys]:
            driver.get(url + page)
            wait.until(lambda d: d.find_elements(By.CSS_SELECTOR, '.site-topbar'))
            assert driver.execute_script('return document.documentElement.scrollWidth <= innerWidth'), f'{page} overflow at {width}'
            nav = driver.find_elements(By.CSS_SELECTOR, '.site-nav a')
            assert all(link.is_displayed() for link in nav), f'Hidden navigation on {page} at {width}'
            assert all('/local-llm-finder-sandbox/' in link.get_attribute('href') for link in nav), f'Navigation escapes sandbox on {page}'
            assert driver.execute_script("return [...document.querySelectorAll('link[rel=stylesheet]')].every(link => link.sheet !== null)"), f'Missing stylesheet on {page}'
            assert driver.execute_script("return [...document.querySelectorAll('.preview-card, .doc-summary-card, .doc-callout')].every(el => getComputedStyle(el).borderRadius === '0px')"), f'Rounded panel on {page}'
            if page == 'knowledge.html':
                driver.save_screenshot(f'browser-evidence/knowledge-legacy-{width}.png')
            if page == 'knowledge-preview/':
                Select(driver.find_element(By.ID, 'reference-status')).select_by_value('Published')
                driver.find_element(By.ID, 'reference-search').send_keys('nothing-matches-this')
                assert 'No matching references' in driver.find_element(By.ID, 'reference-search-status').text
                driver.find_element(By.ID, 'reference-search').send_keys(Keys.CONTROL, 'a')
                driver.find_element(By.ID, 'reference-search').send_keys(Keys.BACKSPACE)
                driver.find_element(By.ID, 'reference-search').send_keys('Qwen')
                assert '2 matching references' in driver.find_element(By.ID, 'reference-search-status').text
                driver.find_element(By.ID, 'reference-search').send_keys(Keys.CONTROL, 'a')
                driver.find_element(By.ID, 'reference-search').send_keys(Keys.BACKSPACE)
                driver.find_element(By.ID, 'reference-search').send_keys('MXFP4')
                assert '1 matching reference' in driver.find_element(By.ID, 'reference-search-status').text
                driver.find_element(By.ID, 'reference-search').send_keys(Keys.CONTROL, 'a')
                driver.find_element(By.ID, 'reference-search').send_keys(Keys.BACKSPACE)
                Select(driver.find_element(By.ID, 'reference-status')).select_by_value('Draft')
                assert '274 matching references' in driver.find_element(By.ID, 'reference-search-status').text
                driver.find_element(By.ID, 'reference-search').send_keys('RTX 4090')
                assert '1 matching reference' in driver.find_element(By.ID, 'reference-search-status').text
                assert '(1)' in driver.find_element(By.CSS_SELECTOR, '#hardware .reference-count').text
                Select(driver.find_element(By.ID, 'reference-status')).select_by_value('Published')
                assert 'No matching references' in driver.find_element(By.ID, 'reference-search-status').text
                driver.find_element(By.ID, 'reference-search').send_keys(Keys.CONTROL, 'a')
                driver.find_element(By.ID, 'reference-search').send_keys(Keys.BACKSPACE)
                wait.until(lambda d: '6 matching references' in d.find_element(By.ID, 'reference-search-status').text)
            if any('/' + directory + '/' in page for directory in ['models', 'hardware', 'guides']):
                assert driver.find_elements(By.CSS_SELECTOR, '.article-contents a')
                assert driver.find_elements(By.CSS_SELECTOR, '.article-sources a')
                assert driver.find_elements(By.XPATH, '//h2[text()="Related references"]')
                if page.endswith(tuple(key + '/' for key in ['models/qwen2-5-coder-7b', 'models/glm-4-5-air', 'hardware/rtx-4090'])):
                    assert driver.find_elements(By.CSS_SELECTOR, '.draft-notice')
                    edit = driver.find_element(By.CSS_SELECTOR, '.draft-notice a')
                    assert 'gid=323200577' in edit.get_attribute('href') and 'range=A' in edit.get_attribute('href')
                    assert not driver.find_elements(By.CSS_SELECTOR, 'script[type="application/ld+json"]')
                else:
                    assert driver.find_elements(By.XPATH, '//h2[text()="Referenced by"]')
                assert driver.find_element(By.CSS_SELECTOR, 'meta[name="robots"]').get_attribute('content') == 'noindex,nofollow'
                assert driver.execute_script("return [...document.querySelectorAll('.article-contents a')].every(a => document.querySelector(a.getAttribute('href')) !== null)"), f'Broken heading link on {page}'
                assert '[[' not in driver.find_element(By.CSS_SELECTOR, '.article-body').text, f'Unresolved wiki link on {page}'
                driver.save_screenshot(f'browser-evidence/article-{page.strip("/").replace("/", "-")}-{width}.png')
        driver.save_screenshot(f'browser-evidence/knowledge-{width}.png')

    # New entity mappings must appear in real comparison results, including an MoE model.
    for name, entity_id, slug in [('Qwen3 8B', 'model-7', 'qwen3-8b'), ('gpt-oss-20b', 'extra-gpt-oss-20b', 'gpt-oss-20b')]:
        driver.get(url + '#d=mac&m=32&t=coding&j=improve')
        wait.until(lambda d: visible('#improve-results'))
        current = driver.find_element(By.ID, 'current-model')
        current.clear(); current.send_keys(name)
        reference = wait.until(lambda d: d.find_element(By.CSS_SELECTOR, f'#improve-content [data-reference-id="{entity_id}"] a'))
        assert f'/knowledge-preview/models/{slug}/' in reference.get_attribute('href')

    # A large draft model with a dotted ID is discoverable in the full catalogue,
    # even when it is not a recommendation for the selected hardware.
    driver.get(url + '#d=mac&m=128&t=coding&j=find')
    wait.until(lambda d: d.find_elements(By.CSS_SELECTOR, '.catalog'))
    wait.until(open_catalog)
    driver.find_element(By.ID, 'catalog-search').send_keys('GLM-4.5-Air')
    draft = wait.until(lambda d: d.find_element(By.CSS_SELECTOR, '.catalog-list [data-reference-id="extra-glm-4.5-air"] a'))
    assert '/knowledge-preview/models/glm-4-5-air/' in draft.get_attribute('href')
    assert '(draft)' in draft.text

    severe = []
    for entry in driver.get_log('browser'):
        message = entry.get('message', '')
        if any(token in message for token in ['Uncaught', 'TypeError', 'ReferenceError', 'RangeError', 'Maximum call stack']):
            severe.append(message)
    assert not severe, 'Browser console errors: ' + ' | '.join(severe)

    print('Headless browser smoke test passed: single journey views, first-paint controls, consistent selection states, top-match rationale, rapid interactions, expansion and sandbox URLs are stable.')
finally:
    driver.quit()
