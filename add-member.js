/**
 * TerraHire — Add Member / Organization / Project Logic
 * Direct localStorage version (No TerraHireStore required)
 */

"use strict";


document.addEventListener("DOMContentLoaded", () => {
  const currentUser =
        window.TerraHireStore.getCurrentUser();

    if (!currentUser) {
        window.location.href = "./login.html";
        return;
    }

    if (currentUser.roleType !== "admin") {
        window.location.href =
            window.TerraHireStore.getDashboardForRole(currentUser);
        return;
    }

    const STORAGE_KEY = "terrahire_state_v1";
    const SESSION_KEY = "terrahire_session_user";

  /* =========================================================
     LOCAL STORAGE HELPERS
     ========================================================= */


  function getStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        console.error(
          `No data found in localStorage for key: ${STORAGE_KEY}. Ensure state.js is loaded before addmember.js.`
        );
        return null;
      }

      return JSON.parse(raw);
    } catch (error) {
      console.error("Could not read localStorage data:", error);
      return null;
    }
  }

  function saveStore(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log("✅ TerraHire data saved to localStorage:", data);
      return true;
    } catch (error) {
      console.error("Could not save data to localStorage:", error);
      return false;
    }
  }

  function getCurrentUser() {
    try {
      const userId = sessionStorage.getItem(SESSION_KEY);
      const store = getStore();

      if (!userId || !store || !store.members) {
        return null;
      }

      return store.members.find((member) => member.id === userId) || null;
    } catch (error) {
      console.error("Could not get current user:", error);
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user && user.id) {
      sessionStorage.setItem(SESSION_KEY, user.id);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  function makeId(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value || "");
    return div.innerHTML;
  }

  function getRoleType(role) {
    const normalizedRole = String(role || "")
      .trim()
      .toLowerCase();

    if (normalizedRole === "admin") return "admin";
    if (normalizedRole === "department head") return "department_head";
    if (normalizedRole === "team manager") return "manager";
    if (normalizedRole === "team leader") return "team_leader";

    return "employee";
  }

  function projectCodeExists(store, projectCode) {
    return (store.projects || []).some(
      (project) =>
        String(project.code || "").toUpperCase() ===
        String(projectCode || "").toUpperCase()
    );
  }

  function emailExists(store, email) {
    return (store.members || []).some(
      (member) =>
        String(member.email || "").toLowerCase() ===
        String(email || "").toLowerCase()
    );
  }

  function getOrganizationForDepartment(store, departmentName) {
    const projectInDepartment = (store.projects || []).find(
      (project) => project.department === departmentName
    );

    if (projectInDepartment) {
      return projectInDepartment.orgId;
    }

    return store.organizations?.[0]?.id || "org_acme";
  }

  /* =========================================================
     INITIAL STORE CHECK
     ========================================================= */

  const initialStore = getStore();

  if (!initialStore) {
    alert(
      "LocalStorage data was not found. Please ensure state.js is loaded before addmember.js."
    );
    return;
  }

  if (!initialStore.departments) initialStore.departments = [];
  if (!initialStore.organizations) initialStore.organizations = [];
  if (!initialStore.projects) initialStore.projects = [];
  if (!initialStore.members) initialStore.members = [];
  if (!initialStore.tasks) initialStore.tasks = [];
  if (!initialStore.referrals) initialStore.referrals = [];

  /* =========================================================
     SIDEBAR + LOGOUT
     ========================================================= */

  const activeAdmin = getCurrentUser();
  const sbName = document.getElementById("sidebar-user-name");
  const sbAvatar = document.getElementById("sidebar-user-avatar");

  if (sbName && activeAdmin) {
    sbName.textContent = activeAdmin.fullName;
  }

  if (sbAvatar && activeAdmin) {
    sbAvatar.textContent = activeAdmin.fullName.charAt(0).toUpperCase();
  }

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

  /* =========================================================
     FORM SECTIONS
     ========================================================= */

  const secAction = document.getElementById("sec-action");
  const secDeptProj = document.getElementById("sec-dept-proj");
  const secMemberInfo = document.getElementById("sec-member-info");
  const secLeadership = document.getElementById("sec-leadership");
  const secSecurity = document.getElementById("sec-security");
  const progBadge = document.getElementById("prog-badge");

  const fsExistingDept = document.getElementById("fs-existing-dept");
  const fsNewDept = document.getElementById("fs-new-dept");
  const subCase1Fields = document.getElementById("sub-case-1-fields");
  const subCase2Fields = document.getElementById("sub-case-2-fields");

  const roleSelectBox = document.getElementById("role-select-box");
  const roleLockedBox = document.getElementById("role-locked-box");
  const roleLockedInput = document.getElementById("wiz-member-role-locked");
  const roleLockedBadge = document.getElementById("role-locked-badge");
  const roleSelect = document.getElementById("wiz-member-role-select");

  const leadSkipBanner = document.getElementById("lead-skip-banner");
  const leadFieldsGrid = document.getElementById("lead-fields-grid");
  const fieldLeadMgr = document.getElementById("field-lead-mgr");
  const fieldLeadTeam = document.getElementById("field-lead-team");
  const fieldLeadHead = document.getElementById("field-lead-head");

  function getEffectiveRole(action, caseType) {
    if (action === "create-dept") {
      if (caseType === "case-1") return "Department Head";
      if (caseType === "case-2") return "Team Manager";
    }

    return roleSelect?.value || "Employee / Contributor";
  }

  /* =========================================================
     REVIEW / SUMMARY
     ========================================================= */

  function renderSummaryReview() {
    const store = getStore();
    if (!store) return;

    const actionRadio = document.querySelector(
      'input[name="wiz-action"]:checked'
    );

    const action = actionRadio ? actionRadio.value : "add-member";

    const caseRadio = document.querySelector(
      'input[name="wiz-case-type"]:checked'
    );

    const caseType = caseRadio ? caseRadio.value : "case-1";

    const name =
      document.getElementById("wiz-member-name")?.value.trim() ||
      "(Name not entered)";

    const email =
      document.getElementById("wiz-member-email")?.value.trim() ||
      "(Email not entered)";

    const phone =
      document.getElementById("wiz-member-phone")?.value.trim() ||
      "(Phone not entered)";

    const role = getEffectiveRole(action, caseType);

    let deptText = "";
    let projText = "";
    let leaderText = "";

    if (action === "add-member") {
      deptText =
        document.getElementById("wiz-dept-select")?.value ||
        "Department not selected";

      const projectId = document.getElementById("wiz-dept-proj-select")?.value;

      if (projectId === "__new__") {
        const projectName =
          document.getElementById("wiz-2a-new-proj-name")?.value.trim() ||
          "New Project";

        const projectCode =
          document
            .getElementById("wiz-2a-new-proj-code")
            ?.value.trim()
            .toUpperCase() || "NEW-01";

        projText = `${projectCode} — ${projectName} [NEW PROJECT]`;
      } else {
        const project = (store.projects || []).find(
          (item) => item.id === projectId
        );

        projText = project
          ? `${project.code} — ${project.name}`
          : "Project not selected";
      }

      if (role === "Department Head") {
        leaderText = "Top Tier: Department Head";
      } else if (role === "Team Manager") {
        const head =
          document.getElementById("wiz-head-select")?.value ||
          "Department Head not selected";

        leaderText = `Department Head: ${head}`;
      } else if (role === "Team Leader") {
        const manager =
          document.getElementById("wiz-mgr-select")?.value ||
          "Manager not selected";

        const head =
          document.getElementById("wiz-head-select")?.value ||
          "Department Head not selected";

        leaderText = `Manager: ${manager} | Department Head: ${head}`;
      } else {
        const manager =
          document.getElementById("wiz-mgr-select")?.value ||
          "Manager not selected";

        const leader =
          document.getElementById("wiz-lead-select")?.value ||
          "Team Leader not selected";

        const head =
          document.getElementById("wiz-head-select")?.value ||
          "Department Head not selected";

        leaderText = `Manager: ${manager} | Team Leader: ${leader} | Department Head: ${head}`;
      }
    }

    if (action === "create-dept" && caseType === "case-1") {
      const departmentName =
        document.getElementById("wiz-case1-dept-name")?.value.trim() ||
        "New Department";

      const projectName =
        document.getElementById("wiz-case1-proj-name")?.value.trim() ||
        "Initial Project";

      const projectCode =
        document
          .getElementById("wiz-case1-proj-code")
          ?.value.trim()
          .toUpperCase() || "NEW-01";

      deptText = `${departmentName} [NEW DEPARTMENT]`;
      projText = `${projectCode} — ${projectName}`;
      leaderText = "Top Tier: Founding Department Head";
    }

    if (action === "create-dept" && caseType === "case-2") {
      const departmentName =
        document.getElementById("wiz-case2-dept-select")?.value ||
        "Department not selected";

      const projectName =
        document.getElementById("wiz-case2-proj-name")?.value.trim() ||
        "New Project";

      const projectCode =
        document
          .getElementById("wiz-case2-proj-code")
          ?.value.trim()
          .toUpperCase() || "NEW-01";

      const departmentHead =
        document.getElementById("wiz-case2-head-select")?.value ||
        "Department Head not selected";

      deptText = departmentName;
      projText = `${projectCode} — ${projectName} [NEW PROJECT]`;
      leaderText = `Department Head: ${departmentHead}`;
    }

    const summaryEl = document.getElementById("wiz-summary-content");

    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
          <div><strong style="color:var(--white);">Member:</strong> ${escapeHtml(name)}</div>
          <div><strong style="color:var(--white);">Work Email:</strong> ${escapeHtml(email)}</div>
          <div><strong style="color:var(--white);">Phone:</strong> ${escapeHtml(phone)}</div>
          <div><strong style="color:var(--white);">Role:</strong> <span class="badge badge-teal">${escapeHtml(role)}</span></div>
          <div><strong style="color:var(--white);">Department:</strong> ${escapeHtml(deptText)}</div>
          <div><strong style="color:var(--white);">Project:</strong> <code>${escapeHtml(projText)}</code></div>
          <div style="grid-column:1 / -1;"><strong style="color:var(--white);">Reporting Line:</strong> ${escapeHtml(leaderText)}</div>
        </div>
      `;
    }
  }

  /* =========================================================
     PROGRESSIVE FORM REVEAL
     ========================================================= */

  function checkAndRevealSections() {
    const actionRadio = document.querySelector(
      'input[name="wiz-action"]:checked'
    );

    secAction?.classList.add("visible");

    if (!actionRadio) {
      secAction?.classList.remove("completed");
      secDeptProj?.classList.remove("visible", "completed");
      secMemberInfo?.classList.remove("visible", "completed");
      secLeadership?.classList.remove("visible", "completed");
      secSecurity?.classList.remove("visible", "completed");

      if (progBadge) {
        progBadge.className = "badge badge-emp";
        progBadge.textContent = "⚡ Step 1 of 5: Choose Action";
      }

      return;
    }

    const action = actionRadio.value;

    secAction?.classList.add("completed");
    secDeptProj?.classList.add("visible");

    if (action === "add-member") {
      fsExistingDept?.classList.remove("hidden");
      fsNewDept?.classList.add("hidden");
    } else {
      fsExistingDept?.classList.add("hidden");
      fsNewDept?.classList.remove("hidden");
    }

    let isStep2Valid = false;

    const caseRadio = document.querySelector(
      'input[name="wiz-case-type"]:checked'
    );

    const caseType = caseRadio ? caseRadio.value : "";

    if (action === "add-member") {
      const department = document.getElementById("wiz-dept-select")?.value;
      const projectId = document.getElementById("wiz-dept-proj-select")?.value;
      const projectCode = document.getElementById(
        "wiz-dept-proj-code-readonly"
      )?.value;

      if (department && projectId === "__new__") {
        const newProjectName = document
          .getElementById("wiz-2a-new-proj-name")
          ?.value.trim();

        const newProjectCode = document
          .getElementById("wiz-2a-new-proj-code")
          ?.value.trim();

        isStep2Valid = Boolean(
          newProjectName &&
            newProjectName.length >= 2 &&
            newProjectCode &&
            newProjectCode.length >= 2
        );
      } else {
        isStep2Valid = Boolean(department && projectId && projectCode);
      }
    }

    if (action === "create-dept" && caseType === "case-1") {
      subCase1Fields?.classList.remove("hidden");
      subCase2Fields?.classList.add("hidden");

      const departmentName = document
        .getElementById("wiz-case1-dept-name")
        ?.value.trim();

      const projectName = document
        .getElementById("wiz-case1-proj-name")
        ?.value.trim();

      const projectCode = document
        .getElementById("wiz-case1-proj-code")
        ?.value.trim();

      isStep2Valid = Boolean(
        departmentName &&
          departmentName.length >= 2 &&
          projectName &&
          projectName.length >= 2 &&
          projectCode &&
          projectCode.length >= 2
      );
    }

    if (action === "create-dept" && caseType === "case-2") {
      subCase1Fields?.classList.add("hidden");
      subCase2Fields?.classList.remove("hidden");

      const department = document.getElementById(
        "wiz-case2-dept-select"
      )?.value;

      const head = document.getElementById(
        "wiz-case2-head-select"
      )?.value;

      const projectName = document
        .getElementById("wiz-case2-proj-name")
        ?.value.trim();

      const projectCode = document
        .getElementById("wiz-case2-proj-code")
        ?.value.trim();

      isStep2Valid = Boolean(
        department &&
          head &&
          projectName &&
          projectName.length >= 2 &&
          projectCode &&
          projectCode.length >= 2
      );
    }

    if (!isStep2Valid) {
      secDeptProj?.classList.remove("completed");
      secMemberInfo?.classList.remove("visible", "completed");
      secLeadership?.classList.remove("visible", "completed");
      secSecurity?.classList.remove("visible", "completed");

      if (progBadge) {
        progBadge.className = "badge badge-emp";
        progBadge.textContent = "⚡ Step 2 of 5: Department & Project";
      }

      return;
    }

    secDeptProj?.classList.add("completed");
    secMemberInfo?.classList.add("visible");

    if (action === "create-dept") {
      roleSelectBox?.classList.add("hidden");
      roleLockedBox?.classList.remove("hidden");

      if (caseType === "case-1") {
        if (roleLockedInput) roleLockedInput.value = "Department Head";
        if (roleLockedBadge) {
          roleLockedBadge.textContent = "🔒 Founding Department Head";
        }
      } else {
        if (roleLockedInput) roleLockedInput.value = "Team Manager";
        if (roleLockedBadge) {
          roleLockedBadge.textContent = "🔒 New Project Team Manager";
        }
      }
    } else {
      roleSelectBox?.classList.remove("hidden");
      roleLockedBox?.classList.add("hidden");
    }

    const memberName = document.getElementById(
      "wiz-member-name"
    )?.value.trim();

    const memberEmail = document.getElementById(
      "wiz-member-email"
    )?.value.trim();

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberEmail || "");

    const isStep3Valid = Boolean(
      memberName && memberName.length >= 2 && validEmail
    );

    if (!isStep3Valid) {
      secMemberInfo?.classList.remove("completed");
      secLeadership?.classList.remove("visible", "completed");
      secSecurity?.classList.remove("visible", "completed");

      if (progBadge) {
        progBadge.className = "badge badge-emp";
        progBadge.textContent = "⚡ Step 3 of 5: Enter Member Details";
      }

      return;
    }

    secMemberInfo?.classList.add("completed");
    secLeadership?.classList.add("visible");

    const activeRole = getEffectiveRole(action, caseType);
    const leadSubText = document.getElementById("lead-sub-text");

    if (activeRole === "Department Head") {
      leadSkipBanner?.classList.remove("hidden");
      leadFieldsGrid?.classList.add("hidden");

      if (leadSubText) {
        leadSubText.textContent =
          "Department Head is the top role for this department.";
      }

      secLeadership?.classList.add("completed");
    } else if (activeRole === "Team Manager") {
      leadSkipBanner?.classList.add("hidden");
      leadFieldsGrid?.classList.remove("hidden");

      fieldLeadMgr?.classList.add("hidden");
      fieldLeadTeam?.classList.add("hidden");
      fieldLeadHead?.classList.remove("hidden");

      if (leadSubText) {
        leadSubText.textContent =
          "Select the Department Head for this Team Manager.";
      }

      secLeadership?.classList.add("completed");
    } else if (activeRole === "Team Leader") {
      leadSkipBanner?.classList.add("hidden");
      leadFieldsGrid?.classList.remove("hidden");

      fieldLeadMgr?.classList.remove("hidden");
      fieldLeadTeam?.classList.add("hidden");
      fieldLeadHead?.classList.remove("hidden");

      if (leadSubText) {
        leadSubText.textContent =
          "Select the Reporting Manager and Department Head.";
      }

      secLeadership?.classList.add("completed");
    } else {
      leadSkipBanner?.classList.add("hidden");
      leadFieldsGrid?.classList.remove("hidden");

      fieldLeadMgr?.classList.remove("hidden");
      fieldLeadTeam?.classList.remove("hidden");
      fieldLeadHead?.classList.remove("hidden");

      if (leadSubText) {
        leadSubText.textContent =
          "Select the Reporting Manager, Team Leader, and Department Head.";
      }

      secLeadership?.classList.add("completed");
    }

    secSecurity?.classList.add("visible", "completed");
    renderSummaryReview();

    if (progBadge) {
      progBadge.className = "badge badge-teal";
      progBadge.textContent = "✓ All 5 Sections Ready to Provision";
    }
  }

  /* =========================================================
     POPULATE DROPDOWNS
     ========================================================= */

  function populateWizard() {
    const store = getStore();
    if (!store) return;

    const departmentSelect = document.getElementById("wiz-dept-select");
    const case2DepartmentSelect = document.getElementById(
      "wiz-case2-dept-select"
    );

    const projectSelect = document.getElementById(
      "wiz-dept-proj-select"
    );

    const projectCodeInput = document.getElementById(
      "wiz-dept-proj-code-readonly"
    );

    const departmentList = (store.departments || []).map(
      (department) => department.name
    );

    function fillDepartmentSelect(element, text) {
      if (!element) return;

      element.innerHTML = `<option value="">-- ${text} --</option>`;

      departmentList.forEach((departmentName) => {
        element.innerHTML += `
          <option value="${escapeHtml(departmentName)}">
            ${escapeHtml(departmentName)}
          </option>
        `;
      });
    }

    fillDepartmentSelect(departmentSelect, "Choose Target Department");
    fillDepartmentSelect(
      case2DepartmentSelect,
      "Choose Existing Department"
    );

    const managerSelect = document.getElementById("wiz-mgr-select");
    const leaderSelect = document.getElementById("wiz-lead-select");
    const headSelect = document.getElementById("wiz-head-select");
    const case2HeadSelect = document.getElementById(
      "wiz-case2-head-select"
    );

    function fillLeadershipSelect(element, label) {
      if (!element) return;

      element.innerHTML = `<option value="">-- ${label} --</option>`;

      (store.members || []).forEach((member) => {
        element.innerHTML += `
          <option value="${escapeHtml(member.fullName)}">
            ${escapeHtml(member.fullName)} (${escapeHtml(
              member.designation || member.roleCategory || member.roleType
            )})
          </option>
        `;
      });
    }

    fillLeadershipSelect(managerSelect, "Select Reporting Manager");
    fillLeadershipSelect(leaderSelect, "Select Team Leader");
    fillLeadershipSelect(headSelect, "Select Department Head");
    fillLeadershipSelect(case2HeadSelect, "Select Department Head");

    function autoFillDepartmentHead(departmentName) {
      if (!departmentName || !headSelect) return;

      const department = (store.departments || []).find(
        (item) => item.name === departmentName
      );

      const headName =
        department?.head ||
        (store.members || []).find(
          (member) =>
            member.department === departmentName &&
            member.roleType === "department_head"
        )?.fullName ||
        "";

      if (!headName) return;

      const exists = Array.from(headSelect.options).some(
        (option) => option.value === headName
      );

      if (!exists) {
        headSelect.innerHTML += `
          <option value="${escapeHtml(headName)}">
            ${escapeHtml(headName)} (Department Head)
          </option>
        `;
      }

      headSelect.value = headName;

      const hintHead = document.getElementById("hint-lead-head");

      if (hintHead) {
        hintHead.style.display = "inline-block";
        hintHead.textContent = `✨ Auto-filled: ${headName}`;
      }
    }

    function autoFillProjectLeadership(projectId) {
      const project = (store.projects || []).find(
        (item) => item.id === projectId
      );

      if (!project) return;

      const managerName = project.pmName || "";

      if (managerName && managerSelect) {
        const exists = Array.from(managerSelect.options).some(
          (option) => option.value === managerName
        );

        if (!exists) {
          managerSelect.innerHTML += `
            <option value="${escapeHtml(managerName)}">
              ${escapeHtml(managerName)} (Project Manager)
            </option>
          `;
        }

        managerSelect.value = managerName;
      }

      const teamLeader = (store.members || []).find(
        (member) =>
          member.projectId === projectId &&
          member.roleType === "team_leader"
      );

      if (teamLeader && leaderSelect) {
        const exists = Array.from(leaderSelect.options).some(
          (option) => option.value === teamLeader.fullName
        );

        if (!exists) {
          leaderSelect.innerHTML += `
            <option value="${escapeHtml(teamLeader.fullName)}">
              ${escapeHtml(teamLeader.fullName)} (Team Leader)
            </option>
          `;
        }

        leaderSelect.value = teamLeader.fullName;
      }

      autoFillDepartmentHead(project.department);
    }

    function updateProjectsForDepartment(departmentName) {
      if (!projectSelect) return;

      const newProjectFields = document.getElementById("new-proj-fields-2a");
      const projectCodeWrap = document.getElementById(
        "proj-code-readonly-wrap"
      );

      if (!departmentName) {
        projectSelect.innerHTML =
          '<option value="">-- Select Department First --</option>';

        projectSelect.disabled = true;

        if (projectCodeInput) projectCodeInput.value = "";

        newProjectFields?.classList.add("hidden");

        if (projectCodeWrap) {
          projectCodeWrap.style.display = "";
        }

        return;
      }

      projectSelect.disabled = false;
      projectSelect.innerHTML =
        '<option value="">-- Select Project in Department --</option>';

      const projects = (store.projects || []).filter(
        (project) => project.department === departmentName
      );

      projects.forEach((project) => {
        projectSelect.innerHTML += `
          <option value="${escapeHtml(project.id)}" data-code="${escapeHtml(
          project.code
        )}">
            [${escapeHtml(project.code)}] ${escapeHtml(project.name)}
          </option>
        `;
      });

      projectSelect.innerHTML += `
        <option value="__new__">➕ Create New Project</option>
      `;

      if (projectCodeInput) {
        projectCodeInput.value = "";
      }

      newProjectFields?.classList.add("hidden");

      if (projectCodeWrap) {
        projectCodeWrap.style.display = "";
      }

      autoFillDepartmentHead(departmentName);
    }

    if (departmentSelect) {
      departmentSelect.onchange = () => {
        updateProjectsForDepartment(departmentSelect.value);
        checkAndRevealSections();
      };
    }

    if (projectSelect) {
      projectSelect.onchange = () => {
        const projectId = projectSelect.value;

        const newProjectFields = document.getElementById(
          "new-proj-fields-2a"
        );

        const projectCodeWrap = document.getElementById(
          "proj-code-readonly-wrap"
        );

        if (projectId === "__new__") {
          newProjectFields?.classList.remove("hidden");

          if (projectCodeWrap) {
            projectCodeWrap.style.display = "none";
          }

          if (projectCodeInput) {
            projectCodeInput.value = "";
          }
        } else {
          newProjectFields?.classList.add("hidden");

          if (projectCodeWrap) {
            projectCodeWrap.style.display = "";
          }

          const selectedOption =
            projectSelect.options[projectSelect.selectedIndex];

          if (projectCodeInput) {
            projectCodeInput.value =
              selectedOption?.getAttribute("data-code") || "";
          }

          autoFillProjectLeadership(projectId);
        }

        checkAndRevealSections();
      };
    }

    if (case2DepartmentSelect) {
      case2DepartmentSelect.onchange = () => {
        const departmentName = case2DepartmentSelect.value;

        const department = (store.departments || []).find(
          (item) => item.name === departmentName
        );

        if (case2HeadSelect && department?.head) {
          const exists = Array.from(case2HeadSelect.options).some(
            (option) => option.value === department.head
          );

          if (!exists) {
            case2HeadSelect.innerHTML += `
              <option value="${escapeHtml(department.head)}">
                ${escapeHtml(department.head)} (Department Head)
              </option>
            `;
          }

          case2HeadSelect.value = department.head;
        }

        autoFillDepartmentHead(departmentName);
        checkAndRevealSections();
      };
    }

    if (case2HeadSelect) {
      case2HeadSelect.onchange = () => {
        if (headSelect) {
          headSelect.value = case2HeadSelect.value;
        }

        checkAndRevealSections();
      };
    }
  }

  /* =========================================================
     FORM EVENT LISTENERS
     ========================================================= */

  document
    .querySelectorAll('input[name="wiz-action"]')
    .forEach((radio) => {
      radio.addEventListener("change", checkAndRevealSections);
    });

  document
    .querySelectorAll('input[name="wiz-case-type"]')
    .forEach((radio) => {
      radio.addEventListener("change", checkAndRevealSections);
    });

  const inputsToWatch = [
    "wiz-dept-select",
    "wiz-dept-proj-select",
    "wiz-2a-new-proj-name",
    "wiz-2a-new-proj-code",
    "wiz-case1-dept-name",
    "wiz-case1-proj-name",
    "wiz-case1-proj-code",
    "wiz-case2-dept-select",
    "wiz-case2-head-select",
    "wiz-case2-proj-name",
    "wiz-case2-proj-code",
    "wiz-member-name",
    "wiz-member-email",
    "wiz-member-phone",
    "wiz-member-role-select",
    "wiz-mgr-select",
    "wiz-lead-select",
    "wiz-head-select",
    "wiz-input-password"
  ];

  inputsToWatch.forEach((id) => {
    const element = document.getElementById(id);

    if (!element) return;

    element.addEventListener("input", checkAndRevealSections);
    element.addEventListener("change", checkAndRevealSections);
  });

  /* =========================================================
     PASSWORD GENERATOR
     ========================================================= */

  const generatePasswordButton = document.getElementById("wiz-btn-gen-pass");

  if (generatePasswordButton) {
    generatePasswordButton.onclick = () => {
      const characters =
        "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";

      let password = "";

      for (let index = 0; index < 12; index += 1) {
        password += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }

      const passwordInput = document.getElementById("wiz-input-password");

      if (passwordInput) {
        passwordInput.value = password;
        checkAndRevealSections();
      }
    };
  }

  /* =========================================================
     RESTART FORM
     ========================================================= */

  const restartButton = document.getElementById("wiz-btn-restart");

  if (restartButton) {
    restartButton.addEventListener("click", () => {
      const form = document.getElementById("form-add-member");

      form?.reset();

      const projectCodeInput = document.getElementById(
        "wiz-dept-proj-code-readonly"
      );

      if (projectCodeInput) {
        projectCodeInput.value = "";
      }

      const errorMessage = document.getElementById("wiz-error-msg");
      const successMessage = document.getElementById("wiz-success-msg");

      if (errorMessage) {
        errorMessage.textContent = "";
      }

      successMessage?.classList.add("hidden");

      populateWizard();
      checkAndRevealSections();
    });
  }

  /* =========================================================
     CREATE MEMBER / SAVE INTO LOCAL STORAGE
     ========================================================= */

  const addForm = document.getElementById("form-add-member");

  if (addForm) {
    addForm.onsubmit = (event) => {
      event.preventDefault();

      const store = getStore();

      if (!store) {
        alert("Could not load localStorage data.");
        return;
      }

      if (!store.departments) store.departments = [];
      if (!store.projects) store.projects = [];
      if (!store.members) store.members = [];
      if (!store.organizations) store.organizations = [];

      const errorMessage = document.getElementById("wiz-error-msg");
      const successMessage = document.getElementById("wiz-success-msg");

      if (errorMessage) {
        errorMessage.textContent = "";
      }

      successMessage?.classList.add("hidden");

      const actionRadio = document.querySelector(
        'input[name="wiz-action"]:checked'
      );

      if (!actionRadio) {
        if (errorMessage) {
          errorMessage.textContent =
            "Please choose an action in Step 1.";
        }

        return;
      }

      const action = actionRadio.value;

      const name = document.getElementById("wiz-member-name")?.value.trim();
      const email = document
        .getElementById("wiz-member-email")
        ?.value.trim()
        .toLowerCase();

      const phone =
        document.getElementById("wiz-member-phone")?.value.trim() || "";

      const password =
        document.getElementById("wiz-input-password")?.value.trim() || "";

      if (!name || name.length < 2) {
        if (errorMessage) {
          errorMessage.textContent =
            "Please enter a valid member full name.";
        }

        return;
      }

      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");

      if (!validEmail) {
        if (errorMessage) {
          errorMessage.textContent =
            "Please enter a valid work email address.";
        }

        return;
      }

      if (emailExists(store, email)) {
        if (errorMessage) {
          errorMessage.textContent =
            "A member with this email already exists.";
        }

        return;
      }

      if (!password || password.length < 8) {
        if (errorMessage) {
          errorMessage.textContent =
            "Please generate or enter a password with at least 8 characters.";
        }

        return;
      }

      let finalDepartment = "";
      let finalProjectId = "";
      let finalProjectCode = "";
      let finalRole = "";
      let finalManager = "";
      let finalTeamLeader = "";
      let finalDepartmentHead = "";
      let finalOrganizationId = "";

      /* -----------------------------------------------------
         OPTION 1: ADD MEMBER TO EXISTING DEPARTMENT
         ----------------------------------------------------- */

      if (action === "add-member") {
        finalDepartment =
          document.getElementById("wiz-dept-select")?.value || "";

        finalProjectId =
          document.getElementById("wiz-dept-proj-select")?.value || "";

        if (!finalDepartment || !finalProjectId) {
          if (errorMessage) {
            errorMessage.textContent =
              "Please select a department and project.";
          }

          return;
        }

        finalOrganizationId = getOrganizationForDepartment(
          store,
          finalDepartment
        );

        if (finalProjectId === "__new__") {
          const newProjectName = document
            .getElementById("wiz-2a-new-proj-name")
            ?.value.trim();

          const newProjectCode = document
            .getElementById("wiz-2a-new-proj-code")
            ?.value.trim()
            .toUpperCase();

          if (!newProjectName || !newProjectCode) {
            if (errorMessage) {
              errorMessage.textContent =
                "Please enter a new project name and project code.";
            }

            return;
          }

          if (projectCodeExists(store, newProjectCode)) {
            if (errorMessage) {
              errorMessage.textContent = `Project code "${newProjectCode}" already exists. Please use another code.`;
            }

            return;
          }

          finalProjectId = makeId("proj");
          finalProjectCode = newProjectCode;
          finalRole =
            document.getElementById("wiz-member-role-select")?.value ||
            "Team Manager";

          store.projects.push({
            id: finalProjectId,
            orgId: finalOrganizationId,
            department: finalDepartment,
            code: newProjectCode,
            name: newProjectName,
            pmName: name,
            pmEmail: email,
            status: "Active",
            startDate: new Date().toISOString().split("T")[0],
            endDate: "",
            desc: `New project created in ${finalDepartment}.`,
            createdAt: new Date().toISOString()
          });
        } else {
          const existingProject = store.projects.find(
            (project) => project.id === finalProjectId
          );

          if (!existingProject) {
            if (errorMessage) {
              errorMessage.textContent =
                "Selected project could not be found.";
            }

            return;
          }

          finalProjectCode = existingProject.code;
          finalOrganizationId = existingProject.orgId;

          finalRole =
            document.getElementById("wiz-member-role-select")?.value ||
            "Employee / Contributor";
        }

        if (finalRole === "Department Head") {
          finalManager = "Executive Board";
          finalTeamLeader = "Executive Council";
          finalDepartmentHead = name;
        } else if (finalRole === "Team Manager") {
          finalDepartmentHead =
            document.getElementById("wiz-head-select")?.value ||
            "Department Head";

          finalManager = finalDepartmentHead;
          finalTeamLeader = name;
        } else if (finalRole === "Team Leader") {
          finalManager =
            document.getElementById("wiz-mgr-select")?.value ||
            "Reporting Manager";

          finalTeamLeader = name;

          finalDepartmentHead =
            document.getElementById("wiz-head-select")?.value ||
            "Department Head";
        } else {
          finalManager =
            document.getElementById("wiz-mgr-select")?.value ||
            "Reporting Manager";

          finalTeamLeader =
            document.getElementById("wiz-lead-select")?.value ||
            "Team Leader";

          finalDepartmentHead =
            document.getElementById("wiz-head-select")?.value ||
            "Department Head";
        }
      }

      /* -----------------------------------------------------
         OPTION 2, CASE 1: CREATE NEW DEPARTMENT + PROJECT
         ----------------------------------------------------- */

      if (action === "create-dept") {
        const caseRadio = document.querySelector(
          'input[name="wiz-case-type"]:checked'
        );

        const caseType = caseRadio ? caseRadio.value : "";

        if (!caseType) {
          if (errorMessage) {
            errorMessage.textContent =
              "Please select whether you want to create a department or only a project.";
          }

          return;
        }

        if (caseType === "case-1") {
          const departmentName = document
            .getElementById("wiz-case1-dept-name")
            ?.value.trim();

          const projectName = document
            .getElementById("wiz-case1-proj-name")
            ?.value.trim();

          const projectCode = document
            .getElementById("wiz-case1-proj-code")
            ?.value.trim()
            .toUpperCase();

          if (!departmentName || !projectName || !projectCode) {
            if (errorMessage) {
              errorMessage.textContent =
                "Please enter department name, project name, and project code.";
            }

            return;
          }

          const duplicateDepartment = store.departments.some(
            (department) =>
              department.name.toLowerCase() === departmentName.toLowerCase()
          );

          if (duplicateDepartment) {
            if (errorMessage) {
              errorMessage.textContent =
                "This department already exists. Please choose an existing department instead.";
            }

            return;
          }

          if (projectCodeExists(store, projectCode)) {
            if (errorMessage) {
              errorMessage.textContent = `Project code "${projectCode}" already exists.`;
            }

            return;
          }

          finalDepartment = departmentName;
          finalProjectCode = projectCode;
          finalProjectId = makeId("proj");
          finalRole = "Department Head";
          finalManager = "Executive Board";
          finalTeamLeader = "Executive Council";
          finalDepartmentHead = name;
          finalOrganizationId =
            store.organizations[0]?.id || "org_acme";

          store.departments.push({
            id: makeId("dept"),
            name: departmentName,
            head: name,
            headEmail: email,
            desc: `New department created by ${name}.`,
            createdAt: new Date().toISOString()
          });

          store.projects.push({
            id: finalProjectId,
            orgId: finalOrganizationId,
            department: departmentName,
            code: projectCode,
            name: projectName,
            pmName: name,
            pmEmail: email,
            status: "Active",
            startDate: new Date().toISOString().split("T")[0],
            endDate: "",
            desc: `Founding project for ${departmentName}.`,
            createdAt: new Date().toISOString()
          });
        }

        /* ---------------------------------------------------
           OPTION 2, CASE 2: EXISTING DEPARTMENT + NEW PROJECT
           --------------------------------------------------- */

        if (caseType === "case-2") {
          const departmentName =
            document.getElementById("wiz-case2-dept-select")?.value;

          const departmentHead =
            document.getElementById("wiz-case2-head-select")?.value;

          const projectName = document
            .getElementById("wiz-case2-proj-name")
            ?.value.trim();

          const projectCode = document
            .getElementById("wiz-case2-proj-code")
            ?.value.trim()
            .toUpperCase();

          if (
            !departmentName ||
            !departmentHead ||
            !projectName ||
            !projectCode
          ) {
            if (errorMessage) {
              errorMessage.textContent =
                "Please select department/head and enter project name/code.";
            }

            return;
          }

          if (projectCodeExists(store, projectCode)) {
            if (errorMessage) {
              errorMessage.textContent = `Project code "${projectCode}" already exists.`;
            }

            return;
          }

          finalDepartment = departmentName;
          finalProjectCode = projectCode;
          finalProjectId = makeId("proj");
          finalRole = "Team Manager";
          finalManager = departmentHead;
          finalTeamLeader = name;
          finalDepartmentHead = departmentHead;
          finalOrganizationId = getOrganizationForDepartment(
            store,
            departmentName
          );

          store.projects.push({
            id: finalProjectId,
            orgId: finalOrganizationId,
            department: departmentName,
            code: projectCode,
            name: projectName,
            pmName: name,
            pmEmail: email,
            status: "Active",
            startDate: new Date().toISOString().split("T")[0],
            endDate: "",
            desc: `New project created under ${departmentName}.`,
            createdAt: new Date().toISOString()
          });
        }
      }

      /* -----------------------------------------------------
         CREATE NEW MEMBER OBJECT
         ----------------------------------------------------- */

      const newMember = {
        id: makeId("usr"),

        roleType: getRoleType(finalRole),
        roleCategory: finalRole,
        designation: finalRole,

        fullName: name,
        email: email,
        password: password,

        orgId: finalOrganizationId,
        projectId: finalProjectId,
        projectCode: finalProjectCode,
        department: finalDepartment,

        reportingManager: finalManager,
        reportingTeamLead: finalTeamLeader,
        headOfDept: finalDepartmentHead,

        phone: phone,
        location: "Global Remote",
        joinedDate: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        status: "Active",

        isCheckedIn: false,
        lastCheckIn: "",
        lastCheckOut: "",
        checkInTimestamp: null,

        workingDaysInMonth: 22,
        daysPresent: 0,
        daysAbsent: 0,
        daysOnLeave: 0,
        lateArrivals: 0,
        overtimeHours: 0,

        bio: `Provisioned as ${finalRole} in ${finalDepartment}.`
      };

      /* -----------------------------------------------------
         SAVE EVERYTHING IN LOCAL STORAGE
         ----------------------------------------------------- */

      store.members.push(newMember);

      const saved = saveStore(store);

      if (!saved) {
        if (errorMessage) {
          errorMessage.textContent =
            "Member was created but could not be saved in localStorage.";
        }

        return;
      }
      populateWizard();

      console.log("✅ New member saved in localStorage:", newMember);

      if (successMessage) {
        successMessage.classList.remove("hidden");

        successMessage.innerHTML = `
          <strong>✓ Member Successfully Provisioned!</strong><br>
          Account created for <strong>${escapeHtml(name)}</strong>
          (${escapeHtml(email)}) as
          <strong>${escapeHtml(finalRole)}</strong>.<br>
          Department: <strong>${escapeHtml(finalDepartment)}</strong><br>
          Project code: <code>${escapeHtml(finalProjectCode)}</code><br>
          <div style="margin-top:10px;">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              id="btn-view-dir-after-add"
            >
              Go to Member Directory →
            </button>
          </div>
        `;

        const directoryButton = document.getElementById(
          "btn-view-dir-after-add"
        );

        if (directoryButton) {
          directoryButton.onclick = () => {
            window.location.href = "./admin.html";
          };
        }
      }

      checkAndRevealSections();
    };
  }

  /* =========================================================
     INITIALIZE PAGE
     ========================================================= */

  populateWizard();
  checkAndRevealSections();
});
