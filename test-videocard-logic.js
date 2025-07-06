// 测试VideoCard.vue中的thumbnail URL处理逻辑

// 模拟不同类型的thumbnail值
const testCases = [
  {
    name: 'MIDV-908 folder with local-image prefix',
    thumbnail: 'local-image://D%3A%2F%E7%94%B5%E5%BD%B1%2FMIDV-908%2F1.png',
    expected: 'local-image://D%3A%2F%E7%94%B5%E5%BD%B1%2FMIDV-908%2F1.png'
  },
  {
    name: 'Default thumbnail (starts with /)',
    thumbnail: '/default-thumbnail.jpg',
    expected: '/default-thumbnail.jpg'
  },
  {
    name: 'Folder icon (starts with /)',
    thumbnail: '/folder-icon.svg',
    expected: '/folder-icon.svg'
  },
  {
    name: 'Blob URL',
    thumbnail: 'blob:http://localhost:5173/abc123',
    expected: 'blob:http://localhost:5173/abc123'
  },
  {
    name: 'Windows path without prefix',
    thumbnail: 'D:\\电影\\test\\image.jpg',
    expected: 'local-image://D:/电影/test/image.jpg'
  }
];

// 模拟VideoCard.vue中的逻辑
function getImageSrc(thumbnail) {
  if (thumbnail.startsWith('blob:')) {
    return thumbnail;
  }
  if (thumbnail.startsWith('local-image://')) {
    return thumbnail;
  }
  if (thumbnail.startsWith('/')) {
    return thumbnail;
  }
  return `local-image://${thumbnail.replace(/\\/g, '/')}`;
}

console.log('=== 测试VideoCard.vue的thumbnail URL处理逻辑 ===');

testCases.forEach((testCase, index) => {
  const result = getImageSrc(testCase.thumbnail);
  const passed = result === testCase.expected;
  
  console.log(`\n测试 ${index + 1}: ${testCase.name}`);
  console.log(`输入: ${testCase.thumbnail}`);
  console.log(`期望: ${testCase.expected}`);
  console.log(`实际: ${result}`);
  console.log(`结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
});

console.log('\n=== 测试完成 ===');