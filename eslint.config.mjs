import tseslint from "typescript-eslint";
import obsidian from "eslint-plugin-obsidianmd";

export default tseslint.config(
  {
    ignores: ["build/**", "main.js", "node_modules/**"]
  },
  ...obsidian.configs.recommendedWithLocalesEn,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
);
