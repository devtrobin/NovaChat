const fs = require('node:fs/promises');
const path = require('node:path');
const webpack = require('webpack');
const { copyRuntimeDependencies } = require('../../forge.runtime-assets.ts');

async function buildHarness(project, appDirectory) {
  const manifest = JSON.parse(await fs.readFile(path.join(project, 'package.json'), 'utf8'));
  await fs.mkdir(appDirectory, { recursive: true });
  await fs.writeFile(path.join(appDirectory, 'package.json'), JSON.stringify({
    name: 'nova-chat-ari-qualification', productName: 'NovaChat ARI qualification',
    version: manifest.version, main: '.webpack/main/index.js',
    dependencies: manifest.dependencies,
  }, null, 2));
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: 'production', target: 'electron-main', context: project,
      entry: path.join(project, 'tests/electron/ari/main.ts'),
      output: { path: path.join(appDirectory, '.webpack/main'), filename: 'index.js' },
      optimization: { minimize: false }, devtool: false,
      resolve: { extensions: ['.ts', '.js'], extensionAlias: { '.js': ['.ts', '.js'] } },
      externals: [({ request }, callback) => {
        if (request && !request.startsWith('.') && !path.isAbsolute(request)) {
          callback(null, `commonjs ${request}`);
        } else callback();
      }],
      module: { rules: [{ test: /\.ts$/, loader: require.resolve('ts-loader'), options: {
        configFile: path.join(project, 'tests/electron/ari/tsconfig.json'), transpileOnly: true,
      } }] },
    });
    compiler.run((error, stats) => {
      compiler.close((closeError) => {
        if (error || closeError) reject(error || closeError);
        else if (!stats || stats.hasErrors()) reject(new Error(stats?.toString({ all: false, errors: true }) || 'Webpack produced no statistics.'));
        else resolve();
      });
    });
  });
  await copyRuntimeDependencies(appDirectory, project);
}

module.exports = { buildHarness };
