const fs = require('fs');
const path = require('path');

// 配置路径
const POSTS_JSON = path.join(__dirname, '../../猫猫船长小程序/data/posts.json');

/**
 * 从 medium 路径生成 share 路径
 */
function generateSharePath(mediumPath) {
  if (!mediumPath) return null;
  
  // 路径格式可能是：
  // - medium/15/文件-1.jpg
  // - thumbnails/15/文件-1.jpg (旧格式)
  // - images/medium/15/文件-1.jpg (云存储格式)
  
  // 替换 medium -> share
  let sharePath = mediumPath.replace(/medium\//g, 'share/');
  
  // 如果原来是 thumbnails，也替换为 share
  sharePath = sharePath.replace(/thumbnails\//g, 'share/');
  
  // 如果包含 images/，保持 images/ 前缀
  if (mediumPath.includes('images/')) {
    sharePath = sharePath.replace(/^share\//, 'images/share/');
  }
  
  return sharePath;
}

/**
 * 更新单张图片，添加 share 字段
 */
function updateImage(imageData) {
  if (!imageData) return null;
  
  // 如果是对象格式（多尺寸）
  if (typeof imageData === 'object') {
    const updated = { ...imageData };
    
    // 如果有 medium，生成 share 路径
    if (updated.medium) {
      updated.share = generateSharePath(updated.medium);
    } else if (updated.thumbnail) {
      // 如果没有 medium，使用 thumbnail 生成 share
      updated.share = generateSharePath(updated.thumbnail);
    }
    
    // 移除 thumbnail 字段（如果存在）
    delete updated.thumbnail;
    
    return updated;
  }
  
  // 如果是字符串格式（旧格式），转换为对象格式
  if (typeof imageData === 'string') {
    // 去掉开头的 /
    let imgPath = imageData.startsWith('/') ? imageData.substring(1) : imageData;
    
    // 确定尺寸类型
    let sizeType = 'medium';
    if (imgPath.includes('thumbnails/')) {
      sizeType = 'medium'; // 旧格式的 thumbnails 当作 medium
    } else if (imgPath.includes('medium/')) {
      sizeType = 'medium';
    }
    
    // 生成路径
    const mediumPath = imgPath.replace(/thumbnails\//g, 'medium/');
    const sharePath = generateSharePath(mediumPath);
    const originalPath = imgPath.replace(/thumbnails\//g, 'original/').replace(/medium\//g, 'original/');
    
    return {
      medium: mediumPath,
      share: sharePath,
      original: originalPath
    };
  }
  
  return null;
}

/**
 * 主函数
 */
function main() {
  console.log('开始更新 posts.json，添加 share 字段...\n');
  
  // 读取原始数据
  if (!fs.existsSync(POSTS_JSON)) {
    console.error(`错误：找不到文件 ${POSTS_JSON}`);
    process.exit(1);
  }
  
  const postsData = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf-8'));
  const posts = postsData.posts || [];
  
  console.log(`找到 ${posts.length} 篇文章\n`);
  
  let updatedCount = 0;
  
  // 更新每篇文章的图片
  posts.forEach((post, index) => {
    if (!post.images || !Array.isArray(post.images)) {
      return;
    }
    
    let hasChanges = false;
    const updatedImages = post.images.map(img => {
      const updated = updateImage(img);
      if (updated && JSON.stringify(updated) !== JSON.stringify(img)) {
        hasChanges = true;
      }
      return updated;
    }).filter(Boolean);
    
    if (hasChanges) {
      post.images = updatedImages;
      updatedCount++;
      console.log(`✓ 更新文章 "${post.title}" (${updatedImages.length} 张图片)`);
    }
  });
  
  // 保存更新后的数据
  fs.writeFileSync(POSTS_JSON, JSON.stringify(postsData, null, 2), 'utf-8');
  
  console.log(`\n更新完成！`);
  console.log(`更新了 ${updatedCount} 篇文章`);
  console.log(`文件已保存到: ${POSTS_JSON}`);
}

// 运行
main();




