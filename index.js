/**
 * TerraHire — Master Landing Page Logic (index.html)
 * Features 3D Three.js Interactive Globe, Dynamic KPI Counters, Timeline & Capability Grids
 */

(function () {
  "use strict";

  // =========================================================================
  // PRELOADER
  // =========================================================================
  function initLoader() {
    const loader = document.getElementById("loader");
    const bar = document.getElementById("loader-bar-fill");
    if (!loader || !bar) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 25) + 15;
      if (progress >= 100) {
        progress = 100;
        bar.style.width = "100%";
        clearInterval(interval);
        setTimeout(() => {
          loader.classList.add("hidden");
          initAnimations();
          initCounters();
          initThreeGlobe();
          initHowCanvas();
        }, 300);
      } else {
        bar.style.width = `${progress}%`;
      }
    }, 60);
  }

  // =========================================================================
  // SCROLL ANIMATIONS (INTERSECTION OBSERVER)
  // =========================================================================
  function initAnimations() {
    const targets = document.querySelectorAll("[data-animate]");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach((el) => observer.observe(el));
  }

  // =========================================================================
  // DYNAMIC COUNTER TICKERS
  // =========================================================================
  function initCounters() {
    const counters = document.querySelectorAll(".counter");
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const targetVal = parseInt(el.getAttribute("data-count") || "0", 10);
            const suffix = el.getAttribute("data-suffix") || "";
            let current = 0;
            const step = Math.max(1, Math.floor(targetVal / 30));
            const timer = setInterval(() => {
              current += step;
              if (current >= targetVal) {
                current = targetVal;
                el.textContent = targetVal + suffix;
                clearInterval(timer);
              } else {
                el.textContent = current + suffix;
              }
            }, 30);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.2 }
    );

    counters.forEach((c) => observer.observe(c));
  }

  // =========================================================================
  // THREE.JS INTERACTIVE 3D GLOBE
  // =========================================================================
  function initThreeGlobe() {
    const canvas = document.getElementById("hero-canvas");
    if (!canvas || typeof THREE === "undefined") return;

    const parent = canvas.parentElement;
    const width = parent.clientWidth || 480;
    const height = parent.clientHeight || 480;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Globe Sphere
    const sphereGeo = new THREE.SphereGeometry(1, 36, 36);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x0f2b3e,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const globe = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(globe);

    // Inner Glow Sphere
    const innerGeo = new THREE.SphereGeometry(0.96, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x0b1728,
      transparent: true,
      opacity: 0.75,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerSphere);

    // Global Hub Node Points (e.g. SF, London, Bengaluru, Lagos, Tokyo, Sydney)
    const cities = [
      { lat: 37.77, lon: -122.41 }, // SF
      { lat: 51.5, lon: -0.12 }, // London
      { lat: 12.97, lon: 77.59 }, // Bengaluru
      { lat: 6.52, lon: 3.37 }, // Lagos
      { lat: 35.67, lon: 139.65 }, // Tokyo
      { lat: -33.86, lon: 151.2 }, // Sydney
      { lat: -23.55, lon: -46.63 }, // São Paulo
      { lat: 25.2, lon: 55.27 }, // Dubai
    ];

    const nodesGroup = new THREE.Group();
    const nodeGeo = new THREE.SphereGeometry(0.026, 12, 12);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf });

    cities.forEach((city) => {
      const phi = (90 - city.lat) * (Math.PI / 180);
      const theta = (city.lon + 180) * (Math.PI / 180);
      const x = -(Math.sin(phi) * Math.cos(theta));
      const z = Math.sin(phi) * Math.sin(theta);
      const y = Math.cos(phi);

      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(x, y, z);
      nodesGroup.add(node);
    });

    globe.add(nodesGroup);

    // Atmospheric Glow Ring
    const ringGeo = new THREE.RingGeometry(1.08, 1.14, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x14b8a6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    scene.add(ring);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    window.addEventListener("mousemove", (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      targetRotationY = mouseX * 0.4;
      targetRotationX = mouseY * 0.3;
    });

    // Animation Loop
    function animate() {
      requestAnimationFrame(animate);
      globe.rotation.y += 0.0035;
      ring.rotation.z += 0.001;

      globe.rotation.x += (targetRotationX - globe.rotation.x) * 0.05;
      renderer.render(scene, camera);
    }
    animate();

    // Resize Handler
    window.addEventListener("resize", () => {
      const w = parent.clientWidth || 480;
      const h = parent.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }

  // =========================================================================
  // HOW-IT-WORKS PARTICLES CANVAS
  // =========================================================================
  function initHowCanvas() {
    const canvas = document.getElementById("how-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = canvas.parentElement.clientWidth || 800);
    let h = (canvas.height = canvas.parentElement.clientHeight || 400);

    const particles = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(45, 212, 191, 0.3)";
      ctx.strokeStyle = "rgba(45, 212, 191, 0.08)";

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(draw);
    }
    draw();

    window.addEventListener("resize", () => {
      w = canvas.width = canvas.parentElement.clientWidth || 800;
      h = canvas.height = canvas.parentElement.clientHeight || 400;
    });
  }

  // =========================================================================
  // FEATURES GRID
  // =========================================================================
  const FEATURES = [
    {
      icon: "🌐",
      title: "Global Multi-Org Mapping",
      desc: "Provision distinct enterprise organizations and subsidiaries with dedicated domain scopes and custom project codes.",
    },
    {
      icon: "👥",
      title: "Leadership Chain Topology",
      desc: "Link every contributor directly to their Reporting Manager, Team Lead, and Department Head with dynamic organizational charts.",
    },
    {
      icon: "⚡",
      title: "Dual Portal Architecture",
      desc: "Separate high-leverage admin governance tools from personalized employee hubs for tasks, referrals, and coordinates.",
    },
    {
      icon: "🔑",
      title: "Project Code Authentication",
      desc: "Team members can sign in seamlessly using either their work email or assigned project codes like BILL-01 and BETA-P01.",
    },
    {
      icon: "💼",
      title: "Internal Referral Engine",
      desc: "Empower staff to refer candidates across global project hubs with transparent tracking and automated bonus tier payouts.",
    },
    {
      icon: "🛡️",
      title: "Cryptographic Credential Security",
      desc: "Generate high-entropy credentials, randomized invite tokens, and manage access privileges across enterprise tenants.",
    },
  ];

  function renderFeatures() {
    const grid = document.getElementById("feature-grid");
    if (!grid) return;
    grid.innerHTML = "";

    FEATURES.forEach((f, idx) => {
      const card = document.createElement("div");
      card.className = "feat-card";
      card.setAttribute("data-animate", "fade-up");
      card.style.transitionDelay = `${idx * 0.08}s`;
      card.innerHTML = `
        <div class="feat-icon" style="font-size:24px; display:inline-block; margin-bottom:12px;">${f.icon}</div>
        <h3 class="feat-title">${f.title}</h3>
        <p class="feat-desc">${f.desc}</p>
      `;
      grid.appendChild(card);
    });
  }

  // =========================================================================
  // FAQ ACCORDIONS & NAV TOGGLE
  // =========================================================================
  function initInteractiveWidgets() {
    // FAQ toggles
    document.querySelectorAll(".faq-item").forEach((item) => {
      const q = item.querySelector(".faq-q");
      if (q) {
        q.addEventListener("click", () => {
          const isOpen = item.classList.contains("open");
          document.querySelectorAll(".faq-item").forEach((other) => other.classList.remove("open"));
          if (!isOpen) item.classList.add("open");
        });
      }
    });

    // Mobile nav toggle
    const toggle = document.getElementById("nav-toggle");
    const navLinks = document.querySelector(".nav-links");
    if (toggle && navLinks) {
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        navLinks.classList.toggle("open");
      });
    }

    // Role stack bar chart & ring animations
    const roleStack = document.querySelector(".role-stack");
    if (roleStack && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              document.querySelectorAll(".bar-chart .bar").forEach((b) => {
                const h = b.getAttribute("data-height") || "50";
                b.style.height = `${h}%`;
              });
              document.querySelectorAll(".ring-fg").forEach((ring) => {
                const val = parseFloat(ring.getAttribute("data-ring") || "75");
                const circumference = 2 * Math.PI * 35; // r=35
                const offset = circumference - (val / 100) * circumference;
                ring.style.strokeDasharray = `${circumference}`;
                ring.style.strokeDashoffset = `${offset}`;
              });
              observer.unobserve(roleStack);
            }
          });
        },
        { threshold: 0.25 }
      );
      observer.observe(roleStack);
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    initLoader();
    renderFeatures();
    initInteractiveWidgets();
  });
})();

