/**
 * HUMN — Attendance & Time Tracking Logic
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

  const currentUser = window.TerraHireStore.getCurrentUser();

  if (!currentUser) {
    window.location.href = "./login.html";
    return;
  }

  // ==========================================
  // ROLE-BASED NAVIGATION
  // ==========================================

  const directoryNav = document.getElementById("nav-item-team");
  const addMemberNav = document.getElementById("nav-item-add");
  const adminButton = document.getElementById("btn-quick-admin-switch");
  const memberSwitcher = document.getElementById("select-switch-member");

  if (currentUser.roleType !== "admin") {
    directoryNav?.closest("li")?.remove();
    addMemberNav?.closest("li")?.remove();

    adminButton?.remove();
    memberSwitcher?.closest("div")?.remove();
  }

  

  // Active User Chip
  const sbAvatar = document.getElementById("sidebar-user-avatar");
  const sbName = document.getElementById("sidebar-user-name");
  const sbRole = document.getElementById("sidebar-user-role");
  if (sbAvatar) sbAvatar.textContent = currentUser.fullName.charAt(0);
  if (sbName) sbName.textContent = currentUser.fullName;
  if (sbRole) sbRole.textContent = currentUser.designation || "Member";

  // Switch Member Selector
    const memberSelect =
    document.getElementById("select-switch-member");

  if (memberSelect && currentUser.roleType === "admin") {
    memberSelect.value = currentUser.id;

    memberSelect.onchange = (e) => {
      const s = window.TerraHireStore.getStore();

      const target = s.members.find(
        (m) => m.id === e.target.value
      );

      if (target) {
        window.TerraHireStore.setCurrentUser(target);
        window.location.reload();
      }
    };
  }

  // Logout
  const logoutBtn = document.getElementById("btn-emp-logout");
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

  function renderAttendance() {
    const cur = currentUser;

    const totalWorking = cur.workingDaysInMonth || 22;
    const present = cur.daysPresent || 20;
    const absent = cur.daysAbsent || 1;
    const leave = cur.daysOnLeave || 1;
    const late = cur.lateArrivals || 2;
    const overtime = cur.overtimeHours ? `${cur.overtimeHours} hrs` : "5.5 hrs";
    const attRate = Math.round((present / (present + absent + leave)) * 100);

    const statTotal = document.getElementById("stat-total-working-days");
    const statPres = document.getElementById("stat-days-present");
    const statAbs = document.getElementById("stat-days-absent");
    const statLeave = document.getElementById("stat-days-leave");
    const statLate = document.getElementById("stat-late-arrivals");
    const statOt = document.getElementById("stat-overtime-hours");
    const badgeRate = document.getElementById("att-badge-rate");

    if (statTotal) statTotal.textContent = totalWorking;
    if (statPres) statPres.textContent = present;
    if (statAbs) statAbs.textContent = absent;
    if (statLeave) statLeave.textContent = leave;
    if (statLate) statLate.textContent = late;
    if (statOt) statOt.textContent = overtime;
    if (badgeRate) badgeRate.textContent = `${attRate}% Attendance`;

    // Render Calendar
    const calGrid = document.getElementById("attendance-calendar-grid");
    const detailBox = document.getElementById("calendar-day-detail-box");
    const detailTitle = document.getElementById("cal-detail-title");
    const detailBody = document.getElementById("cal-detail-body");

    if (calGrid) {
      calGrid.innerHTML = "";
      const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
      daysOfWeek.forEach((d) => {
        const headerCell = document.createElement("div");
        headerCell.className = "calendar-day-cell header-cell";
        headerCell.textContent = d;
        calGrid.appendChild(headerCell);
      });

      // August 2026 starts on Saturday (Index 5)
      for (let pad = 0; pad < 5; pad++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "calendar-day-cell empty-cell";
        calGrid.appendChild(emptyCell);
      }

      for (let day = 1; day <= 31; day++) {
        const cell = document.createElement("div");
        cell.className = "calendar-day-cell";
        cell.textContent = day;

        const dayOfWeekIndex = (5 + day - 1) % 7;
        const isWeekend = dayOfWeekIndex === 5 || dayOfWeekIndex === 6;

        let status = "present";
        let tooltip = `Aug ${day}, 2026: Checked in on-time (09:00 AM - 06:00 PM).`;

        if (isWeekend) {
          status = "weekend";
          tooltip = `Aug ${day}, 2026: Weekend (Rest Day).`;
        } else if (day === 5) {
          status = "absent";
          tooltip = `Aug 5, 2026: Unexcused Absence recorded.`;
        } else if (day === 11) {
          status = "leave";
          tooltip = `Aug 11, 2026: Approved Casual Leave.`;
        } else if (day === 15) {
          status = "today";
          tooltip = `Aug 15, 2026 (Today): Active Workday (Checked In at ${cur.lastCheckIn || "09:12 AM"}).`;
        } else if (day > 15) {
          status = "future";
          tooltip = `Aug ${day}, 2026: Upcoming scheduled workday.`;
        }

        cell.classList.add(`day-${status}`);
        cell.title = tooltip;

        cell.addEventListener("click", () => {
          if (detailBox && detailTitle && detailBody) {
            detailBox.style.display = "block";
            detailTitle.textContent = `August ${day}, 2026:`;
            detailBody.textContent = tooltip.split(": ")[1] || tooltip;
          }
        });

        calGrid.appendChild(cell);
      }
    }

    // Render Logs Table
    const tbody = document.getElementById("att-logs-tbody");
    if (tbody) {
      tbody.innerHTML = "";
      const sampleLogs = [
        { date: "Aug 15, 2026 (Today)", status: "Active (Working)", in: cur.lastCheckIn || "09:12 AM", out: "--:--", duration: "04h 32m", loc: cur.location || "New York, USA" },
        { date: "Aug 14, 2026 (Fri)", status: "On Time", in: "09:02 AM", out: "06:15 PM", duration: "09h 13m", loc: cur.location || "New York, USA" },
        { date: "Aug 13, 2026 (Thu)", status: "On Time", in: "08:55 AM", out: "06:30 PM", duration: "09h 35m", loc: cur.location || "New York, USA" },
        { date: "Aug 12, 2026 (Wed)", status: "Late Arrival", in: "09:40 AM", out: "06:45 PM", duration: "09h 05m", loc: cur.location || "New York, USA" },
        { date: "Aug 11, 2026 (Tue)", status: "Casual Leave", in: "--:--", out: "--:--", duration: "00h 00m", loc: "Approved Leave" },
        { date: "Aug 10, 2026 (Mon)", status: "On Time", in: "08:50 AM", out: "06:10 PM", duration: "09h 20m", loc: cur.location || "New York, USA" },
        { date: "Aug 07, 2026 (Fri)", status: "Overtime", in: "08:45 AM", out: "08:15 PM", duration: "11h 30m", loc: cur.location || "New York, USA" },
        { date: "Aug 06, 2026 (Thu)", status: "On Time", in: "09:05 AM", out: "06:00 PM", duration: "08h 55m", loc: cur.location || "New York, USA" },
        { date: "Aug 05, 2026 (Wed)", status: "Absent", in: "--:--", out: "--:--", duration: "00h 00m", loc: "Unexcused" },
        { date: "Aug 04, 2026 (Tue)", status: "On Time", in: "08:58 AM", out: "06:05 PM", duration: "09h 07m", loc: cur.location || "New York, USA" },
      ];

      sampleLogs.forEach((log) => {
        const tr = document.createElement("tr");
        let badgeClass = "badge-teal";
        if (log.status === "Absent") badgeClass = "badge-danger";
        else if (log.status === "Late Arrival") badgeClass = "badge-warning";
        else if (log.status === "Casual Leave") badgeClass = "badge-teamlead";
        else if (log.status.includes("Active")) badgeClass = "badge-admin";

        tr.innerHTML = `
          <td style="font-weight:600; color:var(--white);">${log.date}</td>
          <td><span class="badge ${badgeClass}" style="font-size:11px;">${log.status}</span></td>
          <td style="font-family:var(--font-mono); color:var(--white);">${log.in}</td>
          <td style="font-family:var(--font-mono); color:var(--mist);">${log.out}</td>
          <td style="font-family:var(--font-mono); color:#ccff00;">${log.duration}</td>
          <td style="color:var(--mist-dim); font-size:12.5px;">📍 ${log.loc}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // Leave Modal
  const modalLeave = document.getElementById("modal-leave");
  const btnOpenLeave = document.getElementById("btn-open-leave-modal");
  const btnCloseLeave = document.getElementById("btn-close-leave-modal");
  const formLeave = document.getElementById("form-submit-leave");

  if (btnOpenLeave && modalLeave) {
    btnOpenLeave.onclick = () => modalLeave.classList.remove("hidden");
  }
  if (btnCloseLeave && modalLeave) {
    btnCloseLeave.onclick = () => modalLeave.classList.add("hidden");
  }
  if (formLeave) {
    formLeave.onsubmit = (e) => {
      e.preventDefault();
      alert("✅ Leave request submitted successfully! Your team lead has been notified.");
      if (modalLeave) modalLeave.classList.add("hidden");
      formLeave.reset();
    };
  }

  renderAttendance();
});

