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

  let currentUser = window.TerraHireStore.getCurrentUser();

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

  function showToast(message, isError) {
    const toast = document.getElementById("status-toast-alert");
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = "block";
    toast.style.background = isError ? "rgba(248, 113, 113, 0.12)" : "rgba(52, 211, 153, 0.12)";
    toast.style.border = `1px solid ${isError ? "var(--err)" : "var(--success)"}`;
    toast.style.color = isError ? "var(--err)" : "var(--success)";
  }

  // ==========================================
  // TODAY'S CHECK-IN / CHECK-OUT STATUS CARD
  // ==========================================

  function renderStatusCard() {
    currentUser = window.TerraHireStore.getCurrentUser() || currentUser;
    const cur = currentUser;

    const statusDot = document.getElementById("status-dot");
    const statusWorkingText = document.getElementById("status-working-text");
    const statusDetailSubtext = document.getElementById("status-detail-subtext");
    const statusCheckinTime = document.getElementById("status-checkin-time");
    const statusCheckoutTime = document.getElementById("status-checkout-time");
    const statusLocationTag = document.getElementById("status-location-tag");
    const locationInput = document.getElementById("status-location-input");
    const btnCheckin = document.getElementById("btn-action-checkin");
    const btnCheckout = document.getElementById("btn-action-checkout");

    if (statusCheckinTime) statusCheckinTime.textContent = cur.lastCheckIn || "--:--";
    if (statusCheckoutTime) statusCheckoutTime.textContent = `Check-out: ${cur.lastCheckOut || "--:--"}`;
    if (statusLocationTag) statusLocationTag.textContent = `📍 Logged from ${cur.location || "Office"}`;
    if (locationInput && !locationInput.value) locationInput.value = cur.location || "Office";

    if (cur.isCheckedIn) {
      if (statusDot) statusDot.className = "status-dot-working";
      if (statusWorkingText) { statusWorkingText.textContent = "Working"; statusWorkingText.style.color = "var(--white)"; }
      if (statusDetailSubtext) statusDetailSubtext.textContent = "Current Status: Checked In (Working)";
      if (btnCheckin) { btnCheckin.disabled = true; btnCheckin.textContent = "Checked in ✓"; btnCheckin.classList.remove("active-btn"); }
      if (btnCheckout) { btnCheckout.disabled = false; btnCheckout.classList.add("active-btn"); }
    } else {
      if (statusDot) statusDot.className = "status-dot-offline";
      if (statusWorkingText) { statusWorkingText.textContent = "Not Working"; statusWorkingText.style.color = "var(--mist)"; }
      if (statusDetailSubtext) statusDetailSubtext.textContent = "Current Status: Checked Out (Offline)";
      if (btnCheckin) { btnCheckin.disabled = false; btnCheckin.textContent = "Check in"; btnCheckin.classList.add("active-btn"); }
      if (btnCheckout) { btnCheckout.disabled = true; btnCheckout.classList.remove("active-btn"); }
    }

    if (btnCheckin) {
      btnCheckin.onclick = () => {
        try {
          const location = (locationInput && locationInput.value.trim()) || "Office";
          const updated = window.TerraHireStore.checkIn(cur.id, location);
          window.TerraHireStore.setCurrentUser(updated);
          showToast(`✅ Checked in successfully at ${updated.lastCheckIn} — 📍 ${location}`);
          renderStatusCard();
          renderAttendance();
        } catch (error) {
          console.error("Check-in error:", error);
          showToast(`❌ ${error.message}`, true);
        }
      };
    }

    if (btnCheckout) {
      btnCheckout.onclick = () => {
        try {
          const updated = window.TerraHireStore.checkOut(cur.id);
          window.TerraHireStore.setCurrentUser(updated);
          showToast(`👋 Checked out successfully at ${updated.lastCheckOut}`);
          renderStatusCard();
          renderAttendance();
        } catch (error) {
          console.error("Check-out error:", error);
          showToast(`❌ ${error.message}`, true);
        }
      };
    }
  }

  function renderAttendance() {
    const cur = window.TerraHireStore.getCurrentUser() || currentUser;

    // ==========================================
    // COMPUTE REAL STATS FROM SAVED ATTENDANCE RECORDS
    // (for the current calendar month, up to today)
    // ==========================================

    const statsData = window.TerraHireStore.getStore();
    const statsRecords = Array.isArray(statsData.attendanceRecords) ? statsData.attendanceRecords : [];
    const statsUserRecords = statsRecords.filter(record => record.userId === cur.id);

    const statsNow = new Date();
    const year = statsNow.getFullYear();
    const month = statsNow.getMonth();
    const todayDate = statsNow.getDate();

    let totalWorking = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    let overtimeMinutes = 0;

    for (let day = 1; day <= todayDate; day++) {
      const cellDate = new Date(year, month, day);
      const dayOfWeek = cellDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend) continue;

      totalWorking++;

      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const record = statsUserRecords.find(r => r.date === dateStr);

      if (record && record.checkInTimestamp) {
        present++;

        const checkInDate = new Date(record.checkInTimestamp);
        if (checkInDate.getHours() > 9 || (checkInDate.getHours() === 9 && checkInDate.getMinutes() > 15)) {
          late++;
        }

        const minutes = Number(record.durationMinutes || 0);
        if (minutes > 8 * 60) overtimeMinutes += (minutes - 8 * 60);
      } else {
        absent++;
      }
    }

    const leave = 0; // Leave requests are informational only in this demo; not tracked against attendance yet.
    const overtime = `${(overtimeMinutes / 60).toFixed(1)} hrs`;
    const attRate = totalWorking ? Math.round((present / totalWorking) * 100) : 0;

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

    const now = new Date();

    const monthName =
      now.toLocaleDateString(
        "en-IN",
        {
          month: "long",
          year: "numeric"
        }
      );

    const monthTitle =
      document.getElementById(
        "attendance-month-title"
      );

    const calendarTitle =
      document.getElementById(
        "attendance-calendar-title"
      );

    if (monthTitle) {
      monthTitle.textContent =
        `📊 Current Month Summary (${monthName})`;
    }

    if (calendarTitle) {
      calendarTitle.textContent =
        `Monthly Calendar Overview — ${monthName}`;
    }
    if (calGrid) {
      calGrid.innerHTML = "";
      const daysOfWeek =
        ["M", "T", "W", "T", "F", "S", "S"];

      daysOfWeek.forEach((d) => {
        const headerCell = document.createElement("div");
        headerCell.className = "calendar-day-cell header-cell";
        headerCell.textContent = d;
        calGrid.appendChild(headerCell);
      });


      const year =
        now.getFullYear();

      const month =
        now.getMonth();

      const daysInMonth =
        new Date(
          year,
          month + 1,
          0
        ).getDate();

      const firstDay =
        new Date(
          year,
          month,
          1
        ).getDay();

      // Convert Sunday-first to Monday-first
      const mondayFirst =
        firstDay === 0
          ? 6
          : firstDay - 1;

      const data =
        window.TerraHireStore.getStore();

      const records =
        Array.isArray(data.attendanceRecords)
          ? data.attendanceRecords
          : [];

      const userRecords =
        records.filter(
          record =>
            record.userId === cur.id
        );




      daysOfWeek.forEach(dayName => {

        const header =
          document.createElement("div");

        header.className =
          "calendar-day-cell header-cell";

        header.textContent =
          dayName;

        calGrid.appendChild(header);
      });


      // Empty cells before day 1
      for (
        let i = 0;
        i < mondayFirst;
        i++
      ) {

        const empty =
          document.createElement("div");

        empty.className =
          "calendar-day-cell empty-cell";

        calGrid.appendChild(empty);
      }


      // Actual days
      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {

        const cell =
          document.createElement("div");

        cell.className =
          "calendar-day-cell";

        cell.textContent =
          day;

        const date =
          `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const record =
          userRecords.find(
            r => r.date === date
          );

        const cellDate =
          new Date(
            year,
            month,
            day
          );

        const dayOfWeek =
          cellDate.getDay();

        const isWeekend =
          dayOfWeek === 0 ||
          dayOfWeek === 6;

        let status = "future";

        let tooltip =
          `${date}: No attendance record.`;

        if (record) {

          if (
            record.status === "Active"
          ) {

            status = "today";

            tooltip =
              `${date}: Checked in at ${new Date(
                record.checkIn
              ).toLocaleTimeString(
                "en-IN",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true
                }
              )}. Currently working.`;

          } else {

            status = "present";

            tooltip =
              `${date}: Checked in and checked out.`;
          }

        } else if (isWeekend) {

          status = "weekend";

          tooltip =
            `${date}: Weekend.`;

        } else if (
          cellDate < new Date(
            year,
            month,
            now.getDate()
          )
        ) {

          status = "absent";

          tooltip =
            `${date}: No attendance recorded.`;
        }

        cell.classList.add(
          `day-${status}`
        );

        cell.title =
          tooltip;

        cell.addEventListener(
          "click",
          () => {

            if (
              detailBox &&
              detailTitle &&
              detailBody
            ) {

              detailBox.style.display =
                "block";

              detailTitle.textContent =
                date;

              detailBody.textContent =
                tooltip;
            }
          }
        );

        calGrid.appendChild(cell);
      }

    }

    // ==========================================
    // RENDER REAL ATTENDANCE LOGS
    // ==========================================

    const tbody =
      document.getElementById("att-logs-tbody");

    if (tbody) {

      tbody.innerHTML = "";

      const data =
        window.TerraHireStore.getStore();

      const records =
        Array.isArray(data.attendanceRecords)
          ? data.attendanceRecords
          : [];

      const userRecords =
        records
          .filter(
            record =>
              record.userId === cur.id
          )
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date)
          );

      userRecords.forEach(record => {

        const tr =
          document.createElement("tr");

        const checkIn =
          record.checkIn
            ? new Date(
              record.checkIn
            ).toLocaleTimeString(
              "en-IN",
              {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
              }
            )
            : "--:--";

        const checkOut =
          record.checkOut
            ? new Date(
              record.checkOut
            ).toLocaleTimeString(
              "en-IN",
              {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
              }
            )
            : "--:--";

        const minutes =
          Number(
            record.durationMinutes || 0
          );

        const hours =
          Math.floor(minutes / 60);

        const mins =
          minutes % 60;

        const duration =
          `${String(hours).padStart(2, "0")}h ` +
          `${String(mins).padStart(2, "0")}m`;

        let status =
          record.status || "Present";

        let badgeClass =
          "badge-teal";

        if (status === "Active") {
          badgeClass = "badge-admin";
        }

        if (status === "Completed") {
          badgeClass = "badge-teal";
        }

        const formattedDate =
          new Date(
            record.date + "T00:00:00"
          ).toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "short",
              year: "numeric"
            }
          );

        tr.innerHTML = `
            <td style="
                font-weight:600;
                color:var(--white);
            ">
                ${formattedDate}
            </td>

            <td>
                <span
                    class="badge ${badgeClass}"
                    style="font-size:11px;"
                >
                    ${status}
                </span>
            </td>

            <td style="
                font-family:var(--font-mono);
                color:var(--white);
            ">
                ${checkIn}
            </td>

            <td style="
                font-family:var(--font-mono);
                color:var(--mist);
            ">
                ${checkOut}
            </td>

            <td style="
                font-family:var(--font-mono);
                color:#ccff00;
            ">
                ${duration}
            </td>

            <td style="
                color:var(--mist-dim);
                font-size:12.5px;
            ">
                📍 ${record.location || "Office"}
            </td>
        `;

        tbody.appendChild(tr);
      });


      // No attendance records
      if (userRecords.length === 0) {

        const tr =
          document.createElement("tr");

        tr.innerHTML = `
            <td
                colspan="6"
                style="
                    text-align:center;
                    padding:30px;
                    color:var(--mist);
                "
            >
                No attendance records found.
            </td>
        `;

        tbody.appendChild(tr);
      }
    }

  }

  // ==========================================
  // LEAVE MANAGEMENT — balance, requests, approvals
  // ==========================================

  function formatLeaveDate(dateStr) {
    if (!dateStr) return "--";
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    });
  }

  function formatLeaveRange(request) {
    if (request.startDate === request.endDate) return formatLeaveDate(request.startDate);
    return `${formatLeaveDate(request.startDate)} → ${formatLeaveDate(request.endDate)}`;
  }

  function leaveStatusBadgeStyle(status) {
    if (status === "Approved") return 'class="badge badge-active" style="font-size:11px;"';
    if (status === "Rejected") return 'class="badge" style="font-size:11px; background:rgba(248,113,113,0.12); color:var(--err); border:1px solid rgba(248,113,113,0.3);"';
    if (status === "Withdrawn") return 'class="badge" style="font-size:11px; background:rgba(255,255,255,0.06); color:var(--mist); border:1px solid var(--line);"';
    return 'class="badge badge-admin" style="font-size:11px;"'; // Pending
  }

  function renderLeaveBalance() {
    const cur = window.TerraHireStore.getCurrentUser() || currentUser;
    const balance = window.TerraHireStore.getLeaveBalance(cur.id);

    const yearBadge = document.getElementById("leave-badge-year");
    const statQuota = document.getElementById("leave-stat-quota");
    const statUsed = document.getElementById("leave-stat-used");
    const statPending = document.getElementById("leave-stat-pending");
    const statRemaining = document.getElementById("leave-stat-remaining");
    const summaryText = document.getElementById("leave-summary-text");

    if (yearBadge) yearBadge.textContent = balance.year;
    if (statQuota) statQuota.textContent = balance.quota;
    if (statUsed) statUsed.textContent = balance.usedApproved;
    if (statPending) statPending.textContent = balance.pendingDays;
    if (statRemaining) statRemaining.textContent = balance.remaining;

    if (summaryText) {
      summaryText.textContent =
        `You have ${balance.remaining} of ${balance.quota} leaves remaining this year. ` +
        `${balance.pendingDays > 0 ? `${balance.pendingDays} day(s) are still pending a decision — if all are approved, ${balance.remainingAfterPending} would remain. ` : ""}` +
        `If you take a leave today, ${balance.remainingIfTakeOneToday} day(s) would be left.`;
    }

    // Sync the modal's live balance note too
    const modalRemaining = document.getElementById("leave-modal-remaining");
    const modalQuota = document.getElementById("leave-modal-quota");
    if (modalRemaining) modalRemaining.textContent = balance.remaining;
    if (modalQuota) modalQuota.textContent = balance.quota;

    return balance;
  }

  function renderMyLeaveRequests() {
    const cur = window.TerraHireStore.getCurrentUser() || currentUser;
    const tbody = document.getElementById("my-leave-requests-tbody");
    if (!tbody) return;

    const requests = window.TerraHireStore.getLeaveRequestsForMember(cur.id);
    tbody.innerHTML = "";

    if (requests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:26px; color:var(--mist);">
            No leave requests yet.
          </td>
        </tr>`;
      return;
    }

    requests.forEach((request) => {
      const tr = document.createElement("tr");
      const decidedBy = request.decidedByName
        ? `${request.decidedByName}${request.decidedByRole ? ` (${request.decidedByRole})` : ""}`
        : "—";

      const withdrawBtn = request.status === "Pending"
        ? `<button class="btn btn-ghost btn-sm" style="font-size:11.5px;" data-withdraw-id="${request.id}">Withdraw</button>`
        : "";

      tr.innerHTML = `
        <td style="color:var(--mist); font-size:12.5px;">${formatLeaveDate(request.submittedAt.slice(0, 10))}</td>
        <td>${request.type}</td>
        <td>${formatLeaveRange(request)}</td>
        <td>${request.days}</td>
        <td><span ${leaveStatusBadgeStyle(request.status)}>${request.status}</span></td>
        <td style="font-size:12.5px; color:var(--mist);">${decidedBy}</td>
        <td>${withdrawBtn}</td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("[data-withdraw-id]").forEach((btn) => {
      btn.onclick = () => {
        try {
          window.TerraHireStore.cancelLeaveRequest(btn.getAttribute("data-withdraw-id"));
          showToast("🗑️ Leave request withdrawn.");
          renderLeaveBalance();
          renderMyLeaveRequests();
          renderLeaveApprovals();
          renderAttendance();
        } catch (error) {
          showToast(`❌ ${error.message}`, true);
        }
      };
    });
  }

  function renderLeaveApprovals() {
    const cur = window.TerraHireStore.getCurrentUser() || currentUser;
    const card = document.getElementById("card-leave-approvals");
    const tbody = document.getElementById("leave-approvals-tbody");
    const countLabel = document.getElementById("leave-approvals-count");
    if (!card || !tbody) return;

    const canApproveAnything = ["manager", "executive", "admin"].includes(cur.roleType);
    if (!canApproveAnything) {
      card.style.display = "none";
      return;
    }

    const pending = window.TerraHireStore.getPendingLeaveApprovalsFor(cur.id);
    card.style.display = "block";
    if (countLabel) countLabel.textContent = `${pending.length} awaiting your decision`;
    tbody.innerHTML = "";

    if (pending.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:26px; color:var(--mist);">
            Nothing waiting on your approval right now.
          </td>
        </tr>`;
      return;
    }

    pending.forEach((request) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:600; color:var(--white);">${request.memberName}</td>
        <td style="font-size:12.5px; color:var(--mist); text-transform:capitalize;">${request.memberRole}</td>
        <td>${request.type}</td>
        <td>${formatLeaveRange(request)}</td>
        <td>${request.days}</td>
        <td style="font-size:12.5px; color:var(--mist); max-width:220px;">${request.reason}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-primary btn-sm" style="font-size:11.5px; margin-right:6px;" data-approve-id="${request.id}">Approve</button>
          <button class="btn btn-ghost btn-sm" style="font-size:11.5px;" data-reject-id="${request.id}">Reject</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("[data-approve-id]").forEach((btn) => {
      btn.onclick = () => {
        try {
          window.TerraHireStore.decideLeaveRequest(btn.getAttribute("data-approve-id"), "Approved");
          showToast("✅ Leave request approved.");
          renderLeaveBalance();
          renderMyLeaveRequests();
          renderLeaveApprovals();
          renderAttendance();
        } catch (error) {
          showToast(`❌ ${error.message}`, true);
        }
      };
    });
    tbody.querySelectorAll("[data-reject-id]").forEach((btn) => {
      btn.onclick = () => {
        try {
          window.TerraHireStore.decideLeaveRequest(btn.getAttribute("data-reject-id"), "Rejected");
          showToast("🚫 Leave request rejected.");
          renderLeaveBalance();
          renderMyLeaveRequests();
          renderLeaveApprovals();
          renderAttendance();
        } catch (error) {
          showToast(`❌ ${error.message}`, true);
        }
      };
    });
  }

  // Leave Modal
  const modalLeave = document.getElementById("modal-leave");
  const btnOpenLeave = document.getElementById("btn-open-leave-modal");
  const btnCloseLeave = document.getElementById("btn-close-leave-modal");
  const formLeave = document.getElementById("form-submit-leave");
  const leaveStartInput = document.getElementById("leave-input-start-date");
  const leaveEndInput = document.getElementById("leave-input-end-date");
  const leaveDaysPreview = document.getElementById("leave-modal-days-preview");

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function updateLeaveDaysPreview() {
    if (!leaveDaysPreview || !leaveStartInput || !leaveEndInput) return;
    const start = leaveStartInput.value;
    const end = leaveEndInput.value || start;
    if (!start) { leaveDaysPreview.textContent = ""; return; }

    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    const days = endDate >= startDate ? Math.round((endDate - startDate) / 86400000) + 1 : 0;

    const cur = window.TerraHireStore.getCurrentUser() || currentUser;
    const balance = window.TerraHireStore.getLeaveBalance(cur.id);
    const wouldRemain = Math.max(0, balance.remaining - days);

    if (days <= 0) {
      leaveDaysPreview.textContent = "‘To’ date must be on or after the ‘From’ date.";
      leaveDaysPreview.style.color = "var(--err)";
    } else if (days > balance.remaining) {
      leaveDaysPreview.textContent = `${days} day(s) requested — exceeds your ${balance.remaining} remaining leave(s).`;
      leaveDaysPreview.style.color = "var(--err)";
    } else {
      leaveDaysPreview.textContent = `${days} day(s) requested · ${wouldRemain} will remain after approval`;
      leaveDaysPreview.style.color = "var(--mist-dim)";
    }
  }

  if (btnOpenLeave && modalLeave) {
    btnOpenLeave.onclick = () => {
      if (leaveStartInput) leaveStartInput.value = todayISO();
      if (leaveEndInput) leaveEndInput.value = todayISO();
      renderLeaveBalance();
      updateLeaveDaysPreview();
      modalLeave.classList.remove("hidden");
    };
  }
  if (btnCloseLeave && modalLeave) {
    btnCloseLeave.onclick = () => modalLeave.classList.add("hidden");
  }
  if (leaveStartInput) leaveStartInput.addEventListener("change", updateLeaveDaysPreview);
  if (leaveEndInput) leaveEndInput.addEventListener("change", updateLeaveDaysPreview);

  if (formLeave) {
    formLeave.onsubmit = (e) => {
      e.preventDefault();
      try {
        const cur = window.TerraHireStore.getCurrentUser() || currentUser;
        const type = document.getElementById("leave-input-type").value;
        const startDate = leaveStartInput.value;
        const endDate = leaveEndInput.value || startDate;
        const reason = document.getElementById("leave-input-reason").value;

        const request = window.TerraHireStore.submitLeaveRequest({
          memberId: cur.id, type, startDate, endDate, reason,
        });

        const message = request.status === "Approved"
          ? `✅ Leave auto-approved (${request.days} day(s)).`
          : `📨 Leave request submitted (${request.days} day(s)) — pending approval from your ${(request.requiredApproverRoles || []).join(" or ")}.`;

        showToast(message);
        modalLeave.classList.add("hidden");
        formLeave.reset();

        renderLeaveBalance();
        renderMyLeaveRequests();
        renderLeaveApprovals();
        renderAttendance();
      } catch (error) {
        showToast(`❌ ${error.message}`, true);
      }
    };
  }

  renderStatusCard();
  renderAttendance();
  renderLeaveBalance();
  renderMyLeaveRequests();
  renderLeaveApprovals();

  // Keep the live status card in sync (e.g. if checked in from employee.html
  // in another tab) every 30s, matching the working-hours refresh cadence.
  setInterval(renderStatusCard, 30000);
});