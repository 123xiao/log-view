// 全局变量
let socket = null;
let currentToken = null;
let currentLogFile = null;

// DOM元素
const loginPage = document.getElementById('login-page');
const mainPage = document.getElementById('main-page');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const currentUser = document.getElementById('current-user');
const logFilesList = document.getElementById('log-files-list');
const logFileSelector = document.getElementById('log-file-selector');
const logContentDisplay = document.getElementById('log-content-display');
const refreshBtn = document.getElementById('refresh-btn');
const startMonitorBtn = document.getElementById('start-monitor-btn');
const stopMonitorBtn = document.getElementById('stop-monitor-btn');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchHistory = document.getElementById('search-history');
const copyLogBtn = document.getElementById('copy-log-btn');
const themeToggle = document.getElementById('theme-toggle');

// API基础URL
const API_BASE = '/api';

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否有存储的token
    const storedToken = localStorage.getItem('logViewerToken');
    if (storedToken) {
        currentToken = storedToken;
        showMainPage();
        loadLogFiles();
        loadSearchHistory();
    }
    
    // 检查是否有存储的主题偏好
    const storedTheme = localStorage.getItem('logViewerTheme');
    if (storedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.textContent = '浅色模式';
    }
});

// 登录表单提交
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentToken = data.token;
            localStorage.setItem('logViewerToken', currentToken);
            showMainPage();
            loadLogFiles();
            loadSearchHistory();
        } else {
            loginError.textContent = data.error || '登录失败';
        }
    } catch (error) {
        loginError.textContent = '网络错误，请稍后重试';
    }
});

// 退出登录
logoutBtn.addEventListener('click', function() {
    currentToken = null;
    localStorage.removeItem('logViewerToken');
    showLoginPage();
    
    // 断开Socket连接
    if (socket) {
        socket.disconnect();
        socket = null;
    }
});

// 刷新日志文件列表
refreshBtn.addEventListener('click', function() {
    loadLogFiles();
    loadSearchHistory();
});

// 开始实时监控
startMonitorBtn.addEventListener('click', function() {
    if (!currentLogFile) {
        alert('请先选择一个日志文件');
        return;
    }
    
    startLogMonitoring(currentLogFile);
});

// 停止实时监控
stopMonitorBtn.addEventListener('click', function() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    startMonitorBtn.disabled = false;
    stopMonitorBtn.disabled = true;
});

// 搜索按钮点击
searchBtn.addEventListener('click', function() {
    const keyword = searchInput.value.trim();
    if (!keyword) {
        alert('请输入搜索关键词');
        return;
    }
    
    if (!currentLogFile) {
        alert('请先选择一个日志文件');
        return;
    }
    
    searchLogs(currentLogFile, keyword);
});

// 复制日志
copyLogBtn.addEventListener('click', function() {
    const logContent = logContentDisplay.textContent;
    if (!logContent) {
        alert('没有日志内容可复制');
        return;
    }
    
    // 检查是否支持 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        // 使用现代 Clipboard API
        navigator.clipboard.writeText(logContent)
            .then(() => {
                // 显示复制成功提示
                const originalText = copyLogBtn.textContent;
                copyLogBtn.textContent = '已复制!';
                setTimeout(() => {
                    copyLogBtn.textContent = originalText;
                }, 2000);
            })
            .catch(err => {
                // 降级到传统方法
                fallbackCopyTextToClipboard(logContent);
            });
    } else {
        // 使用传统方法
        fallbackCopyTextToClipboard(logContent);
    }
});

// 传统复制方法（兼容性方案）
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // 避免滚动到底部
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            // 显示复制成功提示
            const originalText = copyLogBtn.textContent;
            copyLogBtn.textContent = '已复制!';
            setTimeout(() => {
                copyLogBtn.textContent = originalText;
            }, 2000);
        } else {
            alert('复制失败');
        }
    } catch (err) {
        alert('复制失败: ' + err);
    }
    
    document.body.removeChild(textArea);
}

// 主题切换
themeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-theme');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    
    if (document.body.classList.contains('dark-theme')) {
        themeIcon.textContent = '☀️';
        localStorage.setItem('logViewerTheme', 'dark');
    } else {
        themeIcon.textContent = '🌙';
        localStorage.setItem('logViewerTheme', 'light');
    }
});

// 显示登录页面
function showLoginPage() {
    loginPage.classList.remove('hidden');
    mainPage.classList.add('hidden');
    loginError.textContent = '';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// 显示主页面
function showMainPage() {
    loginPage.classList.add('hidden');
    mainPage.classList.remove('hidden');
    currentUser.textContent = '管理员';
    
    // 初始化Socket连接
    initSocket();
}

// 初始化Socket连接
function initSocket() {
    if (socket) {
        socket.disconnect();
    }
    
    socket = io({
        transports: ['websocket'],
        auth: {
            token: currentToken
        }
    });
    
    socket.on('connect', function() {
        console.log('Socket连接已建立');
    });
    
    socket.on('log-initial', function(data) {
        logContentDisplay.textContent = data.content;
    });
    
    socket.on('log-update', function(data) {
        // 将新内容追加到显示区域
        logContentDisplay.textContent += '\n' + data.content;
        // 滚动到底部
        logContentDisplay.scrollTop = logContentDisplay.scrollHeight;
    });
    
    socket.on('error', function(data) {
        alert('实时监控错误: ' + data.message);
    });
}

// 加载日志文件列表
async function loadLogFiles() {
    try {
        const response = await fetch(`${API_BASE}/logs/files`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 清空现有列表
            logFilesList.innerHTML = '';
            logFileSelector.innerHTML = '<option value="">选择日志文件</option>';
            
            // 填充文件列表
            data.files.forEach(file => {
                // 侧边栏列表
                const li = document.createElement('li');
                li.textContent = file.name;
                li.dataset.path = file.path;
                li.addEventListener('click', function() {
                    selectLogFile(file.path);
                });
                logFilesList.appendChild(li);
                
                // 下拉选择框
                const option = document.createElement('option');
                option.value = file.path;
                option.textContent = file.name;
                logFileSelector.appendChild(option);
            });
        } else {
            alert('加载日志文件列表失败: ' + data.error);
        }
    } catch (error) {
        alert('网络错误，请稍后重试');
    }
}

// 选择日志文件
function selectLogFile(filePath) {
    currentLogFile = filePath;
    logFileSelector.value = filePath;
    
    // 加载文件内容
    loadLogFileContent(filePath);
}

// 日志文件选择器变更
logFileSelector.addEventListener('change', function() {
    const selectedFile = logFileSelector.value;
    if (selectedFile) {
        selectLogFile(selectedFile);
    }
});

// 加载日志文件内容
async function loadLogFileContent(filePath) {
    try {
        const response = await fetch(`${API_BASE}/logs/content?filePath=${encodeURIComponent(filePath)}&lines=200`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            logContentDisplay.textContent = data.content;
        } else {
            alert('加载日志内容失败: ' + data.error);
        }
    } catch (error) {
        alert('网络错误，请稍后重试');
    }
}

// 开始日志监控
function startLogMonitoring(filePath) {
    if (!socket) {
        initSocket();
    }
    
    socket.emit('start-log-monitor', { filePath: filePath });
    
    startMonitorBtn.disabled = true;
    stopMonitorBtn.disabled = false;
}

// 搜索日志
async function searchLogs(filePath, keyword) {
    try {
        const response = await fetch(`${API_BASE}/logs/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ 
                filePath: filePath, 
                keyword: keyword,
                saveHistory: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 直接在主日志区域显示搜索结果
            logContentDisplay.textContent = `搜索关键词: ${keyword}\n匹配行数: ${data.count}\n\n${data.matches.join('\n')}`;
            
            // 重新加载搜索历史
            loadSearchHistory();
        } else {
            alert('搜索失败: ' + data.error);
        }
    } catch (error) {
        alert('网络错误，请稍后重试');
    }
}

// 搜索日志但不保存到历史记录
async function searchLogsNoHistory(filePath, keyword) {
    try {
        const response = await fetch(`${API_BASE}/logs/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ 
                filePath: filePath, 
                keyword: keyword,
                saveHistory: false
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 直接在主日志区域显示搜索结果
            logContentDisplay.textContent = `搜索关键词: ${keyword}\n匹配行数: ${data.count}\n\n${data.matches.join('\n')}`;
        } else {
            alert('搜索失败: ' + data.error);
        }
    } catch (error) {
        alert('网络错误，请稍后重试');
    }
}

// 加载搜索历史
async function loadSearchHistory() {
    try {
        const response = await fetch(`${API_BASE}/history`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 清空现有列表
            searchHistory.innerHTML = '';
            
            // 填充历史记录
            data.history.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div><strong>${item.keyword}</strong></div>
                    <div style="font-size: 0.8em; color: #666;">
                        ${new Date(item.timestamp).toLocaleString()} 
                        (${item.matches} 条匹配)
                        <span style="float: right; cursor: pointer; color: #e74c3c;" 
                              onclick="deleteHistory(${item.id})">删除</span>
                    </div>
                `;
                li.style.borderBottom = '1px solid #eee';
                li.style.paddingBottom = '0.5rem';
                li.style.marginBottom = '0.5rem';
                
                // 点击历史记录重新搜索，不保存到历史记录
                li.addEventListener('click', function(e) {
                    if (e.target.tagName !== 'SPAN') {
                        if (currentLogFile) {
                            searchInput.value = item.keyword;
                            searchLogsNoHistory(currentLogFile, item.keyword);
                        } else {
                            alert('请先选择一个日志文件');
                        }
                    }
                });
                
                searchHistory.appendChild(li);
            });
        } else {
            console.error('加载搜索历史失败:', data.error);
        }
    } catch (error) {
        console.error('加载搜索历史错误:', error);
    }
}

// 删除搜索历史
async function deleteHistory(id) {
    try {
        const response = await fetch(`${API_BASE}/history/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 重新加载搜索历史
            loadSearchHistory();
        } else {
            alert('删除历史记录失败: ' + data.error);
        }
    } catch (error) {
        alert('网络错误，请稍后重试');
    }
}

// 页面卸载时断开Socket连接
window.addEventListener('beforeunload', function() {
    if (socket) {
        socket.disconnect();
    }
});