/**
 * TerraHire — Login Portal Logic
 * Handles authentication for Admin and Employee access
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-login");
  const errEl = document.getElementById("login-error");
  const inputId = document.getElementById("input-identifier");
  const inputPass = document.getElementById("input-password");

  // Quick-fill buttons
  const quickFills = document.querySelectorAll(".btn-quick-fill");
  quickFills.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idVal = btn.getAttribute("data-id");
      const passVal = btn.getAttribute("data-pass");
      if (inputId && idVal) inputId.value = idVal;
      if (inputPass && passVal) inputPass.value = passVal;
      if (errEl) errEl.textContent = "";
    });
  });

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (errEl) errEl.textContent = "";

    const identifier = inputId ? inputId.value.trim().toLowerCase() : "";
    const password = inputPass ? inputPass.value.trim() : "";

    if (!identifier) {
      if (errEl) errEl.textContent = "Please enter your Admin Email or Project Code.";
      if (inputId) inputId.focus();
      return;
    }

    if (!password) {
      if (errEl) errEl.textContent = "Please enter your password.";
      if (inputPass) inputPass.focus();
      return;
    }

    const store = window.TerraHireStore ? window.TerraHireStore.getStore() : null;
    if (!store) {
      if (errEl) errEl.textContent = "Data store error. Please refresh the page.";
      return;
    }

    // 1. Check Admin Login credentials
    if (
      identifier === "khushi123@gmail.com" ||
      identifier === "admin@terrahire.com" ||
      identifier === "admin"
    ) {
      if (password === "Khushi123@" || password === "admin123" || password === "demo123") {
        const admin = store.members.find((m) => m.roleType === "admin") || store.members[0];
        admin.email = "khushi123@gmail.com";
        admin.fullName = "Khushi Admin";
        window.TerraHireStore.setCurrentUser(admin);
        window.location.href = "./employee.html";
        return;
      } else {
        if (errEl) errEl.textContent = "Invalid password for Admin. (Khushi123@)";
        return;
      }
    }

    // 2. Match Employee by Project Code or Email or Name
    let matchedUser = store.members.find((m) => {
      return (
        (m.projectCode && m.projectCode.toLowerCase() === identifier) ||
        (m.email && m.email.toLowerCase() === identifier) ||
        (m.fullName && m.fullName.toLowerCase() === identifier) ||
        (identifier === "sarah" && m.fullName.toLowerCase().includes("sarah"))
      );
    });

    if (!matchedUser) {
      const matchedProj = store.projects.find((p) => p.code.toLowerCase() === identifier);
      if (matchedProj) {
        matchedUser = store.members.find(
          (m) =>
            m.projectId === matchedProj.id ||
            (m.projectCode && m.projectCode.toLowerCase() === matchedProj.code.toLowerCase())
        );
      }
    }

    if (!matchedUser) {
      if (errEl) errEl.textContent = "No account found. Use khushi123@gmail.com or project code like BILL-01.";
      return;
    }

    if (
      password !== "Khushi123@" &&
      password !== "demo123" &&
      password !== (matchedUser.password || "emp123")
    ) {
      if (errEl) errEl.textContent = "Incorrect password. (Khushi123@)";
      return;
    }

    // Set active session user & redirect to home dashboard
    window.TerraHireStore.setCurrentUser(matchedUser);
    window.location.href = "./employee.html";
  });
});

