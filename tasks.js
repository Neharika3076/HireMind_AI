/**
 * HUMN — Tasks & Projects Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  const store = window.TerraHireStore
    ? window.TerraHireStore.getStore()
    : null;

  if (!store) {
    console.error("TerraHireStore not available.");
    return;
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================


  const currentUser =
    window.TerraHireStore.getCurrentUser();

  if (!currentUser) {
    window.location.href = "./login.html";
    return;
  }

  // ==========================================
  // ROLE-BASED NAVIGATION
  // ==========================================

  const directoryNav =
    document.getElementById("nav-item-team");

  const addMemberNav =
    document.getElementById("nav-item-add");

  const adminButton =
    document.getElementById("btn-quick-admin-switch");

  const memberSwitcher =
    document.getElementById("select-switch-member");

  if (currentUser.roleType !== "admin") {

    directoryNav?.closest("li")?.remove();

    addMemberNav?.closest("li")?.remove();

    adminButton?.remove();

    memberSwitcher?.closest("div")?.remove();
  }

  // ==========================================
  // ACTIVE USER CHIP
  // ==========================================

  const sbAvatar =
    document.getElementById("sidebar-user-avatar");

  const sbName =
    document.getElementById("sidebar-user-name");

  const sbRole =
    document.getElementById("sidebar-user-role");

  if (sbAvatar) {
    sbAvatar.textContent =
      currentUser.fullName.charAt(0).toUpperCase();
  }

  if (sbName) {
    sbName.textContent = currentUser.fullName;
  }

  if (sbRole) {
    sbRole.textContent =
      currentUser.designation || "Member";
  }
  // ==========================================
  // PREVIEW SWITCHER
  // ADMIN ONLY
  // ==========================================

  const memberSelect =
    document.getElementById("select-switch-member");

  if (memberSelect && currentUser.roleType === "admin") {

    memberSelect.value = currentUser.id;

    memberSelect.onchange = (e) => {

      const s =
        window.TerraHireStore.getStore();

      const target =
        s.members.find(
          (m) => m.id === e.target.value
        );

      if (target) {
        window.TerraHireStore.setCurrentUser(target);
        window.location.reload();
      }
    };
  }
  // Logout
  const logoutBtn =
    document.getElementById("btn-emp-logout");

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      window.TerraHireStore.setCurrentUser(null);
      window.location.href = "./login.html";
    };
  }

  // Admin Switch
  const btnAdmin =
    document.getElementById("btn-quick-admin-switch");

  if (btnAdmin && currentUser.roleType === "admin") {
    btnAdmin.onclick = () => {
      window.location.href = "./admin.html";
    };
  }

  let currentFilter = "ALL";
  let searchQuery = "";

  // ==========================================
  // TASK ASSIGNMENT PERMISSIONS
  // ==========================================

  const assignmentRules = {
    admin: ["department_head", "manager"],
    department_head: ["manager", "team_leader", "employee"],
    manager: ["team_leader", "employee"],
    team_leader: ["employee"],
    employee: []
  };

  function canAssignTo(targetUser) {
    if (!targetUser) return false;

    // Nobody can assign a task to themselves
    if (targetUser.id === currentUser.id) {
      return false;
    }

    const allowedRoles =
      assignmentRules[currentUser.roleType] || [];

    return allowedRoles.includes(targetUser.roleType);
  }


  function renderProjects() {
    const s = window.TerraHireStore.getStore();
    const container = document.getElementById("projects-container");
    if (!container) return;
    container.innerHTML = "";

    let projects = s.projects;

    // Employee can see only their own project
    if (currentUser.roleType !== "admin") {
      projects = projects.filter(
        (proj) => proj.id === currentUser.projectId
      );
    }


    projects.forEach((proj) => {
      const org = s.organizations.find((o) => o.id === proj.orgId) || { code: "ACME" };
      const teamCount = s.members.filter((m) => m.projectId === proj.id || m.projectCode === proj.code).length;

      const pCard = document.createElement("div");
      pCard.className = "card-workday-detailed";
      pCard.style.padding = "16px 20px";
      pCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
          <div>
            <span class="badge badge-teal" style="font-size:10.5px; font-family:var(--font-mono);">${proj.code}</span>
            <h4 style="font-size:15px; font-weight:700; color:var(--white); margin-top:6px;">${proj.name}</h4>
          </div>
          <span class="badge badge-emp" style="font-size:10.5px;">${proj.status}</span>
        </div>
        <p style="font-size:12.5px; color:var(--mist); margin-bottom:12px; line-height:1.4;">${proj.desc}</p>
        <div style="font-size:12px; color:var(--mist-dim); border-top:1px solid var(--line); padding-top:10px; display:flex; justify-content:space-between;">
          <span>PM: <strong style="color:var(--white);">${proj.pmName}</strong></span>
          <span>👥 <strong style="color:var(--teal-300);">${teamCount} Assigned</strong></span>
        </div>
      `;
      container.appendChild(pCard);
    });
  }

  function renderTasks() {
    const s = window.TerraHireStore.getStore();
    const cur = currentUser;
    let allTasks = s.tasks || [];
    if (currentUser.roleType !== "admin") {
      allTasks = allTasks.filter(
        (task) =>
          task.memberId === currentUser.id &&
          task.projectId === currentUser.projectId
      );
    }

    const countAll = document.getElementById("count-all");
    const countPending = document.getElementById("count-pending");
    const countCompleted = document.getElementById("count-completed");

    const completedTotal = allTasks.filter((t) => t.completed).length;
    const pendingTotal = allTasks.filter((t) => !t.completed).length;

    if (countAll) countAll.textContent = allTasks.length;
    if (countPending) countPending.textContent = pendingTotal;
    if (countCompleted) countCompleted.textContent = completedTotal;

    let filtered = allTasks.filter((t) => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (currentFilter === "PENDING") return !t.completed;
      if (currentFilter === "COMPLETED") return t.completed;
      if (currentFilter === "HIGH") return t.priority === "High" || t.priority === "Critical";
      return true;
    });

    const tbody = document.getElementById("tasks-table-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:30px; color:var(--mist);">
            No sprint tasks match your current filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach((task) => {
      const assignee = s.members.find((m) => m.id === task.memberId) || { fullName: "Sarah Johnson" };

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <input type="checkbox" ${task.completed ? "checked" : ""} class="task-checkbox" data-task-id="${task.id}" style="width:16px; height:16px; cursor:pointer;">
        </td>
        <td style="font-weight:600; color:var(--white);">
          <span style="${task.completed ? "text-decoration:line-through; color:var(--mist-dim);" : ""}">${task.title}</span>
        </td>
        <td><span class="badge badge-emp" style="font-size:11px;">${task.category || "General"}</span></td>
        <td><span class="task-priority-tag ${task.priority || "Medium"}">${task.priority || "Medium"}</span></td>
        <td style="font-family:var(--font-mono); font-size:12.5px; color:var(--mist);">${task.dueDate || "2026-08-20"}</td>
        <td style="font-size:13px; color:var(--teal-300);">👤 ${assignee.fullName}</td>
        <td style="text-align:right;">
          <button class="btn btn-ghost btn-sm btn-del-task" data-task-id="${task.id}" style="padding:4px 8px; font-size:11px; color:var(--err);">
            ✕ Delete
          </button>
        </td>
      `;

      const chk = tr.querySelector(".task-checkbox");
      if (chk) {
        chk.onchange = () => {
          if (
            currentUser.roleType !== "admin" &&
            task.memberId !== currentUser.id
          ) {
            return;
          }

          window.TerraHireStore.toggleTask(task.id);

          renderTasks();
        };
      }

      const del = tr.querySelector(".btn-del-task");
      if (del) {
        del.onclick = () => {

          const fresh = window.TerraHireStore.getStore();

          // Employee can delete only their own task
          if (
            currentUser.roleType !== "admin" &&
            task.memberId !== currentUser.id
          ) {
            return;
          }

          fresh.tasks = fresh.tasks.filter(
            (t) => t.id !== task.id
          );

          window.TerraHireStore.setStore(fresh);

          renderTasks();
        };
      }

      tbody.appendChild(tr);
    });
  }

  // Filter tabs handler
  const filterTabs = document.querySelectorAll("#task-filter-tabs button");
  filterTabs.forEach((tab) => {
    tab.onclick = () => {
      filterTabs.forEach((t) => t.classList.remove("active-tab"));
      tab.classList.add("active-tab");
      currentFilter = tab.getAttribute("data-filter") || "ALL";
      renderTasks();
    };
  });

  const searchInp = document.getElementById("task-search-input");
  if (searchInp) {
    searchInp.oninput = (e) => {
      searchQuery = e.target.value.trim();
      renderTasks();
    };
  }

  // Modal create deliverable
  const modal = document.getElementById("modal-task-create");
  const btnOpen = document.getElementById("btn-open-task-modal");
  const btnClose = document.getElementById("btn-close-task-modal");
  const form = document.getElementById("form-create-full-task");
  const assigneeSelect = document.getElementById("task-full-assignee");

  // Employees cannot assign tasks
  if (
    btnOpen &&
    currentUser.roleType === "employee"
  ) {
    btnOpen.style.display = "none";
  }

  // ==========================================
  // ASSIGNEE DROPDOWN
  // ==========================================

  if (assigneeSelect) {
    assigneeSelect.innerHTML = "";

    const allowedMembers = store.members.filter((member) => {
      return canAssignTo(member);
    });

    if (allowedMembers.length === 0) {

      const opt = document.createElement("option");

      opt.value = "";
      opt.textContent = "No eligible assignees";

      opt.disabled = true;
      opt.selected = true;

      assigneeSelect.appendChild(opt);

    } else {

      // Placeholder
      const placeholder = document.createElement("option");

      placeholder.value = "";
      placeholder.textContent = "Select employee to assign";
      placeholder.disabled = true;
      placeholder.selected = true;

      assigneeSelect.appendChild(placeholder);

      // Add only allowed people
      allowedMembers.forEach((member) => {

        const opt = document.createElement("option");

        opt.value = member.id;

        opt.textContent =
          `${member.fullName} (${member.roleCategory || member.designation || "Member"})`;

        assigneeSelect.appendChild(opt);
      });
    }
  }

if (btnOpen && modal) {

  btnOpen.onclick = () => {

    if (currentUser.roleType === "employee") {
      return;
    }

    modal.classList.remove("hidden");
  };
}
  if (btnClose && modal) btnClose.onclick = () => modal.classList.add("hidden");

  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const title = document.getElementById("task-full-title")?.value.trim();
      const priority = document.getElementById("task-full-priority")?.value;
      const category = document.getElementById("task-full-category")?.value.trim();
      const due = document.getElementById("task-full-due")?.value;
      const targetMemberId =
        assigneeSelect ? assigneeSelect.value : "";

      if (!title) {
        return;
      }

      // Employee cannot create/assign tasks
      if (currentUser.roleType === "employee") {
        alert("Employees are not allowed to assign tasks.");
        return;
      }

      // Find selected employee
      const targetMember = store.members.find(
        (member) => member.id === targetMemberId
      );

      // Validate target
      if (!targetMember) {
        alert("Please select a valid assignee.");
        return;
      }

      // Check role permission + prevent self assignment
      if (!canAssignTo(targetMember)) {
        alert(
          "You are not allowed to assign a task to this person."
        );
        return;
      }

      // For non-admin roles, keep task inside their project
      if (
        currentUser.roleType !== "admin" &&
        targetMember.projectId !== currentUser.projectId
      ) {
        alert(
          "You can only assign tasks to members of your project."
        );
        return;
      }

      window.TerraHireStore.addTask(targetMember.id, {
        title: title,
        priority: priority || "High",
        category: category || "Design",
        dueDate: due || "2026-08-22",
        projectId: currentUser.projectId
      });

      form.reset();

      if (modal) {
        modal.classList.add("hidden");
      }

      renderTasks();
    };
  }

  renderProjects();
  renderTasks();
});

