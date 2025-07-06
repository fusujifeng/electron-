// 测试修复后的URL解码逻辑
const path = require('path');
const fs = require('fs');

// 模拟main/index.ts中的URL解码逻辑
function processLocalImageUrl(requestUrl) {
  const url = requestUrl.substring(13); // 移除 'local-image://' 前缀
  // 解码URL并处理路径
  let filePath = decodeURIComponent(url);
  
  // 在Windows上，处理路径格式
  if (process.platform === 'win32') {
    // 如果路径已经是完整的Windows路径格式（如 D:/path 或 D:\path），直接使用
    if (filePath.match(/^[a-zA-Z]:[/\\]/)) {
      filePath = filePath.replace(/\//g, '\\');
    }
    // 处理类似 /D:/path 的格式（前导斜杠 + 完整Windows路径），移除前导斜杠
    else if (filePath.match(/^\/[a-zA-Z]:[/\\]/)) {
      filePath = filePath.substring(1); // 移除前导斜杠
      filePath = filePath.replace(/\//g, '\\');
    }
    // 处理类似 /d/path 的格式，转换为 D:/path
    else if (filePath.match(/^\/[a-zA-Z]\//)) {
      filePath = filePath.charAt(1).toUpperCase() + ':' + filePath.substring(2);
      filePath = filePath.replace(/\//g, '\\');
    }
    // 处理多个前导斜杠的情况，如 ///D:/path
    else if (filePath.match(/^\/+[a-zA-Z]:[/\\]/)) {
      // 移除所有前导斜杠直到找到驱动器字母
      filePath = filePath.replace(/^\/+/, '');
      filePath = filePath.replace(/\//g, '\\');
    }
    // 处理编码后的Windows路径（如 D%3A%2F...），先解码再处理
    else if (filePath.includes('%')) {
      // 再次解码以处理双重编码的情况
      try {
        const doubleDecoded = decodeURIComponent(filePath);
        if (doubleDecoded !== filePath) {
          filePath = doubleDecoded;
          // 递归处理解码后的路径
          if (filePath.match(/^[a-zA-Z]:[/\\]/)) {
            filePath = filePath.replace(/\//g, '\\');
          } else if (filePath.match(/^\/[a-zA-Z]:[/\\]/)) {
            filePath = filePath.substring(1);
            filePath = filePath.replace(/\//g, '\\');
          }
        }
      } catch (e) {
        // 如果解码失败，保持原路径
      }
    }
  }
  
  return filePath;
}

// 测试用例
const testCases = [
  {
    name: 'MIDV-908 编码URL',
    input: 'local-image://D%3A%2F%E7%94%B5%E5%BD%B1%2FMIDV-908%2F1.png',
    expected: 'D:\\电影\\MIDV-908\\1.png'
  },
  {
    name: '普通Windows路径',
    input: 'local-image://D:/电影/test/image.jpg',
    expected: 'D:\\电影\\test\\image.jpg'
  },
  {
    name: '带前导斜杠的路径',
    input: 'local-image:///D:/电影/test/image.jpg',
    expected: 'D:\\电影\\test\\image.jpg'
  }
];

console.log('=== 测试修复后的URL解码逻辑 ===');

testCases.forEach((testCase, index) => {
  const result = processLocalImageUrl(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`\n测试 ${index + 1}: ${testCase.name}`);
  console.log(`输入: ${testCase.input}`);
  console.log(`期望: ${testCase.expected}`);
  console.log(`实际: ${result}`);
  console.log(`结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
  
  // 检查文件是否存在（仅对MIDV-908测试）
  if (testCase.name.includes('MIDV-908')) {
    try {
      const exists = fs.existsSync(result);
      console.log(`文件是否存在: ${exists ? '✅ 存在' : '❌ 不存在'}`);
    } catch (error) {
      console.log(`文件检查出错: ${error.message}`);
    }
  }
});

console.log('\n=== 测试完成 ===');