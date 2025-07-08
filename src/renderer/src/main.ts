import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { autoMigrate } from './utils/tagMigration'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// 在应用挂载前执行数据迁移
autoMigrate().then(() => {
  console.log('标签数据迁移检查完成')
}).catch((error) => {
  console.error('标签数据迁移失败:', error)
}).finally(() => {
  // 无论迁移是否成功，都继续启动应用
  app.mount('#app')
})
