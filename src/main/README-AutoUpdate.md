# AutoUpdate 模块说明

## 概述

`listenAutoUpdate.ts` 是一个重构后的自动更新管理模块，将原本在 `main.ts` 中的 autoUpdater 代码抽取并优化，提供了更好的代码组织和错误处理。

## 主要特性

### 1. 类型安全
- 使用 TypeScript 编写，提供完整的类型定义
- 严格的错误处理和类型检查

### 2. 单例模式
- 使用单例模式确保全局只有一个更新管理器实例
- 避免重复初始化和资源浪费

### 3. 完善的错误处理
- 所有异步操作都包含 try-catch 错误处理
- 详细的日志记录，便于调试
- 优雅的错误降级处理

### 4. 灵活的配置
- 支持自定义更新源配置
- 支持静默检查和手动检查两种模式

## 使用方法

### 在 main.ts 中使用

```typescript
import { autoUpdateManager } from './listenAutoUpdate'

// 在创建主窗口后初始化
if (app.isPackaged) {
  // 初始化自动更新管理器
  autoUpdateManager.initialize(mainWindow)
  // 启动时静默检查更新
  autoUpdateManager.checkForUpdates(true)
}

// 添加 IPC 处理器支持手动检查更新
ipcMain.on('check-for-updates', () => {
  if (app.isPackaged) {
    autoUpdateManager.manualCheckForUpdates()
  }
})
```

### 在渲染进程中触发手动检查

```typescript
// 在渲染进程中
window.electronAPI.ipcRenderer.send('check-for-updates')
```

## API 文档

### AutoUpdateManager 类

#### 方法

##### `initialize(mainWindow: BrowserWindow, config?: any)`
初始化自动更新管理器
- `mainWindow`: 主窗口实例
- `config`: 可选的更新配置对象

##### `checkForUpdates(silent: boolean = false)`
检查更新
- `silent`: 是否静默检查（不显示"已是最新版本"对话框）

##### `manualCheckForUpdates()`
手动触发更新检查（显示所有对话框）

##### `destroy()`
销毁更新管理器，清理资源

## 事件处理

模块会自动处理以下 autoUpdater 事件：

1. **update-available**: 发现可用更新时显示确认对话框
2. **download-progress**: 下载进度时发送进度信息到渲染进程
3. **update-downloaded**: 下载完成时显示重启确认对话框
4. **update-not-available**: 无更新时显示提示（非静默模式）
5. **error**: 更新错误时显示错误对话框

## 渲染进程事件

模块会向渲染进程发送以下事件：

- `update-start`: 开始下载更新
- `update-progress`: 下载进度更新
  ```typescript
  {
    percent: number,        // 下载百分比
    bytesPerSecond: number, // 下载速度
    total: number,          // 总大小
    transferred: number     // 已下载大小
  }
  ```

## 配置选项

默认配置：
```typescript
{
  provider: 'github',
  owner: 'fusujifeng',
  repo: 'lingmei-videoManager',
  releaseType: 'release'
}
```

可以在初始化时传入自定义配置覆盖默认值。

## 优化改进

相比原始代码，新模块提供了以下改进：

1. **更好的代码组织**: 使用类封装，职责分离
2. **类型安全**: 完整的 TypeScript 类型定义
3. **错误处理**: 全面的异常捕获和处理
4. **日志记录**: 详细的操作日志
5. **资源管理**: 正确的事件监听器清理
6. **灵活性**: 支持静默和手动检查模式
7. **可维护性**: 清晰的方法分离和文档注释