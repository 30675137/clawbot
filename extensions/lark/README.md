# 飞书 (Lark/Feishu) 插件开发方案

本文档描述如何为 Clawbot 添加飞书消息渠道支持。

## 概述

飞书（Lark）是字节跳动推出的企业协作平台，提供完善的开放 API，支持机器人消息收发、群组管理等功能。

## 插件结构

```
extensions/lark/
├── package.json      # 包配置
├── index.ts          # 插件入口
├── README.md         # 本文档
└── src/
    ├── channel.ts    # ChannelPlugin 实现
    ├── runtime.ts    # 运行时依赖注入
    ├── api.ts        # 飞书 API 封装
    └── types.ts      # 类型定义
```

## 核心接口实现

需要实现 `ChannelPlugin` 接口，主要模块：

| 模块 | 功能 | 说明 |
|------|------|------|
| `meta` | 渠道元信息 | 名称、图标、描述等 |
| `capabilities` | 功能声明 | DM、群聊、线程、媒体支持 |
| `config` | 账号配置 | App ID/Secret 管理 |
| `security` | 安全策略 | DM 策略、群组权限 |
| `outbound` | 消息发送 | 文本、富文本、媒体 |
| `gateway` | 消息接收 | 启动/停止事件监听 |
| `status` | 状态探测 | 连接状态检查 |
| `onboarding` | 配置向导 | 交互式初始化 |

## 飞书 API 集成

### 认证方式

飞书支持两种认证：

1. **Tenant Access Token**（应用身份）
   - 适用于企业内部应用
   - 使用 App ID + App Secret 获取

2. **User Access Token**（用户身份）
   - 适用于需要用户授权的场景
   - OAuth 2.0 流程

### 核心 API

```typescript
// 消息相关
im_v1_message_create    // 发送消息
im_v1_message_list      // 获取消息历史

// 群组相关
im_v1_chat_create       // 创建群组
im_v1_chat_list         // 获取群组列表
im_v1_chatMembers_get   // 获取群成员

// 事件订阅
// 通过 Webhook 接收消息回调
```

### 消息类型支持

| 类型 | msg_type | 支持状态 |
|------|----------|----------|
| 文本 | `text` | 必须 |
| 富文本 | `post` | 推荐 |
| 图片 | `image` | 推荐 |
| 文件 | `file` | 可选 |
| 卡片 | `interactive` | 可选 |

## 实现步骤

### 1. 创建包配置

```json
// package.json
{
  "name": "@clawbot/lark",
  "version": "0.0.1",
  "type": "module",
  "description": "clawbot Lark/Feishu channel plugin",
  "clawbot": {
    "extensions": ["./index.ts"]
  }
}
```

### 2. 插件入口

```typescript
// index.ts
import type { clawbotPluginApi } from "clawdbot/plugin-sdk";
import { emptyPluginConfigSchema } from "clawdbot/plugin-sdk";
import { larkPlugin } from "./src/channel.js";
import { setLarkRuntime } from "./src/runtime.js";

const plugin = {
  id: "lark",
  name: "飞书",
  description: "Lark/Feishu channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: clawbotPluginApi) {
    setLarkRuntime(api.runtime);
    api.registerChannel({ plugin: larkPlugin });
  },
};

export default plugin;
```

### 3. Channel 实现

```typescript
// src/channel.ts
import type { ChannelPlugin } from "clawdbot/plugin-sdk";

export const larkPlugin: ChannelPlugin = {
  meta: {
    id: "lark",
    name: "飞书",
    icon: "lark",
    description: "Lark/Feishu messaging",
  },

  capabilities: {
    dm: true,
    group: true,
    thread: true,
    media: ["image", "file"],
  },

  // ... 其他模块实现
};
```

### 4. 事件订阅（Webhook）

飞书通过 HTTP 回调推送消息事件：

1. 在飞书开放平台配置事件订阅 URL
2. 实现 URL 验证（challenge 响应）
3. 处理 `im.message.receive_v1` 事件

```typescript
// Webhook 事件处理示例
async function handleEvent(event: LarkEvent) {
  if (event.type === "im.message.receive_v1") {
    const message = event.event.message;
    // 转换为 Clawbot 消息格式并路由
  }
}
```

## 配置项

| 配置项 | 说明 | 必填 |
|--------|------|------|
| `appId` | 飞书应用 App ID | 是 |
| `appSecret` | 飞书应用 App Secret | 是 |
| `encryptKey` | 事件加密密钥 | 否 |
| `verificationToken` | 事件验证 Token | 否 |

## 开发任务清单

- [ ] 基础骨架 + package.json
- [ ] 认证模块（获取 access token）
- [ ] 消息发送（文本）
- [ ] 事件订阅 + 消息接收
- [ ] 群组支持
- [ ] 媒体消息（图片/文件）
- [ ] 状态探测
- [ ] Onboarding 向导
- [ ] 单元测试
- [ ] 文档

## 参考资料

- [飞书开放平台文档](https://open.feishu.cn/document/)
- [消息 API](https://open.feishu.cn/document/server-docs/im-v1/message/create)
- [事件订阅](https://open.feishu.cn/document/server-docs/event-subscription-guide/overview)
- 现有插件参考：`extensions/telegram/`、`extensions/slack/`
