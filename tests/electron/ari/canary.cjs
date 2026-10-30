// Test-only entry point for the OLD Electron binary. Never loaded by NovaChat.
const { app, safeStorage } = require('electron');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { isAbsolute, join, basename } = require('node:path');

const root = process.argv.find((arg) => arg.startsWith('--qualification-root='))?.split('=').slice(1).join('=');
if (!root || !isAbsolute(root) || !basename(root).startsWith('novachat-ari-qualification-')
  || readFileSync(join(root, '.qualification'), 'utf8') !== 'NovaChat ARI isolated test') {
  throw new Error('A fresh isolated qualification root is required.');
}
mkdirSync(join(root, 'user-data'), { recursive: true });
app.setName('nova-chat-ari-qualification');
app.setPath('userData', join(root, 'user-data'));
app.setPath('sessionData', join(root, 'user-data'));
app.whenReady().then(() => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('OS encryption unavailable.');
  const value = ' NovaChat synthetic qualification canary ';
  const encrypted = safeStorage.encryptString(value);
  if (safeStorage.decryptString(encrypted) !== value) throw new Error('Canary round-trip failed.');
  writeFileSync(join(root, 'canary.json'), JSON.stringify({
    ciphertext: encrypted.toString('base64'),
    electron: process.versions.electron,
  }));
  app.quit();
}).catch(() => app.exit(1));
