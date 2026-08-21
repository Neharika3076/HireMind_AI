/**
 * TerraHire — Login Portal Logic
 */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-login");
  const errEl = document.getElementById("login-error");
  const inputId = document.getElementById("input-identifier");
  const inputPass = document.getElementById("input-password");

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

  /* Quick Fill Handler */
  const quickFills = document.querySelectorAll(".btn-quick-fill");
  quickFills.forEach((button) => {
    button.addEventListener("click", () => {
      const identifier = button.getAttribute("data-id");
      const password = button.getAttribute("data-pass");

      if (inputId && identifier) inputId.value = identifier;
      if (inputPass && password) inputPass.value = password;

      clearError();
    });
  });

  if (!form) return;

  /* Form Submit Listener */
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();

    const identifier = inputId?.value.trim().toLowerCase() || "";
    const password = inputPass?.value.trim() || "";

    if (!identifier) {
      showError("Please enter your email, full name, or ID.");
      inputId?.focus();
      return;
    }

    if (!password) {
      showError("Please enter your password.");
      inputPass?.focus();
      return;
    }

    // Get store data via TerraHireStore helper
    const store = window.TerraHireStore?.getStore();

    if (!store || !Array.isArray(store.members)) {
      showError("No member data found. Please refresh or reset localStorage.");
      return;
    }

    /* 1. MATCH MEMBER BY ID, EMAIL, OR FULL NAME */
    const matchedMember = store.members.find((member) => {
      const mId = String(member.id || "").toLowerCase();
      const mEmail = String(member.email || "").toLowerCase();
      const mName = String(member.fullName || "").toLowerCase();

      return mId === identifier || mEmail === identifier || mName === identifier;
    });

    if (!matchedMember) {
      showError("Account not found. Please check your details.");
      return;
    }

    /* 2. PASSWORD CHECK */
    const storedPassword = String(matchedMember.password || "");
    if (password !== storedPassword) {
      showError("Incorrect password. Please try again.");
      inputPass?.focus();
      return;
    }

    /* 3. STORE SESSION USER ID */
    // Uses TerraHireStore to save user.id so helper methods work correctly
    if (window.TerraHireStore && typeof window.TerraHireStore.setCurrentUser === "function") {
      window.TerraHireStore.setCurrentUser(matchedMember);
    } else {
      sessionStorage.setItem("terrahire_session_user", JSON.stringify(matchedMember));
    }

    console.log("✅ Login successful for:", matchedMember.fullName);

    /* 4. REDIRECT VIA ROLE ROUTER */
    let dashboardPath = "./employee.html";

    if (window.TerraHireStore && typeof window.TerraHireStore.getDashboardForRole === "function") {
      dashboardPath = window.TerraHireStore.getDashboardForRole(matchedMember);
    }

    window.location.href = dashboardPath;
  });
});