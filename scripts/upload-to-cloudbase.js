const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// 配置
const ENV_ID = 'cloud1-1gljdljjb2d15260'; // 小程序云开发环境ID
const COMPRESSED_DIR = path.join(__dirname, '../static/compressed');
const CLOUD_BASE_PATH = 'images'; // 云存储中的基础路径

/**
 * 检查 CLI 是否已安装
 */
function checkCLIInstalled() {
  try {
    execSync('tcb --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 检查是否已登录
 */
function checkLoggedIn() {
  try {
    execSync('tcb env:list', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 使用 CLI 上传目录
 */
function uploadDirectoryWithCLI(localDir, cloudDir) {
  return new Promise((resolve, reject) => {
    const command = 'tcb';
    const args = [
      'storage:upload',
      localDir,
      cloudDir,
      '-e',
      ENV_ID
    ];
    
    console.log(`上传: ${path.basename(localDir)} -> ${cloudDir}`);
    
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`上传失败，退出码: ${code}`));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('开始上传图片到云存储...\n');
  console.log(`环境ID: ${ENV_ID}`);
  console.log(`压缩目录: ${COMPRESSED_DIR}\n`);
  
  // 检查 CLI 是否安装
  if (!checkCLIInstalled()) {
    console.error('错误：未安装云开发 CLI');
    console.log('\n请先安装:');
    console.log('npm install -g @cloudbase/cli');
    console.log('\n然后登录:');
    console.log('tcb login');
    process.exit(1);
  }
  
  // 检查是否已登录
  if (!checkLoggedIn()) {
    console.error('错误：未登录云开发 CLI');
    console.log('\n请先登录:');
    console.log('tcb login');
    console.log('\n登录后会打开浏览器，扫码登录即可');
    process.exit(1);
  }
  
  // 检查压缩目录是否存在
  if (!fs.existsSync(COMPRESSED_DIR)) {
    console.error('错误：压缩目录不存在');
    console.log('请先运行: npm run compress-images');
    process.exit(1);
  }
  
  const sizes = [
    { name: 'thumbnails', dir: 'thumbnails' },
    { name: 'medium', dir: 'medium' },
    { name: 'original', dir: 'original' }
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  // 上传每种尺寸
  for (const size of sizes) {
    const localDir = path.join(COMPRESSED_DIR, size.dir);
    const cloudDir = `${CLOUD_BASE_PATH}/${size.dir}`;
    
    if (!fs.existsSync(localDir)) {
      console.log(`\n跳过: ${size.name} 目录不存在`);
      continue;
    }
    
    // 统计文件数量
    const files = [];
    function countFiles(dir) {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          countFiles(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            files.push(fullPath);
          }
        }
      });
    }
    countFiles(localDir);
    
    console.log(`\n${size.name}: ${files.length} 个文件`);
    
    try {
      await uploadDirectoryWithCLI(localDir, cloudDir);
      successCount++;
      console.log(`✓ ${size.name} 上传成功`);
    } catch (error) {
      failCount++;
      console.error(`✗ ${size.name} 上传失败:`, error.message);
    }
  }
  
  console.log('\n\n上传完成！');
  console.log(`成功: ${successCount} 个目录`);
  console.log(`失败: ${failCount} 个目录`);
  
  if (failCount > 0) {
    console.log('\n提示：失败的上传可以重新运行脚本');
  }
}

// 运行
main().catch(error => {
  console.error('\n执行失败:', error);
  if (error.message) {
    console.error('错误信息:', error.message);
  }
  process.exit(1);
});
