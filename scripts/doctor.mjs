import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const target = process.argv[2] ?? 'all';
if (!['all', 'desktop', 'android', 'ios'].includes(target)) throw new Error('Unknown platform.');
const includes = (platform) => target === 'all' || target === platform;
let missing = false;
function check(label, ready, remedy) {
  console.log(`${ready ? 'OK' : 'MISSING'} ${label}${ready ? '' : ` — ${remedy}`}`);
  missing ||= !ready;
}
const works = (command, args) => spawnSync(command, args, { encoding: 'utf8' }).status === 0;
check('Node 24', process.versions.node.split('.')[0] === '24', 'Install Node.js 24.x.');
for (const app of ['api', 'web', 'mobile']) {
  check(
    `${app} environment`,
    existsSync(fileURLToPath(new URL(`../apps/${app}/.env`, import.meta.url))),
    'Run npm run setup.',
  );
}
if (includes('desktop'))
  check(
    'Desktop Rust/Cargo',
    works('cargo', ['--version']),
    'Install Rust stable; see docs/development.md.',
  );
if (includes('android')) {
  check(
    'Android JDK',
    works('java', ['-version']),
    'Install the JDK required by Expo/React Native and configure JAVA_HOME.',
  );
  const sdk =
    process.env.ANDROID_HOME ??
    process.env.ANDROID_SDK_ROOT ??
    join(
      homedir(),
      process.platform === 'darwin'
        ? 'Library/Android/sdk'
        : process.platform === 'win32'
          ? 'AppData/Local/Android/Sdk'
          : 'Android/Sdk',
    );
  check(
    'Android SDK/adb',
    existsSync(join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')),
    'Install Android Studio/SDK; set ANDROID_HOME.',
  );
}
if (includes('ios')) {
  if (process.platform === 'darwin') {
    check(
      'iOS Xcode',
      works('xcodebuild', ['-version']),
      'Install and launch full Xcode, select its developer directory, and install an iOS simulator.',
    );
    check('iOS CocoaPods', works('pod', ['--version']), 'Install CocoaPods after Xcode.');
  } else {
    check('iOS host', false, 'iOS native builds require macOS with Xcode.');
  }
}
console.log(
  'These are prerequisite checks, not proof of a successful native build. See docs/development.md.',
);
process.exitCode = missing ? 1 : 0;
