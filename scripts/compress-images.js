const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { glob } = require('glob');

// 配置路径
const STATIC_DIR = path.join(__dirname, '../static');
const OUTPUT_DIR = path.join(__dirname, '../static/compressed');

// 压缩配置
const COMPRESS_CONFIG = {
  medium: {
    width: 1200,
    quality: 90, // 从 85 提升到 90，提升中等图质量
    format: 'jpeg'
  },
  share: {
    width: 1000,  // 5:4 比例宽度
    height: 800,  // 5:4 比例高度
    quality: 85,
    format: 'jpeg'
  },
  original: {
    quality: 95, // 从 90 提升到 95，提升预览图质量
    format: 'jpeg'
  }
};

// 支持的图片格式
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * 检查文件是否为支持的图片格式
 */
function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_FORMATS.includes(ext);
}

/**
 * 压缩单张图片
 */
async function compressImage(inputPath, outputPath, config) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    let pipeline = image;
    
    // 如果是 share 尺寸，需要居中裁切成 5:4 比例
    if (config.width && config.height) {
      // 计算裁切区域（居中裁切）
      const targetRatio = config.width / config.height;
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
      
      pipeline = pipeline
        .extract({ left, top, width: cropWidth, height: cropHeight })
        .resize(config.width, config.height, {
          fit: 'cover'
        });
    } else if (config.width && metadata.width > config.width) {
      // 如果是缩略图或中等图，需要调整尺寸
      pipeline = pipeline.resize(config.width, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }
    
    // 转换为 JPEG 格式并压缩
    await pipeline
      .jpeg({ quality: config.quality, mozjpeg: true })
      .toFile(outputPath);
    
    const stats = fs.statSync(outputPath);
    const originalStats = fs.statSync(inputPath);
    const saved = ((originalStats.size - stats.size) / originalStats.size * 100).toFixed(1);
    
    return {
      success: true,
      originalSize: originalStats.size,
      compressedSize: stats.size,
      saved: `${saved}%`
    };
  } catch (error) {
    console.error(`压缩失败: ${inputPath}`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理单张图片，生成所有尺寸
 */
async function processImage(imagePath) {
  const relativePath = path.relative(STATIC_DIR, imagePath);
  const dir = path.dirname(relativePath);
  const basename = path.basename(imagePath, path.extname(imagePath));
  const ext = '.jpg';
  
  const results = {
    original: imagePath,
    medium: null,
    share: null,
    originalCompressed: null
  };
  
  // 生成中等图
  const mediumDir = path.join(OUTPUT_DIR, 'medium', dir);
  const mediumPath = path.join(mediumDir, `${basename}${ext}`);
  fs.mkdirSync(mediumDir, { recursive: true });
  const mediumResult = await compressImage(imagePath, mediumPath, COMPRESS_CONFIG.medium);
  if (mediumResult.success) {
    results.medium = path.relative(OUTPUT_DIR, mediumPath);
    console.log(`✓ 中等图: ${relativePath} (节省 ${mediumResult.saved})`);
    
    // 基于 medium 图片生成 share 尺寸（5:4 比例，居中裁切）
    const shareDir = path.join(OUTPUT_DIR, 'share', dir);
    const sharePath = path.join(shareDir, `${basename}${ext}`);
    fs.mkdirSync(shareDir, { recursive: true });
    const shareResult = await compressImage(mediumPath, sharePath, COMPRESS_CONFIG.share);
    if (shareResult.success) {
      results.share = path.relative(OUTPUT_DIR, sharePath);
      console.log(`✓ 分享图: ${relativePath} (节省 ${shareResult.saved})`);
    }
  }
  
  // 生成压缩后的原图
  const originalDir = path.join(OUTPUT_DIR, 'original', dir);
  const originalPath = path.join(originalDir, `${basename}${ext}`);
  fs.mkdirSync(originalDir, { recursive: true });
  const originalResult = await compressImage(imagePath, originalPath, COMPRESS_CONFIG.original);
  if (originalResult.success) {
    results.originalCompressed = path.relative(OUTPUT_DIR, originalPath);
    console.log(`✓ 原图: ${relativePath} (节省 ${originalResult.saved})`);
  }
  
  return results;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始压缩图片...\n');
  
  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // 查找所有图片文件
  const imageFiles = await glob('**/*.{jpg,jpeg,png,webp}', {
    cwd: STATIC_DIR,
    absolute: true,
    ignore: ['**/compressed/**', '**/admin/**']
  });
  
  console.log(`找到 ${imageFiles.length} 张图片\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  // 处理每张图片
  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    const relativePath = path.relative(STATIC_DIR, imagePath);
    
    if (!isImageFile(imagePath)) {
      continue;
    }
    
    console.log(`[${i + 1}/${imageFiles.length}] 处理: ${relativePath}`);
    
    try {
      await processImage(imagePath);
      successCount++;
    } catch (error) {
      console.error(`处理失败: ${relativePath}`, error.message);
      failCount++;
    }
    
    console.log('');
  }
  
  console.log('\n压缩完成！');
  console.log(`成功: ${successCount} 张`);
  console.log(`失败: ${failCount} 张`);
  console.log(`输出目录: ${OUTPUT_DIR}`);
}

// 运行
main().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});

