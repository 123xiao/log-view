const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// 确保dist目录存在
const distDir = path.join(__dirname, 'dist');
fs.ensureDirSync(distDir);

// 构建不同平台的可执行文件
console.log('开始构建Windows可执行文件...');
try {
  execSync('npx pkg . --targets=node16-win-x64 --output=dist/log-viewer-win.exe', { stdio: 'inherit' });
  console.log('Windows可执行文件构建完成: dist/log-viewer-win.exe');
} catch (error) {
  console.error('Windows可执行文件构建失败:', error.message);
}

console.log('开始构建Linux可执行文件...');
try {
  execSync('npx pkg . --targets=node16-linux-x64 --output=dist/log-viewer-linux', { stdio: 'inherit' });
  console.log('Linux可执行文件构建完成: dist/log-viewer-linux');
} catch (error) {
  console.error('Linux可执行文件构建失败:', error.message);
}

console.log('开始构建macOS可执行文件...');
try {
  execSync('npx pkg . --targets=node16-macos-x64 --output=dist/log-viewer-mac', { stdio: 'inherit' });
  console.log('macOS可执行文件构建完成: dist/log-viewer-mac');
} catch (error) {
  console.error('macOS可执行文件构建失败:', error.message);
}

console.log('所有平台构建完成!');