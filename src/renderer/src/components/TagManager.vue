<template>
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-800 flex items-center">
        <svg class="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
        </svg>
        标签管理
      </h3>
    </div>

    <!-- 当前标签显示 -->
    <div class="mb-4">
      <div class="flex flex-wrap gap-2 mb-3">
        <div
          v-for="(tag, index) in tags"
          :key="index"
          class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors group"
        >
          <span>{{ tag }}</span>
          <button
            @click="removeTag(index)"
            class="ml-2 text-blue-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div v-if="tags.length === 0" class="text-gray-500 text-sm italic">
          暂无标签
        </div>
      </div>
    </div>

    <!-- 添加新标签 -->
    <div class="space-y-3">
      <div class="flex gap-2">
        <input
          v-model="newTag"
          type="text"
          placeholder="输入新标签..."
          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          @keyup.enter="addTag"
          @keyup.escape="newTag = ''"
        />
        <button
          @click="addTag"
          :disabled="!newTag.trim()"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          添加
        </button>
      </div>
      
      <!-- 快速标签建议 -->
      <div class="flex flex-wrap gap-2">
        <span class="text-xs text-gray-500 mb-1 w-full">快速添加：</span>
        <button
          v-for="suggestion in tagSuggestions"
          :key="suggestion"
          @click="addSuggestedTag(suggestion)"
          class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>

    <!-- 编辑模式 -->
    <div v-if="editingIndex !== -1" class="mt-4 p-3 bg-gray-50 rounded-lg">
      <div class="flex gap-2">
        <input
          v-model="editingTag"
          type="text"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          @keyup.enter="saveEdit"
          @keyup.escape="cancelEdit"
        />
        <button
          @click="saveEdit"
          class="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
        >
          保存
        </button>
        <button
          @click="cancelEdit"
          class="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useVideoStore } from '../stores/videoStore'

interface Props {
  folderPath: string
  initialTags?: string[]
}

interface Emits {
  (e: 'tags-updated', tags: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  initialTags: () => []
})

const emit = defineEmits<Emits>()
const videoStore = useVideoStore()

// 响应式数据
const tags = ref<string[]>([...props.initialTags])
const newTag = ref('')
const editingIndex = ref(-1)
const editingTag = ref('')

// 标签建议
const tagSuggestions = computed(() => {
  const commonTags = ['电影', '电视剧', '纪录片', '动画', '音乐', '教育', '娱乐', '科幻', '动作', '喜剧', '爱情', '悬疑']
  return commonTags.filter(tag => !tags.value.includes(tag))
})

// 添加标签
const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !tags.value.includes(tag)) {
    tags.value.push(tag)
    newTag.value = ''
    emitUpdate()
  }
}

// 添加建议标签
const addSuggestedTag = (tag: string) => {
  if (!tags.value.includes(tag)) {
    tags.value.push(tag)
    emitUpdate()
  }
}

// 移除标签
const removeTag = (index: number) => {
  tags.value.splice(index, 1)
  emitUpdate()
}

// 开始编辑标签
const startEdit = (index: number) => {
  editingIndex.value = index
  editingTag.value = tags.value[index]
}

// 保存编辑
const saveEdit = () => {
  const tag = editingTag.value.trim()
  if (tag && !tags.value.includes(tag)) {
    tags.value[editingIndex.value] = tag
    emitUpdate()
  }
  cancelEdit()
}

// 取消编辑
const cancelEdit = () => {
  editingIndex.value = -1
  editingTag.value = ''
}

// 发送更新事件
const emitUpdate = () => {
  emit('tags-updated', [...tags.value])
}

// 初始化时从videoStore加载标签
onMounted(() => {
  if (props.folderPath) {
    const existingTags = videoStore.getFolderTags(props.folderPath)
    tags.value = [...existingTags]
  }
})

// 监听文件夹路径变化
watch(() => props.folderPath, (newPath) => {
  if (newPath) {
    const existingTags = videoStore.getFolderTags(newPath)
    tags.value = [...existingTags]
  }
})

// 监听初始标签变化
watch(() => props.initialTags, (newTags) => {
  tags.value = [...newTags]
}, { deep: true })
</script>