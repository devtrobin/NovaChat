const assert = require('node:assert/strict');
const { FuseVersion, FuseV1Options, FuseState, flipFuses, getCurrentFuseWire } = require('@electron/fuses');
const { listPackage, statFile, extractFile } = require('@electron/asar');
const { existsSync } = require('node:fs');
const path = require('node:path');

const expected = {
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableCookieEncryption]: true,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
  [FuseV1Options.OnlyLoadAppFromAsar]: true,
};

async function checkFuses(executable, configure = false) {
  if (configure) await flipFuses(executable, { version: FuseVersion.V1, ...expected });
  const current = await getCurrentFuseWire(executable);
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(current[key], value ? FuseState.ENABLE : FuseState.DISABLE, `Unexpected fuse ${key}`);
  }
  const archive = path.join(path.dirname(executable), 'resources', 'app.asar');
  const files = listPackage(archive);
  assert.ok(files.some((file) => /\/\.webpack\/main\/index\.(?:c?js)$/.test(file.replaceAll('\\', '/'))));
  const natives = files.filter((file) => file.endsWith('.node'));
  assert.ok(natives.length > 0, 'Missing native PDF dependency');
  for (const file of natives) {
    const relative = file.replace(/^[/\\]+/, '');
    assert.equal(statFile(archive, relative).unpacked, true, `Native module is still in ASAR: ${file}`);
    assert.ok(existsSync(path.join(`${archive}.unpacked`, relative)));
  }
  return { fuses: true, asar: true, archive };
}

function checkProductionArchive(archive) {
  const files = listPackage(archive).map((file) => file.replaceAll('\\', '/'));
  assert.equal(JSON.parse(extractFile(archive, 'package.json').toString()).main, '.webpack/main/index.cjs');
  assert.ok(!files.some((file) => /^\/(?:tests|scripts)\/.*(?:ari|qualification)/.test(file)), 'Qualification harness leaked into production');
  for (const file of ['.webpack/main/index.cjs', '.webpack/renderer/main_window/preload.cjs', '.webpack/renderer/main_window/index.html', 'node_modules/jsdom/package.json', 'node_modules/pdfjs-dist/legacy/build/pdf.mjs', 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs']) {
    assert.ok(files.includes('/' + file), `Missing packaged runtime asset: ${file}`);
  }
}

module.exports = { checkFuses, checkProductionArchive };
