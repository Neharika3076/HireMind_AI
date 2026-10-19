import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AuthPages.css";

const API_URL = "http://localhost:5000/api/auth";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Enter your email or project code and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to sign in. Please check your credentials.");
      }

      // The backend returns the appropriate dashboard path for the user's role.
      if (data.dashboardPath) {
        navigate(data.dashboardPath);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Unable to connect to the server. Make sure your backend is running.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" aria-hidden="true" />
      <div className="auth-glow auth-glow-two" aria-hidden="true" />

      <section className="auth-card" aria-labelledby="login-title">
        <Link to="/" className="auth-brand" aria-label="Krew home">
          <span className="auth-mark" aria-hidden="true">
            <span />
          </span>
          <span>Krew</span>
        </Link>

        <div className="auth-heading">
          <span className="auth-eyebrow">YOUR WORKSPACE AWAITS</span>
          <h1 id="login-title">
            Welcome <span>back.</span>
          </h1>
          <p>
            Sign in to manage your people, hiring pipeline, and team workspace.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="input-identifier">
              Admin email or project code
            </label>
            <input
              id="input-identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="name@company.com or BILL-01"
              autoComplete="username"
              required
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="input-password">Password</label>
              <button
                className="auth-text-button"
                type="button"
                onClick={() =>
                  setError(
                    "Please contact your organization administrator to reset your password."
                  )
                }
              >
                Forgot password?
              </button>
            </div>

            <input
              id="input-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="auth-message" role="alert">
              {error}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="auth-spinner" /> Signing in...
              </>
            ) : (
              <>
                Sign in to Krew <span aria-hidden="true">↗</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>NEW TO KREW?</span>
        </div>

        <Link
          className="auth-secondary-button"
          to="/organization-register"
        >
          Create an organization workspace{" "}
          <span aria-hidden="true">→</span>
        </Link>

        <Link className="auth-back-link" to="/">
          ← Back to landing page
        </Link>

        <p className="auth-legal">
          Secure workspace access <span>·</span> Built for people-first teams
        </p>
      </section>

      <aside className="auth-side-note" aria-hidden="true">
        <span className="auth-side-line" />
        <span>HIRING, ONBOARDING, AND PEOPLE — CONNECTED.</span>
      </aside>
    </main>
  );
}