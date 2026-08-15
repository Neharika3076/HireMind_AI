/**
 * TerraHire — Workday Dashboard & Member Portal Logic
 * Handles Profile & Current Status Card, Real-time Clock, Check In/Out,
 * Attendance Summary & Mini Calendar, Task Summary & Interactive Progress Gauge
 */

document.addEventListener("DOMContentLoaded", () => {
  const store = window.TerraHireStore ? window.TerraHireStore.getStore() : null;
  if (!store) return;

  let currentUser = window.TerraHireStore.getCurrentUser();

  // If no user logged in, default to Sarah Johnson (usr_sarah) for executive workday preview
  if (!currentUser) {
    currentUser = store.members.find((m) => m.id === "usr_sarah") || store.members.find((m) => m.email === "sarah.johnson@acme.in") || store.members[1];
    window.TerraHireStore.setCurrentUser(currentUser);
  }

  // Timer interval reference
  let timerInterval = null;

  // Initialize Switch Member Selector if present
  const memberSelect = document.getElementById("select-switch-member");
  if (memberSelect) {
    memberSelect.value = currentUser ? currentUser.id : "usr_sarah";
    memberSelect.onchange = (e) => {
      const s = window.TerraHireStore.getStore();
      const target = s.members.find((m) => m.id === e.target.value);
      if (target) {
        window.TerraHireStore.setCurrentUser(target);
        currentUser = target;
        renderAll();
      }
    };
  }

  // Admin Quick Switch Button
  const btnAdmin = document.getElementById("btn-quick-admin-switch");
  if (btnAdmin) {
    btnAdmin.onclick = () => {
      window.location.href = "./admin.html";
    };
  }

  // Sign out button
  const logoutBtn = document.getElementById("btn-emp-logout");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      window.TerraHireStore.setCurrentUser(null);
      window.location.href = "./login.html";
    };
  }

  // Top Nav Items smooth scrolling / active class
  document.querySelectorAll(".workday-nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      document.querySelectorAll(".workday-nav-item").forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // Main Render Function
  function renderAll() {
    const s = window.TerraHireStore.getStore();
    const cur = window.TerraHireStore.getCurrentUser() || currentUser;
    if (!cur) return;

    const org = s.organizations.find((o) => o.id === cur.orgId) || { name: "Acme Corporation", code: "ACME" };
    const proj = s.projects.find((p) => p.id === cur.projectId || p.code === cur.projectCode) || {
      name: "Billing System Revamp",
      code: cur.projectCode || "BILL-01",
      pmName: cur.reportingManager || "Kavita Rao",
      status: "In Progress",
      desc: "Distributed multi-currency payroll queues.",
    };

    // 1. Sidebar Chip
    const sbAvatar = document.getElementById("sidebar-user-avatar");
    const sbName = document.getElementById("sidebar-user-name");
    const sbRole = document.getElementById("sidebar-user-role");
    if (sbAvatar) sbAvatar.textContent = cur.fullName.charAt(0);
    if (sbName) sbName.textContent = cur.fullName;
    if (sbRole) sbRole.textContent = cur.designation || cur.roleCategory || "Member";

    // 2. Greeting
    const greetingEl = document.getElementById("greeting-text");
    if (greetingEl) {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
      const firstName = cur.fullName.split(" ")[0];
      greetingEl.textContent = `Good ${timeOfDay}, ${firstName}.`;
    }

    // 3. Profile & Work Coordinates Card
    const heroAvatar = document.getElementById("hero-avatar");
    const heroAvatarBadge = document.getElementById("hero-avatar-badge");
    const heroName = document.getElementById("hero-name");
    const heroRoleTitle = document.getElementById("hero-role-title");
    const heroLocationText = document.getElementById("hero-location-text");
    const heroStatusPill = document.getElementById("hero-status-pill");
    const heroStatusPillText = document.getElementById("hero-status-pill-text");
    const heroRoleCat = document.getElementById("hero-role-cat");
    const heroOrgName = document.getElementById("hero-org-name");
    const heroProjName = document.getElementById("hero-proj-name");
    const heroDeptName = document.getElementById("hero-dept-name");

    if (heroAvatar) heroAvatar.textContent = cur.fullName.charAt(0);
    if (heroName) heroName.textContent = cur.fullName;
    if (heroRoleTitle) heroRoleTitle.textContent = cur.designation || "Product Designer";
    if (heroLocationText) heroLocationText.textContent = cur.location || "New York, USA";
    if (heroRoleCat) heroRoleCat.textContent = cur.roleCategory || (cur.roleType === "admin" ? "Admin" : "Employee");
    if (heroOrgName) heroOrgName.textContent = `${org.name} (${org.code})`;
    if (heroProjName) heroProjName.textContent = `${proj.name} [${proj.code}]`;
    if (heroDeptName) heroDeptName.textContent = cur.department || "Product Experience";

    if (cur.isCheckedIn) {
      if (heroAvatarBadge) {
        heroAvatarBadge.style.background = "var(--success)";
        heroAvatarBadge.title = "Checked In (Working)";
      }
      if (heroStatusPillText) heroStatusPillText.textContent = "Checked In (Working)";
      if (heroStatusPill) {
        heroStatusPill.style.background = "rgba(52, 211, 153, 0.15)";
        heroStatusPill.style.color = "var(--success)";
      }
    } else {
      if (heroAvatarBadge) {
        heroAvatarBadge.style.background = "var(--mist-dim)";
        heroAvatarBadge.title = "Checked Out (Offline)";
      }
      if (heroStatusPillText) heroStatusPillText.textContent = "Checked Out";
      if (heroStatusPill) {
        heroStatusPill.style.background = "rgba(255, 255, 255, 0.06)";
        heroStatusPill.style.color = "var(--mist)";
      }
    }

    // 4. Status & Real-Time Working Hours Tracker
    const statusDot = document.getElementById("status-dot");
    const statusWorkingText = document.getElementById("status-working-text");
    const statusDetailSubtext = document.getElementById("status-detail-subtext");
    const statusCheckinTime = document.getElementById("status-checkin-time");
    const statusCheckoutTime = document.getElementById("status-checkout-time");
    const statusLocationTag = document.getElementById("status-location-tag");
    const btnCheckin = document.getElementById("btn-action-checkin");
    const btnCheckout = document.getElementById("btn-action-checkout");

    if (statusCheckinTime) statusCheckinTime.textContent = cur.lastCheckIn || "09:12 AM";
    if (statusCheckoutTime) statusCheckoutTime.textContent = `Check-out: ${cur.lastCheckOut || "--:--"}`;
    if (statusLocationTag) statusLocationTag.textContent = `📍 Logged from ${cur.location || "New York, USA"}`;

    if (cur.isCheckedIn) {
      if (statusDot) {
        statusDot.className = "status-dot-working";
      }
      if (statusWorkingText) {
        statusWorkingText.textContent = "Working";
        statusWorkingText.style.color = "var(--white)";
      }
      if (statusDetailSubtext) statusDetailSubtext.textContent = "Current Status: Checked In (Working)";

      if (btnCheckin) {
        btnCheckin.disabled = true;
        btnCheckin.textContent = "Checked in ✓";
        btnCheckin.classList.remove("active-btn");
      }
      if (btnCheckout) {
        btnCheckout.disabled = false;
        btnCheckout.classList.add("active-btn");
      }
    } else {
      if (statusDot) {
        statusDot.className = "status-dot-offline";
      }
      if (statusWorkingText) {
        statusWorkingText.textContent = "Not Working";
        statusWorkingText.style.color = "var(--mist)";
      }
      if (statusDetailSubtext) statusDetailSubtext.textContent = "Current Status: Checked Out (Offline)";

      if (btnCheckin) {
        btnCheckin.disabled = false;
        btnCheckin.textContent = "Check in";
        btnCheckin.classList.add("active-btn");
      }
      if (btnCheckout) {
        btnCheckout.disabled = true;
        btnCheckout.classList.remove("active-btn");
      }
    }

    // Start Live Clock
    startWorkingHoursTimer(cur);

    // 5. Check in / Check out Action Handlers
    if (btnCheckin) {
      btnCheckin.onclick = () => {
        const updated = window.TerraHireStore.checkIn(cur.id, cur.location);
        if (updated) {
          window.TerraHireStore.setCurrentUser(updated);
          showToast(`✅ Checked in successfully at ${updated.lastCheckIn}`);
          renderAll();
        }
      };
    }

    if (btnCheckout) {
      btnCheckout.onclick = () => {
        const updated = window.TerraHireStore.checkOut(cur.id);
        if (updated) {
          window.TerraHireStore.setCurrentUser(updated);
          showToast(`👋 Checked out successfully at ${updated.lastCheckOut}`);
          renderAll();
        }
      };
    }

    // 6. Metrics & Tasks
    renderTasksAndMetrics(cur, s);

    // 7. Attendance Summary & Mini Calendar
    renderAttendanceSummary(cur);

    // 8. Leadership, Teammates & Referrals
    renderLeadershipAndTeammates(cur, s, proj);
    renderReferrals();
  }

  function startWorkingHoursTimer(user) {
    if (timerInterval) clearInterval(timerInterval);

    const timerEl = document.getElementById("live-hours-timer");
    if (!timerEl) return;

    if (!user.isCheckedIn || !user.checkInTimestamp) {
      timerEl.textContent = "00h 00m 00s";
      return;
    }

    function update() {
      const now = Date.now();
      const diffMs = Math.max(0, now - user.checkInTimestamp);
      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      const hh = String(hours).padStart(2, "0");
      const mm = String(mins).padStart(2, "0");
      const ss = String(secs).padStart(2, "0");

      timerEl.textContent = `${hh}h ${mm}m ${ss}s`;
    }

    update();
    timerInterval = setInterval(update, 1000);
  }

  function renderTasksAndMetrics(user, state) {
    const allTasks = state.tasks || [];
    const userTasks = allTasks.filter((t) => t.memberId === user.id);

    // If user has no tasks yet, provide default tasks
    const tasksToDisplay = userTasks.length > 0 ? userTasks : [
      { id: "def_1", title: "Design System Review", priority: "High", completed: true },
      { id: "def_2", title: "Wireframe User Flow", priority: "Medium", completed: false },
      { id: "def_3", title: "Component Accessibility Audit", priority: "High", completed: true },
      { id: "def_4", title: "Design Tokens Synchronization", priority: "Medium", completed: true },
      { id: "def_5", title: "Sprint Retrospective Documentation", priority: "Low", completed: false },
    ];

    const completedTasks = tasksToDisplay.filter((t) => t.completed).length;
    const totalTasks = tasksToDisplay.length;
    const pendingTasks = totalTasks - completedTasks;
    const overdueTasks = tasksToDisplay.filter((t) => t.overdue && !t.completed).length;

    // Attendance Rate Calculation
    const present = user.daysPresent || 20;
    const absent = user.daysAbsent || 1;
    const leave = user.daysOnLeave || 1;
    const totalLogged = present + absent + leave;
    const attRate = Math.round((present / totalLogged) * 100);

    const metricAttRate = document.getElementById("metric-att-rate");
    const metricAttSub = document.getElementById("metric-att-sub");
    if (metricAttRate) metricAttRate.textContent = `${attRate}%`;
    if (metricAttSub) metricAttSub.textContent = `${present} Days Present · ${absent} Absent · ${leave} Leave`;

    // Completed Work Metric
    const metricCompletedCount = document.getElementById("metric-completed-count");
    const metricCompletedSub = document.getElementById("metric-completed-sub");
    if (metricCompletedCount) metricCompletedCount.textContent = completedTasks;
    if (metricCompletedSub) metricCompletedSub.textContent = `Out of ${totalTasks} Assigned Tasks`;

    // Circular Progress Ring
    const progressPercent = Math.round((completedTasks / totalTasks) * 100) || 0;
    const circleEl = document.getElementById("tasks-progress-circle");
    const percentEl = document.getElementById("tasks-progress-percent");

    if (percentEl) percentEl.textContent = `${progressPercent}%`;
    if (circleEl) {
      const circumference = 251.2;
      const offset = circumference - (circumference * progressPercent) / 100;
      circleEl.style.strokeDashoffset = offset;
    }

    // Task Summary Breakdown Numbers
    const taskStatAssigned = document.getElementById("task-stat-assigned");
    const taskStatCompleted = document.getElementById("task-stat-completed");
    const taskStatPending = document.getElementById("task-stat-pending");
    const taskStatOverdue = document.getElementById("task-stat-overdue");

    if (taskStatAssigned) taskStatAssigned.textContent = totalTasks;
    if (taskStatCompleted) taskStatCompleted.textContent = completedTasks;
    if (taskStatPending) taskStatPending.textContent = pendingTasks;
    if (taskStatOverdue) taskStatOverdue.textContent = overdueTasks;

    // Populate Task Items
    const container = document.getElementById("task-items-container");
    if (container) {
      container.innerHTML = "";
      tasksToDisplay.forEach((task) => {
        const row = document.createElement("div");
        row.className = "task-item-row";
        row.innerHTML = `
          <label class="task-item-left">
            <input type="checkbox" ${task.completed ? "checked" : ""} data-task-id="${task.id}">
            <span class="task-item-title ${task.completed ? "completed" : ""}">${task.title}</span>
          </label>
          <span class="task-priority-tag ${task.priority || "Medium"}">${task.priority || "Medium"}</span>
        `;

        const checkInp = row.querySelector("input");
        checkInp.addEventListener("change", () => {
          window.TerraHireStore.toggleTask(task.id);
          renderAll();
        });

        container.appendChild(row);
      });
    }
  }

  function renderAttendanceSummary(user) {
    const totalWorking = user.workingDaysInMonth || 22;
    const present = user.daysPresent || 20;
    const absent = user.daysAbsent || 1;
    const leave = user.daysOnLeave || 1;
    const late = user.lateArrivals || 2;
    const overtime = user.overtimeHours ? `${user.overtimeHours} hrs` : "5.5 hrs";

    const statWorking = document.getElementById("stat-total-working-days");
    const statPresent = document.getElementById("stat-days-present");
    const statAbsent = document.getElementById("stat-days-absent");
    const statLeave = document.getElementById("stat-days-leave");
    const statLate = document.getElementById("stat-late-arrivals");
    const statOvertime = document.getElementById("stat-overtime-hours");

    if (statWorking) statWorking.textContent = totalWorking;
    if (statPresent) statPresent.textContent = present;
    if (statAbsent) statAbsent.textContent = absent;
    if (statLeave) statLeave.textContent = leave;
    if (statLate) statLate.textContent = late;
    if (statOvertime) statOvertime.textContent = overtime;

    // Mini Monthly Calendar Grid (August 2026: 31 days)
    const calGrid = document.getElementById("attendance-calendar-grid");
    const detailBox = document.getElementById("calendar-day-detail-box");
    const detailTitle = document.getElementById("cal-detail-title");
    const detailBody = document.getElementById("cal-detail-body");

    if (calGrid) {
      calGrid.innerHTML = "";

      // Day of week headers
      const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
      daysOfWeek.forEach((d) => {
        const head = document.createElement("div");
        head.className = "cal-day-name";
        head.textContent = d;
        calGrid.appendChild(head);
      });

      // August 2026 starts on Saturday (5 empty slots for Mon-Fri)
      for (let pad = 0; pad < 5; pad++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "cal-day-cell weekend";
        emptyCell.style.opacity = "0.15";
        calGrid.appendChild(emptyCell);
      }

      // Populate 31 days of August 2026
      for (let day = 1; day <= 31; day++) {
        const cell = document.createElement("div");
        cell.className = "cal-day-cell";
        cell.textContent = day;

        // Day of week for August 2026 (Aug 1 is Sat)
        const dayOfWeekIndex = (5 + (day - 1)) % 7; // 5=Sat, 6=Sun
        const isWeekend = dayOfWeekIndex === 5 || dayOfWeekIndex === 6;

        let statusText = "Present";
        let detailMsg = `Full workday logged (9h 15m). Checked in: 09:00 AM, Out: 06:15 PM.`;

        if (isWeekend) {
          cell.classList.add("weekend");
          statusText = "Weekend";
          detailMsg = "Non-working weekend.";
        } else if (day === 15) {
          cell.classList.add("today");
          cell.classList.add("present");
          detailMsg = `Today: Checked in at ${user.lastCheckIn || "09:12 AM"}. Active workday session.`;
        } else if (day === 6) {
          cell.classList.add("absent");
          statusText = "Absent";
          detailMsg = "Unexcused absence recorded.";
        } else if (day === 11) {
          cell.classList.add("leave");
          statusText = "Leave";
          detailMsg = "Approved annual casual leave.";
        } else if (day < 15) {
          cell.classList.add("present");
          if (day === 4 || day === 12) {
            detailMsg = "Late arrival (09:42 AM). Full 8.5h workday completed.";
          }
        } else {
          // Upcoming days
          cell.style.opacity = "0.7";
          detailMsg = "Upcoming scheduled working day.";
        }

        cell.addEventListener("click", () => {
          if (detailBox && detailTitle && detailBody) {
            detailBox.style.display = "block";
            detailTitle.textContent = `Aug ${day} (${statusText}):`;
            detailBody.textContent = detailMsg;
          }
        });

        calGrid.appendChild(cell);
      }
    }
  }

  function renderLeadershipAndTeammates(cur, s, proj) {
    const teamPmVal = document.getElementById("team-pm-val");
    const teamLeadVal = document.getElementById("team-lead-val");
    const teamHeadVal = document.getElementById("team-head-val");

    if (teamPmVal) teamPmVal.textContent = proj.pmName || cur.reportingManager || "Kavita Rao";
    if (teamLeadVal) teamLeadVal.textContent = cur.reportingTeamLead || "Liam Cooper";
    if (teamHeadVal) teamHeadVal.textContent = cur.headOfDept || "Claire Vance";

    const tmList = document.getElementById("emp-teammates-list");
    if (tmList) {
      tmList.innerHTML = "";
      const peers = s.members.filter((m) => m.id !== cur.id);
      if (peers.length === 0) {
        tmList.innerHTML = '<li style="color:var(--mist-dim); font-size:12px;">No other peers in cluster.</li>';
      } else {
        peers.slice(0, 3).forEach((peer) => {
          const li = document.createElement("li");
          li.style.display = "flex";
          li.style.alignItems = "center";
          li.style.justifyContent = "space-between";
          li.style.padding = "4px 0";
          li.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:20px; height:20px; border-radius:5px; background:rgba(45,212,191,0.2); color:var(--teal-300); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">${peer.fullName.charAt(0)}</div>
              <span style="font-weight:500; font-size:12.5px; color:var(--white);">${peer.fullName}</span>
            </div>
            <span style="color:var(--mist-dim); font-size:11.5px;">${peer.designation || peer.roleType}</span>
          `;
          tmList.appendChild(li);
        });
      }
    }
  }

  function renderReferrals() {
    const s = window.TerraHireStore.getStore();
    const cur = window.TerraHireStore.getCurrentUser() || currentUser;
    const tbody = document.getElementById("emp-referrals-tbody");
    if (!tbody || !cur) return;
    tbody.innerHTML = "";

    const refs = (s.referrals || []).filter((r) => r.referrerId === cur.id || !r.referrerId);
    if (refs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--mist-dim); padding:14px;">No referrals submitted yet. Submit a peer above!</td></tr>';
    } else {
      refs.forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${r.candidateName}</strong></td>
          <td>${r.role}</td>
          <td><span class="badge ${r.status === "Hired" ? "badge-active" : "badge-teal"}">${r.status}</span></td>
          <td style="color:var(--teal-300); font-weight:700;">${r.bonus}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  function showToast(message) {
    const toast = document.getElementById("status-toast-alert");
    const toastMsg = document.getElementById("status-toast-msg");
    const toastTime = document.getElementById("status-toast-time");
    if (toast && toastMsg) {
      toastMsg.textContent = message;
      if (toastTime) {
        const now = new Date();
        toastTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      toast.style.display = "flex";
      toast.style.animation = "fade-up 0.4s var(--ease-premium)";
    }
  }

  // Referral form submit
  const refForm = document.getElementById("form-emp-referral");
  if (refForm) {
    refForm.onsubmit = (e) => {
      e.preventDefault();
      const s = window.TerraHireStore.getStore();
      const cur = window.TerraHireStore.getCurrentUser() || currentUser;
      const nameInput = document.getElementById("ref-cand-name");
      const roleInput = document.getElementById("ref-cand-role");
      const name = nameInput ? nameInput.value.trim() : "";
      const role = roleInput ? roleInput.value.trim() : "";

      if (name && role && cur) {
        if (!s.referrals) s.referrals = [];
        s.referrals.push({
          id: "ref_" + Date.now(),
          referrerId: cur.id,
          candidateName: name,
          role: role,
          status: "Submitted",
          bonus: "$1,500",
        });
        window.TerraHireStore.setStore(s);
        refForm.reset();
        renderReferrals();
        showToast(`🎉 Referral for ${name} submitted successfully!`);
      }
    };
  }

  // Edit Profile Coordinates Modal
  const modalProfile = document.getElementById("modal-edit-profile");
  const openProfileModal = () => {
    const cur = window.TerraHireStore.getCurrentUser() || currentUser;
    if (!cur || !modalProfile) return;
    const phoneIn = document.getElementById("edit-input-phone");
    const locIn = document.getElementById("edit-input-location");
    const bioIn = document.getElementById("edit-input-bio");

    if (phoneIn) phoneIn.value = cur.phone || "";
    if (locIn) locIn.value = cur.location || "";
    if (bioIn) bioIn.value = cur.bio || "";
    modalProfile.classList.remove("hidden");
  };

  const btnEditNav = document.getElementById("btn-edit-profile-side");
  const btnEditHero = document.getElementById("btn-edit-profile-hero");
  const btnCloseProfileModal = document.getElementById("btn-close-profile-modal");

  if (btnEditNav) btnEditNav.onclick = openProfileModal;
  if (btnEditHero) btnEditHero.onclick = openProfileModal;
  if (btnCloseProfileModal && modalProfile) btnCloseProfileModal.onclick = () => modalProfile.classList.add("hidden");

  const formProfile = document.getElementById("form-update-profile");
  if (formProfile) {
    formProfile.onsubmit = (e) => {
      e.preventDefault();
      const s = window.TerraHireStore.getStore();
      const cur = window.TerraHireStore.getCurrentUser() || currentUser;
      if (!cur) return;

      const phoneIn = document.getElementById("edit-input-phone");
      const locIn = document.getElementById("edit-input-location");
      const bioIn = document.getElementById("edit-input-bio");

      cur.phone = phoneIn ? phoneIn.value.trim() : cur.phone;
      cur.location = locIn ? locIn.value.trim() : cur.location;
      cur.bio = bioIn ? bioIn.value.trim() : cur.bio;

      const idx = s.members.findIndex((m) => m.id === cur.id);
      if (idx !== -1) {
        s.members[idx] = cur;
        window.TerraHireStore.setStore(s);
        window.TerraHireStore.setCurrentUser(cur);
      }

      if (modalProfile) modalProfile.classList.add("hidden");
      renderAll();
      showToast("📍 Coordinates and location updated in directory!");
    };
  }

  // Add Task Modal
  const modalTask = document.getElementById("modal-add-task");
  const btnOpenAddTask = document.getElementById("btn-add-quick-task");
  const btnCloseTaskModal = document.getElementById("btn-close-task-modal");

  if (btnOpenAddTask && modalTask) {
    btnOpenAddTask.onclick = () => modalTask.classList.remove("hidden");
  }
  if (btnCloseTaskModal && modalTask) {
    btnCloseTaskModal.onclick = () => modalTask.classList.add("hidden");
  }

  const formCreateTask = document.getElementById("form-create-task");
  if (formCreateTask) {
    formCreateTask.onsubmit = (e) => {
      e.preventDefault();
      const cur = window.TerraHireStore.getCurrentUser() || currentUser;
      const titleIn = document.getElementById("task-input-title");
      const priorityIn = document.getElementById("task-input-priority");
      const catIn = document.getElementById("task-input-category");
      const dueIn = document.getElementById("task-input-due");

      if (titleIn && titleIn.value.trim()) {
        window.TerraHireStore.addTask(cur.id, {
          title: titleIn.value.trim(),
          priority: priorityIn ? priorityIn.value : "Medium",
          category: catIn ? catIn.value.trim() : "General",
          dueDate: dueIn ? dueIn.value : "2026-08-20",
        });

        formCreateTask.reset();
        if (modalTask) modalTask.classList.add("hidden");
        renderAll();
        showToast("📌 New task deliverable added to sprint!");
      }
    };
  }

  // Initial Full Render
  renderAll();
});

