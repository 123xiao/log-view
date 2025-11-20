// 日志查看平台配置文件
module.exports = {
  // 服务器端口
  port: 3000,
  
  // 认证配置
  auth: {
    // 默认管理员账户
    admin: {
      username: 'admin',
      password: '$2a$10$tuVWwTBc1kS/nXh6nth/PerTlUoG3Dgcug4YVun885DMi5lD3KYXe' // 123456 加密后的密码
    },
    jwtSecret: 'your-jwt-secret',
    tokenExpire: '24h'
  },
  
  // 日志配置
  log: {
    // 默认日志目录
    directory: '\\logs',
    // 主日志文件
    mainFile: '\\logs\\server.log'
  },
  
  // 历史记录存储路径
  history: {
    file: './data/history.json'
  }
};