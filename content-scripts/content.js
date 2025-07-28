// 注入到学习平台页面
(function() {
    'use strict';
    
    let countdownInterval;
    let settings;
    let isPaused = false;  // 暂停状态
    let pendingRedirect = null;  // 待执行的跳转
    
    console.log('[学习平台管理器] 内容脚本已加载，当前URL:', window.location.href);
    
    // 获取设置
    chrome.runtime.sendMessage({action: "getSettings"}, (response) => {
        if (response && response.settings) {
            settings = response.settings;
            console.log('[学习平台管理器] 获取到设置:', settings);
        } else {
            console.log('[学习平台管理器] 未获取到设置，使用默认设置');
            settings = {
                redirectTime: 5,
                courseRedirectTime: 3,
                chapterRedirectTime: 5,
                autoRedirect: true,
                showCountdown: true,
                playSound: true
            };
        }
        
        // 立即启动主函数
        if (settings.autoRedirect) {
            main();
        }
    });
    
    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getLearningStatus") {
            sendResponse({
                status: getLearningStatus()
            });
            return true;
        }
        
        // 处理暂停/恢复消息
        if (request.action === "togglePause") {
            isPaused = !isPaused;
            console.log('[学习平台管理器] 扩展状态切换为:', isPaused ? '暂停' : '运行');
            
            if (isPaused) {
                // 暂停倒计时
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
                // 隐藏倒计时提示
                const notice = document.getElementById('learning-manager-redirect');
                if (notice) {
                    notice.innerHTML = '⏸️ 自动跳转已暂停';
                }
            } else {
                // 恢复跳转
                if (pendingRedirect) {
                    executeRedirect(pendingRedirect.url, pendingRedirect.time);
                    pendingRedirect = null;
                }
            }
            
            sendResponse({paused: isPaused});
            return true;
        }
    });
    
    // 检查是否已达到学习上限
    function isLearningLimitReached() {
        // 检查您提供的HTML结构
        const completionElement = document.querySelector('div.chapter-score-wrap div.chapter-score.limit');
        if (completionElement) {
            const textContent = completionElement.textContent || '';
            if (textContent.includes('您已到达今日上限')) {
                console.log('[学习平台管理器] 检测到学习上限已达到');
                return true;
            }
        }
        return false;
    }
    
    // 执行跳转
    function executeRedirect(url, time) {
        // 检查是否已达到学习上限
        if (isLearningLimitReached()) {
            console.log('[学习平台管理器] 已达到学习上限，停止跳转');
            showCompletionNotice('🎉 已达到今日学习上限！');
            return;
        }
        
        if (isPaused) {
            // 如果暂停，保存跳转信息
            pendingRedirect = {url, time};
            console.log('[学习平台管理器] 扩展已暂停，跳转已保存');
            return;
        }
        
        if (settings.showCountdown) {
            showCountdownNotice(url, time);
        } else {
            setTimeout(() => {
                window.location.href = url;
            }, time * 1000);
        }
    }
    

   // 查找下一章节链接 - 只选择分数为 &nbsp; &nbsp; 的章节
    // 查找下一章节链接 - 重构版（针对新的HTML结构）
    function findNextChapterLink() {
        console.log('[学习平台管理器] 开始查找下一章节链接');
        //
         const nextImg = document.querySelector('img.next_chapter');
        if (nextImg && nextImg.parentElement && nextImg.parentElement.href) {
            const nextUrl = nextImg.parentElement.href;
            console.log('[学习平台管理器] 方法1找到下一章链接:', nextUrl);
            return nextUrl;
        }
        // 获取当前章节ID
        const currentMatch = window.location.href.match(/\/chapter\/(\d+)/);
        const currentChapter = currentMatch ? parseInt(currentMatch[1]) : 0;
        console.log('[学习平台管理器] 当前章节ID:', currentChapter);
        
        // 查找所有章节项
        const chapterItems = document.querySelectorAll('li.c_item');
        console.log('[学习平台管理器] 找到章节项数量:', chapterItems.length);
        
        // 按章节ID排序（确保顺序正确）
        const sortedItems = Array.from(chapterItems).sort((a, b) => {
            const aMatch = a.querySelector('a').href.match(/\/chapter\/(\d+)/);
            const bMatch = b.querySelector('a').href.match(/\/chapter\/(\d+)/);
            return parseInt(aMatch[1]) - parseInt(bMatch[1]);
        });
        
        // 查找当前章节之后的第一个未完成章节
        for (let i = 0; i < sortedItems.length; i++) {
            const item = sortedItems[i];
            const link = item.querySelector('a[href*="/chapter/"]');
            if (!link) continue;
            
            // 获取章节ID
            const chapterMatch = link.href.match(/\/chapter\/(\d+)/);
            if (!chapterMatch) continue;
            
            const chapterId = parseInt(chapterMatch[1]);
            console.log('[学习平台管理器] 检查章节:', chapterId);
            
            // 跳过当前及之前的章节
            if (chapterId <= currentChapter) continue;
            
            // 查找分数元素
            const scoreDiv = item.querySelector('div[style*="float: right"]');
            if (!scoreDiv) {
                console.log('[学习平台管理器] 未找到分数元素');
                continue;
            }
            
            // 检查分数内容
            const scoreContent = scoreDiv.innerHTML.trim();
            console.log(`[学习平台管理器] 章节分数: "${scoreContent}"`);
            
            // 只选择分数为 &nbsp; &nbsp; 的章节
            if (scoreContent === '&nbsp; &nbsp;' || 
                scoreContent === '&nbsp;&nbsp;' || 
                scoreContent === '\u00A0\u00A0' ||
                scoreContent === '' || 
                scoreContent === ' ') {
                console.log('[学习平台管理器] 找到有效的未完成章节:', link.href);
                return link.href;
            }
        }

        console.log('[学习平台管理器] 未找到有效的下一章节链接');
        return null;
    }

    // 智能查找下一个未完成的课程
    function findNextCourse() {
        console.log('[学习平台管理器] 开始查找下一个未完成课程');
        
        // 检查是否已达到学习上限
        if (isLearningLimitReached()) {
            console.log('[学习平台管理器] 已达到学习上限，不查找下一个课程');
            return null;
        }
        
        // 查找所有课程卡片
        const courseCards = document.querySelectorAll('.card');
        console.log('[学习平台管理器] 找到课程卡片数量:', courseCards.length);
        
        for (let card of courseCards) {
            // 检查进度条
            const linebar = card.querySelector('.linebar');
            if (linebar) {
                const style = linebar.style;
                const width = style.width || '0%';
                const widthPercent = parseInt(width.replace('%', '')) || 0;
                
                console.log('[学习平台管理器] 课程进度:', widthPercent + '%');
                
                // 如果进度小于100%，则选择这个课程
                if (widthPercent < 100) {
                    // 查找进入学习按钮
                    const studyButton = card.querySelector('a[href*="/study/course/"]');
                    if (studyButton && studyButton.href) {
                        console.log('[学习平台管理器] 找到下一个未完成课程:', studyButton.href);
                        return studyButton.href;
                    }
                    
                    // 如果没有按钮，查找课程链接
                    const courseLink = card.querySelector('h3 a[href*="/study/course/"]');
                    if (courseLink && courseLink.href) {
                        console.log('[学习平台管理器] 找到下一个未完成课程链接:', courseLink.href);
                        return courseLink.href;
                    }
                }
            }
        }
        
        console.log('[学习平台管理器] 未找到未完成的课程');
        return null;
    }
    
    // 在课程页面查找第一个章节
    // 在课程页面查找第一个未完成章节
    function findFirstChapter() {
        console.log('[学习平台管理器] 在课程页面查找第一个未完成章节');
        
        // 查找所有章节项
        const chapterItems = document.querySelectorAll('li.c_item');
        console.log('[学习平台管理器] 找到章节项数量:', chapterItems.length);
        
        // 按章节ID排序
        const sortedItems = Array.from(chapterItems).sort((a, b) => {
            const aMatch = a.querySelector('a').href.match(/\/chapter\/(\d+)/);
            const bMatch = b.querySelector('a').href.match(/\/chapter\/(\d+)/);
            return parseInt(aMatch[1]) - parseInt(bMatch[1]);
        });
        
        for (let item of sortedItems) {
            const link = item.querySelector('a[href*="/chapter/"]');
            if (!link) continue;
            
            // 查找分数元素
            const scoreDiv = item.querySelector('div[style*="float: right"]');
            if (!scoreDiv) continue;
            
            // 检查分数内容
            const scoreContent = scoreDiv.innerHTML.trim();
            console.log(`[学习平台管理器] 章节分数: "${scoreContent}"`);
            
            // 只选择分数为 &nbsp; &nbsp; 的章节
            if (scoreContent === '&nbsp; &nbsp;' || 
                scoreContent === '&nbsp;&nbsp;' || 
                scoreContent === '\u00A0\u00A0' ||
                scoreContent === '' || 
                scoreContent === ' ') {
                console.log('[学习平台管理器] 找到第一个未完成章节:', link.href);
                return link.href;
            }
        }
        
        console.log('[学习平台管理器] 未找到未完成的章节');
        return null;
    }
    // 显示倒计时提示
    function showCountdownNotice(nextUrl, time) {
        // 移除可能存在的旧提示
        const oldNotice = document.getElementById('learning-manager-redirect');
        if (oldNotice) oldNotice.remove();

        const notice = document.createElement('div');
        notice.id = 'learning-manager-redirect';
        notice.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 999999;
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            font-size: 16px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            border: 2px solid white;
        `;
        notice.innerHTML = `
            将在 <span id="countdown">${time}</span> 秒后跳转<br>
            <small>目标: ${nextUrl}</small>
            <div style="margin-top: 10px;">
                <button id="pause-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">暂停</button>
                <button id="cancel-btn" style="background: rgba(255,0,0,0.3); border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 10px;">取消</button>
            </div>
        `;
        document.body.appendChild(notice);

        // 绑定按钮事件
        document.getElementById('pause-btn').addEventListener('click', function() {
            isPaused = !isPaused;
            if (isPaused) {
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                }
                this.textContent = '恢复';
                notice.querySelector('small').textContent = '⏸️ 已暂停';
            } else {
                // 恢复倒计时
                startCountdown(nextUrl, time);
                this.textContent = '暂停';
                notice.querySelector('small').textContent = `目标: ${nextUrl}`;
            }
        });

        document.getElementById('cancel-btn').addEventListener('click', function() {
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
            notice.remove();
        });

        // 启动倒计时
        startCountdown(nextUrl, time);
    }
    
    // 启动倒计时
    function startCountdown(nextUrl, time) {
        // 清除现有计时器
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }

        let seconds = time;
        const countdownElement = document.getElementById('countdown');

        countdownInterval = setInterval(() => {
            if (!isPaused) {
                seconds--;
                if (countdownElement) {
                    countdownElement.textContent = seconds;
                }

                if (seconds <= 0) {
                    clearInterval(countdownInterval);
                    const notice = document.getElementById('learning-manager-redirect');
                    if (notice) {
                        notice.innerHTML = '正在跳转...<br><small>' + nextUrl + '</small>';
                    }
                    // 跳转到目标页面
                    setTimeout(() => {
                        window.location.href = nextUrl;
                    }, 500);
                }
            }
        }, 1000);
    }
    
    // 显示完成提示
    function showCompletionNotice(message) {
        console.log('[学习平台管理器] 显示提示:', message);
        
        // 显示提示
        const notice = document.createElement('div');
        notice.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 999999;
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            font-size: 16px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        notice.innerHTML = message;
        document.body.appendChild(notice);

        // 3秒后自动消失
        setTimeout(() => {
            if (notice.parentNode) {
                notice.parentNode.removeChild(notice);
            }
        }, 3000);
    }
    
    function getLearningStatus() {
        if (isLearningLimitReached()) {
            return 'completed';
        }
        
        const nextUrl = findNextChapterLink();
        if (nextUrl) {
            return 'completed';
        }
        return 'in-progress';
    }
    
    // 主函数 - 智能跳转逻辑
    function main() {
        console.log('[学习平台管理器] 主函数启动，当前页面类型判断');
        
        // 首先检查是否已达到学习上限
        if (isLearningLimitReached()) {
            console.log('[学习平台管理器] 检测到已达到学习上限，显示提示');
            setTimeout(() => {
                showCompletionNotice('🎉 恭喜！已达到今日学习上限！');
            }, 2000);
            return;
        }
        
        const currentUrl = window.location.href;
        
        // 情况1：在年份课程列表页面 (如: https://www.scxfks.com/study/courses/year)
        if (currentUrl.includes('/study/courses/year') || currentUrl.includes('/study/courses')) {
            console.log('[学习平台管理器] 当前在课程列表页面');
            
            setTimeout(() => {
                const nextCourseUrl = findNextCourse();
                if (nextCourseUrl) {
                    executeRedirect(nextCourseUrl, settings.courseRedirectTime);
                } else {
                    showCompletionNotice('🎉 恭喜！所有课程都已完成学习或已达到学习上限！');
                }
            }, 3000);
            
            return;
        }
        
        // 情况2：在课程主页 (如: https://www.scxfks.com/study/course/3966)
        const courseMatch = currentUrl.match(/\/study\/course\/(\d+)\/?$/);
        if (courseMatch) {
            console.log('[学习平台管理器] 当前在课程主页');
            
            setTimeout(() => {
                const firstChapterUrl = findFirstChapter();
                if (firstChapterUrl) {
                    executeRedirect(firstChapterUrl, settings.courseRedirectTime);
                } else {
                    showCompletionNotice('🎉 该课程已完成学习或已达到学习上限！');
                }
            }, 3000);
            
            return;
        }
        
        // 情况3：在课程章节页面 (如: https://www.scxfks.com/study/course/3966/chapter/432560)
        const chapterMatch = currentUrl.match(/\/study\/course\/(\d+)\/chapter\/(\d+)/);
        if (chapterMatch) {
            console.log('[学习平台管理器] 当前在课程章节页面');
            
            setTimeout(() => {
                const nextChapterUrl = findNextChapterLink();
                if (nextChapterUrl) {
                    executeRedirect(nextChapterUrl, settings.chapterRedirectTime);
                } else {
                    // 当前课程已完成，返回课程列表寻找下一个课程
                    const courseId = chapterMatch[1];
                    const yearListUrl = 'https://www.scxfks.com/study/courses/year';
                    
                    executeRedirect(yearListUrl, settings.courseRedirectTime);
                }
            }, 3000);
            
            return;
        }
        
        // 默认情况：显示提示
        setTimeout(() => {
            showCompletionNotice('ℹ️ 当前页面不在学习流程中');
        }, 3000);
    }

})();
