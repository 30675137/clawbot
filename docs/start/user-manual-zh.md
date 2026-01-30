---
summary: "中文用户操作手册：从安装到日常使用的完整指南"
read_when:
  - 中文用户首次使用 clawbot
  - 需要快速查找常用命令
  - 配置模型和消息渠道
---

# clawbot 用户操作手册

> 本手册面向普通用户，提供从安装到日常使用的完整指南。

## 一、快速入门

### 1. 系统要求

- **Node.js**: ≥22 版本
- **操作系统**: macOS（推荐）、Linux、Windows（仅支持 WSL2）

### 2. 安装

```bash
# 方式一：一键安装脚本（推荐）
curl -fsSL https://molt.bot/install.sh | bash

# 方式二：npm 全局安装
npm install -g clawbot@latest

# 方式三：pnpm 全局安装
pnpm add -g clawbot@latest
```

### 3. 首次设置（引导向导）

```bash
# 运行引导向导并安装后台服务
clawbot onboard --install-daemon
```

向导会引导您完成：
- 模型认证配置（OAuth / API Key）
- Gateway 设置
- 消息渠道配置（WhatsApp/Telegram/Discord 等）
- 安全配对设置

---

## 二、Gateway 服务管理

Gateway 是 clawbot 的核心服务，负责处理所有消息渠道连接。

### 启动 Gateway

```bash
# 前台运行（适合调试）
clawbot gateway

# 带端口和详细日志
clawbot gateway --port 18789 --verbose

# 强制启动（杀掉已占用端口的进程）
clawbot gateway --force
```

### 服务管理

```bash
# 查看服务状态
clawbot gateway status

# 安装为后台服务（launchd/systemd）
clawbot daemon install

# 启动/停止/重启服务
clawbot daemon start
clawbot daemon stop
clawbot daemon restart

# 卸载服务
clawbot daemon uninstall
```

### 打开控制面板（Dashboard）

```bash
# 在浏览器中打开控制面板
clawbot dashboard
```

或直接访问：`http://127.0.0.1:18789/`

---

## 三、模型配置

### 查看模型状态

```bash
# 查看当前模型配置和认证状态
clawbot models status

# 列出所有可用模型
clawbot models list

# 扫描可用模型
clawbot models scan
```

**输出字段说明**：

| 字段 | 说明 |
|------|------|
| `default` | 当前默认使用的模型 |
| `configured` | 已在配置文件中配置的模型 |
| `missing` | 模型名称无效或不存在 |
| `Auth` | 认证状态（yes=已配置 API Key） |

### 验证模型是否可用（探测）

**重要**：配置模型后，务必使用 `--probe` 验证模型是否真正可用：

```bash
# 探测所有已配置模型的实际可用性
clawbot models status --probe
```

**探测结果解读**：

| 状态 | 含义 | 解决方案 |
|------|------|----------|
| `ok` | 模型可用，API Key 有效 | 无需处理 |
| `unknown` | 模型名称无效或不存在 | 更换为有效的模型名称 |
| `auth` | 认证失败 | 检查 API Key 是否正确/过期 |
| `timeout` | 请求超时 | 检查网络连接 |

**示例输出**：
```
│ Model                           │ Status                              │
├─────────────────────────────────┼─────────────────────────────────────┤
│ openrouter/minimax/minimax-m2.1 │ ok · 7.3s                           │
│ openrouter/auto                 │ unknown · ↳ Unknown model           │
│ github-copilot/claude-haiku-4.5 │ auth · ↳ HTTP 403                   │
```

### 设置默认模型

```bash
# 设置默认模型（格式：provider/model）
clawbot models set anthropic/claude-sonnet-4-20250514

# 使用 OpenRouter 模型
clawbot models set openrouter/minimax/minimax-m2.1
clawbot models set openrouter/anthropic/claude-3.5-sonnet

# 使用 OpenAI 模型
clawbot models set openai/gpt-4o
clawbot models set openai/gpt-4-turbo

# 使用别名（如已配置）
clawbot models set claude-sonnet
```

**常见模型名称**：

| 提供商 | 模型名称示例 |
|--------|-------------|
| Anthropic | `anthropic/claude-sonnet-4-20250514`, `anthropic/claude-3-opus` |
| OpenAI | `openai/gpt-4o`, `openai/gpt-4-turbo`, `openai/o1-preview` |
| Google | `google/gemini-2.0-flash`, `google/gemini-pro` |
| OpenRouter | `openrouter/anthropic/claude-3.5-sonnet`, `openrouter/minimax/minimax-m2.1` |
| Moonshot | `moonshot/moonshot-v1-32k` |

### 配置 API Key

#### 方式一：环境变量（推荐开发环境）

```bash
# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# OpenAI
export OPENAI_API_KEY="sk-..."

# Google Gemini
export GEMINI_API_KEY="..."

# 其他提供商
export MOONSHOT_API_KEY="..."
export MINIMAX_API_KEY="..."
export OPENROUTER_API_KEY="..."
```

永久保存到 `~/.clawdbot/.env` 文件：

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> ~/.clawdbot/.env
```

#### 方式二：通过向导配置（推荐）

```bash
# 添加新的认证
clawbot models auth add

# 登录特定提供商
clawbot models auth login --provider anthropic
```

#### 方式三：使用 setup-token（Anthropic）

```bash
# 如果您有 Claude 订阅，可以使用 setup-token
claude setup-token  # 在另一台机器上生成
clawbot models auth setup-token --provider anthropic
```

### 认证配置文件位置

```
~/.clawdbot/agents/main/agent/auth-profiles.json
```

### 完整的模型配置流程

```bash
# 1. 查看当前配置
clawbot models status

# 2. 列出可用模型
clawbot models list

# 3. 设置默认模型
clawbot models set openrouter/minimax/minimax-m2.1

# 4. 验证模型是否可用（重要！）
clawbot models status --probe

# 5. 如需重启服务使配置生效
clawbot daemon restart
```

---

## 四、消息渠道配置

### WhatsApp

```bash
# 登录 WhatsApp（扫描二维码）
clawbot channels login

# 查看 WhatsApp 状态
clawbot channels status
```

### Telegram

```bash
# 配置 Telegram Bot Token
clawbot configure --section telegram

# 或手动设置
clawbot config set channels.telegram.botToken "YOUR_BOT_TOKEN"
```

### Discord

```bash
# 配置 Discord Bot Token
clawbot configure --section discord

# 或手动设置
clawbot config set channels.discord.botToken "YOUR_BOT_TOKEN"
```

### iMessage（仅 macOS）

需要先安装 imsg CLI：

```bash
brew install steipete/tap/imsg
```

然后配置：

```bash
clawbot config set channels.imessage.cliPath "/opt/homebrew/bin/imsg"
```

---

## 五、配置管理

### 查看配置

```bash
# 查看所有配置
clawbot config get .

# 查看特定配置项
clawbot config get channels.whatsapp.allowFrom
clawbot config get gateway.port
```

### 修改配置

```bash
# 设置配置值
clawbot config set gateway.port 19001
clawbot config set channels.whatsapp.allowFrom '["+15555550123"]' --json

# 删除配置项
clawbot config unset tools.web.search.apiKey
```

### 配置文件位置

| 文件 | 路径 | 说明 |
|------|------|------|
| 主配置文件 | `~/.clawdbot/clawbot.json` | 所有配置项 |
| 认证配置 | `~/.clawdbot/agents/main/agent/auth-profiles.json` | API Key、OAuth 令牌 |
| 环境变量 | `~/.clawdbot/.env` | 环境变量（daemon 可读） |

---

## 六、状态检查与诊断

### 系统状态

```bash
# 查看整体状态
clawbot status

# 详细状态（包含探测）
clawbot status --all

# 健康检查
clawbot health

# 安全审计
clawbot security audit --deep
```

### 诊断修复

```bash
# 运行诊断工具（检查并修复问题）
clawbot doctor

# 查看日志
clawbot logs tail
```

---

## 七、消息发送

```bash
# 发送消息
clawbot message send --target "+15555550123" --message "Hello!"

# 发送到特定渠道
clawbot message send --channel whatsapp --target "+15555550123" --message "Hi"
```

---

## 八、配对管理（安全）

默认情况下，陌生人的 DM 需要配对码批准。

```bash
# 查看待配对列表
clawbot pairing list whatsapp

# 批准配对
clawbot pairing approve whatsapp <code>

# 查看所有渠道的配对状态
clawbot pairing list
```

---

## 九、常用命令速查表

| 功能 | 命令 |
|------|------|
| 首次设置 | `clawbot onboard --install-daemon` |
| 启动 Gateway | `clawbot gateway` |
| 查看状态 | `clawbot status` |
| 健康检查 | `clawbot health` |
| 登录 WhatsApp | `clawbot channels login` |
| 查看模型状态 | `clawbot models status` |
| 设置默认模型 | `clawbot models set <provider/model>` |
| 打开控制面板 | `clawbot dashboard` |
| 诊断修复 | `clawbot doctor` |
| 查看配置 | `clawbot config get <path>` |
| 修改配置 | `clawbot config set <path> <value>` |
| 发送消息 | `clawbot message send --target <number> --message <text>` |

---

## 十、FAQ

### Q1: Gateway 启动失败，提示端口被占用？

```bash
# 使用 --force 强制启动
clawbot gateway --force
```

### Q2: 如何查看详细的错误日志？

```bash
clawbot gateway --verbose
clawbot logs --limit 100
```

日志文件位置：`/tmp/clawbot/clawbot-YYYY-MM-DD.log`

### Q3: 模型认证失败？

```bash
# 检查认证状态
clawbot models status --probe

# 重新配置认证
clawbot models auth add
```

### Q4: 如何重置所有配置？

```bash
clawbot reset
```

### Q5: 如何更新到最新版本？

```bash
npm update -g clawbot
# 或
clawbot update
```

### Q6: API Key 应该存放在哪里？

推荐存放位置（按优先级）：
1. `~/.clawdbot/agents/main/agent/auth-profiles.json`（通过向导配置）
2. `~/.clawdbot/.env`（环境变量文件）
3. Shell 环境变量

### Q7: 如何切换不同的模型提供商？

```bash
# 查看可用模型
clawbot models list

# 切换模型
clawbot models set openai/gpt-4o
clawbot models set anthropic/claude-sonnet-4-20250514
clawbot models set google/gemini-2.0-flash
```

### Q8: WhatsApp 登录二维码过期了怎么办？

```bash
# 重新登录
clawbot channels login
```

### Q9: 如何查看帮助信息？

```bash
# 查看所有命令
clawbot --help

# 查看特定命令的帮助
clawbot gateway --help
clawbot models --help
clawbot config --help
```

### Q10: 聊天发送消息后没有任何反馈？

这是最常见的问题之一，按以下步骤排查：

**步骤 1：检查 Gateway 是否运行**
```bash
clawbot status
```
查看 `Gateway` 行是否显示 `reachable`。

**步骤 2：检查模型配置是否有效**
```bash
clawbot models status --probe
```

**关键**：查看默认模型的状态：
- `ok` = 正常
- `unknown` = **模型名称无效，这是最常见的原因**
- `auth` = 认证失败

**步骤 3：如果模型状态是 unknown，切换到有效模型**
```bash
# 查看哪些模型可用
clawbot models list

# 切换到一个有效的模型
clawbot models set openrouter/minimax/minimax-m2.1

# 再次验证
clawbot models status --probe
```

**步骤 4：重启服务**
```bash
clawbot daemon restart
```

**步骤 5：清除会话缓存（可选）**
```bash
clawbot session clear agent:main:main
```

### Q11: 模型状态显示 "Unknown model" 怎么办？

这表示配置的模型名称无效。常见原因：

1. **模型名称拼写错误**
2. **使用了不存在的模型**（如 `openrouter/auto`）
3. **提供商不支持该模型**

**解决方法**：

```bash
# 1. 查看当前配置的模型
clawbot models list

# 2. 选择一个有效的模型（状态不是 missing 的）
clawbot models set openrouter/minimax/minimax-m2.1

# 3. 验证
clawbot models status --probe
```

### Q12: 如何查看完整的系统诊断信息？

```bash
# 完整状态报告（可用于分享/求助）
clawbot status --all

# 运行自动诊断
clawbot doctor

# 健康检查
clawbot health
```

---

## 十一、故障排查流程图

当遇到问题时，按以下顺序排查：

```
发送消息无反馈？
    │
    ├─→ 1. clawbot status
    │      └─→ Gateway 未运行？ → clawbot gateway --force
    │
    ├─→ 2. clawbot models status --probe
    │      ├─→ 状态 unknown？ → 更换模型：clawbot models set <有效模型>
    │      ├─→ 状态 auth？   → 重新认证：clawbot models auth add
    │      └─→ 状态 ok？     → 继续下一步
    │
    ├─→ 3. clawbot daemon restart
    │
    └─→ 4. 仍有问题？
           ├─→ clawbot doctor（自动诊断）
           ├─→ clawbot logs --limit 100（查看日志）
           └─→ clawbot status --all（完整状态报告）
```

**快速排查命令汇总**：

```bash
# 一键排查脚本（按顺序执行）
clawbot status                    # 1. 整体状态
clawbot models status --probe     # 2. 模型探测（最重要）
clawbot health                    # 3. 健康检查
clawbot doctor                    # 4. 自动诊断
clawbot logs --limit 50           # 5. 查看最近日志
```

---

## 相关文档

- [Getting Started（英文）](/start/getting-started)
- [Gateway 配置](/gateway/configuration)
- [模型提供商](/providers/models)
- [消息渠道](/channels)
- [安全配置](/gateway/security)
