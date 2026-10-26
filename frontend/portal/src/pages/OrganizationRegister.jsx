import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ORGANIZATION_API_BASE_URL } from "../config/api";
import "./AuthPages.css";

const API_URL = `${ORGANIZATION_API_BASE_URL}/organizations`;

export default function OrganizationRegister() {
  const [form, setForm] = useState({
    organizationName: "",
    organizationCode: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === "organizationCode" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (Object.values(form).some((value) => !value.trim())) {
      setError("Please complete all fields to create your workspace.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail.trim())) {
      setError("Enter a valid administrator email address.");
      return;
    }

    if (form.adminPassword.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organizationName: form.organizationName.trim(),
          organizationCode: form.organizationCode.trim(),
          adminName: form.adminName.trim(),
          adminEmail: form.adminEmail.trim().toLowerCase(),
          password: form.adminPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to create your workspace. Please try again."
        );
      }

      setSuccess("Organization created successfully! Redirecting to your dashboard...");

      // If the backend sets an authentication cookie, this request will
      // keep it available for subsequent authenticated requests.
      setTimeout(() => {
        navigate(data.redirectTo || data.dashboardPath || "/login", {
          replace: true,
        });
      }, 800);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Unable to connect to the server. Make sure your backend is running."
        );
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page auth-register-page">
      <div className="auth-glow auth-glow-one" aria-hidden="true" />
      <div className="auth-glow auth-glow-two" aria-hidden="true" />

      <section
        className="auth-card auth-register-card"
        aria-labelledby="register-title"
      >
        <Link to="/" className="auth-brand" aria-label="Krew home">
          <span className="auth-mark" aria-hidden="true">
            <span />
          </span>
          <span>Krew</span>
          <span className="auth-brand-divider" />
          <span className="auth-brand-context">Organization setup</span>
        </Link>

        <div className="auth-progress">
          <span>WORKSPACE SETUP</span>
          <span>
            STEP 01 <i /> 01
          </span>
        </div>

        <div className="auth-progress-track">
          <span />
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">A BETTER WAY TO WORK</span>
          <h1 id="register-title">
            Bring your team <span>together.</span>
          </h1>
          <p>
            Create your organization workspace and set up its first
            administrator account.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-form-grid">
            <div className="auth-field">
              <label htmlFor="organization-name">Organization name</label>
              <input
                id="organization-name"
                name="organizationName"
                value={form.organizationName}
                onChange={updateField}
                placeholder="e.g. Northstar Studio"
                autoComplete="organization"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="organization-code">
                Unique organization code
              </label>
              <input
                id="organization-code"
                name="organizationCode"
                value={form.organizationCode}
                onChange={updateField}
                placeholder="e.g. NORTHSTAR-26"
                required
              />
              <span className="auth-field-hint">
                Used to identify your workspace
              </span>
            </div>

            <div className="auth-field">
              <label htmlFor="admin-name">Administrator name</label>
              <input
                id="admin-name"
                name="adminName"
                value={form.adminName}
                onChange={updateField}
                placeholder="Your full name"
                autoComplete="name"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="admin-email">
                Administrator work email
              </label>
              <input
                id="admin-email"
                name="adminEmail"
                type="email"
                value={form.adminEmail}
                onChange={updateField}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field auth-field-full">
              <label htmlFor="admin-password">Create password</label>
              <input
                id="admin-password"
                name="adminPassword"
                type="password"
                minLength={8}
                value={form.adminPassword}
                onChange={updateField}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />
              <span className="auth-field-hint">
                Use at least 8 characters.
              </span>
            </div>
          </div>

          {error && (
            <p className="auth-message" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="auth-message auth-success" role="status">
              {success}
            </p>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="auth-spinner" /> Creating workspace...
              </>
            ) : (
              <>
                Create organization workspace{" "}
                <span aria-hidden="true">↗</span>
              </>
            )}
          </button>
        </form>

        <p className="auth-switch-copy">
          Already have a workspace? <Link to="/login">Sign in</Link>
        </p>

        <Link className="auth-back-link" to="/">
          ← Back to landing page
        </Link>
      </section>
    </main>
  );
}
