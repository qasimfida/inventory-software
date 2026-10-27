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


run('shell','input','keyevent','KEYCODE_WAKEUP')
run('shell','wm','dismiss-keyguard')
run('reverse','tcp:8088','tcp:8088')
run('shell','am','force-stop','host.exp.exponent');time.sleep(1)
run('shell','am','start','-W','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8088')
for attempt in range(35):
 if matches('Account email'):break
 if matches('Open profile menu'):
  tap('Open profile menu');tap('Sign out',scroll=True)
 if attempt==4:run('shell','am','start','-W','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8088')
 time.sleep(1)
def field(label,value):
 for attempt in range(4):
  tap(label);time.sleep(1)
  if any(n.attrib.get('content-desc')==label and n.attrib.get('focused')=='true' for n in nodes()):break
 else:raise RuntimeError('Field did not focus: '+label)
 type_value(value);time.sleep(.5)
field('Account email','owner@demo.example.test');field('Password','local-demo')
time.sleep(.5)
tap('Continue');time.sleep(2)
go('Point of sale','Checkout warehouse')
for attempt in range(8):
 candidates=[n.attrib.get('content-desc','') for n in nodes() if n.attrib.get('content-desc','').startswith('Add HP-')]
 if candidates:
  tap(candidates[0],scroll=True);break
 run('shell','input','swipe','550','1700','550','1200','350')
else:raise RuntimeError('No POS add control')
time.sleep(2)

label=next(n.attrib['content-desc'] for n in nodes() if n.attrib.get('content-desc','').startswith('View cart ·'))
tap(label);time.sleep(1)
assert matches('Checkout')
shot('android-cart-footer')
tap('Checkout');time.sleep(1)
assert matches('Checkout')
assert 'Cash tendered (minor units)' in text()
shot('android-cart-review')
tap('Close cart details')
tap('Open profile menu');tap('Sign out',scroll=True)
with open(OUT+'/android-cart-results.json','w') as f:json.dump({'platform':'Android 16 ARM64 / Expo Go','source':'isolated local demo','checks':['native POS add item','drawer footer Checkout visible','Checkout reveals cash review fields','close cart and logout'],'saleSubmitted':False},f,indent=2)
print('Android cart footer passed')
