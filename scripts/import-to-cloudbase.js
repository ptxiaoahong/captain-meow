const fs = require('fs');
const path = require('path');
// 使用 CLI 方式导入，不需要 SDK
// const { CloudBase } = require('@cloudbase/node-sdk');

// 配置
const ENV_ID = 'maomaochuan-8g3ase92a38120e0';
const DATA_FILE = path.join(__dirname, '../../猫猫船长小程序/data/posts-cloudbase.json');
const COLLECTION_NAME = 'posts';

/**
 * 读取 JSON Lines 格式的数据文件
 */
function readJSONLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (error) {
      console.error('解析JSON行失败:', line.substring(0, 50), error.message);
      return null;
    }
  }).filter(Boolean);
}

/**
 * 显示导入说明
 */
function showImportInstructions() {
  console.log('开始导入数据到云数据库...\n');
  console.log(`环境ID: ${ENV_ID}`);
  console.log(`数据文件: ${DATA_FILE}`);
  console.log(`集合名称: ${COLLECTION_NAME}\n`);

  // 检查数据文件是否存在
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`错误：找不到数据文件 ${DATA_FILE}`);
    console.log('\n请先运行: node scripts/prepare-cloudbase-data.js');
    process.exit(1);
  }

  // 读取数据
  console.log('读取数据文件...');
  const posts = readJSONLines(DATA_FILE);
  console.log(`找到 ${posts.length} 条记录\n`);

  if (posts.length === 0) {
    console.error('错误：数据文件为空');
    process.exit(1);
  }

  console.log('数据文件已准备就绪！\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('请按照以下步骤在云开发控制台导入数据：');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('1. 打开微信开发者工具');
  console.log('2. 进入"云开发"控制台');
  console.log('3. 点击左侧菜单"数据库"');
  console.log('4. 创建集合 "posts"（如果不存在）');
  console.log('5. 设置集合权限：');
  console.log('   - 所有用户可读');
  console.log('   - 仅创建者可写');
  console.log('6. 点击"导入"按钮');
  console.log('7. 选择文件：');
  console.log(`   ${DATA_FILE}`);
  console.log('8. 选择格式："JSON Lines"');
  console.log('9. 点击"导入"完成\n');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('提示：');
  console.log('- 导入可能需要几分钟时间');
  console.log('- 如果文档已存在，导入会跳过（不会覆盖）');
  console.log('- 导入完成后，小程序即可正常显示内容\n');
}

// 运行
showImportInstructions();

