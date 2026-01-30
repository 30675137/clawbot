# Tasks: 飞书消息渠道插件

**Input**: Design documents from `/specs/001-lark-channel-plugin/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/lark-api.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Extension Plugin**: `extensions/lark/` (workspace package)
- Source code: `extensions/lark/src/`
- Tests: colocated `*.test.ts`

---

## Phase 1: Setup (项目初始化)

**Purpose**: 创建扩展插件项目结构和基础配置

- [ ] T001 创建 `extensions/lark/package.json`，配置 clawbot 扩展入口和依赖
- [ ] T002 [P] 创建 `extensions/lark/tsconfig.json`，继承根项目 TypeScript 配置
- [ ] T003 [P] 创建 `extensions/lark/index.ts`，插件注册入口（导出 ChannelPlugin）

---

## Phase 2: Foundational (基础设施)

**Purpose**: 核心类型定义和 API 封装，所有用户故事的前置依赖

**⚠️ CRITICAL**: 用户故事实现必须等待此阶段完成

- [ ] T004 创建 `extensions/lark/src/types.ts`，定义所有 TypeScript 类型和 Zod Schema
  - LarkConfig, LarkConfigSchema
  - LarkAccessToken
  - LarkMessage, LarkMessageSchema
  - LarkMention
  - LarkChat
  - LarkWebhookEvent
- [ ] T005 [P] [FR-013] 创建 `extensions/lark/src/api.ts`，飞书 API 基础封装
  - HTTP 客户端配置（baseURL, headers）
  - 通用请求方法（带错误处理）
  - 速率限制处理（指数退避重试）
- [ ] T006 [P] 创建 `extensions/lark/src/auth.ts`，Token 管理模块
  - getTenantAccessToken(): 获取 Tenant Access Token
  - Token 缓存和过期检查
  - 自动刷新机制（过期前 5 分钟）
- [ ] T007 创建 `extensions/lark/src/runtime.ts`，运行时依赖注入
  - createDefaultDeps(): 创建默认依赖
  - 依赖接口定义（便于测试 mock）

**Checkpoint**: 基础设施就绪，可以开始用户故事实现

---

## Phase 3: User Story 1 - 配置飞书渠道 (Priority: P1) 🎯 MVP

**Goal**: 用户能够通过配置向导将飞书应用连接到 Clawbot

**Independent Test**: 运行 `clawbot onboard` 选择飞书渠道，输入凭据后显示连接成功

**Related Requirements**: FR-001, FR-002, FR-008, FR-009

### Implementation for User Story 1

- [ ] T008 [US1] 在 `extensions/lark/src/channel.ts` 实现 config 模块
  - validateConfig(): 验证配置有效性
  - loadConfig(): 从凭据文件加载配置
  - saveConfig(): 保存配置到凭据文件
  - 配置存储路径: `~/.clawdbot/credentials/lark/<account-id>.json`
- [ ] T009 [US1] 在 `extensions/lark/src/channel.ts` 实现 onboarding 模块
  - 交互式配置向导流程
  - 提示输入 App ID、App Secret
  - 可选输入 Encrypt Key、Verification Token
  - 调用 API 验证凭据有效性
- [ ] T010 [US1] 在 `extensions/lark/src/channel.ts` 实现 status 模块
  - getStatus(): 返回渠道连接状态
  - 检查 Token 有效性
  - 返回 App ID（部分隐藏）
- [ ] T011 [US1] 在 `extensions/lark/src/channel.ts` 实现 meta 模块
  - id: 'lark'
  - name: '飞书 (Lark)'
  - icon: 飞书图标

**Checkpoint**: 用户故事 1 完成，可以配置飞书渠道并查看状态

---

## Phase 4: User Story 2 - 接收飞书消息 (Priority: P1) 🎯 MVP

**Goal**: Clawbot 能够接收飞书私聊消息并路由给 AI 处理

**Independent Test**: 在飞书中向机器人发送消息，验证网关日志显示收到消息

**Related Requirements**: FR-003, FR-006, FR-012

### Implementation for User Story 2

- [ ] T012 [US2] [FR-003,FR-012] 创建 `extensions/lark/src/webhook.ts`，Webhook 事件处理
  - handleChallenge(): 处理 URL 验证请求
  - verifySignature(): 验证事件签名（Verification Token）
  - decryptEvent(): 解密事件内容（如配置了 Encrypt Key）
- [ ] T013 [US2] 在 `extensions/lark/src/webhook.ts` 实现消息事件处理
  - handleMessageReceive(): 处理 im.message.receive_v1 事件
  - 解析消息内容（text、post 等类型）
  - 提取发送者信息（open_id、名称）
  - 识别会话类型（p2p/group）
- [ ] T013b [US2] [FR-015] 在 `extensions/lark/src/webhook.ts` 处理不支持的消息类型
  - 识别 video、audio、sticker 等不支持的类型
  - 记录 warn 级别日志
  - 回复用户友好提示"暂不支持此消息类型"（可配置是否回复）
- [ ] T014 [US2] 创建 `extensions/lark/src/message.ts`，消息格式转换
  - larkToInternal(): 飞书消息 → Clawbot 内部格式
  - 处理文本消息内容提取
  - 处理 @提及 信息
- [ ] T015 [US2] 在 `extensions/lark/src/channel.ts` 实现 gateway 模块
  - start(): 启动 Webhook 监听
  - stop(): 停止监听
  - 注册 HTTP 路由: POST /webhook/lark

**Checkpoint**: 用户故事 2 完成，可以接收飞书私聊消息

---

## Phase 5: User Story 3 - 发送飞书消息 (Priority: P1) 🎯 MVP

**Goal**: AI 助手的回复能够通过飞书发送给用户

**Independent Test**: 向机器人发送问题，验证 AI 回复在飞书中正确显示

**Related Requirements**: FR-004, FR-005, FR-013, FR-014

### Implementation for User Story 3

- [ ] T016 [US3] 在 `extensions/lark/src/api.ts` 实现消息发送 API
  - sendMessage(): 发送消息到指定会话
  - replyMessage(): 回复指定消息
  - 支持 receive_id_type: chat_id, open_id
- [ ] T017 [US3] 在 `extensions/lark/src/message.ts` 实现消息格式转换
  - internalToLark(): Clawbot 内部格式 → 飞书消息格式
  - formatTextContent(): 格式化文本消息
  - formatPostContent(): 格式化富文本消息（支持代码块、列表）
- [ ] T018 [US3] 在 `extensions/lark/src/message.ts` 实现长消息分割
  - splitLongMessage(): 按长度限制分割消息（~4000 字符）
  - 按段落或句子边界分割，避免截断单词
  - 返回消息数组，依次发送
- [ ] T019 [US3] [FR-013] 在 `extensions/lark/src/channel.ts` 实现 outbound 模块
  - send(): 发送消息到飞书
  - 处理发送失败重试（指数退避）
  - 处理长消息自动分割

**Checkpoint**: 用户故事 3 完成，可以完成完整的消息收发闭环

---

## Phase 6: User Story 4 - 群组消息支持 (Priority: P2)

**Goal**: 支持在飞书群组中使用机器人

**Independent Test**: 将机器人添加到群组，@机器人 发送消息，验证收到回复

**Related Requirements**: FR-007

### Implementation for User Story 4

- [ ] T020 [US4] 在 `extensions/lark/src/webhook.ts` 增强群组消息处理
  - 识别群组消息（chat_type: group）
  - 解析 @机器人 的 mentions 信息
  - 过滤非 @机器人 的群组消息（可配置）
- [ ] T021 [US4] 在 `extensions/lark/src/message.ts` 增强群组消息转换
  - 处理群组消息的发送者识别
  - 回复时 @发送者
  - 支持群组会话 ID（chat_id）
- [ ] T022 [US4] 在 `extensions/lark/src/channel.ts` 实现 capabilities 声明
  - dm: true（私聊支持）
  - group: true（群组支持）
  - thread: false（暂不支持话题）
  - media: true（媒体支持，Phase 7）
- [ ] T023 [US4] 在 `extensions/lark/src/channel.ts` 实现 security 模块
  - DM 策略配置
  - 群组权限配置
  - @机器人 过滤配置

**Checkpoint**: 用户故事 4 完成，支持群组消息交互

---

## Phase 7: User Story 5 - 媒体消息支持 (Priority: P3)

**Goal**: 支持图片消息的收发

**Independent Test**: 向机器人发送图片，验证 AI 能分析图片内容

**Related Requirements**: FR-010, FR-011

### Implementation for User Story 5

- [ ] T024 [US5] 在 `extensions/lark/src/api.ts` 实现媒体 API
  - uploadImage(): 上传图片获取 image_key
  - downloadResource(): 下载图片/文件资源
  - 处理文件大小限制（图片 10MB）
- [ ] T025 [US5] 在 `extensions/lark/src/message.ts` 增强媒体消息处理
  - 处理 image 类型消息接收
  - 下载图片并转换为 Clawbot 媒体格式
  - 处理 file 类型消息（记录文件信息）
- [ ] T026 [US5] 在 `extensions/lark/src/message.ts` 实现图片发送
  - 上传图片获取 image_key
  - 构造 image 类型消息内容
  - 发送图片消息

**Checkpoint**: 用户故事 5 完成，支持图片消息收发

---

## Phase 8: Polish & Integration (完善与集成)

**Purpose**: 测试、文档和最终集成

- [ ] T027 [P] 创建 `extensions/lark/src/channel.test.ts`，单元测试
  - 配置验证测试
  - Token 管理测试
  - 消息格式转换测试
  - Webhook 事件处理测试
- [ ] T028 [P] 更新 `extensions/lark/README.md`，使用文档
  - 安装说明
  - 配置步骤
  - 常见问题
- [ ] T029 在 `extensions/lark/index.ts` 完成插件导出
  - 导出 LarkChannelPlugin
  - 注册到 Clawbot 插件系统
- [ ] T030 运行 quickstart.md 验证完整流程
  - 配置向导测试
  - 消息收发测试
  - 状态检查测试

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 无依赖，可立即开始
- **Phase 2 (Foundational)**: 依赖 Phase 1，阻塞所有用户故事
- **Phase 3-5 (US1-US3, P1)**: 依赖 Phase 2，按顺序执行（配置 → 接收 → 发送）
- **Phase 6 (US4, P2)**: 依赖 Phase 5（需要基础消息收发能力）
- **Phase 7 (US5, P3)**: 依赖 Phase 5（需要基础消息收发能力）
- **Phase 8 (Polish)**: 依赖所有用户故事完成

### User Story Dependencies

```
US1 (配置) ──┬──> US2 (接收) ──> US3 (发送) ──┬──> US4 (群组)
             │                                │
             └────────────────────────────────┴──> US5 (媒体)
```

### Parallel Opportunities

- Phase 1: T002, T003 可并行
- Phase 2: T005, T006 可并行
- Phase 8: T027, T028 可并行
- US4 和 US5 可并行（都依赖 US3 完成后）

---

## Implementation Strategy

### MVP First (P1 用户故事)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational
3. 完成 Phase 3: US1 - 配置飞书渠道
4. 完成 Phase 4: US2 - 接收飞书消息
5. 完成 Phase 5: US3 - 发送飞书消息
6. **STOP and VALIDATE**: 测试完整的消息收发流程
7. 部署/演示 MVP

### Incremental Delivery

1. Setup + Foundational → 基础设施就绪
2. US1 (配置) → 可以连接飞书
3. US2 (接收) → 可以接收消息
4. US3 (发送) → MVP 完成！可以完整对话
5. US4 (群组) → 扩展到群组场景
6. US5 (媒体) → 支持图片交互

---

## Notes

- [P] tasks = 不同文件，无依赖，可并行
- [Story] label 映射任务到具体用户故事
- 每个用户故事应可独立完成和测试
- 每个任务或逻辑组完成后提交
- 在任何 Checkpoint 处可停止验证
- 避免：模糊任务、同文件冲突、破坏独立性的跨故事依赖
