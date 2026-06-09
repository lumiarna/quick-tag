import {
  Plugin,
  type CachedMetadata,
  type TFile,
  type WorkspaceLeaf
} from "obsidian";
import { TagPanelView, VIEW_TYPE } from "./TagPanelView";
import { QuickTagSettingTab } from "./settings";
import type { QuickTagSettings } from "./types";

const DEFAULT_SETTINGS: QuickTagSettings = {
  presetTags: [],
  recentTags: [],
  maxRecentTags: 20,
  collapsedGroups: []
};

interface PersistedQuickTagSettings {
  presetTags: string[];
  maxRecentTags: number;
  collapsedGroups: string[];
}

export default class QuickTagPlugin extends Plugin {
  settings: QuickTagSettings = Object.assign({}, DEFAULT_SETTINGS);
  private readonly lastKnownFileTags = new Map<string, string[]>();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => {
      return new TagPanelView(leaf, this);
    });

    this.addCommand({
      id: "show-tag-panel",
      name: "Show tag panel",
      callback: () => {
        void this.activateView();
      }
    });

    this.addSettingTab(new QuickTagSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.snapshotActiveFileTags();
        this.refreshViews(false);
      })
    );

    this.registerEvent(
      this.app.metadataCache.on("changed", (file, _data, cache) => {
        const latestCache = cache ?? this.app.metadataCache.getFileCache(file);
        void this.handleMetadataChanged(file, latestCache);
      })
    );

    this.app.workspace.onLayoutReady(() => {
      this.snapshotAllFileTags();
      this.snapshotActiveFileTags();
      void this.activateView();
    });
  }

  onunload(): void {}

  async activateView(): Promise<void> {
    let leaf: WorkspaceLeaf | null = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0] ?? null;

    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      if (!leaf) {
        return;
      }

      await leaf.setViewState({
        type: VIEW_TYPE,
        active: true
      });
    }

    void this.app.workspace.revealLeaf(leaf);
  }

  async updatePresetTags(tags: string[]): Promise<void> {
    this.settings.presetTags = this.normalizeTags(tags);
    this.settings.recentTags = this.settings.recentTags.filter(
      (tag) => !this.shouldExcludeFromRecent(tag)
    );
    this.saveRecentTags();
    await this.saveSettings();
    this.refreshViews(true);
  }

  async updateMaxRecentTags(maxRecentTags: number): Promise<void> {
    const boundedValue = Math.max(5, Math.min(50, maxRecentTags));
    this.settings.maxRecentTags = boundedValue;
    this.settings.recentTags = this.settings.recentTags.slice(0, boundedValue);
    this.saveRecentTags();
    await this.saveSettings();
    this.refreshViews(true);
  }

  async clearRecentTags(): Promise<void> {
    this.settings.recentTags = [];
    this.saveRecentTags();
    this.refreshViews(true);
  }

  async touchRecentTag(tag: string): Promise<void> {
    const normalizedTag = this.normalizeTag(tag);
    if (normalizedTag.length === 0) {
      return;
    }

    if (this.shouldExcludeFromRecent(normalizedTag)) {
      return;
    }

    const next = this.settings.recentTags.filter((item) => item !== normalizedTag);
    next.unshift(normalizedTag);

    this.settings.recentTags = next.slice(0, this.settings.maxRecentTags);
    this.saveRecentTags();
  }

  isGroupCollapsed(groupPath: string): boolean {
    return this.settings.collapsedGroups.includes(groupPath);
  }

  async setGroupCollapsed(groupPath: string, collapsed: boolean): Promise<void> {
    const next = this.settings.collapsedGroups.filter((path) => path !== groupPath);
    if (collapsed) {
      next.push(groupPath);
    }

    this.settings.collapsedGroups = next;
    await this.saveSettings();
  }

  private refreshViews(fullRender: boolean): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof TagPanelView) {
        leaf.view.refresh(fullRender);
      }
    }
  }

  private async loadSettings(): Promise<void> {
    const loadedData: unknown = await this.loadData();
    const loaded = this.parseLoadedSettings(loadedData);
    const localRecentTags = this.loadRecentTags();

    this.settings = {
      presetTags: this.normalizeTags(loaded.presetTags),
      recentTags: this.normalizeTags(localRecentTags ?? loaded.recentTags),
      maxRecentTags: Math.max(5, Math.min(50, loaded.maxRecentTags)),
      collapsedGroups: this.normalizeTags(loaded.collapsedGroups)
    };

    this.settings.recentTags = this.settings.recentTags.filter(
      (tag) => !this.shouldExcludeFromRecent(tag)
    );

    this.settings.recentTags = this.settings.recentTags.slice(
      0,
      this.settings.maxRecentTags
    );

    if (localRecentTags === null && loaded.recentTags.length > 0) {
      this.saveRecentTags();
      await this.saveSettings();
    }
  }

  private async saveSettings(): Promise<void> {
    const persistedSettings: PersistedQuickTagSettings = {
      presetTags: this.settings.presetTags,
      maxRecentTags: this.settings.maxRecentTags,
      collapsedGroups: this.settings.collapsedGroups
    };

    await this.saveData(persistedSettings);
  }

  private snapshotActiveFileTags(): void {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      return;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    this.lastKnownFileTags.set(file.path, this.getTagsFromCache(cache));
  }

  private async handleMetadataChanged(
    file: TFile,
    cache: CachedMetadata | null
  ): Promise<void> {
    const currentTags = this.getTagsFromCache(cache);
    const previousTags = this.lastKnownFileTags.get(file.path);

    this.lastKnownFileTags.set(file.path, currentTags);

    if (!previousTags) {
      return;
    }

    const previousTagSet = new Set(previousTags);
    const addedTags = currentTags.filter((tag) => !previousTagSet.has(tag));
    if (addedTags.length === 0) {
      return;
    }

    for (const tag of addedTags) {
      await this.touchRecentTag(tag);
    }

    this.refreshViews(true);
  }

  private getTagsFromCache(cache: CachedMetadata | null): string[] {
    if (!cache) {
      return [];
    }

    const frontmatterRaw: unknown = cache.frontmatter?.tags;
    const frontmatterTags = this.pickTags(frontmatterRaw);
    const inlineTags = Array.isArray(cache.tags)
      ? cache.tags.map((item) => item.tag)
      : [];

    return this.normalizeTags([...frontmatterTags, ...inlineTags]);
  }

  private pickTags(rawTags: unknown): string[] {
    if (Array.isArray(rawTags)) {
      return rawTags.filter((tag): tag is string => typeof tag === "string");
    }

    if (typeof rawTags === "string") {
      return rawTags
        .split(/[\n,]/u)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }

    return [];
  }

  private snapshotAllFileTags(): void {
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      this.lastKnownFileTags.set(file.path, this.getTagsFromCache(cache));
    }
  }

  private shouldExcludeFromRecent(tag: string): boolean {
    return this.settings.presetTags.some(
      (presetTag) => presetTag === tag || presetTag.startsWith(`${tag}/`)
    );
  }

  private normalizeTags(tags: string[]): string[] {
    const unique = new Set<string>();
    for (const tag of tags) {
      const normalized = this.normalizeTag(tag);
      if (normalized.length > 0) {
        unique.add(normalized);
      }
    }

    return [...unique];
  }

  private normalizeTag(tag: string): string {
    return tag
      .replace(/^#+/u, "")
      .split("/")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .join("/");
  }

  private parseLoadedSettings(loadedData: unknown): QuickTagSettings {
    if (!loadedData || typeof loadedData !== "object") {
      return Object.assign({}, DEFAULT_SETTINGS);
    }

    const raw = loadedData as Record<string, unknown>;
    return {
      presetTags: this.pickStringArray(raw.presetTags),
      recentTags: this.pickStringArray(raw.recentTags),
      maxRecentTags: this.pickNumber(raw.maxRecentTags, DEFAULT_SETTINGS.maxRecentTags),
      collapsedGroups: this.pickStringArray(raw.collapsedGroups)
    };
  }

  private loadRecentTags(): string[] | null {
    const storedValue = globalThis.localStorage.getItem(this.getRecentTagsStorageKey());
    if (storedValue === null) {
      return null;
    }

    try {
      const parsedValue: unknown = JSON.parse(storedValue);
      return this.pickStringArray(parsedValue);
    } catch {
      return [];
    }
  }

  private saveRecentTags(): void {
    globalThis.localStorage.setItem(
      this.getRecentTagsStorageKey(),
      JSON.stringify(this.settings.recentTags)
    );
  }

  private getRecentTagsStorageKey(): string {
    return `${this.manifest.id}:${this.app.vault.getName()}:recentTags`;
  }

  private pickStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === "string");
  }

  private pickNumber(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }
}
