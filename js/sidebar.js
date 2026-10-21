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
          href="./employee.html"
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
            HUMN
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
            ★ Premium Account
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
            <span class="nav-icon">⚡</span>
            <span>Dashboard</span>
          </a>
        </li>


        <li id="nav-directory">
          <a
            href="./directory.html"
            class="workday-nav-item"
            data-page="directory.html"
          >
            <span class="nav-icon">👥</span>
            <span>Directory</span>
          </a>
        </li>


        <li>
          <a
            href="./attendance.html"
            class="workday-nav-item"
            data-page="attendance.html"
          >
            <span class="nav-icon">📅</span>
            <span>Attendance</span>
          </a>
        </li>


        <li>
          <a
            href="./tasks.html"
            class="workday-nav-item"
            data-page="tasks.html"
          >
            <span class="nav-icon">📋</span>
            <span>Tasks & Projects</span>
          </a>
        </li>

        <li id="nav-recruitment">
          <a
            href="./recruitment.html"
            class="workday-nav-item"
            data-page="recruitment.html"
          >
            <span class="nav-icon">🎯</span>
            <span>Recruitment</span>
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
            <span class="nav-icon">➕</span>
            <span>Add Member</span>
          </a>
        </li>


        <li>
          <a
            href="./payroll.html"
            class="workday-nav-item"
            data-page="payroll.html"
          >
            <span class="nav-icon">💳</span>
            <span>Payroll</span>
          </a>
        </li>
        <li id="nav-performance">
  <a 
    href="./performance.html" 
    class="workday-nav-item" 
    data-page="performance.html"
  >
    <span class="nav-icon">📊</span>
    <span>Performance</span>
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
            <span class="nav-icon">🛡️</span>
            <span>Admin Console</span>
          </a>
        </li>

      </ul>




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
  const performance = 
  document.getElementById("nav-performance");
  const recruitment = document.getElementById("nav-recruitment");


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
    if (!["admin", "manager"].includes(
  String(currentUser.roleType || "").toLowerCase()
)) {
  if (performance) {
    performance.style.display = "none";
  }
}

  if (!["admin", "executive", "manager"].includes(String(currentUser.roleType || "").toLowerCase())) {
    if (recruitment) recruitment.style.display = "none";
  }

  }


  // ==========================================
  // ADMIN PREVIEW SWITCHER
  // ==========================================

  // const memberSelect =
  //   document.getElementById(
  //     "select-switch-member"
  //   );

  // if (
  //   memberSelect &&
  //   currentUser.roleType === "admin"
  // ) {

  //   memberSelect.innerHTML = "";

  //   store.members.forEach((member) => {

  //     const option =
  //       document.createElement("option");

  //     option.value = member.id;

  //     option.textContent =
  //       `${member.fullName} (${member.designation || "Member"})`;

  //     if (member.id === currentUser.id) {
  //       option.selected = true;
  //     }

  //     memberSelect.appendChild(option);

  //   });


  //   memberSelect.onchange = (event) => {

  //     const selectedUser =
  //       store.members.find(
  //         member =>
  //           member.id === event.target.value
  //       );

  //     if (selectedUser) {

  //       window.TerraHireStore
  //         .setCurrentUser(selectedUser);

  //       window.location.reload();

  //     }

  //   };

  // }


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
