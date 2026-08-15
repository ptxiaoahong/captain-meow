const fs = require('fs');
const path = require('path');

// 配置路径
const POSTS_DIR = path.join(__dirname, '../content/posts');
const OUTPUT_DIR = '/Users/hongshize/WeChatProjects/miniprogram-1/data';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'posts.json');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 解析 front matter
function parseFrontMatter(content) {
  const frontMatterRegex = /^\+\+\+\s*\n([\s\S]*?)\n\+\+\+\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);
  
  if (!match) {
    return { frontMatter: {}, body: content };
  }
  
  const frontMatterText = match[1];
  const body = match[2];
  const frontMatter = {};
  
  // 解析 front matter 键值对
  frontMatterText.split('\n').forEach(line => {
    line = line.trim();
    if (!line) return;
    
    const colonIndex = line.indexOf('=');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // 处理引号（支持单引号和双引号）
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // 处理数组
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1)
          .split(',')
          .map(item => {
            item = item.trim();
            if ((item.startsWith('"') && item.endsWith('"')) || 
                (item.startsWith("'") && item.endsWith("'"))) {
              return item.slice(1, -1);
            }
            return item;
          });
      }
      
      // 处理布尔值
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      
      frontMatter[key] = value;
    }
  });
  
  return { frontMatter, body };
}

// 提取图片路径
function extractImages(body) {
  const imageRegex = /!\[\]\(([^)]+)\)/g;
  const images = [];
  let match;
  
  while ((match = imageRegex.exec(body)) !== null) {
    images.push(match[1]);
  }
  
  return images;
}

// 解析单个内容段落（beforeMore 或 afterMore）
function parseContentSection(content, startImageIndex, title) {
  const images = [];
  const mixedContent = [];
  
  if (!content || !content.trim()) {
    return { images, mixedContent };
  }
  
  // 如果内容以标题开头，移除标题
  // 但要小心，确保不会误删图片标记中的内容
  if (title && content.trim()) {
    const trimmedContent = content.trim();
    // 只在内容确实以标题开头，且标题后面是换行、空格或图片标记时才移除
    if (trimmedContent.startsWith(title)) {
      const afterTitle = trimmedContent.substring(title.length);
      // 如果标题后面是空白字符或换行，或者是图片标记，则移除标题
      if (!afterTitle || /^[\s\n]|^!\[/.test(afterTitle)) {
        content = afterTitle.trim();
      }
    }
  }
  
  // 提取所有图片路径和位置
  const imageRegex = /!\[\]\(([^)]+)\)/g;
  const imageMatches = [];
  let match;
  
  imageRegex.lastIndex = 0;
  while ((match = imageRegex.exec(content)) !== null) {
    images.push(match[1]);
    imageMatches.push({
      path: match[1],
      index: match.index,
      length: match[0].length,
      imageIndex: startImageIndex + images.length - 1
    });
  }
  
  // 如果没有图片，只返回文字内容
  if (imageMatches.length === 0) {
    const text = content.trim();
    if (text) {
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
      paragraphs.forEach(p => {
        mixedContent.push({
          type: 'text',
          content: p.trim()
        });
      });
    }
    return { images, mixedContent };
  }
  
  // 按照图片位置分割内容
  let lastIndex = 0;
  
  imageMatches.forEach((imgMatch) => {
    // 添加图片前的文字
    const textBefore = content.substring(lastIndex, imgMatch.index).trim();
    if (textBefore) {
      const paragraphs = textBefore.split(/\n\n+/).filter(p => p.trim());
      paragraphs.forEach(paragraph => {
        mixedContent.push({
          type: 'text',
          content: paragraph.trim()
        });
      });
    }
    
    // 添加图片
    mixedContent.push({
      type: 'image',
      imageIndex: imgMatch.imageIndex
    });
    
    lastIndex = imgMatch.index + imgMatch.length;
  });
  
  // 添加最后一段文字
  const textAfter = content.substring(lastIndex).trim();
  if (textAfter) {
    const paragraphs = textAfter.split(/\n\n+/).filter(p => p.trim());
    paragraphs.forEach(paragraph => {
      mixedContent.push({
        type: 'text',
        content: paragraph.trim()
      });
    });
  }
  
  return { images, mixedContent };
}

// 解析内容，保留图片和文字的位置关系
// <!--more--> 之前的内容放在最前面
function parseContentWithImages(body, title) {
  // 找到 <!--more--> 的位置
  const moreIndex = body.indexOf('<!--more-->');
  const hasMore = moreIndex !== -1;
  
  // 分离 <!--more--> 前后的内容
  const beforeMore = hasMore ? body.substring(0, moreIndex).trim() : '';
  const afterMore = hasMore ? body.substring(moreIndex + '<!--more-->'.length).trim() : body.trim();
  
  const allImages = [];
  const mixedContent = [];
  
  // 先处理 <!--more--> 之前的内容（放在最前面）
  if (beforeMore) {
    const beforeResult = parseContentSection(beforeMore, allImages.length, title);
    allImages.push(...beforeResult.images);
    mixedContent.push(...beforeResult.mixedContent);
  }
  
  // 再处理 <!--more--> 之后的内容
  if (afterMore) {
    const afterResult = parseContentSection(afterMore, allImages.length, title);
    allImages.push(...afterResult.images);
    mixedContent.push(...afterResult.mixedContent);
  }
  
  // 确保至少返回空数组，而不是 undefined
  return {
    images: allImages || [],
    mixedContent: mixedContent || []
  };
}

// 提取描述（排除标题）
function extractDescription(body, title) {
  // 先移除所有 HTML 注释（包括 <!--more-->）
  let cleanBody = body.replace(/<!--[\s\S]*?-->/g, '').trim();
  
  // 移除图片标记
  cleanBody = cleanBody.replace(/!\[\]\([^)]+\)/g, '').trim();
  
  // 如果内容以标题开头，移除标题
  if (title && cleanBody.startsWith(title)) {
    cleanBody = cleanBody.substring(title.length).trim();
  }
  
  // 保留段落分隔：将双换行（段落分隔）保留，单换行替换为空格
  // 先保护双换行（段落分隔）
  cleanBody = cleanBody.replace(/\n\n+/g, '\n\n'); // 多个换行合并为双换行
  cleanBody = cleanBody.replace(/\n\n/g, '||PARAGRAPH||'); // 临时标记段落分隔
  cleanBody = cleanBody.replace(/\n/g, ' '); // 单换行替换为空格
  cleanBody = cleanBody.replace(/\s+/g, ' ').trim(); // 多个空格合并为单个空格
  cleanBody = cleanBody.replace(/\|\|PARAGRAPH\|\|/g, '\n\n'); // 恢复段落分隔
  
  // 返回完整内容，不截断
  return cleanBody || '';
}

// 生成唯一 ID
function generateId(title, date, filePath) {
  // 使用文件路径生成唯一 ID（去除扩展名和路径）
  const fileName = path.basename(filePath, '.md');
  
  // 使用文件名和日期生成唯一 ID
  // 将中文文件名转换为拼音或使用编码
  let id = fileName;
  
  // 如果文件名包含非 ASCII 字符，使用 Buffer 编码
  if (/[^\x00-\x7F]/.test(id)) {
    id = Buffer.from(id, 'utf8').toString('base64')
      .replace(/[+/=]/g, '')
      .substring(0, 20);
  } else {
    // 清理文件名，只保留字母数字和连字符
    id = id
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }
  
  // 添加日期前缀确保唯一性
  const dateStr = date ? date.substring(0, 10).replace(/-/g, '') : '';
  if (dateStr) {
    id = `${dateStr}-${id}`;
  }
  
  // 如果 ID 仍然有问题，使用哈希
  if (!id || id.length < 3) {
    const hash = require('crypto').createHash('md5').update(filePath).digest('hex').substring(0, 8);
    id = `post-${hash}`;
  }
  
  return id;
}

// 读取所有 Markdown 文件
function readAllPosts() {
  const posts = [];
  
  // 遍历 posts 目录下的所有子目录
  const categories = ['作品', '回忆', '心里话'];
  
  categories.forEach(category => {
    const categoryDir = path.join(POSTS_DIR, category);
    
    if (!fs.existsSync(categoryDir)) {
      return;
    }
    
    const files = fs.readdirSync(categoryDir);
    
    files.forEach(file => {
      if (!file.endsWith('.md')) {
        return;
      }
      
      const filePath = path.join(categoryDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const { frontMatter, body } = parseFrontMatter(content);
      
      // 跳过草稿
      if (frontMatter.draft === true) {
        return;
      }
      
      // 解析内容，保留图片和文字的位置关系
      const title = frontMatter.title || '';
      const { images, mixedContent } = parseContentWithImages(body, title);
      const description = extractDescription(body, title) || '';
      
      // 判断第一张图片是否在 <!--more--> 之前（保留用于兼容）
      const moreIndex = body.indexOf('<!--more-->');
      let firstImageBeforeMore = false;
      if (moreIndex !== -1 && images.length > 0) {
        const beforeMore = body.substring(0, moreIndex);
        const firstImageMatch = beforeMore.match(/!\[\]\(([^)]+)\)/);
        firstImageBeforeMore = firstImageMatch !== null;
      }
      
      // 处理图片路径，生成多尺寸路径
      const processedImages = images.map(imgPath => {
        // 去掉开头的 /，生成相对路径
        let relativePath = imgPath.startsWith('/') ? imgPath.substring(1) : imgPath;
        // 将扩展名改为 .jpg（压缩后统一为 jpg）
        const ext = path.extname(relativePath);
        if (ext) {
          relativePath = relativePath.replace(ext, '.jpg');
        }

        return {
          original: `original/${relativePath}`,
          medium: `medium/${relativePath}`,
          thumbnail: `medium/${relativePath}` // 使用 medium 代替 thumbnails
        };
      });
      
      // 确定分类（优先使用 frontMatter 中的 categories，否则使用文件夹名）
      let postCategory = category;
      if (frontMatter.categories && Array.isArray(frontMatter.categories) && frontMatter.categories.length > 0) {
        postCategory = frontMatter.categories[0];
      }
      
      // 处理标签
      let tags = [];
      if (frontMatter.tags && Array.isArray(frontMatter.tags)) {
        tags = frontMatter.tags;
      }
      
      // 处理日期
      let date = frontMatter.date || '';
      if (date) {
        // 处理 ISO 8601 格式的日期（如 '2025-03-09T16:11:24+08:00'）
        // 或者简单的日期格式（如 '2025-03-09'）
        try {
          const dateObj = new Date(date);
          if (!isNaN(dateObj.getTime())) {
            // 格式化为 YYYY-MM-DD
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            date = `${year}-${month}-${day}`;
          } else {
            // 如果 Date 解析失败，尝试正则提取
            const dateMatch = date.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              date = dateMatch[1];
            } else {
              date = '';
            }
          }
        } catch (e) {
          // 如果出错，尝试正则提取
          const dateMatch = date.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            date = dateMatch[1];
          } else {
            date = '';
          }
        }
      }
      
      // 如果没有日期，使用文件修改时间或当前时间
      if (!date) {
        try {
          const stats = fs.statSync(filePath);
          const fileDate = new Date(stats.mtime);
          const year = fileDate.getFullYear();
          const month = String(fileDate.getMonth() + 1).padStart(2, '0');
          const day = String(fileDate.getDate()).padStart(2, '0');
          date = `${year}-${month}-${day}`;
        } catch (e) {
          date = new Date().toISOString().substring(0, 10);
        }
      }
      
      const post = {
        id: generateId(frontMatter.title || file, date, filePath),
        title: frontMatter.title || file.replace('.md', ''),
        category: postCategory,
        tags: tags,
        images: processedImages,
        description: description,
        date: date,
        imageBeforeMore: firstImageBeforeMore || false, // 标记第一张图片是否在 more 之前（兼容字段）
        mixedContent: mixedContent // 混合内容数组，保留图片和文字的位置关系
      };
      
      posts.push(post);
    });
  });
  
  // 按日期排序（最新的在前）
  posts.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
  
  return posts;
}

// 主函数
function main() {
  console.log('开始转换 Markdown 文件...');
  
  const posts = readAllPosts();
  
  console.log(`找到 ${posts.length} 篇文章`);
  
  // 生成 JSON 文件
  const output = {
    posts: posts,
    categories: {
      '全部': posts.length,
      '作品': posts.filter(p => p.category === '作品').length,
      '回忆': posts.filter(p => p.category === '回忆').length,
      '心里话': posts.filter(p => p.category === '心里话').length
    }
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`数据已保存到: ${OUTPUT_FILE}`);
  console.log('转换完成！');
}

// 运行
main();

