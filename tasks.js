"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const currentUser = window.TerraHireStore.getCurrentUser();
  if (!currentUser) { window.location.href = "./login.html"; return; }

  const byId = (id) => document.getElementById(id);
  const selected = (selector) => Array.from(document.querySelectorAll(`${selector}:checked`)).map((input) => input.value);
  const unique = (values) => [...new Set((values || []).filter(Boolean))];
  const isOwner = ["admin", "executive"].includes(currentUser.roleType);
  const error = byId("task-error"), feedback = byId("task-feedback");
  let selectedTaskId = null;

  function data() { return window.TerraHireStore.getStore(); }
  function member(id) { return data().members.find((item) => item.id === id); }
  function project(id) { return data().projects.find((item) => item.id === id); }
  function departmentsFor(projectItem) { return (projectItem.departmentIds || []).map((id) => data().departments.find((item) => item.id === id)).filter(Boolean); }
  function membersForProject(projectItem) { return window.TerraHireStore.getProjectMembers(projectItem.id); }
  function canManage(projectItem) { return isOwner ? currentUser.roleType === "admin" || projectItem.departmentIds.includes(currentUser.departmentId) : currentUser.roleType === "manager" && (projectItem.managerIds || []).includes(currentUser.id); }
  function inHierarchy(item) {
    if (!item || item.orgId !== currentUser.orgId) return false;
    if (currentUser.roleType === "admin") return true;
    if (currentUser.roleType === "executive") return item.departmentId === currentUser.departmentId || item.executiveId === currentUser.id;
    if (currentUser.roleType === "manager") return item.managerId === currentUser.id;
    return item.id === currentUser.id;
  }
  function visibleProjects() { return window.TerraHireStore.getAccessibleProjects(currentUser); }
  function visibleTasks() {
    const allowed = new Set(visibleProjects().map((item) => item.id));
    return (data().tasks || []).filter((task) => allowed.has(task.projectId) && (isOwner || canManage(project(task.projectId)) || task.teamLeadIds.includes(currentUser.id) || task.employeeIds.includes(currentUser.id)));
  }
  function message(text, bad = false) { error.textContent = bad ? text : ""; feedback.textContent = bad ? "" : text; feedback.classList.toggle("hidden", bad || !text); }
  function nameList(ids) { return (ids || []).map((id) => (member(id) || {}).fullName).filter(Boolean).join(", ") || "Unassigned"; }

  function checkboxList(container, items, className, label, checked = []) {
    container.innerHTML = "";
    if (!items.length) { container.innerHTML = '<span class="empty">No eligible members available.</span>'; return; }
    items.forEach((item) => {
      const row = document.createElement("label");
      row.innerHTML = `<input type="checkbox" class="${className}" value="${item.id}" ${checked.includes(item.id) ? "checked" : ""}><span>${label(item)}</span>`;
      container.appendChild(row);
    });
  }
  function open(id) { byId(id).classList.remove("hidden"); }
  function close(id) { byId(id).classList.add("hidden"); }
  document.querySelectorAll("[data-close]").forEach((button) => button.onclick = () => close(button.dataset.close));

  function renderProjectCards() {
    const container = byId("projects-container"); container.innerHTML = "";
    const projects = visibleProjects();
    if (!projects.length) { container.innerHTML = '<div class="card-workday-detailed" style="padding:24px; color:var(--mist);">No projects are assigned to your workspace.</div>'; return; }
    projects.forEach((projectItem) => {
      const tasks = (data().tasks || []).filter((task) => task.projectId === projectItem.id);
      const progress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / tasks.length) : 0;
      const card = document.createElement("div"); card.className = "card-workday-detailed"; card.style.padding = "16px 18px";
      card.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px"><div><span class="badge badge-teal" style="font-size:10px">${projectItem.code}</span><h3 style="font-size:15px;margin-top:6px">${projectItem.name}</h3></div><span class="badge badge-emp" style="font-size:10px">${projectItem.status}</span></div><p style="color:var(--mist);font-size:12px;line-height:1.45;margin:10px 0">${projectItem.desc || "No project description."}</p><div style="font-size:11.5px;color:var(--mist-dim)">Departments: <strong style="color:var(--white)">${departmentsFor(projectItem).map((department) => department.name).join(", ")}</strong><br>Managers: <strong style="color:var(--white)">${nameList(projectItem.managerIds)}</strong><br>Team Leaders: <strong style="color:var(--white)">${nameList(projectItem.teamLeadIds)}</strong></div><div style="margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--mist)"><span>Delivery progress</span><span>${progress}%</span></div><div style="height:5px;border-radius:4px;background:rgba(255,255,255,.08);margin-top:4px"><div style="width:${progress}%;height:100%;background:var(--teal-400);border-radius:4px"></div></div></div>`;
      container.appendChild(card);
    });
  }

  function populateFilters() {
    const projects = visibleProjects(); const allMembers = unique(projects.flatMap((item) => membersForProject(item).map((member) => member.id))).map(member).filter(Boolean); const allDepartments = unique(projects.flatMap((item) => item.departmentIds)).map((id) => data().departments.find((item) => item.id === id)).filter(Boolean);
    const setOptions = (select, items, text) => { const value = select.value || "ALL"; select.innerHTML = `<option value="ALL">All ${text}</option>`; items.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = item.fullName || item.name; select.appendChild(option); }); select.value = Array.from(select.options).some((option) => option.value === value) ? value : "ALL"; };
    setOptions(byId("filter-project"), projects, "Projects"); setOptions(byId("filter-department"), allDepartments, "Departments"); setOptions(byId("filter-manager"), allMembers.filter((item) => item.roleType === "manager"), "Managers"); setOptions(byId("filter-lead"), allMembers.filter((item) => projects.some((projectItem) => projectItem.teamLeadIds.includes(item.id))), "Team Leaders"); setOptions(byId("filter-member"), allMembers, "Members");
  }

  function renderTasks() {
    const filters = { project: byId("filter-project").value, department: byId("filter-department").value, manager: byId("filter-manager").value, lead: byId("filter-lead").value, member: byId("filter-member").value, status: byId("filter-status").value, search: byId("task-search").value.trim().toLowerCase() };
    const tasks = visibleTasks().filter((task) => { const projectItem = project(task.projectId); return (!filters.project || filters.project === "ALL" || task.projectId === filters.project) && (filters.department === "ALL" || projectItem.departmentIds.includes(filters.department)) && (filters.manager === "ALL" || task.managerIds.includes(filters.manager)) && (filters.lead === "ALL" || task.teamLeadIds.includes(filters.lead)) && (filters.member === "ALL" || task.employeeIds.includes(filters.member)) && (filters.status === "ALL" || task.status === filters.status) && (!filters.search || `${task.title} ${task.desc || ""}`.toLowerCase().includes(filters.search)); });
    const table = byId("tasks-table"); table.innerHTML = "";
    if (!tasks.length) { table.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:26px;color:var(--mist)">No tasks match the selected filters.</td></tr>'; return; }
    tasks.forEach((task) => { const projectItem = project(task.projectId); const row = document.createElement("tr"); row.innerHTML = `<td><span class="badge badge-teal" style="font-size:10px">${projectItem.code}</span></td><td><strong style="color:var(--white)">${task.title}</strong><div style="font-size:11px;color:var(--mist-dim)">${task.desc || task.category || ""}</div></td><td style="font-size:11.5px">Manager: ${nameList(task.managerIds)}<br>TL: ${nameList(task.teamLeadIds)}<br>Members: ${nameList(task.employeeIds)}</td><td><span class="task-priority-tag ${task.priority}">${task.priority}</span></td><td style="font-family:var(--font-mono);font-size:11px">${task.dueDate || "—"}</td><td>${task.progress || 0}%</td><td><span class="badge ${task.status === "Completed" ? "badge-teal" : task.status === "Pending Review" ? "badge-admin" : "badge-emp"}" style="font-size:10px">${task.status}</span></td><td><button class="btn btn-ghost btn-sm view-task" data-id="${task.id}">Details</button></td>`; row.querySelector(".view-task").onclick = () => showTask(task.id); table.appendChild(row); });
  }

  function renderProjectFormLists() {
    const allDepartments = window.TerraHireStore.getOrganizationDepartments(currentUser.orgId);
    const departments = currentUser.roleType === "executive" ? allDepartments.filter((department) => department.id === currentUser.departmentId) : allDepartments;
    checkboxList(byId("project-departments"), departments, "project-department", (item) => item.name);
    const refreshPeople = () => { const selectedDepartmentIds = selected(".project-department"); const people = data().members.filter((item) => item.orgId === currentUser.orgId && selectedDepartmentIds.includes(item.departmentId)); checkboxList(byId("project-members"), people, "project-member", (item) => `${item.fullName} · ${item.department}`); checkboxList(byId("project-managers"), people.filter((item) => item.roleType === "manager"), "project-manager", (item) => `${item.fullName} · ${item.managerPosition || "Manager"}`); checkboxList(byId("project-leads"), people.filter((item) => item.roleType !== "executive"), "project-lead", (item) => `${item.fullName} · project Team Leader`); };
    byId("project-departments").onchange = refreshPeople; refreshPeople();
  }

  function populateTeamProjectSelect() {
    const select = byId("team-project"); const projects = visibleProjects().filter(canManage); select.innerHTML = '<option value="" disabled selected>Select project</option>'; projects.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = `${item.code} — ${item.name}`; select.appendChild(option); });
    select.onchange = () => { const projectItem = project(select.value); const people = data().members.filter((item) => item.orgId === currentUser.orgId && projectItem.departmentIds.includes(item.departmentId)); checkboxList(byId("team-members"), people, "team-member", (item) => `${item.fullName} · ${item.department}`, projectItem.memberIds); checkboxList(byId("team-managers"), people.filter((item) => item.roleType === "manager"), "team-manager", (item) => `${item.fullName} · ${item.managerPosition || "Manager"}`, projectItem.managerIds); checkboxList(byId("team-leads"), people.filter((item) => item.roleType !== "executive"), "team-lead", (item) => `${item.fullName} · Team Leader for this project`, projectItem.teamLeadIds); byId("team-manager-wrap").classList.toggle("hidden", currentUser.roleType === "manager"); };
  }

  function populateTaskForm() {
    const select = byId("task-project"); const projects = visibleProjects().filter(canManage); select.innerHTML = '<option value="" disabled selected>Select project</option>'; projects.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = `${item.code} — ${item.name}`; select.appendChild(option); });
    select.onchange = () => { const projectItem = project(select.value); const people = membersForProject(projectItem); const lead = byId("task-lead"); lead.innerHTML = '<option value="" disabled selected>Select Team Leader</option>'; people.filter((item) => projectItem.teamLeadIds.includes(item.id)).forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = `${item.fullName} · ${item.department}`; lead.appendChild(option); }); checkboxList(byId("task-members"), people.filter((item) => item.roleType !== "executive"), "task-member", (item) => `${item.fullName} · ${item.department}`); };
  }

  // Rebuild the assignment pickers from the authenticated user's hierarchy.
  // These declarations intentionally replace the legacy broad pickers above.
  function renderProjectFormLists() {
    const allDepartments = window.TerraHireStore.getOrganizationDepartments(currentUser.orgId);
    const departments = currentUser.roleType === "executive" ? allDepartments.filter((item) => item.id === currentUser.departmentId) : allDepartments;
    checkboxList(byId("project-departments"), departments, "project-department", (item) => item.name);
    const refreshPeople = () => {
      const departmentIds = selected(".project-department");
      const people = data().members.filter((item) => item.orgId === currentUser.orgId && departmentIds.includes(item.departmentId) && inHierarchy(item));
      checkboxList(byId("project-members"), people, "project-member", (item) => `${item.fullName} - ${item.department}`);
      checkboxList(byId("project-managers"), people.filter((item) => item.roleType === "manager"), "project-manager", (item) => `${item.fullName} - ${item.managerPosition || "Manager"}`);
      checkboxList(byId("project-leads"), people.filter((item) => item.roleType === "team_leader"), "project-lead", (item) => `${item.fullName} - Team Leader`);
    };
    byId("project-departments").onchange = refreshPeople;
    refreshPeople();
  }

  function populateTeamProjectSelect() {
    const select = byId("team-project");
    const projects = visibleProjects().filter(canManage);
    select.innerHTML = '<option value="" disabled selected>Select project</option>';
    projects.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = `${item.code} - ${item.name}`; select.appendChild(option); });
    select.onchange = () => {
      const projectItem = project(select.value);
      const people = data().members.filter((item) => item.orgId === currentUser.orgId && projectItem.departmentIds.includes(item.departmentId) && inHierarchy(item));
      checkboxList(byId("team-members"), people, "team-member", (item) => `${item.fullName} - ${item.department}`, projectItem.memberIds);
      checkboxList(byId("team-managers"), people.filter((item) => item.roleType === "manager"), "team-manager", (item) => `${item.fullName} - ${item.managerPosition || "Manager"}`, projectItem.managerIds);
      checkboxList(byId("team-leads"), people.filter((item) => item.roleType === "team_leader"), "team-lead", (item) => `${item.fullName} - Team Leader`, projectItem.teamLeadIds);
      byId("team-manager-wrap").classList.toggle("hidden", currentUser.roleType === "manager");
    };
  }

  function populateTaskForm() {
    const select = byId("task-project");
    const projects = visibleProjects().filter(canManage);
    select.innerHTML = '<option value="" disabled selected>Select project</option>';
    projects.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = `${item.code} - ${item.name}`; select.appendChild(option); });
    select.onchange = () => {
      const projectItem = project(select.value);
      const people = membersForProject(projectItem);
      const lead = byId("task-lead");
      lead.innerHTML = '<option value="" disabled selected>Select Team Leader</option>';
      people.filter((item) => projectItem.teamLeadIds.includes(item.id) && item.roleType === "team_leader" && (currentUser.roleType !== "manager" || item.managerId === currentUser.id)).forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = `${item.fullName} - ${item.department}`; lead.appendChild(option); });
      checkboxList(byId("task-members"), people.filter((item) => item.roleType !== "executive" && (currentUser.roleType !== "manager" || item.managerId === currentUser.id)), "task-member", (item) => `${item.fullName} - ${item.department}`);
    };
  }

  function showTask(taskId) {
    selectedTaskId = taskId; const task = data().tasks.find((item) => item.id === taskId); const projectItem = project(task.projectId); const canManageTask = canManage(projectItem); const isAssigned = task.employeeIds.includes(currentUser.id) || task.teamLeadIds.includes(currentUser.id);
    byId("task-detail-content").innerHTML = `<span class="badge badge-teal">${projectItem.code}</span><h3 style="font-size:21px;margin:8px 0">${task.title}</h3><p style="color:var(--mist);font-size:13px;line-height:1.5">${task.desc || "No description provided."}</p><div style="padding:12px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;line-height:1.7">Departments: <strong>${departmentsFor(projectItem).map((item) => item.name).join(", ")}</strong><br>Managers: <strong>${nameList(task.managerIds)}</strong><br>Team Leaders: <strong>${nameList(task.teamLeadIds)}</strong><br>Assigned Members: <strong>${nameList(task.employeeIds)}</strong><br>Deadline: <strong>${task.dueDate || "—"}</strong><br>Review: <strong>${task.reviewStatus}</strong></div><div style="margin-top:16px"><strong style="font-size:13px">Assignment history</strong><div style="font-size:12px;color:var(--mist);margin-top:7px">${task.assignmentHistory.length ? task.assignmentHistory.map((entry) => `<div style="padding:5px 0;border-bottom:1px solid var(--line)"><strong style="color:var(--white)">${entry.action}</strong> — ${entry.actorName} ${entry.details ? `· ${entry.details}` : ""}</div>`).join("") : "No assignment activity yet."}</div></div>`;
    const assignmentNote = document.createElement("div");
    assignmentNote.style.cssText = "margin-top:12px;padding:10px;border:1px solid var(--line);border-radius:8px;font-size:12px;color:var(--mist);";
    assignmentNote.innerHTML = `Project assigned by: <strong style="color:var(--teal-300)">${projectItem.assignedByName || projectItem.createdByName || "Administrator"}</strong><br>Task assigned by: <strong style="color:var(--teal-300)">${task.assignedByName || "Unknown"}</strong>`;
    byId("task-detail-content").appendChild(assignmentNote);
    byId("btn-progress").classList.toggle("hidden", !isAssigned || task.completed); byId("btn-approve").classList.toggle("hidden", !canManageTask || task.completed); open("modal-detail");
  }

  byId("btn-progress").onclick = () => { const task = data().tasks.find((item) => item.id === selectedTaskId); const raw = window.prompt("Enter progress from 0 to 100", String(task.progress || 0)); if (raw === null) return; const progress = Math.max(0, Math.min(100, Number(raw))); if (!Number.isFinite(progress)) { message("Enter a valid progress percentage.", true); return; } try { window.TerraHireStore.updateTask(task.id, { progress, status: progress === 100 ? "Pending Review" : "In Progress" }); close("modal-detail"); refresh(); message("Task progress updated."); } catch (exception) { message(exception.message, true); } };
  byId("btn-approve").onclick = () => { try { window.TerraHireStore.updateTask(selectedTaskId, { status: "Completed" }); close("modal-detail"); refresh(); message("Task approved and marked complete."); } catch (exception) { message(exception.message, true); } };

  byId("btn-create-project").onclick = () => { renderProjectFormLists(); open("modal-project"); };
  byId("btn-assign-project-team").onclick = () => { populateTeamProjectSelect(); open("modal-team"); };
  byId("btn-create-task").onclick = () => { populateTaskForm(); open("modal-task"); };
  byId("form-project").onsubmit = (event) => { event.preventDefault(); try { const memberIds = unique([...selected(".project-member"), ...selected(".project-manager"), ...selected(".project-lead")]); window.TerraHireStore.createProject({ name: byId("project-name").value, code: byId("project-code").value, desc: byId("project-description").value, startDate: byId("project-start").value, endDate: byId("project-end").value, departmentIds: selected(".project-department"), memberIds, managerIds: selected(".project-manager"), teamLeadIds: selected(".project-lead") }); close("modal-project"); event.target.reset(); refresh(); message("Cross-department project created."); } catch (exception) { message(exception.message, true); } };
  byId("form-team").onsubmit = (event) => { event.preventDefault(); try { const projectItem = project(byId("team-project").value); const memberIds = unique([...selected(".team-member"), ...selected(".team-manager"), ...selected(".team-lead")]); window.TerraHireStore.assignMembersToProject(projectItem.id, { memberIds, managerIds: currentUser.roleType === "manager" ? projectItem.managerIds : selected(".team-manager"), teamLeadIds: selected(".team-lead") }); close("modal-team"); refresh(); message("Project team assignment saved."); } catch (exception) { message(exception.message, true); } };
  byId("form-task").onsubmit = (event) => { event.preventDefault(); try { window.TerraHireStore.addTask({ projectId: byId("task-project").value, title: byId("task-title").value, desc: byId("task-description").value, priority: byId("task-priority").value, category: byId("task-category").value, dueDate: byId("task-due").value, teamLeadId: byId("task-lead").value, employeeIds: selected(".task-member") }); close("modal-task"); event.target.reset(); refresh(); message("Deliverable assigned."); } catch (exception) { message(exception.message, true); } };
  ["filter-project", "filter-department", "filter-manager", "filter-lead", "filter-member", "filter-status"].forEach((id) => byId(id).onchange = renderTasks); byId("task-search").oninput = renderTasks;
  function refresh() { populateFilters(); renderProjectCards(); renderTasks(); }
  if (isOwner) byId("btn-create-project").classList.remove("hidden"); if (visibleProjects().some(canManage)) { byId("btn-assign-project-team").classList.remove("hidden"); byId("btn-create-task").classList.remove("hidden"); }
  refresh();
});
