// 测试路径编码
const originalPath = 'D:\\电影\\MIDV-908\\1.png';
const convertedPath = originalPath.replace(/\\/g, '/');
const encodedPath = encodeURIComponent(convertedPath);
const finalUrl = `local-image://${encodedPath}`;

console.log('原始路径:', originalPath);
console.log('转换后路径:', convertedPath);
console.log('编码后路径:', encodedPath);
console.log('最终URL:', finalUrl);

// 测试解码
const url = finalUrl.substring(13); // 移除 'local-image://' 前缀
const decodedPath = decodeURIComponent(url);
console.log('\n解码测试:');
console.log('提取的URL:', url);
console.log('解码后路径:', decodedPath);

// 测试Windows路径匹配
const match = decodedPath.match(/^[a-zA-Z]:[/\\]/);
console.log('Windows路径匹配:', match);

if (match) {
  const finalPath = decodedPath.replace(/\//g, '\\');
  console.log('最终文件路径:', finalPath);
}