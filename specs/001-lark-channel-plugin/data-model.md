# 数据模型: 飞书消息渠道插件

**功能分支**: `001-lark-channel-plugin`
**创建日期**: 2026-01-30

## 实体定义

### 1. LarkConfig（飞书应用配置）

存储飞书应用的认证凭据和配置选项。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appId | string | 是 | 飞书应用 App ID |
| appSecret | string | 是 | 飞书应用 App Secret |
| encryptKey | string | 否 | 事件加密密钥（AES-256-CBC） |
| verificationToken | string | 否 | 事件验证 Token |

**验证规则**:
- appId: 非空字符串
- appSecret: 非空字符串
- encryptKey: 如提供，长度应为 32 字符

**存储位置**: `~/.clawbot/credentials/lark/<app-id>.json`

### 2. LarkAccessToken（访问令牌）

管理 Tenant Access Token 的获取和刷新。

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | 访问令牌值 |
| expiresAt | number | 过期时间戳（毫秒） |

**状态转换**:
```
[初始] -> 获取Token -> [有效]
[有效] -> 过期检查 -> [即将过期] -> 刷新 -> [有效]
[有效] -> 过期检查 -> [已过期] -> 重新获取 -> [有效]
[任意] -> API错误(401) -> 重新获取 -> [有效]
```

**刷新策略**: 在过期前 5 分钟主动刷新

### 3. LarkMessage（飞书消息）

表示从飞书接收或发送到飞书的消息。

| 字段 | 类型 | 说明 |
|------|------|------|
| messageId | string | 飞书消息唯一 ID |
| chatId | string | 会话 ID（私聊或群组） |
| chatType | 'p2p' \| 'group' | 会话类型 |
| senderId | string | 发送者 open_id |
| senderName | string | 发送者名称 |
| msgType | string | 消息类型（text/post/image/file） |
| content | object | 消息内容（结构因类型而异） |
| mentions | LarkMention[] | @提及列表 |
| createTime | number | 创建时间戳 |

### 4. LarkMention（@提及）

表示消息中的 @用户 信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 被@用户的 open_id |
| name | string | 被@用户的名称 |
| key | string | 消息中的占位符 key |

### 5. LarkChat（飞书会话）

表示私聊或群组会话。

| 字段 | 类型 | 说明 |
|------|------|------|
| chatId | string | 会话唯一 ID |
| chatType | 'p2p' \| 'group' | 会话类型 |
| name | string | 会话名称（群组名或对方用户名） |
| ownerId | string | 群主 open_id（仅群组） |

### 6. LarkWebhookEvent（Webhook 事件）

表示从飞书接收的 Webhook 事件。

| 字段 | 类型 | 说明 |
|------|------|------|
| schema | string | 事件模式版本 |
| header | object | 事件头信息 |
| header.event_id | string | 事件唯一 ID |
| header.event_type | string | 事件类型 |
| header.create_time | string | 事件创建时间 |
| header.token | string | 验证 Token |
| header.app_id | string | 应用 ID |
| event | object | 事件内容（结构因类型而异） |

## 实体关系

```
LarkConfig 1 -----> 1 LarkAccessToken (配置对应一个活跃Token)
LarkChat 1 -----> * LarkMessage (会话包含多条消息)
LarkMessage 1 -----> * LarkMention (消息包含多个@提及)
```

## 消息类型内容结构

### text（文本消息）
```typescript
{
  text: string  // 纯文本内容
}
```

### post（富文本消息）
```typescript
{
  zh_cn: {  // 或 en_us
    title: string,
    content: Array<Array<{
      tag: 'text' | 'a' | 'at' | 'img',
      // tag-specific fields
    }>>
  }
}
```

### image（图片消息）
```typescript
{
  image_key: string  // 图片 key
}
```

### file（文件消息）
```typescript
{
  file_key: string,  // 文件 key
  file_name: string  // 文件名
}
```

## Zod Schema 定义

```typescript
// 配置 Schema
const LarkConfigSchema = z.object({
  appId: z.string().min(1),
  appSecret: z.string().min(1),
  encryptKey: z.string().length(32).optional(),
  verificationToken: z.string().optional(),
});

// 消息 Schema
const LarkMessageSchema = z.object({
  messageId: z.string(),
  chatId: z.string(),
  chatType: z.enum(['p2p', 'group']),
  senderId: z.string(),
  senderName: z.string(),
  msgType: z.string(),
  content: z.record(z.unknown()),
  mentions: z.array(z.object({
    id: z.string(),
    name: z.string(),
    key: z.string(),
  })).optional(),
  createTime: z.number(),
});
```
