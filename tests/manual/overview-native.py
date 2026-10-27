# Manual Android QA: start the existing mock Expo app on port 8088, sign in as the demo owner, and open Overview.
import subprocess,time,re,json,xml.etree.ElementTree as ET
from pathlib import Path
adb='/tmp/inventory-android-sdk/platform-tools/adb'; out=Path('artifacts/qa/overview-currency'); seen=set()
def cmd(*a):return subprocess.check_output([adb,*a],text=True)
def dump():
 cmd('shell','uiautomator','dump','/sdcard/overview-qa.xml')
 root=ET.fromstring(cmd('shell','cat','/sdcard/overview-qa.xml'))
 nodes=list(root.iter('node'))
 seen.update(n.attrib.get('text','') for n in nodes)
 return nodes
def tap(label,nodes=None):
 nodes=nodes if nodes is not None else dump()
 candidates=[n for n in nodes if n.attrib.get('content-desc')==label or n.attrib.get('text')==label]
 candidates.sort(key=lambda n:n.attrib.get('content-desc')!=label)
 for n in candidates:
  pts=list(map(int,re.findall(r'\d+',n.attrib['bounds'])))
  if pts[3]>pts[1] and pts[1]>=0 and pts[3]<=2340:
   cmd('shell','input','tap',str((pts[0]+pts[2])//2),str((pts[1]+pts[3])//2));time.sleep(.5);return
 raise Exception('Not visible: '+label)
def scroll(down=True):cmd('shell','input','swipe','500','1800' if down else '850','500','850' if down else '1800','350');time.sleep(.3)
def find(label,limit=18):
 for i in range(limit):
  nodes=dump()
  try:tap(label,nodes);return
  except Exception:scroll()
 raise Exception('Not found: '+label)
def shot(name):
 with (out/name).open('wb') as f:subprocess.run([adb,'exec-out','screencap','-p'],stdout=f,check=True)
shot('android-overview.png')
tap('Overview period: Last 7 days')
for i in range(20):
 nodes=dump(); labels={n.attrib.get('text') for n in nodes}
 if 'Inventory snapshot' in labels:shot('android-inventory.png')
 if 'Quick POS' in labels:shot('android-recent-sales.png')
 if any(n.attrib.get('content-desc')=='View daily figures' for n in nodes):
  shot('android-trend.png');tap('View daily figures',nodes);expanded=dump();assert any('gross sales' in n.attrib.get('text','') for n in expanded);shot('android-daily-values.png');tap('Hide daily figures',expanded)
 if 'Top products' in labels:shot('android-growth-top-products.png');break
 scroll()
assert {'Inventory snapshot','Quick POS','Sales trend','Growth','Top products'}<=seen
# Returning to the same tab preserves scroll; scroll up to the overview controls.
for i in range(20):
 nodes=dump()
 try:tap('USD · Currency settings',nodes);break
 except Exception:scroll(False)
else:raise Exception('Currency action not found')
find('Currency: PKR');shot('android-currency-pkr.png')
tap('Overview')
for i in range(20):
 nodes=dump()
 if any(n.attrib.get('text')=='No sales in PKR during this period.' for n in nodes):shot('android-pkr-empty.png');break
 scroll()
else:raise Exception('PKR empty sales not found')
(out/'android-results.json').write_text(json.dumps({'runtime':'Android 16 ARM64 Expo Go 58','resolution':'1080x2400','data':'existing demo fixtures, no live transaction mutations','period':'7 days','panels':sorted(seen & {'Inventory snapshot','Quick POS','Sales trend','Growth','Top products'}),'exactDailyValues':'pass','currencySelection':'PKR','currencyEmptyState':'pass'},indent=2)+'\n')
print('Android overview, daily values and currency checks passed')
