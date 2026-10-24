"""Android Expo Go demo walkthrough; never submits a sale or changes real records."""
import json, os, re, subprocess, time, xml.etree.ElementTree as ET
ADB=os.environ.get('ADB','/tmp/inventory-android-sdk/platform-tools/adb')
OUT='docs/qa/feature-audit'
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

tap('Account email');type_value('cashier@inv.com');tap('Password');type_value('asdF@123');tap('Continue')
for attempt in range(15):
 if 'Point of sale' in text():break
 time.sleep(1)
tap('Add AUDIT-NOTEBOOK · Audit notebook',scroll=True)
for attempt in range(10):
 content=text()
 if 'View cart · 1 items · USD 13.75' in content:break
 time.sleep(.5)
assert 'View cart · 1 items · USD 13.75' in content,content
# Cashier Home redirects to POS without destroying the mounted checkout.
tap('Overview');time.sleep(1)
assert 'View cart · 1 items · USD 13.75' in text()
shot('android-cashier-cart-retained')
tap('View cart · 1 items · USD 13.75')
assert 'Quantity 1' in text()
shot('android-cashier-cart-details')
tap('Remove line 1',scroll=True)
assert 'Your cart is empty.' in text()
tap('Close cart details');tap('Open profile menu');tap('Sign out')
with open(OUT+'/android-cart.json','w') as f:json.dump({'account':'cashier','serverQuote':'USD 13.75','cartSurvivesOverviewRedirect':True,'cartCleared':True,'saleSubmitted':False},f,indent=2)
print('Native cashier quoted cart survives Overview redirect',flush=True)
