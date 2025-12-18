const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 配置路径
const POSTS_JSON = path.join(__dirname, '../../猫猫船长小程序/data/posts.json');
const OUTPUT_DIR = path.join(__dirname, '../static/compressed');
const STATIC_DIR = path.join(__dirname, '../static');

// Share 图片配置（5:4 比例）
const SHARE_CONFIG = {
  width: 1000,
  height: 800,
  quality: 85,
  format: 'jpeg'
};

/**
 * 压缩单张图片为 share 尺寸（5:4 比例，居中裁切）
 */
async function compressToShare(inputPath, outputPath) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // 计算裁切区域（居中裁切）
    const targetRatio = SHARE_CONFIG.width / SHARE_CONFIG.height;
    const imageRatio = metadata.width / metadata.height;
    
    let cropWidth = metadata.width;
    let cropHeight = metadata.height;
    let left = 0;
    let top = 0;
    
    if (imageRatio > targetRatio) {
      // 图片更宽，需要裁切左右
      cropWidth = Math.round(metadata.height * targetRatio);
      left = Math.round((metadata.width - cropWidth) / 2);
    } else {
      // 图片更高，需要裁切上下
      cropHeight = Math.round(metadata.width / targetRatio);
      top = Math.round((metadata.height - cropHeight) / 2);
    }
    
    await image
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize(SHARE_CONFIG.width, SHARE_CONFIG.height, {
        fit: 'cover'
      })
      .jpeg({ quality: SHARE_CONFIG.quality })
      .toFile(outputPath);
    
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    const saved = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    return {
      success: true,
      saved: `${saved}%`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 从图片路径获取目录编号
 */
function getDirNumberFromPath(imagePath) {
  // 路径格式可能是：
  // - images/medium/15/文件-1.jpg
  // - medium/15/文件-1.jpg
  // - 15/文件-1.jpg
  // - medium/P1280436.jpg (旧格式，没有目录编号)
  
  const parts = imagePath.split('/');
  // 查找数字目录
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^\d+$/.test(part)) {
      return part;
    }
  }
  
  // 如果没有找到数字目录，尝试从文件名提取
  // 例如：P1280436.jpg -> 尝试查找对应的目录
  const fileName = path.basename(imagePath);
  // 如果文件名包含数字，尝试查找对应的目录
  const match = fileName.match(/^(\d+)/);
  if (match) {
    return match[1];
  }
  
  return null;
}

/**
 * 获取封面图的 medium 路径
 */
function getCoverImagePath(post) {
  if (!post.images || post.images.length === 0) {
    return null;
  }
  
  const firstImage = post.images[0];
  
  // 如果是对象格式（多尺寸）
  if (typeof firstImage === 'object' && firstImage.medium) {
    return firstImage.medium;
  }
  
  // 如果是字符串格式
  if (typeof firstImage === 'string') {
    return firstImage;
  }
  
  return null;
}

/**
 * 处理单篇文章的封面图（使用第一张图片）
 */
async function processPostCover(post) {
  const coverImagePath = getCoverImagePath(post);
  if (!coverImagePath) {
    console.warn(`文章 "${post.title}" 没有图片，跳过`);
    return null;
  }
  
  // 获取目录编号
  let dirNumber = getDirNumberFromPath(coverImagePath);
  
  // 如果无法从路径提取目录编号，尝试从所有图片中查找
  if (!dirNumber && post.images && post.images.length > 0) {
    for (const img of post.images) {
      const imgPath = typeof img === 'object' ? (img.medium || img.original || '') : img;
      if (imgPath) {
        dirNumber = getDirNumberFromPath(imgPath);
        if (dirNumber) break;
      }
    }
  }
  
  // 如果仍然没有目录编号，尝试从 static 目录查找
  if (!dirNumber) {
    // 尝试查找所有可能的目录
    const staticDirs = fs.readdirSync(STATIC_DIR).filter(dir => {
      const dirPath = path.join(STATIC_DIR, dir);
      return fs.statSync(dirPath).isDirectory() && /^\d+$/.test(dir);
    }).sort((a, b) => Number(b) - Number(a)); // 从新到旧
    
    // 获取文件名
    const fileName = path.basename(coverImagePath);
    
    // 在每个目录中查找文件
    for (const dir of staticDirs) {
      const testPath = path.join(STATIC_DIR, dir, fileName);
      if (fs.existsSync(testPath)) {
        dirNumber = dir;
        break;
      }
    }
  }
  
  if (!dirNumber) {
    console.warn(`无法从路径 "${coverImagePath}" 中提取目录编号，尝试使用文件名作为目录名`);
    // 使用文件名作为目录名（用于旧格式图片）
    const fileName = path.basename(coverImagePath);
    dirNumber = fileName.replace(/\.[^.]+$/, ''); // 去掉扩展名
  }
  
  // 获取文件名
  const fileName = path.basename(coverImagePath);
  const basename = path.basename(fileName, path.extname(fileName));
  const ext = '.jpg';
  
  // 构建 medium 图片的完整路径
  let mediumImagePath;
  if (coverImagePath.startsWith('images/')) {
    // 云存储格式：images/medium/15/文件-1.jpg
    mediumImagePath = path.join(OUTPUT_DIR, coverImagePath.replace('images/', ''));
  } else if (coverImagePath.startsWith('medium/')) {
    // 相对路径：medium/15/文件-1.jpg 或 medium/P1280436.jpg
    mediumImagePath = path.join(OUTPUT_DIR, coverImagePath);
  } else {
    // 尝试从 static 目录查找原图
    mediumImagePath = path.join(STATIC_DIR, dirNumber, fileName);
  }
  
  // 检查 medium 图片是否存在
  if (!fs.existsSync(mediumImagePath)) {
    // 尝试从 static 目录查找原图
    const staticImagePath = path.join(STATIC_DIR, dirNumber, fileName);
    if (fs.existsSync(staticImagePath)) {
      mediumImagePath = staticImagePath;
    } else {
      // 尝试在 compressed/medium 目录中查找（可能路径不同）
      const possiblePaths = [
        path.join(OUTPUT_DIR, 'medium', dirNumber, fileName),
        path.join(OUTPUT_DIR, 'medium', fileName),
        path.join(STATIC_DIR, dirNumber, fileName)
      ];
      
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          mediumImagePath = testPath;
          break;
        }
      }
      
      if (!fs.existsSync(mediumImagePath)) {
        console.warn(`找不到图片文件: ${coverImagePath}，尝试的路径: ${mediumImagePath}`);
        return null;
      }
    }
  }
  
  // 创建 share 目录
  const shareDir = path.join(OUTPUT_DIR, 'share', dirNumber);
  fs.mkdirSync(shareDir, { recursive: true });
  
  // 生成 share 图片路径
  const shareImagePath = path.join(shareDir, `${basename}${ext}`);
  
  // 如果 share 图片已存在，跳过
  if (fs.existsSync(shareImagePath)) {
    console.log(`✓ 文章 "${post.title}" 的 share 图片已存在，跳过`);
    return {
      success: true,
      skipped: true,
      path: shareImagePath
    };
  }
  
  // 压缩为 share 尺寸
  console.log(`处理文章 "${post.title}" 的首图...`);
  const result = await compressToShare(mediumImagePath, shareImagePath);
  
  if (result.success) {
    console.log(`✓ 生成 share 图片: ${path.relative(OUTPUT_DIR, shareImagePath)} (节省 ${result.saved})`);
    return {
      success: true,
      path: shareImagePath,
      saved: result.saved
    };
  } else {
    console.error(`✗ 生成失败: ${result.error}`);
    return {
      success: false,
      error: result.error
    };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始为所有文章的封面图生成 share 尺寸...\n');
  
  // 读取文章数据
  if (!fs.existsSync(POSTS_JSON)) {
    console.error(`错误：找不到文件 ${POSTS_JSON}`);
    process.exit(1);
  }
  
  const postsData = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf-8'));
  const posts = postsData.posts || [];
  
  console.log(`找到 ${posts.length} 篇文章\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  // 处理每篇文章的封面图
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`[${i + 1}/${posts.length}] 处理: ${post.title}`);
    
    const result = await processPostCover(post);
    
    if (result) {
      if (result.success) {
        if (result.skipped) {
          skipCount++;
        } else {
          successCount++;
        }
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }
    
    console.log('');
  }
  
  console.log('\n处理完成！');
  console.log(`成功生成: ${successCount} 张`);
  console.log(`已存在跳过: ${skipCount} 张`);
  console.log(`失败: ${failCount} 张`);
  console.log(`输出目录: ${path.join(OUTPUT_DIR, 'share')}`);
}

// 运行
main().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});

