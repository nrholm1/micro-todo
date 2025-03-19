// utils.js

/*************************************************************
 * Helper Functions & Task Utilities
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
      if (task.id === id) return false;
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
  
  function getRowColor(id) {
    const level = getTaskLevel(id);
    const mainNum = parseInt(String(id).split('.')[0], 10);
  
    if (Number.isNaN(mainNum)) {
      return 'white';
    }
  
    const hue = (mainNum * 137 + 13) % 360;
    let saturation = 60 - (level * 10);
    let lightness  = 85 + (level * 5);
    saturation = Math.max(0, Math.min(100, saturation));
    lightness  = Math.max(0, Math.min(100, lightness));
    return hslToHex(hue, saturation, lightness);
  }
  
  function hslToHex(h, s, l) {
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
    const R = Math.round((r + m) * 255);
    const G = Math.round((g + m) * 255);
    const B = Math.round((b + m) * 255);
    return '#' + toHex(R) + toHex(G) + toHex(B);
  }
  
  function toHex(val) {
    const hex = val.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }
  
  function parseInlineFormatting(text) {
    if (!text) return '';
    let parsed = text;
    parsed = parsed.replace(/`([^`]+)`/g, (match, codeText) => {
      const escapedCode = codeText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<code>${escapedCode}</code>`;
    });
    parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      const safeUrl = url.replace(/"/g, "&quot;");
      const escapedLinkText = linkText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<a href="${safeUrl}" target="_blank">${escapedLinkText}</a>`;
    });
    parsed = parsed.replace(/\*\*([^*]+)\*\*/g, (match, boldText) => {
      return `<strong>${boldText}</strong>`;
    });
    parsed = parsed.replace(/\*([^*]+)\*/g, (match, italicText) => {
      return `<em>${italicText}</em>`;
    });
    return parsed;
  }
  
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
  // You can export functions as needed if using modules,
  // otherwise ensure they are globally available.
  