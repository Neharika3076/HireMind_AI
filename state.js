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
      orgId: "org_acme",
      head: "Dr. Ananya Roy",
      headEmail: "ananya.roy@acme.in",
      desc: "Distributed payment infrastructure, scalability, and API reliability."
    },
    {
      id: "dept_prod",
      orgId: "org_beta",
      name: "Product Experience",
      head: "Claire Vance",
      headEmail: "claire.vance@beta.com",
      desc: "Design systems, UI/UX interaction architecture, and user research."
    },
    {
      id: "dept_ai",
      orgId: "org_vertex",
      name: "Machine Intelligence",
      head: "Tariq Al-Mansoor",
      headEmail: "tariq.mansoor@vertexlabs.io",
      desc: "Neural matching models, candidate ranking, and localized compliance AI."
    },
    {
      id: "dept_ops",
      orgId: "org_acme",
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
      deptId: "dept_eng",
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
      deptId: "dept_prod",
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
      deptId: "dept_ai",
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
      deptId: "dept_eng",
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
      deptId: "dept_ops",
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
      deptId: "dept_ops",
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
      deptId: "dept_eng",
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
      deptId: "dept_prod",
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
      roleType: "manager",
      roleCategory: "Employee",
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
      deptId: "dept_eng",
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
      deptId: "dept_prod",
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
      deptId: "dept_ai",
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
      roleType: "manager",
      roleCategory: "Team Leader",
      fullName: "Dr. Aris Thorne",
      email: "aris.thorne@gammahealth.org",
      deptId: "dept_eng",
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
      deptId: "dept_prod",
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
      deptId: "dept_prod",
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
      deptId: "dept_prod",
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
      deptId: "dept_prod",
      completed: true,
      status: "Done",
      dueDate: "2026-08-12",
      category: "Design"
    },
    {
      id: "task_5",
      memberId: "usr_sarah",
      deptId: "dept_prod",
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
      deptId: "dept_prod",
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
      deptId: "dept_eng",
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
      deptId: "dept_eng",
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
      deptId: "dept_eng",
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
      deptId: "dept_eng",
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
      deptId: "dept_eng",
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
      deptId: "dept_eng",
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
      deptId: "dept_prod",
      category: "Design"
    },
    {
      id: "task_j2",
      memberId: "usr_john",
      projectId: "proj_beta_app",
      title: "Touch Target Validation",
      priority: "High",
      deptId: "dept_prod",
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
      deptId: "dept_prod",
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
      deptId: "dept_ai",
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
      deptId: "dept_ai",
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
      deptId: "dept_ai",
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
      deptId: "dept_eng",
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
      deptId: "dept_eng",
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
      deptId: "dept_ops",
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
      deptId: "dept_ops",
      status: "Done",
      dueDate: "2026-08-12",
      category: "Finance"
    },
    {
      id: "task_a3",
      memberId: "usr_admin",
      projectId: "proj_bill",
      title: "Enterprise SSO Key Re-authorization",
      deptId: "dept_ops",
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
      deptId: "dept_ops",
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
   CORPORATE ORGANIZATION MODEL (v2)
   =========================================================
   The original demo represented department, project and team ownership with
   single fields.  This layer keeps legacy fields for older screens, while all
   new operations use IDs and assignment collections.  It is deliberately
   enforced here so UI forms cannot bypass the business rules.
*/
(function installCorporateStore() {
  const CORPORATE_SESSION_KEY = "terrahire_session_user";
  const unique = (values) => [...new Set((values || []).filter(Boolean))];
  const id = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const today = () => new Date().toISOString();

  function memberDepartmentId(data, member) {
    const legacyId = member.departmentId || member.deptId;
    const byId = (data.departments || []).find((item) => item.id === legacyId && (!item.orgId || item.orgId === member.orgId));
    if (byId) return byId.id;
    const byName = (data.departments || []).find((item) => item.name === member.department && (!item.orgId || item.orgId === member.orgId));
    if (byName) return byName.id;
    const legacyDepartment = (data.departments || []).find((item) => item.name === member.department);
    if (!legacyDepartment || !member.orgId) return "";
    const cloneId = `${legacyDepartment.id}_${member.orgId}`;
    const clone = { ...legacyDepartment, id: cloneId, orgId: member.orgId, executiveId: "", head: "", headEmail: "", createdAt: today() };
    data.departments.push(clone);
    return clone.id;
  }

  function projectDepartmentIds(data, project) {
    if (Array.isArray(project.departmentIds) && project.departmentIds.length) return unique(project.departmentIds);
    const names = project.departmentNames || [project.department];
    return unique(names.map((name) => {
      const department = (data.departments || []).find((item) => item.name === name && (!item.orgId || item.orgId === project.orgId));
      return department ? department.id : "";
    }));
  }

  function normalizeCorporateData(raw) {
    const data = raw && typeof raw === "object" ? raw : {};
    data.departments = Array.isArray(data.departments) ? data.departments : [];
    data.members = Array.isArray(data.members) ? data.members : [];
    data.projects = Array.isArray(data.projects) ? data.projects : [];
    data.tasks = Array.isArray(data.tasks) ? data.tasks : [];
    data.projectAssignments = Array.isArray(data.projectAssignments) ? data.projectAssignments : [];

    data.members.forEach((member) => {
      member.departmentId = memberDepartmentId(data, member);
      // Older records may have been saved with the Team Leader designation
      // while retaining the generic employee role. Restore the hierarchy role
      // before project and task selectors build their eligible lists.
      if (member.roleType !== "team_leader" && (member.roleCategory === "Team Leader" || /team leader/i.test(String(member.designation || "")))) member.roleType = "team_leader";
      member.wasLegacyTeamLeader = member.wasLegacyTeamLeader || member.roleType === "team_leader";
      if (member.roleType === "department_head") member.roleType = "executive";
      if (member.roleType === "team_leader" && /manager/i.test(String(member.designation || ""))) member.roleType = "manager";
      if (member.roleType === "manager" && !/manager/i.test(String(member.designation || "")) && member.roleCategory !== "Team Manager" && (member.roleCategory === "Team Leader" || (member.reportingTeamLead && member.reportingTeamLead === member.fullName && member.reportingManager))) member.roleType = "team_leader";
      // Team Leaders are real hierarchy members. Keep legacy records marked
      // as team_leader instead of silently flattening them into employees.
      if (member.roleType !== "admin" && member.roleType !== "executive" && member.roleType !== "manager" && member.roleType !== "team_leader") member.roleType = "employee";
      if (member.roleType === "executive") {
        member.roleCategory = "Executive";
        member.executivePosition = member.executivePosition || member.designation || "Executive";
      } else if (member.roleType === "manager") {
        member.roleCategory = "Manager";
        member.managerPosition = member.managerPosition || member.designation || "Manager";
      } else if (member.roleType === "team_leader") {
        member.roleCategory = "Team Leader";
        member.managerId = member.managerId || "";
      } else {
        member.roleCategory = "Member";
        member.managerId = member.managerId || "";
      }
    });

    data.departments.forEach((department) => {
      if (!department.executiveId) {
        const executive = data.members.find((member) => member.roleType === "executive" && member.departmentId === department.id && (!department.orgId || member.orgId === department.orgId));
        if (executive) department.executiveId = executive.id;
      }
      department.head = department.head || ((data.members.find((member) => member.id === department.executiveId) || {}).fullName || "");
    });

    // Backfill reporting links for legacy records while preserving any
    // explicit hierarchy entered by an administrator.
    data.members.forEach((member) => {
      const department = data.departments.find((item) => item.id === member.departmentId);
      if (member.roleType === "manager" && !member.executiveId) member.executiveId = department && department.executiveId || "";
      if ((member.roleType === "employee" || member.roleType === "team_leader") && !member.managerId) {
        const project = data.projects.find((item) => item.id === member.projectId || item.code === member.projectCode);
        const manager = project && data.members.find((candidate) => candidate.id === (project.managerIds || [])[0]);
        if (manager) member.managerId = manager.id;
      }
    });

    data.projects.forEach((project) => {
      project.departmentIds = projectDepartmentIds(data, project);
      project.departmentNames = project.departmentIds.map((departmentId) => (data.departments.find((department) => department.id === departmentId) || {}).name).filter(Boolean);
      project.department = project.department || project.departmentNames[0] || "Unassigned";
      project.memberIds = unique(project.memberIds || []);
      project.managerIds = unique(project.managerIds || []);
      if (!project.managerIds.length && project.pmName) {
        const manager = data.members.find((member) => member.orgId === project.orgId && member.fullName === project.pmName && member.roleType === "manager");
        if (manager) project.managerIds.push(manager.id);
      }
      project.teamLeadIds = unique(project.teamLeadIds || []);
      // Keep responsible managers and Team Leaders addressable as project
      // members even when an older record stored only their role-specific IDs.
      project.memberIds = unique([...project.memberIds, ...project.managerIds, ...project.teamLeadIds]);
      project.assignmentHistory = Array.isArray(project.assignmentHistory) ? project.assignmentHistory : [];
      project.createdByName = project.createdByName || ((data.members.find((member) => member.id === project.createdBy) || {}).fullName || "");
      project.assignedBy = project.assignedBy || project.createdBy || "";
      project.assignedByName = project.assignedByName || project.createdByName || "";
    });

    data.members.forEach((member) => {
      if ((member.roleType !== "employee" && member.roleType !== "team_leader") || member.managerId) return;
      const project = data.projects.find((item) => item.id === member.projectId || item.code === member.projectCode);
      const manager = project && data.members.find((candidate) => candidate.id === (project.managerIds || [])[0]);
      const namedManager = data.members.find((candidate) => candidate.orgId === member.orgId && candidate.roleType === "manager" && candidate.fullName === member.reportingManager);
      if (manager) member.managerId = manager.id;
      else if (namedManager) member.managerId = namedManager.id;
    });

    data.projects.forEach((project) => {
      data.members.filter((member) => member.projectId === project.id || member.projectCode === project.code).forEach((member) => {
        project.memberIds = unique([...project.memberIds, member.id]);
        if (!data.projectAssignments.some((assignment) => assignment.projectId === project.id && assignment.memberId === member.id)) {
          data.projectAssignments.push({
            id: id("assignment"), projectId: project.id, memberId: member.id,
            departmentId: member.departmentId, isTeamLeader: Boolean(member.wasLegacyTeamLeader || member.roleType === "team_leader"), assignedAt: today(), assignedBy: "migration"
          });
        }
        if (member.wasLegacyTeamLeader || member.roleType === "team_leader") project.teamLeadIds = unique([...project.teamLeadIds, member.id]);
      });
    });

    data.projectAssignments.forEach((assignment) => {
      const project = data.projects.find((item) => item.id === assignment.projectId);
      const member = data.members.find((item) => item.id === assignment.memberId);
      if (!project || !member) return;
      assignment.departmentId = assignment.departmentId || member.departmentId;
      assignment.isTeamLeader = Boolean(assignment.isTeamLeader || member.roleType === "team_leader");
      project.memberIds = unique([...project.memberIds, member.id]);
      if (assignment.isTeamLeader) project.teamLeadIds = unique([...project.teamLeadIds, member.id]);
    });

    data.tasks.forEach((task) => {
      const project = data.projects.find((item) => item.id === task.projectId);
      task.employeeIds = unique(task.employeeIds || (task.memberId ? [task.memberId] : []));
      task.managerIds = unique(task.managerIds || (task.managerId ? [task.managerId] : (project ? project.managerIds : [])));
      task.teamLeadIds = unique(task.teamLeadIds || (task.teamLeadId ? [task.teamLeadId] : []));
      task.status = task.status === "Done" ? "Completed" : (task.status || "Assigned");
      task.progress = Number.isFinite(Number(task.progress)) ? Number(task.progress) : (task.completed ? 100 : 0);
      task.completed = task.status === "Completed" || Boolean(task.completed);
      task.assignmentHistory = Array.isArray(task.assignmentHistory) ? task.assignmentHistory : [];
      task.reviewStatus = task.reviewStatus || (task.completed ? "Approved" : "Not submitted");
      task.subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
      task.assignedBy = task.assignedBy || ((task.assignmentHistory[task.assignmentHistory.length - 1] || {}).actorId || "");
      task.assignedByName = task.assignedByName || ((task.assignmentHistory[task.assignmentHistory.length - 1] || {}).actorName || "");
      task.assignedAt = task.assignedAt || ((task.assignmentHistory[task.assignmentHistory.length - 1] || {}).at || "");
    });
    return data;
  }

  function readData() {
    try { return normalizeCorporateData(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || DEFAULT_STATE); }
    catch (_) { return normalizeCorporateData(DEFAULT_STATE); }
  }
  function writeData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeCorporateData(data))); }
  function getUser(data) {
    const raw = sessionStorage.getItem(CORPORATE_SESSION_KEY);
    if (!raw) return null;
    let userId = raw;
    try { const parsed = JSON.parse(raw); userId = parsed && parsed.id ? parsed.id : parsed; } catch (_) { /* stored as an ID */ }
    return data.members.find((member) => member.id === userId) || null;
  }
  const isAdmin = (user) => user && user.roleType === "admin";
  const isExecutive = (user) => user && user.roleType === "executive";
  const isOwner = (user) => isAdmin(user) || isExecutive(user);
  const departmentFor = (data, member) => member && data.departments.find((department) => department.id === member.departmentId || department.name === member.department);
  const executiveForDepartment = (data, departmentId) => {
    const department = data.departments.find((item) => item.id === departmentId);
    return department && data.members.find((member) => member.id === department.executiveId) || null;
  };
  const isUnderExecutive = (data, member, executive) => {
    if (!member || !executive || member.orgId !== executive.orgId) return false;
    return member.executiveId === executive.id || Boolean(member.departmentId && member.departmentId === executive.departmentId) && (departmentFor(data, member) || {}).executiveId === executive.id;
  };
  const isUnderManager = (member, manager) => Boolean(member && manager && member.orgId === manager.orgId && (member.managerId === manager.id || member.reportingManagerId === manager.id));
  const allowedMemberForActor = (data, actor, member) => {
    if (!member || member.orgId !== actor.orgId) return false;
    if (isAdmin(actor)) return true;
    if (isExecutive(actor)) return isUnderExecutive(data, member, actor);
    if (actor.roleType === "manager") return isUnderManager(member, actor);
    return false;
  };
  function requireActor(data) { const user = getUser(data); if (!user) throw new Error("Please sign in to continue."); return user; }
  function getProject(data, projectId) { return data.projects.find((project) => project.id === projectId); }
  function getProjectMembers(data, project) {
    const ids = unique([...(project.memberIds || []), ...(project.managerIds || []), ...(project.teamLeadIds || []), ...(data.projectAssignments || []).filter((assignment) => assignment.projectId === project.id).map((assignment) => assignment.memberId)]);
    return data.members.filter((member) => ids.includes(member.id));
  }
  function canManageProject(data, user, project) {
    if (!user || !project || project.orgId !== user.orgId) return false;
    if (isAdmin(user)) return true;
    if (isExecutive(user)) return project.departmentIds.includes(user.departmentId);
    return user.roleType === "manager" && project.managerIds.includes(user.id);
  }
  function canViewProject(data, user, project) {
    if (!user || !project || project.orgId !== user.orgId) return false;
    if (isAdmin(user)) return true;
    if (isExecutive(user)) {
      const departmentMatch = Boolean(user.departmentId && (project.departmentIds || []).includes(user.departmentId)) ||
        Boolean(user.department && ((project.departmentNames || []).includes(user.department) || project.department === user.department));
      return departmentMatch || project.createdBy === user.id || project.assignedBy === user.id ||
        (project.managerIds || []).some((managerId) => isUnderExecutive(data, data.members.find((member) => member.id === managerId), user));
    }
    return (project.managerIds || []).includes(user.id) || (project.memberIds || []).includes(user.id);
  }
  function history(task, action, actor, details) {
    task.assignmentHistory.unshift({ id: id("history"), action, actorId: actor.id, actorName: actor.fullName, details: details || "", at: today() });
  }
  function validateProjectParticipants(data, project, memberIds, teamLeadIds) {
    const selected = unique(memberIds);
    const invalidMember = selected.find((memberId) => {
      const member = data.members.find((item) => item.id === memberId);
      return !member || member.orgId !== project.orgId || !project.departmentIds.includes(member.departmentId);
    });
    if (invalidMember) throw new Error("Every project member must belong to a department assigned to the project.");
    const invalidLeader = unique(teamLeadIds).find((memberId) => !selected.includes(memberId));
    if (invalidLeader) throw new Error("A Team Leader must first be assigned to this project.");
  }

  window.getAppData = readData;
  window.saveAppData = writeData;
  window.TerraHireStore = {
    getStore: readData,
    setStore: writeData,
    getCurrentUser() { return getUser(readData()); },
    setCurrentUser(user) { if (user && user.id) sessionStorage.setItem(CORPORATE_SESSION_KEY, user.id); else sessionStorage.removeItem(CORPORATE_SESSION_KEY); },
    getDashboardForRole(user) { if (!user) return "./login.html"; if (isAdmin(user)) return "./admin.html"; return "./employee.html"; },
    getOrganizationDepartments(orgId) { return readData().departments.filter((department) => !department.orgId || department.orgId === orgId); },
    getProjectMembers(projectId) { const data = readData(); const project = getProject(data, projectId); return project ? getProjectMembers(data, project) : []; },
    getProjectAssignments(projectId) { return readData().projectAssignments.filter((assignment) => assignment.projectId === projectId); },
    getAccessibleProjects(user = this.getCurrentUser()) {
      const data = readData();
      if (!user) return [];
      return data.projects.filter((project) => canViewProject(data, user, project));
    },
    createDepartment(input) {
      const data = readData(); const actor = requireActor(data);
      if (!isAdmin(actor)) throw new Error("Only an administrator can create departments.");
      const name = String(input.name || "").trim();
      if (!name) throw new Error("A department name is required.");
      if (data.departments.some((department) => department.orgId === actor.orgId && department.name.toLowerCase() === name.toLowerCase())) throw new Error("A department with this name already exists.");
      const department = { id: id("dept"), orgId: actor.orgId, name, desc: String(input.desc || "").trim(), executiveId: "", head: "", headEmail: "", createdAt: today() };
      data.departments.push(department); writeData(data); return department;
    },
    createMember(input) {
      const data = readData(); const actor = requireActor(data);
      if (!isAdmin(actor)) throw new Error("Only an administrator can add members.");
      const department = data.departments.find((item) => item.id === input.departmentId && (!item.orgId || item.orgId === actor.orgId));
      const roleType = ["executive", "manager", "team_leader"].includes(input.roleType) ? input.roleType : "employee";
      const name = String(input.fullName || "").trim(); const email = String(input.email || "").trim().toLowerCase();
      const password = String(input.password || "");
      if (!department || !name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) throw new Error("Provide a name, valid email, department, and a password of at least 8 characters.");
      if (data.members.some((member) => member.email.toLowerCase() === email)) throw new Error("A member with this email already exists.");
      if (roleType === "executive" && department.executiveId) throw new Error(`${department.name} already has an Executive. A department can have only one Executive.`);
      const executivePosition = String(input.executivePosition || "").trim();
      const managerPosition = String(input.managerPosition || "").trim();
      if (roleType === "executive" && !executivePosition) throw new Error("Executive Position is required.");
      if (roleType === "manager" && !managerPosition) throw new Error("Manager Position is required.");
      const managerId = String(input.managerId || "").trim();
      const manager = managerId && data.members.find((member) => member.id === managerId && member.orgId === actor.orgId && member.roleType === "manager");
      if ((roleType === "employee" || roleType === "team_leader") && managerId && !manager) throw new Error("Select a Manager from this organization.");
      const executiveId = roleType === "manager" ? (String(input.executiveId || department.executiveId || "").trim()) : "";
      if (roleType === "manager" && executiveId && !data.members.some((member) => member.id === executiveId && member.orgId === actor.orgId && member.roleType === "executive")) throw new Error("Select a valid Executive from this organization.");
      const member = { id: id("usr"), orgId: actor.orgId, departmentId: department.id, department: department.name, roleType, roleCategory: roleType === "executive" ? "Executive" : roleType === "manager" ? "Manager" : roleType === "team_leader" ? "Team Leader" : "Member", fullName: name, email, password, designation: roleType === "executive" ? executivePosition : roleType === "manager" ? managerPosition : (input.designation || (roleType === "team_leader" ? "Team Leader" : "Employee")), executivePosition, managerPosition, executiveId, managerId: manager ? manager.id : "", phone: input.phone || "", location: input.location || "Global Remote", joinedDate: new Date().toISOString().slice(0, 10), createdAt: today(), status: "Active", isCheckedIn: false, projectIds: [], bio: input.bio || "" };
      data.members.push(member);
      if (roleType === "executive") { department.executiveId = member.id; department.head = member.fullName; department.headEmail = member.email; }
      writeData(data); return member;
    },
    createProject(input) {
      const data = readData(); const actor = requireActor(data);
      const departmentIds = unique(input.departmentIds);
      if (!isOwner(actor)) throw new Error("Only an administrator or Executive can create projects.");
      if (!departmentIds.length) throw new Error("Select at least one department.");
      const departments = departmentIds.map((departmentId) => data.departments.find((department) => department.id === departmentId && (!department.orgId || department.orgId === actor.orgId)));
      if (departments.some((department) => !department)) throw new Error("One or more selected departments are not available in your organization.");
      if (isExecutive(actor) && !departmentIds.includes(actor.departmentId)) throw new Error("Executives can create projects involving their own department.");
      const code = String(input.code || "").trim().toUpperCase(); const name = String(input.name || "").trim();
      if (!name || !code) throw new Error("Project name and code are required.");
      if (data.projects.some((project) => project.orgId === actor.orgId && project.code.toUpperCase() === code)) throw new Error("A project with this code already exists.");
      const memberIds = unique(input.memberIds); const managerIds = unique(input.managerIds); const teamLeadIds = unique(input.teamLeadIds);
      const selectedMembers = memberIds.map((memberId) => data.members.find((member) => member.id === memberId));
      if (selectedMembers.some((member) => !member || !allowedMemberForActor(data, actor, member))) throw new Error("Every project member must belong to your authorized hierarchy.");
      const selectedManagers = managerIds.map((memberId) => data.members.find((member) => member.id === memberId));
      if (selectedManagers.some((member) => !member || member.roleType !== "manager")) throw new Error("Only Managers can be responsible project managers.");
      if (selectedManagers.some((member) => !allowedMemberForActor(data, actor, member))) throw new Error("You can assign a project only to Managers in your own reporting hierarchy.");
      if (isExecutive(actor) && selectedManagers.some((member) => !departmentIds.includes(member.departmentId))) throw new Error("Managers must belong to a department in this project.");
      const selectedTeamLeaders = teamLeadIds.map((memberId) => data.members.find((member) => member.id === memberId));
      if (selectedTeamLeaders.some((member) => !member || member.roleType === "admin" || member.roleType === "executive" || !allowedMemberForActor(data, actor, member))) throw new Error("Select Team Leaders from your authorized hierarchy.");
      const project = { id: id("proj"), orgId: actor.orgId, name, code, desc: String(input.desc || "").trim(), departmentIds, departmentNames: departments.map((department) => department.name), department: departments[0].name, memberIds: unique([...memberIds, ...managerIds, ...teamLeadIds]), managerIds, teamLeadIds: [], status: input.status || "In Progress", startDate: input.startDate || new Date().toISOString().slice(0, 10), endDate: input.endDate || "", createdBy: actor.id, createdByName: actor.fullName, assignedBy: actor.id, assignedByName: actor.fullName, createdAt: today(), assignmentHistory: [] };
      validateProjectParticipants(data, project, project.memberIds, teamLeadIds);
      data.projects.push(project);
      this.assignMembersToProject(project.id, { memberIds: project.memberIds, teamLeadIds, _data: data, _actor: actor });
      writeData(data); return project;
    },
    assignMembersToProject(projectId, input) {
      const data = input._data || readData(); 
      const actor = input._actor || requireActor(data); 
      const project = getProject(data, projectId);
      if (!project || !canManageProject(data, actor, project)) throw new Error("You are not authorized to assign this project.");
      const memberIds = unique([...(project.memberIds || []), ...(input.memberIds || [])]);
      const managerIds = unique(input.managerIds || project.managerIds || []);
      const teamLeadIds = unique(input.teamLeadIds || project.teamLeadIds || []);
      validateProjectParticipants(data, project, memberIds, teamLeadIds);
      const selectedMembers = memberIds.map((memberId) => data.members.find((member) => member.id === memberId));
      const newlyRequested = unique(input.memberIds || []);
      if (newlyRequested.some((memberId) => !allowedMemberForActor(data, actor, data.members.find((member) => member.id === memberId)))) throw new Error("You can assign only members in your own reporting hierarchy.");
      const selectedManagers = managerIds.map((memberId) => data.members.find((member) => member.id === memberId));
      if (selectedManagers.some((member) => !memberIds.includes(member && member.id) || member.roleType !== "manager")) throw new Error("Project managers must be assigned Managers in this project.");
      if (selectedManagers.some((member) => !allowedMemberForActor(data, actor, member))) throw new Error("You can assign only Managers in your own reporting hierarchy.");
      if (actor.roleType === "manager" && managerIds.some((memberId) => !project.managerIds.includes(memberId))) throw new Error("Managers cannot change project manager assignments.");
      const selectedTeamLeaders = teamLeadIds.map((memberId) => data.members.find((member) => member.id === memberId));
      if (selectedTeamLeaders.some((member) => !member || member.roleType === "admin" || member.roleType === "executive" || !allowedMemberForActor(data, actor, member))) throw new Error("Team Leaders must belong to the assigning user's hierarchy.");
      project.memberIds = memberIds; project.managerIds = managerIds; project.teamLeadIds = teamLeadIds;
      const assignedAt = today();
      project.assignmentHistory = Array.isArray(project.assignmentHistory) ? project.assignmentHistory : [];
      project.assignmentHistory.unshift({ id: id("history"), action: "Project assignment updated", actorId: actor.id, actorName: actor.fullName, assignedTo: memberIds, assignedAt, at: assignedAt });
      memberIds.forEach((memberId) => {
        const member = data.members.find((item) => item.id === memberId);
        let assignment = data.projectAssignments.find((item) => item.projectId === project.id && item.memberId === memberId);
        if (!assignment) { assignment = { id: id("assignment"), projectId: project.id, memberId, departmentId: member.departmentId, isTeamLeader: false, assignedAt, assignedBy: actor.id, assignedByName: actor.fullName, history: [] }; data.projectAssignments.push(assignment); }
        assignment.history = Array.isArray(assignment.history) ? assignment.history : [];
        assignment.history.unshift({ actorId: actor.id, actorName: actor.fullName, at: assignedAt, action: "Assigned to project" });
        assignment.isTeamLeader = teamLeadIds.includes(memberId);
        member.projectIds = unique([...(member.projectIds || []), project.id]);
      });
      if (!input._data) writeData(data); return project;
    },
    addTask(taskInput, legacyTaskData) {
      const input = typeof taskInput === "string" ? { ...(legacyTaskData || {}), employeeIds: [taskInput] } : (taskInput || {});
      const data = readData(); const actor = requireActor(data); const project = getProject(data, input.projectId);
      if (!project || !canManageProject(data, actor, project)) throw new Error("You are not authorized to assign work in this project.");
      const employeeIds = unique(input.employeeIds); const teamLeadIds = unique(input.teamLeadIds || [input.teamLeadId]);
      const projectMembers = new Set(project.memberIds || []);
      if (!employeeIds.length || employeeIds.some((memberId) => !projectMembers.has(memberId))) throw new Error("Tasks may only be assigned to project members.");
      if (teamLeadIds.some((memberId) => !project.teamLeadIds.includes(memberId))) throw new Error("Select a project Team Leader for this task.");
      const teamLeaders = teamLeadIds.map((memberId) => data.members.find((member) => member.id === memberId));
      if (teamLeaders.some((member) => !member || member.roleType === "admin" || member.roleType === "executive" || !allowedMemberForActor(data, actor, member) || (actor.roleType === "manager" && !isUnderManager(member, actor)))) throw new Error("Managers can assign tasks only to Team Leaders in their own team.");
      const assignedAt = today();
      const task = { id: id("task"), projectId: project.id, managerIds: unique(input.managerIds || [actor.id]), teamLeadIds, employeeIds, assignedBy: actor.id, assignedByName: actor.fullName, assignedAt, title: String(input.title || "Untitled Task").trim(), desc: input.desc || "", priority: input.priority || "Medium", category: input.category || "General", dueDate: input.dueDate || "", status: "Assigned", progress: 0, completed: false, reviewStatus: "Not submitted", subtasks: [], assignmentHistory: [] };
      history(task, "Task assigned", actor, `Assigned to ${employeeIds.length} project member(s).`); data.tasks.push(task); writeData(data); return task;
    },
    updateTask(taskId, updates) {
      const data = readData(); 
      const actor = requireActor(data); 
      const task = data.tasks.find((item) => item.id === taskId); 
      const project = task && getProject(data, task.projectId);
      if (!task || !project) throw new Error("Task not found.");
      const canManage = canManageProject(data, actor, project); const isLead = task.teamLeadIds.includes(actor.id); const isAssignee = task.employeeIds.includes(actor.id);
      if (!canManage && !isLead && !isAssignee) throw new Error("You are not authorized to update this task.");
      if (isAssignee && !isLead && !canManage && Object.keys(updates).some((key) => !["progress", "status"].includes(key))) throw new Error("Members may only update task progress.");
      Object.assign(task, updates);
      if (task.status === "Completed") { task.completed = true; task.progress = 100; task.reviewStatus = "Approved"; }
      else if (task.status === "Pending Review") task.reviewStatus = "Awaiting review";
      else task.completed = false;
      history(task, task.status === "Completed" ? "Task approved" : "Task updated", actor, task.status);
      writeData(data); return task;
    },
    deleteTask(taskId) {
      const data = readData(); const actor = requireActor(data); const task = data.tasks.find((item) => item.id === taskId); const project = task && getProject(data, task.projectId);
      if (!task || !canManageProject(data, actor, project)) throw new Error("You are not authorized to delete this task.");
      data.tasks = data.tasks.filter((item) => item.id !== taskId); writeData(data); return true;
    },
    toggleTask(taskId) { const task = this.getStore().tasks.find((item) => item.id === taskId); return this.updateTask(taskId, { status: task && task.completed ? "In Progress" : "Completed" }); },
    getSummaryStats() {
      const scope = this.getScopedDirectoryData();
      const completed = scope.projects.filter((project) => project.status === "Completed").length;
      const working = scope.members.filter((member) => member.isCheckedIn).length;
      const done = scope.tasks.filter((task) => task.completed || task.status === "Completed").length;
      const overdue = scope.tasks.filter((task) => task.overdue || task.status === "Overdue").length;
      return { totalDepartments: scope.departments.length, totalProjects: scope.projects.length, totalProjectsCompleted: completed, totalProjectsPending: scope.projects.length - completed, totalEmployees: scope.members.length, totalWorkingToday: working, totalNotWorkingToday: scope.members.length - working, totalTasks: scope.tasks.length, completedTasks: done, pendingTasks: scope.tasks.length - done, overdueTasks: overdue, completionRate: scope.tasks.length ? Math.round(done / scope.tasks.length * 100) : 0 };
    },
    getDepartmentDetail(departmentId) {
      const scope = this.getScopedDirectoryData();
      const department = scope.departments.find((item) => item.id === departmentId || item.name === departmentId);
      if (!department) return null;
      const projects = scope.projects.filter((project) => (project.departmentIds || []).includes(department.id) || project.department === department.name).map((project) => this.getProjectDetail(project.id)).filter(Boolean);
      const members = scope.members.filter((member) => member.departmentId === department.id || member.department === department.name);
      const projectIds = new Set(projects.map((item) => item.project.id));
      const tasks = scope.tasks.filter((task) => projectIds.has(task.projectId) || task.employeeIds.some((id) => members.some((member) => member.id === id)));
      const done = tasks.filter((task) => task.completed || task.status === "Completed").length;
      return { department, projects, members, totalProjects: projects.length, totalEmployees: members.length, totalTasks: tasks.length, completedTasks: done, pendingTasks: tasks.length - done, completionRate: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
    },
    getProjectDetail(projectId) {
      const scope = this.getScopedDirectoryData();
      const project = scope.projects.find((item) => item.id === projectId || item.code === projectId);
      if (!project) return null;
      const organization = scope.organizations.find((item) => item.id === project.orgId) || { name: "Organization", code: "ORG" };
      const department = scope.departments.find((item) => (project.departmentIds || []).includes(item.id) || item.name === project.department) || { id: project.department, name: project.department || "Unassigned", head: "", headEmail: "" };
      const team = getProjectMembers(scope.data, project);
      const tasks = scope.tasks.filter((task) => task.projectId === project.id);
      const completedTasks = tasks.filter((task) => task.completed || task.status === "Completed").length;
      const overdueTasks = tasks.filter((task) => task.overdue || task.status === "Overdue").length;
      const projectManager = team.find((member) => (project.managerIds || []).includes(member.id)) || null;
      return { project, organization, department, team, projectManager, tasks, totalTasks: tasks.length, completedTasks, pendingTasks: tasks.length - completedTasks, overdueTasks, completionRate: tasks.length ? Math.round(completedTasks / tasks.length * 100) : 0, startDate: project.startDate || "", endDate: project.endDate || "", status: project.status || "Active" };
    },
    getMemberDetail(memberId) {
      const scope = this.getScopedDirectoryData();
      const member = scope.members.find((item) => item.id === memberId);
      if (!member) return null;
      const department = scope.departments.find((item) => item.id === member.departmentId || item.name === member.department) || { id: member.departmentId, name: member.department || "Unassigned", head: "", headEmail: "" };
      const projects = scope.projects.filter((project) => (project.memberIds || []).includes(member.id) || project.id === member.projectId || project.code === member.projectCode);
      const tasks = scope.tasks.filter((task) => (task.employeeIds || []).includes(member.id) || task.memberId === member.id || (member.roleType === "team_leader" && (task.teamLeadIds || []).includes(member.id)));
      const completedTasks = tasks.filter((task) => task.completed || task.status === "Completed").length;
      return { member, department, projects, projectContributions: projects.map((project) => ({ project, totalTasks: tasks.filter((task) => task.projectId === project.id).length })), tasks, totalTasks: tasks.length, completedTasks, pendingTasks: tasks.length - completedTasks, overdueTasks: tasks.filter((task) => task.overdue || task.status === "Overdue").length, completionRate: tasks.length ? Math.round(completedTasks / tasks.length * 100) : 0, attendance: { workingDaysInMonth: member.workingDaysInMonth || 0, daysPresent: member.daysPresent || 0, daysAbsent: member.daysAbsent || 0, daysOnLeave: member.daysOnLeave || 0, lateArrivals: member.lateArrivals || 0 } };
    },
    getScopedDirectoryData() {
      const data = readData(); const user = getUser(data); const orgId = user && user.orgId;
      const orgProjects = data.projects.filter((project) => !orgId || project.orgId === orgId);
      const projects = user ? orgProjects.filter((project) => canViewProject(data, user, project)) : orgProjects;
      const visibleProjectIds = new Set(projects.map((project) => project.id));
      const orgMembers = data.members.filter((member) => !orgId || member.orgId === orgId);
      const members = !user || isAdmin(user) ? orgMembers : orgMembers.filter((member) => member.id === user.id || projects.some((project) => (project.memberIds || []).includes(member.id)) || (user.roleType === "executive" && isUnderExecutive(data, member, user)) || (user.roleType === "manager" && member.managerId === user.id));
      const names = new Set([...projects.map((project) => project.department).filter(Boolean), ...members.map((member) => member.department).filter(Boolean)]);
      const departments = data.departments.filter((department) => !orgId || department.orgId === orgId || (!department.orgId && names.has(department.name)));
      const tasks = data.tasks.filter((task) => visibleProjectIds.has(task.projectId) && (!user || isAdmin(user) || (user.roleType === "manager" && task.managerIds.includes(user.id)) || (user.roleType === "team_leader" && task.teamLeadIds.includes(user.id)) || task.employeeIds.includes(user.id)));
      return { data, user, orgId, organizations: data.organizations || [], departments, projects, members, tasks };
    }
  };
  window.TerraHireCorporateStore = window.TerraHireStore;
})();

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

/* =========================================================
   DIRECTORY HELPERS
   Keep directory calculations inside the active organization.
   Older demo records do not have orgId on departments, so those
   departments are inferred from the active organization's projects
   and members for backwards compatibility.
   ========================================================= */

// function getDirectoryScope() {
//   const data = getAppData();
//   const userId = sessionStorage.getItem(SESSION_KEY);
//   const user = userId && Array.isArray(data.members)
//     ? data.members.find((member) => member.id === userId)
//     : null;
//   const orgId = user && user.orgId ? user.orgId : null;

//   const projects = (data.projects || []).filter((project) => !orgId || project.orgId === orgId);
//   const members = (data.members || []).filter((member) => !orgId || member.orgId === orgId);
//   const departmentNames = new Set([
//     ...projects.map((project) => project.department).filter(Boolean),
//     ...members.map((member) => member.department).filter(Boolean),
//   ]);
//   const departments = (data.departments || []).filter((department) => {
//     if (department.orgId) return !orgId || department.orgId === orgId;
//     return !orgId || departmentNames.has(department.name);
//   });
//   const tasks = (data.tasks || []).filter((task) => {
//     const project = projects.find((item) => item.id === task.projectId);
//     const member = members.find((item) => item.id === task.memberId);
//     return Boolean(project || member);
//   });

//   return { data, user, orgId, organizations: data.organizations || [], departments, projects, members, tasks };
// }

function getDirectoryScope() {
  const data = getAppData();
  const rawUser = sessionStorage.getItem(SESSION_KEY);
  let userId = null;

  // Safely extract userId from JSON object or plain string
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      userId = typeof parsed === "object" && parsed !== null ? parsed.id : parsed;
    } catch (e) {
      userId = rawUser; // Fallback for plain ID strings
    }
  }

  const user = userId && Array.isArray(data.members)
    ? data.members.find((member) => member.id === userId)
    : null;
  const orgId = user && user.orgId ? user.orgId : null;

  const projects = (data.projects || []).filter((project) => !orgId || project.orgId === orgId);
  const members = (data.members || []).filter((member) => !orgId || member.orgId === orgId);
  
  const departmentNames = new Set([
    ...projects.map((project) => project.department).filter(Boolean),
    ...members.map((member) => member.department).filter(Boolean),
  ]);

  const departments = (data.departments || []).filter((department) => {
    if (department.orgId) return !orgId || department.orgId === orgId;
    return !orgId || departmentNames.has(department.name);
  });

  const tasks = (data.tasks || []).filter((task) => {
    const project = projects.find((item) => item.id === task.projectId);
    const member = members.find((item) => item.id === task.memberId);
    return Boolean(project || member);
  });

  return { data, user, orgId, organizations: data.organizations || [], departments, projects, members, tasks };
}
function getTaskMetrics(tasks) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed || task.status === "Done").length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = tasks.filter((task) => task.overdue || task.status === "Overdue").length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  return { totalTasks, completedTasks, pendingTasks, overdueTasks, completionRate };
}

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

  getScopedDirectoryData() {
    return getDirectoryScope();
  },

  setStore(data) {
    saveAppData(data);
  },

  getCurrentUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw); // Returns full user object
    } catch (e) {
      const store = getAppData();
      return store?.members?.find(m => m.id === raw) || null;
    }
  },

  setCurrentUser(user) {
  try {
    if (user && user.id) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch (error) {
    console.error("Could not save user to sessionStorage:", error);
  }
},

  getSummaryStats() {
    const scope = getDirectoryScope();
    const metrics = getTaskMetrics(scope.tasks);
    const totalProjectsCompleted = scope.projects.filter((project) => project.status === "Completed").length;
    const totalProjectsPending = scope.projects.length - totalProjectsCompleted;
    const totalWorkingToday = scope.members.filter((member) => member.isCheckedIn).length;

    return {
      totalDepartments: scope.departments.length,
      totalProjects: scope.projects.length,
      totalProjectsCompleted,
      totalProjectsPending,
      totalEmployees: scope.members.length,
      totalWorkingToday,
      totalNotWorkingToday: scope.members.length - totalWorkingToday,
      ...metrics,
    };
  },

  getDepartmentDetail(departmentId) {
    const scope = getDirectoryScope();
    const department = scope.departments.find(
      (item) => item.id === departmentId || item.name === departmentId
    );
    if (!department) return null;

    const projects = scope.projects
      .filter((project) => project.department === department.name)
      .map((project) => this.getProjectDetail(project.id));
    const members = scope.members.filter((member) => member.department === department.name);
    const tasks = scope.tasks.filter((task) => {
      const project = scope.projects.find((item) => item.id === task.projectId);
      const member = scope.members.find((item) => item.id === task.memberId);
      return (project && project.department === department.name) || (member && member.department === department.name);
    });

    return {
      department,
      projects: projects.filter(Boolean),
      members,
      ...getTaskMetrics(tasks),
      totalEmployees: members.length,
      totalProjects: projects.filter(Boolean).length,
    };
  },

  getProjectDetail(projectId) {
    const scope = getDirectoryScope();
    const project = scope.projects.find(
      (item) => item.id === projectId || item.code === projectId
    );
    if (!project) return null;

    const organization = scope.organizations.find((item) => item.id === project.orgId) || {
      name: "Organization",
      code: "ORG",
    };
    const department = scope.departments.find((item) => item.name === project.department) || {
      id: project.department,
      name: project.department || "Unassigned",
      head: "—",
      headEmail: "",
    };
    const team = scope.members.filter(
      (member) => member.projectId === project.id || member.projectCode === project.code
    );
    const tasks = scope.tasks.filter((task) => task.projectId === project.id);
    const metrics = getTaskMetrics(tasks);
    const projectManager = team.find(
      (member) => member.fullName && member.fullName.toLowerCase() === String(project.pmName || "").toLowerCase()
    ) || null;

    return {
      project,
      organization,
      department,
      team,
      projectManager,
      tasks,
      startDate: project.startDate || "—",
      endDate: project.endDate || "—",
      status: project.status || "Active",
      ...metrics,
    };
  },

  getMemberDetail(memberId) {
    const scope = getDirectoryScope();
    const member = scope.members.find((item) => item.id === memberId);
    if (!member) return null;

    const department = scope.departments.find((item) => item.name === member.department) || {
      id: member.department,
      name: member.department || "Unassigned",
      head: "—",
      headEmail: "",
    };
    const projects = scope.projects.filter(
      (project) => project.id === member.projectId || project.code === member.projectCode
    );
    const tasks = scope.tasks.filter((task) => task.memberId === member.id);
    const projectContributions = projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id);
      return { project, ...getTaskMetrics(projectTasks) };
    });

    return {
      member,
      department,
      projects,
      projectContributions,
      tasks,
      attendance: {
        workingDaysInMonth: member.workingDaysInMonth || 0,
        daysPresent: member.daysPresent || 0,
        daysAbsent: member.daysAbsent || 0,
        daysOnLeave: member.daysOnLeave || 0,
        lateArrivals: member.lateArrivals || 0,
      },
      ...getTaskMetrics(tasks),
    };
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

// The legacy demo helpers above are retained for pages that still reference
// them; the corporate store is installed last so all public mutations use the
// validated many-to-many model.
window.TerraHireStore = window.TerraHireCorporateStore;
