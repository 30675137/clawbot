# 快速开始: 飞书消息渠道插件

**功能分支**: `001-lark-channel-plugin`
**创建日期**: 2026-01-30

## 前置条件

1. 已安装 Clawbot（`npm install -g clawbot`）
2. 已在飞书开放平台创建企业自建应用
3. 应用已配置以下权限：
   - `im:message` - 获取与发送单聊、群组消息
   - `im:message.group_at_msg` - 接收群聊中@机器人消息
   - `im:chat` - 获取群组信息

## 步骤 1: 获取飞书应用凭据

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 进入「我的应用」→ 选择或创建应用
3. 在「凭证与基础信息」页面获取：
   - **App ID**: `cli_xxxxxxxxxx`
   - **App Secret**: `xxxxxxxxxxxxxxxx`
4. （可选）在「事件订阅」页面获取：
   - **Encrypt Key**: 用于事件加密
   - **Verification Token**: 用于事件验证

## 步骤 2: 配置飞书渠道

运行配置向导：

```bash
clawbot onboard
```

选择「飞书 (Lark)」渠道，按提示输入：
- App ID
- App Secret
- （可选）Encrypt Key
- （可选）Verification Token

## 步骤 3: 配置事件订阅

1. 在飞书开放平台「事件订阅」页面
2. 设置请求网址 URL：`https://your-domain.com/webhook/lark`
   - 如果使用内网穿透，使用穿透后的公网地址
3. 添加事件：
   - `im.message.receive_v1` - 接收消息

## 步骤 4: 启动网关

```bash
clawbot gateway run
```

## 步骤 5: 验证连接

检查渠道状态：

```bash
clawbot channels status
```

预期输出：
```
飞书 (Lark)
  状态: 已连接
  App ID: cli_xxx...
```

## 步骤 6: 测试消息

1. 在飞书中找到你的机器人
2. 发送一条消息，如「你好」
3. 等待 AI 助手回复

## 常见问题

### Q: Webhook 验证失败？

确保：
- 请求网址 URL 可从公网访问
- Verification Token 配置正确
- 网关正在运行

### Q: 消息发送失败？

检查：
- App Secret 是否正确
- 应用是否有 `im:message` 权限
- 机器人是否已添加到目标群组

### Q: Token 刷新失败？

- 检查 App ID 和 App Secret 是否正确
- 确认应用未被禁用

## 下一步

- 将机器人添加到群组，体验群聊功能
- 发送图片测试媒体消息支持
- 查看 [飞书渠道文档](https://docs.molt.bot/channels/lark) 了解更多配置选项
