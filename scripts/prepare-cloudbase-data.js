const fs = require('fs');
const path = require('path');

// 配置路径
const INPUT_FILE = path.join(__dirname, '../../猫猫船长小程序/data/posts.json');
const OUTPUT_FILE = path.join(__dirname, '../../猫猫船长小程序/data/posts-cloudbase.json');

/**
 * 转换图片路径为云存储格式
 * @param {string|object} imageData - 图片路径或图片对象
 * @returns {object} 云存储格式的图片对象
 */
function convertImagePath(imageData) {
  if (!imageData) {
    return null;
  }
  
  // 如果已经是对象格式（多尺寸）
  if (typeof imageData === 'object' && imageData.medium) {
    // 转换为云存储路径格式
    return {
      medium: `images/${imageData.medium}`,
      share: imageData.share ? `images/${imageData.share}` : `images/${imageData.medium}`, // 如果没有 share，使用 medium
      original: `images/${imageData.original}`
    };
  }
  
  // 如果是字符串格式（旧格式）
  if (typeof imageData === 'string') {
    // 去掉开头的 /
    let imgPath = imageData.startsWith('/') ? imageData.substring(1) : imageData;
    // 将扩展名改为 .jpg（压缩后统一为 jpg）
    const ext = path.extname(imgPath);
    if (ext) {
      imgPath = imgPath.replace(ext, '.jpg');
    }
    
    // 返回多尺寸格式
    return {
      medium: `images/medium/${imgPath}`,
      share: `images/medium/${imgPath}`, // 旧数据没有 share，使用 medium
      original: `images/original/${imgPath}`
    };
  }
  
  return null;
}

/**
 * 转换文章数据为云数据库格式
 */
function convertPost(post) {
  // 转换图片数组
  const images = post.images ? post.images.map(img => convertImagePath(img)).filter(Boolean) : [];
  
  return {
    _id: post.id, // 使用原ID作为文档ID
    id: post.id,
    title: post.title,
    category: post.category,
    tags: post.tags || [],
    images: images,
    description: post.description || '',
    date: post.date,
    imageBeforeMore: post.imageBeforeMore || false, // 保留兼容字段
    mixedContent: post.mixedContent || [] // 保留混合内容数组，包含图片和文字的位置关系
  };
}

/**
 * 主函数
 */
function main() {
  console.log('开始转换数据为云数据库格式...\n');
  
  // 读取原始数据
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`错误：找不到输入文件 ${INPUT_FILE}`);
    process.exit(1);
  }
  
  const inputData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  const posts = inputData.posts || [];
  
  console.log(`找到 ${posts.length} 篇文章`);
  
  // 转换每篇文章
  const convertedPosts = posts.map(post => {
    try {
      return convertPost(post);
    } catch (error) {
      console.error(`转换文章失败: ${post.id}`, error.message);
      return null;
    }
  }).filter(Boolean);
  
  console.log(`成功转换 ${convertedPosts.length} 篇文章\n`);
  
  // 生成输出数据
  // 云数据库导入格式：每行一个JSON对象
  const outputData = convertedPosts.map(post => JSON.stringify(post)).join('\n');
  
  // 保存文件
  fs.writeFileSync(OUTPUT_FILE, outputData, 'utf-8');
  
  console.log(`数据已保存到: ${OUTPUT_FILE}`);
  console.log('\n导入说明：');
  console.log('1. 在云开发控制台进入"数据库"');
  console.log('2. 创建集合 "posts"');
  console.log('3. 设置权限：所有用户可读，仅创建者可写');
  console.log('4. 点击"导入"，选择此文件');
  console.log('5. 选择"JSON Lines"格式导入');
  console.log('\n转换完成！');
}

// 运行
main();

