// Builds a Gridzy APK and copies it to <repo>/apk/.
// Debug:   npm run apk          (from the repository root)
// Release: npm run apk:release  (signed with the key outside the repo, see below)
//
// - Java: uses JAVA_HOME if it is Java 21+, otherwise Android Studio's bundled Java.
// - Android SDK: uses ANDROID_HOME (or ANDROID_SDK_ROOT).
// - Release key: GRIDZY_SIGNING_PROPERTIES, or ../Gridzy-keys/keystore.properties next to
//   the repository folder. It is never inside the repository.
// - Gradle downloads go to GRADLE_USER_HOME, or <repo>/.gradle-home when unset, so they
//   stay on the same drive as the project instead of filling C:.
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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

const release = process.argv.includes('--release');
const javaHome = findJava();
const sdk = findSdk();
const gradleHome = process.env.GRADLE_USER_HOME || join(repoRoot, '.gradle-home');
mkdirSync(gradleHome, { recursive: true });

const signingProps = resolve(
  process.env.GRIDZY_SIGNING_PROPERTIES ||
    join(repoRoot, '..', 'Gridzy-keys', 'keystore.properties'),
);
if (release && !existsSync(signingProps)) {
  fail(
    `Release key settings not found at ${signingProps}.\n  Restore your Gridzy-keys backup there, or set GRIDZY_SIGNING_PROPERTIES.`,
  );
}

// Gradle reads the SDK location from local.properties (not committed).
const localProps = join(androidDir, 'local.properties');
writeFileSync(localProps, `sdk.dir=${sdk.replaceAll('\\', '\\\\').replace(':', '\\:')}\n`);

console.log(`Mode:    ${release ? 'release (signed)' : 'debug'}`);
console.log(`Java:    ${javaHome}`);
console.log(`SDK:     ${sdk}`);
console.log(`Gradle:  ${gradleHome}\n`);

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: sdk,
  GRADLE_USER_HOME: gradleHome,
};
// Passed as an environment variable (not on the command line) so no path or secret
// shows up in process listings; Gradle maps ORG_GRADLE_PROJECT_* to project properties.
if (release) env.ORG_GRADLE_PROJECT_gridzySigningProperties = signingProps;

// Explicit relative path: some Windows setups don't search the current folder.
const gradlew = isWindows ? '.\\gradlew.bat' : './gradlew';
const task = release ? 'assembleRelease' : 'assembleDebug';
const result = spawnSync(gradlew, [task, '--console=plain'], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: isWindows,
  env,
});
if (result.status !== 0) fail('The Android build failed. See the messages above.');

const variant = release ? 'release' : 'debug';
const built = join(androidDir, `app/build/outputs/apk/${variant}/app-${variant}.apk`);
if (!existsSync(built)) fail(`Build finished but no signed APK was found at ${built}`);

const version =
  /versionName "([^"]+)"/.exec(readFileSync(join(androidDir, 'app/build.gradle'), 'utf8'))?.[1] ??
  'dev';
const outDir = join(repoRoot, 'apk');
mkdirSync(outDir, { recursive: true });

if (!release) {
  const target = join(outDir, `Gridzy-${version}-debug.apk`);
  copyFileSync(built, target);
  console.log(`\n✔ APK ready: ${target}\n`);
  process.exit(0);
}

// Double-check the signature before anyone downloads it.
const buildTools = join(sdk, 'build-tools');
const latestTools = readdirSync(buildTools)
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  .at(-1);
const apksigner = join(buildTools, latestTools ?? '', isWindows ? 'apksigner.bat' : 'apksigner');
const verify = spawnSync(`"${apksigner}"`, ['verify', '--print-certs', `"${built}"`], {
  encoding: 'utf8',
  shell: true,
  env,
});
if (verify.status !== 0) fail(`APK signature check failed:\n${verify.stdout}${verify.stderr}`);
const signer = /Signer #1 certificate DN: (.+)/.exec(verify.stdout)?.[1] ?? 'unknown';

// "Gridzy.apk" keeps one name for every release, so the "latest" download link never changes.
const forRelease = join(outDir, 'Gridzy.apk');
const archived = join(outDir, `Gridzy-${version}.apk`);
copyFileSync(built, forRelease);
copyFileSync(built, archived);
console.log(`\n✔ Signed release APK (v${version}), signer: ${signer}`);
console.log(`  Upload to GitHub Releases: ${forRelease}`);
console.log(`  Archive copy:              ${archived}\n`);
