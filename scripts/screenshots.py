"""Capture demo screenshots of the served build (python playwright + system Chrome)."""
import json, sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4321'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/workspace/philately-passport-shots'
data = json.load(open('/workspace/philately-passport/public/data/locations.json'))['locations']
demo = {l['id']: {'id': l['id'], 'date': '2026-11-0%d' % (1 + i % 9)} for i, l in enumerate(x for x in data if x['district'] in ('Udupi', 'Bengaluru Urban', 'Mysuru'))}
demo = dict(list(demo.items())[:22])
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx = b.new_context(viewport={'width': 412, 'height': 900}, device_scale_factor=2, geolocation={'latitude': 13.34, 'longitude': 74.75}, permissions=['geolocation'])
    ctx.add_init_script(f"localStorage.setItem('pp.visits.v1', JSON.stringify({json.dumps(demo)}))")
    pg = ctx.new_page(); pg.on('console', lambda m: m.type == 'error' and errors.append(m.text)); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + '/'); pg.wait_for_selector('.passport-card'); pg.wait_for_timeout(600)
    pg.screenshot(path=f'{OUT}/1-home-mobile.png', full_page=False)
    pg.goto(BASE + '/map?passport=KA'); pg.wait_for_selector('.leaflet-interactive'); pg.wait_for_timeout(2500)
    pg.screenshot(path=f'{OUT}/2-map-mobile.png')
    pg.goto(BASE + '/passport/KA'); pg.wait_for_selector('.page'); pg.fill('input[type=search]', 'Udupi'); pg.wait_for_timeout(300)
    pg.locator('select').nth(1).select_option('Udupi'); pg.fill('input[type=search]', ''); pg.wait_for_timeout(500)
    pg.evaluate("window.scrollTo(0, 330)"); pg.wait_for_timeout(300)
    pg.screenshot(path=f'{OUT}/3-passport-pages-mobile.png')
    pg.goto(BASE + '/nearby'); pg.click('text=Use my location'); pg.wait_for_selector('pp-location-card'); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/4-near-me-mobile.png')
    first = [l for l in data if l['place'] == 'Kaup Lighthouse'][0]['id']
    pg.goto(BASE + '/location/' + first); pg.wait_for_selector('.sheet'); pg.wait_for_timeout(400)
    pg.screenshot(path=f'{OUT}/5-location-detail-mobile.png')
    d = b.new_context(viewport={'width': 1366, 'height': 860})
    d.add_init_script(f"localStorage.setItem('pp.visits.v1', JSON.stringify({json.dumps(demo)}))")
    dp = d.new_page(); dp.on('pageerror', lambda e: errors.append(str(e)))
    dp.goto(BASE + '/map'); dp.wait_for_selector('.leaflet-interactive'); dp.wait_for_timeout(3000)
    dp.screenshot(path=f'{OUT}/6-map-desktop.png')
    dp.goto(BASE + '/progress'); dp.wait_for_selector('pp-progress-bar'); dp.wait_for_timeout(400)
    dp.screenshot(path=f'{OUT}/7-progress-desktop.png')
    b.close()
print('errors:', errors)
