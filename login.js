/**
 * TerraHire — Login Portal Logic
 * Direct localStorage authentication
 */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "terrahire_state_v1";
  const SESSION_KEY = "terrahire_session_user";

  const form = document.getElementById("form-login");
  const errEl = document.getElementById("login-error");
  const inputId = document.getElementById("input-identifier");
  const inputPass = document.getElementById("input-password");

  /* =========================================================
     LOCAL STORAGE HELPERS
     ========================================================= */

  function getStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      return JSON.parse(raw);
    } catch (error) {
      console.error("Could not read localStorage:", error);
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user && user.id) {
      sessionStorage.setItem(SESSION_KEY, user.id);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  function showError(message) {
    if (errEl) {
      errEl.textContent = message;
      errEl.classList.remove("hidden");
    }
  }

  function clearError() {
    if (errEl) {
      errEl.textContent = "";
      errEl.classList.add("hidden");
    }
  }

  /* =========================================================
     QUICK LOGIN FILL BUTTONS
     ========================================================= */

  const quickFills = document.querySelectorAll(".btn-quick-fill");

  quickFills.forEach((button) => {
    button.addEventListener("click", () => {
      const identifier = button.getAttribute("data-id");
      const password = button.getAttribute("data-pass");

      if (inputId && identifier) {
        inputId.value = identifier;
      }

      if (inputPass && password) {
        inputPass.value = password;
      }

      clearError();
    });
  });

  if (!form) {
    return;
  }

  /* =========================================================
     LOGIN SUBMIT
     ========================================================= */

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();

    const identifier = inputId?.value.trim().toLowerCase() || "";
    const password = inputPass?.value.trim() || "";

    if (!identifier) {
      showError("Please enter your email, full name, or project code.");
      inputId?.focus();
      return;
    }

    if (!password) {
      showError("Please enter your password.");
      inputPass?.focus();
      return;
    }

    const store = getStore();

    if (!store || !Array.isArray(store.members)) {
      showError(
        "No member data found. Please refresh the page or initialize localStorage."
      );
      return;
    }

    /* -------------------------------------------------------
       FIND MEMBER:
       Login accepted with:
       - Email
       - Full name
       - Project code
       ------------------------------------------------------- */

    let matchedMember = store.members.find((member) => {
      const memberEmail = String(member.email || "").toLowerCase();
      const memberName = String(member.fullName || "").toLowerCase();

      return (
        memberEmail === identifier ||
        memberName === identifier
      );
    });

    /* If the person enters a project code:
       Find the project, then select its project manager first. */

    if (!matchedMember) {

      const project = (store.projects || []).find(
        (item) =>
          String(item.code || "").toLowerCase() === identifier
      );

      if (project) {

        // For demo login, use the employee assigned
        // to this project's demoEmployeeId.
        if (project.demoEmployeeId) {

          matchedMember = store.members.find(
            (member) =>
              member.id === project.demoEmployeeId
          );

        }

        // Fallback: use the project manager
        if (!matchedMember) {

          matchedMember = store.members.find(
            (member) =>
              member.projectId === project.id &&
              String(member.fullName || "").toLowerCase() ===
              String(project.pmName || "").toLowerCase()
          );
        }
      }
    }

    /* -------------------------------------------------------
       MEMBER NOT FOUND
       ------------------------------------------------------- */

    if (!matchedMember) {
      showError(
        "Account not found. Please enter the correct email, project code, or full name."
      );
      return;
    }

    /* -------------------------------------------------------
       PASSWORD CHECK
       Only that member's own password is accepted.
       ------------------------------------------------------- */

    const storedPassword = String(matchedMember.password || "");

    if (!storedPassword || password !== storedPassword) {
      showError("Incorrect email/project code or password. Please try again.");
      inputPass?.focus();
      return;
    }

    /* -------------------------------------------------------
       ACCOUNT STATUS CHECK
       ------------------------------------------------------- */

    if (
      matchedMember.status &&
      String(matchedMember.status).toLowerCase() !== "active"
    ) {
      showError("This account is inactive. Please contact the administrator.");
      return;
    }

    /* -------------------------------------------------------
       SUCCESS: Save only user ID in sessionStorage
       ------------------------------------------------------- */

    setCurrentUser(matchedMember);

    console.log("✅ Login successful:", {
      id: matchedMember.id,
      name: matchedMember.fullName,
      role: matchedMember.roleType,
      department: matchedMember.department,
      projectCode: matchedMember.projectCode
    });
    const dashboard =
      window.TerraHireStore.getDashboardForRole(matchedMember);

    window.location.href = dashboard;

  });
});