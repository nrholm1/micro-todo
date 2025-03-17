/*************************************************************
 * Global Variables
 *************************************************************/
let tasks = [];
let editingTaskId = null;  // which task (or subtask) is in edit mode
let activeIndex = 1;       // highlight starts at the first actual row now (since there's no form)
let showCompleted = true; // if false, hide completed top-level tasks

// keep a snapshot of tasks for undo
let lastTasksSnapshot = null;

/*************************************************************
 * Local Storage
 *************************************************************/
function loadTasks() {
  const storedTasks = localStorage.getItem('todos');
  tasks = storedTasks ? JSON.parse(storedTasks) : [];

  // ensure each task has a collapsed property
  function ensureCollapsedProp(taskArray) {
    taskArray.forEach(task => {
      if (typeof task.collapsed !== "boolean") {
        task.collapsed = false;
      }
      if (task.subtasks && task.subtasks.length > 0) {
        ensureCollapsedProp(task.subtasks);
      }
    });
  }
  ensureCollapsedProp(tasks);
}

function saveTasks() {
  localStorage.setItem('todos', JSON.stringify(tasks));
}

/*************************************************************
 * ID Generation Helpers
 *************************************************************/
function getNextMainId() {
  let max = 0;
  tasks.forEach(task => {
    const num = parseInt(task.id, 10);
    if (num > max) max = num;
  });
  return (max + 1).toString();
}

function generateSubtaskId(parentTask) {
  const count = parentTask.subtasks ? parentTask.subtasks.length : 0;
  return parentTask.id + "." + (count + 1);
}

/*************************************************************
 * Task / Subtask Utilities
 *************************************************************/
function findTaskById(id, tasksArray) {
  for (const task of tasksArray) {
    if (task.id === id) return task;
    if (task.subtasks && task.subtasks.length > 0) {
      const found = findTaskById(id, task.subtasks);
      if (found) return found;
    }
  }
  return null;
}

function deleteTaskById(id, tasksArray) {
  return tasksArray.filter(task => {
    if (task.id === id) {
      return false;
    }
    if (task.subtasks) {
      task.subtasks = deleteTaskById(id, task.subtasks);
    }
    return true;
  });
}

function toggleCompleteTask(id, tasksArray) {
  for (const task of tasksArray) {
    if (task.id === id) {
      task.completed = !task.completed;
    } else if (task.subtasks && task.subtasks.length > 0) {
      toggleCompleteTask(id, task.subtasks);
    }
  }
}

function getTaskLevel(id) {
  return (String(id).match(/\./g) || []).length;
}

function reassignIds(tasksArray, parentId) {
  tasksArray.forEach((task, index) => {
    let newId;
    if (!parentId) {
      newId = (index + 1).toString();
    } else {
      newId = parentId + '.' + (index + 1);
    }
    task.id = newId;
    if (task.subtasks && task.subtasks.length > 0) {
      reassignIds(task.subtasks, newId);
    }
  });
}

/*************************************************************
 * Color Scheme Helpers
 *************************************************************/
function getRowColor(id) {
    const level = getTaskLevel(id);
    const mainNum = parseInt(String(id).split('.')[0], 10);
  
    if (Number.isNaN(mainNum)) {
      return 'white';
    }
  
    // 1) Compute a base “random” hue from mainNum
    //    e.g., hue in [0..359]
    const hue = (mainNum * 137 + 13) % 360;
  
    // 2) For a pastel effect, pick a lightness and saturation around these ranges.
    //    You can tweak them as you like.
    //    Then we can adjust them slightly by level:
    //    - Decrease saturation as level goes up
    //    - Increase lightness as level goes up
    let saturation = 60 - (level * 10); // so level 0 => sat=60, level 1 => sat=50, etc.
    let lightness  = 85 + (level * 5);  // so level 0 => L=85, level 1 => L=90, etc.
  
    // Clamp them so they don’t go out of 0..100 range
    saturation = Math.max(0, Math.min(100, saturation));
    lightness  = Math.max(0, Math.min(100, lightness));
  
    // 3) Convert HSL to a CSS hex string
    return hslToHex(hue, saturation, lightness);
  }
  
  // Utility: Convert HSL (0..360, 0..100, 0..100) to Hex
  function hslToHex(h, s, l) {
    // Convert percentages to [0..1]
    s /= 100;
    l /= 100;
  
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
  
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
  
    // Add m, convert to [0..255], then to hex
    const R = Math.round((r + m) * 255);
    const G = Math.round((g + m) * 255);
    const B = Math.round((b + m) * 255);
  
    return '#' + toHex(R) + toHex(G) + toHex(B);
  }
  
  function toHex(val) {
    const hex = val.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }
  

/*************************************************************
 * Adding & Editing
 *************************************************************/
// Add a new top-level task in edit mode.
function addMainTask() {
  const newId = getNextMainId();
  const newTask = {
    id: newId,
    description: '',
    deadline: '',
    completed: false,
    collapsed: false,
    subtasks: []
  };
  tasks.push(newTask);

  // Immediately go into edit mode for the new task
  editingTaskId = newId;
  saveTasks();
  renderTasks();

  // Focus highlight on this new task
  const visible = getVisibleTasks();
  const newIndex = visible.findIndex(t => t.id === newId);
  if (newIndex >= 0) {
    activeIndex = newIndex + 1; // +1 because we use 1-based indexing for rows
    updateFocus();
  }
}

function getParentId(childId) {
    // Example: childId = "3.2.1" -> parentId = "3.2"
    const parts = childId.split('.');
    parts.pop(); // remove the last segment
    return parts.join('.');
}  

function addSubtask(parentId, description, deadline) {
  const parentTask = findTaskById(parentId, tasks);
  if (!parentTask) return null;
  if (getTaskLevel(parentTask.id) >= 2) {
    alert('Maximum subtask nesting reached.');
    return null;
  }
  const newSubId = generateSubtaskId(parentTask);
  const newSubtask = {
    id: newSubId,
    description,
    deadline: deadline ? new Date(deadline).toISOString() : '',
    completed: false,
    collapsed: false,
    subtasks: []
  };
  parentTask.subtasks.push(newSubtask);
  editingTaskId = newSubId;
  saveTasks();
  renderTasks();
  return newSubId;
}

function editTask(id) {
  editingTaskId = id;
  renderTasks();
}

function saveTaskEdit(id) {
  const descInput = document.getElementById(`edit-desc-${id}`);
  const deadlineInput = document.getElementById(`edit-deadline-${id}`);
  const t = findTaskById(id, tasks);
  if (t && descInput) {
    t.description = descInput.value;
    t.deadline = deadlineInput.value ? new Date(deadlineInput.value).toISOString() : '';
  }
  editingTaskId = null;
  saveTasks();
  renderTasks();
  updateFocus();
}

function cancelEdit() {
  editingTaskId = null;
  renderTasks();
  updateFocus();
}

function deleteTask(id) {
  // store a snapshot of tasks before deleting
  lastTasksSnapshot = JSON.parse(JSON.stringify(tasks));

  tasks = deleteTaskById(id, tasks);
  saveTasks();
  renderTasks();
  updateFocus();
}

function undoDelete() {
  if (!lastTasksSnapshot) {
    console.log("No delete to undo.");
    return;
  }
  tasks = lastTasksSnapshot;
  lastTasksSnapshot = null;
  saveTasks();
  renderTasks();
  updateFocus();
}

function toggleComplete(id) {
  toggleCompleteTask(id, tasks);
  saveTasks();
  renderTasks();
  updateFocus();
}

function toggleCollapse(id) {
  const t = findTaskById(id, tasks);
  if (!t) return;
  t.collapsed = !t.collapsed;
  saveTasks();
  renderTasks();
  updateFocus();
}

/*************************************************************
 * Building a Flattened Visible Tasks List
 * Now also hides top-level tasks that are completed if showCompleted == false.
 *************************************************************/
function getVisibleTasks() {
  const visible = [];
  (function recurse(list, isTopLevel) {
    for (const task of list) {
      // if it's top-level and completed, skip it unless showCompleted is true
      if (isTopLevel && task.completed && !showCompleted) {
        continue;
      }
      visible.push(task);
      if (task.subtasks && task.subtasks.length > 0 && !task.collapsed) {
        recurse(task.subtasks, false);
      }
    }
  })(tasks, true);
  return visible;
}

/*************************************************************
 * Rendering backticked code cells.
 *************************************************************/
function parseInlineFormatting(text) {
    if (!text) return '';
  
    let parsed = text;
  
    // 1) Inline code: `some code`
    //    We do this first so anything in backticks won't be interpreted as link/bold/italics
    parsed = parsed.replace(/`([^`]+)`/g, (match, codeText) => {
      // Escape inside <code> to prevent broken HTML
      const escapedCode = codeText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<code>${escapedCode}</code>`;
    });
  
    // 2) Link: [link text](URL)
    //    Very naive: it won’t handle nested brackets or parentheses
    //    Group 1 = link text, Group 2 = URL
    parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      // Optionally escape quotes in the URL
      const safeUrl = url.replace(/"/g, "&quot;");
      // Escape the link text if you want to ensure no HTML injection
      const escapedLinkText = linkText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
  
      return `<a href="${safeUrl}" target="_blank">${escapedLinkText}</a>`;
    });
  
    // 3) Bold: **something**
    parsed = parsed.replace(/\*\*([^*]+)\*\*/g, (match, boldText) => {
      return `<strong>${boldText}</strong>`;
    });
  
    // 4) Italic: *something*
    parsed = parsed.replace(/\*([^*]+)\*/g, (match, italicText) => {
      return `<em>${italicText}</em>`;
    });
  
    // 5) Leave $...$ alone for MathJax
  
    return parsed;
  }
  


/*************************************************************
 * Rendering the Table
 *************************************************************/
function renderTaskRow(task, tbody, parentId = '') {
  const tr = document.createElement('tr');
  tr.draggable = true;
  tr.classList.add('draggable-row');
  tr.setAttribute('data-id', task.id);
  tr.setAttribute('data-level', getTaskLevel(task.id));
  tr.setAttribute('data-parent', parentId);

  tr.addEventListener('dragstart', handleDragStart);
  tr.addEventListener('dragover', handleDragOver);
  tr.addEventListener('drop', handleDrop);

  tr.style.backgroundColor = getRowColor(task.id);

  // leftmost cell: collapse/expand if subtasks exist
  const tdLeft = document.createElement('td');
  tdLeft.className = 'drag-handle';
  if (task.subtasks && task.subtasks.length > 0) {
    const collapseButton = document.createElement('button');
    collapseButton.className = 'collapse-button';
    collapseButton.textContent = task.collapsed ? '►' : '▼';
    collapseButton.onclick = function(e) {
      e.stopPropagation();
      toggleCollapse(task.id);
    };
    tdLeft.appendChild(collapseButton);
  }
  tr.appendChild(tdLeft);

  // ID column
  const tdId = document.createElement('td');
  tdId.textContent = task.id;
  tr.appendChild(tdId);

  // Editing?
  if (task.id === editingTaskId) {
    // Edit Mode
    const tdDesc = document.createElement('td');
    tdDesc.innerHTML = `<input type="text" id="edit-desc-${task.id}" class="edit-input" value="${task.description}">`;
    tr.appendChild(tdDesc);

    const tdDeadline = document.createElement('td');
    tdDeadline.innerHTML = `<input type="date" id="edit-deadline-${task.id}" class="edit-input" value="${task.deadline ? formatDateForInput(task.deadline) : ''}">`;
    tr.appendChild(tdDeadline);

    const tdActions = document.createElement('td');
    tdActions.className = 'actions-cell';
    tdActions.innerHTML = `
      <button onclick="saveTaskEdit('${task.id}')">Save</button>
      <button onclick="cancelEdit()">Cancel</button>
    `;
    tr.appendChild(tdActions);

    // Auto-focus the description field
    setTimeout(() => {
      const descField = document.getElementById(`edit-desc-${task.id}`);
      if (descField) descField.focus();
    }, 0);
  } else {
    // Normal Mode
    const tdDesc = document.createElement('td');
    tdDesc.innerHTML = parseInlineFormatting(task.description);
    if (task.completed) {
      tdDesc.classList.add('completed');
    }
    tr.appendChild(tdDesc);

    const tdDeadline = document.createElement('td');
    tdDeadline.textContent = task.deadline ? formatDate(task.deadline) : '';
    tr.appendChild(tdDeadline);

    // Actions cell
    const tdActions = document.createElement('td');
    tdActions.className = 'actions-cell';
    tdActions.style.position = 'relative';

    // Toggle complete
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'action-button';
    toggleBtn.title = 'Toggle Complete';
    toggleBtn.textContent = task.completed ? '✓' : '☐';
    toggleBtn.onclick = function(e) {
      e.stopPropagation();
      toggleComplete(task.id);
    };
    tdActions.appendChild(toggleBtn);

    // More actions dropdown
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'dropdown';

    const dropdownToggle = document.createElement('button');
    dropdownToggle.className = 'action-button dropdown-toggle';
    dropdownToggle.title = 'More Actions';
    dropdownToggle.textContent = '⋮';
    dropdownToggle.onclick = function(e) {
      e.stopPropagation();
      if (dropdownMenu.style.display === 'flex') {
        dropdownMenu.style.display = 'none';
      } else {
        dropdownMenu.style.display = 'flex';
      }
    };
    dropdownContainer.appendChild(dropdownToggle);

    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'dropdown-menu';
    let menuHTML = `
      <button class="dropdown-item" onclick="editTask('${task.id}')">Edit</button>
      <button class="dropdown-item" onclick="deleteTask('${task.id}')">Delete</button>
    `;
    if (getTaskLevel(task.id) < 2) {
      menuHTML += `<button class="dropdown-item" onclick="addSubtask('${task.id}', '', '')">Add Subtask</button>`;
    }
    dropdownMenu.innerHTML = menuHTML;
    dropdownMenu.style.display = 'none';
    dropdownMenu.style.position = 'absolute';
    dropdownMenu.style.top = '100%';
    dropdownMenu.style.right = '0';
    dropdownMenu.style.zIndex = '9999';

    dropdownContainer.appendChild(dropdownMenu);
    tdActions.appendChild(dropdownContainer);
    tr.appendChild(tdActions);

    document.addEventListener('click', function() {
      dropdownMenu.style.display = 'none';
    });
  }

  tbody.appendChild(tr);

  // Render subtasks if not collapsed
  if (task.subtasks && task.subtasks.length > 0 && !task.collapsed) {
    task.subtasks.forEach(subtask => {
      renderTaskRow(subtask, tbody, task.id);
    });
  }
}

function renderTasks() {
  const tbody = document.querySelector('#todo-table tbody');
  if (!tbody) return; 
  tbody.innerHTML = '';
  
  // Flattened visible tasks
  const visibleTop = getVisibleTasks();
  // top-level rows appear in visibleTop, but their recursion will
  // handle child rows
  visibleTop.forEach(t => {
    // Only directly render top-level tasks; children get rendered
    // in their parent's recursion
    if (getTaskLevel(t.id) === 0) {
      renderTaskRow(t, tbody, '');
    }
  });
  updateFocus();

  // re-render mathjax
  if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
    MathJax.typesetPromise()
      .then(() => {
        console.log('MathJax re-typeset done.');
      })
      .catch(err => console.error('MathJax error:', err));
    }
}

/*************************************************************
 * Date Formatting
 *************************************************************/
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

function formatDateForInput(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

/*************************************************************
 * Drag & Drop
 *************************************************************/
function handleDragStart(event) {
  const draggedId = event.currentTarget.getAttribute('data-id');
  const draggedLevel = event.currentTarget.getAttribute('data-level');
  const draggedParent = event.currentTarget.getAttribute('data-parent');
  const data = { draggedId, draggedLevel, draggedParent };
  event.dataTransfer.setData('text/plain', JSON.stringify(data));
}

function handleDragOver(event) {
  event.preventDefault();
}

function handleDrop(event) {
  event.preventDefault();
  const dragData = JSON.parse(event.dataTransfer.getData('text/plain'));
  const targetId = event.currentTarget.getAttribute('data-id');
  const targetLevel = event.currentTarget.getAttribute('data-level');
  const targetParent = event.currentTarget.getAttribute('data-parent');
  
  // Only reorder if they have the same parent & same level
  if (dragData.draggedLevel !== targetLevel || dragData.draggedParent !== targetParent) {
    return;
  }

  reorderTasks(dragData.draggedId, targetId, dragData.draggedParent);
  saveTasks();
  renderTasks();
}

function reorderTasks(draggedId, targetId, parentId) {
  let parentArray;
  if (!parentId) {
    parentArray = tasks;
  } else {
    const parentTask = findTaskById(parentId, tasks);
    if (!parentTask || !parentTask.subtasks) return;
    parentArray = parentTask.subtasks;
  }
  const draggedIndex = parentArray.findIndex(t => t.id === draggedId);
  const targetIndex = parentArray.findIndex(t => t.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) return;

  const [draggedTask] = parentArray.splice(draggedIndex, 1);
  parentArray.splice(targetIndex, 0, draggedTask);

  reassignIds(parentArray, parentId);
}

/*************************************************************
 * Keyboard Navigation
 *************************************************************/
document.addEventListener('keydown', handleKeydown);

function handleKeydown(e) {
  // If in edit mode, only handle Enter or Escape.
  if (editingTaskId !== null) {
    if (e.key === 'Enter') {
      saveTaskEdit(editingTaskId);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      cancelEdit();
      e.preventDefault();
    }
    return;
  }

  // handle cmd+z for undo
  if (e.metaKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undoDelete();
    return;
  }

  switch (e.key) {
    case 'ArrowUp':
      moveActiveUp();
      e.preventDefault();
      break;
    case 'ArrowDown':
      moveActiveDown();
      e.preventDefault();
      break;
    case 'ArrowLeft':
      collapseCurrent();
      e.preventDefault();
      break;
    case 'ArrowRight':
      expandCurrent();
      e.preventDefault();
      break;
    case 'Enter':
      // Pressing Enter when not editing: go to edit mode
      enterCurrentRow();
      e.preventDefault();
      break;
    case '+':
      // plus => add subtask (if on a row), or do nothing if no row
      plusCurrentRow();
      e.preventDefault();
      break;
    case 'c': // complete the highlighted task
      completeCurrentRow();
      e.preventDefault();
      break;
    case 'd': // delete the highlighted task
      deleteCurrentRow();
      e.preventDefault();
      break;
    case 'n':
      // Press 'n' to add a new top-level task in edit mode
      addMainTask();
      e.preventDefault();
      break;
    default:
      break;
  }
}

function moveActiveUp() {
  const visibleCount = getVisibleTasks().length;
  activeIndex--;
  if (activeIndex < 1) {
    activeIndex = visibleCount; // wrap to last row
  }
  updateFocus();
}

function moveActiveDown() {
  const visibleCount = getVisibleTasks().length;
  activeIndex++;
  if (activeIndex > visibleCount) {
    activeIndex = 1; // wrap back to first row
  }
  updateFocus();
}

function collapseCurrent() {
  const visible = getVisibleTasks();
  const idx = activeIndex - 1;
  if (idx >= 0 && idx < visible.length) {
    const task = visible[idx];
    if (task.subtasks && task.subtasks.length > 0 && !task.collapsed) {
      toggleCollapse(task.id);
    }
  }
}

function expandCurrent() {
  const visible = getVisibleTasks();
  const idx = activeIndex - 1;
  if (idx >= 0 && idx < visible.length) {
    const task = visible[idx];
    if (task.subtasks && task.subtasks.length > 0 && task.collapsed) {
      toggleCollapse(task.id);
    }
  }
}

function enterCurrentRow() {
  const visible = getVisibleTasks();
  const idx = activeIndex - 1;
  if (idx >= 0 && idx < visible.length) {
    editTask(visible[idx].id);
  }
}

function plusCurrentRow() {
    // If we used to have a special "add new main task form" at activeIndex=0, skip that if needed:
    // if (activeIndex === 0) return; 
    // (depends on your current logic; if you no longer have a form at index=0, you can remove this)
  
    const visible = getVisibleTasks();
    const idx = activeIndex - 1;
    if (idx < 0 || idx >= visible.length) {
      return;
    }
  
    const task = visible[idx];
  
    // If the current task is collapsed, expand it first:
    if (task.subtasks && task.subtasks.length > 0 && task.collapsed) {
      toggleCollapse(task.id);
    }
  
    // Check the nesting level
    const level = getTaskLevel(task.id);
  
    if (level < 2) {
      // Level 0 (main task) or level 1 (subtask): add a subtask under the current task
      const newId = addSubtask(task.id, '', '');
      if (newId) {
        focusOnNewSubtask(newId);
      }
    } else {
      // level == 2 => sub-subtask. 
      // Instead of doing nothing, add a new sub-subtask with the *same parent* as the current row.
      const parentId = getParentId(task.id); // e.g., "3.2.1" -> parent "3.2"
      if (parentId) {
        const newId = addSubtask(parentId, '', '');
        if (newId) {
          focusOnNewSubtask(newId);
        }
      }
    }
  }

function focusOnNewSubtask(newId) {
    const allVisible = getVisibleTasks();
    const subIndex = allVisible.findIndex(t => t.id === newId);
    if (subIndex !== -1) {
      activeIndex = subIndex + 1; // highlight the newly added subtask
      updateFocus();
    }
  }

function completeCurrentRow() {
  const visible = getVisibleTasks();
  const idx = activeIndex - 1;
  if (idx >= 0 && idx < visible.length) {
    const task = visible[idx];
    toggleComplete(task.id);
  }
}

function deleteCurrentRow() {
  const visible = getVisibleTasks();
  const idx = activeIndex - 1;
  if (idx >= 0 && idx < visible.length) {
    const task = visible[idx];
    if (confirm(`Are you sure you want to delete task "${task.description}"?`)) {
      deleteTask(task.id);
    }
  }
}

function updateFocus() {
  // remove highlight from all rows
  document.querySelectorAll('tr.highlight').forEach(tr => {
    tr.classList.remove('highlight');
  });

  const visible = getVisibleTasks();
  const idx = activeIndex - 1;
  if (idx >= 0 && idx < visible.length) {
    const task = visible[idx];
    const row = document.querySelector(`tr[data-id="${task.id}"]`);
    if (row) {
      row.classList.add('highlight');
    }
  }
}

/*************************************************************
 * Toggle Show Completed
 *************************************************************/
function toggleShowCompleted() {
  showCompleted = !showCompleted;
  const btn = document.getElementById('toggle-completed-btn');
  if (btn) {
    btn.textContent = showCompleted ? 'Hide Completed' : 'View Completed';
  }
  renderTasks();
}

/*************************************************************
 * Initialize
 *************************************************************/
loadTasks();
renderTasks();
