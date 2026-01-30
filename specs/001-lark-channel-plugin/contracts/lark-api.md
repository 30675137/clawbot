# 飞书 API 契约

**功能分支**: `001-lark-channel-plugin`
**创建日期**: 2026-01-30

## 概述

本文档定义飞书插件与飞书开放平台 API 的交互契约。

## 认证 API

### 获取 Tenant Access Token

**端点**: `POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/`

**请求**:
```json
{
  "app_id": "cli_xxx",
  "app_secret": "xxx"
}
```

**响应**:
```json
{
  "code": 0,
  "msg": "success",
  "tenant_access_token": "t-xxx",
  "expire": 7200
}
```

**错误码**:
| code | 说明 |
|------|------|
| 0 | 成功 |
| 10003 | app_id 不存在 |
| 10014 | app_secret 错误 |

## 消息 API

### 发送消息

**端点**: `POST https://open.feishu.cn/open-apis/im/v1/messages`

**Query 参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| receive_id_type | string | 是 | 接收者 ID 类型：open_id/user_id/union_id/email/chat_id |

**请求头**:
```
Authorization: Bearer {tenant_access_token}
Content-Type: application/json
```

**请求体**:
```json
{
  "receive_id": "oc_xxx",
  "msg_type": "text",
  "content": "{\"text\":\"Hello\"}"
}
```

**响应**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "message_id": "om_xxx",
    "root_id": "om_xxx",
    "parent_id": "om_xxx",
    "msg_type": "text",
    "create_time": "1234567890",
    "update_time": "1234567890",
    "deleted": false,
    "chat_id": "oc_xxx",
    "sender": {
      "id": "ou_xxx",
      "id_type": "open_id",
      "sender_type": "user"
    },
    "body": {
      "content": "{\"text\":\"Hello\"}"
    }
  }
}
```

### 回复消息

**端点**: `POST https://open.feishu.cn/open-apis/im/v1/messages/{message_id}/reply`

**请求体**:
```json
{
  "msg_type": "text",
  "content": "{\"text\":\"Reply content\"}"
}
```

## 媒体 API

### 上传图片

**端点**: `POST https://open.feishu.cn/open-apis/im/v1/images`

**请求头**:
```
Authorization: Bearer {tenant_access_token}
Content-Type: multipart/form-data
```

**表单字段**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image_type | string | 是 | 图片类型：message |
| image | file | 是 | 图片文件（最大 10MB） |

**响应**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "image_key": "img_xxx"
  }
}
```

### 下载图片

**端点**: `GET https://open.feishu.cn/open-apis/im/v1/messages/{message_id}/resources/{file_key}`

**Query 参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 资源类型：image/file |

**响应**: 二进制文件流

## Webhook 事件

### URL 验证（Challenge）

**请求**:
```json
{
  "challenge": "xxx",
  "token": "xxx",
  "type": "url_verification"
}
```

**响应**:
```json
{
  "challenge": "xxx"
}
```

### 消息接收事件

**事件类型**: `im.message.receive_v1`

**请求体**:
```json
{
  "schema": "2.0",
  "header": {
    "event_id": "xxx",
    "event_type": "im.message.receive_v1",
    "create_time": "1234567890",
    "token": "xxx",
    "app_id": "cli_xxx",
    "tenant_key": "xxx"
  },
  "event": {
    "sender": {
      "sender_id": {
        "open_id": "ou_xxx",
        "user_id": "xxx",
        "union_id": "on_xxx"
      },
      "sender_type": "user",
      "tenant_key": "xxx"
    },
    "message": {
      "message_id": "om_xxx",
      "root_id": "om_xxx",
      "parent_id": "om_xxx",
      "create_time": "1234567890",
      "chat_id": "oc_xxx",
      "chat_type": "p2p",
      "message_type": "text",
      "content": "{\"text\":\"Hello\"}",
      "mentions": [
        {
          "key": "@_user_1",
          "id": {
            "open_id": "ou_xxx",
            "user_id": "xxx",
            "union_id": "on_xxx"
          },
          "name": "User Name"
        }
      ]
    }
  }
}
```

**响应**: HTTP 200（空响应体或 `{"code": 0}`）

## 错误处理

### 通用错误码

| code | 说明 | 处理方式 |
|------|------|----------|
| 0 | 成功 | - |
| 99991400 | 请求参数错误 | 检查请求参数 |
| 99991401 | 认证失败 | 刷新 Token |
| 99991402 | 权限不足 | 检查应用权限配置 |
| 99991429 | 请求过于频繁 | 指数退避重试 |

### 速率限制

- 返回 HTTP 429 或 code 99991429 时触发
- 实现指数退避：1s -> 2s -> 4s -> 8s -> 16s -> 32s
- 最多重试 5 次
