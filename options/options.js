// DOM元素
const platformsContainer = document.getElementById('platforms-container');
const countdownMinutes = document.getElementById('countdown-minutes');
const countdownSeconds = document.getElementById('countdown-seconds');
const countdownProgress = document.getElementById('countdown-progress');
let countdownValue = 5;
let countdownInterval = null;
let platforms = [];
let settings = {};

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 加载设置
    loadSettings();
    
    // 绑定事件
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('reset-settings').addEventListener('click', resetSettings);
    document.getElementById('add-platform-btn').addEventListener('click', addNewPlatform);
    document.getElementById('start-countdown').addEventListener('click', startCountdown);
    document.getElementById('reset-countdown').addEventListener('click', resetCountdown);
});

// 渲染平台列表
function renderPlatforms() {
    platformsContainer.innerHTML = '';
    
    platforms.forEach((platform, index) => {
        const platformCard = document.createElement('div');
        platformCard.className = 'platform-card';
        platformCard.dataset.id = platform.id;
        platformCard.innerHTML = `
            <div class="platform-header">
                <div class="platform-icon">${platform.icon}</div>
                <div>
                    <div class="platform-name">${platform.name}</div>
                    <div class="platform-domain">${platform.domain}</div>
                </div>
            </div>
            <div class="switch-label">启用</div>
            <label class="switch">
                <input type="checkbox" id="platform-enabled-${index}" ${platform.enabled ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
            <div class="form-group">
                <label for="platform-name-${index}">平台名称</label>
                <input type="text" id="platform-name-${index}" value="${platform.name}">
            </div>
            <div class="form-group">
                <label for="platform-icon-${index}">平台图标</label>
                <select id="platform-icon-${index}">
                    <option value="📚" ${platform.icon === '📚' ? 'selected' : ''}>📚 书籍</option>
                    <option value="🇨🇳" ${platform.icon === '🇨🇳' ? 'selected' : ''}>🇨🇳 国旗</option>
                    <option value="🎓" ${platform.icon === '🎓' ? 'selected' : ''}>🎓 学位帽</option>
                    <option value="💻" ${platform.icon === '💻' ? 'selected' : ''}>💻 电脑</option>
                    <option value="📱" ${platform.icon === '📱' ? 'selected' : ''}>📱 手机</option>
                    <option value="🎥" ${platform.icon === '🎥' ? 'selected' : ''}>🎥 视频</option>
                </select>
            </div>
            <div class="form-group">
                <label for="platform-domain-${index}">平台域名</label>
                <input type="text" id="platform-domain-${index}" value="${platform.domain}">
            </div>
            <div class="platform-actions">
                <button class="btn btn-primary save-platform" data-index="${index}">保存</button>
                <button class="btn btn-danger remove-platform" data-index="${index}">删除</button>
            </div>
        `;
        
        platformsContainer.appendChild(platformCard);
    });
    
    // 绑定平台按钮事件
    document.querySelectorAll('.save-platform').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            savePlatform(index);
        });
    });
    
    document.querySelectorAll('.remove-platform').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removePlatform(index);
        });
    });
}

// 保存平台设置
function savePlatform(index) {
    const name = document.getElementById(`platform-name-${index}`).value;
    const icon = document.getElementById(`platform-icon-${index}`).value;
    const domain = document.getElementById(`platform-domain-${index}`).value;
    const enabled = document.getElementById(`platform-enabled-${index}`).checked;
    
    platforms[index] = {
        ...platforms[index],
        name,
        icon,
        domain,
        enabled
    };
    
    // 显示保存成功提示
    showNotification(`"${name}" 设置已保存！`, 'success');
}

// 删除平台
function removePlatform(index) {
    if (confirm(`确定要删除 "${platforms[index].name}" 吗？`)) {
        const removedPlatform = platforms.splice(index, 1)[0];
        renderPlatforms();
        showNotification(`"${removedPlatform.name}" 已删除！`, 'warning');
    }
}

// 添加新平台
function addNewPlatform() {
    const newPlatform = {
        id: 'new-' + Date.now(),
        name: '新学习平台',
        icon: '📚',
        domain: 'example.com',
        enabled: true
    };
    
    platforms.push(newPlatform);
    renderPlatforms();
    
    showNotification('新平台已添加！', 'info');
}

// 加载设置
function loadSettings() {
    chrome.storage.sync.get(['settings', 'platforms'], (result) => {
        settings = result.settings || {
            redirectTime: 5,
            courseRedirectTime: 3,
            chapterRedirectTime: 5,
            autoRedirect: true,
            showCountdown: true,
            playSound: true
        };
        
        platforms = result.platforms || [
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
        
        // 更新UI
        document.getElementById('redirect-time').value = settings.redirectTime;
        document.getElementById('course-redirect-time').value = settings.courseRedirectTime;
        document.getElementById('chapter-redirect-time').value = settings.chapterRedirectTime;
        document.getElementById('auto-redirect-toggle').checked = settings.autoRedirect;
        document.getElementById('countdown-toggle').checked = settings.showCountdown;
        document.getElementById('sound-toggle').checked = settings.playSound;
        
        // 渲染平台列表
        renderPlatforms();
        
        // 更新倒计时显示
        countdownValue = settings.redirectTime;
        updateCountdownDisplay();
    });
}

// 保存设置
function saveSettings() {
    // 更新设置对象
    settings.redirectTime = parseInt(document.getElementById('redirect-time').value) || 5;
    settings.courseRedirectTime = parseInt(document.getElementById('course-redirect-time').value) || 3;
    settings.chapterRedirectTime = parseInt(document.getElementById('chapter-redirect-time').value) || 5;
    settings.autoRedirect = document.getElementById('auto-redirect-toggle').checked;
    settings.showCountdown = document.getElementById('countdown-toggle').checked;
    settings.playSound = document.getElementById('sound-toggle').checked;
    
    // 收集平台数据
    const updatedPlatforms = [];
    document.querySelectorAll('.platform-card').forEach((card, index) => {
        updatedPlatforms.push({
            id: card.dataset.id,
            name: document.getElementById(`platform-name-${index}`).value,
            icon: document.getElementById(`platform-icon-${index}`).value,
            domain: document.getElementById(`platform-domain-${index}`).value,
            enabled: document.getElementById(`platform-enabled-${index}`).checked
        });
    });
    
    platforms = updatedPlatforms;
    
    // 保存到chrome.storage
    chrome.storage.sync.set({ settings, platforms }, () => {
        showNotification('所有设置已成功保存！', 'success');
    });
}

// 重置设置
function resetSettings() {
    if (confirm('确定要恢复默认设置吗？所有自定义设置将被重置。')) {
        chrome.storage.sync.remove(['settings', 'platforms'], () => {
            location.reload();
        });
    }
}

// 启动倒计时
function startCountdown() {
    // 清除现有计时器
    if (countdownInterval) clearInterval(countdownInterval);
    
    // 获取设置的时间
    countdownValue = settings.redirectTime;
    updateCountdownDisplay();
    countdownProgress.style.width = '0%';
    
    // 更新按钮状态
    document.getElementById('start-countdown').disabled = true;
    document.getElementById('start-countdown').textContent = '运行中...';
    
    // 启动计时器
    countdownInterval = setInterval(() => {
        countdownValue--;
        updateCountdownDisplay();
        
        // 计算进度百分比
        const progress = 100 - (countdownValue / settings.redirectTime * 100);
        countdownProgress.style.width = `${progress}%`;
        
        // 结束计时
        if (countdownValue <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            document.getElementById('start-countdown').disabled = false;
            document.getElementById('start-countdown').textContent = '启动计时器';
            
            showNotification('倒计时结束！', 'info');
        }
    }, 1000);
}

// 更新倒计时显示
function updateCountdownDisplay() {
    const minutes = Math.floor(countdownValue / 60);
    const seconds = countdownValue % 60;
    
    countdownMinutes.textContent = minutes.toString().padStart(2, '0');
    countdownSeconds.textContent = seconds.toString().padStart(2, '0');
}

// 重置倒计时
function resetCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    countdownValue = settings.redirectTime;
    updateCountdownDisplay();
    countdownProgress.style.width = '0%';
    document.getElementById('start-countdown').disabled = false;
    document.getElementById('start-countdown').textContent = '启动计时器';
}

// 显示通知
function showNotification(message, type = 'info') {
    // 移除现有的通知
    const existingNotifications = document.querySelectorAll('.settings-notification');
    existingNotifications.forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = `settings-notification notification-${type}`;
    notification.textContent = message;
    
    // 添加样式
    const styles = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    let backgroundColor = '#667eea';
    switch(type) {
        case 'success':
            backgroundColor = '#4CAF50';
            break;
        case 'warning':
            backgroundColor = '#FF9800';
            break;
        case 'error':
            backgroundColor = '#f44336';
            break;
        case 'info':
            backgroundColor = '#2196F3';
            break;
    }
    
    notification.style.cssText = styles + `background: ${backgroundColor};`;
    
    // 添加动画样式
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 2秒后自动消失
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 2000);
}
