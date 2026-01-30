# 研究文档: 飞书消息渠道插件

**功能分支**: `001-lark-channel-plugin`
**创建日期**: 2026-01-30

## 研究任务

### 1. 飞书开放平台 API 认证机制

**决策**: 使用 Tenant Access Token（应用身份）进行 API 认证

**理由**:
- Tenant Access Token 适用于企业内部应用，无需用户授权流程
- 获取方式简单：使用 App ID + App Secret 调用 `/auth/v3/tenant_access_token/internal/` 接口
- Token 有效期 2 小时，需要实现自动刷新机制
- 满足机器人消息收发的所有权限需求

**备选方案**:
- User Access Token（用户身份）：需要 OAuth 2.0 授权流程，适用于需要代表用户操作的场景，初始版本不需要

### 2. 消息接收机制（事件订阅）

**决策**: 使用 HTTP Webhook 接收消息事件

**理由**:
- 飞书通过 HTTP POST 回调推送事件到配置的 URL
- 需要实现 URL 验证（challenge 响应）
- 主要监听 `im.message.receive_v1` 事件
- 支持可选的事件加密（AES-256-CBC）

**实现要点**:
- Gateway 需要暴露 HTTP 端点接收 Webhook
- 验证事件签名（使用 Verification Token 或 Encrypt Key）
- 解析消息内容并转换为 Clawbot 内部格式

**备选方案**:
- WebSocket 长连接：飞书不提供此方式
- 轮询 API：效率低，不推荐

### 3. 消息发送 API

**决策**: 使用 `im/v1/messages` API 发送消息

**理由**:
- 支持多种消息类型：text、post（富文本）、image、file、interactive（卡片）
- 支持私聊和群组发送
- 支持 @用户 功能

**消息类型映射**:
| Clawbot 类型 | 飞书 msg_type | 说明 |
|-------------|---------------|------|
| 文本 | text | 纯文本消息 |
| 富文本 | post | 支持标题、段落、链接、@用户 |
| 图片 | image | 需要先上传获取 image_key |
| 文件 | file | 需要先上传获取 file_key |

### 4. 媒体文件处理

**决策**: 使用飞书媒体上传/下载 API

**理由**:
- 发送图片前需要调用 `/im/v1/images` 上传获取 image_key
- 发送文件前需要调用 `/im/v1/files` 上传获取 file_key
- 接收图片/文件时需要使用 message_id 和 file_key 下载

**实现要点**:
- 上传时需要指定 image_type（message/avatar）
- 下载时需要携带 Authorization header
- 文件大小限制：图片 10MB，文件 30MB

### 5. 现有插件模式分析

**决策**: 遵循 Telegram/Slack 插件的轻量级适配器模式

**理由**:
- 现有插件结构清晰，职责分离明确
- ChannelPlugin 接口定义了标准的模块划分
- 运行时依赖注入模式便于测试

**关键模块**:
| 模块 | 职责 |
|------|------|
| meta | 渠道元信息（id、name、icon） |
| capabilities | 功能声明（dm、group、thread、media） |
| config | 账号配置管理 |
| security | 安全策略（DM 策略、群组权限） |
| outbound | 消息发送 |
| gateway | 消息接收（启动/停止事件监听） |
| status | 状态探测 |
| onboarding | 配置向导 |

### 6. 消息长度限制处理

**决策**: 超长消息自动分割为多条发送

**理由**:
- 飞书单条消息限制约 4000 字符
- 与其他渠道（Telegram、Discord）保持一致的处理策略
- 用户体验优于截断或转文件

**实现要点**:
- 在发送前检测消息长度
- 按段落或句子边界分割，避免截断单词
- 依次发送分割后的消息，保持顺序

### 7. 速率限制处理

**决策**: 实现指数退避重试策略

**理由**:
- 飞书 API 有速率限制（具体限制因 API 而异）
- 返回 429 状态码时需要等待后重试
- 指数退避可避免持续触发限制

**实现要点**:
- 初始等待 1 秒，每次翻倍，最大 32 秒
- 最多重试 5 次
- 记录重试日志便于排查

## 技术决策汇总

| 领域 | 决策 | 理由 |
|------|------|------|
| 认证 | Tenant Access Token | 简单、满足需求 |
| 消息接收 | HTTP Webhook | 飞书标准方式 |
| 消息发送 | REST API | 支持多种消息类型 |
| 媒体处理 | 上传/下载 API | 飞书标准方式 |
| 插件结构 | 轻量级适配器 | 与现有插件一致 |
| 长消息 | 自动分割 | 用户体验最佳 |
| 速率限制 | 指数退避 | 行业最佳实践 |

## 参考资料

- [飞书开放平台文档](https://open.feishu.cn/document/)
- [获取 tenant_access_token](https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token_internal)
- [发送消息](https://open.feishu.cn/document/server-docs/im-v1/message/create)
- [事件订阅概述](https://open.feishu.cn/document/server-docs/event-subscription-guide/overview)
- [上传图片](https://open.feishu.cn/document/server-docs/im-v1/image/create)
