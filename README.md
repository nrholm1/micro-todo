# 🪼 tiny-todo

### [Available here!](https://nrholm1.github.io/tiny-todo/)

tiny‑todo is a minimal, keyboard-driven todo list manager that runs entirely in your browser. All data is stored locally.

## Features

- **Local & Multi-Page Storage:**  
  Create, rename, delete, and switch between separate pages of todos. Each page is stored in localStorage, and the current page appears in the URL hash.

- **Keyboard-Centric:**  
  Navigate, add, edit, and delete tasks using the keyboard. Click rows to focus them.

- **Import/Export:**  
  Export or import the current page’s data as a JSON file.  
  Advanced: Import/Export your entire page collection (overwrites current data after confirmation).

- **URL Sharing:**  
  The current page’s hash encodes its name for sharing. Shared URLs load that page.

## Basic Usage

- **Add Task:** Press `n` to create a new top-level task.
- **Edit Task:** Press `Enter` on a highlighted task.
- **Add Subtask:** Press `+` for a subtask (or a sibling sub‑subtask at level 2).
- **Toggle Completion:** Press `c`.
- **Delete Task:** Press `d` (confirmation required).
- **Undo Delete:** Press `Cmd+Z` (macOS) or `Ctrl+Z` (Windows/Linux).
- **Cancel Edit:** Press `Escape`.

## Page Management

- **Switch Pages:** Use the sidebar or press `Cmd+ArrowUp` / `Cmd+ArrowDown`.
- **Create/Rename/Delete Pages:**  
  - **Create:** Triggered via a keyboard shortcut (e.g. `Cmd+P`) or a button.  
  - **Rename:** Double-click a sidebar page (except "default").  
  - **Delete:** Click the delete icon (✖︎) on non-default pages.

## Import/Export

- **Current Page:**  
  - **Export (Cmd+O):** Downloads the current page’s JSON.
  - **Import (Cmd+I):** Loads JSON into a selected page (new or existing).
- **Entire Collection:**  
  Separate functions lets you export all pages as a JSON backup and import them (with a warning that this overwrites current data).

## Shortcuts

| Shortcut               | Action                                         |
|------------------------|------------------------------------------------|
| Arrow Up/Down          | Move highlight up/down                         |
| Arrow Left/Right       | Collapse/expand task (if applicable)           |
| Enter                  | Edit highlighted task                          |
| +                      | Add subtask/sub‑subtask                         |
| c                      | Toggle task completion                         |
| d                      | Delete highlighted task (with confirmation)    |
| n                      | Add new top-level task in edit mode            |
| Cmd+Z / Ctrl+Z         | Undo last delete                               |
| Escape                 | Cancel edit                                    |
| Cmd+ArrowUp/ArrowDown  | Switch to previous/next page                   |
| Cmd+I                  | Import current page data                       |
| Cmd+O                  | Export current page data                       |
| Cmd+P                  | Create a new page                              |

## Setup

Place the files on any static server. For local testing, use a simple web server to avoid file:// issues.
