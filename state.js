/**
 * TerraHire Shared Store & Data Management
 * Persisted in localStorage across all HTML pages
 */
(function (window) {
  "use strict";

  const STORAGE_KEY = "terrahire_state_v1";

  const DEFAULT_STATE = {
    departments: [
      { id: "dept_eng", name: "Core Engineering", head: "Dr. Ananya Roy", headEmail: "ananya.roy@acme.in", desc: "Distributed payment infrastructure, scalability, and API reliability." },
      { id: "dept_prod", name: "Product Experience", head: "Claire Vance", headEmail: "claire.vance@beta.com", desc: "Design systems, UI/UX interaction architecture, and user research." },
      { id: "dept_ai", name: "Machine Intelligence", head: "Tariq Al-Mansoor", headEmail: "tariq.mansoor@vertexlabs.io", desc: "Neural matching models, candidate ranking, and localized compliance AI." },
      { id: "dept_ops", name: "Global Operations & Governance", head: "Khushi Admin", headEmail: "khushi123@gmail.com", desc: "Cross-border tax governance, corporate compliance, and resource allocation." },
    ],
    organizations: [
      { id: "org_acme", name: "Acme Corporation", code: "ACME", domain: "acme.in", plan: "Enterprise", status: "Active" },
      { id: "org_beta", name: "Beta Innovations", code: "BETA", domain: "beta.com", plan: "Growth", status: "Active" },
      { id: "org_vertex", name: "Global Vertex Labs", code: "VTX", domain: "vertexlabs.io", plan: "Enterprise", status: "Active" },
      { id: "org_gamma", name: "Gamma Health Dynamics", code: "GHD", domain: "gammahealth.org", plan: "Growth", status: "Active" },
    ],
    projects: [
      { id: "proj_bill", orgId: "org_acme", department: "Core Engineering", code: "BILL-01", name: "Billing System Revamp", pmName: "Kavita Rao", pmEmail: "kavita.rao@acme.in", status: "In Progress", startDate: "2026-01-10", endDate: "2026-09-30", desc: "Multi-currency distributed billing engine for cross-border payroll." },
      { id: "proj_beta_app", orgId: "org_beta", department: "Product Experience", code: "BETA-P01", name: "Next-Gen Mobile Suite", pmName: "Sarah Jenkins", pmEmail: "sarah.jenkins@beta.com", status: "In Progress", startDate: "2026-02-01", endDate: "2026-10-15", desc: "Cross-platform mobile workspace for remote contractor onboarding." },
      { id: "proj_vtx_ai", orgId: "org_vertex", department: "Machine Intelligence", code: "VTX-AI", name: "Sourcing Intelligence API", pmName: "Alexander Wright", pmEmail: "alexander.wright@vertexlabs.io", status: "In Progress", startDate: "2025-11-15", endDate: "2026-11-30", desc: "Automated candidate-job matching and regional tax compliance pipeline." },
      { id: "proj_ghd_tele", orgId: "org_gamma", department: "Core Engineering", code: "GHD-44", name: "Telehealth Compliance Portal", pmName: "Dr. Aris Thorne", pmEmail: "aris.thorne@gammahealth.org", status: "In Progress", startDate: "2026-03-01", endDate: "2026-12-20", desc: "HIPAA and GDPR automated clinician certification verification." },
      { id: "proj_iam", orgId: "org_acme", department: "Global Operations & Governance", code: "IAM-02", name: "Enterprise SSO & IAM Gateway", pmName: "Khushi Admin", pmEmail: "khushi123@gmail.com", status: "Completed", startDate: "2025-08-01", endDate: "2026-06-30", desc: "SAML 2.0 & OIDC multi-tenant enterprise authentication engine." },
    ],
    members: [
      {
        id: "usr_admin",
        roleType: "admin",
        roleCategory: "Admin",
        fullName: "Khushi Admin",
        email: "khushi123@gmail.com",
        password: "Khushi123@",
        projectCode: "BILL-01",
        orgId: "org_acme",
        projectId: "proj_bill",
        designation: "Chief Administrator & Head of Ops",
        department: "Global Operations & Governance",
        reportingManager: "Board of Directors",
        reportingTeamLead: "Executive Council",
        headOfDept: "Executive Office",
        phone: "+1 (555) 019-2834",
        location: "San Francisco, USA",
        joinedDate: "2024-06-15",
        status: "Active",
        isCheckedIn: true,
        lastCheckIn: "08:45 AM",
        lastCheckOut: "06:30 PM (Yesterday)",
        checkInTimestamp: Date.now() - (5 * 3600 * 1000 + 15 * 60 * 1000),
        workingDaysInMonth: 22,
        daysPresent: 21,
        daysAbsent: 0,
        daysOnLeave: 1,
        lateArrivals: 1,
        overtimeHours: 8.5,
        bio: "Global administration lead overseeing cross-border hiring clusters and organization governance.",
      },
      {
        id: "usr_kavita",
        roleType: "employee",
        roleCategory: "Team Manager",
        fullName: "Kavita Rao",
        email: "kavita.rao@acme.in",
        password: "Khushi123@",
        projectCode: "BILL-01",
        orgId: "org_acme",
        projectId: "proj_bill",
        designation: "Principal Technical Program Manager",
        department: "Core Engineering",
        reportingManager: "Dr. Ananya Roy",
        reportingTeamLead: "Kavita Rao",
        headOfDept: "Dr. Ananya Roy",
        phone: "+91 98450 11223",
        location: "Mumbai, India",
        joinedDate: "2024-11-01",
        status: "Active",
        isCheckedIn: true,
        lastCheckIn: "08:30 AM",
        lastCheckOut: "06:00 PM (Yesterday)",
        checkInTimestamp: Date.now() - (5 * 3600 * 1000 + 30 * 60 * 1000),
        workingDaysInMonth: 22,
        daysPresent: 22,
        daysAbsent: 0,
        daysOnLeave: 0,
        lateArrivals: 1,
        overtimeHours: 6.0,
        bio: "Driving multi-region financial ledger reconciliation and billing uptime SLAs.",
      },
      {
        id: "usr_sarah",
        roleType: "employee",
        roleCategory: "Employee",
        fullName: "Sarah Johnson",
        email: "sarah.johnson@acme.in",
        password: "Khushi123@",
        projectCode: "BILL-01",
        orgId: "org_acme",
        projectId: "proj_bill",
        designation: "Lead Product Designer",
        department: "Product Experience",
        reportingManager: "Sarah Jenkins",
        reportingTeamLead: "Liam Cooper",
        headOfDept: "Claire Vance",
        phone: "+1 (555) 329-8812",
        location: "New York, USA",
        joinedDate: "2025-03-10",
        status: "Active",
        isCheckedIn: true,
        lastCheckIn: "09:12 AM",
        lastCheckOut: "06:15 PM (Yesterday)",
        checkInTimestamp: Date.now() - (4 * 3600 * 1000 + 32 * 60 * 1000 + 15 * 1000),
        workingDaysInMonth: 22,
        daysPresent: 20,
        daysAbsent: 1,
        daysOnLeave: 1,
        lateArrivals: 2,
        overtimeHours: 5.5,
        bio: "Designing accessible human-centric enterprise workflows and design systems.",
      },
      {
        id: "usr_ritu",
        roleType: "employee",
        roleCategory: "Team Leader",
        fullName: "Ritu Sharma",
        email: "ritu.sharma@acme.in",
        password: "Khushi123@",
        projectCode: "BILL-01",
        orgId: "org_acme",
        projectId: "proj_bill",
        designation: "Lead Distributed Systems Engineer",
        department: "Core Engineering",
        reportingManager: "Kavita Rao",
        reportingTeamLead: "Ritu Sharma",
        headOfDept: "Dr. Ananya Roy",
        phone: "+91 98765 43210",
        location: "Bengaluru, India",
        joinedDate: "2025-04-12",
        status: "Active",
        isCheckedIn: true,
        lastCheckIn: "09:00 AM",
        lastCheckOut: "06:45 PM (Yesterday)",
        checkInTimestamp: Date.now() - (4 * 3600 * 1000 + 45 * 60 * 1000),
        workingDaysInMonth: 22,
        daysPresent: 21,
        daysAbsent: 0,
        daysOnLeave: 1,
        lateArrivals: 1,
        overtimeHours: 7.0,
        bio: "Specializing in high-throughput payment queues and localized contractor payout gateways.",
      },
      {
        id: "usr_john",
        roleType: "employee",
        roleCategory: "Employee",
        fullName: "John Diaz",
        email: "john.diaz@beta.com",
        password: "Khushi123@",
        projectCode: "BETA-P01",
        orgId: "org_beta",
        projectId: "proj_beta_app",
        designation: "Senior UI/UX Product Designer",
        department: "Product Experience",
        reportingManager: "Sarah Jenkins",
        reportingTeamLead: "Liam Cooper",
        headOfDept: "Claire Vance",
        phone: "+1 (555) 847-2910",
        location: "Austin, Texas",
        joinedDate: "2025-09-01",
        status: "Active",
        isCheckedIn: false,
        lastCheckIn: "09:30 AM (Yesterday)",
        lastCheckOut: "06:10 PM (Yesterday)",
        checkInTimestamp: null,
        workingDaysInMonth: 22,
        daysPresent: 19,
        daysAbsent: 2,
        daysOnLeave: 1,
        lateArrivals: 3,
        overtimeHours: 4.0,
        bio: "Crafting accessible, human-centric design tokens for multi-timezone collaboration.",
      },
      {
        id: "usr_amara",
        roleType: "employee",
        roleCategory: "Team Manager",
        fullName: "Amara Okafor",
        email: "amara.okafor@vertexlabs.io",
        password: "Khushi123@",
        projectCode: "VTX-AI",
        orgId: "org_vertex",
        projectId: "proj_vtx_ai",
        designation: "Staff AI Solutions Architect",
        department: "Machine Intelligence",
        reportingManager: "Alexander Wright",
        reportingTeamLead: "Maya Lindqvist",
        headOfDept: "Tariq Al-Mansoor",
        phone: "+234 802 345 6789",
        location: "Lagos, Nigeria",
        joinedDate: "2025-02-18",
        status: "Active",
        isCheckedIn: true,
        lastCheckIn: "08:15 AM",
        lastCheckOut: "05:30 PM (Yesterday)",
        checkInTimestamp: Date.now() - (6 * 3600 * 1000),
        workingDaysInMonth: 22,
        daysPresent: 22,
        daysAbsent: 0,
        daysOnLeave: 0,
        lateArrivals: 0,
        overtimeHours: 9.2,
        bio: "Building neural matching models that eliminate bias across emerging tech hubs.",
      },
      {
        id: "usr_aris",
        roleType: "employee",
        roleCategory: "Team Leader",
        fullName: "Dr. Aris Thorne",
        email: "aris.thorne@gammahealth.org",
        password: "Khushi123@",
        projectCode: "GHD-44",
        orgId: "org_gamma",
        projectId: "proj_ghd_tele",
        designation: "Clinical Systems Architect",
        department: "Core Engineering",
        reportingManager: "Dr. Ananya Roy",
        reportingTeamLead: "Dr. Aris Thorne",
        headOfDept: "Dr. Ananya Roy",
        phone: "+44 20 7946 0912",
        location: "London, UK",
        joinedDate: "2025-06-01",
        status: "Active",
        isCheckedIn: false,
        lastCheckIn: "09:00 AM (Yesterday)",
        lastCheckOut: "05:45 PM (Yesterday)",
        checkInTimestamp: null,
        workingDaysInMonth: 22,
        daysPresent: 20,
        daysAbsent: 1,
        daysOnLeave: 1,
        lateArrivals: 1,
        overtimeHours: 3.5,
        bio: "Leading HIPAA verification workflows and secure multi-cloud medical data pipelines.",
      },
    ],
    tasks: [
      { id: "task_1", memberId: "usr_sarah", projectId: "proj_bill", title: "Design System Review", priority: "High", completed: true, status: "Done", dueDate: "2026-08-16", category: "Design" },
      { id: "task_2", memberId: "usr_sarah", projectId: "proj_bill", title: "Wireframe User Flow", priority: "Medium", completed: false, status: "In Progress", dueDate: "2026-08-18", category: "UX" },
      { id: "task_3", memberId: "usr_sarah", projectId: "proj_bill", title: "Component Accessibility Audit (WCAG AA)", priority: "High", completed: true, status: "Done", dueDate: "2026-08-14", category: "Quality" },
      { id: "task_4", memberId: "usr_sarah", projectId: "proj_bill", title: "Design Tokens Synchronization with Mobile", priority: "Medium", completed: true, status: "Done", dueDate: "2026-08-12", category: "Design" },
      { id: "task_5", memberId: "usr_sarah", projectId: "proj_bill", title: "Interactive Prototype for Stakeholder Demo", priority: "Low", completed: false, status: "To Do", dueDate: "2026-08-22", category: "Prototype" },
      { id: "task_6", memberId: "usr_sarah", projectId: "proj_bill", title: "Q3 Design Sprint Retrospective Documentation", priority: "Medium", completed: false, status: "Overdue", overdue: true, dueDate: "2026-08-08", category: "Docs" },

      { id: "task_k1", memberId: "usr_kavita", projectId: "proj_bill", title: "Multi-Currency Ledger Sharding Architecture", priority: "Critical", completed: true, status: "Done", dueDate: "2026-08-10", category: "Architecture" },
      { id: "task_k2", memberId: "usr_kavita", projectId: "proj_bill", title: "Cross-Border Regulatory Sign-off", priority: "High", completed: false, status: "In Progress", dueDate: "2026-08-25", category: "Compliance" },

      { id: "task_r1", memberId: "usr_ritu", projectId: "proj_bill", title: "Distributed Payment Queue Sharding", priority: "High", completed: true, status: "Done", dueDate: "2026-08-15", category: "Backend" },
      { id: "task_r2", memberId: "usr_ritu", projectId: "proj_bill", title: "Cross-border Tax Calculation Latency Benchmarks", priority: "Medium", completed: false, status: "In Progress", dueDate: "2026-08-19", category: "Performance" },
      { id: "task_r3", memberId: "usr_ritu", projectId: "proj_bill", title: "Idempotency Layer for Payout Retries", priority: "High", completed: true, status: "Done", dueDate: "2026-08-11", category: "Security" },
      { id: "task_r4", memberId: "usr_ritu", projectId: "proj_bill", title: "Vault Key Rotation Protocol Update", priority: "Low", completed: false, status: "Overdue", overdue: true, dueDate: "2026-08-04", category: "DevOps" },

      { id: "task_j1", memberId: "usr_john", projectId: "proj_beta_app", title: "Mobile Dark Theme Token Harmonization", priority: "Medium", completed: true, status: "Done", dueDate: "2026-08-12", category: "Design" },
      { id: "task_j2", memberId: "usr_john", projectId: "proj_beta_app", title: "Touch Target Size Validation across Screen Densities", priority: "High", completed: false, status: "In Progress", dueDate: "2026-08-20", category: "UX" },
      { id: "task_j3", memberId: "usr_john", projectId: "proj_beta_app", title: "Offline Storage Schema Definition", priority: "Medium", completed: false, status: "To Do", dueDate: "2026-08-24", category: "Architecture" },

      { id: "task_am1", memberId: "usr_amara", projectId: "proj_vtx_ai", title: "Neural Candidate Ranking Vector Indexing", priority: "Critical", completed: true, status: "Done", dueDate: "2026-08-05", category: "AI/ML" },
      { id: "task_am2", memberId: "usr_amara", projectId: "proj_vtx_ai", title: "Bias Elimination Layer on Resume Parser", priority: "High", completed: true, status: "Done", dueDate: "2026-08-13", category: "AI/ML" },
      { id: "task_am3", memberId: "usr_amara", projectId: "proj_vtx_ai", title: "Inference Latency Optimization (<120ms)", priority: "High", completed: false, status: "In Progress", dueDate: "2026-08-28", category: "Performance" },

      { id: "task_ar1", memberId: "usr_aris", projectId: "proj_ghd_tele", title: "HIPAA Automated Audit Log Specification", priority: "High", completed: false, status: "To Do", dueDate: "2026-08-30", category: "Compliance" },
      { id: "task_ar2", memberId: "usr_aris", projectId: "proj_ghd_tele", title: "Clinician State License API Integration", priority: "Medium", completed: false, status: "To Do", dueDate: "2026-09-05", category: "API" },

      { id: "task_a1", memberId: "usr_admin", projectId: "proj_bill", title: "Global Contractor Compliance Audit", priority: "High", completed: true, status: "Done", dueDate: "2026-08-14", category: "Governance" },
      { id: "task_a2", memberId: "usr_admin", projectId: "proj_bill", title: "Q3 Budget & Payout Allocation Matrix", priority: "Medium", completed: true, status: "Done", dueDate: "2026-08-12", category: "Finance" },
      { id: "task_a3", memberId: "usr_admin", projectId: "proj_bill", title: "Enterprise SSO Key Re-authorization", priority: "Critical", completed: false, status: "In Progress", dueDate: "2026-08-17", category: "Security" },
      { id: "task_a4", memberId: "usr_admin", projectId: "proj_bill", title: "Quarterly Department Expansion Review", priority: "Medium", completed: false, status: "To Do", dueDate: "2026-08-25", category: "Planning" },
    ],
    referrals: [
      { id: "ref_1", referrerId: "usr_ritu", candidateName: "Dev Patel", role: "DevOps Engineer", status: "Interviewing", bonus: "$1,500" },
      { id: "ref_2", referrerId: "usr_ritu", candidateName: "Sneha Nair", role: "Frontend Architect", status: "Hired", bonus: "$2,000" },
    ],
  };

  function getStore() {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val) {
        const parsed = JSON.parse(val);
        const admin = parsed.members && parsed.members.find((m) => m.roleType === "admin" || m.email === "khushi123@gmail.com");
        if (admin) {
          admin.email = "khushi123@gmail.com";
          admin.password = "Khushi123@";
          admin.fullName = "Khushi Admin";
        }
        if (!parsed.projects || parsed.projects.length < DEFAULT_STATE.projects.length) {
          parsed.projects = DEFAULT_STATE.projects;
        }
        if (!parsed.departments) {
          parsed.departments = DEFAULT_STATE.departments;
        }
        return parsed;
      }
    } catch (e) {}
    return DEFAULT_STATE;
  }

  function setStore(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function getCurrentUser() {
    try {
      const uid = sessionStorage.getItem("terrahire_session_user");
      if (uid) {
        const store = getStore();
        return store.members.find((m) => m.id === uid) || null;
      }
    } catch (e) {}
    return null;
  }

  function setCurrentUser(user) {
    if (user && user.id) {
      sessionStorage.setItem("terrahire_session_user", user.id);
    } else {
      sessionStorage.removeItem("terrahire_session_user");
    }
  }

  function checkIn(memberId, loc) {
    const store = getStore();
    const mem = store.members.find((m) => m.id === memberId);
    if (!mem) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    mem.isCheckedIn = true;
    mem.lastCheckIn = timeStr;
    mem.checkInTimestamp = Date.now();
    if (loc) mem.location = loc;
    setStore(store);
    return mem;
  }

  function checkOut(memberId) {
    const store = getStore();
    const mem = store.members.find((m) => m.id === memberId);
    if (!mem) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    mem.isCheckedIn = false;
    mem.lastCheckOut = timeStr;
    mem.checkInTimestamp = null;
    setStore(store);
    return mem;
  }

  function toggleTask(taskId) {
    const store = getStore();
    const task = store.tasks?.find((t) => t.id === taskId);
    if (!task) return;
    task.completed = !task.completed;
    task.status = task.completed ? "Done" : "In Progress";
    setStore(store);
    return task;
  }

  function addTask(memberId, taskData) {
    const store = getStore();
    if (!store.tasks) store.tasks = [];
    const mem = store.members.find((m) => m.id === memberId);
    const newTask = {
      id: "task_" + Date.now(),
      memberId: memberId,
      projectId: taskData.projectId || (mem ? mem.projectId : "proj_bill"),
      title: taskData.title || "New Task",
      priority: taskData.priority || "Medium",
      completed: false,
      status: "To Do",
      dueDate: taskData.dueDate || new Date().toISOString().split("T")[0],
      category: taskData.category || "General",
    };
    store.tasks.unshift(newTask);
    setStore(store);
    return newTask;
  }

  function getSummaryStats() {
    const store = getStore();
    const depts = store.departments || [];
    const projs = store.projects || [];
    const mems = store.members || [];
    const tasks = store.tasks || [];

    const completedProjects = projs.filter((p) => p.status === "Completed").length;
    const pendingProjects = projs.filter((p) => p.status !== "Completed").length;
    const workingToday = mems.filter((m) => m.isCheckedIn).length;
    const notWorkingToday = mems.filter((m) => !m.isCheckedIn).length;

    return {
      totalDepartments: depts.length,
      totalProjects: projs.length,
      totalProjectsCompleted: completedProjects,
      totalProjectsPending: pendingProjects,
      totalEmployees: mems.length,
      totalWorkingToday: workingToday,
      totalNotWorkingToday: notWorkingToday,
    };
  }

  function getAllProjects() {
    const store = getStore();
    return (store.projects || []).map((p) => getProjectDetail(p.id));
  }

  function getDepartmentDetail(deptIdOrName) {
    const store = getStore();
    const dept = (store.departments || []).find((d) => d.id === deptIdOrName || d.name.toLowerCase() === (deptIdOrName || "").toLowerCase()) || store.departments[0];
    if (!dept) return null;

    const deptProjects = (store.projects || []).filter((p) => p.department.toLowerCase() === dept.name.toLowerCase());
    const deptMembers = (store.members || []).filter((m) => m.department.toLowerCase() === dept.name.toLowerCase());

    const projIds = deptProjects.map((p) => p.id);
    const memberIds = deptMembers.map((m) => m.id);

    const deptTasks = (store.tasks || []).filter((t) => projIds.includes(t.projectId) || memberIds.includes(t.memberId));
    const completedTasks = deptTasks.filter((t) => t.completed || t.status === "Done").length;
    const totalTasks = deptTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 75;

    return {
      department: dept,
      projects: deptProjects.map((p) => getProjectDetail(p.id)),
      members: deptMembers,
      totalProjects: deptProjects.length,
      totalEmployees: deptMembers.length,
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      completionRate,
    };
  }

  function getProjectDetail(projIdOrCode) {
    const store = getStore();
    const proj = (store.projects || []).find((p) => p.id === projIdOrCode || p.code === projIdOrCode) || store.projects[0];
    if (!proj) return null;

    const org = (store.organizations || []).find((o) => o.id === proj.orgId) || { name: "Acme Corporation", code: "ACME" };
    const dept = (store.departments || []).find((d) => d.name.toLowerCase() === proj.department.toLowerCase()) || { name: proj.department, head: "Dr. Ananya Roy", headEmail: "ananya.roy@acme.in" };

    const projectMembers = (store.members || []).filter((m) => m.projectId === proj.id || m.projectCode === proj.code);
    const projectTasks = (store.tasks || []).filter((t) => t.projectId === proj.id || projectMembers.some((m) => m.id === t.memberId));

    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter((t) => t.completed || t.status === "Done").length;
    const overdueTasks = projectTasks.filter((t) => t.overdue || (!t.completed && new Date(t.dueDate) < new Date("2026-08-15"))).length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (proj.status === "Completed" ? 100 : 60);

    const team = projectMembers.map((mem) => {
      const memTasks = projectTasks.filter((t) => t.memberId === mem.id);
      const mCompleted = memTasks.filter((t) => t.completed || t.status === "Done").length;
      return {
        ...mem,
        assignedTasksCount: memTasks.length,
        completedTasksCount: mCompleted,
        pendingTasksCount: memTasks.length - mCompleted,
      };
    });

    const pm = team.find((m) => m.fullName.toLowerCase() === (proj.pmName || "").toLowerCase() || m.roleCategory === "Team Manager") || {
      fullName: proj.pmName || "Project Manager",
      email: proj.pmEmail || "pm@terrahire.io",
      roleCategory: "Team Manager",
      designation: "Project Manager",
      isCheckedIn: true,
      lastCheckIn: "08:30 AM",
      assignedTasksCount: 2,
      completedTasksCount: 1,
      pendingTasksCount: 1,
    };

    return {
      project: proj,
      organization: org,
      department: dept,
      team,
      projectManager: pm,
      tasks: projectTasks,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate,
      status: proj.status || "Active",
      startDate: proj.startDate || "2026-01-10",
      endDate: proj.endDate || "2026-10-30",
    };
  }

  function getMemberDetail(memberId) {
    const store = getStore();
    const mem = (store.members || []).find((m) => m.id === memberId || m.email === memberId) || store.members[0];
    if (!mem) return null;

    const dept = (store.departments || []).find((d) => d.name.toLowerCase() === mem.department.toLowerCase()) || { name: mem.department, head: mem.headOfDept || "Head of Dept", headEmail: "dept.head@terrahire.io" };
    const memberTasks = (store.tasks || []).filter((t) => t.memberId === mem.id);
    const assignedProjects = (store.projects || []).filter((p) => p.id === mem.projectId || p.code === mem.projectCode);

    const totalTasks = memberTasks.length;
    const completedTasks = memberTasks.filter((t) => t.completed || t.status === "Done").length;
    const overdueTasks = memberTasks.filter((t) => t.overdue || (!t.completed && new Date(t.dueDate) < new Date("2026-08-15"))).length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 80;

    const projectContributions = assignedProjects.map((p) => {
      const pTasks = memberTasks.filter((t) => t.projectId === p.id);
      const pDone = pTasks.filter((t) => t.completed || t.status === "Done").length;
      return {
        project: p,
        tasksAssigned: pTasks.length || memberTasks.length,
        tasksCompleted: pDone || completedTasks,
        completionRate: (pTasks.length || memberTasks.length) > 0 ? Math.round(((pDone || completedTasks) / (pTasks.length || memberTasks.length)) * 100) : 75,
      };
    });

    return {
      member: mem,
      department: dept,
      projects: assignedProjects,
      projectContributions,
      tasks: memberTasks,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate,
      attendance: {
        workingDaysInMonth: mem.workingDaysInMonth || 22,
        daysPresent: mem.daysPresent || 20,
        daysAbsent: mem.daysAbsent || 1,
        daysOnLeave: mem.daysOnLeave || 1,
        lateArrivals: mem.lateArrivals || 1,
        overtimeHours: mem.overtimeHours || 6.5,
        isCheckedIn: mem.isCheckedIn,
        lastCheckIn: mem.lastCheckIn || "09:00 AM",
        lastCheckOut: mem.lastCheckOut || "06:00 PM (Yesterday)",
      },
    };
  }

  window.TerraHireStore = {
    getStore,
    setStore,
    getCurrentUser,
    setCurrentUser,
    checkIn,
    checkOut,
    toggleTask,
    addTask,
    getSummaryStats,
    getAllProjects,
    getDepartmentDetail,
    getProjectDetail,
    getMemberDetail,
  };
})(window);

