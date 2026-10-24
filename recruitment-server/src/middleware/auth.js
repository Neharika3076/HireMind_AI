export function requireRecruiter(req, res, next) {
  // The current EMS has only browser-local authentication. These headers are
  // intentionally a development bridge, not a production auth system.
  // Fail closed in production until a server-verified login/session is wired
  // in; client-supplied organization headers alone are forgeable.
  if (process.env.NODE_ENV === "production") return res.status(503).json({ error: "Server-side recruiter authentication is not configured." });
  const id = req.header("x-ems-user-id");
  const name = req.header("x-ems-user-name") || "Recruiter";
  const role = req.header("x-ems-user-role");
  const departmentName = req.header("x-ems-user-department") || "";
  const organizationId = req.header("x-ems-organization-id");
  if (!id || !role || !organizationId) return res.status(401).json({ error: "Sign in through the EMS to access recruitment data." });
  const isHiringDepartment = departmentName.trim().toLowerCase() === "hr & hiring";
  if (!["admin", "executive", "manager"].includes(role) && !isHiringDepartment) return res.status(403).json({ error: "Recruitment access is limited to administrators, executives, and HR & Hiring department members." });
  req.actor = { id, name, role, organizationId, isHiringDepartment };
  next();
}

export const requireAdminOrExecutive = (req, res, next) => {
  if (!["admin", "executive"].includes(req.actor.role) && !req.actor.isHiringDepartment) return res.status(403).json({ error: "This action requires an administrator, executive, or HR & Hiring department member." });
  next();
};

export const requireAdmin = (req, res, next) => {
  if (req.actor.role !== "admin") return res.status(403).json({ error: "Only an organization administrator can remove a job opening." });
  next();
};
