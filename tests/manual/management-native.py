"""Android Expo Go demo walkthrough; never submits a sale or changes real records."""
import json, os, re, subprocess, time, xml.etree.ElementTree as ET
ADB=os.environ.get('ADB','/tmp/inventory-android-sdk/platform-tools/adb')
OUT='artifacts/qa/management-ux'
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
run('reverse','tcp:8088','tcp:8088')
run('shell','am','force-stop','host.exp.exponent');time.sleep(1)
run('shell','am','start','-W','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8088')
for attempt in range(35):
 if matches('Account email'):break
 if matches('Open profile menu'):
  tap('Open profile menu');tap('Sign out',scroll=True)
 time.sleep(1)
def field(label,value):
 tap(label);time.sleep(.7);type_value(value);time.sleep(.5)
field('Account email','owner@demo.example.test');field('Password','local-demo')
tap('Continue');time.sleep(3)
go('More','Catalog')
tap('Catalog & pricing',scroll=True);time.sleep(2)
tap('+ New product',scroll=True);time.sleep(1)
assert 'Product basics' in text()
tap('Images and product codes',scroll=True)
assert 'Barcodes (one per line)' in text()
shot('android-product-sections')
tap('Images and product codes',scroll=True)
tap('Category and inventory settings',scroll=True)
assert 'Product type' in text()
shot('android-product-options')
tap('Close add product')
go('More','Catalog')
tap('Stores & terminals',scroll=True);time.sleep(2)
assert 'Search locations' in text()
tap('Add store / warehouse / terminal',scroll=True)
assert 'Location or terminal name' in text()
shot('android-location-drawer')
tap('Close add location')
go('More','Catalog')
tap('Users & roles',scroll=True);time.sleep(1)
tap('View included permissions',scroll=True)
shot('android-role-capabilities')
with open(OUT+'/android.json','w') as f:json.dump({'platform':'Android 16 ARM64 / Expo Go','source':'development mock transport','checks':['native product accordion fields','category/tracking fields','location create drawer','role capability disclosure'],'businessMutations':False},f,indent=2)
print('Android management presentation passed')
