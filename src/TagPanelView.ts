import {
  Component,
  ItemView,
  Notice,
  type TFile,
  type WorkspaceLeaf
} from "obsidian";
import type QuickTagPlugin from "./main";
import type { TagTreeNode } from "./types";

export const VIEW_TYPE = "quick-tag-panel";

interface MutableTreeNode {
  name: string;
  fullPath: string;
  children: Map<string, MutableTreeNode>;
}

interface FrontmatterWithTags {
  tags?: unknown;
}

export class TagPanelView extends ItemView {
  private readonly plugin: QuickTagPlugin;
  private renderComponent: Component | null = null;
  private tagButtons = new Map<string, HTMLButtonElement[]>();

  constructor(leaf: WorkspaceLeaf, plugin: QuickTagPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Quick tag";
  }

  getIcon(): string {
    return "tag";
  }

  async onOpen(): Promise<void> {
    this.refresh(true);
  }

  async onClose(): Promise<void> {
    this.renderComponent?.unload();
    this.renderComponent = null;
    this.tagButtons.clear();
  }

  refresh(fullRender: boolean): void {
    if (fullRender) {
      this.render();
      return;
    }

    this.refreshActiveStates();
  }

  refreshActiveStates(): void {
    const activeTags = new Set(this.getActiveFileTags());
    for (const [tag, buttons] of this.tagButtons) {
      const isActive = activeTags.has(tag);
      for (const button of buttons) {
        button.toggleClass("is-active", isActive);
      }
    }
  }

  private render(): void {
    this.renderComponent?.unload();
    this.renderComponent = new Component();

    const { contentEl } = this;
    contentEl.empty();
    this.tagButtons = new Map<string, HTMLButtonElement[]>();

    const panel = contentEl.createDiv({ cls: "quick-tag-panel" });
    this.renderToolbar(panel, this.renderComponent);
    const columns = panel.createDiv({ cls: "quick-tag-columns" });

    this.renderPresetColumn(columns, this.renderComponent);
    this.renderRecentColumn(columns, this.renderComponent);
    this.refreshActiveStates();
  }

  private renderToolbar(panelEl: HTMLDivElement, component: Component): void {
    const toolbarEl = panelEl.createDiv({ cls: "quick-tag-toolbar" });

    const clearCurrentNoteTagsButton = toolbarEl.createEl("button", {
      cls: "quick-tag-toolbar-button",
      text: "Clear current tags",
      attr: {
        "aria-label": "Clear current note tags",
        "data-tooltip-position": "top"
      }
    });

    component.registerDomEvent(clearCurrentNoteTagsButton, "click", () => {
      void this.clearCurrentNoteTags();
    });
  }

  private renderPresetColumn(
    columnsEl: HTMLDivElement,
    component: Component
  ): void {
    const columnEl = columnsEl.createDiv({ cls: "quick-tag-column" });
    columnEl.createEl("h6", {
      cls: "quick-tag-column-header",
      text: "Preset tags"
    });

    const bodyEl = columnEl.createDiv({ cls: "quick-tag-column-body" });
    const tree = this.buildTagTree(this.plugin.settings.presetTags);

    for (const node of tree) {
      this.renderTreeNode(bodyEl, node, component);
    }
  }

  private renderRecentColumn(
    columnsEl: HTMLDivElement,
    component: Component
  ): void {
    const columnEl = columnsEl.createDiv({ cls: "quick-tag-column" });
    columnEl.createEl("h6", {
      cls: "quick-tag-column-header",
      text: "Recent tags"
    });

    const bodyEl = columnEl.createDiv({ cls: "quick-tag-column-body" });
    if (this.plugin.settings.recentTags.length === 0) {
      bodyEl.createDiv({
        cls: "quick-tag-empty",
        text: "No recent tags"
      });
      return;
    }

    const listEl = bodyEl.createDiv({ cls: "quick-tag-recent-list" });
    for (const tag of this.plugin.settings.recentTags) {
      this.createTagChip(listEl, tag, tag, component);
    }
  }

  private renderTreeNode(
    containerEl: HTMLDivElement,
    node: TagTreeNode,
    component: Component
  ): void {
    if (node.isLeaf) {
      this.createTagChip(containerEl, node.name, node.fullPath, component);
      return;
    }

    const hasSingleLeafChild =
      node.children.length === 1 && node.children[0]?.isLeaf;

    const groupEl = containerEl.createDiv({
      cls: hasSingleLeafChild
        ? "quick-tag-group quick-tag-group-single-leaf"
        : "quick-tag-group"
    });
    const headerEl = groupEl.createDiv({ cls: "quick-tag-group-header" });

    this.createTagChip(
      headerEl,
      node.name,
      node.fullPath,
      component,
      hasSingleLeafChild
        ? "quick-tag-chip-parent quick-tag-chip-parent-inline"
        : "quick-tag-chip-parent"
    );

    if (hasSingleLeafChild) {
      headerEl.createSpan({
        cls: "quick-tag-inline-separator",
        text: "→"
      });

      const child = node.children[0];
      this.createTagChip(headerEl, child.name, child.fullPath, component);
      return;
    }

    const childrenEl = groupEl.createDiv({ cls: "quick-tag-group-children" });
    for (const child of node.children) {
      this.renderTreeNode(childrenEl, child, component);
    }
  }

  private createTagChip(
    containerEl: HTMLElement,
    label: string,
    fullPath: string,
    component: Component,
    extraClass?: string
  ): void {
    const button = containerEl.createEl("button", {
      cls: extraClass ? `quick-tag-chip ${extraClass}` : "quick-tag-chip",
      text: label,
      attr: {
        "aria-label": fullPath,
        "data-tag": fullPath,
        "data-tooltip-position": "top"
      }
    });

    component.registerDomEvent(button, "click", () => {
      void this.toggleTag(fullPath);
    });

    const existing = this.tagButtons.get(fullPath) ?? [];
    existing.push(button);
    this.tagButtons.set(fullPath, existing);
  }

  private async toggleTag(tag: string): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Open a note to toggle tags.");
      return;
    }

    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      const frontmatterData = frontmatter as FrontmatterWithTags;
      const tags = this.parseTagValue(frontmatterData.tags);
      const nextTags = tags.includes(tag)
        ? tags.filter((item) => item !== tag)
        : [...tags, tag];

      frontmatterData.tags = nextTags;
    });
    this.refresh(true);
  }

  private async clearCurrentNoteTags(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("请先打开一个笔记。", 2500);
      return;
    }

    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      const frontmatterData = frontmatter as FrontmatterWithTags;
      frontmatterData.tags = [];
    });

    this.refresh(true);
    new Notice("已清空当前笔记标签。", 2000);
  }

  private getActiveFileTags(): string[] {
    const activeFile: TFile | null = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return [];
    }

    const frontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
    return this.parseTagValue(frontmatter?.tags);
  }

  private parseTagValue(rawTags: unknown): string[] {
    if (Array.isArray(rawTags)) {
      const stringTags = rawTags.filter(
        (tag): tag is string => typeof tag === "string"
      );
      return this.normalizeTags(stringTags);
    }

    if (typeof rawTags === "string") {
      const splitTags = rawTags
        .split(/[\n,]/u)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      return this.normalizeTags(splitTags);
    }

    return [];
  }

  private normalizeTags(input: string[]): string[] {
    const unique = new Set<string>();
    for (const value of input) {
      const normalized = value.replace(/^#+/u, "").trim();
      if (normalized.length > 0) {
        unique.add(normalized);
      }
    }

    return [...unique];
  }

  private buildTagTree(tags: string[]): TagTreeNode[] {
    const roots = new Map<string, MutableTreeNode>();

    for (const tag of tags) {
      const parts = tag.split("/").map((item) => item.trim()).filter(Boolean);
      if (parts.length === 0) {
        continue;
      }

      let currentMap = roots;
      let currentPath = "";

      for (const part of parts) {
        currentPath = currentPath.length > 0 ? `${currentPath}/${part}` : part;

        let node = currentMap.get(part);
        if (!node) {
          node = {
            name: part,
            fullPath: currentPath,
            children: new Map<string, MutableTreeNode>()
          };
          currentMap.set(part, node);
        }

        currentMap = node.children;
      }
    }

    return [...roots.values()].map((node) => this.finalizeTreeNode(node));
  }

  private finalizeTreeNode(node: MutableTreeNode): TagTreeNode {
    const children = [...node.children.values()].map((child) =>
      this.finalizeTreeNode(child)
    );

    return {
      name: node.name,
      fullPath: node.fullPath,
      children,
      isLeaf: children.length === 0
    };
  }
}
