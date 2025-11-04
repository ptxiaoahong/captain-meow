// 增强 PhotoSwipe 功能，确保所有图片都能点击放大浏览
document.addEventListener('DOMContentLoaded', function() {
    // 等待 Stack 初始化完成
    setTimeout(function() {
        if (window.Stack && window.PhotoSwipe && window.PhotoSwipeUI_Default) {
            const articleContent = document.querySelector('.article-content');
            if (articleContent) {
                // 确保所有图片都被添加到 gallery
                const galleryImages = articleContent.querySelectorAll('img.gallery-image');
                
                // 如果图片存在但没有被绑定，手动绑定
                galleryImages.forEach(function(img) {
                    const figure = img.closest('figure.gallery-image');
                    if (figure) {
                        let link = figure.querySelector('a');
                        if (!link) {
                            // 如果没有链接，创建一个
                            link = document.createElement('a');
                            link.href = img.src;
                            img.parentNode.insertBefore(link, img);
                            link.appendChild(img);
                        }
                        
                        // 确保链接有点击事件
                        if (!link.hasAttribute('data-pswp-bound')) {
                            link.setAttribute('data-pswp-bound', 'true');
                        }
                    }
                });
                
                console.log('PhotoSwipe gallery enhanced:', galleryImages.length, 'images found');
            }
        }
    }, 500);
});

