// A separate application: no production startup, migrations, settings or accounts.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const { packager } = require('@electron/packager');
const { buildHarness } = require('./qualification-build.cjs');
const { checkFuses, checkProductionArchive } = require('./qualification-fuses.cjs');
const execute = promisify(execFile);

async function main() {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('This qualification currently requires Windows x64.');
  const project = path.resolve(__dirname, '../..');
  const options = readOptions(process.argv.slice(2));
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'novachat-ari-qualification-'));
  await fs.writeFile(path.join(root, '.qualification'), 'NovaChat ARI isolated test');
  const electron = require('electron');
  const baseline = options['baseline-electron'] ? path.resolve(options['baseline-electron']) : electron;
  console.log(`ARI qualification artifacts: ${root}`);
  console.log('Writing the synthetic encryption canary.');
  await run(baseline, [path.join(project, 'tests/electron/ari/canary.cjs')], root);
  const appDirectory = path.join(root, 'app');
  console.log('Building the isolated harness.');
  await buildHarness(project, appDirectory);
  console.log('Checking libraries in development.');
  await run(electron, [appDirectory], root);
  console.log('Packaging the isolated harness.');
  const outputs = await packager({
    dir: appDirectory, out: path.join(root, 'package'),
    name: 'NovaChatARIQualification', executableName: 'NovaChatARIQualification',
    electronVersion: '44.10.0', platform: 'win32', arch: 'x64',
    // Match Forge's native-unpack pattern, including hidden parent directories.
    asar: { unpack: '**/{.**,**}/**/*.node' }, prune: false,
  });
  const executable = path.join(outputs[0], 'NovaChatARIQualification.exe');
  await checkFuses(executable, true);
  console.log('Checking libraries in the ASAR package.');
  await run(executable, [], root);
  let production;
  if (options['production-executable']) {
    const checked = await checkFuses(path.resolve(options['production-executable']));
    checkProductionArchive(checked.archive);
    production = { fuses: true, asar: true, harnessAbsent: true, runtimeAssets: true };
  }
  const development = JSON.parse(await fs.readFile(path.join(root, 'development-report.json'), 'utf8'));
  const packaged = JSON.parse(await fs.readFile(path.join(root, 'packaged-report.json'), 'utf8'));
  const report = { root, development, packaged, production };
  await fs.writeFile(path.join(root, 'qualification-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

async function run(executable, args, root) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_OPTIONS;
  try {
    await execute(executable, [...args, `--qualification-root=${root}`], {
      env, timeout: 60000, windowsHide: true, maxBuffer: 1024 * 1024,
    });
  } catch {
    let details = 'Electron did not complete the isolated smoke test.';
    try { details = JSON.parse(await fs.readFile(path.join(root, 'failure.json'), 'utf8')).error; } catch { /* report may not exist */ }
    throw new Error(`${details} Artifacts: ${root}`);
  }
}

function readOptions(args) {
  const allowed = new Set(['baseline-electron', 'production-executable']);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i]?.replace(/^--/, '');
    if (!allowed.has(name) || !args[i + 1]) throw new Error('Unknown or incomplete qualification option.');
    options[name] = args[i + 1];
  }
  return options;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
