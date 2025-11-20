const fs = require('fs-extra');
const path = require('path');

// 确保打包前必要的资源被正确复制
async function prepareBuild() {
  try {
    // 确保public目录存在
    await fs.ensureDir(path.join(__dirname, 'public'));
    
    // 检查socket.io客户端库是否存在
    const socketIoClientPath = path.join(__dirname, 'node_modules', 'socket.io', 'client-dist');
    const publicSocketIoPath = path.join(__dirname, 'public', 'socket.io');
    
    if (await fs.pathExists(socketIoClientPath)) {
      // 复制socket.io客户端库到public目录
      await fs.copy(socketIoClientPath, publicSocketIoPath);
      console.log('Socket.IO客户端库已复制到public目录');
    } else {
      console.log('警告: Socket.IO客户端库未找到');
    }
    
    console.log('构建准备完成');
  } catch (error) {
    console.error('构建准备失败:', error.message);
    process.exit(1);
  }
}

prepareBuild();