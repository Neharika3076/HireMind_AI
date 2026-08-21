"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const user = window.TerraHireStore.getCurrentUser();
  if (!user) { window.location.href = "./login.html"; return; }
  if (user.roleType !== "admin") { window.location.href = window.TerraHireStore.getDashboardForRole(user); return; }

  const feedback = document.getElementById("org-feedback");
  const error = document.getElementById("org-error");
  const role = document.getElementById("member-role");
  const departmentSelect = document.getElementById("member-department");
  const managerSelect = document.getElementById("member-manager");
  const managerWrap = document.getElementById("member-manager-wrap");
  const executivePositionWrap = document.getElementById("executive-position-wrap");
  const managerPositionWrap = document.getElementById("manager-position-wrap");

  function showMessage(message, isError = false) {
    error.textContent = isError ? message : "";
    feedback.textContent = isError ? "" : message;
    feedback.classList.toggle("hidden", isError || !message);
  }

  function renderDepartments() {
    const data = window.TerraHireStore.getStore();
    const departments = window.TerraHireStore.getOrganizationDepartments(user.orgId);
    departmentSelect.innerHTML = '<option value="" disabled selected>Select department</option>';
    departments.forEach((department) => {
      const option = document.createElement("option");
      option.value = department.id;
      option.textContent = department.name;
      departmentSelect.appendChild(option);
    });

    const directory = document.getElementById("department-directory");
    directory.innerHTML = "";
    if (!departments.length) {
      directory.innerHTML = '<p style="color:var(--mist); font-size:13px;">No departments yet. Create the first department above.</p>';
      return;
    }
    departments.forEach((department) => {
      const executive = data.members.find((member) => member.id === department.executiveId);
      const managerCount = data.members.filter((member) => member.departmentId === department.id && member.roleType === "manager").length;
      const memberCount = data.members.filter((member) => member.departmentId === department.id).length;
      const card = document.createElement("div");
      card.style.cssText = "padding:15px; border:1px solid var(--line); border-radius:10px; background:rgba(255,255,255,0.02);";
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px;"><strong style="color:var(--white);">${department.name}</strong><span class="badge ${executive ? "badge-teal" : "badge-emp"}" style="font-size:10px;">${executive ? "Executive assigned" : "No Executive"}</span></div>
        <div style="color:var(--mist); font-size:11.5px; margin-top:7px; min-height:32px;">${department.desc || "No department description."}</div>
        <div style="color:var(--mist-dim); font-size:11.5px; margin-top:10px;">Executive: <strong style="color:var(--white);">${executive ? `${executive.fullName} · ${executive.executivePosition}` : "Unassigned"}</strong><br>Managers: ${managerCount} · Members: ${memberCount}</div>`;
      directory.appendChild(card);
    });
  }

  function updateRoleFields() {
    executivePositionWrap.classList.toggle("hidden", role.value !== "executive");
    managerPositionWrap.classList.toggle("hidden", role.value !== "manager");
    managerWrap.classList.toggle("hidden", role.value === "executive" || role.value === "manager");
    refreshManagerOptions();
  }

  function refreshManagerOptions() {
    if (!managerSelect) return;
    const data = window.TerraHireStore.getStore();
    const previous = managerSelect.value;
    const managers = data.members.filter((member) => member.orgId === user.orgId && member.roleType === "manager" && (!departmentSelect.value || member.departmentId === departmentSelect.value));
    managerSelect.innerHTML = '<option value="">No manager selected</option>';
    managers.forEach((manager) => {
      const option = document.createElement("option");
      option.value = manager.id;
      option.textContent = `${manager.fullName} · ${manager.managerPosition || manager.designation || "Manager"}`;
      managerSelect.appendChild(option);
    });
    managerSelect.value = managers.some((manager) => manager.id === previous) ? previous : "";
    const required = (role.value === "employee" || role.value === "team_leader") && managers.length > 0;
    managerSelect.required = required;
    managerSelect.parentElement.querySelector("label").innerHTML = `Reports To Manager ${required ? "<span style=\"color:var(--err)\">*</span>" : "<span style=\"color:var(--mist-dim)\">(optional until a manager exists)</span>"}`;
  }

  role.onchange = updateRoleFields;
  departmentSelect.onchange = refreshManagerOptions;
  updateRoleFields();

  document.getElementById("form-create-department").onsubmit = (event) => {
    event.preventDefault();
    try {
      const department = window.TerraHireStore.createDepartment({
        name: document.getElementById("department-name").value,
        desc: document.getElementById("department-description").value
      });
      event.target.reset();
      renderDepartments();
      showMessage(`${department.name} was created. It is ready for members when you are.`);
    } catch (exception) { showMessage(exception.message, true); }
  };

  document.getElementById("form-add-member").onsubmit = (event) => {
    event.preventDefault();
    try {
      const member = window.TerraHireStore.createMember({
        fullName: document.getElementById("member-name").value,
        email: document.getElementById("member-email").value,
        password: document.getElementById("member-password").value,
        departmentId: departmentSelect.value,
        roleType: role.value,
        managerId: managerSelect ? managerSelect.value : "",
        executivePosition: document.getElementById("executive-position").value,
        managerPosition: document.getElementById("manager-position").value,
        designation: document.getElementById("member-designation").value
      });
      event.target.reset();
      updateRoleFields();
      renderDepartments();
      showMessage(`${member.fullName} was provisioned as ${member.roleCategory}.`);
    } catch (exception) { showMessage(exception.message, true); }
  };

  renderDepartments();
});
