/*************************************************************
 * Global Variables
 *************************************************************/
let tasks = [];
let editingTaskId = null;
let activeIndex = 1;
let showCompleted = true;
let lastTasksSnapshot = null;
let currentPage = 'default';

/*************************************************************
 * Page Management Helpers
 *************************************************************/
function getPageKey(pageName) {
  return 'todos_' + pageName;
}

function getPageListKey() {
  return 'todo_pages';
}

function loadPageList() {
  const pagesJson = localStorage.getItem(getPageListKey());
  return pagesJson ? JSON.parse(pagesJson) : ['default'];
}

function savePageList(pages) {
  localStorage.setItem(getPageListKey(), JSON.stringify(pages));
}

/*************************************************************
 * Local Storage Functions (Page-Specific)
 *************************************************************/
function loadTasksForCurrentPage() {
  const storedTasks = localStorage.getItem(getPageKey(currentPage));
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

function saveTasksForCurrentPage() {
  localStorage.setItem(getPageKey(currentPage), JSON.stringify(tasks));
}


function exportAllPages() {
    const pages = loadPageList();
    const backupData = {
      pages: pages,
      data: {}
    };
    pages.forEach(page => {
      // Use the stored string (or default to an empty array string)
      backupData.data[page] = localStorage.getItem(getPageKey(page)) || "[]";
    });
    const backupJSON = JSON.stringify(backupData, null, 2);
    const blob = new Blob([backupJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  

  function importAllPages() {
  if (confirm("Importing an entire set of pages will overwrite your current state. Please back up your data manually if needed. Do you want to continue?")) {
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
            const importedData = JSON.parse(e.target.result);
            if (!importedData.pages || !importedData.data) {
            alert("Invalid backup file.");
            return;
            }
            // Overwrite the page list
            savePageList(importedData.pages);
            // Overwrite localStorage for each page.
            importedData.pages.forEach(page => {
            if (importedData.data.hasOwnProperty(page)) {
                localStorage.setItem(getPageKey(page), importedData.data[page]);
            } else {
                localStorage.setItem(getPageKey(page), "[]");
            }
            });
            // If the current page is no longer available, switch to the first imported page.
            const pages = loadPageList();
            if (!pages.includes(currentPage)) {
            currentPage = pages[0] || 'default';
            }
            updateURL();
            loadTasksForCurrentPage();
            renderTasks();
            renderSidebar();
            alert("Pages imported successfully!");
        } catch (error) {
            alert("Failed to import pages: " + error);
        }
        };
        reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(() => { document.body.removeChild(input); }, 1000);
  }
}



/*************************************************************
 * Hash-based URL Routing Functions
 *************************************************************/
function updateURL() {
    if (currentPage !== 'default') {
      window.location.hash = encodeURIComponent(currentPage);
      document.title = 'tiny-todo - ' + currentPage;
      const currentNameEl = document.getElementById('current-page-name');
      if (currentNameEl) {
        currentNameEl.textContent = currentPage;
      }
    } else {
      window.location.hash = '';
      document.title = 'tiny-todo';
    }
  }


function initializeRouting() {
    // Get the hash (without the leading '#')
    let hash = window.location.hash;
    if (hash) {
      hash = decodeURIComponent(hash.substring(1));
      let pages = loadPageList();
      // If the page from the URL exists, use it.
      if (pages.includes(hash)) {
        currentPage = hash;
      } else {
        currentPage = 'default';
      }
    } else {
      currentPage = 'default';
    }
    updateURL();
  }

/*************************************************************
 * Export / Import Todos (Cmd+O for export / Cmd+I for import)
 *************************************************************/
function exportTodos() {
  const todosJSON = localStorage.getItem(getPageKey(currentPage));
  const blob = new Blob([todosJSON], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentPage + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importTodos() {
  // Ask user which page to import into (default to current page if left blank)
  let pageName = prompt("Enter page name to import into (leave empty for current page):", currentPage);
  if (pageName && pageName !== currentPage) {
    let pages = loadPageList();
    if (!pages.includes(pageName)) {
      pages.push(pageName);
      savePageList(pages);
      // Initialize with empty todos if needed.
      localStorage.setItem(getPageKey(pageName), JSON.stringify([]));
      renderSidebar();
    }
    currentPage = pageName;
    updateURL();
  }
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
        const importedTasks = JSON.parse(e.target.result);
        tasks = importedTasks;
        saveTasksForCurrentPage();
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
 * Page Management Functions
 *************************************************************/
function addPage(pageName) {
  let pages = loadPageList();
  if (pages.includes(pageName)) {
    alert("Page already exists.");
    return;
  }
  pages.push(pageName);
  savePageList(pages);
  // Create an empty todos list for this page.
  localStorage.setItem(getPageKey(pageName), JSON.stringify([]));
  renderSidebar();
}

function removePage(pageName) {
  if (pageName === 'default') {
    alert("You cannot delete the default page.");
    return;
  }
  let pages = loadPageList();
  pages = pages.filter(p => p !== pageName);
  savePageList(pages);
  localStorage.removeItem(getPageKey(pageName));
  // If the deleted page was the current page, switch to default.
  if (pageName === currentPage) {
    currentPage = 'default';
    loadTasksForCurrentPage();
    renderTasks();
    updateURL();
  }
  renderSidebar();
}

/**
 * Rename a page.
 * Note: Cannot rename the default page.
 */
function renamePage(oldPageName, newPageName) {
  if (oldPageName === 'default') {
    alert("Cannot rename the default page.");
    return;
  }
  if (!newPageName) {
    alert("Page name cannot be empty.");
    return;
  }
  let pages = loadPageList();
  if (pages.includes(newPageName)) {
    alert("A page with that name already exists.");
    return;
  }
  const index = pages.indexOf(oldPageName);
  if (index === -1) return;
  pages[index] = newPageName;
  savePageList(pages);
  
  // Transfer tasks from old key to new key.
  const tasksData = localStorage.getItem(getPageKey(oldPageName));
  localStorage.setItem(getPageKey(newPageName), tasksData || JSON.stringify([]));
  localStorage.removeItem(getPageKey(oldPageName));
  
  if (currentPage === oldPageName) {
    currentPage = newPageName;
  }
  renderSidebar();
  const currentNameEl = document.getElementById('current-page-name');
  if (currentNameEl) {
    currentNameEl.textContent = currentPage;
  }
  if (currentPage === newPageName) {
    loadTasksForCurrentPage();
    renderTasks();
    updateURL();
  }
}

function switchPage(pageName) {
  currentPage = pageName;
  activeIndex = 1;
  loadTasksForCurrentPage();
  renderTasks();
  highlightCurrentPageInSidebar();
  updateURL();
  if (pageName === 'default') {
    const currentNameEl = document.getElementById('current-page-name');
    if (currentNameEl) {
        currentNameEl.textContent = pageName;
    }
  }
}


function switchToNextPage() {
    const pages = loadPageList();
    const index = pages.indexOf(currentPage);
    if (index < 0) return;
    const nextIndex = (index + 1) % pages.length;
    switchPage(pages[nextIndex]);
  }
  
  function switchToPrevPage() {
    const pages = loadPageList();
    const index = pages.indexOf(currentPage);
    if (index < 0) return;
    // Use modulo arithmetic to wrap around.
    const prevIndex = (index - 1 + pages.length) % pages.length;
    switchPage(pages[prevIndex]);
  }
  

/*************************************************************
 * getVisibleTasks Function
 *************************************************************/
function getVisibleTasks() {
  const visible = [];
  (function recurse(list, isTopLevel) {
    for (const task of list) {
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
 * Task Management Functions
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
  saveTasksForCurrentPage();
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
  saveTasksForCurrentPage();
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
  saveTasksForCurrentPage();
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
  saveTasksForCurrentPage();
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
  saveTasksForCurrentPage();
  renderTasks();
  updateFocus();
}

function toggleComplete(id) {
  toggleCompleteTask(id, tasks);
  saveTasksForCurrentPage();
  renderTasks();
  updateFocus();
}

function toggleCollapse(id) {
  const t = findTaskById(id, tasks);
  if (!t) return;
  t.collapsed = !t.collapsed;
  saveTasksForCurrentPage();
  renderTasks();
  updateFocus();
}

/*************************************************************
 * Rendering Functions
 *************************************************************/
function renderTaskRow(task, tbody, parentId = '') {
  const tr = document.createElement('tr');
  // When a row is clicked, update activeIndex and highlight it.
    tr.addEventListener('click', function (e) {
        // Avoid interfering with button clicks (collapse, dropdown, etc.)
        if (e.target.tagName.toLowerCase() === 'button') return;
        const visible = getVisibleTasks();
        const index = visible.findIndex(t => t.id === task.id);
        if (index >= 0) {
        activeIndex = index + 1; // Use 1-based indexing as before.
        updateFocus();
        }
    });
  
  tr.draggable = true;
  tr.classList.add('draggable-row');
  tr.setAttribute('data-id', task.id);
  tr.setAttribute('data-level', getTaskLevel(task.id));
  tr.setAttribute('data-parent', parentId);

  tr.addEventListener('dragstart', handleDragStart);
  tr.addEventListener('dragover', handleDragOver);
  tr.addEventListener('drop', handleDrop);

  tr.style.backgroundColor = getRowColor(task.id);

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

  const tdId = document.createElement('td');
  tdId.textContent = task.id;
  tr.appendChild(tdId);

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

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'action-button';
    toggleBtn.title = 'Toggle Complete';
    toggleBtn.textContent = task.completed ? '✓' : '☐';
    toggleBtn.onclick = function(e) {
      e.stopPropagation();
      toggleComplete(task.id);
    };
    tdActions.appendChild(toggleBtn);

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
 * Sidebar Rendering and Page Navigation
 *************************************************************/
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const pages = loadPageList();
  sidebar.innerHTML = '';
  pages.forEach(pageName => {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'sidebar-item';
    pageDiv.textContent = pageName;
    pageDiv.setAttribute('data-page', pageName);
    pageDiv.onclick = () => {
      switchPage(pageName);
      const currentNameEl = document.getElementById('current-page-name');
      if (currentNameEl) {
        currentNameEl.textContent = currentPage;
      }
    };
    // Allow renaming via double-click if not default.
    if (pageName !== 'default') {
      pageDiv.ondblclick = () => {
        const newName = prompt("Enter new name for page:", pageName);
        if (newName && newName !== pageName) {
          renamePage(pageName, newName);
        }
      };
    }
    
    // Always add delete icon for non-default pages.
    if (pageName !== 'default') {
      const deleteIcon = document.createElement('span');
      deleteIcon.className = 'trash-icon';
      deleteIcon.textContent = '✖︎';
      deleteIcon.style.cursor = 'pointer';
      deleteIcon.onclick = (e) => {
        e.stopPropagation();
        if (confirm("Delete page " + pageName + "?")) {
          removePage(pageName);
        }
      };
      pageDiv.appendChild(deleteIcon);
    }
    
    sidebar.appendChild(pageDiv);
  });
  highlightCurrentPageInSidebar();
}

function highlightCurrentPageInSidebar() {
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  sidebarItems.forEach(item => {
    const page = item.getAttribute('data-page');
    if (page === currentPage) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function createNewPage() {
  const pageName = prompt("Enter new page name:");
  if (pageName && pageName !== 'default') {
    addPage(pageName);
    switchPage(pageName);
    const currentNameEl = document.getElementById('current-page-name');
    if (currentNameEl) {
      currentNameEl.textContent = currentPage;
    }
  } else if (pageName === 'default') {
    alert("Cannot create a page named default.");
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
  saveTasksForCurrentPage();
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
  
  // Handle Cmd+P for import
  if (e.metaKey && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    createNewPage();
    return;
  }
  
  // Handle undo (Cmd+Z)
  if (e.metaKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undoDelete();
    return;
  }
  
// Use cmd+ArrowDown to switch to the next page.
if (e.metaKey && e.key === 'ArrowDown') {
    e.preventDefault();
    switchToNextPage();
    return;
    }
    
// Use cmd+ArrowUp to switch to the previous page.
if (e.metaKey && e.key === 'ArrowUp') {
e.preventDefault();
switchToPrevPage();
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
    if (row) {
      row.classList.add('highlight');
      // Ensure the focused row is scrolled into view smoothly.
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

/*************************************************************
 * Toggle Show Completed & Initialization
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
 * Initialization
 *************************************************************/
initializeRouting();
loadTasksForCurrentPage();
renderTasks();
renderSidebar();