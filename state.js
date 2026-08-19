"use strict";

/* =========================================================
   TerraHire Demo Data - Local Storage Only
   ========================================================= */

const STORAGE_KEY = "terrahire_state_v1";

/* =========================================================
   DEFAULT DATA
   ========================================================= */

const DEFAULT_STATE = {
  departments: [
    {
      id: "dept_eng",
      name: "Core Engineering",
      head: "Dr. Ananya Roy",
      headEmail: "ananya.roy@acme.in",
      desc: "Distributed payment infrastructure, scalability, and API reliability."
    },
    {
      id: "dept_prod",
      name: "Product Experience",
      head: "Claire Vance",
      headEmail: "claire.vance@beta.com",
      desc: "Design systems, UI/UX interaction architecture, and user research."
    },
    {
      id: "dept_ai",
      name: "Machine Intelligence",
      head: "Tariq Al-Mansoor",
      headEmail: "tariq.mansoor@vertexlabs.io",
      desc: "Neural matching models, candidate ranking, and localized compliance AI."
    },
    {
      id: "dept_ops",
      name: "Global Operations & Governance",
      head: "Khushi Admin",
      headEmail: "khushi123@gmail.com",
      desc: "Cross-border tax governance, corporate compliance, and resource allocation."
    }
  ],

  organizations: [
    {
      id: "org_acme",
      name: "Acme Corporation",
      code: "ACME",
      domain: "acme.in",
      plan: "Enterprise",
      status: "Active"
    },
    {
      id: "org_beta",
      name: "Beta Innovations",
      code: "BETA",
      domain: "beta.com",
      plan: "Growth",
      status: "Active"
    },
    {
      id: "org_vertex",
      name: "Global Vertex Labs",
      code: "VTX",
      domain: "vertexlabs.io",
      plan: "Enterprise",
      status: "Active"
    },
    {
      id: "org_gamma",
      name: "Gamma Health Dynamics",
      code: "GHD",
      domain: "gammahealth.org",
      plan: "Growth",
      status: "Active"
    }
  ],

  projects: [
    {
      id: "proj_bill",
      orgId: "org_acme",
      department: "Core Engineering",
      code: "BILL-01",
      name: "Billing System Revamp",
      pmName: "Kavita Rao",
      pmEmail: "kavita.rao@acme.in",
      demoEmployeeId: "usr_sarah",
      status: "In Progress",
      startDate: "2026-01-10",
      endDate: "2026-09-30",
      desc: "Multi-currency distributed billing engine for cross-border payroll."
    },
    {
      id: "proj_beta_app",
      orgId: "org_beta",
      department: "Product Experience",
      code: "BETA-P01",
      name: "Next-Gen Mobile Suite",
      pmName: "Sarah Jenkins",
      pmEmail: "sarah.jenkins@beta.com",
      status: "In Progress",
      startDate: "2026-02-01",
      endDate: "2026-10-15",
      desc: "Cross-platform mobile workspace for remote contractor onboarding."
    },
    {
      id: "proj_vtx_ai",
      orgId: "org_vertex",
      department: "Machine Intelligence",
      code: "VTX-AI",
      name: "Sourcing Intelligence API",
      pmName: "Alexander Wright",
      pmEmail: "alexander.wright@vertexlabs.io",
      status: "In Progress",
      startDate: "2025-11-15",
      endDate: "2026-11-30",
      desc: "Automated candidate-job matching and regional tax compliance pipeline."
    },
    {
      id: "proj_ghd_tele",
      orgId: "org_gamma",
      department: "Core Engineering",
      code: "GHD-44",
      name: "Telehealth Compliance Portal",
      pmName: "Dr. Aris Thorne",
      pmEmail: "aris.thorne@gammahealth.org",
      status: "In Progress",
      startDate: "2026-03-01",
      endDate: "2026-12-20",
      desc: "HIPAA and GDPR automated clinician certification verification."
    },
    {
      id: "proj_iam",
      orgId: "org_acme",
      department: "Global Operations & Governance",
      code: "IAM-02",
      name: "Enterprise SSO & IAM Gateway",
      pmName: "Khushi Admin",
      pmEmail: "khushi123@gmail.com",
      status: "Completed",
      startDate: "2025-08-01",
      endDate: "2026-06-30",
      desc: "SAML 2.0 and OIDC multi-tenant enterprise authentication engine."
    }
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
      location: "Bombay ",
      joinedDate: "2024-06-15",
      status: "Active",
      isCheckedIn: true,
      lastCheckIn: "08:45 AM",
      lastCheckOut: "06:30 PM (Yesterday)",
      checkInTimestamp: Date.now() - (5 * 60 * 60 * 1000 + 15 * 60 * 1000),
      workingDaysInMonth: 22,
      daysPresent: 21,
      daysAbsent: 0,
      daysOnLeave: 1,
      lateArrivals: 1,
      overtimeHours: 8.5,
      bio: "Global administration lead overseeing cross-border hiring clusters and organization governance."
    },
    {
      id: "usr_kavita",
      roleType: "manager",
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
      checkInTimestamp: Date.now() - (5 * 60 * 60 * 1000 + 30 * 60 * 1000),
      workingDaysInMonth: 22,
      daysPresent: 22,
      daysAbsent: 0,
      daysOnLeave: 0,
      lateArrivals: 1,
      overtimeHours: 6,
      bio: "Driving multi-region financial ledger reconciliation and billing uptime SLAs."
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
      checkInTimestamp: Date.now() - (4 * 60 * 60 * 1000 + 32 * 60 * 1000),
      workingDaysInMonth: 22,
      daysPresent: 20,
      daysAbsent: 1,
      daysOnLeave: 1,
      lateArrivals: 2,
      overtimeHours: 5.5,
      bio: "Designing accessible human-centric enterprise workflows and design systems."
    },
    {
      id: "usr_ritu",
      roleType: "team_leader",
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
      checkInTimestamp: Date.now() - (4 * 60 * 60 * 1000 + 45 * 60 * 1000),
      workingDaysInMonth: 22,
      daysPresent: 21,
      daysAbsent: 0,
      daysOnLeave: 1,
      lateArrivals: 1,
      overtimeHours: 7,
      bio: "Specializing in high-throughput payment queues and localized contractor payout gateways."
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
      overtimeHours: 4,
      bio: "Crafting accessible, human-centric design tokens for multi-timezone collaboration."
    },
    {
      id: "usr_amara",
      roleType: "manager",
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
      checkInTimestamp: Date.now() - (6 * 60 * 60 * 1000),
      workingDaysInMonth: 22,
      daysPresent: 22,
      daysAbsent: 0,
      daysOnLeave: 0,
      lateArrivals: 0,
      overtimeHours: 9.2,
      bio: "Building neural matching models that eliminate bias across emerging tech hubs."
    },
    {
      id: "usr_aris",
      roleType: "team_leader",
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
      bio: "Leading HIPAA verification workflows and secure multi-cloud medical data pipelines."
    }
  ],

  tasks: [
    {
      id: "task_1",
      memberId: "usr_sarah",
      projectId: "proj_bill",
      title: "Design System Review",
      priority: "High",
      completed: true,
      status: "Done",
      dueDate: "2026-08-16",
      category: "Design"
    },
    {
      id: "task_2",
      memberId: "usr_sarah",
      projectId: "proj_bill",
      title: "Wireframe User Flow",
      priority: "Medium",
      completed: false,
      status: "In Progress",
      dueDate: "2026-08-18",
      category: "UX"
    },
    {
      id: "task_3",
      memberId: "usr_sarah",
      projectId: "proj_bill",
      title: "Component Accessibility Audit",
      priority: "High",
      completed: true,
      status: "Done",
      dueDate: "2026-08-14",
      category: "Quality"
    },
    {
      id: "task_4",
      memberId: "usr_sarah",
      projectId: "proj_bill",
      title: "Design Tokens Synchronization",
      priority: "Medium",
      completed: true,
      status: "Done",
      dueDate: "2026-08-12",
      category: "Design"
    },
    {
      id: "task_5",
      memberId: "usr_sarah",
      projectId: "proj_bill",
      title: "Interactive Prototype for Demo",
      priority: "Low",
      completed: false,
      status: "To Do",
      dueDate: "2026-08-22",
      category: "Prototype"
    },
    {
      id: "task_6",
      memberId: "usr_sarah",
      projectId: "proj_bill",
      title: "Q3 Design Sprint Documentation",
      priority: "Medium",
      completed: false,
      status: "Overdue",
      overdue: true,
      dueDate: "2026-08-08",
      category: "Docs"
    },
    {
      id: "task_k1",
      memberId: "usr_kavita",
      projectId: "proj_bill",
      title: "Multi-Currency Ledger Architecture",
      priority: "Critical",
      completed: true,
      status: "Done",
      dueDate: "2026-08-10",
      category: "Architecture"
    },
    {
      id: "task_k2",
      memberId: "usr_kavita",
      projectId: "proj_bill",
      title: "Cross-Border Regulatory Sign-off",
      priority: "High",
      completed: false,
      status: "In Progress",
      dueDate: "2026-08-25",
      category: "Compliance"
    },
    {
      id: "task_r1",
      memberId: "usr_ritu",
      projectId: "proj_bill",
      title: "Distributed Payment Queue Sharding",
      priority: "High",
      completed: true,
      status: "Done",
      dueDate: "2026-08-15",
      category: "Backend"
    },
    {
      id: "task_r2",
      memberId: "usr_ritu",
      projectId: "proj_bill",
      title: "Tax Calculation Latency Benchmarks",
      priority: "Medium",
      completed: false,
      status: "In Progress",
      dueDate: "2026-08-19",
      category: "Performance"
    },
    {
      id: "task_r3",
      memberId: "usr_ritu",
      projectId: "proj_bill",
      title: "Idempotency Layer for Payout Retries",
      priority: "High",
      completed: true,
      status: "Done",
      dueDate: "2026-08-11",
      category: "Security"
    },
    {
      id: "task_r4",
      memberId: "usr_ritu",
      projectId: "proj_bill",
      title: "Vault Key Rotation Update",
      priority: "Low",
      completed: false,
      status: "Overdue",
      overdue: true,
      dueDate: "2026-08-04",
      category: "DevOps"
    },
    {
      id: "task_j1",
      memberId: "usr_john",
      projectId: "proj_beta_app",
      title: "Mobile Dark Theme Token Harmonization",
      priority: "Medium",
      completed: true,
      status: "Done",
      dueDate: "2026-08-12",
      category: "Design"
    },
    {
      id: "task_j2",
      memberId: "usr_john",
      projectId: "proj_beta_app",
      title: "Touch Target Validation",
      priority: "High",
      completed: false,
      status: "In Progress",
      dueDate: "2026-08-20",
      category: "UX"
    },
    {
      id: "task_j3",
      memberId: "usr_john",
      projectId: "proj_beta_app",
      title: "Offline Storage Schema Definition",
      priority: "Medium",
      completed: false,
      status: "To Do",
      dueDate: "2026-08-24",
      category: "Architecture"
    },
    {
      id: "task_am1",
      memberId: "usr_amara",
      projectId: "proj_vtx_ai",
      title: "Neural Candidate Ranking Vector Indexing",
      priority: "Critical",
      completed: true,
      status: "Done",
      dueDate: "2026-08-05",
      category: "AI/ML"
    },
    {
      id: "task_am2",
      memberId: "usr_amara",
      projectId: "proj_vtx_ai",
      title: "Bias Elimination Layer",
      priority: "High",
      completed: true,
      status: "Done",
      dueDate: "2026-08-13",
      category: "AI/ML"
    },
    {
      id: "task_am3",
      memberId: "usr_amara",
      projectId: "proj_vtx_ai",
      title: "Inference Latency Optimization",
      priority: "High",
      completed: false,
      status: "In Progress",
      dueDate: "2026-08-28",
      category: "Performance"
    },
    {
      id: "task_ar1",
      memberId: "usr_aris",
      projectId: "proj_ghd_tele",
      title: "HIPAA Automated Audit Log Specification",
      priority: "High",
      completed: false,
      status: "To Do",
      dueDate: "2026-08-30",
      category: "Compliance"
    },
    {
      id: "task_ar2",
      memberId: "usr_aris",
      projectId: "proj_ghd_tele",
      title: "Clinician License API Integration",
      priority: "Medium",
      completed: false,
      status: "To Do",
      dueDate: "2026-09-05",
      category: "API"
    },
    {
      id: "task_a1",
      memberId: "usr_admin",
      projectId: "proj_bill",
      title: "Global Contractor Compliance Audit",
      priority: "High",
      completed: true,
      status: "Done",
      dueDate: "2026-08-14",
      category: "Governance"
    },
    {
      id: "task_a2",
      memberId: "usr_admin",
      projectId: "proj_bill",
      title: "Q3 Budget and Payout Allocation",
      priority: "Medium",
      completed: true,
      status: "Done",
      dueDate: "2026-08-12",
      category: "Finance"
    },
    {
      id: "task_a3",
      memberId: "usr_admin",
      projectId: "proj_bill",
      title: "Enterprise SSO Key Re-authorization",
      priority: "Critical",
      completed: false,
      status: "In Progress",
      dueDate: "2026-08-17",
      category: "Security"
    },
    {
      id: "task_a4",
      memberId: "usr_admin",
      projectId: "proj_bill",
      title: "Quarterly Department Expansion Review",
      priority: "Medium",
      completed: false,
      status: "To Do",
      dueDate: "2026-08-25",
      category: "Planning"
    }
  ],

  // referrals: [
  //   {
  //     id: "ref_1",
  //     referrerId: "usr_ritu",
  //     candidateName: "Dev Patel",
  //     role: "DevOps Engineer",
  //     status: "Interviewing",
  //     bonus: "$1,500"
  //   },
  //   {
  //     id: "ref_2",
  //     referrerId: "usr_ritu",
  //     candidateName: "Sneha Nair",
  //     role: "Frontend Architect",
  //     status: "Hired",
  //     bonus: "$2,000"
  //   }
  // ]
};

/* =========================================================
   SAVE DATA TO LOCAL STORAGE
   This will save data only if it is not already available.
   ========================================================= */

try {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
    console.log("✅ TerraHire data successfully saved in localStorage.");
  } else {
    console.log("✅ TerraHire data already exists in localStorage.");
  }
} catch (error) {
  console.error("❌ Error while saving data in localStorage:", error);
}



/* =========================================================
   OPTIONAL HELPER FUNCTIONS
   You may use these from any page.
   ========================================================= */

// Get all stored data
function getAppData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : DEFAULT_STATE;
  } catch (error) {
    return DEFAULT_STATE;
  }
}

// Save updated complete data
function saveAppData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Reset demo data if you need it
function resetAppData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
  location.reload();
}

/* Optional: make functions available globally */
window.getAppData = getAppData;
window.saveAppData = saveAppData;
window.resetAppData = resetAppData;

/* =========================================================
   TerraHireStore
   ========================================================= */

const SESSION_KEY = "terrahire_session_user";

window.TerraHireStore = {
  getDashboardForRole(user) {

    if (!user) {
      return "./login.html";
    }

    switch (user.roleType) {

      case "admin":
        return "./admin.html";

      case "department_head":
        return "./directory.html";

      case "manager":
        return "./employee.html";

      case "team_leader":
        return "./employee.html";

      case "employee":
        return "./employee.html";

      default:
        return "./employee.html";
    }
  },

  getStore() {
    return getAppData();
  },

  setStore(data) {
    saveAppData(data);
  },

  getCurrentUser() {
    const userId = sessionStorage.getItem(SESSION_KEY);

    if (!userId) {
      return null;
    }

    const store = getAppData();

    if (!store || !Array.isArray(store.members)) {
      return null;
    }

    return store.members.find(member => member.id === userId) || null;
  },

  setCurrentUser(user) {
    if (user && user.id) {
      sessionStorage.setItem(SESSION_KEY, user.id);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  },
  // ==========================================
  // ADD TASK
  // ==========================================

  addTask(memberId, taskData) {

    const data = getAppData();

    if (!Array.isArray(data.tasks)) {
      data.tasks = [];
    }

    const newTask = {

      id:
        "task_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .substring(2, 8),

      memberId: memberId,

      projectId:
        taskData.projectId || null,

      title:
        taskData.title || "Untitled Task",

      priority:
        taskData.priority || "Medium",

      completed: false,

      status: "To Do",

      overdue: false,

      dueDate:
        taskData.dueDate || "",

      category:
        taskData.category || "General"
    };

    data.tasks.push(newTask);

    saveAppData(data);

    console.log(
      "✅ Task added:",
      newTask
    );

    return newTask;
  },


  // ==========================================
  // TOGGLE TASK
  // ==========================================

  toggleTask(taskId) {

    const data = getAppData();

    if (!Array.isArray(data.tasks)) {
      return;
    }

    const task =
      data.tasks.find(
        t => t.id === taskId
      );

    if (!task) {
      return;
    }

    task.completed =
      !task.completed;

    task.status =
      task.completed
        ? "Done"
        : "To Do";

    saveAppData(data);

    return task;
  }



};
