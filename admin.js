/**
 * TerraHire — Admin Command Center Logic
 * Handles metrics overview, dynamic organization & member wizard, and directory table
 */

document.addEventListener("DOMContentLoaded", () => {
  const store = window.TerraHireStore ? window.TerraHireStore.getStore() : null;
  if (!store) return;

  const currentUser = window.TerraHireStore.getCurrentUser();

  // Ensure an active admin session, or auto-assign default Admin for preview
 if (!currentUser) {
  window.location.href = "./login.html";
  return;
}

if (currentUser.roleType !== "admin") {
  window.location.href =
    window.TerraHireStore.getDashboardForRole(currentUser);
  return;
}

  // Update sidebar admin label
  const sbName = document.getElementById("sidebar-user-name");
  const sbAvatar = document.getElementById("sidebar-user-avatar");
  const activeAdmin = window.TerraHireStore.getCurrentUser();
  if (sbName && activeAdmin) sbName.textContent = activeAdmin.fullName;
  if (sbAvatar && activeAdmin) sbAvatar.textContent = activeAdmin.fullName.charAt(0);

  // Initialize Switch Member Selector if present
  const memberSelect = document.getElementById("select-switch-member");
  if (memberSelect) {
    memberSelect.value = currentUser ? currentUser.id : "usr_admin";
    memberSelect.onchange = (e) => {
      const s = window.TerraHireStore.getStore();
      const target = s.members.find((m) => m.id === e.target.value);
      if (target) {
        window.TerraHireStore.setCurrentUser(target);
        window.location.reload();
      }
    };
  }

  // Sign out handler
  const logoutBtn = document.getElementById("btn-emp-logout");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (event) => {
      event.preventDefault();

      // Remove only logged-in user session
      sessionStorage.removeItem("terrahire_session_user");

      // Optional: remove any old login keys, if they exist
      sessionStorage.removeItem("currentUser");
      sessionStorage.removeItem("user");

      console.log("✅ User signed out successfully");

      // Go back to login page
      window.location.replace("./login.html");
    });
  }

  // Tab navigation handling
  const tabOverview = document.getElementById("tab-btn-overview");
  const tabAdd = document.getElementById("tab-btn-add");
  const tabDir = document.getElementById("tab-btn-directory");

  const viewOverview = document.getElementById("subview-overview");
  const viewAdd = document.getElementById("subview-add");
  const viewDir = document.getElementById("subview-directory");

  function switchTab(target) {
    if (tabOverview) tabOverview.classList.remove("active");
    if (tabAdd) tabAdd.classList.remove("active");
    if (tabDir) tabDir.classList.remove("active");

    if (viewOverview) viewOverview.classList.add("hidden");
    if (viewAdd) viewAdd.classList.add("hidden");
    if (viewDir) viewDir.classList.add("hidden");

    if (target === "overview") {
      if (tabOverview) tabOverview.classList.add("active");
      if (viewOverview) viewOverview.classList.remove("hidden");
      updateMetrics();
    } else if (target === "add") {
      if (tabAdd) tabAdd.classList.add("active");
      if (viewAdd) viewAdd.classList.remove("hidden");
      populateWizard();
    } else if (target === "directory") {
      if (tabDir) tabDir.classList.add("active");
      if (viewDir) viewDir.classList.remove("hidden");
      renderDirectory();
    }
  }

  if (tabOverview) tabOverview.onclick = () => switchTab("overview");
  if (tabAdd) tabAdd.onclick = () => switchTab("add");
  if (tabDir) tabDir.onclick = () => switchTab("directory");

  const quickAddBtn = document.getElementById("btn-quick-add");
  if (quickAddBtn) quickAddBtn.onclick = () => switchTab("add");

  const quickDirBtn = document.getElementById("btn-quick-dir");
  if (quickDirBtn) quickDirBtn.onclick = () => switchTab("directory");

  const dirAddBtn = document.getElementById("btn-dir-add-member");
  if (dirAddBtn) dirAddBtn.onclick = () => switchTab("add");

  // Metrics update
  function updateMetrics() {
    const s = window.TerraHireStore.getStore();
    const activeOrgId = currentUser.orgId;
    const statOrgs = document.getElementById("stat-total-orgs");
    const statProj = document.getElementById("stat-total-projects");
    const statMem = document.getElementById("stat-total-members");

    if (statOrgs) statOrgs.textContent = 1;
    if (statProj) statProj.textContent = s.projects.filter((project) => project.orgId === activeOrgId).length;
    if (statMem) statMem.textContent = s.members.filter((member) => member.orgId === activeOrgId && member.roleType !== "admin").length;
  }

  // Directory rendering
  function renderDirectory() {
    const s = window.TerraHireStore.getStore();
    const tbody = document.getElementById("admin-directory-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    s.members.filter((m) => m.orgId === currentUser.orgId).forEach((m) => {
      const org = s.organizations.find((o) => o.id === m.orgId);
      const proj = s.projects.find((p) => p.id === m.projectId);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="dash-avatar" style="width:32px; height:32px; font-size:13px;">${m.fullName.charAt(0)}</div>
            <div>
              <div style="font-weight:600;">${m.fullName}</div>
              <div style="font-size:12px; color:var(--mist-dim);">${m.email}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${m.roleType === "admin" ? "badge-admin" : "badge-emp"}">${m.roleType.toUpperCase()}</span>
          <div style="font-size:12px; color:var(--mist); margin-top:3px;">${m.designation || "Specialist"}</div>
        </td>
        <td>
          <div>${org ? org.name : "Global Hub"}</div>
          <div style="font-size:12px; color:var(--mist-dim); font-family:var(--font-mono);">${org ? org.code : "GLOBAL"}</div>
        </td>
        <td>
          <code>${m.projectCode || (proj ? proj.code : "N/A")}</code>
          <div style="font-size:12px; color:var(--mist);">${proj ? proj.name : "Assigned"}</div>
        </td>
        <td>
          <span class="badge badge-active">${m.status || "Active"}</span>
        </td>
        <td>
          <button class="btn btn-ghost btn-sm btn-view-emp" data-id="${m.id}">View Portal</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".btn-view-emp").forEach((btn) => {
      btn.onclick = () => {
        const uid = btn.getAttribute("data-id");
        const targetUser = s.members.find((m) => m.id === uid);
        if (targetUser) {
          window.TerraHireStore.setCurrentUser(targetUser);
          window.location.href = "./employee.html";
        }
      };
    });
  }

  updateMetrics();
});
