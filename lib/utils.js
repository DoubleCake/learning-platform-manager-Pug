// 工具函数库
const Utils = {
  // 检测学习是否完成
  isLearningCompleted: function() {
    // 通用检测方法
    const completionIndicators = [
      '.completed-indicator',
      '.finish-button',
      '.next-chapter',
      '[data-completed="true"]'
    ];
    
    for (let selector of completionIndicators) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    
    return false;
  },
  
  // 获取下一个章节链接
  getNextChapterUrl: function() {
    const nextButtons = document.querySelectorAll('.next-button, .next-chapter, .continue-button');
    for (let button of nextButtons) {
      if (button.tagName === 'A') {
        return button.href;
      }
    }
    return null;
  },
  
  // 播放提示音
  playCompletionSound: function() {
    try {
      const audio = new Audio(chrome.runtime.getURL('sounds/completed.mp3'));
      audio.play().catch(e => console.log('音频播放失败:', e));
    } catch (e) {
      console.log('无法播放音频:', e);
    }
  },
  
  // 格式化时间
  formatTime: function(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
};
