const fs = require('fs');
const path = require('path');

// 测试文件路径
const testPath = 'D:\\电影\\MIDV-908\\1.png';

console.log('测试文件路径:', testPath);
console.log('文件是否存在:', fs.existsSync(testPath));

// 如果文件不存在，列出目录内容
if (!fs.existsSync(testPath)) {
  const dirPath = path.dirname(testPath);
  console.log('\n目录路径:', dirPath);
  console.log('目录是否存在:', fs.existsSync(dirPath));
  
  if (fs.existsSync(dirPath)) {
    try {
      const files = fs.readdirSync(dirPath);
      console.log('\n目录内容:');
      files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stats = fs.statSync(fullPath);
        console.log(`  ${file} (${stats.isDirectory() ? '目录' : '文件'})`);
      });
    } catch (error) {
      console.error('读取目录失败:', error.message);
    }
  }
}

// 测试URL解码
const encodedUrl = 'D%3A%2F%E7%94%B5%E5%BD%B1%2FMIDV-908%2F1.png';
console.log('\n编码的URL:', encodedUrl);
let decodedPath = encodedUrl;
let previousPath = '';
while (decodedPath !== previousPath && decodedPath.includes('%')) {
  previousPath = decodedPath;
  try {
    decodedPath = decodeURIComponent(decodedPath);
    console.log('解码步骤:', decodedPath);
  } catch (e) {
    console.error('解码失败:', e);
    break;
  }
}

// 转换为Windows路径格式
if (process.platform === 'win32') {
  if (decodedPath.match(/^[a-zA-Z]:[/\\]/)) {
    decodedPath = decodedPath.replace(/\//g, '\\');
  }
}

console.log('最终解码路径:', decodedPath);
console.log('解码后文件是否存在:', fs.existsSync(decodedPath));