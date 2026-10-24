export function isHiringDepartment(user) {
  return user?.department?.name?.trim().toLowerCase() === "hr & hiring";
}
