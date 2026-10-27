"""Android Expo Go demo walkthrough; never submits a sale or changes real records."""
import json, os, re, subprocess, time, xml.etree.ElementTree as ET
ADB=os.environ.get('ADB','/tmp/inventory-android-sdk/platform-tools/adb')
OUT='artifacts/qa/interaction-refinement'
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
run('shell','am','force-stop','host.exp.exponent')
time.sleep(1)
run('shell','am','start','-W','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8088')
for attempt in range(30):
 if matches("Account email"): break
 if attempt == 3:
  run("shell","am","start","-W","-a","android.intent.action.VIEW","-d","exp://127.0.0.1:8088")
 time.sleep(1)
# Demo authentication is intentionally separate from production credentials.
tap('Account email');type_value('owner@demo.example.test');tap('Password');type_value('local-demo');tap('Continue');time.sleep(1)
tap('Point of sale');run('shell','input','swipe','550','1600','550','1100','350')
tap('POS product search');type_value('HP-001');time.sleep(1)
tap('Oak dining chair · Natural 1 · HP-001 · USD 25 / EA · base price')
time.sleep(1);tap('View cart · 1 items · USD 25.00');tap('Increase Quantity 1');time.sleep(1)
for _ in range(3):run('shell','input','swipe','550','1850','550','950','350')
assert 'USD 50.00' in text();shot('android-cart-final')
tap('Close cart details');tap('Switch workspace');assert 'Finish or clear the cart' in text();shot('android-workspace-locked-final');tap('Close switch workspace')
tap('Open profile menu');tap('Theme');tap('Theme: dark');shot('android-theme-final');tap('Close menu')
tap('Open profile menu');tap('Preferences');tap('violet',scroll=True);tap('Font',scroll=True);tap('Font: Karla',scroll=True);shot('android-preferences-final');tap('Close menu')
tap('Notifications, 3 unread');assert 'View all notifications' in text();shot('android-notifications-final');tap('View all notifications')
with open(OUT+'/android-results.json','w') as f:json.dump({'platform':'Android 16 ARM64, Expo Go 58','mode':'development fixtures','checks':['login','unified SKU/price suggestions','persistent cart action','scrollable cart','automatic quote after quantity step','workspace switching locked for active cart','profile menu','dark theme','violet palette','bundled Karla font selection','notification preview and navigation'],'saleSubmitted':False},f,indent=2)
print('Android interaction walkthrough passed')
