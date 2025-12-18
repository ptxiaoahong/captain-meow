const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 配置
const SOURCE_DIR = '/Volumes/移动硬盘/2025.11.6 厦门 小锦/成片/noon';
const POSTS_DIR = path.join(__dirname, '../content/posts/作品');
const STATIC_DIR = path.join(__dirname, '../static');
const OUTPUT_DIR = path.join(__dirname, '../static/compressed');
const POSTS_JSON = path.join(__dirname, '../../猫猫船长小程序/data/posts.json');

// 新文章配置
const POST_CONFIG = {
  title: 'Colorful Day',
  category: '作品',
  tags: ['作品', '文艺', '清新'],
  date: new Date().toISOString().split('T')[0],
  dirNumber: 15 // 下一个目录编号
};

// 压缩配置
const COMPRESS_CONFIG = {
  medium: { width: 1200, quality: 90, format: 'jpeg' },
  share: { width: 1000, height: 800, quality: 85, format: 'jpeg' }, // 5:4 比例
  original: { quality: 95, format: 'jpeg' }
};

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
      pipeline = pipeline.resize(config.width, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }
    
    await pipeline
      .jpeg({ quality: config.quality })
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
 * 处理单张图片
 */
async function processImage(imagePath, index, dirNumber) {
  const basename = `文件-${index + 1}`;
  const ext = '.jpg';
  
  // 创建目录
  const mediumDir = path.join(OUTPUT_DIR, 'medium', dirNumber.toString());
  const shareDir = path.join(OUTPUT_DIR, 'share', dirNumber.toString());
  const originalDir = path.join(OUTPUT_DIR, 'original', dirNumber.toString());
  
  [mediumDir, shareDir, originalDir].forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
  });
  
  // 压缩图片
  const mediumPath = path.join(mediumDir, `${basename}${ext}`);
  const originalPath = path.join(originalDir, `${basename}${ext}`);
  
  await compressImage(imagePath, mediumPath, COMPRESS_CONFIG.medium);
  await compressImage(imagePath, originalPath, COMPRESS_CONFIG.original);
  
  // 基于 medium 图片生成 share 尺寸（5:4 比例，居中裁切）
  const sharePath = path.join(shareDir, `${basename}${ext}`);
  await compressImage(mediumPath, sharePath, COMPRESS_CONFIG.share);
  
  // 复制原图到 static 目录（用于 Hugo）
  const staticDir = path.join(STATIC_DIR, dirNumber.toString());
  fs.mkdirSync(staticDir, { recursive: true });
  const staticPath = path.join(staticDir, `${basename}${ext}`);
  fs.copyFileSync(imagePath, staticPath);
  
  return {
    medium: `medium/${dirNumber}/${basename}${ext}`,
    share: `share/${dirNumber}/${basename}${ext}`,
    original: `original/${dirNumber}/${basename}${ext}`,
    staticPath: `${dirNumber}/${basename}${ext}`
  };
}

/**
 * 生成文章ID
 */
function generateId(title, date) {
  const dateStr = date.replace(/-/g, '');
  const titleSlug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${dateStr}-${titleSlug}-${randomStr}`;
}

/**
 * 主函数
 */
async function main() {
  console.log('开始创建新文章...\n');
  
  // 1. 读取源目录图片
  const imageFiles = fs.readdirSync(SOURCE_DIR)
    .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
    .sort()
    .map(file => path.join(SOURCE_DIR, file));
  
  if (imageFiles.length === 0) {
    console.error('错误：源目录中没有找到图片文件');
    process.exit(1);
  }
  
  console.log(`找到 ${imageFiles.length} 张图片\n`);
  
  // 2. 处理图片
  const images = [];
  const staticImages = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    console.log(`处理图片 ${i + 1}/${imageFiles.length}: ${path.basename(imageFiles[i])}`);
    const result = await processImage(imageFiles[i], i, POST_CONFIG.dirNumber);
    images.push({
      medium: result.medium,
      share: result.share,
      original: result.original
    });
    staticImages.push(result.staticPath);
  }
  
  console.log('\n图片处理完成！\n');
  
  // 3. 生成文章ID
  const postId = generateId(POST_CONFIG.title, POST_CONFIG.date);
  
  // 4. 创建 Hugo 文章
  const hugoContent = `+++
date = '${POST_CONFIG.date}T16:11:24+08:00'
draft = false
title = '${POST_CONFIG.title}'
tags = ${JSON.stringify(POST_CONFIG.tags)}
categories = ["${POST_CONFIG.category}"]
featuredImagePreview = ""
comment= true
+++
![](/${staticImages[0]}) 
<!--more-->
${staticImages.slice(1).map(img => `![](/${img})`).join('\n')}
`;
  
  const hugoFilePath = path.join(POSTS_DIR, `${POST_CONFIG.title}.md`);
  fs.writeFileSync(hugoFilePath, hugoContent, 'utf-8');
  console.log(`✓ Hugo 文章已创建: ${hugoFilePath}\n`);
  
  // 5. 更新 posts.json
  let postsData = { posts: [] };
  if (fs.existsSync(POSTS_JSON)) {
    postsData = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf-8'));
  }
  
  const newPost = {
    id: postId,
    title: POST_CONFIG.title,
    category: POST_CONFIG.category,
    tags: POST_CONFIG.tags,
    images: images,
    description: '',
    date: POST_CONFIG.date
  };
  
  // 插入到最前面（最新的文章）
  postsData.posts.unshift(newPost);
  
  fs.writeFileSync(POSTS_JSON, JSON.stringify(postsData, null, 2), 'utf-8');
  console.log(`✓ posts.json 已更新\n`);
  
  // 6. 生成云数据库格式
  const cloudbaseData = {
    _id: postId,
    id: postId,
    title: POST_CONFIG.title,
    category: POST_CONFIG.category,
    tags: POST_CONFIG.tags,
    images: images.map(img => ({
      medium: `images/${img.medium}`,
      share: `images/${img.share}`,
      original: `images/${img.original}`
    })),
    description: '',
    date: POST_CONFIG.date
  };
  
  const cloudbaseFile = path.join(__dirname, '../../猫猫船长小程序/data/posts-cloudbase-clean.json');
  let cloudbaseLines = [];
  if (fs.existsSync(cloudbaseFile)) {
    cloudbaseLines = fs.readFileSync(cloudbaseFile, 'utf-8').split('\n').filter(line => line.trim());
  }
  
  // 插入到最前面
  cloudbaseLines.unshift(JSON.stringify(cloudbaseData));
  fs.writeFileSync(cloudbaseFile, cloudbaseLines.join('\n'), 'utf-8');
  console.log(`✓ 云数据库格式已生成\n`);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('完成！');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`文章ID: ${postId}`);
  console.log(`标题: ${POST_CONFIG.title}`);
  console.log(`图片数量: ${images.length}`);
  console.log(`目录编号: ${POST_CONFIG.dirNumber}`);
  console.log('\n下一步：');
  console.log('1. 检查 Hugo 文章内容');
  console.log('2. 运行压缩脚本（如果需要）');
  console.log('3. 上传图片到云存储');
  console.log('4. 导入云数据库数据');
}

main().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});

