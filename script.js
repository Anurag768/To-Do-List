// === Element references ===
const taskForm = document.querySelector(".task-form");
const taskList = document.querySelector(".task-list");
const submitBtn = taskForm.querySelector('button[type="submit"]');
const filterButtons = document.querySelectorAll(".filter-btn");
const searchInput = document.getElementById("task-search");
const sortSelect = document.getElementById("task-sort");
const totalCountEl = document.getElementById("task-count-total");
const pendingCountEl = document.getElementById("task-count-pending");
const completedCountEl = document.getElementById("task-count-completed");
const clearCompletedBtn = document.getElementById("clear-completed-btn");
const themeToggleBtn = document.getElementById("theme-toggle");

// === Theme handling ===
function applyTheme(theme) {
  const body = document.body;
  if (theme === "dark") {
    body.classList.add("theme-dark");
    if (themeToggleBtn) themeToggleBtn.textContent = "☀️";
  } else {
    body.classList.remove("theme-dark");
    if (themeToggleBtn) themeToggleBtn.textContent = "🌙";
  }
}

// Load theme from localStorage on start
const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

// Toggle on button click
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.contains("theme-dark");
    const newTheme = isDark ? "light" : "dark";
    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  });
}


// Load tasks from localStorage OR create empty list
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// Track edit mode
let isEditing = false;
let editTaskId = null;

// Track current filter: "all" | "pending" | "completed"
let currentFilter = "all";

// Track search query & sort option
let searchQuery = "";
let sortOption = "none";

// === Helpers ===
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function resetFormState() {
  taskForm.reset();
  isEditing = false;
  editTaskId = null;
  submitBtn.textContent = "Add Task";
}

// Update stats bar (always based on ALL tasks)
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;

  if (totalCountEl) totalCountEl.textContent = total;
  if (pendingCountEl) pendingCountEl.textContent = pending;
  if (completedCountEl) completedCountEl.textContent = completed;

  // Disable "Clear completed" if nothing to clear
  if (clearCompletedBtn) {
    clearCompletedBtn.disabled = completed === 0;
  }
}

// === Render tasks ===
function renderTasks() {
  taskList.innerHTML = "";

  // 1) filter by status
  let filteredTasks = tasks.filter((task) => {
    if (currentFilter === "pending") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true; // "all"
  });

  // 2) filter by search (title + description)
  const query = searchQuery.trim().toLowerCase();
  if (query) {
    filteredTasks = filteredTasks.filter((task) => {
      const titleMatch = task.title.toLowerCase().includes(query);
      const descMatch = (task.description || "").toLowerCase().includes(query);
      return titleMatch || descMatch;
    });
  }

  // 3) sort
  let finalTasks = [...filteredTasks];

  if (sortOption === "dueDate") {
    finalTasks.sort((a, b) => {
      // Empty dates go last
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  } else if (sortOption === "priority") {
    const priorityRank = { high: 1, normal: 2, low: 3 };
    finalTasks.sort((a, b) => {
      return (priorityRank[a.priority] || 99) - (priorityRank[b.priority] || 99);
    });
  }

  if (finalTasks.length === 0) {
    taskList.innerHTML = `
      <li class="task-item task-item--empty">
        <p>No tasks yet. Add your first task above.</p>
      </li>
    `;
    updateStats();
    return;
  }

  finalTasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";
    li.dataset.id = task.id;

    li.innerHTML = `
      <div class="task-item-main">
        <label class="task-checkbox">
          <input
            type="checkbox"
            class="task-complete-checkbox"
            data-id="${task.id}"
            ${task.completed ? "checked" : ""}
          >
        </label>

        <div class="task-info">
          <h4 class="task-title ${task.completed ? "task-title--completed" : ""}">
            ${task.title}
          </h4>
          ${
            task.description
              ? `<p class="task-description">${task.description}</p>`
              : ""
          }
          <div class="task-meta">
            <small class="task-due-date">
              ${task.dueDate ? `Due: ${task.dueDate}` : "No due date"}
            </small>
            <span class="priority-badge priority-${task.priority}">
              ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div class="task-actions">
        <button
          type="button"
          class="btn btn-ghost edit-btn"
          data-id="${task.id}"
        >
          Edit
        </button>
        <button
          type="button"
          class="btn btn-danger delete-btn"
          data-id="${task.id}"
        >
          Delete
        </button>
      </div>
    `;

    taskList.appendChild(li);
  });

  // Update stats after rendering
  updateStats();
}

// === Handle form submit (Add / Edit) ===
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const titleInput = document.getElementById("task-title");
  const descInput = document.getElementById("task-description");
  const dueDateInput = document.getElementById("task-due-date");
  const prioritySelect = document.getElementById("task-priority");

  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const dueDate = dueDateInput.value;
  const priority = prioritySelect.value;

  if (!title) {
    alert("Title is required.");
    return;
  }

  if (isEditing && editTaskId !== null) {
    // Update existing task
    tasks = tasks.map((task) =>
      task.id === editTaskId
        ? {
            ...task,
            title,
            description,
            dueDate,
            priority,
          }
        : task
    );
  } else {
    // Create new task
    const task = {
      id: Date.now(), // unique id
      title,
      description,
      dueDate,
      priority,
      completed: false,
    };

    tasks.push(task);
  }

  saveTasks();
  renderTasks();
  resetFormState();
});

// === Handle clicks on task list (Edit / Delete using event delegation) ===
taskList.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-btn");
  const deleteBtn = e.target.closest(".delete-btn");

  // Edit task
  if (editBtn) {
    const id = Number(editBtn.dataset.id);
    const taskToEdit = tasks.find((task) => task.id === id);
    if (!taskToEdit) return;

    // Fill form with existing values
    document.getElementById("task-title").value = taskToEdit.title;
    document.getElementById("task-description").value =
      taskToEdit.description || "";
    document.getElementById("task-due-date").value = taskToEdit.dueDate || "";
    document.getElementById("task-priority").value = taskToEdit.priority;

    // Switch to edit mode
    isEditing = true;
    editTaskId = id;
    submitBtn.textContent = "Save Changes";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Delete task
  if (deleteBtn) {
    const id = Number(deleteBtn.dataset.id);
    const confirmDelete = confirm("Are you sure you want to delete this task?");
    if (!confirmDelete) return;

    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    renderTasks();

    // If we deleted the one being edited, reset form
    if (isEditing && editTaskId === id) {
      resetFormState();
    }
  }
});

// === Handle checkbox change (toggle completed) ===
taskList.addEventListener("change", (e) => {
  if (e.target.classList.contains("task-complete-checkbox")) {
    const id = Number(e.target.dataset.id);
    const isChecked = e.target.checked;

    tasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: isChecked } : task
    );

    saveTasks();
    renderTasks();
  }
});

// === Filter buttons (All / Pending / Completed) ===
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Remove active class from all
    filterButtons.forEach((b) => b.classList.remove("filter-btn--active"));

    // Add active to clicked
    btn.classList.add("filter-btn--active");

    // Determine filter from button text
    const text = btn.textContent.trim().toLowerCase();
    if (text === "pending") currentFilter = "pending";
    else if (text === "completed") currentFilter = "completed";
    else currentFilter = "all";

    // Re-render with new filter
    renderTasks();
  });
});

// === Search input (live search) ===
if (searchInput) {
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    renderTasks();
  });
}

// === Sort select ===
if (sortSelect) {
  sortSelect.addEventListener("change", () => {
    sortOption = sortSelect.value;
    renderTasks();
  });
}

// === Clear completed button ===
if (clearCompletedBtn) {
  clearCompletedBtn.addEventListener("click", () => {
    const hasCompleted = tasks.some((t) => t.completed);
    if (!hasCompleted) return;

    const confirmClear = confirm(
      "This will remove all completed tasks. Continue?"
    );
    if (!confirmClear) return;

    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    renderTasks();
  });
}

// Initial render when page loads
renderTasks();
updateStats();
