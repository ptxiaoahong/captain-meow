const fs = require('fs');
const path = require('path');

// 配置路径
const INPUT_FILE = path.join(__dirname, '../../猫猫船长小程序/data/posts-cloudbase.json');
const OUTPUT_FILE = path.join(__dirname, '../../猫猫船长小程序/data/posts-json-array.json');

/**
 * 将 JSON Lines 格式转换为 JSON 数组格式
 */
function convertToJSONArray() {
  console.log('开始转换数据格式...\n');
  console.log(`输入文件: ${INPUT_FILE}`);
  console.log(`输出文件: ${OUTPUT_FILE}\n`);

  // 检查输入文件是否存在
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`错误：找不到输入文件 ${INPUT_FILE}`);
    process.exit(1);
  }

  // 读取 JSON Lines 格式的文件
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.trim().split('\n');
  
  console.log(`找到 ${lines.length} 行数据\n`);

  // 解析每一行并转换为数组
  const posts = [];
  let errorCount = 0;

  lines.forEach((line, index) => {
    if (!line.trim()) {
      return; // 跳过空行
    }

    try {
      const post = JSON.parse(line);
      posts.push(post);
    } catch (error) {
      console.error(`解析第 ${index + 1} 行失败:`, error.message);
      errorCount++;
    }
  });

  if (errorCount > 0) {
    console.error(`\n警告：有 ${errorCount} 行解析失败`);
  }

  console.log(`成功解析 ${posts.length} 条记录\n`);

  // 转换为 JSON 数组格式
  const jsonArray = JSON.stringify(posts, null, 2);

  // 保存文件
  fs.writeFileSync(OUTPUT_FILE, jsonArray, 'utf-8');

  console.log(`数据已保存到: ${OUTPUT_FILE}`);
  console.log(`文件大小: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB\n`);
  console.log('转换完成！');
  console.log('\n导入说明：');
  console.log('1. 在云开发控制台进入"数据库"');
  console.log('2. 选择 posts 集合');
  console.log('3. 点击"导入"按钮');
  console.log('4. 选择文件：', OUTPUT_FILE);
  console.log('5. 选择格式："JSON"（标准JSON数组格式）');
  console.log('6. 点击"导入"完成\n');
}

// 运行
convertToJSONArray();

