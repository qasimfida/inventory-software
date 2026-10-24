import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { developmentPassword } from '../../apps/api/dist/development/fixtures.js';
const origin = 'http://127.0.0.1:3100/api/v1/auth';
let token = '';
async function api(path, method = 'GET', body) {
  const r = await fetch(origin + path, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-inventory-client': 'native',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`API ${path}: ${r.status}`);
  return r.json();
}
const result = await api('/login', 'POST', {
  email: 'cashier@inv.com',
  password: developmentPassword,
});
token = result.token;
const original = (await api('/settings')).preferences;
try {
  await api('/settings', 'PUT', {
    ...original,
    values: { ...original.values, states: 'enhanced' },
  });
  const output = execFileSync(
    'python3',
    [
      '-c',
      `exec(open('tests/manual/android-ui.py').read())
OUT='docs/qa/feedback-sync'
run('shell','input','keyevent','3')
run('shell','am','start','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8090')
time.sleep(4)
fields=[n for n in nodes() if n.attrib.get('class')=='android.widget.EditText' and n.attrib.get('content-desc')=='POS product search']
assert fields, 'POS search missing'
b=list(map(int,re.findall(r'\\d+',fields[0].attrib['bounds'])))
run('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
run('shell','input','keyevent','KEYCODE_MOVE_END')
run('shell','input','keyevent','--longpress','KEYCODE_DEL')
type_value('NO-MATCH-FEEDBACK')
time.sleep(2)
view=text()
assert 'No products match this search.' in view
assert 'Try another name' in view or 'Try another search' in view, view
shot('android-enhanced-empty')
print('Android enhanced empty search title and description verified')
`,
    ],
    { encoding: 'utf8' },
  );
  await writeFile('docs/qa/feedback-sync/android.txt', output);
} finally {
  const latest = (await api('/settings')).preferences;
  await api('/settings', 'PUT', {
    version: latest.version,
    values: { ...latest.values, states: original.values.states },
  });
  await api('/logout', 'POST');
}
