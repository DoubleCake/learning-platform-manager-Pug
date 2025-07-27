// 初始化数据
async function initData() {
  // 获取平台数据
  const platforms = await new Promise(resolve => {
    chrome.storage.local.get(['platforms'], result => {
      resolve(result.platforms || []);
    });
  });
  
  // 获取设置
  const settings = await new Promise(resolve => {
    chrome.storage.local.get(['settings'], result => {
      resolve(result.settings || {
        notifications: true,
        autoRedirect: true,
        completionCheck: true
      });
    });
  });
  
  return { platforms, settings };
}

// 保存平台数据
function savePlatforms(platforms) {
  chrome.storage.local.set({ platforms });
}

// 保存设置
function saveSettings(settings) {
  chrome.storage.local.set({ settings });
}

// 显示通知
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = 'notification';
  
  // 添加类型类
  if (type === 'success') {
    notification.classList.add('success');
  } else if (type === 'warning') {
    notification.classList.add('warning');
  } else if (type === 'error') {
    notification.classList.add('error');
  }
  
  // 显示通知
  notification.classList.add('show');
  
  // 3秒后隐藏
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// 渲染平台列表
function renderPlatforms(platforms) {
  const platformList = document.getElementById('platform-list');
  platformList.innerHTML = '';
  
  platforms.forEach(platform => {
    const platformItem = document.createElement('div');
    platformItem.className = 'platform-item';
    
    let statusText, statusClass;
    if (platform.progress === 100) {
      statusText = '✅ 已完成';
      statusClass = 'status-completed';
    } else if (platform.progress > 0) {
      statusText = `🔄 进行中 (${platform.progress}%)`;
      statusClass = 'status-in-progress';
    } else {
      statusText = '⭕ 未开始';
      statusClass = 'status-not-started';
    }
    
    platformItem.innerHTML = `
      <div class="platform-header">
        <div class="platform-icon">${platform.icon}</div>
        <div class="platform-info">
          <div class="platform-name">${platform.name}</div>
          <div class="platform-status ${statusClass}">${statusText}</div>
        </div>
      </div>
      <div class="progress-container">
        <div class="progress-header">
          <span>学习进度</span>
          <span>${platform.progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${platform.progress}%"></div>
        </div>
      </div>
      <div class="platform-actions">
        <button class="btn btn-sm btn-secondary view-notes" data-id="${platform.id}">查看笔记</button>
        <button class="btn btn-sm btn-primary visit-platform" data-id="${platform.id}">访问平台</button>
        <button class="btn btn-sm btn-warning update-progress" data-id="${platform.id}">更新进度</button>
      </div>
    `;
    
    platformList.appendChild(platformItem);
  });
  
  // 添加事件监听
  document.querySelectorAll('.visit-platform').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const platformId = e.target.getAttribute('data-id');
      visitPlatform(platformId);
    });
  });
  
  document.querySelectorAll('.update-progress').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const platformId = e.target.getAttribute('data-id');
      updateProgress(platformId);
    });
  });
  
  document.querySelectorAll('.view-notes').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const platformId = e.target.getAttribute('data-id');
      viewNotes(platformId);
    });
  });
}

// 更新概览统计
function updateSummary(platforms) {
  const completed = platforms.filter(p => p.progress === 100).length;
  const inProgress = platforms.filter(p => p.progress > 0 && p.progress < 100).length;
  const notStarted = platforms.filter(p => p.progress === 0).length;
  
  document.getElementById('completed-count').textContent = completed;
  document.getElementById('in-progress-count').textContent = inProgress;
  document.getElementById('not-started-count').textContent = notStarted;
  
  // 更新上次更新时间
  document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
}

// 访问平台
function visitPlatform(platformId) {
  chrome.storage.local.get(['platforms'], (result) => {
    const platforms = result.platforms || [];
    const platform = platforms.find(p => p.id === platformId);
    
    if (platform) {
      showNotification(`正在访问: ${platform.name}`, 'info');
      chrome.tabs.create({ url: `https://${platform.domain}` });
    }
  });
}

// 更新进度
async function updateProgress(platformId) {
  const { platforms } = await initData();
  const platform = platforms.find(p => p.id === platformId);
  
  if (platform) {
    const newProgress = prompt(`请输入 ${platform.name} 的新进度 (0-100):`, platform.progress.toString());
    if (newProgress !== null && !isNaN(newProgress)) {
      const progress = Math.max(0, Math.min(100, parseInt(newProgress)));
      platform.progress = progress;
      
      // 更新状态
      if (progress === 100) {
        platform.status = 'completed';
      } else if (progress > 0) {
        platform.status = 'in-progress';
      } else {
        platform.status = 'not-started';
      }
      
      // 更新时间
      platform.lastVisit = new Date().toISOString();
      
      savePlatforms(platforms);
      renderPlatforms(platforms);
      updateSummary(platforms);
      
      if (progress === 100) {
        showNotification(`${platform.name} 已标记为完成`, 'success');
      } else {
        showNotification(`${platform.name} 进度已更新为 ${progress}%`, 'info');
      }
    }
  }
}

// 查看笔记
async function viewNotes(platformId) {
  const { platforms } = await initData();
  const platform = platforms.find(p => p.id === platformId);
  
  if (platform) {
    const notes = prompt(`编辑 ${platform.name} 的学习笔记:`, platform.notes);
    if (notes !== null) {
      platform.notes = notes;
      savePlatforms(platforms);
      showNotification(`${platform.name} 笔记已保存`, 'success');
    }
  }
}

// 初始化设置
function initSettings(settings) {
  document.getElementById('notifications-toggle').checked = settings.notifications;
  document.getElementById('auto-redirect-toggle').checked = settings.autoRedirect;
  document.getElementById('completion-check-toggle').checked = settings.completionCheck;
  
  // 添加设置变更监听
  document.getElementById('notifications-toggle').addEventListener('change', (e) => {
    settings.notifications = e.target.checked;
    saveSettings(settings);
    showNotification(`页面提示功能已 ${e.target.checked ? '开启' : '关闭'}`, e.target.checked ? 'success' : 'warning');
  });
  
  document.getElementById('auto-redirect-toggle').addEventListener('change', (e) => {
    settings.autoRedirect = e.target.checked;
    saveSettings(settings);
    showNotification(`自动跳转功能已 ${e.target.checked ? '开启' : '关闭'}`, e.target.checked ? 'success' : 'warning');
  });
  
  document.getElementById('completion-check-toggle').addEventListener('change', (e) => {
    settings.completionCheck = e.target.checked;
    saveSettings(settings);
    showNotification(`完成检测功能已 ${e.target.checked ? '开启' : '关闭'}`, e.target.checked ? 'success' : 'warning');
  });
}

// 初始化
async function init() {
  const { platforms, settings } = await initData();
  
  renderPlatforms(platforms);
  updateSummary(platforms);
  initSettings(settings);
  
  // 添加按钮事件
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    const { platforms } = await initData();
    renderPlatforms(platforms);
    updateSummary(platforms);
    showNotification('数据已刷新', 'success');
  });
  
  document.getElementById('export-btn').addEventListener('click', async () => {
    const { platforms } = await initData();
    const dataStr = JSON.stringify(platforms, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `学习平台数据_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('数据导出成功', 'success');
  });
  
  document.getElementById('check-btn').addEventListener('click', async () => {
    showNotification('正在检查所有平台完成状态...', 'info');
    
    // 发送消息给内容脚本检查完成状态
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'checkCompletion' });
      }
    });
    
    setTimeout(() => {
      showNotification('完成状态检查完毕', 'success');
    }, 1500);
  });
  
  // 监听来自后台的数据更新
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'platformsUpdated') {
      renderPlatforms(message.platforms);
      updateSummary(message.platforms);
    }
  });
}

// 启动初始化
document.addEventListener('DOMContentLoaded', init);