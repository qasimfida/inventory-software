"""Android Expo Go demo walkthrough; never submits a sale or changes real records."""
import json, os, re, subprocess, time, xml.etree.ElementTree as ET
ADB=os.environ.get('ADB','/tmp/inventory-android-sdk/platform-tools/adb')
OUT='docs/qa/shell-business-directory'
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


run('shell','input','keyevent','KEYCODE_WAKEUP')
run('shell','wm','dismiss-keyguard')
run('reverse','tcp:8089','tcp:8089')
run('shell','am','force-stop','host.exp.exponent');time.sleep(1)
run('shell','am','start','-W','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8089')
for attempt in range(35):
 if matches('Account email'):break
 if matches('Open profile menu'):
  tap('Open profile menu');tap('Sign out',scroll=True)
 if attempt==4:run('shell','am','start','-W','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8089')
 time.sleep(1)
def field(label,value):
 for attempt in range(4):
  tap(label);time.sleep(1)
  if any(n.attrib.get('content-desc')==label and n.attrib.get('focused')=='true' for n in nodes()):break
 else:raise RuntimeError('Field did not focus: '+label)
 type_value(value);time.sleep(.5)
field('Account email','superadmin@inv.com');field('Password','asdF@123')
tap('Continue');time.sleep(3)
tap('↗ View all businesses',scroll=True);time.sleep(1)
assert 'Registered businesses' in text()
shot('android-businesses')
tap('› Show stores & warehouses for Local Development Business',scroll=True);time.sleep(1)
tap('Development Warehouse',scroll=True)
assert 'Location details' in text()
shot('android-business-drawer')
tap('Close location details')

for _ in range(5): run('shell','input','swipe','550','900','550','1850','250')
tap('Businesses grid view');shot('android-business-grid')
tap('Open profile menu');tap('Settings');time.sleep(1)
shot('android-tabs')
tap('Scroll settings tabs right');time.sleep(.5)
shot('android-tabs-scrolled')
tap('Open profile menu');tap('Preferences');shot('android-preferences-popup')
tap('Close menu')
tap('Open profile menu');tap('Sign out',scroll=True)
with open(OUT+'/android-directory-results.json','w') as f:json.dump({'platform':'Android 16 ARM64 / Expo Go','api':'local PostgreSQL API, retained isolated development database','checks':['platform overview directory link','business directory','expand actual stores and warehouses','location drawer','grid view','settings horizontal tab controls','larger preferences panel','logout'],'businessMutations':False},f,indent=2)
print('Android business directory passed')
