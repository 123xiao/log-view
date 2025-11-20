const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// 尝试加载外置配置文件，如果不存在则使用默认配置
let config;
try {
  const externalConfigPath = path.join(process.cwd(), 'config.js');
  if (fs.existsSync(externalConfigPath)) {
    config = require(externalConfigPath);
    console.log('使用外置配置文件:', externalConfigPath);
  } else {
    config = require('./config');
    console.log('使用默认配置文件');
  }
} catch (err) {
  console.error('配置文件加载失败，使用默认配置:', err.message);
  config = require('./config');
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中间件
app.use(cors());
app.use(express.json());
// 使用绝对路径提供静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 确保必要的目录存在
async function ensureDirectories() {
  // 使用绝对路径确保目录存在
  const logDir = path.resolve(config.log.directory);
  const historyDir = path.resolve(path.dirname(config.history.file));
  
  await fs.ensureDir(logDir);
  await fs.ensureDir(historyDir);
  
  // 创建示例日志文件（如果不存在）
  const mainLogFile = path.resolve(config.log.mainFile);
  if (!(await fs.pathExists(mainLogFile))) {
    await fs.writeFile(mainLogFile, '# 示例日志文件\n');
  }
  
  // 创建历史记录文件（如果不存在）
  const historyFile = path.resolve(config.history.file);
  if (!(await fs.pathExists(historyFile))) {
    await fs.writeJson(historyFile, []);
  }
}

// 认证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }
  
  jwt.verify(token, config.auth.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '访问令牌无效' });
    }
    req.user = user;
    next();
  });
}

// 登录接口
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证用户名和密码
    if (username === config.auth.admin.username) {
      const isValid = await bcrypt.compare(password, config.auth.admin.password);
      if (isValid) {
        // 生成 JWT token
        const token = jwt.sign(
          { username: config.auth.admin.username }, 
          config.auth.jwtSecret, 
          { expiresIn: config.auth.tokenExpire }
        );
        
        return res.json({ 
          success: true, 
          token,
          message: '登录成功' 
        });
      }
    }
    
    res.status(401).json({ 
      success: false, 
      error: '用户名或密码错误' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: '登录过程中发生错误' 
    });
  }
});

// 获取日志文件列表
app.get('/api/logs/files', authenticateToken, async (req, res) => {
  try {
    const logDir = config.log.directory;
    const files = await fs.readdir(logDir);
    const logFiles = files.filter(file => 
      path.extname(file).toLowerCase() === '.log' || 
      path.extname(file).toLowerCase() === '.txt'
    ).map(file => ({
      name: file,
      path: path.join(logDir, file)
    }));
    
    res.json({ 
      success: true, 
      files: logFiles 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: '获取日志文件列表失败' 
    });
  }
});

// 获取日志内容
app.get('/api/logs/content', authenticateToken, async (req, res) => {
  try {
    const { filePath, lines = 100 } = req.query;
    
    // 验证文件路径是否在日志目录内
    const resolvedPath = path.resolve(filePath);
    const logDirResolved = path.resolve(config.log.directory);
    
    if (!resolvedPath.startsWith(logDirResolved)) {
      return res.status(403).json({ 
        success: false, 
        error: '无权访问该文件' 
      });
    }
    
    if (!(await fs.pathExists(resolvedPath))) {
      return res.status(404).json({ 
        success: false, 
        error: '文件不存在' 
      });
    }
    
    // 读取文件最后几行
    const content = await fs.readFile(resolvedPath, 'utf8');
    const allLines = content.split('\n');
    const recentLines = allLines.slice(-lines);
    
    res.json({ 
      success: true, 
      content: recentLines.join('\n'),
      totalLines: allLines.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: '读取日志内容失败' 
    });
  }
});

// 搜索日志内容
app.post('/api/logs/search', authenticateToken, async (req, res) => {
  try {
    const { filePath, keyword, saveHistory = true } = req.body;
    
    // 验证文件路径是否在日志目录内
    const resolvedPath = path.resolve(filePath);
    const logDirResolved = path.resolve(config.log.directory);
    
    if (!resolvedPath.startsWith(logDirResolved)) {
      return res.status(403).json({ 
        success: false, 
        error: '无权访问该文件' 
      });
    }
    
    if (!(await fs.pathExists(resolvedPath))) {
      return res.status(404).json({ 
        success: false, 
        error: '文件不存在' 
      });
    }
    
    // 读取文件内容
    const content = await fs.readFile(resolvedPath, 'utf8');
    const lines = content.split('\n');
    
    // 搜索包含关键词的行
    const matchedLines = lines.filter(line => line.includes(keyword));
    
    // 保存搜索历史
    if (saveHistory && matchedLines.length > 0) {
      try {
        let history = [];
        if (await fs.pathExists(config.history.file)) {
          history = await fs.readJson(config.history.file);
        }
        
        const historyEntry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          keyword,
          filePath,
          matches: matchedLines.length
        };
        
        history.push(historyEntry);
        // 只保留最近100条记录
        if (history.length > 100) {
          history = history.slice(-100);
        }
        
        await fs.writeJson(config.history.file, history);
      } catch (historyError) {
        console.error('保存历史记录失败:', historyError);
      }
    }
    
    res.json({ 
      success: true, 
      matches: matchedLines,
      count: matchedLines.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: '搜索日志内容失败' 
    });
  }
});

// 获取搜索历史
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    let history = [];
    if (await fs.pathExists(config.history.file)) {
      history = await fs.readJson(config.history.file);
    }
    
    res.json({ 
      success: true, 
      history: history.reverse() // 最新的在前面
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: '获取搜索历史失败' 
    });
  }
});

// 删除搜索历史
app.delete('/api/history/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let history = [];
    
    if (await fs.pathExists(config.history.file)) {
      history = await fs.readJson(config.history.file);
    }
    
    // 过滤掉指定的历史记录
    history = history.filter(entry => entry.id.toString() !== id);
    await fs.writeJson(config.history.file, history);
    
    res.json({ 
      success: true, 
      message: '历史记录已删除' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: '删除搜索历史失败' 
    });
  }
});

// 实时日志监控
io.on('connection', (socket) => {
  console.log('用户已连接');
  
  socket.on('start-log-monitor', async (data) => {
    const { filePath } = data;
    
    try {
      // 验证文件路径是否在日志目录内
      const resolvedPath = path.resolve(filePath);
      const logDirResolved = path.resolve(config.log.directory);
      
      if (!resolvedPath.startsWith(logDirResolved)) {
        socket.emit('error', { message: '无权访问该文件' });
        return;
      }
      
      if (!(await fs.pathExists(resolvedPath))) {
        socket.emit('error', { message: '文件不存在' });
        return;
      }
      
      // 监听文件变化
      const watcher = fs.watch(resolvedPath, (eventType) => {
        if (eventType === 'change') {
          // 文件发生变化时，读取最新内容
          fs.readFile(resolvedPath, 'utf8')
            .then(content => {
              const lines = content.split('\n');
              // 发送最后几行
              const recentLines = lines.slice(-10);
              socket.emit('log-update', { 
                content: recentLines.join('\n'),
                lines: recentLines.length
              });
            })
            .catch(err => {
              socket.emit('error', { message: '读取文件失败' });
            });
        }
      });
      
      // 存储watcher以便后续清理
      socket.logWatcher = watcher;
      
      // 发送初始内容
      const content = await fs.readFile(resolvedPath, 'utf8');
      const lines = content.split('\n');
      const recentLines = lines.slice(-20);
      socket.emit('log-initial', { 
        content: recentLines.join('\n'),
        lines: recentLines.length
      });
      
    } catch (error) {
      socket.emit('error', { message: '启动日志监控失败' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('用户断开连接');
    // 清理资源
    if (socket.logWatcher) {
      socket.logWatcher.close();
    }
  });
});

// 启动服务器
async function startServer() {
  try {
    await ensureDirectories();
    
    const PORT = process.env.PORT || config.port;
    server.listen(PORT, () => {
      console.log(`日志查看平台启动成功`);
      console.log(`访问地址: http://localhost:${PORT}`);
      console.log(`默认账户: ${config.auth.admin.username}`);
      console.log(`默认密码: 123456`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
  }
}

startServer();