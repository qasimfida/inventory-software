"""Android Expo Go demo walkthrough; never submits a sale or changes real records."""
import json, os, re, subprocess, time, xml.etree.ElementTree as ET
ADB=os.environ.get('ADB','/tmp/inventory-android-sdk/platform-tools/adb')
OUT='docs/qa/navigation-refinement'
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
for attempt in range(35):
 if matches('Account email'):break
 if attempt==4:run('shell','am','start','-W','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8088')
 time.sleep(1)
tap('Account email');type_value('owner@demo.example.test');tap('Password');type_value('local-demo');tap('Continue');time.sleep(1)
tap('Switch workspace');assert 'Stores & warehouses' in text();shot('android-workspaces');tap('Close switch workspace')
tap('Point of sale');tap('Product filters',scroll=True);shot('android-pos-filters');tap('Product category');tap('Search Product category options');type_value('Living');time.sleep(.5);shot('android-searchable-options');tap('Product category: Living');tap('Close product filters')
tap('Open profile menu');tap('Theme');shot('android-theme');tap('Dark');tap('Close menu')
tap('Open profile menu');tap('Preferences');shot('android-preferences');tap('Close menu')
with open(OUT+'/android-results.json','w') as f:json.dump({'platform':'Android 16 ARM64 / Expo Go 58','mode':'development fixtures','checks':['login','multi-location workspace selection panel','POS filter panel','searchable native options','sidebar profile menu','theme options and palette','preferences groups'],'mutationsSubmitted':False},f,indent=2)
print('Android navigation walkthrough passed')
