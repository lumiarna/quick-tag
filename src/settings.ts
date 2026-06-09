import { type App, PluginSettingTab, Setting } from "obsidian";
import type QuickTagPlugin from "./main";

export class QuickTagSettingTab extends PluginSettingTab {
  private readonly plugin: QuickTagPlugin;

  constructor(app: App, plugin: QuickTagPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setHeading()
      .setName("Preset tags")
      .setDesc("One tag per line. Use / for hierarchy.");

    new Setting(containerEl)
      .setName("Tag list")
      .setDesc("Enter one tag per line.")
      .addTextArea((textarea) => {
        textarea.setValue(this.plugin.settings.presetTags.join("\n"));
        textarea.inputEl.rows = 10;
        textarea.onChange(async (value) => {
          const tags = value
            .split(/\r?\n/u)
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);

          await this.plugin.updatePresetTags(tags);
        });
      });

    new Setting(containerEl)
      .setName("Maximum recent tags")
      .setDesc("Choose a value between 5 and 50.")
      .addText((text) => {
        text.setPlaceholder("20");
        text.setValue(String(this.plugin.settings.maxRecentTags));
        text.onChange(async (value) => {
          const numericValue = Number.parseInt(value, 10);
          if (Number.isNaN(numericValue)) {
            return;
          }

          const bounded = Math.max(5, Math.min(50, numericValue));
          await this.plugin.updateMaxRecentTags(bounded);
        });
      });

    new Setting(containerEl)
      .setName("Clear recent tags")
      .setDesc("Remove all items from the recent tag list.")
      .addButton((button) => {
        button.setButtonText("Clear");
        button.onClick(async () => {
          await this.plugin.clearRecentTags();
        });
      });
  }
}
