# Autonomous Coding with CodeClaw

CodeClaw (OpenClaw) empowers you to run an autonomous coding agent directly on your machine. This agent can explore your codebase, read files, make edits, and execute commands to verify its work.

## Core Capabilities

The autonomous coding agent is equipped with a suite of tools designed to mimic a developer's workflow:

*   **Exploration**:
    *   `list_files`: Recursively lists files in your directory to understand the project structure. Supports ignore patterns (like `.gitignore`).
    *   `search`: Searches for code patterns across the codebase using regex, similar to `grep`.
*   **Inspection**:
    *   `read`: Reads the content of files. Smartly handles large files by reading in chunks if necessary.
*   **Modification**:
    *   `edit`: Performs targeted search-and-replace edits on files.
    *   `write`: Overwrites or creates new files.
*   **Execution**:
    *   `exec`: Runs shell commands (e.g., `npm test`, `git status`). Can run in the background for long-running processes.

## Use Cases & Workflows

### 1. Bug Fixing

The agent excels at diagnosing and fixing bugs when provided with a report or error log.

**Workflow:**
1.  **Explore**: The agent uses `list_files` to locate relevant directories and `search` to find the code responsible for the error (e.g., searching for a specific error message or function name).
2.  **Reproduce**: It uses `exec` to run a test case or script that reproduces the issue. If no test exists, it may create a reproduction script using `write`.
3.  **Analyze**: It reads the failing code using `read`.
4.  **Fix**: It applies a fix using `edit`.
5.  **Verify**: It re-runs the reproduction script or test suite via `exec` to ensure the bug is fixed and no regressions were introduced.

### 2. Feature Implementation

You can task the agent with implementing new features, from simple utility functions to complex logic.

**Workflow:**
1.  **Plan**: The agent explores the existing codebase to understand where the new feature fits.
2.  **Draft**: It creates new files (`write`) or modifies existing ones (`edit`) to scaffold the feature.
3.  **Refine**: It implements the logic.
4.  **Test**: It writes a new test case (`write`) to verify the feature.
5.  **Run**: It executes the test (`exec`) and iterates on the implementation until the test passes.

### 3. Refactoring

The agent can help clean up technical debt or modernize code.

**Workflow:**
1.  **Search**: It identifies usage patterns of deprecated functions or messy code using `search`.
2.  **Refactor**: It iteratively applies changes across multiple files using `edit`.
3.  **Verify**: It runs the project's test suite to guarantee safety.

## Getting Started

To start an autonomous session, use the OpenClaw CLI.

```bash
# Start an interactive agent session
openclaw agent --message "Fix the failing test in src/utils.test.ts"
```

### Configuration Tips

*   **Sandboxing**: By default, the agent runs commands on your host machine (Host Mode) for the main session. For untrusted tasks, you can configure sandboxing (Docker) in `openclaw.json`.
*   **Thinking Models**: For complex coding tasks, using a "thinking" model (like Claude 3.5 Sonnet or Opus) is highly recommended. You can enable thinking mode via the CLI:
    ```bash
    openclaw agent --message "..." --thinking high
    ```

## Safety

*   **Review**: You can see the agent's plan and tool executions in real-time.
*   **Git**: Always work in a git repository. The agent can make mistakes, and git allows you to easily revert changes.
*   **Permissions**: Be mindful of the tools enabled. The `exec` tool is powerful; ensure you trust the agent's instructions or run in a sandbox.
