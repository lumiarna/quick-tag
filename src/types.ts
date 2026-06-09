export interface QuickTagSettings {
  presetTags: string[];
  recentTags: string[];
  maxRecentTags: number;
  collapsedGroups: string[];
}

export interface TagTreeNode {
  name: string;
  fullPath: string;
  children: TagTreeNode[];
  isLeaf: boolean;
}
