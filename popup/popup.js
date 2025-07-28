document.addEventListener('DOMContentLoaded', function() {
    // 获取当前标签页信息
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        
        // 加载平台数据并渲染
        loadPlatforms(currentTab.url);
        
        document.getElementById('current-platform').textContent = '检测中...';
        
        // 检测学习状态
        detectLearningStatus(currentTab);
    });
    
    // 绑定按钮事件
    document.getElementById('open-options').addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });
    
    document.getElementById('toggle-extension').addEventListener('click', function() {
        const button = this;
        toggleExtension(button);
    });
});

// 切换扩展状态
function toggleExtension(button) {
    // 发送消息到内容脚本切换暂停状态
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        
        chrome.tabs.sendMessage(currentTab.id, {action: "togglePause"}, function(response) {
            if (chrome.runtime.lastError) {
                console.log('发送消息失败:', chrome.runtime.lastError);
                return;
            }
            
            if (response && response.paused !== undefined) {
                if (response.paused) {
                    button.classList.add('paused');
                    button.textContent = '恢复';
                    button.style.background = '#d83b01';
                    button.style.color = 'white';
                } else {
                    button.classList.remove('paused');
                    button.textContent = '暂停';
                    button.style.background = '#f0f0f0';
                    button.style.color = '#323130';
                }
            }
        });
    });
}

function loadPlatforms(currentUrl) {
    chrome.storage.sync.get(['platforms'], function(result) {
        const platforms = result.platforms || [
            {
                id: 'scxfks',
                name: 'SCXFKS学习平台',
                icon: '📚',
                domain: 'scxfks.com',
                enabled: true
            },
            {
                id: 'xuexi',
                name: '学习强国',
                icon: '🇨🇳',
                domain: 'xuexi.cn',
                enabled: true
            },
            {
                id: 'mooc',
                name: '中国大学MOOC',
                icon: '🎓',
                domain: 'icourse163.org',
                enabled: true
            }
        ];
        
        renderPlatforms(platforms);
        
        // 识别当前平台
        let currentPlatform = null;
        for (let platform of platforms) {
            if (platform.enabled && currentUrl.includes(platform.domain)) {
                currentPlatform = platform;
                break;
            }
        }
        
        document.getElementById('current-platform').textContent = 
            currentPlatform ? currentPlatform.name : '未识别';
    });
}

function renderPlatforms(platforms) {
    const platformsList = document.getElementById('platforms-list');
    platformsList.innerHTML = '';
    
    platforms.forEach(platform => {
        if (!platform.enabled) return;
        
        const platformItem = document.createElement('div');
        platformItem.className = 'platform-item';
        platformItem.innerHTML = `
            <div class="platform-icon">${platform.icon}</div>
            <div class="platform-info">
                <div class="platform-name">${platform.name}</div>
                <div class="platform-domain">${platform.domain}</div>
            </div>
            <button class="platform-link" data-url="https://${platform.domain}">访问</button>
        `;
        
        platformsList.appendChild(platformItem);
    });
    
    // 绑定访问按钮事件
    document.querySelectorAll('.platform-link').forEach(button => {
        button.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            chrome.tabs.create({ url });
        });
    });
}

function detectLearningStatus(tab) {
    // 发送消息到内容脚本检测学习状态
    chrome.tabs.sendMessage(tab.id, {action: "getLearningStatus"}, function(response) {
        const statusElement = document.getElementById('learning-status');
        
        if (chrome.runtime.lastError) {
            statusElement.textContent = '未检测';
            statusElement.className = 'value';
            return;
        }
        
        if (response && response.status) {
            if (response.status === 'completed') {
                statusElement.textContent = '已完成';
                statusElement.className = 'value learning-completed';
            } else if (response.status === 'in-progress') {
                statusElement.textContent = '学习中';
                statusElement.className = 'value learning-in-progress';
            } else {
                statusElement.textContent = response.status;
                statusElement.className = 'value';
            }
        } else {
            statusElement.textContent = '未检测';
            statusElement.className = 'value';
        }
    });
}
