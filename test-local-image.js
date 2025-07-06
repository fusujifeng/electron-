// 测试修复后的local-image协议路径处理逻辑
const path = require('path');

// 模拟local-image协议的路径处理逻辑
function processLocalImagePath(url) {
    console.log('原始URL:', url);
    
    // 移除 'local-image://' 前缀
    const extractedPath = url.substring(13);
    console.log('提取的路径:', extractedPath);
    
    // 解码URL
    let filePath = decodeURIComponent(extractedPath);
    console.log('解码后路径:', filePath);
    
    // 在Windows上，处理路径格式
    if (process.platform === 'win32') {
        // 如果路径已经是完整的Windows路径格式（如 D:/path 或 D:\\path），直接使用
        if (filePath.match(/^[a-zA-Z]:[/\\]/)) {
            filePath = filePath.replace(/\//g, '\\');
            console.log('匹配完整Windows路径格式');
        }
        // 处理类似 /D:/path 的格式（前导斜杠 + 完整Windows路径），移除前导斜杠
        else if (filePath.match(/^\/[a-zA-Z]:[/\\]/)) {
            filePath = filePath.substring(1); // 移除前导斜杠
            filePath = filePath.replace(/\//g, '\\');
            console.log('匹配前导斜杠+完整Windows路径格式，移除前导斜杠');
        }
        // 处理类似 /d/path 的格式，转换为 D:/path
        else if (filePath.match(/^\/[a-zA-Z]\//)) {
            filePath = filePath.charAt(1).toUpperCase() + ':' + filePath.substring(2);
            filePath = filePath.replace(/\//g, '\\');
            console.log('匹配Unix风格路径格式，转换为Windows格式');
        }
    }
    
    console.log('最终文件路径:', filePath);
    
    // 检查文件是否存在
    const fs = require('fs');
    try {
        const exists = fs.existsSync(filePath);
        console.log('文件是否存在:', exists);
        if (!exists) {
            console.error('文件不存在:', filePath);
        }
    } catch (error) {
        console.error('检查文件存在性时出错:', error);
    }
    
    return filePath;
}

// 测试MIDV-908的路径
const testUrl = 'local-image://D%3A%2F%E7%94%B5%E5%BD%B1%2FMIDV-908%2F1.png';
console.log('=== 测试MIDV-908图片路径处理 ===');
processLocalImagePath(testUrl);

console.log('\n=== 测试其他路径格式 ===');
// 测试其他可能的路径格式
const testUrls = [
    'local-image:///D:/电影/MIDV-908/1.png',
    'local-image://D:/电影/MIDV-908/1.png',
    'local-image:///d/电影/MIDV-908/1.png'
];

testUrls.forEach((url, index) => {
    console.log(`\n--- 测试 ${index + 1} ---`);
    processLocalImagePath(url);
});