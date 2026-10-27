"""Native Expo demo walkthrough. Requires a booted emulator, Expo Go and mock Metro on 8088."""
import json, os, re, shlex, subprocess, time, xml.etree.ElementTree as ET
from pathlib import Path
adb = os.environ.get('ANDROID_ADB', 'adb')
results = json.loads(Path('artifacts/qa/android-matrix.json').read_text())['results'] if os.environ.get('QA_RESUME') == '1' else []
def run(*args):
    return subprocess.check_output([adb, *args], text=True)
def nodes():
    run('shell', 'uiautomator', 'dump', '/sdcard/inventory-shell-qa.xml')
    return list(ET.fromstring(run('shell', 'cat', '/sdcard/inventory-shell-qa.xml')).iter('node'))
def tap(label, items=None, last=False):
    matches = [n for n in (items if items is not None else nodes()) if n.get('content-desc') == label or n.get('text') == label]
    matches.sort(key=lambda n: n.get('content-desc') != label)
    for _ in range(3):
        if matches: break
        time.sleep(0.2)
        matches = [n for n in nodes() if n.get('content-desc') == label or n.get('text') == label]
        matches.sort(key=lambda n: n.get('content-desc') != label)
    if not matches:
        raise RuntimeError('Visible label missing: ' + label)
    point = list(map(int, re.findall(r'\d+', matches[-1 if last else 0].get('bounds'))))
    run('shell', 'input', 'tap', str((point[0]+point[2])//2), str((point[1]+point[3])//2))
def shot(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('wb') as output:
        subprocess.run([adb, 'exec-out', 'screencap', '-p'], stdout=output, check=True)
routes = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {availableRoutes} from './packages/api-client/dist/workspace-navigation.js';import {identitySeed} from './packages/api-client/dist/mock/identity.js';console.log(JSON.stringify(Object.fromEntries(['superadmin','owner','manager','cashier','inventory','accountant','viewer'].map(r=>[r,availableRoutes(identitySeed(0,r).business)]))));"], text=True))
try:
    # Enter a fresh owner demo without credentials or real API calls.
    for _ in range(8):
        items=nodes()
        current=next(n.get('content-desc').split(': ')[1] for n in items if n.get('content-desc','').startswith('Role: '))
        if current == 'superadmin': break
        tap('Role: ' + current,items)
    for role, pages in routes.items():
        for page in pages:
            if any(r['role']==role and r['path']==page['path'] for r in results): continue
            tap('More', last=True)
            tap('Search pages and records')
            run('shell', 'input', 'keycombination', '113', '29')
            run('shell', 'input', 'keyevent', '67')
            query = page['title']
            run('shell', 'input text ' + shlex.quote(query.replace(' ', '%s')))
            tap(page['title'], last=True)
            expected = 'Platform overview' if role == 'superadmin' and page['path'] == '/dashboard' else page['title']
            items = nodes()
            texts = [n.get('text') for n in items if n.get('text')]
            for _ in range(3):
                if expected in texts: break
                time.sleep(0.2)
                texts=[n.get('text') for n in nodes() if n.get('text')]
            if any('operation is not simulated' in t or 'Demonstration service failure' in t for t in texts):
                raise RuntimeError('Unexpected normal-scenario failure: ' + page['path'])
            if expected not in texts:
                raise RuntimeError('Route title missing: ' + page['path'])
            screenshot = Path('artifacts/qa/screens/mobile') / ('android-light-' + role) / (page['path'][1:].replace('/', '-') + '.png')
            shot(screenshot)
            results.append({'role':role, 'path':page['path'], 'screenshot':str(screenshot)})
            Path('artifacts/qa/android-matrix.json').write_text(json.dumps({'results':results}, indent=2)+'\n')
            print(role, page['path'], flush=True)
        if role != 'viewer':
            tap('Role: ' + role)
finally:
    Path('artifacts/qa/android-matrix.json').write_text(json.dumps({'results':results}, indent=2)+'\n')
