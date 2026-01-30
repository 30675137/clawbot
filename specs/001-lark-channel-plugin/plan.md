# 实现计划: 飞书消息渠道插件

**分支**: `001-lark-channel-plugin` | **日期**: 2026-01-30 | **规格**: [spec.md](./spec.md)
**输入**: 功能规格说明 `/specs/001-lark-channel-plugin/spec.md`

## 摘要

为 Clawbot 添加飞书（Lark/Feishu）消息渠道支持，实现 ChannelPlugin 接口，支持私聊和群组消息的收发、媒体消息处理、配置向导等功能。采用与现有渠道插件（Telegram、Slack）一致的轻量级适配器模式。

## 技术上下文

**语言/版本**: TypeScript 5.9+ (ESM)
**主要依赖**: 飞书开放平台 API（HTTP REST）、Zod（模式验证）
**存储**: 配置存储于 `~/.clawdbot/config.json`，凭据存储于 `~/.clawdbot/credentials/`
**测试**: Vitest（单元测试）、实时测试需要飞书应用凭据
**目标平台**: Node.js 22+，跨平台（Linux/macOS/Windows）
**项目类型**: 扩展插件（extensions workspace package）
**性能目标**: 消息端到端延迟 <10s（不含 AI 处理时间）
**约束**: 飞书 API 速率限制、消息长度限制（~4000 字符）、Webhook 需公网可访问
**规模/范围**: 单用户/小团队使用，支持多账号配置

## 宪章检查

*门禁: 必须在 Phase 0 研究前通过。Phase 1 设计后重新检查。*

| 原则 | 状态 | 说明 |
|------|------|------|
| 一、渠道优先架构 | ✅ 通过 | 作为扩展插件实现，使用 Plugin SDK，遵循现有渠道模式 |
| 二、TypeScript 严格模式 | ✅ 通过 | 使用 TypeScript 严格模式，Zod 验证外部输入 |
| 三、测试驱动质量 | ✅ 通过 | 计划包含单元测试和实时测试 |
| 四、网关中心设计 | ✅ 通过 | 通过 Gateway 接收 Webhook 事件，只发送最终回复 |
| 五、简洁优于巧妙 | ✅ 通过 | 遵循现有插件模式，不引入新抽象 |

## 项目结构

### 文档（本功能）

```text
specs/001-lark-channel-plugin/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出
└── tasks.md             # Phase 2 输出（由 /speckit.tasks 创建）
```

### 源代码（仓库根目录）

```text
extensions/lark/
├── package.json         # 包配置，clawbot 扩展入口
├── index.ts             # 插件注册入口
├── src/
│   ├── channel.ts       # ChannelPlugin 实现
│   ├── runtime.ts       # 运行时依赖注入
│   ├── api.ts           # 飞书 API 封装
│   ├── types.ts         # 类型定义
│   ├── auth.ts          # Token 管理（获取/刷新）
│   ├── webhook.ts       # Webhook 事件处理
│   ├── message.ts       # 消息格式转换
│   └── channel.test.ts  # 单元测试
```

**结构决策**: 采用扩展插件结构（Option: Extension Plugin），与 Telegram、Slack 等现有渠道插件保持一致。核心消息路由逻辑由 Gateway 处理，插件仅负责配置适配和 API 封装。

## 复杂度追踪

> **无违规需要说明** - 本实现遵循现有模式，未引入额外复杂性。
