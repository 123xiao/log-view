# 构建可执行文件指南

## 支持的平台

- Windows (x64)
- Linux (x64)
- macOS (x64)

## 构建步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 构建特定平台

#### 构建Windows可执行文件
```bash
npm run build:win
```

#### 构建Linux可执行文件
```bash
npm run build:linux
```

#### 构建macOS可执行文件
```bash
npm run build:mac
```

### 3. 一键构建所有平台
```bash
npm run build
```

## 输出文件

构建后的可执行文件将位于 `dist/` 目录中：

- Windows: `dist/log-viewer-win.exe`
- Linux: `dist/log-viewer-linux`
- macOS: `dist/log-viewer-mac`

## 配置说明

### 外置配置文件

可执行文件支持外置配置，可以在运行目录下创建 `config.js` 文件来覆盖默认配置：

```javascript
module.exports = {
  port: 3000,
  auth: {
    admin: {
      username: 'admin',
      password: 'your-hashed-password'
    },
    jwtSecret: 'your-jwt-secret',
    tokenExpire: '24h'
  },
  log: {
    directory: './logs',
    mainFile: './logs/app.log'
  },
  history: {
    file: './data/history.json'
  }
};
```

### 运行可执行文件

```bash
# Windows
./dist/log-viewer-win.exe

# Linux/macOS
./dist/log-viewer-linux
./dist/log-viewer-mac
```

### 外置资源配置

可执行文件会自动包含以下资源：
- `public/` 目录下的所有前端资源
- `config.js` 配置文件
- `logs/` 日志目录
- `data/` 数据目录

如果需要使用外置资源，只需在可执行文件同目录下创建相应的目录和文件即可。