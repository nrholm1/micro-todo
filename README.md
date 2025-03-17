# micro-todo 🪼

### [Available here!](https://nrholm1.github.io/micro-todo/)

A minimal, keyboard-centric todo list manager with a small memory footprint. 

All tasks are stored locally (no server required), and it’s designed to be navigated and edited primarily via the keyboard.

## Basic Usage
- **Add a Main Task**: Press `n` (opens a blank task in Edit mode).
- **Navigate** tasks using the arrow keys.
- **Press Enter** on a highlighted task to edit its description/deadline.
- **Press +** to add a subtask (or a sibling sub-subtask if already at level 2).
- **Toggle Completion** with `c`.
- **Delete** with `d` (asks for confirmation).
- **Undo Last Delete** with `Cmd+Z` (macOS) or `Ctrl+Z` (Windows/Linux).
- **Exit Edit Mode** with the `Escape` key.

## Keyboard Shortcuts

| Shortcut        | Description                                                 |
|-----------------|-------------------------------------------------------------|
| **Arrow Up/Down** | Move the highlight up/down through visible tasks            |
| **Arrow Left**  | Collapse the highlighted task (if it has subtasks)          |
| **Arrow Right** | Expand the highlighted task (if it has subtasks)            |
| **Enter**       | Edit the currently highlighted task                          |
| **+**           | Add a new subtask or sub-subtask (depending on nesting)      |
| **c**           | Toggle completion of the highlighted task                   |
| **d**           | Delete the highlighted task (with confirmation)             |
| **n**           | Create a new top-level task in Edit mode                    |
| **Cmd+Z / Ctrl+Z** | Undo the most recent delete                                |
| **Escape**      | Cancel Edit mode                                            |
