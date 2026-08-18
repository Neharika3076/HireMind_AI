(function () {
    "use strict";

    var params = new URLSearchParams(location.search);
    var role =
        params.get("role") ||
        sessionStorage.getItem("appliedRole") ||
        "this position";

    var roleEl = document.getElementById("role-name");

    if (roleEl) {
        roleEl.textContent = role;
    }

    var form = document.getElementById("application-form");

    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            if (!form.checkValidity()) {
                return form.reportValidity();
            }

            sessionStorage.setItem("appliedRole", role);
            sessionStorage.setItem(
                "candidateName",
                document.getElementById("full-name").value
            );

            location.href = "interview.html";
        });
    }

    var end = document.getElementById("end-interview");

    if (end) {
        end.addEventListener("click", function () {
            document.getElementById("done").classList.add("show");
        });
    }

    var verifiedCode = "";
    var verify = document.getElementById("verification-form");

    if (verify) {
        var user = TerraHireTenant.currentUser();
        var org = TerraHireTenant.currentOrganization();

        var codeInput = document.getElementById("org-code");
        var emailInput = document.getElementById("admin-email");

        if (!user || user.roleType !== "admin" || !org) {
            document.getElementById("verify-error").textContent =
                "Please sign in with an organization administrator account before posting a job.";

            verify.querySelector("button").disabled = true;
        } else {
            codeInput.value = org.code;
            emailInput.value = user.email;
            document.getElementById("company-name").value = org.name;

            codeInput.readOnly = true;
            emailInput.readOnly = true;
        }

        verify.addEventListener("submit", function (e) {
            e.preventDefault();

            if (!user || !org) {
                return;
            }

            verifiedCode = org.code;

            document.getElementById("verify-step").hidden = true;
            document.getElementById("posting-step").hidden = false;
        });
    }

    var post = document.getElementById("post-job-form");

    if (post) {
        post.addEventListener("submit", function (e) {
            e.preventDefault();

            if (!post.checkValidity()) {
                return post.reportValidity();
            }

            var result = TerraHireTenant.createJobOpening({
                code: verifiedCode,
                title: document.getElementById("job-title").value,
                company: document.getElementById("company-name").value,
                description: document.getElementById("job-description").value,
                duration: document.getElementById("duration").value,
                seats: document.getElementById("seats").value,
                workplace: document.getElementById("workplace").value,
            });

            if (result.error) {
                document.getElementById("post-error").textContent = result.error;
                return;
            }

            document.getElementById("published-message").textContent =
                result.job.title +
                " is now visible on the public job openings page.";

            document.getElementById("posted").classList.add("show");
        });
    }

    var list = document.getElementById("posted-jobs");

    if (list && window.TerraHireTenant) {
        TerraHireTenant.publicJobOpenings().forEach(function (job) {
            var card = document.createElement("article");

            card.className = "job-card";

            card.innerHTML =
                '<div>' +
                '<div class="job-company"></div>' +
                "<h2></h2>" +
                "<p></p>" +
                '<div class="tags"></div>' +
                "</div>" +
                '<a class="apply-button">Apply now</a>';

            card.querySelector(".job-company").textContent =
                job.organizationName;

            card.querySelector("h2").textContent = job.title;

            card.querySelector("p").textContent = job.description;

            card.querySelector(".tags").innerHTML =
                '<span class="tag">' +
                job.workplace +
                "</span>" +
                '<span class="tag">' +
                job.seats +
                " seat(s)</span>" +
                '<span class="tag">Open ' +
                job.duration +
                "</span>";

            card.querySelector("a").href =
                "application.html?role=" + encodeURIComponent(job.title);

            list.appendChild(card);
        });
    }
})();