const stripTrailingSlash = (value) => String(value || "").replace(/\/$/, "");

// Vite proxies these paths locally. Set the matching VITE_* values in
// production to the separately deployed Express service URLs.
export const ORGANIZATION_API_BASE_URL =
  "https://hiremind-organization.onrender.com/api";

export const RECRUITMENT_API_BASE_URL = stripTrailingSlash(
  import.meta.env.VITE_RECRUITMENT_API_BASE || "/api/recruitment"
);
export const RESUME_API_BASE_URL = stripTrailingSlash(
  import.meta.env.VITE_RESUME_API_BASE || "/api/resume"
);