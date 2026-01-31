# 飞书 (Lark/Feishu) Channel Plugin

Clawbot 飞书消息渠道插件，支持通过飞书机器人收发消息。

## 功能特性

- **私聊消息**: 支持与用户一对一对话
- **群组消息**: 支持在群组中 @机器人 触发对话
- **富文本消息**: 支持发送带链接、代码块的富文本
- **媒体消息**: 支持图片收发
- **长消息分割**: 自动分割超长消息（>4000字符）
- **安全验证**: 支持事件签名验证和加密

## 快速开始

### 1. 安装插件

```bash
# 进入 clawbot 扩展目录
mkdir -p ~/.clawdbot/extensions
cd ~/.clawdbot/extensions

# 复制插件（从源码目录）
cp -r /path/to/clawbot/extensions/lark ./lark

# 安装依赖
cd lark
npm install --omit=dev
```

### 2. 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 App ID 和 App Secret
4. 配置应用权限：
   - `im:message` - 获取与发送单聊、群组消息
   - `im:message.group_at_msg` - 接收群聊中@机器人消息
   - `im:chat` - 获取群组信息

### 2. 配置 Clawbot

**方式一：交互式配置**

```bash
clawbot setup lark
```

按提示输入：
- App ID (如 `cli_xxxxxxxxxx`)
- App Secret
- (可选) Encrypt Key (32字符)
- (可选) Verification Token

**方式二：手动配置**

编辑 `~/.clawdbot/clawdbot.json`：

```json
{
  "channels": {
    "lark": {
      "accounts": {
        "default": {
          "appId": "cli_xxxxxxxxxx",
          "appSecret": "your-app-secret-here",
          "enabled": true
        }
      }
    }
  },
  "plugins": {
    "entries": {
      "lark": {
        "enabled": true
      }
    }
  }
}
```

### 3. 配置 Webhook

在飞书开放平台配置事件订阅：

1. 设置请求地址: `https://your-domain.com/webhook/lark/default`
2. 订阅事件: `im.message.receive_v1`
3. (可选) 配置加密策略

### 4. 启动网关

```bash
clawbot gateway run
```

## 配置项

| 配置项 | 说明 | 必填 |
|--------|------|------|
| `appId` | 飞书应用 App ID | 是 |
| `appSecret` | 飞书应用 App Secret | 是 |
| `encryptKey` | 事件加密密钥 (32字符) | 否 |
| `verificationToken` | 事件验证 Token | 否 |
| `requireMention` | 群组中是否需要@机器人 (默认 true) | 否 |
| `dmPolicy` | 私聊策略: `allowlist` / `open` | 否 |
| `allowFrom` | 允许的用户 open_id 列表 | 否 |

## 支持的消息类型

| 类型 | 接收 | 发送 | 说明 |
|------|------|------|------|
| `text` | ✅ | ✅ | 纯文本消息 |
| `post` | ✅ | ✅ | 富文本消息 |
| `image` | ✅ | ✅ | 图片消息 |
| `file` | ✅ | ❌ | 文件消息 (仅接收) |

不支持的消息类型会收到友好提示。

## 插件结构

```
extensions/lark/
├── package.json          # 包配置
├── tsconfig.json         # TypeScript 配置
├── index.ts              # 插件入口
├── README.md             # 本文档
└── src/
    ├── channel.ts        # ChannelPlugin 实现
    ├── runtime.ts        # 运行时依赖注入
    ├── api.ts            # 飞书 API 封装
    ├── auth.ts           # Token 管理
    ├── webhook.ts        # Webhook 事件处理
    ├── message.ts        # 消息格式转换
    ├── types.ts          # 类型定义
    ├── channel.test.ts   # Channel 测试
    ├── webhook.test.ts   # Webhook 测试
    └── message.test.ts   # 消息转换测试
```

## API 限制

- 消息长度限制: ~4000 字符 (自动分割)
- Token 有效期: 2 小时 (自动刷新)
- 频率限制: 自动指数退避重试 (最多 5 次)

## 故障排除

### Token 获取失败

检查 App ID 和 App Secret 是否正确：

```bash
clawbot channels status --probe
```

### Webhook 验证失败

1. 确认 Encrypt Key 配置正确 (必须 32 字符)
2. 检查 Verification Token 是否匹配
3. 确认服务器时间同步

### 群组消息无响应

1. 确认机器人已加入群组
2. 确认消息中 @了机器人
3. 检查 `requireMention` 配置

## 参考资料

- [飞书开放平台文档](https://open.feishu.cn/document/)
- [消息 API](https://open.feishu.cn/document/server-docs/im-v1/message/create)
- [事件订阅](https://open.feishu.cn/document/server-docs/event-subscription-guide/overview)
