# 智孕小程序架构说明

## 项目架构概述

智孕小程序采用模块化、分层的架构设计，遵循单一职责原则和关注点分离原则，将功能按照不同的职责进行拆分和封装。整体架构包括以下几层：

1. **视图层 (View)**：pages目录下的WXML和WXSS文件，负责用户界面的展示
2. **控制层 (Controller)**：pages目录下的JS文件，负责处理用户交互和视图更新
3. **服务层 (Service)**：services目录下的JS文件，负责业务逻辑和API调用
4. **数据层 (Model)**：models目录下的JS文件，负责数据结构定义和数据处理
5. **工具层 (Utils)**：utils目录下的JS文件，提供通用工具函数
6. **配置层 (Config)**：config目录下的JS文件，存储全局配置信息
7. **组件层 (Components)**：components目录下的自定义组件

## 模块职责划分

### 服务层 (Services)

服务层是业务逻辑的主要载体，各个服务模块负责不同的业务逻辑处理：

1. **aiService**: 负责AI模型调用和推荐问题生成
   - 管理AI模型选择和配置
   - 处理AI请求和响应
   - 生成推荐问题

2. **chatService**: 负责聊天记录的管理
   - 添加用户和系统消息
   - 保存和加载聊天历史
   - 同步聊天记录到云端
   - 删除聊天记录

3. **messageService**: 负责消息操作
   - 复制消息内容
   - 分享消息
   - 保存消息为图片
   - 添加消息为笔记
   - 处理消息长按操作

4. **noteService**: 负责笔记的管理
   - 获取和保存笔记
   - 删除笔记
   - 同步笔记到云端
   - 将内容添加为笔记

5. **promptService**: 负责提示词管理
   - 根据不同场景生成提示词
   - 管理提示词模板

6. **userService**: 负责用户相关操作
   - 用户登录和注册
   - 管理用户信息
   - 更新用户设置

7. **healthRecordService**: 负责健康记录管理
   - 添加和更新健康记录
   - 获取健康记录列表
   - 同步健康记录到云端

### 工具层 (Utils)

工具层提供通用的、与业务无关的功能性工具：

1. **canvasUtil**: Canvas绘图相关工具
   - 文本高度计算
   - 文本换行处理
   - 生成分享图片
   - 保存图片到相册

2. **textUtil**: 文本处理工具
   - 格式化日期
   - 提取标题和内容
   - 截断文本
   - 剔除HTML标签
   - 生成随机ID

3. **markdownUtil**: Markdown解析和渲染工具
   - Markdown格式检测
   - Markdown转HTML
   - 移除Markdown标记

4. **storageUtil**: 存储操作工具
   - 本地存储读写
   - 缓存管理

5. **fileUtil**: 文件操作工具
   - 文件读写
   - 临时文件管理

6. **uiUtil**: UI操作工具
   - 显示提示和对话框
   - 页面导航
   - 动画效果

7. **logger**: 日志工具
   - 日志记录
   - 错误追踪

### 配置层 (Config)

配置层集中管理系统的全局配置信息：

1. **appConfig**: 应用配置
   - 存储键名常量
   - API配置
   - 模型配置
   - 云函数名称
   - 默认推荐问题

### 控制层 (Controller)

控制层作为视图层和服务层之间的桥梁，负责处理用户交互和更新视图：

1. **chat/chat.js**: 聊天页面控制器
   - 处理用户输入和AI回复
   - 管理聊天界面状态
   - 调用各种服务完成业务操作

2. **records/records.js**: 健康档案页面控制器
   - 管理健康记录视图
   - 处理记录添加和修改操作

3. **profile/profile.js**: 个人中心页面控制器
   - 管理用户信息显示
   - 处理用户设置

4. **settings/settings.js**: 设置页面控制器
   - 管理系统设置
   - 处理模型选择和其他配置

## 优化后的文件结构

```
miniprogram/
├── app.js                  # 应用程序逻辑
├── app.json                # 应用程序配置
├── app.wxss                # 应用程序样式
├── config/                 # 配置文件
│   └── appConfig.js        # 应用全局配置
├── services/               # 服务层
│   ├── aiService.js        # AI服务
│   ├── chatService.js      # 聊天服务
│   ├── messageService.js   # 消息服务
│   ├── noteService.js      # 笔记服务
│   ├── promptService.js    # 提示词服务
│   ├── userService.js      # 用户服务
│   └── healthRecordService.js # 健康记录服务
├── utils/                  # 工具层
│   ├── canvasUtil.js       # Canvas工具
│   ├── textUtil.js         # 文本处理工具
│   ├── markdownUtil.js     # Markdown工具
│   ├── storageUtil.js      # 存储工具
│   ├── fileUtil.js         # 文件工具
│   ├── uiUtil.js           # UI工具
│   └── logger.js           # 日志工具
├── pages/                  # 页面文件夹
│   ├── chat/               # 聊天页面
│   ├── records/            # 健康档案页面
│   ├── profile/            # 个人中心页面
│   ├── settings/           # 设置页面
│   ├── notes/              # 笔记页面
│   ├── note-detail/        # 笔记详情页面
│   └── policy/             # 政策页面
└── images/                 # 图片资源
```

## 架构优化亮点

1. **职责明确**：每个模块都有明确的职责边界，单一职责原则使代码更容易维护和扩展。

2. **关注点分离**：视图逻辑、业务逻辑、数据处理逻辑相互分离，降低了各部分之间的耦合度。

3. **代码复用**：通过服务层和工具层的抽象，提高了代码复用性，避免了重复代码。

4. **可测试性**：独立的业务逻辑层便于单元测试，提高了代码质量。

5. **可扩展性**：模块化的设计使添加新功能或修改现有功能更加简单，不会对其他模块造成影响。

6. **维护性提升**：清晰的文件结构和模块划分，使开发人员更容易理解和维护代码。

## 代码优化示例

### 优化前（chat.js中的画布操作）：

```javascript
// 计算文本高度 (Canvas 2D版本)
calculateTextHeight2d(ctx, text, maxWidth, lineHeight) {
  // 如果文本为空，返回一行的高度
  if (!text || text.trim() === '') {
    return lineHeight
  }

  // 先按换行符分割文本
  const paragraphs = text.split('\n')
  let totalHeight = 0

  // 处理每个段落
  for (let i = 0; i < paragraphs.length; i++) {
    // ...计算逻辑...
  }

  return totalHeight + lineHeight * 0.3
}

// 生成分享图片
generateShareImage() {
  return new Promise((resolve, reject) => {
    // ...复杂的图片生成逻辑...
  })
}

// 保存图片到相册
saveImageToAlbum(filePath) {
  wx.saveImageToPhotosAlbum({
    // ...保存逻辑...
  })
}
```

### 优化后（抽取至canvasUtil.js）：

```javascript
// chat.js 中的调用
generateShareImage() {
  const index = this.data.currentShareMessageIndex
  const message = this.data.messages[index]
  
  return canvasUtil.generateShareImage(message, {
    titleExtractor: textUtil.extractTitleAndContent
  }, this)
}

// canvasUtil.js 中的实现
generateShareImage(message, options, component) {
  // 封装的图片生成逻辑
}

calculateTextHeight2d(ctx, text, maxWidth, lineHeight) {
  // 封装的文本高度计算逻辑
}

saveImageToAlbum(filePath) {
  // 封装的图片保存逻辑
}
```

## 总结

通过这次架构优化，智孕小程序的代码结构更加清晰，模块职责划分更加明确，代码复用性和可维护性得到了显著提升。各个功能模块之间的耦合度降低，使得后续的功能扩展和维护工作更加简单高效。 