"""Small adb helpers for the feedback smoke test; requires a running Expo Android emulator."""
import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET

ADB = os.environ.get('ADB', '/tmp/inventory-android-sdk/platform-tools/adb')
OUT = 'docs/qa/feedback-sync'

def run(*args):
    return subprocess.check_output([ADB, *args], text=True)

def nodes():
    run('shell', 'uiautomator', 'dump', '/sdcard/feedback-ui.xml')
    return list(ET.fromstring(run('shell', 'cat', '/sdcard/feedback-ui.xml')).iter('node'))

def text():
    return '\n'.join(n.attrib.get('text', '') + ' ' + n.attrib.get('content-desc', '') for n in nodes())

def type_value(value):
    run('shell', 'input', 'text', value.replace(' ', '%s'))

def shot(name):
    with open(OUT + '/' + name + '.png', 'wb') as target:
        subprocess.run([ADB, 'exec-out', 'screencap', '-p'], stdout=target, check=True)
