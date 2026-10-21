
import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  ArrowUpRight,
  CircleDollarSign,
  ShieldCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/OrganizationPages.css";

const API_URL = "http://localhost:5000/api";

export default function Payroll() {
  const [user, setUser] = useState(null);
  const [payroll, setPayroll] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPayroll() {
      try {
        // Load logged-in user's profile
        const profileResponse = await fetch(
          `${API_URL}/auth/me`,
          { credentials: "include" }
        );

        const profileData = await profileResponse.json();

        if (!profileResponse.ok) {
          throw new Error(
            profileData.message || "Unable to load profile."
          );
        }

        const currentUser = profileData.user;

        if (active) setUser(currentUser);

        // Fetch payroll records using the existing session cookie
        const payrollResponse = await fetch(
          `${API_URL}/payroll`,
          { credentials: "include" }
        );

        const payrollData = await payrollResponse.json();

        if (!payrollResponse.ok) {
          throw new Error(
            payrollData.message || "Unable to load payroll records."
          );
        }

        const records = Array.isArray(payrollData)
          ? payrollData
          : payrollData.payroll || payrollData.data || [];

        // Show only the logged-in employee's records
        const userId = currentUser?._id || currentUser?.id;

        const ownRecords = records.filter((record) => {
          const employeeId =
            record.employeeId?._id || record.employeeId;

          return userId && String(employeeId) === String(userId);
        });

        if (active) setPayroll(ownRecords);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPayroll();

    return () => {
      active = false;
    };
  }, []);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(amount) || 0);

  const formatDate = (date) => {
    if (!date) return "Not scheduled";

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="dashboard-shell">
      <Sidebar user={user} role={user?.role || "employee"} />

      <main className="workday-main org-page payroll-page">
        <header className="org-page-header">
          <div>
            <span className="org-eyebrow">
              KREW / PEOPLE OPERATIONS
            </span>
            <h1>
              My <span>Payroll.</span>
            </h1>
            <p>
              Review your pay information and payroll documents.
            </p>
          </div>

          <span className="org-count-pill">
            {user?.fullName ||
              (loading ? "Loading profile..." : "Personal workspace")}
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
              View your payroll records and payment details
              for your organization.
            </p>
          </div>
        </section>

        <section className="org-card payroll-status-card">
          <span className="org-card-icon">
            <ShieldCheck size={21} aria-hidden="true" />
          </span>

          <div>
            <h2>
              {loading
                ? "Loading payroll records..."
                : payroll.length > 0
                ? "Your payroll records"
                : "No payroll records found"}
            </h2>

            <p>
              {loading
                ? "Please wait while your payroll information loads."
                : payroll.length > 0
                ? `${payroll.length} payroll record(s) found.`
                : "Payroll records will appear here when they are available for your account."}
            </p>
          </div>
        </section>

        {!loading && payroll.length > 0 && (
          <section className="org-card">
            <div className="org-section-heading">
              <div>
                <span className="org-eyebrow">PAYMENT HISTORY</span>
                <h2>Your payments</h2>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px" }}>
                      Month
                    </th>
                    <th style={{ textAlign: "left", padding: "12px" }}>
                      Basic Salary
                    </th>
                    <th style={{ textAlign: "left", padding: "12px" }}>
                      Net Salary
                    </th>
                    <th style={{ textAlign: "left", padding: "12px" }}>
                      Payment Date
                    </th>
                    <th style={{ textAlign: "left", padding: "12px" }}>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {payroll.map((record) => (
                    <tr key={record._id}>
                      <td style={{ padding: "12px" }}>
                        {record.month} {record.year}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {formatCurrency(record.basicSalary)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {formatCurrency(record.netSalary)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {formatDate(record.paymentDate)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {record.status || "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

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
