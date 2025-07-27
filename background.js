
// 后台服务脚本
chrome.runtime.onInstalled.addListener(() => {
  console.log('学习平台管理器插件已安装');
  
  // 初始化默认数据
  chrome.storage.local.get(['platforms', 'settings'], (result) => {
    if (!result.platforms) {
      const defaultPlatforms = [
        {
          id: 'scxfks',
          name: 'SCXFKS学习平台',
          icon: '📚',
          progress: 0,
          status: 'not-started',
          lastVisit: null,
          notes: '',
          domain: 'www.scxfks.com'
        },
        {
          id: 'xuexi',
          name: '学习强国',
          icon: '🇨🇳',
          progress: 0,
          status: 'not-started',
          lastVisit: null,
          notes: '',
          domain: 'xuexi.cn'
        },
        {
          id: 'mooc',
          name: '中国大学MOOC',
          icon: '🎓',
          progress: 0,
          status: 'not-started',
          lastVisit: null,
          notes: '',
          domain: 'www.icourse163.org'
        }
      ];
      chrome.storage.local.set({ platforms: defaultPlatforms });
    }
    
    if (!result.settings) {
      const defaultSettings = {
        notifications: true,
        autoRedirect: true,
        completionCheck: true
      };
      chrome.storage.local.set({ settings: defaultSettings });
    }
  });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'updatePlatformStatus') {
    chrome.storage.local.get(['platforms'], (result) => {
      const platforms = result.platforms || [];
      const platformIndex = platforms.findIndex(p => p.id === request.platformId);
      
      if (platformIndex !== -1) {
        platforms[platformIndex].progress = request.progress;
        platforms[platformIndex].status = request.status;
        platforms[platformIndex].lastVisit = new Date().toISOString();
        
        chrome.storage.local.set({ platforms }, () => {
          // 发送通知给所有打开的popup页面
          chrome.runtime.sendMessage({
            type: 'platformsUpdated',
            platforms
          });
          
          // 显示桌面通知
          if (request.status === 'completed') {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon48.png',
              title: '学习完成通知',
              message: `${platforms[platformIndex].name} 学习已完成！`
            });
          }
        });
      }
    });
  }
});

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // 检查是否是SCXFKS课程页面
    if (tab.url && tab.url.includes('https://www.scxfks.com/study/course/') && 
        tab.url.includes('/chapter/')) {
      // 发送消息给内容脚本
      chrome.tabs.sendMessage(tabId, {
        type: 'checkCompletion'
      });
    }
  }
});