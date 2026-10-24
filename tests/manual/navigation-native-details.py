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
def tap_route(label):
 found=matches(label)
 if not found: raise RuntimeError('Missing route: '+label)
 a,b=max(found,key=lambda pair:pair[1][1])
 run('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2));time.sleep(.4)
tap('More');tap('Search pages and records');type_value('Company');time.sleep(.5);tap('Company profile');time.sleep(.5);shot('android-company');assert 'Choose company logo' in text()
tap('More');tap('Search pages and records');type_value('Customer');time.sleep(.5);tap_route('Customers');time.sleep(.5);tap('customers grid view',scroll=True);shot('android-customer-grid');assert 'selected' in text()
print('Native company profile and customer grid passed')
