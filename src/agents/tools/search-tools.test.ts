import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeTempWorkspace } from "../../test-helpers/workspace.js";
import { createListFilesTool, createSearchTool } from "./search-tools.js";

describe("search-tools", () => {
  let workspaceDir: string;

  beforeEach(async () => {
    workspaceDir = await makeTempWorkspace();
    // Create some test files
    await fs.mkdir(path.join(workspaceDir, "src"), { recursive: true });
    await fs.mkdir(path.join(workspaceDir, "test"), { recursive: true });
    await fs.mkdir(path.join(workspaceDir, "node_modules"), { recursive: true });
    await fs.mkdir(path.join(workspaceDir, "src/nested_modules"), { recursive: true });

    await fs.writeFile(path.join(workspaceDir, "src/index.ts"), "console.log('hello world');");
    await fs.writeFile(path.join(workspaceDir, "src/utils.ts"), "export const add = (a, b) => a + b;");
    await fs.writeFile(path.join(workspaceDir, "test/index.test.ts"), "import { add } from '../src/utils';");
    await fs.writeFile(path.join(workspaceDir, "README.md"), "# Project\n\nHello world project.");
    await fs.writeFile(path.join(workspaceDir, "node_modules/foo.js"), "module.exports = {};");
    await fs.writeFile(path.join(workspaceDir, "src/nested_modules/nested.js"), "nested");
  });

  afterEach(async () => {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  describe("list_files", () => {
    it("lists files recursively by default", async () => {
      const tool = createListFilesTool({ cwd: workspaceDir });
      const result = await tool.execute("call-1", { path: "." });
      const content = result.content[0] as { text: string };

      expect(content.text).toContain("src/index.ts");
      expect(content.text).toContain("src/utils.ts");
      expect(content.text).toContain("test/index.test.ts");
      expect(content.text).toContain("README.md");
    });

    it("respects ignore patterns", async () => {
      const tool = createListFilesTool({ cwd: workspaceDir });
      const result = await tool.execute("call-1", {
        path: ".",
        ignore: ["node_modules", "test"]
      });
      const content = result.content[0] as { text: string };

      expect(content.text).toContain("src/index.ts");
      expect(content.text).toContain("README.md");
      expect(content.text).not.toContain("node_modules/foo.js");
      expect(content.text).not.toContain("test/index.test.ts");
    });

    it("respects nested ignore patterns", async () => {
      const tool = createListFilesTool({ cwd: workspaceDir });
      const result = await tool.execute("call-1", {
        path: ".",
        ignore: ["nested_modules"]
      });
      const content = result.content[0] as { text: string };

      expect(content.text).toContain("src/index.ts");
      expect(content.text).not.toContain("src/nested_modules/nested.js");
    });

    it("lists specific directory", async () => {
      const tool = createListFilesTool({ cwd: workspaceDir });
      const result = await tool.execute("call-1", { path: "src" });
      const content = result.content[0] as { text: string };

      expect(content.text).toContain("src/index.ts");
      expect(content.text).toContain("src/utils.ts");
      expect(content.text).not.toContain("README.md");
    });

    it("prevents listing outside root", async () => {
      const tool = createListFilesTool({ cwd: workspaceDir });
      await expect(tool.execute("call-1", { path: "../" })).rejects.toThrow("Access denied");
    });
  });

  describe("search", () => {
    it("searches for pattern", async () => {
      const tool = createSearchTool({ cwd: workspaceDir });
      const result = await tool.execute("call-1", { pattern: "hello" });
      const content = result.content[0] as { text: string };

      expect(content.text).toContain("src/index.ts");
      expect(content.text).toContain("hello world");
      expect(content.text).toContain("README.md");
    });

    it("searches with injection attempt (handled safely)", async () => {
        const tool = createSearchTool({ cwd: workspaceDir });
        const result = await tool.execute("call-1", { pattern: "-v" });
        // Should not crash, just search for "-v" literal (likely no matches)
        const content = result.content[0] as { text: string };
        expect(content.text).toBe("No matches found.");
    });

    it("respects include patterns", async () => {
      const tool = createSearchTool({ cwd: workspaceDir });
      const result = await tool.execute("call-1", {
        pattern: "hello",
        include: ["*.md"]
      });
      const content = result.content[0] as { text: string };

      expect(content.text).toContain("README.md");
      expect(content.text).not.toContain("src/index.ts");
    });

    it("respects exclude patterns", async () => {
      const tool = createSearchTool({ cwd: workspaceDir });
      const result = await tool.execute("call-1", {
        pattern: "hello",
        exclude: ["*.ts"]
      });
      const content = result.content[0] as { text: string };

      expect(content.text).toContain("README.md");
      expect(content.text).not.toContain("src/index.ts");
    });

    it("searches in specific path", async () => {
      const tool = createSearchTool({ cwd: workspaceDir });
      const result = await tool.execute("call-1", {
        pattern: "add",
        path: "src"
      });
      const content = result.content[0] as { text: string };

      expect(content.text).toContain("src/utils.ts");
      expect(content.text).not.toContain("test/index.test.ts");
    });
  });
});
