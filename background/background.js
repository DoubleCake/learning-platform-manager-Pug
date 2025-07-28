
// 监听扩展安装
chrome.runtime.onInstalled.addListener(() => {
    // 初始化默认设置
    chrome.storage.sync.set({
        settings: {
            redirectTime: 5,
            autoRedirect: true,
            showCountdown: true,
            playSound: true
        },
        platforms: [
            { id: 'scxfks', name: 'SCXFKS学习平台', icon: '📚', domain: 'scxfks.com', enabled: true },
            { id: 'xuexi', name: '学习强国', icon: '🇨🇳', domain: 'xuexi.cn', enabled: true },
            { id: 'mooc', name: '中国大学MOOC', icon: '🎓', domain: 'icourse163.org', enabled: true }
        ]
    });
    console.log('学习平台管理器已安装并初始化');
});

// 监听内容脚本消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[后台] 收到消息:', request);
    if (request.action === "getSettings") {
        chrome.storage.sync.get(['settings', 'platforms'], (result) => {
            console.log('[后台] 返回设置:', result);
            sendResponse({
                settings: result.settings || {
                    redirectTime: 5,
                    autoRedirect: true,
                    showCountdown: true,
                    playSound: true
                },
                platforms: result.platforms || []
            });
        });
        return true; // 异步响应
    }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 只在页面加载完成时执行
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('[后台] 标签页加载完成:', tab.url);
        // 检查是否是SCXFKS学习平台相关页面
        if (tab.url.includes('scxfks.com/study')) {
            console.log('[后台] 检测到SCXFKS学习页面,注入内容脚本');
            
            // 注入内容脚本
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content-scripts/content.js']
            }).then(() => {
                console.log('[后台] 内容脚本注入成功');
            }).catch(err => {
                console.log('[后台] 内容脚本注入失败:', err);
            });
        }
    }
});

console.log('后台脚本加载完成');
