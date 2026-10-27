"""Android Expo Go demo walkthrough; never submits a sale or changes real records."""
import json, os, re, subprocess, time, xml.etree.ElementTree as ET
ADB=os.environ.get('ADB','/tmp/inventory-android-sdk/platform-tools/adb')
OUT='artifacts/qa/operational-ui'
def run(*args): return subprocess.check_output([ADB,*args],text=True)
def nodes():
 run('shell','uiautomator','dump','/sdcard/interaction-ui.xml')
 return list(ET.fromstring(run('shell','cat','/sdcard/interaction-ui.xml')).iter('node'))
def matches(label):
 found=[]
 for n in nodes():
  a=n.attrib; b=list(map(int,re.findall(r'-?\d+',a['bounds'])))
  if (a.get('text')==label or a.get('content-desc')==label) and b[2]>b[0] and b[3]>b[1] and b[1]>=0 and b[3]<=2340:
   found.append((a,b))
 return sorted(found,key=lambda r:r[0].get('content-desc')!=label)
def tap(label,scroll=False):
 for _ in range(8 if scroll else 3):
  found=matches(label)
  if found:
   a,b=found[0]; assert a.get('enabled')!='false',label+' disabled'
   run('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2));time.sleep(.35);return
  if scroll:run('shell','input','swipe','550','1840','550','1000','350')
  else:time.sleep(.6)
 raise RuntimeError('Not visible: '+label)
def text():return '\n'.join(n.attrib.get('text','')+' '+n.attrib.get('content-desc','') for n in nodes())
def shot(name):
 with open(OUT+'/'+name+'.png','wb') as f:subprocess.run([ADB,'exec-out','screencap','-p'],stdout=f,check=True)
def type_value(value):run('shell','input','text',value.replace(' ','%s'))
def go(tab, expected):
 for _ in range(3):
  tap(tab);time.sleep(1)
  if expected in text():return
 raise RuntimeError('Navigation did not open: '+expected)

run('reverse','tcp:8089','tcp:8089')
run('shell','am','force-stop','host.exp.exponent')
time.sleep(1)
run('shell','am','start','-W','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8089')
for attempt in range(45):
 if attempt==4:run('shell','am','start','-W','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8089')
 if matches('Account email'):break
 if matches('Open profile menu'):
  tap('Open profile menu');tap('Sign out',scroll=True)
 elif matches('Sign out'):tap('Sign out',scroll=True)
 time.sleep(1)
accounts=[('superadmin','Platform overview'),('admin','Welcome back'),('manager','Welcome back'),('cashier','Point of sale'),('inventory','Your workspace is ready'),('accountant','Your workspace is ready'),('viewer','Your workspace is ready')]
results=[]
for account, expected in accounts:
 tap('Account email');type_value(account+'@inv.com');tap('Password');type_value('asdF@123');tap('Continue')
 for attempt in range(15):
  content=text()
  if expected in content and 'Account email' not in content:break
  time.sleep(1)
 assert expected in content,(account,content)
 assert 'Forbidden' not in content,(account,content)
 shot('android-'+account)
 tap('More');time.sleep(1)
 content=text();assert 'Search pages and records' in content
 shot('android-'+account+'-sections')
 tap('Open profile menu');tap('Sign out',scroll=True)
 for attempt in range(10):
  if matches('Account email'):break
  time.sleep(.5)
 assert matches('Account email'),account+' did not log out'
 results.append({'account':account,'landing':expected,'checks':['real API login','role landing','section navigation','logout']})
 with open(OUT+'/android-roles.json','w') as f:json.dump(results,f,indent=2)
 print(account+' passed',flush=True)
