/**
 * HUMN — Shared Sidebar
 */

document.addEventListener("DOMContentLoaded", () => {

  const store = window.TerraHireStore
    ? window.TerraHireStore.getStore()
    : null;

  if (!store) {
    console.error("TerraHireStore not available.");
    return;
  }

  const currentUser =
    window.TerraHireStore.getCurrentUser();

  if (!currentUser) {
    window.location.href = "./login.html";
    return;
  }


  // ==========================================
  // CURRENT PAGE
  // ==========================================

  const currentPage =
    window.location.pathname
      .split("/")
      .pop() || "employee.html";


  // ==========================================
  // SIDEBAR
  // ==========================================

  const sidebarRoot =
    document.getElementById("sidebar-root");

  if (!sidebarRoot) {
    console.error("sidebar-root not found.");
    return;
  }


  sidebarRoot.innerHTML = `

    <aside class="workday-sidebar">

      <!-- BRAND -->
      <div class="workday-brand">

        <a
          href="./index.html"
          class="workday-brand-logo"
          id="link-brand-home"
        >

          <span
            class="mark"
            aria-hidden="true"
            style="
              width:14px;
              height:14px;
              border-radius:4px;
              background:#ccff00;
              display:inline-block;
            "
          ></span>

          <span
            style="
              font-weight:700;
              letter-spacing:-0.02em;
            "
          >
            EMP
          </span>

          <span class="humn-badge">
            PORTAL
          </span>

        </a>

      </div>


      <!-- USER -->
      <div
        class="workday-user-chip"
        id="sidebar-user-chip"
      >

        <div
          class="workday-user-avatar"
          id="sidebar-user-avatar"
        >
          ${currentUser.fullName
            .charAt(0)
            .toUpperCase()}
        </div>

        <div class="workday-user-meta">

          <div
            class="workday-user-name"
            id="sidebar-user-name"
          >
            ${currentUser.fullName}
          </div>

          <div
            class="workday-user-role"
            id="sidebar-user-role"
          >
            ${currentUser.designation || "Member"}
          </div>

          <div
            style="
              font-size:10.5px;
              color:#ccff00;
              font-weight:600;
              margin-top:2px;
            "
          >
            Premium Account
          </div>

        </div>

      </div>


      <!-- NAVIGATION -->
      <ul class="workday-nav">

        <li>
          <a
            href="./employee.html"
            class="workday-nav-item"
            data-page="employee.html"
          >
            <span class="nav-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></span>
            <span>Dashboard</span>
          </a>
        </li>


        <li id="nav-directory">
          <a
            href="./directory.html"
            class="workday-nav-item"
            data-page="directory.html"
          >
            <span class="nav-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></span>
            <span>Directory</span>
          </a>
        </li>


        <li>
          <a
            href="./attendance.html"
            class="workday-nav-item"
            data-page="attendance.html"
          >
            <span class="nav-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
            <span>Attendance</span>
          </a>
        </li>


        <li>
          <a
            href="./tasks.html"
            class="workday-nav-item"
            data-page="tasks.html"
          >
            <span class="nav-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg></span>
            <span>Tasks & Projects</span>
          </a>
        </li>


        <li
          id="nav-add-member"
        >
          <a
            href="./add-member.html"
            class="workday-nav-item"
            data-page="add-member.html"
          >
            <span class="nav-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg></span>
            <span>Add Member</span>
          </a>
        </li>


        <li>
          <a
            href="./payroll.html"
            class="workday-nav-item"
            data-page="payroll.html"
          >
            <span class="nav-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></span>
            <span>Payroll</span>
          </a>
        </li>


        <li
          id="nav-admin-console"
        >
          <a
            href="./admin.html"
            class="workday-nav-item"
            data-page="admin.html"
          >
            <span class="nav-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
            <span>Admin Console</span>
          </a>
        </li>

      </ul>


      <!-- ADMIN PREVIEW SWITCHER -->
      <div
        id="sidebar-switcher"
        style="
          margin:16px 0 10px 0;
          padding:10px;
          background:rgba(255,255,255,0.03);
          border:1px solid var(--line);
          border-radius:10px;
        "
      >

        <label
          for="select-switch-member"
          style="
            font-size:11px;
            font-family:var(--font-mono);
            color:var(--mist-dim);
            text-transform:uppercase;
            display:block;
            margin-bottom:6px;
          "
        >
          Preview As Member:
        </label>

        <select
          id="select-switch-member"
          style="
            width:100%;
            padding:6px 8px;
            font-size:12px;
            background:var(--navy-950);
            color:var(--white);
            border:1px solid var(--line);
            border-radius:6px;
          "
        >
        </select>

      </div>


      <!-- FOOTER -->
      <div class="workday-sidebar-footer">

        <button
          class="btn btn-danger-ghost btn-sm"
          type="button"
          id="btn-emp-logout"
          style="
            width:100%;
            justify-content:center;
          "
        >
          Sign Out
        </button>

      </div>

    </aside>
  `;


  // ==========================================
  // ACTIVE PAGE
  // ==========================================

  document
    .querySelectorAll(".workday-nav-item")
    .forEach((item) => {

      const page =
        item.getAttribute("data-page");

      if (page === currentPage) {
        item.classList.add("active");
      }

    });


  // ==========================================
  // ROLE BASED VISIBILITY
  // ==========================================

  const addMember =
    document.getElementById("nav-add-member");

  const adminConsole =
    document.getElementById("nav-admin-console");

  const switcher =
    document.getElementById("sidebar-switcher");
  
  const directory =
  document.getElementById("nav-directory");


  if (currentUser.roleType !== "admin") {

    // Add Member → Admin only
     if (directory) {
    directory.style.display = "none";
  }
    if (addMember) {
      addMember.style.display = "none";
    }

    // Admin Console → Admin only
    if (adminConsole) {
      adminConsole.style.display = "none";
    }

    // Preview switcher → Admin only
    if (switcher) {
      switcher.style.display = "none";
    }

  }


  // ==========================================
  // ADMIN PREVIEW SWITCHER
  // ==========================================

  const memberSelect =
    document.getElementById(
      "select-switch-member"
    );

  if (
    memberSelect &&
    currentUser.roleType === "admin"
  ) {

    memberSelect.innerHTML = "";

    store.members.forEach((member) => {

      const option =
        document.createElement("option");

      option.value = member.id;

      option.textContent =
        `${member.fullName} (${member.designation || "Member"})`;

      if (member.id === currentUser.id) {
        option.selected = true;
      }

      memberSelect.appendChild(option);

    });


    memberSelect.onchange = (event) => {

      const selectedUser =
        store.members.find(
          member =>
            member.id === event.target.value
        );

      if (selectedUser) {

        window.TerraHireStore
          .setCurrentUser(selectedUser);

        window.location.reload();

      }

    };

  }


  // ==========================================
  // LOGOUT
  // ==========================================

  const logoutBtn =
    document.getElementById("btn-emp-logout");

  if (logoutBtn) {

    logoutBtn.onclick = () => {

      window.TerraHireStore
        .setCurrentUser(null);

      window.location.href =
        "./login.html";

    };

  }

});