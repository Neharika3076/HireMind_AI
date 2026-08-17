/**
 * HUMN — Payroll & Referrals Logic
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
  // PREVIEW SWITCHER — ADMIN ONLY
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

  // ==========================================
  // LOGOUT
  // ==========================================

  const logoutBtn =
    document.getElementById("btn-emp-logout");

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      window.TerraHireStore.setCurrentUser(null);
      window.location.href = "./login.html";
    };
  }

  // ==========================================
  // ADMIN CONSOLE
  // ==========================================

  const btnAdmin =
    document.getElementById("btn-quick-admin-switch");

  if (btnAdmin && currentUser.roleType === "admin") {
    btnAdmin.onclick = () => {
      window.location.href = "./admin.html";
    };
  }

  function renderPayments() {
    const s = window.TerraHireStore.getStore();
    
    // Mock past payments
    const payments = [
      { month: "July 2026", date: "Jul 31, 2026", base: "$7,500.00", net: "$7,680.00", status: "Settled" },
      { month: "June 2026", date: "Jun 30, 2026", base: "$7,500.00", net: "$7,680.00", status: "Settled" },
      { month: "May 2026", date: "May 31, 2026", base: "$7,500.00", net: "$7,680.00", status: "Settled" },
      { month: "April 2026", date: "Apr 30, 2026", base: "$7,500.00", net: "$7,680.00", status: "Settled" },
      { month: "March 2026", date: "Mar 31, 2026", base: "$7,500.00", net: "$7,680.00", status: "Settled" },
      { month: "February 2026", date: "Feb 28, 2026", base: "$7,500.00", net: "$7,680.00", status: "Settled" },
      { month: "January 2026", date: "Jan 31, 2026", base: "$7,500.00", net: "$7,680.00", status: "Settled" }
    ];

    const tbody = document.getElementById("payments-table-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let totalPaid = 0;

    payments.forEach((pay) => {
      // Calculate total (removing $ and ,)
      const numVal = parseFloat(pay.net.replace(/[$,]/g, ""));
      totalPaid += numVal;

      const tr = document.createElement("tr");
      let badgeClass = "badge-success";

      tr.innerHTML = `
        <td style="font-weight:600; color:var(--white);">${pay.month}</td>
        <td style="color:var(--mist);">${pay.date}</td>
        <td style="font-size:13px; color:var(--mist-dim);">${pay.base}</td>
        <td><span class="badge ${badgeClass}" style="font-size:11px;">${pay.status}</span></td>
        <td style="font-family:var(--font-mono); font-weight:700; color:#ccff00;">${pay.net}</td>
      `;
      tbody.appendChild(tr);
    });

    // Update YTD card
    const ytdElement = document.getElementById("total-paid-ytd");
    const countElement = document.getElementById("total-payments-count");
    if (ytdElement) {
      ytdElement.textContent = "$" + totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (countElement) {
      countElement.textContent = payments.length + " Payments Recorded";
    }
  }

  renderPayments();
});

