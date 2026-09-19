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
  \x1b[32minstall\x1b[0m         Baixa e executa o instalador oficial mais recente
  \x1b[32m--version, -v\x1b[0m   Exibe a versão instalada
  \x1b[32m--help, -h\x1b[0m      Exibe esta mensagem de ajuda

\x1b[1mExemplos:\x1b[0m
  npx neochat-desktop
  npx neochat-desktop web
  npx neochat-desktop install
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

  const installerUrl = 'https://github.com/giseldo/neochat-desktop/releases/latest/download/NeoChat-Desktop-Setup.exe';
  const tmpFile = path.join(process.env.TEMP || '.', 'NeoChat-Desktop-Setup.exe');

  console.log('⬇️  Baixando instalador mais recente do NeoChat Desktop...');

  function download(url, dest, cb) {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return download(response.headers.location, dest, cb);
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(cb);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      console.error('\x1b[31m[Erro no download]\x1b[0m', err.message);
    });
  }

  download(installerUrl, tmpFile, () => {
    console.log('🚀 Executando instalador...');
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
