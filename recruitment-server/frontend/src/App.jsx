import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Login from "./pages/Login";
import OrganizationRegister from "./pages/OrganizationRegister";
import AddMember from "./pages/AddMember";
import Attendance from "./pages/Attendance";
import Directory from "./pages/Directory";
import Tasks from "./pages/Tasks";
import Payroll from "./pages/Payroll";
import Recruitment from "./pages/Recruitment";
import Interviews from "./pages/Interviews";
import JobOpenings from "./pages/JobOpenings";
import PublicJobOpenings from "./pages/PublicJobOpenings";

import "./index.css";
import "./premium.css";


export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState(-1);

  useEffect(() => {
    let frameId;
    let alive = true;
    const canvases = [
      { id: "hero-canvas", mode: "hero" },
      { id: "loader-canvas", mode: "loader" },
      { id: "how-canvas", mode: "particles" },
    ];
    const contexts = new Map();
    const resizeCanvas = (canvas) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); contexts.set(canvas.id, { ctx, width: rect.width, height: rect.height }); }
    };
    canvases.forEach(({ id }) => resizeCanvas(document.getElementById(id)));
    const onResize = () => canvases.forEach(({ id }) => resizeCanvas(document.getElementById(id)));
    const onScroll = () => {
      const progress = document.getElementById("scroll-progress");
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = `${maxScroll > 0 ? window.scrollY / maxScroll * 100 : 0}%`;
      document.getElementById("nav")?.classList.toggle("scrolled", window.scrollY > 30);
    };
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("in-view");
    }), { threshold: 0.12 });
    document.querySelectorAll("[data-animate], .candidate-item, .step, .faq-item").forEach(el => observer.observe(el));

    // Animated 3D-style wireframe globe: no external 3D library required.


    const drawGlobe = (ctx, w, h, time, loader = false) => {
      ctx.clearRect(0, 0, w, h);

      const size = Math.min(w, h) * (loader ? 0.36 : 0.3);
      const cx = w / 2;
      const cy = h / 2;
      const rotation = time * 0.0005;

      ctx.save();
      ctx.translate(cx, cy);

      // Soft glow behind the globe
      const glow = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 1.6);
      glow.addColorStop(0, "rgba(49, 209, 189, 0.15)");
      glow.addColorStop(1, "rgba(49, 209, 189, 0)");

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Globe outline
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(49, 209, 189, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Rotating longitude lines
      for (let i = 0; i < 6; i++) {
        const angle = rotation + (i * Math.PI) / 6;
        const rx = Math.abs(Math.cos(angle)) * size;

        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1, rx), size, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(125, 211, 252, 0.55)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Latitude lines
      for (let i = -2; i <= 2; i++) {
        const y = (i / 3) * size;
        const rx = Math.sqrt(Math.max(0, size * size - y * y));

        ctx.beginPath();
        ctx.ellipse(0, y, rx, rx * 0.22, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(49, 209, 189, 0.45)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Subtle connected network points
      for (let i = 0; i < 9; i++) {
        const angle = rotation * 1.4 + (i * Math.PI * 2) / 9;
        const x = Math.cos(angle) * size * 0.82;
        const y = Math.sin(angle * 1.7) * size * 0.65;

        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "#7de0ce";
        ctx.fill();
      }

      ctx.restore();
    };

    const drawHiringScene = (ctx, w, h, time, loader = false) => {
      ctx.clearRect(0, 0, w, h);

      const t = time * 0.001;
      const scale = Math.min(w / 520, h / 420, 1.2);
      const bob = Math.sin(t * 0.8) * 3;

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-260, -210);

      const rounded = (x, y, width, height, radius, fill, stroke, lineWidth = 1) => {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      const label = (value, x, y, size, color, weight = "400") => {
        ctx.font = `${weight} ${size}px Inter, Arial, sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(value, x, y);
      };

      const softShadow = (blur, color, ox = 0, oy = 10) => {
        ctx.shadowBlur = blur;
        ctx.shadowColor = color;
        ctx.shadowOffsetX = ox;
        ctx.shadowOffsetY = oy;
      };

      // Soft studio lighting behind the product; no sci-fi orbit or particle field.
      const ambience = ctx.createRadialGradient(260, 205, 15, 260, 205, 250);
      ambience.addColorStop(0, "rgba(49,209,189,.13)");
      ambience.addColorStop(0.6, "rgba(49,209,189,.045)");
      ambience.addColorStop(1, "rgba(49,209,189,0)");
      ctx.fillStyle = ambience;
      ctx.fillRect(0, 0, 520, 420);

      // Ground shadow gives the product a little physical presence.
      ctx.save();
      ctx.translate(10, 17);
      ctx.scale(1, 0.28);
      ctx.beginPath();
      ctx.ellipse(260, 366, 178, 35, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,.32)";
      ctx.fill();
      ctx.restore();

      // Back plate: visible offset edge creates a stacked, dimensional object.
      ctx.save();
      ctx.translate(14, 15 + bob * 0.35);
      ctx.transform(1, 0.015, -0.035, 1, 0, 0);
      softShadow(24, "rgba(0,0,0,.24)", 4, 12);
      rounded(58, 46, 414, 318, 16, "#0a1928", "rgba(125,211,252,.16)");
      ctx.shadowBlur = 0;
      ctx.restore();

      // Main dashboard gently tilts, like a real product mockup.
      ctx.save();
      ctx.translate(0, bob);
      ctx.transform(1, 0.018, -0.045, 1, 0, 0);

      softShadow(28, "rgba(0,0,0,.34)", 0, 16);
      rounded(48, 42, 414, 318, 16, "#0c1e2e", "rgba(147,190,212,.32)", 1.2);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Thin side highlight makes the panel feel like a physical glass slab.
      const sideLight = ctx.createLinearGradient(48, 42, 462, 360);
      sideLight.addColorStop(0, "rgba(255,255,255,.075)");
      sideLight.addColorStop(0.28, "rgba(255,255,255,0)");
      sideLight.addColorStop(1, "rgba(49,209,189,.045)");
      rounded(48, 42, 414, 318, 16, sideLight);

      // Header with a restrained glass highlight.
      rounded(49, 43, 412, 48, 15, "#183247", "rgba(255,255,255,.06)");
      ctx.fillStyle = "#183247";
      ctx.fillRect(49, 73, 412, 18);
      label("Krew", 67, 72, 18, "#f2f8fc", "700");
      label("Talent management", 124, 71, 10, "#a9bfce");
      rounded(379, 56, 67, 21, 10, "rgba(49,209,189,.10)", "rgba(49,209,189,.22)");
      ctx.beginPath();
      ctx.arc(390, 66, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#55d9c5";
      ctx.fill();
      label("ACTIVE", 398, 69, 8, "#9de9dc", "600");

      label("Hiring pipeline", 69, 119, 16, "#f0f8ff", "600");
      label("A clear view of every candidate", 69, 137, 9, "#91a9bb");

      const columns = [
        { name: "Applied", count: "08", x: 67 },
        { name: "Review", count: "04", x: 168 },
        { name: "Interview", count: "03", x: 269 },
        { name: "Hired", count: "02", x: 370 },
      ];

      columns.forEach((column, i) => {
        rounded(
          column.x, 151, 84, 29, 6,
          i === 1 ? "rgba(49,209,189,.15)" : "#192f41",
          i === 1 ? "rgba(49,209,189,.56)" : "rgba(148,190,212,.13)"
        );
        label(column.name, column.x + 7, 169, 9, i === 1 ? "#a1f3e4" : "#c2d2de", "600");
        label(column.count, column.x + 63, 169, 8, "#91a9bb");
      });

      const candidates = [
        { name: "Alex Morgan", role: "Product Designer", score: "92%", initials: "AM", color: "#8bc9e8" },
        { name: "Jordan Lee", role: "Frontend Developer", score: "88%", initials: "JL", color: "#81d8c7" },
        { name: "Taylor Reed", role: "People Operations", score: "95%", initials: "TR", color: "#c0b0f3" },
      ];
      const statuses = ["Applied", "In review", "Interview", "Hired"];
      const statusColors = ["#a9bfce", "#7dd3fc", "#a1f3e4", "#81d8c7"];

      candidates.forEach((candidate, i) => {
        const y = 193 + i * 47;
        const stage = Math.floor((t / 4 + i * 1.1) % 4);
        const isMoving = i === 1;
        const slide = isMoving ? Math.sin(t * 0.7) * 2.2 : 0;

        // Layered card shadow, then card face and inset top highlight.
        softShadow(9, "rgba(0,0,0,.18)", 0, 4);
        rounded(67 + slide, y + 2, 378, 39, 7, "#102537", "rgba(148,190,212,.12)");
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        const cardHighlight = ctx.createLinearGradient(68, y, 68, y + 39);
        cardHighlight.addColorStop(0, "rgba(255,255,255,.035)");
        cardHighlight.addColorStop(1, "rgba(255,255,255,0)");
        rounded(68 + slide, y + 2, 376, 37, 6, cardHighlight);

        ctx.beginPath();
        ctx.arc(87 + slide, y + 21, 12, 0, Math.PI * 2);
        ctx.fillStyle = candidate.color + "28";
        ctx.fill();
        ctx.strokeStyle = candidate.color;
        ctx.lineWidth = 1;
        ctx.stroke();

        label(candidate.initials, 78 + slide, y + 24, 8, candidate.color, "600");
        label(candidate.name, 108 + slide, y + 17, 10, "#edf7fd", "600");
        label(candidate.role, 108 + slide, y + 29, 8, "#91a9bb");
        label("MATCH", 260, y + 16, 7, "#91a9bb");
        label(candidate.score, 260, y + 28, 9, "#a1f3e4", "600");

        rounded(
          318, y + 11, 116, 20, 5,
          stage === i ? "rgba(49,209,189,.12)" : "#192f41",
          stage === i ? "rgba(49,209,189,.38)" : "rgba(255,255,255,.025)"
        );
        label(statuses[stage], 328, y + 24, 8, statusColors[stage], "600");

        // A tiny status underline gives movement without turning the scene into a light show.
        if (stage === i) {
          rounded(318, y + 38, 116, 1.5, 1, "rgba(125,211,252,.12)");
          rounded(318, y + 38, 48 + ((t * 7 + i * 9) % 44), 1.5, 1, "#31d1bd");
        }
      });

      // Footer divider and quiet status.
      ctx.beginPath();
      ctx.moveTo(68, 344);
      ctx.lineTo(442, 344);
      ctx.strokeStyle = "rgba(148,190,212,.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
      label("Workflow status", 69, 354, 8, "#91a9bb");
      ctx.beginPath();
      ctx.arc(158, 351, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#31d1bd";
      ctx.fill();
      label("All teams in sync", 168, 354, 8, "#a1f3e4");

      // Glossy edge highlight on the upper-left corner.
      ctx.beginPath();
      ctx.moveTo(64, 44);
      ctx.quadraticCurveTo(48, 44, 48, 62);
      ctx.strokeStyle = "rgba(255,255,255,.22)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();

      // Foreground profile card, offset in Z-space to create real visual layering.
      const cardFloat = Math.sin(t * 0.9 + 1) * 3;
      ctx.save();
      ctx.translate(-9, -8 + cardFloat);
      ctx.transform(1, -0.025, 0.045, 1, 0, 0);
      softShadow(22, "rgba(0,0,0,.30)", 0, 9);
      rounded(20, 87, 139, 77, 10, "#102a3d", "rgba(125,211,252,.30)", 1);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Small portrait block with layered highlights.
      rounded(30, 98, 32, 36, 7, "#1c4b5a", "rgba(125,211,252,.25)");
      ctx.beginPath();
      ctx.arc(46, 109, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#a1f3e4";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(46, 128, 10, Math.PI, 0);
      ctx.fillStyle = "#62c9bb";
      ctx.fill();

      label("CANDIDATE", 70, 106, 7, "#9eb5c5", "600");
      label("96% match", 70, 120, 12, "#a1f3e4", "700");
      label("Skills aligned", 70, 132, 7, "#d0e0e9");
      rounded(30, 143, 117, 4, 2, "#203e50");
      rounded(30, 143, 94, 4, 2, "#31d1bd");
      ctx.restore();

      // A small onboarding card sits in front of the dashboard's lower edge.
      ctx.save();
      ctx.translate(8, 5 + Math.sin(t * 0.75 + 2) * 2);
      ctx.transform(1, 0.02, -0.04, 1, 0, 0);
      softShadow(18, "rgba(0,0,0,.28)", 0, 7);
      rounded(348, 302, 151, 49, 9, "#10283a", "rgba(125,211,252,.28)");
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      rounded(359, 313, 22, 22, 7, "rgba(49,209,189,.16)");
      label("✓", 365, 328, 13, "#a1f3e4", "700");
      label("New hire added", 389, 319, 9, "#edf7fd", "600");
      label("Onboarding started", 389, 332, 7, "#91a9bb");
      rounded(359, 340, 127, 2, 1, "#203e50");
      rounded(359, 340, 86 + Math.sin(t * 0.8) * 4, 2, 1, "#31d1bd");
      ctx.restore();

      ctx.restore();
    };
    const drawParticles = (ctx, w, h, time) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const x = (i * 83.7 + Math.sin(time * .0003 + i) * 22) % Math.max(w, 1);
        const y = (i * 47.3 + time * (.006 + (i % 3) * .002)) % Math.max(h, 1);
        ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 1.8 : 1, 0, Math.PI * 2);
        ctx.fillStyle = i % 4 === 0 ? "rgba(49,209,189,.65)" : "rgba(125,211,252,.28)"; ctx.fill();
      }
    };
    const animate = (time) => {
      if (!alive) return;
      canvases.forEach(({ id, mode }) => {
        const data = contexts.get(id); if (!data) return;
        if (mode === "loader") {
          drawGlobe(data.ctx, data.width, data.height, time, true);
        } else if (mode === "hero") {
          drawHiringScene(data.ctx, data.width, data.height, time);
        } else {
          drawParticles(data.ctx, data.width, data.height, time);
        }
      });
      const fill = document.getElementById("loader-bar-fill");
      if (fill && !document.getElementById("loader")?.classList.contains("hidden")) fill.style.width = `${Math.min(96, 15 + (time % 1900) / 1900 * 80)}%`;
      frameId = window.requestAnimationFrame(animate);
    };
    frameId = window.requestAnimationFrame(animate);

    // Working FAQ and testimonial controls.
    const onClick = (event) => {
      const question = event.target.closest(".faq-q");
      if (question) { const item = question.closest(".faq-item"); const wasOpen = item.classList.contains("open"); document.querySelectorAll(".faq-item").forEach(el => el.classList.remove("open")); if (!wasOpen) item.classList.add("open"); }
      const prev = event.target.closest("[data-carousel-prev]");
      const next = event.target.closest("[data-carousel-next]");
      const dot = event.target.closest(".carousel-dot");
      if (prev || next || dot) {
        const slides = [...document.querySelectorAll("[data-carousel-slide]")];
        if (slides.length) {
          let active = slides.findIndex(el => el.classList.contains("is-active"));
          if (dot) active = [...document.querySelectorAll(".carousel-dot")].indexOf(dot);
          else active = (active + (next ? 1 : -1) + slides.length) % slides.length;
          slides.forEach((el, i) => el.classList.toggle("is-active", i === active));
          document.querySelectorAll(".carousel-dot").forEach((el, i) => { el.classList.toggle("active", i === active); el.setAttribute("aria-selected", String(i === active)); });
          setActiveTestimonial(active);
        }
      }
    };
    const cursor = document.getElementById("cursor-glow");
    const onPointerMove = (event) => { if (cursor) { cursor.style.opacity = "1"; cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`; } };
    const timer = window.setTimeout(() => {
      const loader = document.getElementById("loader");
      if (loader) loader.classList.add("hidden");
      document.getElementById("app")?.classList.add("revealed");
      const fill = document.getElementById("loader-bar-fill"); if (fill) fill.style.width = "100%";
    }, 1500);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("click", onClick);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    onScroll();
    return () => { alive = false; window.cancelAnimationFrame(frameId); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); document.removeEventListener("click", onClick); window.removeEventListener("pointermove", onPointerMove); observer.disconnect(); window.clearTimeout(timer); };
  }, []);

  const testimonials = document.querySelectorAll?.("[data-carousel-slide]");
  const moveTestimonial = (direction) => {
    const count = document.querySelectorAll("[data-carousel-slide]").length || 3;
    setActiveTestimonial(current => (current + direction + count) % count);
  };

return (
  <Routes>
    <Route path="/job-openings" element={<JobOpenings />} />
    <Route path="/job-openings.html" element={<JobOpenings />} />
    <Route path="/jobs" element={<JobOpenings />} />
    <Route path="/application" element={<JobOpenings />} />
    <Route path="/application.html" element={<JobOpenings />} />
    <Route path="/public-job-openings" element={<PublicJobOpenings />} />
    <Route path="/login" element={<Login />} />
    <Route path="/login.html" element={<Login />} />
    <Route path="/ai-interview" element={<Interviews />} />
    <Route path="/ai-interview.html" element={<Interviews />} />
    <Route path="/recruitment" element={<Recruitment />} />
    <Route path="/recruitment.html" element={<Recruitment />} />

<Route
  path="/organization-register"
  element={<OrganizationRegister />}
/>

{/* Admin: organization management */}
<Route path="/admin/dashboard" element={<AdminDashboard />} />
<Route path="/admin/directory" element={<Directory />} />
<Route path="/admin/add-member" element={<AddMember />} />
<Route path="/admin/attendance" element={<Attendance />} />
<Route path="/admin/tasks" element={<Tasks />} />
<Route path="/admin/recruitment" element={<Recruitment />} />

{/* Admin: personal employee workspace */}
<Route path="/admin/my-dashboard" element={<EmployeeDashboard />} />
<Route path="/admin/my-tasks" element={<Tasks />} />
<Route path="/admin/my-attendance" element={<Attendance />} />
<Route path="/admin/payroll" element={<Payroll />} />
<Route path="/admin/my-payroll" element={<Payroll />} />

{/* Employee: only three workspace pages */}
<Route path="/employee/dashboard" element={<EmployeeDashboard />} />
<Route path="/employee/tasks" element={<Tasks />} />
<Route path="/employee/attendance" element={<Attendance />} />
<Route path="/employee/payroll" element={<Payroll />} />

{/* Recruiter workspace */}
<Route path="/recruiter/dashboard" element={<EmployeeDashboard />} />
<Route path="/recruiter/directory" element={<Directory />} />
<Route path="/executive/directory" element={<Directory />} />
<Route path="/recruiter/tasks" element={<Tasks />} />
<Route path="/recruiter/attendance" element={<Attendance />} />
<Route path="/recruiter/payroll" element={<Payroll />} />
<Route path="/recruiter/recruitment" element={<Recruitment />} />
<Route path="/manager/dashboard" element={<EmployeeDashboard />} />
<Route path="/manager/directory" element={<Directory />} />
<Route path="/manager/tasks" element={<Tasks />} />
<Route path="/manager/attendance" element={<Attendance />} />
<Route path="/manager/payroll" element={<Payroll />} />
    <Route
      path="*"
      element={
        <>
        {
            <>
              <div id="scroll-progress" aria-hidden="true"></div><div id="cursor-glow" aria-hidden="true"></div><div id="loader" role="status" aria-live="polite"><div className="loader-orb-wrap"><canvas
                id="loader-canvas"
                aria-label="Animated AI hiring visualization"
              /><span className="loader-orb-ring ring-one"></span><span className="loader-orb-ring ring-two"></span></div><div className="loader-text"><span className="dot"></span> Loading Krew…</div><div className="loader-bar"><div className="loader-bar-fill" id="loader-bar-fill"></div></div></div><div id="app"><header id="nav" className={menuOpen ? "menu-open" : ""}><div className="wrap nav-inner"><a href="#hero" className="nav-logo"><span className="mark" aria-hidden="true"></span>Krew</a><nav aria-label="Primary"><ul className="nav-links"><li style={{ "animationDelay": ".12s" }}><a href="/job-openings">Job Openings</a></li><li style={{ "animationDelay": ".15s" }}><a href="#pricing">Plans</a></li><li style={{ "animationDelay": ".18s" }}><a href="#features">Features</a></li><li style={{ "animationDelay": ".24s" }}><a href="#how">How It Works</a></li><li style={{ "animationDelay": ".30s" }}><a href="#dashboards">Dashboards</a></li><li style={{ "animationDelay": ".36s" }}><a href="#forhr">For HR</a></li><li style={{ "animationDelay": ".42s" }}><a href="#testimonials">Testimonials</a></li><li style={{ "animationDelay": ".48s" }}><a href="#faq">FAQ</a></li><li style={{ "animationDelay": ".54s" }}><a href="#contact">Contact</a></li></ul></nav>
              <a href="/login" className="btn btn-primary nav-cta">
  Get Started
</a><button className="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></button></div></header><section id="hero"><div className="hero-bg" aria-hidden="true"></div><div className="hero-grid" aria-hidden="true"></div><div className="wrap hero-inner"><div className="hero-copy"><span className="eyebrow">From hire to higher performance.</span><h1 className="hero-title"><span className="word" style={{ "animationDelay": ".55s" }}>Your</span><span className="word" style={{ "animationDelay": ".68s" }}>people.</span><span className="word" style={{ "animationDelay": ".81s" }}>Your</span><span className="word" style={{ "animationDelay": ".94s" }}>workflow.</span><span className="word accent" style={{ "animationDelay": "1.07s" }}>One Krew.</span></h1><p className="hero-sub">Manage the entire employee journey — from hiring and onboarding to performance and growth.</p><div className="hero-ctas">
                <a href="/login" className="btn btn-primary nav-cta">
  Get Started
</a><a href="#how" className="btn btn-ghost">See How It Works</a></div><div className="hero-stats"><div><strong className="counter" data-count="1">0</strong><span>Connected Platform</span></div><div><strong className="counter" data-count="360" data-suffix="\u00b0">0</strong><span>Employee Visibility</span></div><div><strong style={{ "fontFamily": "var(--font-display)", "fontWeight": "700", "color": "var(--teal-300)", "fontSize": "clamp(22px,2.2vw,30px)" }}>AI</strong><span>Built In</span></div></div></div><div className="hero-scene"><div className="scene-chip chip-top"><span className="chip-pulse"></span> PEOPLE INTELLIGENCE <b>LIVE</b></div><div className="scene-chip chip-bottom"><span>✦</span> ONE CONNECTED WORKFORCE</div>
                  <canvas
                    id="hero-canvas"
                    role="img"
                    aria-label="Animated AI recruitment and candidate matching visualization"
                  /></div></div><div className="scroll-cue"><span>SCROLL</span><span className="line"></span></div></section><section id="problem"><div className="wrap"><div className="section-head" data-animate="fade-up"><span className="eyebrow">The gap</span><h2 className="section-title">Your people are connected.<br />Your systems aren't.</h2></div><div className="split"><div><div className="pain-card" data-animate="fade-left" style={{ "transitionDelay": "0s" }}><span className="num">01</span><div><h4>Scattered Information</h4><p>Employee data lives across tools, sheets, emails, and documents.</p></div></div><div className="pain-card" data-animate="fade-left" style={{ "transitionDelay": ".12s" }}><span className="num">02</span><div><h4>Disconnected Processes</h4><p>Hiring ends. Onboarding starts. Performance lives somewhere else.</p></div></div><div className="pain-card" data-animate="fade-left" style={{ "transitionDelay": ".24s" }}><span className="num">03</span><div><h4>Decisions Without Context</h4><p>Too much data. Not enough clarity.</p></div></div></div><ul className="solution-list"><li className="solution-item" data-animate="fade-right" style={{ "transitionDelay": "0s" }}><h4>One connected view</h4><p>Every employee, role, task, and milestone — in one place.</p></li><li className="solution-item" data-animate="fade-right" style={{ "transitionDelay": ".12s" }}><h4>One continuous journey</h4><p>From candidate to contributor, nothing gets lost between stages.</p></li><li className="solution-item" data-animate="fade-right" style={{ "transitionDelay": ".24s" }}><h4>Intelligence built in</h4><p>AI helps your team move faster, without taking people out of the loop.</p></li></ul></div></div></section><section id="features"><div className="wrap"><div className="section-head" data-animate="fade-up"><span className="eyebrow">The Platform</span><h2 className="section-title">Everything your people need.<br />Nothing they don't.</h2><p className="section-sub">One platform for the entire employee journey.</p></div><div className="feature-grid stagger" id="feature-grid">
                    <article className="feature-card" data-animate="fade-up" style={{ "--i": 0 }}><span className="feature-icon">✦</span><span className="feature-number">01 / HIRING</span><h3>AI-powered hiring</h3><p>Find stronger candidates with structured workflows, smart screening, and AI-assisted interviews.</p><a href="/job-openings">Explore hiring <span>↗</span></a></article>
                    <article className="feature-card" data-animate="fade-up" style={{ "--i": 1 }}><span className="feature-icon">◈</span><span className="feature-number">02 / ONBOARDING</span><h3>Seamless onboarding</h3><p>Turn the first day into a great start with clear tasks, documents, and milestones.</p><a href="#how">See the journey <span>↗</span></a></article>
                    <article className="feature-card" data-animate="fade-up" style={{ "--i": 2 }}><span className="feature-icon">◎</span><span className="feature-number">03 / EMPLOYEES</span><h3>Employee hub</h3><p>Keep profiles, leave, documents, and everyday requests together in one simple place.</p><a href="#dashboards">Explore dashboards <span>↗</span></a></article>
                    <article className="feature-card" data-animate="fade-up" style={{ "--i": 3 }}><span className="feature-icon">⌁</span><span className="feature-number">04 / PERFORMANCE</span><h3>Growth that is visible</h3><p>Connect goals, feedback, reviews, and progress so development never gets lost.</p><a href="#forhr">Discover more <span>↗</span></a></article>
                    <article className="feature-card" data-animate="fade-up" style={{ "--i": 4 }}><span className="feature-icon">✳</span><span className="feature-number">05 / INTELLIGENCE</span><h3>People insights</h3><p>Bring workforce signals into focus with clear metrics and decision-ready views.</p><a href="#dashboards">View insights <span>↗</span></a></article>
                    <article className="feature-card" data-animate="fade-up" style={{ "--i": 5 }}><span className="feature-icon">↗</span><span className="feature-number">06 / AUTOMATION</span><h3>Less repetitive work</h3><p>Give your team time back with connected processes and fewer manual follow-ups.</p><a href="#contact">Talk to Krew <span>↗</span></a></article>
                  </div></div></section><section id="how"><canvas className="how-particles" id="how-canvas" aria-hidden="true"></canvas><div className="wrap"><div className="section-head" data-animate="fade-up"><span className="eyebrow">The Employee Journey</span><h2 className="section-title">From first hello<br />to next big milestone.</h2></div><div className="how-layout"><div className="timeline" id="timeline"><div className="timeline-track"><div className="timeline-track-fill" id="timeline-fill"></div></div><div className="step" data-animate="fade-right"><div className="step-icon"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 3"></path></svg></div><div className="step-body"><span className="step-tag">Step 01</span><h4>Find the right people</h4><p>Hire with confidence.</p></div></div><div className="step" data-animate="fade-right" style={{ "transitionDelay": ".1s" }}><div className="step-icon"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.35-4.35"></path></svg></div><div className="step-body"><span className="step-tag">Step 02</span><h4>Start them right</h4><p>Make onboarding effortless.</p></div></div><div className="step" data-animate="fade-right" style={{ "transitionDelay": ".2s" }}><div className="step-icon"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><path d="M9 9h6M9 13h4"></path></svg></div><div className="step-body"><span className="step-tag">Step 03</span><h4>Keep work moving</h4><p>Manage everyday employee needs in one place.</p></div></div><div className="step" data-animate="fade-right" style={{ "transitionDelay": ".3s" }}><div className="step-icon"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg></div><div className="step-body"><span className="step-tag">Step 04</span><h4>Build better performance</h4><p>Goals. Feedback. Growth.</p></div></div><div className="step" data-animate="fade-right" style={{ "transitionDelay": ".4s" }}><div className="step-icon"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M12 3v18"></path></svg></div><div className="step-body"><span className="step-tag">Step 05</span><h4>Grow together</h4><p>Turn great people into a stronger organization.</p></div></div></div><aside className="process-visual" data-animate="fade-left" aria-label="Live employee journey workflow visualization"><div className="process-visual-head"><div><span className="process-visual-kicker">ONE EMPLOYEE</span><h3>ONE JOURNEY.</h3></div><span className="process-live">Active flow</span></div><div className="process-stage"><div className="route-orbit" aria-hidden="true"><div className="route-core"><div><strong>100%</strong><span>aligned</span></div></div><svg className="route-path" viewBox="0 0 520 430" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7dd3fc"></stop><stop offset=".52" stopColor="#31d1bd"></stop><stop offset="1" stopColor="#0f8f9f"></stop></linearGradient></defs><path d="M65 105 C150 12 238 92 275 205 S380 405 465 302 C495 267 455 128 350 101 S152 145 94 300 C70 361 190 384 271 281 S399 84 463 140"></path></svg><span className="route-node n1"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v4l3 2"></path></svg><small>HIRE</small></span><span className="route-node n2"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><small>ONBOARD</small></span><span className="route-node n3"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6"></path></svg><small>MANAGE</small></span><span className="route-node n4"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16M12 4v16"></path></svg><small>PERFORM</small></span></div></div><div className="process-feed"><span className="feed-mark"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 12h18"></path><circle cx="12" cy="12" r="8"></circle></svg></span><div><strong>GROW</strong><span>Continuous milestone reached</span></div><span className="process-progress"><i></i></span></div></aside></div></div></section><section id="dashboards"><div className="wrap"><div className="section-head" data-animate="fade-up"><span className="eyebrow">Dashboards</span><h2 className="section-title">One workforce.<br />A view for everyone.</h2></div><div className="role-stack"><div className="role-card" data-animate="fade-up" style={{ "transitionDelay": "0s" }}><span className="role-label">EMPLOYEE</span><h4>My Journey</h4><div className="bar-chart" data-chart=""><div className="bar" data-height="40"></div><div className="bar" data-height="65"></div><div className="bar" data-height="30"></div><div className="bar" data-height="80"></div><div className="bar" data-height="55"></div></div><p className="section-sub" style={{ "fontSize": "13px", "marginTop": "0" }}>Leave · Goals · Documents · Performance</p></div><div className="role-card" data-animate="fade-up" style={{ "transitionDelay": ".1s" }}><span className="role-label">MANAGER</span><h4>My Team</h4><div className="ring-wrap"><svg width="80" height="80" viewBox="0 0 80 80"><circle className="ring-bg" cx="40" cy="40" r="35"></circle><circle className="ring-fg" cx="40" cy="40" r="35" data-ring="85"></circle></svg><div className="ring-label"><strong>85%</strong><span>goals active</span></div></div><p className="section-sub" style={{ "fontSize": "13px", "marginTop": "0" }}>Goals · Performance · Attendance · Insights</p></div><div className="role-card" data-animate="fade-up" style={{ "transitionDelay": ".2s" }}><span className="role-label">LEADERSHIP</span><h4>The Big Picture</h4><div className="bar-chart" data-chart=""><div className="bar" data-height="90"></div><div className="bar" data-height="60"></div><div className="bar" data-height="75"></div><div className="bar" data-height="45"></div></div><p className="section-sub" style={{ "fontSize": "13px", "marginTop": "0" }}>People · Growth · Performance · Trends</p></div><div className="role-card" data-animate="fade-up" style={{ "transitionDelay": ".3s" }}><span className="role-label">HR</span><h4>People Pulse</h4><div className="ring-wrap"><svg width="80" height="80" viewBox="0 0 80 80"><circle className="ring-bg" cx="40" cy="40" r="35"></circle><circle className="ring-fg" cx="40" cy="40" r="35" data-ring="94"></circle></svg><div className="ring-label"><strong>94%</strong><span>retention</span></div></div><p className="section-sub" style={{ "fontSize": "13px", "marginTop": "0" }}>Headcount · Hiring · Onboarding · Workforce</p></div></div></div></section><section id="forhr"><div className="wrap hr-grid"><div><div data-animate="fade-right"><span className="eyebrow">For HR teams</span><h2 className="section-title">Less admin.<br />More impact.</h2><p className="section-sub" style={{ "marginBottom": "20px" }}>Give HR one place to manage people, processes, and performance.</p></div><div className="hr-block" data-animate="fade-right" style={{ "transitionDelay": ".1s" }}><h4>One source of truth</h4><p>Everything about your people, connected.</p></div><div className="hr-block" data-animate="fade-right" style={{ "transitionDelay": ".2s" }}><h4>Fewer follow-ups</h4><p>Automate the work that shouldn't need chasing.</p></div><div className="hr-block" data-animate="fade-right" style={{ "transitionDelay": ".3s" }}><h4>Clearer decisions</h4><p>Turn workforce data into useful insight.</p></div><div className="hr-block" data-animate="fade-right" style={{ "transitionDelay": ".4s" }}><h4>Built for people</h4><p>Technology handles the process. HR handles the people.</p></div></div><div className="hr-panel" data-animate="fade-left"><div style={{ "fontFamily": "var(--font-mono)", "fontSize": "11px", "letterSpacing": "0.12em", "color": "var(--teal-300)", "textTransform": "uppercase", "marginBottom": "12px", "fontWeight": "600" }}>THE PEOPLE CONTROL CENTER</div><div className="hr-metric-row"><span className="label">Employees</span><span className="value counter" data-count="248">0</span></div><div className="hr-metric-row"><span className="label">Departments</span><span className="value counter" data-count="18">0</span></div><div className="hr-metric-row"><span className="label">Open Roles</span><span className="value counter" data-count="12">0</span></div><div className="hr-metric-row"><span className="label">Pending Actions</span><span className="value counter" data-count="24">0</span></div><div className="candidate-list"><div className="candidate-item"><span className="candidate-avatar"></span><span className="name">Amara Okafor</span><span className="role">Engineering Lead · Active</span></div><div className="candidate-item"><span className="candidate-avatar"></span><span className="name">Lucas Ferreira</span><span className="role">Product Design · Onboarding</span></div><div className="candidate-item"><span className="candidate-avatar"></span><span className="name">Priya Nair</span><span className="role">HR Manager · Reviewing</span></div><div className="candidate-item"><span className="candidate-avatar"></span><span className="name">Elin Karlsson</span><span className="role">Operations · Active</span></div></div></div></div></section><section id="pricing"><div className="wrap"><div className="section-head" data-animate="fade-up"><span className="eyebrow">Plans that scale</span><h2 className="section-title">Start simple.<br />Grow without friction.</h2><p className="section-sub">The right tools for where your team is today — and where it's going next.</p></div><div className="pricing-grid"><article className="pricing-card" data-animate="fade-up"><span className="pricing-kicker">FOUNDATIONS</span><h3>Starter</h3><p className="pricing-copy">For teams getting started.</p><div className="price"><strong>$299</strong><span>/month</span></div><ul className="pricing-list"><li>Employee management</li><li>Employee profiles</li><li>Onboarding</li><li>Leave management</li></ul><a className="btn btn-ghost pricing-btn" href="#contact">Start with Starter <span aria-hidden="true">→</span></a></article><article className="pricing-card recommended" data-animate="scale-in"><span className="popular-badge">Most popular</span><span className="pricing-kicker">OPERATIONS</span><h3>Scale</h3><p className="pricing-copy">For growing organizations.</p><div className="price"><strong>$799</strong><span>/month</span></div><ul className="pricing-list"><li>Everything in Starter</li><li>Hiring & AI interviews</li><li>Performance management</li><li>Advanced dashboards</li></ul><a className="btn btn-primary pricing-btn" href="#contact">Choose Scale <span aria-hidden="true">→</span></a></article><article className="pricing-card" data-animate="fade-up" style={{ "transitionDelay": ".12s" }}><span className="pricing-kicker">CONTROL TOWER</span><h3>Enterprise</h3><p className="pricing-copy">For organizations at scale.</p><div className="price"><strong>Custom</strong><span>tailored</span></div><ul className="pricing-list"><li>Advanced controls</li><li>Custom workflows</li><li>Workforce intelligence</li><li>Integrations</li></ul><a className="btn btn-ghost pricing-btn" href="#contact">Talk to Krew <span aria-hidden="true">→</span></a></article></div></div></section><section id="testimonials"><div className="wrap"><div className="section-head" data-animate="scale-in"><span className="eyebrow">Social proof</span><h2 className="section-title">Teams growing with clarity, without the chaos.</h2></div><div className="testi-carousel" data-carousel="" data-animate="fade-up"><div className="testi-card is-active" data-carousel-slide=""><p className="testi-quote">“We went from six spreadsheets to one connected platform. Onboarding and performance reviews are finally in sync.”</p><div className="testi-person"><span className="testi-avatar"></span><div><strong>Naomi Reyes</strong><span>Head of People, Fenwick Labs</span></div></div></div><div className="testi-card" data-carousel-slide=""><p className="testi-quote">“From hiring to everyday employee management, Krew gives our leadership full visibility without the administrative chaos.”</p><div className="testi-person"><span className="testi-avatar"></span><div><strong>Daniel Osei</strong><span>VP Operations, Northlane</span></div></div></div><div className="testi-card" data-carousel-slide=""><p className="testi-quote">“Every employee and manager finally has one clear view. Goals, leave, and milestones are effortless to track.”</p><div className="testi-person"><span className="testi-avatar"></span><div><strong>Marta Kowalski</strong><span>People Operations, Ridgeform</span></div></div></div><div className="carousel-controls" aria-label="Testimonial controls"><button className="carousel-btn" type="button" data-carousel-prev="" aria-label="Previous testimonial">←</button><div className="carousel-dots" role="tablist" aria-label="Testimonials"><button className="carousel-dot active" type="button" role="tab" aria-selected="true" aria-label="Show testimonial 1"></button><button className="carousel-dot" type="button" role="tab" aria-selected="false" aria-label="Show testimonial 2"></button><button className="carousel-dot" type="button" role="tab" aria-selected="false" aria-label="Show testimonial 3"></button></div><button className="carousel-btn" type="button" data-carousel-next="" aria-label="Next testimonial">→</button></div></div><div className="logo-cloud" aria-label="Customer companies" data-animate="fade-up"><span>FENWICK</span><span>NORTHLANE</span><span>RIDGEFORM</span><span>APERTURE</span><span>VERDANT</span></div></div></section><section id="faq"><div className="wrap"><div className="section-head" data-animate="fade-up"><span className="eyebrow">Questions</span><h2 className="section-title">Everything you wanted to know.</h2><p className="faq-intro">Clear answers about how Krew connects people, workflows, and performance.</p></div><div className="faq-list" id="faq-list"><div className="faq-item" data-animate="fade-up"><div className="faq-q"><h4>What is Krew?</h4><span className="faq-icon"></span></div><div className="faq-a"><p>Krew is an employee management platform that connects hiring, onboarding, everyday HR, performance, and growth.</p></div></div><div className="faq-item" data-animate="fade-up" style={{ "transitionDelay": ".08s" }}><div className="faq-q"><h4>Is Krew only for HR?</h4><span className="faq-icon"></span></div><div className="faq-a"><p>No. Krew gives employees, managers, HR, and leadership their own view of the same organization.</p></div></div><div className="faq-item" data-animate="fade-up" style={{ "transitionDelay": ".16s" }}><div className="faq-q"><h4>Does Krew support hiring?</h4><span className="faq-icon"></span></div><div className="faq-a"><p>Yes. Hiring is where the journey begins — not where it ends.</p></div></div><div className="faq-item" data-animate="fade-up" style={{ "transitionDelay": ".24s" }}><div className="faq-q"><h4>What can Krew AI do?</h4><span className="faq-icon"></span></div><div className="faq-a"><p>From AI interviews to workforce insights, Krew helps teams work smarter and faster.</p></div></div><div className="faq-item" data-animate="fade-up" style={{ "transitionDelay": ".32s" }}><div className="faq-q"><h4>Can employees use Krew?</h4><span className="faq-icon"></span></div><div className="faq-a"><p>Yes. Employees can manage their information, leave, goals, documents, and more.</p></div></div><div className="faq-item" data-animate="fade-up" style={{ "transitionDelay": ".40s" }}><div className="faq-q"><h4>Can Krew grow with our organization?</h4><span className="faq-icon"></span></div><div className="faq-a"><p>That's the idea.</p></div></div></div><div className="faq-note" data-animate="fade-up">Still curious? From hire to higher performance.</div></div></section><section id="contact"><div className="contact-bg-glow" aria-hidden="true"></div><div className="wrap"><div className="contact-inner"><div data-animate="scale-in"><span className="eyebrow">Get started</span><h2 className="contact-title">Better people management<br />starts here.</h2><p className="section-sub">One platform. Every employee. One Krew.</p></div><form id="contact-form" data-animate="fade-left" noValidate><div className="field"><input type="text" id="name" placeholder=" " required="" autoComplete="name" /><label htmlFor="name">Full name</label><span className="underline"></span></div><div className="field"><input type="email" id="email" placeholder=" " required="" autoComplete="email" /><label htmlFor="email">Work email</label><span className="underline"></span></div><div className="field"><input type="text" id="company" placeholder=" " autoComplete="organization" /><label htmlFor="company">Company</label><span className="underline"></span></div><div className="field"><textarea id="message" placeholder=" "></textarea><label htmlFor="message">What are you hoping to solve?</label><span className="underline"></span></div><button type="submit" className="btn btn-primary submit-btn">Get Started →</button><p id="form-status" className="visually-hidden" role="status" aria-live="polite"></p></form></div></div></section><footer data-animate="fade-up"><div className="wrap"><div className="footer-top"><div><div className="footer-logo"><span className="mark" aria-hidden="true"></span>Krew</div><p style={{ "color": "var(--mist-dim)", "fontSize": "12.5px", "marginTop": "8px", "fontFamily": "var(--font-mono)", "letterSpacing": "0.06em" }}>FROM HIRE TO HIGHER PERFORMANCE.</p></div><div className="footer-cols"><div className="footer-col"><h5>Product</h5><ul><li><a href="#features">Features</a></li><li><a href="/job-openings">Hiring</a></li><li><a href="/login">Employees</a></li><li><a href="#dashboards">Performance</a></li><li><a href="#dashboards">Dashboards</a></li><li><a href="#features">Krew AI</a></li></ul></div><div className="footer-col"><h5>Company</h5><ul><li><a href="#problem">About</a></li><li><a href="#forhr">For HR</a></li><li><a href="#contact">Contact</a></li></ul></div><div className="footer-col"><h5>Resources</h5><ul><li><a href="#faq">FAQ</a></li><li><a href="#features">Documentation</a></li><li><a href="#hero">Overview</a></li></ul></div></div></div><div className="footer-bottom"><span>© 2026 Krew. All rights reserved.</span><span>Built for better work.</span></div></div></footer></div>
            </>
          }

        </>
      }
    />
  </Routes>
);
}
