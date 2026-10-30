// Isolated smoke test: production source + built renderer/preload, synthetic provider only.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');
const sourceRoot = path.resolve(__dirname, '../../..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'novachat-ael-smoke-'));
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
for (const name of ['user-data', 'Desktop']) fs.mkdirSync(path.join(root, name));
app.setName('novachat-isolated-ael-smoke');
app.setPath('userData', path.join(root, 'user-data'));
app.setPath('sessionData', path.join(root, 'user-data'));
app.setPath('desktop', path.join(root, 'Desktop'));
process.chdir(root);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename,
}).outputText, filename);
const load = (file) => require(path.join(sourceRoot, 'src', file));
let responses = [];
let calls = 0;
const pendingIpc = new Set();
const ipcErrors = [];
const originalHandle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel, listener) => originalHandle(channel, async (...args) => {
  const marker = {};
  pendingIpc.add(marker);
  try { return await listener(...args); }
  catch (error) { ipcErrors.push({ channel, message: error.message }); throw error; }
  finally { pendingIpc.delete(marker); }
});
global.fetch = async (url, options) => {
  assert.equal(url, 'https://synthetic.invalid/v1/responses');
  assert.equal(options.headers.Authorization, 'Bearer synthetic-ael-key');
  assert.ok(responses.length, 'Unexpected extra provider call');
  calls++;
  return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(responses.shift()) }] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
let window;
const evaluate = (code) => window.webContents.executeJavaScript(code);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(code, label) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) { if (await evaluate(code)) return; await delay(40); }
  throw new Error('Timed out: ' + label + '\n' + await evaluate('document.body.innerText'));
}
async function submit(name) {
  responses = [
    { from: 'assistant', to: 'agent', agentId: 'agent-ael', action: 'write-file', target: { directory: 'desktop', name }, content: 'print("coucou")\n', overwrite: false },
    { from: 'assistant', to: 'user', content: 'Resultat synthetique recu.' },
  ];
  await evaluate(`(() => { const field=document.querySelector('.chat-input__field'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,${JSON.stringify('Cree un fichier Python ')} + ${JSON.stringify(name)} + ' sur le Bureau qui affiche coucou.'); field.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await delay(50);
  await evaluate("document.querySelector('.chat-input').requestSubmit()");
}
const click = (label) => evaluate(`(() => { const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}); if(!button) throw new Error('Button missing'); button.click(); })()`);
const timeout = setTimeout(() => { fs.writeFileSync(path.join(root,'failure.txt'),'Overall timeout'); app.exit(1); }, 55000);
app.whenReady().then(async () => {
  const settingsService = load('main/settings/settings.service.ts');
  const settings = settingsService.createDefaultSettings();
  settings.agents['agent-acp'].enabled = false;
  settings.apiTrace.enabled = false;
  settings.hideInternalConversations = true;
  settings.openai = { ...settings.openai, apiKeyUpdate: 'synthetic-ael-key', baseUrl: 'https://synthetic.invalid/v1', model: 'synthetic' };
  await settingsService.saveSettingsToDisk(settings);
  const now = new Date().toISOString();
  await load('main/chat/chat-storage.service.ts').saveChatStateToDirectory({ activeConversationId: 'smoke', conversations: [{ id: 'smoke', title: 'AEL smoke', createdAt: now, updatedAt: now, messages: [] }] }, settings.localFiles.conversationsDirectory);
  ipcMain.handle('nova:ping', () => ({ ok: true }));
  for (const [file, method] of [['ai','registerAiHandlers'],['agents','registerAgentsHandlers'],['chat','registerChatHandlers'],['settings','registerSettingsHandlers']]) load(`main/ipc/${file}.handlers.ts`)[method](ipcMain);
  const security = load('main/window/main-window.security.ts');
  const rendererRoot = path.join(sourceRoot,'.webpack','x64','renderer','main_window');
  const windowOptions = security.createMainWindowOptions(path.join(rendererRoot,'preload.cjs'));
  window = new BrowserWindow({ ...windowOptions, webPreferences: { ...windowOptions.webPreferences, offscreen: true, backgroundThrottling: false }, width: 1280, height: 900, show: false });
  const entry = pathToFileURL(path.join(rendererRoot,'index.html')).href;
  security.configureMainWindowNavigation(window.webContents, entry);
  security.configureMainWindowContentSecurityPolicy(window.webContents, false);
  await window.loadURL(entry);
  await until("!!document.querySelector('.chat-input__field')", 'chat hydration');
  const navigate = (label) => evaluate(`(() => { const button=[...document.querySelectorAll('.app-sidebar__section-trigger')].find(b=>b.firstElementChild.textContent===${JSON.stringify(label)}); if(!button) throw new Error('Sidebar button missing'); button.click(); })()`);
  await navigate('Parametres');
  await until("!!document.querySelector('.settings-panel__body')", 'settings opening');
  await navigate('Agents');
  await evaluate("[...document.querySelectorAll('.app-sidebar__item-title')].find(e=>e.textContent==='AEL').closest('button').click()");
  await until("!!document.querySelector('.agent-ael-page')", 'AEL page navigation');
  await navigate('Conversations');
  await until("!!document.querySelector('.chat-input__field')", 'return to chat');
  await submit('coucou.py');
  await until("document.body.innerText.includes('Creer ce fichier')", 'permission preview');
  assert.equal(fs.existsSync(path.join(root,'Desktop','coucou.py')),false);
  assert.equal(await evaluate("document.querySelector('.message-item__system-command').textContent"),'print("coucou")\n');
  assert.equal(await evaluate("document.body.innerText.includes('Oui permanent')"),false);
  window.webContents.invalidate();
  await delay(900);
  fs.writeFileSync(path.join(root,'permission.png'),(await window.webContents.capturePage()).toPNG());
  await click('Creer ce fichier');
  await until("!document.querySelector('.chat-input__button--stop')", 'creation completion');
  assert.equal(fs.readFileSync(path.join(root,'Desktop','coucou.py'),'utf8'),'print("coucou")\n');
  await submit('refused.py');
  await until("document.body.innerText.includes('Creer ce fichier')", 'deny preview');
  await click('Refuser');
  await until("!document.querySelector('.chat-input__button--stop')", 'denial completion');
  assert.equal(fs.existsSync(path.join(root,'Desktop','refused.py')),false);
  await submit('stopped.py');
  await until("document.body.innerText.includes('Creer ce fichier')", 'stop preview');
  await click('Arreter');
  await until("!document.querySelector('.chat-input__button--stop')", 'stop completion');
  assert.equal(fs.existsSync(path.join(root,'Desktop','stopped.py')),false);
  const workspace = await load('main/agents/agent-storage.service.ts').loadAgentWorkspace(settings.localFiles.agentsDirectory,'agent-ael');
  assert.ok(workspace.history.some(entry => entry.operation === 'write-file' && entry.status === 'success' && entry.result.includes('SHA-256')));
  assert.equal(workspace.permissions.rules.length,0);
  assert.equal(calls,5);
  for (let attempt = 0; attempt < 500; attempt++) {
    await delay(60);
    if (pendingIpc.size === 0) { await delay(100); if (pendingIpc.size === 0) break; }
  }
  assert.equal(pendingIpc.size,0,'IPC must finish before exit');
  assert.deepEqual(ipcErrors,[]);
  const report = { passed: true, electron: process.versions.electron, root, calls, checks: ['production renderer and preload IPC','settings and sidebar navigation','exact permission preview','one-time approval','verified creation and real agent history','refusal without write','Stop without write','no remembered grants'], screenshot: path.join(root,'permission.png') };
  fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
  clearTimeout(timeout);
  window.destroy();
  app.exit(0);
}).catch((error) => {
  fs.writeFileSync(path.join(root,'failure.txt'),String(error.stack));
  console.error(error.stack);
  clearTimeout(timeout);
  app.exit(1);
});
