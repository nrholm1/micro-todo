// app.js

/*************************************************************
 * Global Variables
 *************************************************************/
let tasks = [];
let editingTaskId = null;
let activeIndex = 1;
let showCompleted = true;
let lastTasksSnapshot = null;

/*************************************************************
 * Local Storage Functions
 *************************************************************/
function loadTasks() {
  const storedTasks = localStorage.getItem('todos');
  tasks = storedTasks ? JSON.parse(storedTasks) : [];
  // Ensure each task has a collapsed property.
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
 * Export / Import Todos (Cmd+S / Cmd+L)
 *************************************************************/
function exportTodos() {
  const todosJSON = localStorage.getItem('todos');
  const blob = new Blob([todosJSON], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'todos.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importTodos() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.style.display = 'none';
  input.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const json = e.target.result;
        const importedTasks = JSON.parse(json);
        tasks = importedTasks;
        saveTasks();
        renderTasks();
        alert('Todos imported successfully!');
      } catch (error) {
        alert('Failed to import todos: ' + error);
      }
    };
    reader.readAsText(file);
  });
  document.body.appendChild(input);
  input.click();
  setTimeout(() => { document.body.removeChild(input); }, 1000);
}

/*************************************************************
 * getVisibleTasks Function (restored)
 *************************************************************/
function getVisibleTasks() {
  const visible = [];
  (function recurse(list, isTopLevel) {
    for (const task of list) {
      // If a top-level task is completed and showCompleted is false, skip it.
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
 * Task Management: Adding, Editing, Deleting
 *************************************************************/
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
  editingTaskId = newId;
  saveTasks();
  renderTasks();
  const visible = getVisibleTasks();
  const newIndex = visible.findIndex(t => t.id === newId);
  if (newIndex >= 0) {
    activeIndex = newIndex + 1;
    updateFocus();
  }
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
 * Rendering Functions
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

  // Leftmost cell: collapse/expand if subtasks exist
  const tdLeft = document.createElement('td');
  tdLeft.className = 'drag-handle';
  if (task.subtasks && task.subtasks.length > 0) {
    const collapseButton = document.createElement('button');
    collapseButton.className = 'collapse-button';
    collapseButton.textContent = task.collapsed ? '►' : '▼';
    collapseButton.onclick = function (e) {
      e.stopPropagation();
      toggleCollapse(task.id);
    };
    tdLeft.appendChild(collapseButton);
  }
  tr.appendChild(tdLeft);

  // ID Column
  const tdId = document.createElement('td');
  tdId.textContent = task.id;
  tr.appendChild(tdId);

  // Check if this row is in edit mode
  if (task.id === editingTaskId) {
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

    setTimeout(() => {
      const descField = document.getElementById(`edit-desc-${task.id}`);
      if (descField) descField.focus();
    }, 0);
  } else {
    // Normal (view) mode
    const tdDesc = document.createElement('td');
    tdDesc.innerHTML = parseInlineFormatting(task.description);
    if (task.completed) {
      tdDesc.classList.add('completed');
    }
    tr.appendChild(tdDesc);

    const tdDeadline = document.createElement('td');
    tdDeadline.textContent = task.deadline ? formatDate(task.deadline) : '';
    tr.appendChild(tdDeadline);

    const tdActions = document.createElement('td');
    tdActions.className = 'actions-cell';
    tdActions.style.position = 'relative';

    // Toggle Complete Button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'action-button';
    toggleBtn.title = 'Toggle Complete';
    toggleBtn.textContent = task.completed ? '✓' : '☐';
    toggleBtn.onclick = function (e) {
      e.stopPropagation();
      toggleComplete(task.id);
    };
    tdActions.appendChild(toggleBtn);

    // More Actions Dropdown
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'dropdown';

    const dropdownToggle = document.createElement('button');
    dropdownToggle.className = 'action-button dropdown-toggle';
    dropdownToggle.title = 'More Actions';
    dropdownToggle.textContent = '⋮';
    dropdownToggle.onclick = function (e) {
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

    document.addEventListener('click', function () {
      dropdownMenu.style.display = 'none';
    });
  }

  tbody.appendChild(tr);

  // Render any subtasks (if not collapsed)
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
  const visibleTop = getVisibleTasks();
  visibleTop.forEach(t => {
    if (getTaskLevel(t.id) === 0) {
      renderTaskRow(t, tbody, '');
    }
  });
  updateFocus();

  if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
    MathJax.typesetPromise()
      .then(() => console.log('MathJax re-typeset done.'))
      .catch(err => console.error('MathJax error:', err));
  }
}

/*************************************************************
 * Drag & Drop and Keyboard Navigation
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

  // Handle Cmd+O for export
  if (e.metaKey && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    exportTodos();
    return;
  }

  // Handle Cmd+I for import
  if (e.metaKey && e.key.toLowerCase() === 'i') {
    e.preventDefault();
    importTodos();
    return;
  }

  // Handle undo (Cmd+Z)
  if (e.metaKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undoDelete();
    return;
  }

  // Navigation & action keys
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
      enterCurrentRow();
      e.preventDefault();
      break;
    case '+':
      plusCurrentRow();
      e.preventDefault();
      break;
    case 'c':
      completeCurrentRow();
      e.preventDefault();
      break;
    case 'd':
      deleteCurrentRow();
      e.preventDefault();
      break;
    case 'n':
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
  if (activeIndex < 1) activeIndex = visibleCount;
  updateFocus();
}

function moveActiveDown() {
  const visibleCount = getVisibleTasks().length;
  activeIndex++;
  if (activeIndex > visibleCount) activeIndex = 1;
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
  const visible = getVisibleTasks();
  const idx = activeIndex - 1;
  if (idx < 0 || idx >= visible.length) return;
  const task = visible[idx];
  if (task.subtasks && task.subtasks.length > 0 && task.collapsed) {
    toggleCollapse(task.id);
  }
  const level = getTaskLevel(task.id);
  if (level < 2) {
    const newId = addSubtask(task.id, '', '');
    if (newId) focusOnNewSubtask(newId);
  } else {
    const parentId = task.id.split('.').slice(0, -1).join('.');
    if (parentId) {
      const newId = addSubtask(parentId, '', '');
      if (newId) focusOnNewSubtask(newId);
    }
  }
}

function focusOnNewSubtask(newId) {
  const allVisible = getVisibleTasks();
  const subIndex = allVisible.findIndex(t => t.id === newId);
  if (subIndex !== -1) {
    activeIndex = subIndex + 1;
    updateFocus();
  }
}

function completeCurrentRow() {
  const visible = getVisibleTasks();
  const idx = activeIndex - 1;
  if (idx >= 0 && idx < visible.length) {
    toggleComplete(visible[idx].id);
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
  document.querySelectorAll('tr.highlight').forEach(tr => tr.classList.remove('highlight'));
  const visible = getVisibleTasks();
  const idx = activeIndex - 1;
  if (idx >= 0 && idx < visible.length) {
    const row = document.querySelector(`tr[data-id="${visible[idx].id}"]`);
    if (row) row.classList.add('highlight');
  }
}

/*************************************************************
 * Toggle Show Completed & Initialize
 *************************************************************/
function toggleShowCompleted() {
  showCompleted = !showCompleted;
  const btn = document.getElementById('toggle-completed-btn');
  if (btn) {
    btn.textContent = showCompleted ? 'Hide Completed' : 'View Completed';
  }
  renderTasks();
}

// Initialize the app
loadTasks();
renderTasks();
