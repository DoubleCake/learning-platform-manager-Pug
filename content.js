// SCXFKS自动跳转功能
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'checkCompletion') {
    checkScxfksCompletion();
  }
});

// 检查SCXFKS学习是否完成
function checkScxfksCompletion() {
  // 获取设置
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    
    if (!settings.completionCheck) {
      console.log('[学习平台管理器] 完成检测功能已关闭');
      return;
    }
    
    console.log('[学习平台管理器] 开始检查SCXFKS学习完成状态...');
    
    // 精确查找完成状态元素
    const completionElement = document.querySelector('div.chapter-score-wrap div.chapter-score.limit');
    
    if (completionElement) {
      console.log('[学习平台管理器] 找到完成状态元素');
      const textContent = completionElement.textContent || '';
      
      // 检查是否包含完成关键词
      if (textContent.includes('您已到达今日上限')) {
        console.log('[学习平台管理器] ✅ 检测到SCXFKS学习已完成');
        
        // 通知后台更新状态
        chrome.runtime.sendMessage({
          type: 'updatePlatformStatus',
          platformId: 'scxfks',
          progress: 100,
          status: 'completed'
        });
        
        // 显示页面通知
        showPageNotice('🎉 该网站的学习任务已经完成！', 'success');
      }
    }
  });
}

// 自动跳转功能
function scxfksAutoRedirect() {
  console.log('[学习平台管理器] SCXFKS自动跳转脚本启动');
  
  // 获取设置
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    
    if (!settings.autoRedirect) {
      console.log('[学习平台管理器] 自动跳转功能已关闭');
      showPageNotice('自动跳转功能已关闭，请在管理面板中开启', 'warning');
      return;
    }
    
    // 先检查是否已经学习完成
    if (document.querySelector('div.chapter-score-wrap div.chapter-score.limit')?.textContent?.includes('您已到达今日上限')) {
      console.log('[学习平台管理器] 检测到学习已完成，停止自动跳转');
      return;
    }
    
    // 等待页面完全加载
    setTimeout(() => {
      const nextUrl = findNextChapterLink();
      
      if (nextUrl) {
        console.log('[学习平台管理器] 找到下一章节链接:', nextUrl);
        
        // 显示倒计时提示
        showPageNotice(`将在 5 秒后跳转到下一章节...`, 'info');
        
        // 设置跳转定时器
        setTimeout(() => {
          showPageNotice('正在跳转到下一章节...', 'info');
          setTimeout(() => {
            window.location.href = nextUrl;
          }, 500);
        }, 5000);
      } else {
        console.log('[学习平台管理器] 未找到下一章节链接');
        showPageNotice('已经是最后一章节了', 'warning');
      }
    }, 2000);
  });
}

// 查找下一章节链接
function findNextChapterLink() {
  // 方法1：查找包含next_chapter类的图片的父链接
  const nextImg = document.querySelector('img.next_chapter');
  if (nextImg && nextImg.parentElement && nextImg.parentElement.href) {
    return nextImg.parentElement.href;
  }
  
  // 方法2：查找包含特定类名的链接
  const nextLink = document.querySelector('a[href*="/study/course/"][href*="/chapter/"]');
  if (nextLink && nextLink.href) {
    return nextLink.href;
  }
  
  return null;
}

// 显示页面提示
function showPageNotice(message, type = 'info') {
  // 移除可能存在的旧提示
  const oldNotices = document.querySelectorAll('.scxfks-page-notice');
  oldNotices.forEach(notice => notice.remove());
  
  const notice = document.createElement('div');
  notice.className = 'scxfks-page-notice';
  
  let backgroundColor = '#0078d7';
  switch(type) {
    case 'success':
      backgroundColor = '#107c10';
      break;
    case 'warning':
      backgroundColor = '#d83b01';
      break;
    case 'error':
      backgroundColor = '#e81123';
      break;
  }
  
  notice.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${backgroundColor};
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    z-index: 999999;
    font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
    font-size: 16px;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    border: 2px solid white;
    min-width: 300px;
  `;
  
  notice.innerHTML = message;
  document.body.appendChild(notice);
  
  // 3秒后自动消失
  setTimeout(() => {
    if (notice.parentNode) {
      notice.style.opacity = '0';
      notice.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (notice.parentNode) {
          notice.parentNode.removeChild(notice);
        }
      }, 500);
    }
  }, 3000);
}

// 页面加载完成后启动自动跳转
if (window.location.href.includes('https://www.scxfks.com/study/course/') && 
    window.location.href.includes('/chapter/')) {
  scxfksAutoRedirect();
}