# 智孕 (Smart pregnancy)

智孕是一款专为孕妇设计的微信小程序，提供AI精准问答助手服务。它能够动态整合用户的健康记录，根据实时对话上下文生成个性化建议。

## 功能特点

- **AI精准问答**：基于用户健康记录和孕期阶段提供个性化建议
- **健康档案管理**：记录和跟踪孕期各项健康指标
- **简洁友好的界面**：采用柔和的色彩方案，操作简单直观

## 页面说明

1. **咨询**：与AI助手进行实时对话，获取个性化建议
2. **健康档案**：管理孕期各项健康指标，包括基本信息、体征记录、用药记录和产检记录
3. **个人中心**：用户信息和设置管理

## 技术实现

- 基于微信小程序开发框架
- 采用模块化的开发方式
- 使用CSS变量实现统一的主题色彩管理
- 模拟数据演示，实际应用中应对接后端API

## 开发与部署

### 开发环境

- 微信开发者工具
- Node.js

### 部署步骤

1. 克隆代码库
2. 在微信开发者工具中导入项目
3. 配置AppID
4. 开发完成后提交审核

## 项目结构

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

## 未来计划

- 增加社区功能，促进用户交流
- 开发医生端应用，实现医患互动
- 增加更多孕期工具和功能

## 关于我们

智孕团队致力于为孕妇提供专业、便捷的孕期健康管理服务，让每位准妈妈都能安心、轻松地度过孕期。
