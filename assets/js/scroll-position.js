/**
 * 文章列表滚动位置记录与恢复
 * 功能：在文章列表页记录滚动位置，从详情页返回时恢复
 */

(function() {
    'use strict';
    
    const STORAGE_KEY = 'articleListScrollPosition';
    const STORAGE_TIMESTAMP_KEY = 'articleListScrollTimestamp';
    const STORAGE_PAGE_KEY = 'articleListScrollPage';
    const EXPIRY_TIME = 5 * 60 * 1000; // 5分钟过期时间
    
    /**
     * 获取当前页面类型
     */
    function getPageType() {
        const body = document.body;
        if (body.classList.contains('article-page')) {
            return 'article';
        }
        // 文章列表页通常有 article-list 类或位于首页/列表页
        if (document.querySelector('.article-list') || 
            document.querySelector('.article-list--compact') ||
            document.querySelector('.article-list--tile')) {
            return 'list';
        }
        return 'other';
    }
    
    /**
     * 保存滚动位置
     */
    function saveScrollPosition() {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        const pageUrl = window.location.pathname + window.location.search;
        
        try {
            sessionStorage.setItem(STORAGE_KEY, scrollY.toString());
            sessionStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
            sessionStorage.setItem(STORAGE_PAGE_KEY, pageUrl);
        } catch (e) {
            console.warn('无法保存滚动位置:', e);
        }
    }
    
    /**
     * 恢复滚动位置
     */
    function restoreScrollPosition() {
        try {
            const savedPosition = sessionStorage.getItem(STORAGE_KEY);
            const savedTimestamp = sessionStorage.getItem(STORAGE_TIMESTAMP_KEY);
            const savedPage = sessionStorage.getItem(STORAGE_PAGE_KEY);
            
            // 检查是否有保存的位置
            if (savedPosition === null) return;
            
            // 检查是否过期
            if (savedTimestamp) {
                const timestamp = parseInt(savedTimestamp, 10);
                if (Date.now() - timestamp > EXPIRY_TIME) {
                    clearScrollPosition();
                    return;
                }
            }
            
            // 恢复滚动位置
            const scrollY = parseInt(savedPosition, 10);
            if (!isNaN(scrollY) && scrollY > 0) {
                // 使用 requestAnimationFrame 确保页面渲染完成后再滚动
                requestAnimationFrame(function() {
                    window.scrollTo(0, scrollY);
                    
                    // 再次尝试，确保在图片等资源加载后也能正确滚动
                    setTimeout(function() {
                        window.scrollTo(0, scrollY);
                    }, 100);
                });
            }
            
            // 恢复后清除记录（避免刷新页面时再次滚动）
            clearScrollPosition();
            
        } catch (e) {
            console.warn('无法恢复滚动位置:', e);
        }
    }
    
    /**
     * 清除保存的滚动位置
     */
    function clearScrollPosition() {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_TIMESTAMP_KEY);
            sessionStorage.removeItem(STORAGE_PAGE_KEY);
        } catch (e) {
            console.warn('无法清除滚动位置:', e);
        }
    }
    
    /**
     * 检查是否是从文章详情页返回
     */
    function isReturningFromArticle() {
        // 检查 document.referrer
        if (document.referrer) {
            const referrerUrl = new URL(document.referrer);
            // 如果 referrer 是文章页（路径中包含 /posts/ 或其他文章路径模式）
            if (referrerUrl.pathname.match(/\/(posts|post|blog|article)\/.+/)) {
                return true;
            }
        }
        
        // 检查 navigation type
        if (window.performance && window.performance.navigation) {
            // TYPE_BACK_FORWARD = 2
            if (window.performance.navigation.type === 2) {
                return true;
            }
        }
        
        // 检查 PerformanceNavigationTiming (现代浏览器)
        if (window.performance && window.performance.getEntriesByType) {
            const navEntries = window.performance.getEntriesByType('navigation');
            if (navEntries.length > 0 && navEntries[0].type === 'back_forward') {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 为文章链接添加点击事件
     */
    function setupArticleLinks() {
        // 选择所有文章链接
        const articleLinks = document.querySelectorAll('.article-list a, .article-list--compact a, .article-list--tile a, article a');
        
        articleLinks.forEach(function(link) {
            // 只处理站内链接
            if (link.hostname === window.location.hostname || link.hostname === '') {
                link.addEventListener('click', function() {
                    saveScrollPosition();
                });
            }
        });
    }
    
    /**
     * 初始化
     */
    function init() {
        const pageType = getPageType();
        
        if (pageType === 'list') {
            // 文章列表页
            setupArticleLinks();
            
            // 如果是从详情页返回，恢复滚动位置
            if (isReturningFromArticle()) {
                restoreScrollPosition();
            } else {
                // 直接访问列表页，清除之前保存的位置
                clearScrollPosition();
            }
        } else if (pageType === 'article') {
            // 文章详情页 - 确保有返回按钮
            setupBackButton();
        }
    }
    
    /**
     * 设置返回按钮功能
     */
    function setupBackButton() {
        const backBtn = document.getElementById('back-to-list');
        if (!backBtn) return;
        
        backBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 如果有历史记录，使用 history.back()
            if (window.history.length > 1 && document.referrer) {
                window.history.back();
            } else {
                // 否则返回首页
                window.location.href = '/';
            }
        });
    }
    
    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // 页面完全加载后再次尝试恢复滚动位置（处理图片懒加载等情况）
    window.addEventListener('load', function() {
        if (getPageType() === 'list' && isReturningFromArticle()) {
            restoreScrollPosition();
        }
    });
    
})();