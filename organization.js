"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("organization-form");

    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!form.checkValidity()) {
            return form.reportValidity();
        }

        const result = TerraHireTenant.registerOrganization({
            organizationName: document.getElementById("organization-name").value,
            organizationCode: document.getElementById("organization-code").value,
            adminName: document.getElementById("admin-name").value,
            adminEmail: document.getElementById("admin-email").value,
            password: document.getElementById("admin-password").value
        });

        if (result.error) {
            document.getElementById("organization-error").textContent = result.error;
            return;
        }

        location.href = "admin.html";
    });
});