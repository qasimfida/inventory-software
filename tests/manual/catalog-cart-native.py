"""Android Expo Go demo walkthrough; never submits a sale or changes real records."""
import json, os, re, subprocess, time, xml.etree.ElementTree as ET
ADB=os.environ.get('ADB','/tmp/inventory-android-sdk/platform-tools/adb')
OUT='docs/qa/catalog-cart'
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
assert 'Stock location ID' not in text()
tap('Increase Quantity 1')
quantity=matches('Quantity 1')[0]
assert quantity[0]['text']=='2',quantity
remove=matches('Remove line 1')[0]
assert quantity[1][1]>=remove[1][3]
shot('android-compact-cart')
name=next(n.attrib['content-desc'] for n in nodes() if n.attrib.get('content-desc','').startswith('Oak dining chair'))
tap(name);time.sleep(1)
assert 'Product details' in text()
assert 'Stock location ID' in text()
assert 'Unit 1' in text()
shot('android-cart-product-details')
tap('Close product details')
tap('Add discount',scroll=True)
tap('Manual discount (%)');run('shell','input','keyevent','123','67','67','67','67');type_value('10')
# The keyboard occupies space; use a small swipe, never Back out of a modal.
run('shell','input','swipe','700','1700','700','1000','300')
tap('Apply discount',scroll=True);time.sleep(1)
assert 'discount' in text()
tap('Close cart details')
go('More','Catalog')
tap('Catalog & pricing',scroll=True);time.sleep(2)
assert 'Search products' in text()
tap('Catalog grid view')
shot('android-catalog-grid')
tap('Catalog list view')
shot('android-catalog-list')
tap('Filters')
assert 'Catalog filters' in text()
tap('Close catalog filters')
# Open an existing product's edit form without mutating its metadata.
for attempt in range(8):
 edits=[n.attrib['content-desc'] for n in nodes() if n.attrib.get('content-desc','').startswith('Edit product ')]
 if edits:
  tap(edits[0],scroll=True);break
 run('shell','input','swipe','550','1700','550','1100','350')
else:raise RuntimeError('No product edit action')
tap('Set / adjust price',scroll=True)
assert 'Variants and pricing' in text()
shot('android-catalog-pricing')
tap('Close variants and pricing')
for _ in range(4):run('shell','input','swipe','550','850','550','1800','300')
tap('Catalog grid view')
for _ in range(8):
 choices=[n.attrib.get('content-desc','') for n in nodes() if n.attrib.get('content-desc','').startswith('Select Oak dining chair')]
 if choices and matches(choices[0]):
  tap(choices[0]);break
 run('shell','input','swipe','550','1700','550','1000','350')
else:raise RuntimeError('No selectable grid product')
run('shell','input','swipe','550','1700','550','750','350')
shot('android-catalog-cards')
name=choices[0].removeprefix('Select ')
tap(name,scroll=True)
assert 'Product details' in text()
shot('android-catalog-details')
tap('Close product details')
for _ in range(4):run('shell','input','swipe','550','850','550','1800','300')
tap('Catalog list view')
for _ in range(5):
 if '1 selected' in text():break
 run('shell','input','swipe','550','1700','550','1100','300')
assert '1 selected' in text()
with open(OUT+'/android-results.json','w') as f:json.dump({'platform':'Android 16 ARM64 / Expo Go','source':'isolated local demo','checks':['compact cart quantity below delete','product name opens details drawer','stock location retained in details only','manual discount editor','sticky Checkout visible','catalog list/grid and filters','edit drawer links to pricing','catalog overlay selection persists across grid/list','catalog product details drawer'],'businessMutations':False},f,indent=2)
print('Android catalog/cart passed')
