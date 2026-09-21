#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const packageJson = require('../package.json');
const args = process.argv.slice(2);
const command = args[0] || 'app';

function openBrowser(url) {
  const start =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
      ? 'start ""'
      : 'xdg-open';
  exec(`${start} "${url}"`);
}

function printHelp() {
  console.log(`
\x1b[36mNeoChat CLI\x1b[0m (v${packageJson.version})

\x1b[1mUso:\x1b[0m
  npx neochat-desktop [comando] [opções]

\x1b[1mComandos:\x1b[0m
  \x1b[32mapp\x1b[0m (padrão)     Inicia a aplicação desktop NeoChat (Electron)
  \x1b[32mweb\x1b[0m             Inicia o servidor web local e abre o navegador
  \x1b[32minstall [versão]\x1b[0m Baixa e executa o instalador oficial (mais recente ou versão específica)
  \x1b[32m--version, -v\x1b[0m   Exibe a versão instalada
  \x1b[32m--help, -h\x1b[0m      Exibe esta mensagem de ajuda

\x1b[1mExemplos:\x1b[0m
  npx neochat-desktop
  npx neochat-desktop web
  npx neochat-desktop install
  npx neochat-desktop install v0.0.10
`);
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function startWebServer(port = 3000) {
  const distPath = path.join(__dirname, '..', 'dist');

  if (!fs.existsSync(distPath)) {
    console.error('\x1b[31m[Erro]\x1b[0m Diretório dist/ não encontrado. Execute "pnpm build" antes de iniciar a versão web.');
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    let filePath = path.join(distPath, reqPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distPath, 'index.html');
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Erro ao carregar arquivo: ${err.code}`);
        return;
      }
      res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
      res.end(content);
    });
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n✨ \x1b[32mNeoChat Web\x1b[0m rodando em: \x1b[36m${url}\x1b[0m`);
    console.log('Pressione Ctrl+C para encerrar o servidor.\n');
    openBrowser(url);
  });
}

function startDesktopApp() {
  console.log('⚡ Iniciando NeoChat Desktop...');
  let electronPath;
  try {
    electronPath = require('electron');
  } catch (e) {
    console.error('\x1b[31m[Erro]\x1b[0m Electron não encontrado nas dependências.');
    process.exit(1);
  }

  const appPath = path.join(__dirname, '..');
  const child = spawn(electronPath, [appPath, ...args.slice(1)], {
    stdio: 'inherit',
    windowsHide: false
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

function installApp() {
  if (process.platform !== 'win32') {
    console.log('ℹ️ O instalador automático no momento é suportado para Windows (.exe).');
    console.log('Para outras plataformas, acesse: https://github.com/giseldo/neochat-desktop/releases/latest');
    return;
  }

  const requestedVersion = args[1] && !args[1].startsWith('-') ? args[1] : null;
  const tag = requestedVersion ? (requestedVersion.startsWith('v') ? requestedVersion : `v${requestedVersion}`) : null;
  const installerUrl = tag
    ? `https://github.com/giseldo/neochat-desktop/releases/download/${tag}/NeoChat-Desktop-Setup.exe`
    : 'https://github.com/giseldo/neochat-desktop/releases/latest/download/NeoChat-Desktop-Setup.exe';
  const tmpFile = path.join(process.env.TEMP || '.', 'NeoChat-Desktop-Setup.exe');

  console.log('🔍 Identificando versão do instalador...');

  let detectedVersion = tag || '';

  function download(url, dest, cb) {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const loc = response.headers.location;
        const vMatch = loc && loc.match(/\/releases\/download\/([^/]+)\//);
        if (vMatch && !detectedVersion) {
          detectedVersion = vMatch[1];
        }
        return download(loc, dest, cb);
      }

      if (response.statusCode !== 200) {
        console.error(`\x1b[31m[Erro no download]\x1b[0m Servidor retornou status HTTP ${response.statusCode}`);
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      let lastPrintedPercent = -1;

      console.log(`⬇️  Baixando instalador do NeoChat Desktop ${detectedVersion ? `(\x1b[36m${detectedVersion}\x1b[0m)` : ''}...`);

      const file = fs.createWriteStream(dest);
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const percent = Math.floor((downloadedBytes / totalBytes) * 100);
          if (percent !== lastPrintedPercent && percent % 5 === 0) {
            lastPrintedPercent = percent;
            const currentMB = (downloadedBytes / (1024 * 1024)).toFixed(1);
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
            const barLength = 25;
            const filled = Math.round((percent / 100) * barLength);
            const bar = '█'.repeat(filled) + '-'.repeat(barLength - filled);
            process.stdout.write(`\r   [${bar}] ${percent}% (${currentMB}MB / ${totalMB}MB)`);
          }
        }
      });

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          if (totalBytes > 0) process.stdout.write('\n');
          cb(detectedVersion);
        });
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      console.error('\x1b[31m[Erro no download]\x1b[0m', err.message);
    });
  }

  download(installerUrl, tmpFile, (version) => {
    console.log(`🚀 Executando instalador ${version ? `(${version})` : ''}...`);
    const child = spawn(tmpFile, [], { detached: true, stdio: 'ignore' });
    child.unref();
    console.log('✅ Instalador iniciado! Você já pode fechar este terminal.');
  });
}

switch (command) {
  case 'web':
    const portArg = args.find((a) => a.startsWith('--port='));
    const port = portArg ? parseInt(portArg.split('=')[1], 10) : 3000;
    startWebServer(port);
    break;

  case 'install':
  case 'setup':
    installApp();
    break;

  case '--version':
  case '-v':
    console.log(`v${packageJson.version}`);
    break;

  case '--help':
  case '-h':
  case 'help':
    printHelp();
    break;

  case 'app':
  case 'desktop':
  case 'start':
    startDesktopApp();
    break;

  default:
    if (command.startsWith('-')) {
      printHelp();
    } else {
      startDesktopApp();
    }
    break;
}
