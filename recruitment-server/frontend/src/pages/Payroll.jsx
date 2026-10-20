
import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { ArrowUpRight, CircleDollarSign, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/OrganizationPages.css";

export default function Payroll() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("http://localhost:5000/api/auth/me", {
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to load profile.");
        }
        if (active) setUser(data.user);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} role={user?.role || "employee"} />
      <main className="workday-main org-page payroll-page">
        <header className="org-page-header">
          <div>
            <span className="org-eyebrow">KREW / PEOPLE OPERATIONS</span>
            <h1>
              My <span>Payroll.</span>
            </h1>
            <p>Review your pay information and payroll documents.</p>
          </div>
          <span className="org-count-pill">
            {user?.fullName || (loading ? "Loading profile..." : "Personal workspace")}
          </span>
        </header>

        {error && (
          <div className="org-feedback" role="alert">
            {error}
          </div>
        )}

        <section className="payroll-intro-card">
          <span className="payroll-intro-icon">
            <CircleDollarSign size={24} aria-hidden="true" />
          </span>
          <div>
            <span className="org-eyebrow">PAYROLL WORKSPACE</span>
            <h2>Your pay information, in one place.</h2>
            <p>
              Payroll statements and payment details will be available here
              when they are connected to your organization.
            </p>
          </div>
        </section>

        <section className="org-card payroll-status-card">
          <span className="org-card-icon">
            <ShieldCheck size={21} aria-hidden="true" />
          </span>
          <div>
            <h2>Payroll records are not connected yet</h2>
            <p>
              No payment amounts or statements are shown until payroll data is
              available.
            </p>
          </div>
        </section>

        <section className="org-card">
          <div className="org-section-heading">
            <div>
              <span className="org-eyebrow">QUICK LINKS</span>
              <h2>Back to your workspace</h2>
            </div>
          </div>
          <div className="org-form-actions">
            <Link
              className="org-secondary-btn"
              to={`/${user?.role || "employee"}/dashboard`}
            >
              Dashboard <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link
              className="org-secondary-btn"
              to={`/${user?.role || "employee"}/attendance`}
            >
              Attendance <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
