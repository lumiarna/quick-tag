---
created: 2026-03-11T14:37:00
updated: 2026-06-09T20:40:43
---

# Quick Tag

[English README](./README.md)

用于在 Obsidian 侧边栏中快速添加或移除笔记标签。

## 功能

- 侧边栏面板分为两列：
- 左列：预设标签，按 `/` 路径层级展示（例如 `project/frontend/ui`）
- 右列：最近使用标签，按时间倒序
- 点击任意标签按钮，可切换当前笔记 frontmatter 中的 `tags`
- 当前笔记中已生效的 frontmatter 标签会高亮显示
- 工具栏操作：
- `Clear current tags`：清空当前笔记的全部 frontmatter 标签
- `Settings`：直接跳转到插件设置页
- 最近标签行为：
- 笔记标签更新后，会自动从元数据变化中记录新增标签
- 预设标签及其父级路径不会进入最近标签
- 最近标签数量可配置，范围 5 到 50
- 在窄侧边栏下会自动切换为单列布局

## 要求

- Obsidian `>= 1.4.0`

## 安装（开发环境）

1. 构建插件：

```bash
npm install
npm run build
```

本项目使用 npm，并通过 `package-lock.json` 锁定依赖解析。

2. 将以下文件复制到你的 vault 插件目录：

- `main.js`
- `manifest.json`
- `styles.css`

示例路径：

```text
<your-vault>/.obsidian/plugins/quick-tag/
```

3. 在 Obsidian 的 Community plugins 中启用 `Quick Tag`。

## 使用

1. 打开标签面板：
- 执行命令 `Show tag panel`，或
- 首次安装后重启 Obsidian（布局就绪时会自动打开面板）
2. 配置预设标签：
- Settings -> Community plugins -> Quick Tag
- 在 `Tag list` 中按行输入标签
- 使用 `/` 表示层级
3. 在预设标签或最近标签中点击按钮即可切换标签。
4. 管理最近标签：
- 在 `Maximum recent tags` 中设置数量（5 到 50）
- 在设置页中点击 `Clear recent tags` 清空最近列表

## 说明

- 标签切换会把 frontmatter `tags` 写为数组形式。
- 高亮状态基于当前笔记 frontmatter 的 `tags` 字段。

## 开发

```bash
npm run dev
npm run build
npm run lint
```

## 发布

1. 通过 npm 升级版本，这样 `package.json`、`manifest.json` 和 `versions.json` 会保持同步：

```bash
npm version 0.1.3
```

2. 推送 `npm version` 创建的提交和 tag：

```bash
git push --follow-tags
```

3. 随后 GitHub Actions 会自动：

- 校验 Git tag 与 `package.json`、`manifest.json` 以及 `versions.json` 中的版本记录一致
- 要求 Git tag 使用不带 `v` 前缀的纯语义化版本号
- 构建插件
- 创建 GitHub release，并上传 `main.js`、`manifest.json`、`styles.css`

仓库 `.npmrc` 设置了 `tag-version-prefix=`，因此 `npm version` 会创建 `0.1.3` 这种 tag，而不是 `v0.1.3`。

## 许可证

MIT
