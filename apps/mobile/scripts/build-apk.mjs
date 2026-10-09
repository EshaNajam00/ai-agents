// Builds a debug APK of Gridzy and copies it to <repo>/apk/.
// Run with: npm run apk  (from the repository root)
//
// - Java: uses JAVA_HOME if it is Java 21+, otherwise Android Studio's bundled Java.
// - Android SDK: uses ANDROID_HOME (or ANDROID_SDK_ROOT).
// - Gradle downloads go to GRADLE_USER_HOME, or <repo>/.gradle-home when unset, so they
//   stay on the same drive as the project instead of filling C:.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mobileDir = join(here, '..');
const androidDir = join(mobileDir, 'android');
const repoRoot = join(mobileDir, '../..');
const isWindows = process.platform === 'win32';

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function javaMajor(javaHome) {
  const bin = join(javaHome, 'bin', isWindows ? 'java.exe' : 'java');
  if (!existsSync(bin)) return 0;
  const out = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  const match = /version "(\d+)/.exec(`${out.stderr}${out.stdout}`);
  return match ? Number(match[1]) : 0;
}

function findJava() {
  const candidates = [
    process.env.JAVA_HOME,
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
    '/opt/android-studio/jbr',
  ].filter(Boolean);
  for (const home of candidates) if (javaMajor(home) >= 21) return home;
  return fail(
    'Java 21 was not found. Install Android Studio (it includes Java 21) or set JAVA_HOME to a Java 21 folder.',
  );
}

function findSdk() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (sdk && existsSync(sdk)) return sdk;
  return fail(
    'Android SDK not found. Set ANDROID_HOME to your SDK folder (e.g. D:\\Android\\Sdk).',
  );
}

const javaHome = findJava();
const sdk = findSdk();
const gradleHome = process.env.GRADLE_USER_HOME || join(repoRoot, '.gradle-home');
mkdirSync(gradleHome, { recursive: true });

// Gradle reads the SDK location from local.properties (not committed).
const localProps = join(androidDir, 'local.properties');
writeFileSync(localProps, `sdk.dir=${sdk.replaceAll('\\', '\\\\').replace(':', '\\:')}\n`);

console.log(`Java:    ${javaHome}`);
console.log(`SDK:     ${sdk}`);
console.log(`Gradle:  ${gradleHome}\n`);

const gradlew = isWindows ? 'gradlew.bat' : './gradlew';
const result = spawnSync(gradlew, ['assembleDebug', '--console=plain'], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: isWindows,
  env: { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: sdk, GRADLE_USER_HOME: gradleHome },
});
if (result.status !== 0) fail('The Android build failed. See the messages above.');

const built = join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
if (!existsSync(built)) fail(`Build finished but no APK was found at ${built}`);

const version =
  /versionName "([^"]+)"/.exec(readFileSync(join(androidDir, 'app/build.gradle'), 'utf8'))?.[1] ??
  'dev';
const outDir = join(repoRoot, 'apk');
mkdirSync(outDir, { recursive: true });
const target = join(outDir, `Gridzy-${version}-debug.apk`);
copyFileSync(built, target);
console.log(`\n✔ APK ready: ${target}\n`);
