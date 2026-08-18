/**
 * HUMN / TerraHire — Hierarchical Admin Directory
 * 4-Tier Drill-Down:
 * Level 1: Directory Home (Summary KPIs + Department Grid + Filtered Search)
 * Level 2: Department Detail (Dept Summary + Department Projects List)
 * Level 3: Project Detail (Project Summary + Project Team Members + Task Breakdown)
 * Level 4: Employee / Manager Detail (Basic Profile + Attendance Summary + Work / Task Summary + Project Contribution)
 */


"use strict";
document.addEventListener("DOMContentLoaded", () => {
  
    const currentUser =
        window.TerraHireStore.getCurrentUser();

    if (!currentUser) {
        window.location.replace("./login.html");
        return;
    }

    const allStore = window.TerraHireStore.getStore();
    const store = {
      ...allStore,
      members: (allStore.members || []).filter((member) => member.orgId === currentUser.orgId),
      projects: (allStore.projects || []).filter((project) => project.orgId === currentUser.orgId)
    };

    if (!store) {
        return;
    }


  const directoryNav = document.getElementById("nav-directory");
  const addMemberNav = document.getElementById("nav-add-member");

  if (currentUser.roleType !== "admin") addMemberNav?.remove();


  // Populate Sidebar active user
  const sbAvatar = document.getElementById("sidebar-user-avatar");
  const sbName = document.getElementById("sidebar-user-name");
  const sbRole = document.getElementById("sidebar-user-role");
  if (sbAvatar) sbAvatar.textContent = currentUser.fullName.charAt(0);
  if (sbName) sbName.textContent = currentUser.fullName;
  if (sbRole) sbRole.textContent = currentUser.designation || "Member";

  // Switch Member Selector
  const memberSelect = document.getElementById("select-switch-member");
  if (memberSelect) {
    memberSelect.value = currentUser.id;
    memberSelect.onchange = (e) => {
      const s = window.TerraHireStore.getStore();
      const target = s.members.find((m) => m.id === e.target.value);
      if (target) {
        window.TerraHireStore.setCurrentUser(target);
        window.location.reload();
      }
    };
  }

  // Logout button
  const logoutBtn = document.getElementById("btn-emp-logout");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      window.TerraHireStore.setCurrentUser(null);
      window.location.href = "./login.html";
    };
  }

  // Admin Switch
  const btnAdmin = document.getElementById("btn-quick-admin-switch");
  if (btnAdmin) {
    btnAdmin.onclick = () => {
      window.location.href = "./admin.html";
    };
  }

  // Navigation State
  let state = {
    level: "home", // 'home' | 'department' | 'project' | 'employee'
    selectedDeptId: null,
    selectedProjectId: null,
    selectedMemberId: null,
    viewMode: "departments", // 'departments' | 'projects' | 'members'
    activeCardFilter: null,
    projectStatusFilter: "ALL", // 'ALL' | 'Completed' | 'In Progress'
    searchQuery: "",
    filterDept: "ALL",
    filterProj: "ALL",
    filterRole: "ALL",
    filterStatus: "ALL",
  };

  // DOM Panels
  const viewHome = document.getElementById("view-level-home");
  const viewDept = document.getElementById("view-level-dept");
  const viewProject = document.getElementById("view-level-project");
  const viewEmployee = document.getElementById("view-level-employee");
  const breadcrumbEl = document.getElementById("dir-breadcrumb");
  const btnBackLevel = document.getElementById("btn-back-level");
  const countBadge = document.getElementById("dir-total-count");

  // Filter DOMs
  const searchInput = document.getElementById("dir-search-input");
  const deptFilter = document.getElementById("dir-filter-dept");
  const projFilter = document.getElementById("dir-filter-proj");
  const roleFilter = document.getElementById("dir-filter-role");
  const statusFilter = document.getElementById("dir-filter-status");
  const btnReset = document.getElementById("btn-reset-filters");
  const btnModeHierarchy = document.getElementById("btn-mode-hierarchy");
  const btnModeProjects = document.getElementById("btn-mode-projects");
  const btnModeFlat = document.getElementById("btn-mode-flat");
  const dirHierarchyContainer = document.getElementById("dir-hierarchy-container");
  const dirProjectsContainer = document.getElementById("dir-projects-container");
  const dirFlatContainer = document.getElementById("dir-flat-container");

  // Read URL Params on initial load
  const urlParams = new URLSearchParams(window.location.search);
  const paramLevel = urlParams.get("view");
  const paramDept = urlParams.get("dept");
  const paramProj = urlParams.get("proj");
  const paramMem = urlParams.get("member");

  if (paramLevel === "employee" && paramMem) {
    state.level = "employee";
    state.selectedMemberId = paramMem;
    state.selectedDeptId = paramDept;
    state.selectedProjectId = paramProj;
  } else if (paramLevel === "project" && paramProj) {
    state.level = "project";
    state.selectedProjectId = paramProj;
    state.selectedDeptId = paramDept;
  } else if (paramLevel === "department" && paramDept) {
    state.level = "department";
    state.selectedDeptId = paramDept;
  }

  // Router / Level Switcher
  function navigateTo(level, payload = {}) {
    state.level = level;
    if (payload.deptId !== undefined) state.selectedDeptId = payload.deptId;
    if (payload.projectId !== undefined) state.selectedProjectId = payload.projectId;
    if (payload.memberId !== undefined) state.selectedMemberId = payload.memberId;

    // Update URL without full reload
    const params = new URLSearchParams();
    if (state.level !== "home") params.set("view", state.level);
    if (state.selectedDeptId) params.set("dept", state.selectedDeptId);
    if (state.selectedProjectId) params.set("proj", state.selectedProjectId);
    if (state.selectedMemberId) params.set("member", state.selectedMemberId);

    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.pushState({}, "", newUrl);

    renderCurrentView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Handle browser back/forward
  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    state.level = params.get("view") || "home";
    state.selectedDeptId = params.get("dept") || null;
    state.selectedProjectId = params.get("proj") || null;
    state.selectedMemberId = params.get("member") || null;
    renderCurrentView();
  });

  // Master Render Router
  function renderCurrentView() {
    // Hide all views
    [viewHome, viewDept, viewProject, viewEmployee].forEach((el) => {
      if (el) el.style.display = "none";
    });

    renderBreadcrumbs();

    if (state.level === "home") {
      if (viewHome) viewHome.style.display = "block";
      if (btnBackLevel) btnBackLevel.style.display = "none";
      renderHomeLevel();
    } else if (state.level === "department") {
      if (viewDept) viewDept.style.display = "block";
      if (btnBackLevel) {
        btnBackLevel.style.display = "inline-flex";
        btnBackLevel.onclick = () => navigateTo("home");
      }
      renderDepartmentLevel(state.selectedDeptId);
    } else if (state.level === "project") {
      if (viewProject) viewProject.style.display = "block";
      if (btnBackLevel) {
        btnBackLevel.style.display = "inline-flex";
        btnBackLevel.onclick = () => {
          if (state.selectedDeptId) navigateTo("department", { deptId: state.selectedDeptId });
          else navigateTo("home");
        };
      }
      renderProjectLevel(state.selectedProjectId);
    } else if (state.level === "employee") {
      if (viewEmployee) viewEmployee.style.display = "block";
      if (btnBackLevel) {
        btnBackLevel.style.display = "inline-flex";
        btnBackLevel.onclick = () => {
          if (state.selectedProjectId) navigateTo("project", { deptId: state.selectedDeptId, projectId: state.selectedProjectId });
          else if (state.selectedDeptId) navigateTo("department", { deptId: state.selectedDeptId });
          else navigateTo("home");
        };
      }
      renderEmployeeLevel(state.selectedMemberId);
    }
  }

  // Breadcrumbs Component
  function renderBreadcrumbs() {
    if (!breadcrumbEl) return;
    const s = window.TerraHireStore.getStore();

    let crumbs = [
      { label: "📁 Directory Home", level: "home", payload: {} },
    ];

    if (state.level === "department" || state.level === "project" || state.level === "employee") {
      const dept = (s.departments || []).find((d) => d.id === state.selectedDeptId || d.name === state.selectedDeptId);
      if (dept) {
        crumbs.push({ label: `🏢 ${dept.name}`, level: "department", payload: { deptId: dept.id } });
      }
    }

    if (state.level === "project" || (state.level === "employee" && state.selectedProjectId)) {
      const proj = (s.projects || []).find((p) => p.id === state.selectedProjectId || p.code === state.selectedProjectId);
      if (proj) {
        crumbs.push({ label: `🚀 ${proj.name} (${proj.code})`, level: "project", payload: { deptId: state.selectedDeptId, projectId: proj.id } });
      }
    }

    if (state.level === "employee") {
      const mem = (s.members || []).find((m) => m.id === state.selectedMemberId);
      if (mem) {
        crumbs.push({ label: `👤 ${mem.fullName}`, level: "employee", payload: { memberId: mem.id }, active: true });
      }
    }

    breadcrumbEl.innerHTML = crumbs
      .map((c, idx) => {
        const isLast = idx === crumbs.length - 1;
        if (isLast) {
          return `<li style="color:var(--teal-300); font-weight:600; display:flex; align-items:center; gap:8px;">
            ${idx > 0 ? '<span style="color:var(--mist-dim); font-size:12px;">›</span>' : ""}
            <span>${c.label}</span>
          </li>`;
        }
        return `<li style="display:flex; align-items:center; gap:8px;">
          ${idx > 0 ? '<span style="color:var(--mist-dim); font-size:12px;">›</span>' : ""}
          <button type="button" class="btn-breadcrumb" data-level="${c.level}" data-dept="${c.payload.deptId || ""}" data-proj="${c.payload.projectId || ""}" data-mem="${c.payload.memberId || ""}" style="background:none; border:none; color:var(--mist); cursor:pointer; font-size:13.5px; padding:0; text-decoration:underline; text-underline-offset:3px;">
            ${c.label}
          </button>
        </li>`;
      })
      .join("");

    breadcrumbEl.querySelectorAll(".btn-breadcrumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lvl = btn.getAttribute("data-level");
        const deptId = btn.getAttribute("data-dept") || null;
        const projectId = btn.getAttribute("data-proj") || null;
        const memberId = btn.getAttribute("data-mem") || null;
        navigateTo(lvl, { deptId, projectId, memberId });
      });
    });
  }

  // =========================================================================
  // LEVEL 1: DIRECTORY HOME
  // =========================================================================
  function renderHomeLevel() {
    const summary = window.TerraHireStore.getSummaryStats();
    const s = window.TerraHireStore.getStore();

    // Summary Card Stats
    const elDepts = document.getElementById("stat-total-depts");
    const elProjs = document.getElementById("stat-total-projects");
    const elDoneProjs = document.getElementById("stat-completed-projects");
    const elPendingProjs = document.getElementById("stat-pending-projects");
    const elEmployees = document.getElementById("stat-total-employees");
    const elWorking = document.getElementById("stat-working-today");
    const elNotWorking = document.getElementById("stat-not-working-today");

    if (elDepts) elDepts.textContent = summary.totalDepartments;
    if (elProjs) elProjs.textContent = summary.totalProjects;
    if (elDoneProjs) elDoneProjs.textContent = summary.totalProjectsCompleted;
    if (elPendingProjs) elPendingProjs.textContent = summary.totalProjectsPending;
    if (elEmployees) elEmployees.textContent = summary.totalEmployees;
    if (elWorking) elWorking.textContent = summary.totalWorkingToday;
    if (elNotWorking) elNotWorking.textContent = summary.totalNotWorkingToday;

    if (countBadge) countBadge.textContent = `${summary.totalDepartments} Departments • ${summary.totalProjects} Projects • ${summary.totalEmployees} Members`;

    // Render Department Grid (Hierarchy View)
    const deptGrid = document.getElementById("dir-departments-container");
    if (deptGrid) {
      deptGrid.innerHTML = "";
      (s.departments || []).forEach((dept) => {
        const detail = window.TerraHireStore.getDepartmentDetail(dept.id);
        const card = document.createElement("div");
        card.className = "card-workday-detailed";
        card.style.cursor = "pointer";
        card.style.transition = "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.justifyContent = "space-between";

        card.innerHTML = `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:44px; height:44px; border-radius:10px; background:rgba(45,212,191,0.12); border:1px solid rgba(45,212,191,0.3); display:flex; align-items:center; justify-content:center; font-size:22px;">
                  🏢
                </div>
                <div>
                  <h3 style="font-size:16px; font-weight:700; color:var(--white);">${dept.name}</h3>
                  <div style="font-size:12px; color:var(--teal-300);">${detail.totalProjects} Active Project${detail.totalProjects === 1 ? "" : "s"}</div>
                </div>
              </div>
              <span class="badge badge-teal" style="font-size:11px;">${detail.totalEmployees} Members</span>
            </div>

            <p style="font-size:12.5px; color:var(--mist); margin-bottom:14px; line-height:1.5;">${dept.desc || "Strategic business unit managing multi-region team execution."}</p>

            <div style="padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:8px; font-size:12px; display:flex; flex-direction:column; gap:4px; margin-bottom:14px;">
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--mist-dim);">Department Head:</span>
                <span style="color:var(--white); font-weight:600;">${dept.head || "Executive Lead"}</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--mist-dim);">Head Contact:</span>
                <span style="color:var(--teal-300); font-family:var(--font-mono); font-size:11.5px;">${dept.headEmail || "dept.head@terrahire.io"}</span>
              </div>
            </div>

            <!-- Department Progress Bar -->
            <div style="margin-bottom:6px;">
              <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">
                <span style="color:var(--mist-dim);">Department Deliverables:</span>
                <span style="color:var(--teal-300); font-weight:600;">${detail.completionRate}% Done</span>
              </div>
              <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:99px; overflow:hidden;">
                <div style="width:${detail.completionRate}%; height:100%; background:linear-gradient(90deg, var(--teal-500), #ccff00); border-radius:99px;"></div>
              </div>
            </div>
          </div>

          <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; color:var(--mist-dim);">${detail.completedTasks}/${detail.totalTasks} Tasks Closed</span>
            <span style="font-size:12.5px; color:var(--teal-300); font-weight:600; display:flex; align-items:center; gap:4px;">
              View Department Projects →
            </span>
          </div>
        `;

        card.addEventListener("mouseenter", () => {
          card.style.transform = "translateY(-2px)";
          card.style.borderColor = "var(--teal-400)";
          card.style.boxShadow = "0 8px 24px rgba(45,212,191,0.12)";
        });
        card.addEventListener("mouseleave", () => {
          card.style.transform = "none";
          card.style.borderColor = "var(--line)";
          card.style.boxShadow = "none";
        });

        card.addEventListener("click", () => {
          navigateTo("department", { deptId: dept.id });
        });

        deptGrid.appendChild(card);
      });
    }

    // Render Projects Grid
    renderProjectsGrid();

    // Render Filtered Flat Members
    renderFlatMembers();
  }

  // Render Projects Overview Grid (Level 1 Projects Tab)
  function renderProjectsGrid() {
    const s = window.TerraHireStore.getStore();
    const container = document.getElementById("dir-all-projects-grid");
    const filterBadge = document.getElementById("dir-projects-filter-badge");
    const filterText = document.getElementById("dir-projects-filter-text");
    if (!container) return;

    const query = state.searchQuery.trim().toLowerCase();
    const selectedDept = state.filterDept;
    const selectedProj = state.filterProj;
    const statusFilter = state.projectStatusFilter; // 'ALL' | 'Completed' | 'In Progress'

    if (filterBadge && filterText) {
      if (statusFilter !== "ALL") {
        filterBadge.style.display = "inline-flex";
        filterText.textContent = `Showing: ${statusFilter} Projects`;
      } else {
        filterBadge.style.display = "none";
      }
    }

    const allProjects = (s.projects || []).map((p) => window.TerraHireStore.getProjectDetail(p.id));

    const filtered = allProjects.filter((pDetail) => {
      if (!pDetail || !pDetail.project) return false;
      const p = pDetail.project;
      const matchQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        p.department.toLowerCase().includes(query) ||
        (p.pmName && p.pmName.toLowerCase().includes(query)) ||
        (p.desc && p.desc.toLowerCase().includes(query));

      const matchDept = selectedDept === "ALL" || p.department === selectedDept;
      const matchProj = selectedProj === "ALL" || p.code === selectedProj || p.id === selectedProj;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "Completed" ? p.status === "Completed" : p.status !== "Completed");

      return matchQuery && matchDept && matchProj && matchStatus;
    });

    container.innerHTML = "";

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background: var(--navy-900); border: 1px dashed var(--line); border-radius: 12px; color: var(--mist);">
          No projects match your current search and filter criteria.
        </div>
      `;
      return;
    }

    filtered.forEach((pDetail) => {
      const proj = pDetail.project;
      const org = pDetail.organization || { name: "Acme Corp" };
      const card = document.createElement("div");
      card.className = "card-workday-detailed";
      card.style.cursor = "pointer";
      card.style.transition = "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.justifyContent = "space-between";

      const isCompleted = proj.status === "Completed";
      const statusBadgeClass = isCompleted ? "badge-success" : proj.status === "Active" ? "badge-teal" : "badge-warn";

      card.innerHTML = `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span class="badge ${isCompleted ? 'badge-success' : 'badge-teal'}" style="font-size:11px; font-weight:700;">${proj.code}</span>
                <span style="font-size:11.5px; color:var(--mist-dim);">${org.name || "Acme Corp"}</span>
              </div>
              <h3 style="font-size:16px; font-weight:700; color:var(--white);">${proj.name}</h3>
            </div>
            <span class="badge ${statusBadgeClass}" style="font-size:11px;">
              ${proj.status || "Active"}
            </span>
          </div>

          <p style="font-size:12.5px; color:var(--mist); margin-bottom:14px; line-height:1.5;">${proj.desc || "Strategic project deliverable."}</p>

          <div style="padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:8px; font-size:12px; display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--mist-dim);">Department:</span>
              <span style="color:var(--white); font-weight:600;">${proj.department}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--mist-dim);">Project Manager:</span>
              <span style="color:var(--teal-300); font-weight:600;">${proj.pmName || "Kavita Rao"}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--mist-dim);">Assigned Team:</span>
              <span style="color:var(--white); font-weight:600;">${pDetail.team.length} Members</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--mist-dim);">Timeline:</span>
              <span style="color:var(--mist); font-family:var(--font-mono); font-size:11px;">${proj.startDate} → ${proj.endDate}</span>
            </div>
          </div>

          <!-- Project Progress Bar -->
          <div style="margin-bottom:6px;">
            <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">
              <span style="color:var(--mist-dim);">Milestone Progress:</span>
              <span style="color:${isCompleted ? 'var(--success)' : 'var(--teal-300)'}; font-weight:600;">${pDetail.completionRate}%</span>
            </div>
            <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:99px; overflow:hidden;">
              <div style="width:${pDetail.completionRate}%; height:100%; background:${isCompleted ? 'var(--success)' : 'linear-gradient(90deg, var(--teal-500), #ccff00)'}; border-radius:99px;"></div>
            </div>
          </div>
        </div>

        <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12px; color:var(--mist-dim);">${pDetail.completedTasks}/${pDetail.totalTasks} Tasks Done</span>
          <span style="font-size:12.5px; color:var(--teal-300); font-weight:600; display:flex; align-items:center; gap:4px;">
            View Project Details →
          </span>
        </div>
      `;

      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-2px)";
        card.style.borderColor = "var(--teal-400)";
        card.style.boxShadow = "0 8px 24px rgba(45,212,191,0.12)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "none";
        card.style.borderColor = "var(--line)";
        card.style.boxShadow = "none";
      });

      card.addEventListener("click", () => {
        navigateTo("project", { projectId: proj.id, deptId: pDetail.department.id });
      });

      container.appendChild(card);
    });
  }

  function renderFlatMembers() {
    const s = window.TerraHireStore.getStore();
    const container = document.getElementById("dir-cards-container");
    const filterBadge = document.getElementById("dir-members-filter-badge");
    const filterText = document.getElementById("dir-members-filter-text");
    if (!container) return;

    const query = state.searchQuery.trim().toLowerCase();
    const selectedDept = state.filterDept;
    const selectedProj = state.filterProj;
    const selectedRole = state.filterRole;
    const selectedStatus = state.filterStatus;

    if (filterBadge && filterText) {
      if (selectedStatus === "WORKING") {
        filterBadge.style.display = "inline-flex";
        filterText.textContent = "Showing: 🟢 Working Today (Checked In)";
      } else if (selectedStatus === "OFFLINE") {
        filterBadge.style.display = "inline-flex";
        filterText.textContent = "Showing: ⭕ Non-Working Today (Offline / On Leave)";
      } else {
        filterBadge.style.display = "none";
      }
    }

    const filtered = (s.members || []).filter((m) => {
      const matchQuery =
        !query ||
        m.fullName.toLowerCase().includes(query) ||
        (m.email && m.email.toLowerCase().includes(query)) ||
        (m.designation && m.designation.toLowerCase().includes(query)) ||
        (m.projectCode && m.projectCode.toLowerCase().includes(query)) ||
        (m.department && m.department.toLowerCase().includes(query));

      const matchDept = selectedDept === "ALL" || m.department === selectedDept;
      const matchProj = selectedProj === "ALL" || m.projectCode === selectedProj || m.projectId === selectedProj;
      const matchRole = selectedRole === "ALL" || m.roleCategory === selectedRole || (selectedRole === "Admin" && m.roleType === "admin");
      const matchStatus = selectedStatus === "ALL" || (selectedStatus === "WORKING" ? m.isCheckedIn : !m.isCheckedIn);

      return matchQuery && matchDept && matchProj && matchRole && matchStatus;
    });

    container.innerHTML = "";

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background: var(--navy-900); border: 1px dashed var(--line); border-radius: 12px; color: var(--mist);">
          No directory members match your search & filter criteria.
        </div>
      `;
      return;
    }

    filtered.forEach((mem) => {
      const org = (s.organizations || []).find((o) => o.id === mem.orgId) || { name: "Acme Corp", code: "ACME" };
      const proj = (s.projects || []).find((p) => p.id === mem.projectId || p.code === mem.projectCode) || { name: "Billing Revamp", code: mem.projectCode || "BILL-01" };
      const memDetail = window.TerraHireStore.getMemberDetail(mem.id);

      const card = document.createElement("div");
      card.className = "card-workday-detailed";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.justifyContent = "space-between";
      card.style.cursor = "pointer";
      card.style.transition = "transform 0.2s ease, border-color 0.2s ease";

      card.innerHTML = `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
            <div style="display:flex; gap:12px; align-items:center;">
              <div style="position:relative;">
                <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, var(--teal-500), var(--navy-800)); color:var(--white); font-weight:700; font-size:18px; display:flex; align-items:center; justify-content:center; border:2px solid rgba(255,255,255,0.1);">
                  ${mem.fullName.charAt(0)}
                </div>
                <span style="position:absolute; bottom:0; right:0; width:12px; height:12px; border-radius:50%; border:2px solid var(--navy-900); background:${mem.isCheckedIn ? "#ccff00" : "var(--mist-dim)"};"></span>
              </div>

              <div>
                <h3 style="font-size:16px; font-weight:700; color:var(--white);">${mem.fullName}</h3>
                <div style="font-size:12.5px; color:var(--teal-300);">${mem.designation || "Team Member"}</div>
              </div>
            </div>

            <span class="badge ${mem.roleCategory === "Admin" ? "badge-admin" : mem.roleCategory === "Team Leader" ? "badge-teamlead" : "badge-emp"}" style="font-size:11px;">
              ${mem.roleCategory || "Employee"}
            </span>
          </div>

          <div style="padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:8px; font-size:12px; display:flex; flex-direction:column; gap:4px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--mist-dim);">Department:</span>
              <span style="color:var(--white); font-weight:600;">${mem.department || "Core Engineering"}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--mist-dim);">Project:</span>
              <span style="color:var(--teal-300); font-weight:600;">${proj.code} · ${proj.name}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--mist-dim);">Live Status:</span>
              <span style="color:${mem.isCheckedIn ? "#ccff00" : "var(--mist)"}; font-weight:600;">
                ${mem.isCheckedIn ? `● Working (In: ${mem.lastCheckIn || "09:00 AM"})` : "○ Offline"}
              </span>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; font-size:11.5px; color:var(--mist); margin-bottom:12px; padding:0 4px;">
            <span>Tasks: <strong>${memDetail.completedTasks}/${memDetail.totalTasks} Done</strong></span>
            <span>Present Rate: <strong style="color:var(--white);">${Math.round((mem.daysPresent / mem.workingDaysInMonth) * 100)}%</strong></span>
          </div>
        </div>

        <div style="border-top:1px solid var(--line); padding-top:12px; display:flex; gap:8px;">
          <button type="button" class="btn btn-ghost btn-sm btn-open-profile" style="flex:1; justify-content:center; font-size:12px;">
            👤 View Profile & Work
          </button>
        </div>
      `;

      card.addEventListener("click", () => {
        navigateTo("employee", { deptId: mem.department, projectId: mem.projectId, memberId: mem.id });
      });

      container.appendChild(card);
    });
  }

  // =========================================================================
  // LEVEL 2: DEPARTMENT DETAIL PAGE
  // =========================================================================
  function renderDepartmentLevel(deptId) {
    if (!viewDept) return;
    const detail = window.TerraHireStore.getDepartmentDetail(deptId);
    if (!detail) {
      viewDept.innerHTML = `<div class="card-workday-detailed" style="padding:32px; text-align:center;">Department not found. <button class="btn btn-primary btn-sm" onclick="location.reload()">Back</button></div>`;
      return;
    }

    const { department, projects, members, totalProjects, totalEmployees, completionRate, totalTasks, completedTasks, pendingTasks } = detail;

    if (countBadge) countBadge.textContent = `${department.name} • ${totalProjects} Projects`;

    viewDept.innerHTML = `
      <!-- 2.1 Department Summary Banner -->
      <div class="card-workday-detailed" style="margin-bottom:24px; padding:24px; border-left:4px solid var(--teal-400);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
          <div style="flex:1; min-width:300px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:6px;">
              <span style="font-size:24px;">🏢</span>
              <h2 style="font-size:22px; font-weight:700; color:var(--white);">${department.name}</h2>
              <span class="badge badge-teal" style="font-size:11.5px;">Active Department</span>
            </div>
            <p style="font-size:14px; color:var(--mist); margin-bottom:16px; max-width:650px;">
              ${department.desc || "Overseeing core technical delivery, multi-region project milestones, and team resource allocation."}
            </p>

            <div style="display:flex; gap:20px; flex-wrap:wrap; font-size:13px;">
              <div style="padding:8px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:8px;">
                <span style="color:var(--mist-dim);">Department Head:</span>
                <strong style="color:var(--white); margin-left:6px;">${department.head}</strong>
                <span style="color:var(--teal-300); font-size:12px; margin-left:4px;">(${department.headEmail})</span>
              </div>
            </div>
          </div>

          <!-- Stat KPI Column -->
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <div class="card-stat" style="min-width:130px; padding:14px 18px;">
              <div class="card-stat-title">Projects</div>
              <div class="card-stat-value" style="font-size:22px;">${totalProjects}</div>
              <div class="card-stat-meta">In this department</div>
            </div>
            <div class="card-stat" style="min-width:130px; padding:14px 18px;">
              <div class="card-stat-title">Team Members</div>
              <div class="card-stat-value" style="font-size:22px;">${totalEmployees}</div>
              <div class="card-stat-meta">Engineers & Leads</div>
            </div>
            <div class="card-stat" style="min-width:140px; padding:14px 18px;">
              <div class="card-stat-title">Completion</div>
              <div class="card-stat-value" style="font-size:22px; color:#ccff00;">${completionRate}%</div>
              <div class="card-stat-meta">${completedTasks}/${totalTasks} tasks done</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2.2 Projects list in this department -->
      <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="font-size:18px; font-weight:700; color:var(--white);">Projects in ${department.name}</h3>
          <p style="font-size:13px; color:var(--mist);">Click any project card below to drill down to project manager, team leads, and deliverables.</p>
        </div>
        <span class="badge badge-teal" style="font-size:12px;">${projects.length} Total Projects</span>
      </div>

      <div class="dir-projects-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:20px;">
        ${projects.length === 0
        ? `<div style="grid-column:1/-1; padding:32px; text-align:center; background:var(--navy-900); border:1px dashed var(--line); border-radius:12px; color:var(--mist);">No projects assigned to this department yet.</div>`
        : projects
          .map((projDetail) => {
            const { project, organization, team, totalTasks: pTotal, completedTasks: pDone, pendingTasks: pPending, overdueTasks: pOverdue, completionRate: pRate } = projDetail;
            return `
            <div class="card-workday-detailed card-project-item" data-proj-id="${project.id}" style="cursor:pointer; display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.2s ease, border-color 0.2s ease;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                  <div>
                    <span class="badge badge-teal" style="font-size:11px; margin-bottom:6px; display:inline-block;">${project.code}</span>
                    <h4 style="font-size:17px; font-weight:700; color:var(--white);">${project.name}</h4>
                    <div style="font-size:12px; color:var(--mist-dim);">${organization.name} (${organization.code})</div>
                  </div>
                  <span class="badge ${project.status === "Completed" ? "badge-admin" : "badge-emp"}" style="font-size:11px;">
                    ${project.status}
                  </span>
                </div>

                <p style="font-size:12.5px; color:var(--mist); margin-bottom:14px; line-height:1.5;">${project.desc || "Enterprise project deliverable cluster."}</p>

                <div style="padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:8px; font-size:12px; display:flex; flex-direction:column; gap:4px; margin-bottom:14px;">
                  <div style="display:flex; justify-content:space-between;">
                    <span style="color:var(--mist-dim);">Project Manager:</span>
                    <span style="color:var(--white); font-weight:600;">${project.pmName || "Kavita Rao"}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between;">
                    <span style="color:var(--mist-dim);">Assigned Team:</span>
                    <span style="color:var(--teal-300); font-weight:600;">${team.length} Active Member${team.length === 1 ? "" : "s"}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between;">
                    <span style="color:var(--mist-dim);">Timeline:</span>
                    <span style="color:var(--mist); font-family:var(--font-mono); font-size:11px;">${project.startDate} → ${project.endDate || "2026-10-30"}</span>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div style="margin-bottom:12px;">
                  <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">
                    <span style="color:var(--mist-dim);">Progress:</span>
                    <span style="color:${pRate >= 100 ? "var(--success)" : "var(--teal-300)"}; font-weight:600;">${pRate}%</span>
                  </div>
                  <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:99px; overflow:hidden;">
                    <div style="width:${pRate}%; height:100%; background:linear-gradient(90deg, var(--teal-500), #ccff00); border-radius:99px;"></div>
                  </div>
                </div>

                <!-- Task Metrics Grid -->
                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; text-align:center; font-size:11px; padding:8px 0; background:rgba(0,0,0,0.15); border-radius:6px; margin-bottom:14px;">
                  <div>
                    <div style="color:var(--mist-dim);">Total</div>
                    <div style="color:var(--white); font-weight:700; font-size:13px;">${pTotal}</div>
                  </div>
                  <div>
                    <div style="color:var(--success);">Done</div>
                    <div style="color:var(--success); font-weight:700; font-size:13px;">${pDone}</div>
                  </div>
                  <div>
                    <div style="color:var(--teal-300);">Pending</div>
                    <div style="color:var(--teal-300); font-weight:700; font-size:13px;">${pPending}</div>
                  </div>
                  <div>
                    <div style="color:var(--err);">Overdue</div>
                    <div style="color:var(--err); font-weight:700; font-size:13px;">${pOverdue}</div>
                  </div>
                </div>
              </div>

              <div style="border-top:1px solid var(--line); padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12px; color:var(--mist-dim);">Explore Team & Tasks</span>
                <span style="font-size:12.5px; color:var(--teal-300); font-weight:600;">Open Project Detail →</span>
              </div>
            </div>
          `;
          })
          .join("")
      }
      </div>
    `;

    // Click handler for project cards
    viewDept.querySelectorAll(".card-project-item").forEach((card) => {
      card.addEventListener("click", () => {
        const projId = card.getAttribute("data-proj-id");
        navigateTo("project", { deptId: department.id, projectId: projId });
      });
    });
  }

  // =========================================================================
  // LEVEL 3: PROJECT DETAIL PAGE
  // =========================================================================
  function renderProjectLevel(projectId) {
    if (!viewProject) return;
    const projDetail = window.TerraHireStore.getProjectDetail(projectId);
    if (!projDetail) {
      viewProject.innerHTML = `<div class="card-workday-detailed" style="padding:32px; text-align:center;">Project not found. <button class="btn btn-primary btn-sm" onclick="location.reload()">Back</button></div>`;
      return;
    }

    const { project, organization, department, team, projectManager, tasks, totalTasks, completedTasks, pendingTasks, overdueTasks, completionRate, startDate, endDate, status } = projDetail;

    if (countBadge) countBadge.textContent = `${project.code} • ${team.length} Members`;

    viewProject.innerHTML = `
      <!-- 3.1 Project Summary Banner -->
      <div class="card-workday-detailed" style="margin-bottom:24px; padding:24px; border-left:4px solid var(--teal-400);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
          <div style="flex:1; min-width:320px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px; flex-wrap:wrap;">
              <span class="badge badge-teal" style="font-size:12px; padding:4px 10px;">${project.code}</span>
              <h2 style="font-size:22px; font-weight:700; color:var(--white);">${project.name}</h2>
              <span class="badge ${status === "Completed" ? "badge-admin" : "badge-emp"}" style="font-size:11px;">${status}</span>
            </div>

            <p style="font-size:13.5px; color:var(--mist); margin-bottom:16px; line-height:1.5;">${project.desc || "Cross-border distributed software deliverable and infrastructure suite."}</p>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; font-size:12.5px;">
              <div style="padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:8px;">
                <span style="color:var(--mist-dim);">Department:</span>
                <strong style="color:var(--white); margin-left:4px;">${department.name}</strong>
              </div>
              <div style="padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:8px;">
                <span style="color:var(--mist-dim);">Organization:</span>
                <strong style="color:var(--white); margin-left:4px;">${organization.name} (${organization.code})</strong>
              </div>
              <div style="padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:8px;">
                <span style="color:var(--mist-dim);">Project Manager:</span>
                <strong style="color:var(--teal-300); margin-left:4px;">${project.pmName || "Kavita Rao"}</strong>
              </div>
              <div style="padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:8px;">
                <span style="color:var(--mist-dim);">Timeline:</span>
                <span style="color:var(--white); font-family:var(--font-mono); margin-left:4px;">${startDate} → ${endDate}</span>
              </div>
            </div>
          </div>

          <!-- Project Stats Widget -->
          <div style="display:flex; flex-direction:column; gap:10px; min-width:200px;">
            <div class="card-stat" style="padding:16px;">
              <div class="card-stat-title">Project Completion</div>
              <div class="card-stat-value" style="color:#ccff00; font-size:24px;">${completionRate}%</div>
              <div class="card-stat-meta">${completedTasks} of ${totalTasks} tasks finished</div>
              <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:99px; margin-top:8px; overflow:hidden;">
                <div style="width:${completionRate}%; height:100%; background:linear-gradient(90deg, var(--teal-500), #ccff00); border-radius:99px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3.2 Team working on this project -->
      <div style="margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div>
            <h3 style="font-size:18px; font-weight:700; color:var(--white);">Team Working on ${project.code}</h3>
            <p style="font-size:13px; color:var(--mist);">Who is working on this project, live attendance status, and individual task contribution.</p>
          </div>
          <span class="badge badge-teal" style="font-size:12px;">${team.length} Members</span>
        </div>

        <div class="dir-team-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:18px;">
          ${team
        .map((mem) => {
          const isPm = mem.fullName.toLowerCase() === (project.pmName || "").toLowerCase() || mem.roleCategory === "Team Manager";
          return `
            <div class="card-workday-detailed card-team-member" data-mem-id="${mem.id}" style="cursor:pointer; display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.2s ease, border-color 0.2s ease; ${isPm ? "border-color:rgba(45,212,191,0.5); background:rgba(45,212,191,0.04);" : ""}">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                  <div style="display:flex; gap:12px; align-items:center;">
                    <div style="position:relative;">
                      <div style="width:46px; height:46px; border-radius:50%; background:linear-gradient(135deg, var(--teal-500), var(--navy-800)); color:var(--white); font-weight:700; font-size:17px; display:flex; align-items:center; justify-content:center;">
                        ${mem.fullName.charAt(0)}
                      </div>
                      <span style="position:absolute; bottom:0; right:0; width:12px; height:12px; border-radius:50%; border:2px solid var(--navy-900); background:${mem.isCheckedIn ? "#ccff00" : "var(--mist-dim)"};"></span>
                    </div>
                    <div>
                      <div style="display:flex; align-items:center; gap:6px;">
                        <h4 style="font-size:15.5px; font-weight:700; color:var(--white);">${mem.fullName}</h4>
                        ${isPm ? '<span style="font-size:10px; padding:2px 6px; border-radius:4px; background:#ccff00; color:#0b1120; font-weight:700;">PM</span>' : ""}
                      </div>
                      <div style="font-size:12px; color:var(--teal-300);">${mem.designation || "Team Member"}</div>
                    </div>
                  </div>

                  <span class="badge ${mem.roleCategory === "Admin" ? "badge-admin" : mem.roleCategory === "Team Leader" ? "badge-teamlead" : "badge-emp"}" style="font-size:11px;">
                    ${mem.roleCategory || "Employee"}
                  </span>
                </div>

                <div style="padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:8px; font-size:12px; display:flex; flex-direction:column; gap:4px; margin-bottom:12px;">
                  <div style="display:flex; justify-content:space-between;">
                    <span style="color:var(--mist-dim);">Email:</span>
                    <span style="color:var(--white); font-family:var(--font-mono); font-size:11px;">${mem.email}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between;">
                    <span style="color:var(--mist-dim);">Work Status:</span>
                    <span style="color:${mem.isCheckedIn ? "#ccff00" : "var(--mist)"}; font-weight:600;">
                      ${mem.isCheckedIn ? `● Working (In: ${mem.lastCheckIn || "08:30 AM"})` : "○ Offline / Not Working"}
                    </span>
                  </div>
                </div>

                <!-- Assigned tasks count in this project -->
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; text-align:center; font-size:11px; padding:8px 0; background:rgba(0,0,0,0.15); border-radius:6px; margin-bottom:12px;">
                  <div>
                    <div style="color:var(--mist-dim);">Assigned</div>
                    <div style="color:var(--white); font-weight:700; font-size:13px;">${mem.assignedTasksCount}</div>
                  </div>
                  <div>
                    <div style="color:var(--success);">Completed</div>
                    <div style="color:var(--success); font-weight:700; font-size:13px;">${mem.completedTasksCount}</div>
                  </div>
                  <div>
                    <div style="color:var(--teal-300);">Pending</div>
                    <div style="color:var(--teal-300); font-weight:700; font-size:13px;">${mem.pendingTasksCount}</div>
                  </div>
                </div>
              </div>

              <div style="border-top:1px solid var(--line); padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12px; color:var(--mist-dim);">📍 ${mem.location || "Global Remote"}</span>
                <span style="font-size:12px; color:var(--teal-300); font-weight:600;">Open Profile →</span>
              </div>
            </div>
          `;
        })
        .join("")}
        </div>
      </div>

      <!-- 3.3 Project task summary & Deliverables List -->
      <div class="card-workday-detailed" style="padding:22px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
          <div>
            <h3 style="font-size:17px; font-weight:700; color:var(--white);">Project Tasks & Deliverables</h3>
            <p style="font-size:12.5px; color:var(--mist);">Interactive roadmap deliverables assigned across this project team.</p>
          </div>

          <div style="display:flex; gap:12px; align-items:center; font-size:12px;">
            <span style="color:var(--success); font-weight:600;">✓ ${completedTasks} Done</span>
            <span style="color:var(--teal-300); font-weight:600;">⏳ ${pendingTasks} In Progress</span>
            <span style="color:var(--err); font-weight:600;">⚠️ ${overdueTasks} Overdue</span>
          </div>
        </div>

        <div class="task-list" style="display:flex; flex-direction:column; gap:10px;">
          ${tasks.length === 0
        ? `<div style="padding:20px; text-align:center; color:var(--mist); font-size:13px;">No tasks logged for this project yet.</div>`
        : tasks
          .map((t) => {
            const assignee = team.find((m) => m.id === t.memberId) || { fullName: "Team Member" };
            return `
              <div class="task-row" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:rgba(255,255,255,0.02); border:1px solid var(--line); border-radius:8px; gap:12px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:240px;">
                  <input type="checkbox" class="task-toggle-check" data-task-id="${t.id}" ${t.completed ? "checked" : ""} style="width:17px; height:17px; cursor:pointer; accent-color:var(--teal-400);">
                  <div>
                    <div style="font-size:14px; font-weight:600; color:${t.completed ? "var(--mist-dim)" : "var(--white)"}; text-decoration:${t.completed ? "line-through" : "none"};">
                      ${t.title}
                    </div>
                    <div style="font-size:11.5px; color:var(--mist-dim); display:flex; gap:10px; margin-top:2px;">
                      <span>Assignee: <strong style="color:var(--teal-300);">${assignee.fullName}</strong></span>
                      <span>Category: ${t.category || "General"}</span>
                    </div>
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:10px;">
                  <span class="badge ${t.priority === "Critical" ? "badge-admin" : t.priority === "High" ? "badge-danger" : "badge-emp"}" style="font-size:10.5px;">
                    ${t.priority || "Medium"}
                  </span>
                  <span style="font-size:11.5px; color:${t.overdue ? "var(--err)" : "var(--mist-dim)"}; font-family:var(--font-mono);">
                    Due: ${t.dueDate || "2026-08-20"} ${t.overdue ? "(Overdue)" : ""}
                  </span>
                </div>
              </div>
            `;
          })
          .join("")
      }
        </div>
      </div>
    `;

    // Click handler for team member cards
    viewProject.querySelectorAll(".card-team-member").forEach((card) => {
      card.addEventListener("click", () => {
        const memId = card.getAttribute("data-mem-id");
        navigateTo("employee", { deptId: department.id, projectId: project.id, memberId: memId });
      });
    });

    // Task toggle handler
    viewProject.querySelectorAll(".task-toggle-check").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const tId = chk.getAttribute("data-task-id");
        window.TerraHireStore.toggleTask(tId);
        renderProjectLevel(projectId);
      });
    });
  }

  // =========================================================================
  // LEVEL 4: EMPLOYEE / MANAGER DETAIL PAGE
  // =========================================================================
  function renderEmployeeLevel(memberId) {
    if (!viewEmployee) return;
    const memDetail = window.TerraHireStore.getMemberDetail(memberId);
    if (!memDetail) {
      viewEmployee.innerHTML = `<div class="card-workday-detailed" style="padding:32px; text-align:center;">Member not found. <button class="btn btn-primary btn-sm" onclick="location.reload()">Back</button></div>`;
      return;
    }

    const { member, department, projects, projectContributions, tasks, totalTasks, completedTasks, pendingTasks, overdueTasks, completionRate, attendance } = memDetail;

    if (countBadge) countBadge.textContent = `${member.fullName} (${member.roleCategory})`;

    viewEmployee.innerHTML = `
      <!-- 4.1 Basic Profile Header Card -->
      <div class="card-workday-detailed" style="margin-bottom:24px; padding:24px; border-left:4px solid var(--teal-400);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px;">
          <div style="display:flex; gap:18px; align-items:center; flex-wrap:wrap;">
            <div style="position:relative;">
              <div style="width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg, var(--teal-500), var(--navy-800)); color:var(--white); font-weight:700; font-size:28px; display:flex; align-items:center; justify-content:center; border:3px solid rgba(255,255,255,0.15);">
                ${member.fullName.charAt(0)}
              </div>
              <span style="position:absolute; bottom:2px; right:2px; width:16px; height:16px; border-radius:50%; border:3px solid var(--navy-900); background:${member.isCheckedIn ? "#ccff00" : "var(--mist-dim)"};"></span>
            </div>

            <div>
              <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <h2 style="font-size:24px; font-weight:700; color:var(--white);">${member.fullName}</h2>
                <span class="badge ${member.roleCategory === "Admin" ? "badge-admin" : member.roleCategory === "Team Leader" ? "badge-teamlead" : "badge-emp"}" style="font-size:12px;">
                  ${member.roleCategory || "Employee"}
                </span>
                <span class="badge" style="background:rgba(255,255,255,0.06); color:var(--mist); font-size:11.5px;">Code: ${member.projectCode || "BILL-01"}</span>
              </div>
              <div style="font-size:14px; color:var(--teal-300); font-weight:500; margin-top:2px;">${member.designation || "Product Specialist"}</div>
              <div style="font-size:12.5px; color:var(--mist); margin-top:4px;">
                🏢 <strong>${member.department}</strong> • 📍 ${member.location || "San Francisco, USA"} • Joined: ${member.joinedDate || "2025-01-01"}
              </div>
            </div>
          </div>

          <!-- Direct Actions -->
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a href="mailto:${member.email}" class="btn btn-ghost btn-sm" style="font-size:12.5px;">
              ✉️ Email Member
            </a>
            <button type="button" class="btn btn-primary btn-sm btn-switch-session-user" data-user-id="${member.id}" style="font-size:12.5px;">
              ⚡ Preview As Member
            </button>
          </div>
        </div>

        <!-- Reporting Structure Strip -->
        <div style="margin-top:20px; padding:12px 16px; background:rgba(255,255,255,0.03); border:1px solid var(--line); border-radius:10px; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; font-size:12.5px;">
          <div>
            <span style="color:var(--mist-dim);">Email Address:</span>
            <div style="color:var(--white); font-family:var(--font-mono); font-size:12px; margin-top:2px;">${member.email}</div>
          </div>
          <div>
            <span style="color:var(--mist-dim);">Phone:</span>
            <div style="color:var(--white); margin-top:2px;">${member.phone || "+1 (555) 019-2834"}</div>
          </div>
          <div>
            <span style="color:var(--mist-dim);">Reporting Manager:</span>
            <div style="color:var(--teal-300); font-weight:600; margin-top:2px;">${member.reportingManager || "Management"}</div>
          </div>
          <div>
            <span style="color:var(--mist-dim);">Reporting Team Lead:</span>
            <div style="color:var(--white); font-weight:600; margin-top:2px;">${member.reportingTeamLead || "Executive Council"}</div>
          </div>
        </div>
      </div>

      <!-- 4.2 Attendance Summary -->
      <div class="card-workday-detailed" style="margin-bottom:24px; padding:22px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
          <div>
            <h3 style="font-size:17px; font-weight:700; color:var(--white);">Attendance Summary & Daily Log</h3>
            <p style="font-size:12.5px; color:var(--mist);">Monthly working days verification, check-in history, and late arrival records.</p>
          </div>

          <div style="display:flex; gap:10px; align-items:center;">
            <select id="select-att-period" style="padding:6px 12px; background:var(--navy-950); border:1px solid var(--line); border-radius:6px; color:var(--white); font-size:12px;">
              <option value="current">This Month (August 2026)</option>
              <option value="prev">Last Month (July 2026)</option>
              <option value="ytd">Year to Date (2026)</option>
            </select>
          </div>
        </div>

        <!-- Attendance Stats KPI Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:18px;">
          <div class="card-stat" style="padding:12px 14px;">
            <div class="card-stat-title">Working Days</div>
            <div class="card-stat-value" style="font-size:20px;">${attendance.workingDaysInMonth}</div>
            <div class="card-stat-meta">Standard schedule</div>
          </div>
          <div class="card-stat" style="padding:12px 14px;">
            <div class="card-stat-title">Days Present</div>
            <div class="card-stat-value" style="font-size:20px; color:var(--success);">${attendance.daysPresent}</div>
            <div class="card-stat-meta">${Math.round((attendance.daysPresent / attendance.workingDaysInMonth) * 100)}% Rate</div>
          </div>
          <div class="card-stat" style="padding:12px 14px;">
            <div class="card-stat-title">Days Absent</div>
            <div class="card-stat-value" style="font-size:20px; color:${attendance.daysAbsent > 0 ? "var(--err)" : "var(--mist)"};">${attendance.daysAbsent}</div>
            <div class="card-stat-meta">Unplanned</div>
          </div>
          <div class="card-stat" style="padding:12px 14px;">
            <div class="card-stat-title">Days on Leave</div>
            <div class="card-stat-value" style="font-size:20px; color:var(--teal-300);">${attendance.daysOnLeave}</div>
            <div class="card-stat-meta">Approved PTO</div>
          </div>
          <div class="card-stat" style="padding:12px 14px;">
            <div class="card-stat-title">Late Arrivals</div>
            <div class="card-stat-value" style="font-size:20px; color:var(--warn);">${attendance.lateArrivals}</div>
            <div class="card-stat-meta">> 15 min buffer</div>
          </div>
          <div class="card-stat" style="padding:12px 14px;">
            <div class="card-stat-title">Overtime Hours</div>
            <div class="card-stat-value" style="font-size:20px; color:#ccff00;">${attendance.overtimeHours}h</div>
            <div class="card-stat-meta">Approved billable</div>
          </div>
        </div>

        <!-- Live Clock Status & Last Check times -->
        <div style="padding:14px 18px; background:rgba(45,212,191,0.06); border:1px solid rgba(45,212,191,0.2); border-radius:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${attendance.isCheckedIn ? "#ccff00" : "var(--mist-dim)"};"></span>
            <span style="font-size:14px; font-weight:700; color:var(--white);">
              ${attendance.isCheckedIn ? "Currently Working (Checked In Today)" : "Not Working Today (Checked Out)"}
            </span>
          </div>

          <div style="display:flex; gap:20px; font-size:12.5px; color:var(--mist);">
            <div>Last Check-in: <strong style="color:var(--white);">${attendance.lastCheckIn}</strong></div>
            <div>Last Check-out: <strong style="color:var(--white);">${attendance.lastCheckOut}</strong></div>
          </div>
        </div>
      </div>

      <!-- 4.3 Work / Task Summary & Deliverables List -->
      <div class="card-workday-detailed" style="margin-bottom:24px; padding:22px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
          <div>
            <h3 style="font-size:17px; font-weight:700; color:var(--white);">Work & Task Summary</h3>
            <p style="font-size:12.5px; color:var(--mist);">Assigned task volume, completion pace, and sprint deliverable status.</p>
          </div>

          <div style="display:flex; gap:12px; font-size:12.5px;">
            <span class="badge badge-teal">${completionRate}% Completion Rate</span>
          </div>
        </div>

        <!-- Task Stats Counters -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:18px;">
          <div class="card-stat" style="padding:12px 14px;">
            <div class="card-stat-title">Tasks Assigned</div>
            <div class="card-stat-value" style="font-size:20px;">${totalTasks}</div>
          </div>
          <div class="card-stat" style="padding:12px 14px;">
            <div class="card-stat-title">Tasks Completed</div>
            <div class="card-stat-value" style="font-size:20px; color:var(--success);">${completedTasks}</div>
          </div>
          <div class="card-stat" style="padding:12px 14px;">
            <div class="card-stat-title">Tasks Pending</div>
            <div class="card-stat-value" style="font-size:20px; color:var(--teal-300);">${pendingTasks}</div>
          </div>
          <div class="card-stat" style="padding:12px 14px;">
            <div class="card-stat-title">Overdue Tasks</div>
            <div class="card-stat-value" style="font-size:20px; color:${overdueTasks > 0 ? "var(--err)" : "var(--mist)"};">${overdueTasks}</div>
          </div>
        </div>

        <!-- Tasks List -->
        <div class="task-list" style="display:flex; flex-direction:column; gap:10px;">
          ${tasks.length === 0
        ? `<div style="padding:20px; text-align:center; color:var(--mist); font-size:13px;">No individual tasks assigned to this member.</div>`
        : tasks
          .map((t) => {
            const proj = (projects || []).find((p) => p.id === t.projectId) || { name: member.department, code: member.projectCode || "PRJ" };
            return `
              <div class="task-row" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:rgba(255,255,255,0.02); border:1px solid var(--line); border-radius:8px; gap:12px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:240px;">
                  <input type="checkbox" class="emp-task-toggle-check" data-task-id="${t.id}" ${t.completed ? "checked" : ""} style="width:17px; height:17px; cursor:pointer; accent-color:var(--teal-400);">
                  <div>
                    <div style="font-size:14px; font-weight:600; color:${t.completed ? "var(--mist-dim)" : "var(--white)"}; text-decoration:${t.completed ? "line-through" : "none"};">
                      ${t.title}
                    </div>
                    <div style="font-size:11.5px; color:var(--mist-dim); display:flex; gap:10px; margin-top:2px;">
                      <span>Project: <strong style="color:var(--teal-300);">${proj.code || "BILL-01"}</strong></span>
                      <span>Category: ${t.category || "General"}</span>
                    </div>
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:10px;">
                  <span class="badge ${t.priority === "Critical" ? "badge-admin" : t.priority === "High" ? "badge-danger" : "badge-emp"}" style="font-size:10.5px;">
                    ${t.priority || "Medium"}
                  </span>
                  <span style="font-size:11.5px; color:${t.overdue ? "var(--err)" : "var(--mist-dim)"}; font-family:var(--font-mono);">
                    Due: ${t.dueDate || "2026-08-20"} ${t.overdue ? "(Overdue)" : ""}
                  </span>
                </div>
              </div>
            `;
          })
          .join("")
      }
        </div>
      </div>

      <!-- 4.4 Project Contribution -->
      <div class="card-workday-detailed" style="padding:22px;">
        <div style="margin-bottom:16px;">
          <h3 style="font-size:17px; font-weight:700; color:var(--white);">Project-wise Contribution</h3>
          <p style="font-size:12.5px; color:var(--mist);">How much this person is contributing to each assigned project.</p>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px;">
          ${projectContributions.length === 0
        ? `<div style="color:var(--mist); font-size:13px;">No project contributions recorded.</div>`
        : projectContributions
          .map((pc) => {
            return `
              <div style="padding:14px 18px; background:rgba(255,255,255,0.02); border:1px solid var(--line); border-radius:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div style="min-width:200px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="badge badge-teal" style="font-size:11px;">${pc.project.code}</span>
                    <strong style="color:var(--white); font-size:14px;">${pc.project.name}</strong>
                  </div>
                  <div style="font-size:12px; color:var(--mist-dim); margin-top:3px;">
                    Assigned in: ${member.department}
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:20px; flex:1; max-width:400px; justify-content:flex-end;">
                  <div style="text-align:right; font-size:12px; min-width:120px;">
                    <span style="color:var(--mist-dim);">${pc.tasksCompleted}/${pc.tasksAssigned} Tasks Done</span>
                    <div style="color:${pc.completionRate >= 100 ? "var(--success)" : "var(--teal-300)"}; font-weight:700;">${pc.completionRate}% Contribution</div>
                  </div>

                  <div style="width:140px; height:6px; background:rgba(255,255,255,0.08); border-radius:99px; overflow:hidden;">
                    <div style="width:${pc.completionRate}%; height:100%; background:linear-gradient(90deg, var(--teal-500), #ccff00); border-radius:99px;"></div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("")
      }
        </div>
      </div>
    `;

    // Preview As Member switch
    viewEmployee.querySelectorAll(".btn-switch-session-user").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uId = btn.getAttribute("data-user-id");
        const s = window.TerraHireStore.getStore();
        const target = s.members.find((m) => m.id === uId);
        if (target) {
          window.TerraHireStore.setCurrentUser(target);
          window.location.href = "./employee.html";
        }
      });
    });

    // Task checkbox toggle
    viewEmployee.querySelectorAll(".emp-task-toggle-check").forEach((chk) => {
      chk.addEventListener("change", () => {
        const tId = chk.getAttribute("data-task-id");
        window.TerraHireStore.toggleTask(tId);
        renderEmployeeLevel(memberId);
      });
    });
  }

  // Active card highlight indicator
  function setActiveCard(cardId) {
    state.activeCardFilter = cardId;
    const allCards = document.querySelectorAll(".card-stat-clickable");
    allCards.forEach((c) => {
      c.style.borderColor = "var(--line)";
      c.style.boxShadow = "none";
      c.style.background = "var(--navy-900)";
    });

    if (cardId) {
      const active = document.getElementById(cardId);
      if (active) {
        active.style.borderColor = "var(--teal-400)";
        active.style.boxShadow = "0 0 16px rgba(45, 212, 191, 0.25)";
        active.style.background = "rgba(45, 212, 191, 0.08)";
      }
    }
  }

  // =========================================================================
  // Search & Filter Listeners
  // =========================================================================
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      if (state.level === "home") {
        if (state.viewMode === "departments") {
          renderHomeLevel();
        } else if (state.viewMode === "projects") {
          renderProjectsGrid();
        } else {
          renderFlatMembers();
        }
      }
    });
  }

  if (deptFilter) {
    deptFilter.addEventListener("change", (e) => {
      state.filterDept = e.target.value;
      if (state.level === "home") {
        if (state.viewMode === "projects") renderProjectsGrid();
        else renderFlatMembers();
      }
    });
  }

  if (projFilter) {
    projFilter.addEventListener("change", (e) => {
      state.filterProj = e.target.value;
      if (state.level === "home") {
        if (state.viewMode === "projects") renderProjectsGrid();
        else renderFlatMembers();
      }
    });
  }

  if (roleFilter) {
    roleFilter.addEventListener("change", (e) => {
      state.filterRole = e.target.value;
      if (state.level === "home") renderFlatMembers();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      state.filterStatus = e.target.value;
      if (state.filterStatus === "WORKING") setActiveCard("card-stat-working-today");
      else if (state.filterStatus === "OFFLINE") setActiveCard("card-stat-not-working");
      else setActiveCard(null);

      if (state.level === "home") {
        if (state.viewMode !== "members") setViewMode("members");
        else renderFlatMembers();
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (deptFilter) deptFilter.value = "ALL";
      if (projFilter) projFilter.value = "ALL";
      if (roleFilter) roleFilter.value = "ALL";
      if (statusFilter) statusFilter.value = "ALL";
      state.searchQuery = "";
      state.filterDept = "ALL";
      state.filterProj = "ALL";
      state.filterRole = "ALL";
      state.filterStatus = "ALL";
      state.projectStatusFilter = "ALL";
      setActiveCard(null);
      if (state.level === "home") {
        if (state.viewMode === "departments") renderHomeLevel();
        else if (state.viewMode === "projects") renderProjectsGrid();
        else renderFlatMembers();
      }
    });
  }

  function setViewMode(mode) {
    state.viewMode = mode;
    const hierarchyEl = document.getElementById("dir-hierarchy-container");
    const projectsEl = document.getElementById("dir-projects-container");
    const flatEl = document.getElementById("dir-flat-container");

    const btnHierarchy = document.getElementById("btn-mode-hierarchy");
    const btnProjects = document.getElementById("btn-mode-projects");
    const btnFlat = document.getElementById("btn-mode-flat");

    [btnHierarchy, btnProjects, btnFlat].forEach((b) => {
      if (b) {
        b.style.background = "transparent";
        b.style.color = "var(--mist)";
        b.classList.remove("active");
      }
    });

    if (hierarchyEl) hierarchyEl.style.display = "none";
    if (projectsEl) projectsEl.style.display = "none";
    if (flatEl) flatEl.style.display = "none";

    if (mode === "departments" || mode === "hierarchy") {
      if (btnHierarchy) {
        btnHierarchy.style.background = "var(--teal-500)";
        btnHierarchy.style.color = "var(--navy-950)";
        btnHierarchy.classList.add("active");
      }
      if (hierarchyEl) hierarchyEl.style.display = "block";
    } else if (mode === "projects") {
      if (btnProjects) {
        btnProjects.style.background = "var(--teal-500)";
        btnProjects.style.color = "var(--navy-950)";
        btnProjects.classList.add("active");
      }
      if (projectsEl) projectsEl.style.display = "block";
      renderProjectsGrid();
    } else if (mode === "members" || mode === "flat") {
      if (btnFlat) {
        btnFlat.style.background = "var(--teal-500)";
        btnFlat.style.color = "var(--navy-950)";
        btnFlat.classList.add("active");
      }
      if (flatEl) flatEl.style.display = "block";
      renderFlatMembers();
    }
  }

  if (btnModeHierarchy) {
    btnModeHierarchy.addEventListener("click", () => {
      setActiveCard("card-stat-depts");
      setViewMode("departments");
    });
  }

  if (btnModeProjects) {
    btnModeProjects.addEventListener("click", () => {
      state.projectStatusFilter = "ALL";
      setActiveCard("card-stat-projects");
      setViewMode("projects");
    });
  }

  if (btnModeFlat) {
    btnModeFlat.addEventListener("click", () => {
      state.filterStatus = "ALL";
      if (statusFilter) statusFilter.value = "ALL";
      setActiveCard("card-stat-employees");
      setViewMode("members");
    });
  }

  // =========================================================================
  // Interactive Summary Card Click Handlers
  // =========================================================================
  // 1. Total Departments Card
  const cardDepts = document.getElementById("card-stat-depts");
  if (cardDepts) {
    cardDepts.addEventListener("click", () => {
      setActiveCard("card-stat-depts");
      setViewMode("departments");
      const el = document.getElementById("dir-hierarchy-container");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // 2. Total Projects Card
  const cardProjects = document.getElementById("card-stat-projects");
  if (cardProjects) {
    cardProjects.addEventListener("click", () => {
      state.projectStatusFilter = "ALL";
      setActiveCard("card-stat-projects");
      setViewMode("projects");
      const el = document.getElementById("dir-projects-container");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // 3. Projects Completed Card
  const cardCompletedProjs = document.getElementById("card-stat-completed-projs");
  if (cardCompletedProjs) {
    cardCompletedProjs.addEventListener("click", () => {
      state.projectStatusFilter = "Completed";
      setActiveCard("card-stat-completed-projs");
      setViewMode("projects");
      const el = document.getElementById("dir-projects-container");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // 4. Projects In Progress Card
  const cardPendingProjs = document.getElementById("card-stat-pending-projs");
  if (cardPendingProjs) {
    cardPendingProjs.addEventListener("click", () => {
      state.projectStatusFilter = "In Progress";
      setActiveCard("card-stat-pending-projs");
      setViewMode("projects");
      const el = document.getElementById("dir-projects-container");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // 5. Total Employees Card
  const cardEmployees = document.getElementById("card-stat-employees");
  if (cardEmployees) {
    cardEmployees.addEventListener("click", () => {
      state.filterStatus = "ALL";
      if (statusFilter) statusFilter.value = "ALL";
      setActiveCard("card-stat-employees");
      setViewMode("members");
      const el = document.getElementById("dir-flat-container");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // 6. Working Today Card
  const cardWorking = document.getElementById("card-stat-working-today");
  if (cardWorking) {
    cardWorking.addEventListener("click", () => {
      state.filterStatus = "WORKING";
      if (statusFilter) statusFilter.value = "WORKING";
      setActiveCard("card-stat-working-today");
      setViewMode("members");
      const el = document.getElementById("dir-flat-container");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // 7. Non-Working Today Card
  const cardNotWorking = document.getElementById("card-stat-not-working");
  if (cardNotWorking) {
    cardNotWorking.addEventListener("click", () => {
      state.filterStatus = "OFFLINE";
      if (statusFilter) statusFilter.value = "OFFLINE";
      setActiveCard("card-stat-not-working");
      setViewMode("members");
      const el = document.getElementById("dir-flat-container");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Clear Filter Badges
  const btnClearProjFilter = document.getElementById("btn-clear-proj-filter");
  if (btnClearProjFilter) {
    btnClearProjFilter.addEventListener("click", () => {
      state.projectStatusFilter = "ALL";
      setActiveCard("card-stat-projects");
      renderProjectsGrid();
    });
  }

  const btnClearMemberFilter = document.getElementById("btn-clear-member-filter");
  if (btnClearMemberFilter) {
    btnClearMemberFilter.addEventListener("click", () => {
      state.filterStatus = "ALL";
      if (statusFilter) statusFilter.value = "ALL";
      setActiveCard("card-stat-employees");
      renderFlatMembers();
    });
  }

  // Initial Render
  renderCurrentView();
});

