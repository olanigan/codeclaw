import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  type AnyAgentTool,
  ToolInputError,
  readStringArrayParam,
  readStringParam,
} from "./common.js";

const execFileAsync = promisify(execFile);

function matchesPattern(filePath: string, basename: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }
  // Normalize path separators to forward slashes for matching
  const normalizedPath = filePath.split(path.sep).join("/");

  return patterns.some((pattern) => {
    // If pattern has a slash (and it's not just at the end), match against full relative path.
    // Otherwise, match against the basename.
    // E.g. "node_modules" matches "src/node_modules" (basename check).
    // "src/test" matches "src/test" (path check).
    const hasSlash = pattern.includes("/") && !pattern.endsWith("/");
    const matchTarget = hasSlash ? normalizedPath : basename;

    // Basic glob-to-regex conversion
    let regexString = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape regex chars
      .replace(/\*\*/g, ".*") // ** -> .*
      .replace(/\*/g, "[^/]*") // * -> [^/]*
      .replace(/\?/g, "."); // ? -> .

    // Handle directory matching (e.g. "node_modules/")
    if (pattern.endsWith("/")) {
      regexString = `^${regexString}.*`;
    } else {
      regexString = `^${regexString}$`;
    }

    return new RegExp(regexString).test(matchTarget);
  });
}

export function createListFilesTool(options?: {
  cwd?: string;
}): AnyAgentTool {
  const root = options?.cwd ?? process.cwd();

  return {
    name: "list_files",
    description: "Recursively list files in a directory.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory to list (relative to workspace root). Defaults to root.",
        },
        recursive: {
          type: "boolean",
          description: "Whether to list recursively. Defaults to true.",
        },
        ignore: {
          type: "array",
          items: { type: "string" },
          description: "Patterns to ignore (e.g. node_modules, .git).",
        },
      },
    },
    execute: async (_id, args) => {
      const params = args as Record<string, unknown>;
      const relativePath = readStringParam(params, "path", { required: false }) ?? ".";
      const recursive = (params.recursive as boolean) !== false; // Default true
      const ignore = readStringArrayParam(params, "ignore", { required: false }) ?? [
        ".git",
        "node_modules",
        "dist",
        "coverage",
      ];

      const targetDir = path.resolve(root, relativePath);

      // Ensure targetDir is within root
      if (!targetDir.startsWith(root)) {
        throw new ToolInputError(`Access denied: ${relativePath} is outside workspace root.`);
      }

      try {
        const stats = await fs.stat(targetDir);
        if (!stats.isDirectory()) {
          throw new ToolInputError(`${relativePath} is not a directory.`);
        }

        const files: string[] = [];

        async function walk(currentDir: string, currentRelative: string) {
          const entries = await fs.readdir(currentDir, { withFileTypes: true });

          for (const entry of entries) {
            const entryRelative = path.join(currentRelative, entry.name);

            // Check ignore patterns
            if (matchesPattern(entryRelative, entry.name, ignore)) {
              continue;
            }

            if (entry.isDirectory()) {
              if (recursive) {
                await walk(path.join(currentDir, entry.name), entryRelative);
              } else {
                files.push(`${entryRelative}/`);
              }
            } else {
              files.push(entryRelative);
            }
          }
        }

        await walk(targetDir, relativePath === "." ? "" : relativePath);

        // Sort for consistent output
        files.sort();

        // Limit output size to prevent context overflow
        const MAX_FILES = 1000;
        let output = files.join("\n");
        let truncated = false;

        if (files.length > MAX_FILES) {
          output = files.slice(0, MAX_FILES).join("\n");
          truncated = true;
        }

        return {
          content: [
            {
              type: "text",
              text: truncated
                ? `${output}\n\n... and ${files.length - MAX_FILES} more files.`
                : output || "(empty directory)",
            },
          ],
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          throw new ToolInputError(`Directory not found: ${relativePath}`);
        }
        throw error;
      }
    },
  };
}

export function createSearchTool(options?: {
  cwd?: string;
}): AnyAgentTool {
  const root = options?.cwd ?? process.cwd();

  return {
    name: "search",
    description:
      "Search for a text pattern in files using grep. Returns matching lines with line numbers.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "The regex pattern to search for.",
        },
        path: {
          type: "string",
          description: "Directory to search in (relative to workspace root). Defaults to root.",
        },
        include: {
          type: "array",
          items: { type: "string" },
          description: "File patterns to include (e.g. *.ts).",
        },
        exclude: {
          type: "array",
          items: { type: "string" },
          description: "File patterns to exclude (e.g. *.test.ts).",
        },
        caseSensitive: {
          type: "boolean",
          description: "Whether search is case sensitive. Defaults to true.",
        },
      },
      required: ["pattern"],
    },
    execute: async (_id, args) => {
      const params = args as Record<string, unknown>;
      const pattern = readStringParam(params, "pattern", { required: true });
      const relativePath = readStringParam(params, "path", { required: false }) ?? ".";
      const include = readStringArrayParam(params, "include", { required: false });
      const exclude = readStringArrayParam(params, "exclude", { required: false }) ?? [
        ".git",
        "node_modules",
        "dist",
        "coverage",
      ];
      const caseSensitive = (params.caseSensitive as boolean) === true;

      const targetDir = path.resolve(root, relativePath);

      // Ensure targetDir is within root
      if (!targetDir.startsWith(root)) {
        throw new ToolInputError(`Access denied: ${relativePath} is outside workspace root.`);
      }

      // Build grep command
      // We use `grep -rIn` (recursive, ignore binary, line number)

      const grepArgs = ["-rIn"];

      if (!caseSensitive) {
        grepArgs.push("-i");
      }

      // Extended regex
      grepArgs.push("-E");

      if (include && include.length > 0) {
        for (const inc of include) {
          grepArgs.push("--include", inc);
        }
      }

      if (exclude && exclude.length > 0) {
        for (const exc of exclude) {
          grepArgs.push("--exclude", exc);
          grepArgs.push("--exclude-dir", exc);
        }
      }

      // Pattern (prevent injection)
      grepArgs.push("-e", pattern);

      // Path (pass relative path to grep to get relative output)
      // relativePath is validated to be safe by targetDir check,
      // but we need to pass what grep expects relative to CWD (root).
      grepArgs.push(relativePath);

      try {
        const { stdout } = await execFileAsync("grep", grepArgs, {
          maxBuffer: 1024 * 1024, // 1MB limit
          cwd: root,
        });

        // Limit output
        const MAX_LINES = 500;
        const lines = stdout.split("\n").filter(Boolean);

        let output = lines.join("\n");
        let truncated = false;

        if (lines.length > MAX_LINES) {
          output = lines.slice(0, MAX_LINES).join("\n");
          truncated = true;
        }

        return {
          content: [
            {
              type: "text",
              text: truncated
                ? `${output}\n\n... and ${lines.length - MAX_LINES} more matches.`
                : output || "No matches found.",
            },
          ],
        };
      } catch (error) {
        // grep returns exit code 1 if no matches found
        if ((error as any).code === 1) {
          return {
            content: [{ type: "text", text: "No matches found." }],
          };
        }

        // Exit code 2 usually means error
        if ((error as any).code === 2) {
             throw new ToolInputError(`Grep error: ${(error as any).stderr || (error as any).message}`);
        }

        throw error;
      }
    },
  };
}
