"use strict";

(function () {
  const KEY = "terrahire_state_v1";
  const SESSION_KEY = "terrahire_session_user";

  const read = () =>
    JSON.parse(localStorage.getItem(KEY) || "{}");

  const write = (store) =>
    localStorage.setItem(KEY, JSON.stringify(store));

  const id = (prefix) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const code = (value) =>
    String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");

  const ensure = (store) => {
    store.organizations ||= [];
    store.members ||= [];
    store.projects ||= [];
    store.departments ||= [];
    store.jobOpenings ||= [];

    return store;
  };

  const currentUser = () => {
    const uid = sessionStorage.getItem(SESSION_KEY);

    return uid
      ? (read().members || []).find(
        (member) => member.id === uid
      ) || null
      : null;
  };

  window.TerraHireTenant = {
    currentUser,

    currentOrganization() {
      const user = currentUser();
      const store = read();

      return user
        ? (store.organizations || []).find(
          (org) => org.id === user.orgId
        ) || null
        : null;
    },

    getScopedData() {
      const user = currentUser();

      if (!user) return null;

      const store = read();

      const scoped = (items) =>
        (items || []).filter(
          (item) => item.orgId === user.orgId
        );

      return {
        organization: (store.organizations || []).find(
          (org) => org.id === user.orgId
        ),
        members: scoped(store.members),
        projects: scoped(store.projects),
        departments: scoped(store.departments),
      };
    },

    registerOrganization({
      organizationName,
      organizationCode,
      adminName,
      adminEmail,
      password,
    }) {
      const store = ensure(read());
      const orgCode = code(organizationCode);

      if (orgCode.length < 4) {
        return {
          error:
            "Use an organization code with at least 4 letters or numbers.",
        };
      }

      if (
        store.organizations.some(
          (org) => org.code === orgCode
        )
      ) {
        return {
          error:
            "That organization code is already registered.",
        };
      }

      if (
        store.members.some(
          (member) =>
            String(member.email).toLowerCase() ===
            String(adminEmail).toLowerCase()
        )
      ) {
        return {
          error:
            "An account already uses that email address.",
        };
      }

      const org = {
        id: id("org"),
        name: organizationName.trim(),
        code: orgCode,
        domain: adminEmail.split("@")[1] || "",
        plan: "Starter",
        status: "Active",
        createdAt: new Date().toISOString(),
      };

      const admin = {
        id: id("usr"),
        orgId: org.id,
        roleType: "admin",
        roleCategory: "Administrator",
        fullName: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password,
        status: "Active",
        joinedDate: new Date().toISOString().slice(0, 10),
        designation: "Organization Administrator",
      };

      store.organizations.push(org);
      store.members.push(admin);

      write(store);

      sessionStorage.setItem(
        SESSION_KEY,
        admin.id
      );

      return {
        org,
        admin,
      };
    },

    createJobOpening({
      code: orgCode,
      title,
      company,
      description,
      duration,
      seats,
      workplace,
    }) {
      const user = currentUser();
      const store = ensure(read());

      const org =
        user &&
        store.organizations.find(
          (item) => item.id === user.orgId
        );

      if (
        !user ||
        user.roleType !== "admin" ||
        !org ||
        org.code !== code(orgCode)
      ) {
        return {
          error:
            "Organization code verification failed. Please sign in as the organization administrator.",
        };
      }

      const job = {
        id: id("job"),
        orgId: org.id,
        organizationName: company.trim(),
        title: title.trim(),
        description: description.trim(),
        duration,
        seats: Number(seats),
        workplace,
        status: "Open",
        postedAt: new Date().toISOString(),
      };

      store.jobOpenings.unshift(job);

      write(store);

      return {
        job,
      };
    },

    publicJobOpenings() {
      return (read().jobOpenings || []).filter(
        (job) => job.status === "Open"
      );
    },
  };
})();