# Krew --- HR & Hiring Management Platform

> This file documents the legacy HTML/CSS/JavaScript frontend only. The
> maintained repository structure, complete setup, service commands, and
> deployment instructions are in the root [`README.md`](../../README.md).
> This frontend lives in `frontend/legacy`; APIs and business services live
> separately under `backend/`.

Krew is a front-end HR and hiring management application designed to
manage employees, departments, projects, tasks, attendance, payroll,
performance, and recruitment from one interface.

This project is currently a **front-end-only prototype**. It uses HTML,
CSS, and JavaScript, with browser storage (`localStorage` and
`sessionStorage`) instead of a backend database.

------------------------------------------------------------------------

## 1. Project Overview

The application covers two main areas:

### HR Management

-   Employee dashboard
-   Admin dashboard
-   Organization and department management
-   Employee/member management
-   Company directory
-   Projects and tasks
-   Attendance and check-in/check-out
-   Payroll history
-   Performance dashboard

### Recruitment

-   Job openings
-   Job application form
-   AI interview simulation
-   Organization registration
-   Employer job posting

The interface uses a dark, modern dashboard design with shared
navigation and reusable styling.

------------------------------------------------------------------------

## 2. Project Structure

``` text
frontend/legacy/
├── css/
│   ├── index.css
│   └── careers.css
├── js/
│   ├── add-member.js
│   ├── admin.js
│   ├── attendance.js
│   ├── careers.js
│   ├── directory.js
│   ├── employee.js
│   ├── index.js
│   ├── login.js
│   ├── organization.js
│   ├── payroll.js
│   ├── refactor.js
│   ├── sidebar.js
│   ├── state.js
│   ├── tasks.js
│   └── tenant.js
├── add-member.html
├── admin.html
├── application.html
├── attendance.html
├── directory.html
├── employee.html
├── index.html
├── interview.html
├── job-openings.html
├── login.html
├── organization-register.html
├── payroll.html
├── performance.html
├── post-opening.html
├── tasks.html
└── README.md
```

The separate React portal is in `frontend/portal`, and the resume-analyzer
web page is in `frontend/resume-analyzer`. The Express and FastAPI code is
kept under `backend/`; see the root README for how the services connect.

------------------------------------------------------------------------

## 3. HTML Pages

  -----------------------------------------------------------------------
  Page                                Purpose
  ----------------------------------- -----------------------------------
  `index.html`                        Main landing/marketing page for
                                      Krew

  `login.html`                        Login page for existing users

  `organization-register.html`        Register a new organization and
                                      administrator

  `admin.html`                        Admin command center

  `employee.html`                     Employee personal dashboard

  `directory.html`                    Company directory and organization
                                      hierarchy

  `add-member.html`                   Create departments and add
                                      organization members

  `attendance.html`                   Attendance, check-in and check-out
                                      management

  `tasks.html`                        Projects and task management

  `performance.html`                  Employee performance dashboard

  `payroll.html`                      Payroll history and compensation
                                      information

  `job-openings.html`                 Browse available job openings

  `application.html`                  Candidate job application form

  `interview.html`                    Simulated AI interview experience

  `post-opening.html`                 Employer job-posting workflow
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 4. JavaScript Files

The JavaScript is divided into shared functionality and page-specific
controllers.

### Shared JavaScript

#### `state.js`

This is the main data/store layer of the application.

It:

-   Stores the application's data
-   Reads and writes data using `localStorage`
-   Manages the current logged-in user
-   Creates departments, members, projects, and tasks
-   Provides dashboard statistics
-   Handles organization/member relationships
-   Applies role-based rules
-   Provides helper functions for pages

The main global store is:

``` javascript
window.TerraHireStore
```

#### `tenant.js`

Handles organization/session-related functionality for the recruitment
and organization-registration flow.

#### `sidebar.js`

Creates the common left sidebar used by the authenticated dashboard
pages.

It also controls which navigation options are visible for different user
roles.

------------------------------------------------------------------------

### Page-Specific JavaScript

  JavaScript          Used For
  ------------------- -----------------------------------------------
  `index.js`          Landing page animations and visual effects
  `login.js`          Login and authentication
  `admin.js`          Admin dashboard
  `employee.js`       Employee dashboard
  `directory.js`      Company directory
  `add-member.js`     Department/member management
  `attendance.js`     Attendance and check-in/out
  `tasks.js`          Projects and tasks
  `payroll.js`        Payroll information
  `careers.js`        Job openings, applications and interview flow
  `organization.js`   Organization registration
  `refactor.js`       Development/refactoring helper code

------------------------------------------------------------------------

## 5. CSS Files

### `css/index.css`

Main stylesheet for the authenticated HR dashboard pages.

It contains:

-   Dashboard layout
-   Sidebar
-   Cards
-   Tables
-   Buttons
-   Forms
-   Statistics
-   Responsive layouts
-   Shared colors and typography

### `css/careers.css`

Used by the recruitment/public-facing pages.

It styles:

-   Job opening cards
-   Application forms
-   Employer forms
-   Interview screens
-   Public navigation
-   Recruitment-related components

------------------------------------------------------------------------

## 6. Main User Roles

The application uses role-based access.

The main roles are:

``` text
Admin
  ↓
Executive
  ↓
Manager
  ↓
Team Leader
  ↓
Employee
```

### Admin

The admin has the highest level of access.

Typical responsibilities include:

-   Managing the organization
-   Creating departments
-   Adding members
-   Managing projects
-   Viewing organization-wide information
-   Managing employees

### Executive

An executive is associated with a department and can manage
department-level work.

### Manager

A manager manages assigned projects and team members.

### Team Leader

A team leader works with members on assigned projects and tasks.

### Employee

An employee mainly works with their own:

-   Tasks
-   Projects
-   Attendance
-   Work information
-   Dashboard data

------------------------------------------------------------------------

## 7. Authentication

The login system is implemented entirely in JavaScript.

The basic flow is:

``` text
login.html
    ↓
login.js
    ↓
Check user information
    ↓
Create login session
    ↓
Redirect based on role
    ↓
Dashboard
```

The current session is stored in:

``` text
sessionStorage
```

Application data is stored in:

``` text
localStorage
```

Because this is a front-end prototype, authentication is **not secure
enough for a real production HR system**.

------------------------------------------------------------------------

## 8. Data Storage

There is currently no backend server or database.

The browser acts as the application's temporary data store.

``` text
                    Browser
                       │
             ┌─────────┴─────────┐
             │                   │
       localStorage        sessionStorage
             │                   │
        Application data     Login session
```

Examples of data managed by the application include:

-   Organizations
-   Departments
-   Employees
-   Projects
-   Tasks
-   Attendance
-   Payroll information
-   Job openings

The application also contains default/seed data so the dashboard can be
explored without setting up a database.

------------------------------------------------------------------------

## 9. Recruitment Flow

The recruitment section follows this general flow:

``` text
Job Openings
      ↓
Select a Job
      ↓
Application Form
      ↓
AI Interview Simulation
      ↓
Application Completed
```

Employers can use:

``` text
post-opening.html
```

to verify their organization and publish a job opening.

Candidates can use:

``` text
job-openings.html
        ↓
application.html
        ↓
interview.html
```

to apply for a position and complete the simulated interview.

------------------------------------------------------------------------

## 10. HR Management Flow

The authenticated HR workflow is roughly:

``` text
Login
  ↓
Role-based Dashboard
  ↓
┌──────────────┬──────────────┬──────────────┐
│ Organization │ Employees    │ Projects     │
└──────────────┴──────────────┴──────────────┘
        ↓              ↓              ↓
   Departments     Directory       Tasks
        ↓              ↓              ↓
   Members         Attendance     Performance
                                      ↓
                                   Payroll
```

Different pages show different information depending on the logged-in
user's role.

------------------------------------------------------------------------

## 11. How to Run the Project

This project does not currently require npm, React, or a build process.

### Option 1 --- Open directly

Open:

``` text
index.html
```

in a browser.

You can also start from:

``` text
login.html
```

### Option 2 --- Use VS Code Live Server

If you use VS Code:

1.  Open the `HR_hire` folder.
2.  Install the **Live Server** extension if it is not already
    installed.
3.  Right-click `index.html`.
4.  Select **Open with Live Server**.

Using a local server is recommended because it gives more consistent
browser behavior when navigating between pages.

------------------------------------------------------------------------

## 12. Technologies Used

### Frontend

-   HTML5
-   CSS3
-   JavaScript (Vanilla JS)

### Browser APIs

-   `localStorage`
-   `sessionStorage`
-   DOM APIs

### External Libraries/CDNs

The project also uses some external resources, including:

-   Three.js for the landing-page visual effects
-   Chart.js for dashboard charts
-   Tailwind CSS CDN on the performance page
-   Google Fonts

An internet connection may therefore be required for some visual
components and external libraries.

------------------------------------------------------------------------

## 13. Important Notes

This project is a **prototype/demo**, not a production-ready HR system.

### Security

Do not use real employee information or real passwords.

The current application stores data in the browser and performs
authentication/authorization on the client side.

A production version should use:

-   A real backend
-   A real database
-   Password hashing
-   Server-side authentication
-   Server-side authorization
-   Secure sessions/tokens
-   Input validation
-   HTTPS
-   Proper audit logging

### Data Reset

Because the application uses browser storage, clearing the site's
`localStorage`/`sessionStorage` can remove the current application data
and session.

------------------------------------------------------------------------

## 14. Recommended Future Improvements

For a production version, the project could be extended with:

1.  Backend API
2.  Database integration
3.  Secure authentication
4.  Password hashing
5.  Real user registration
6.  Email notifications
7.  Real attendance records
8.  Real payroll processing
9.  Employee performance reviews
10. Resume upload and candidate management
11. Real AI interview integration
12. Automated recruitment workflows
13. Role/permission management from the backend
14. Deployment to a cloud platform

------------------------------------------------------------------------

## 15. Quick Start

The easiest way to explore the project is:

``` text
1. Open index.html
        ↓
2. Explore the landing page
        ↓
3. Go to Login
        ↓
4. Sign in using the available demo/seed data
        ↓
5. Explore the dashboard
        ↓
6. Try Directory, Attendance, Tasks and Payroll
        ↓
7. Explore Job Openings and the candidate flow
```

------------------------------------------------------------------------

## 16. Project Goal

Krew aims to provide a single platform for managing the employee
lifecycle:

``` text
Hire
  ↓
Onboard
  ↓
Organize
  ↓
Manage
  ↓
Track Attendance
  ↓
Manage Tasks & Projects
  ↓
Measure Performance
  ↓
Manage Payroll
```

The long-term goal is to evolve this front-end prototype into a complete
HR management platform with a secure backend and database.
