---
created: 2026-03-11T14:37:00
updated: 2026-06-09T20:40:43
---

# Quick Tag

[中文说明](./README.zh-CN.md)

Quickly add or remove note tags in a sidebar panel for Obsidian.

## Features

- Sidebar panel with two columns:
- Left column: preset tags displayed as slash-path hierarchy (for example: `project/frontend/ui`)
- Right column: recent tags, newest first
- Click any tag chip to toggle that tag in the active note frontmatter (`tags`)
- Active frontmatter tags are highlighted in the panel
- Toolbar actions:
- `Clear current tags`: clear all frontmatter tags for the active note
- `Settings`: jump directly to the plugin settings page
- Recent tag behavior:
- New tags added in notes are automatically tracked from metadata updates
- Preset tags (and their parent paths) are excluded from recent tags
- Maximum recent tags is configurable from 5 to 50
- Responsive layout for narrow sidebars

## Requirements

- Obsidian `>= 1.4.0`

## Install (development)

1. Build the plugin:

```bash
npm install
npm run build
```

This project uses npm and locks dependency resolution with `package-lock.json`.

2. Copy these files to your vault plugin directory:

- `main.js`
- `manifest.json`
- `styles.css`

Example target path:

```text
<your-vault>/.obsidian/plugins/quick-tag/
```

3. In Obsidian, open Community plugins and enable `Quick Tag`.

## Usage

1. Open the tag panel:
- Run command `Show tag panel`, or
- Restart Obsidian after first install (the panel is auto-opened when layout is ready)
2. Configure preset tags:
- Settings -> Community plugins -> Quick Tag
- Enter one tag per line in `Tag list`
- Use `/` to define hierarchy
3. Toggle tags by clicking chips in either preset or recent columns.
4. Manage recent tags:
- Set `Maximum recent tags` between 5 and 50
- Use `Clear recent tags` in settings to reset the recent list

## Notes

- Tag toggling writes to frontmatter `tags` as an array.
- Highlight state is based on active note frontmatter tags.

## Development

```bash
npm run dev
npm run build
npm run lint
```

## License

MIT
