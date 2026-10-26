
(function(){
  "use strict";
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     LOADER — small Three.js icosahedron + fake progress
  ============================================================ */
  var loaderDone = false, appRevealed = false;
  function initLoader(){
    var canvas = document.getElementById('loader-canvas');
    var fill = document.getElementById('loader-bar-fill');
    var progress = 0;

    if(window.THREE && canvas){
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 4.2;
      var renderer = new THREE.WebGLRenderer({canvas:canvas, alpha:true, antialias:true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(180, 180, false);

      var geo = new THREE.IcosahedronGeometry(1.3, 1);
      var mat = new THREE.MeshBasicMaterial({color:0x2dd4bf, wireframe:true, transparent:true, opacity:0.85});
      var mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      var coreGeo = new THREE.IcosahedronGeometry(0.55, 0);
      var coreMat = new THREE.MeshBasicMaterial({color:0x7fe8dc, wireframe:true, transparent:true, opacity:0.5});
      var core = new THREE.Mesh(coreGeo, coreMat);
      scene.add(core);

      var clock = new THREE.Clock();
      var raf;
      function animate(){
        raf = requestAnimationFrame(animate);
        var t = clock.getElapsedTime();
        mesh.rotation.y = t * 0.6;
        mesh.rotation.x = t * 0.25;
        core.rotation.y = -t * 0.9;
        core.rotation.x = t * 0.4;
        renderer.render(scene, camera);
      }
      if(!reduceMotion){ animate(); } else { renderer.render(scene, camera); }
      window.__loaderCleanup = function(){ cancelAnimationFrame(raf); renderer.dispose(); };
    }

    var iv = setInterval(function(){
      progress += Math.random() * 18 + 6;
      if(progress >= 100){ progress = 100; clearInterval(iv); }
      fill.style.width = progress + '%';
      if(progress >= 100){ finishLoad(); }
    }, 220);

    // safety net: never block forever
    window.addEventListener('load', function(){
      setTimeout(function(){ if(!loaderDone){ progress = 100; fill.style.width='100%'; finishLoad(); } }, 900);
    });
    setTimeout(function(){ if(!loaderDone){ finishLoad(); } }, 4500);
  }

  function finishLoad(){
    if(loaderDone) return;
    loaderDone = true;
    var loader = document.getElementById('loader');
    var app = document.getElementById('app');
    setTimeout(function(){
      loader.classList.add('hidden');
      app.classList.add('revealed');
      if(window.__loaderCleanup){ setTimeout(window.__loaderCleanup, 1100); }
      appRevealed = true;
      document.dispatchEvent(new Event('terrahire:revealed'));
    }, 250);
  }

  initLoader();

  /* ============================================================
     NAV — scroll state, mobile toggle, smooth in-page links
  ============================================================ */
  var nav = document.getElementById('nav');
  var scrollProgress = document.getElementById('scroll-progress');
  function onScrollNav(){
    if(window.scrollY > 40){ nav.classList.add('scrolled'); } else { nav.classList.remove('scrolled'); }
  }
  function updateScrollProgress(){
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    if(scrollProgress) scrollProgress.style.width = pct + '%';
  }
  document.addEventListener('scroll', onScrollNav, {passive:true});
  document.addEventListener('scroll', updateScrollProgress, {passive:true});
  onScrollNav();
  updateScrollProgress();

  /* CURSOR GLOW — a restrained desktop-only ambient interaction */
  var cursorGlow = document.getElementById('cursor-glow');
  if(cursorGlow && !reduceMotion && window.matchMedia('(pointer:fine)').matches){
    var cursorFrame = false, cursorX = 0, cursorY = 0;
    window.addEventListener('mousemove', function(e){
      cursorX = e.clientX; cursorY = e.clientY;
      cursorGlow.style.opacity = '1';
      if(!cursorFrame){
        cursorFrame = true;
        requestAnimationFrame(function(){ cursorGlow.style.left = cursorX + 'px'; cursorGlow.style.top = cursorY + 'px'; cursorFrame = false; });
      }
    }, {passive:true});
    document.addEventListener('mouseleave', function(){ cursorGlow.style.opacity = '0'; });
  }

  /* HERO COPY PARALLAX — intentionally independent of the original Three.js input */
  var heroCopy = document.querySelector('.hero-copy');
  if(heroCopy && !reduceMotion){
    var px = 0, py = 0, pFrame = false;
    window.addEventListener('mousemove', function(e){
      px = ((e.clientX / window.innerWidth) - .5) * 8;
      py = ((e.clientY / window.innerHeight) - .5) * 5;
      if(!pFrame){
        pFrame = true;
        requestAnimationFrame(function(){ heroCopy.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)'; pFrame = false; });
      }
    }, {passive:true});
  }

  var navToggle = document.getElementById('nav-toggle');
  var navLinksEl = document.querySelector('.nav-links');
  navToggle.addEventListener('click', function(){
    var open = navLinksEl.style.display === 'flex';
    navLinksEl.style.display = open ? 'none' : 'flex';
    navLinksEl.style.flexDirection = 'column';
    navLinksEl.style.position = 'absolute';
    navLinksEl.style.top = '100%';
    navLinksEl.style.left = '0';
    navLinksEl.style.right = '0';
    navLinksEl.style.background = 'rgba(10,22,40,0.98)';
    navLinksEl.style.padding = '20px 32px';
    navLinksEl.style.borderBottom = '1px solid var(--line)';
    navToggle.setAttribute('aria-expanded', String(!open));
  });
  document.querySelectorAll('.nav-links a').forEach(function(a){
    a.addEventListener('click', function(){
      if(window.innerWidth <= 900){ navLinksEl.style.display = 'none'; navToggle.setAttribute('aria-expanded','false'); }
    });
  });

  /* ============================================================
     FEATURE CARDS — generated for varied entrance animations
  ============================================================ */
  var featureData = [
    {icon:'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z', title:'Smart Hiring', body:'Find, screen, interview, and hire better.', anim:'fade-up'},
    {icon:'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75', title:'Easy Onboarding', body:'Turn new hires into team members, faster.', anim:'scale-in'},
    {icon:'M3 12l6 6L21 6', title:'Employee Management', body:'One place for every employee, every day.', anim:'fade-down'},
    {icon:'M12 8v4l3 3 M12 22A10 10 0 1 0 12 2a10 10 0 0 0 0 20z', title:'Time & Leave', body:'Less paperwork. More time.', anim:'blur-in'},
    {icon:'M3 3v18h18 M7 15l3-4 3 3 5-7', title:'Performance', body:'Turn goals into progress.', anim:'fade-up'},
    {icon:'M13 2L3 14h9l-1 8 10-12h-9l1-8z', title:'Workforce Insights', body:'See what matters. Act on it.', anim:'scale-in'}
  ];
  var grid = document.getElementById('feature-grid');
  featureData.forEach(function(f, i){
    var card = document.createElement('div');
    card.className = 'feature-card';
    card.setAttribute('data-animate', f.anim);
    card.style.transitionDelay = (i % 3) * 0.1 + 's';
    card.innerHTML =
      '<div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="'+f.icon+'"/></svg></div>' +
      '<h4>'+f.title+'</h4><p>'+f.body+'</p>';
    grid.appendChild(card);
  });

  /* CARD TILT + LIGHT FOLLOW — pointer-only and disabled for reduced motion */
  function initCardMotion(){
    if(reduceMotion || !window.matchMedia('(pointer:fine)').matches) return;
    document.querySelectorAll('.feature-card,.role-card,.pricing-card').forEach(function(card){
      card.classList.add('tilt-ready');
      card.addEventListener('pointermove', function(e){
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--tilt-x', ((x - .5) * 5).toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', ((.5 - y) * 5).toFixed(2) + 'deg');
        card.style.setProperty('--tilt-lift', '-6px');
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function(){
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
        card.style.setProperty('--tilt-lift', '0px');
      });
    });
  }
  initCardMotion();

  /* ============================================================
     INTERSECTION OBSERVER — generic reveal for [data-animate]
  ============================================================ */
  var revealObserver = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold:0.16, rootMargin:'0px 0px -8% 0px'});

  function observeAll(){
    document.querySelectorAll('[data-animate]').forEach(function(el){ revealObserver.observe(el); });
    document.querySelectorAll('.step').forEach(function(el){ revealObserver.observe(el); });
    document.querySelectorAll('.candidate-item').forEach(function(el){ revealObserver.observe(el); });
    document.querySelectorAll('.faq-item').forEach(function(el){ revealObserver.observe(el); });
  }

  /* ============================================================
     COUNTERS
  ============================================================ */
  var countObserver = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        animateCounter(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  }, {threshold:0.5});

  function animateCounter(el){
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1400;
    var start = null;
    function step(ts){
      if(!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(target * eased);
      el.textContent = val + suffix;
      if(p < 1){ requestAnimationFrame(step); } else { el.textContent = target + suffix; }
    }
    requestAnimationFrame(step);
  }

  function observeCounters(){
    document.querySelectorAll('.counter').forEach(function(el){ countObserver.observe(el); });
  }

  /* ============================================================
     BAR CHARTS + RINGS (dashboards)
  ============================================================ */
  var chartObserver = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.querySelectorAll('.bar').forEach(function(bar){
          bar.style.height = bar.getAttribute('data-height') + '%';
        });
        chartObserver.unobserve(entry.target);
      }
    });
  }, {threshold:0.4});
  document.querySelectorAll('[data-chart]').forEach(function(el){ chartObserver.observe(el); });

  var ringObserver = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        var ring = entry.target;
        var pct = parseFloat(ring.getAttribute('data-ring'));
        var circumference = 2 * Math.PI * 35;
        var offset = circumference - (pct/100) * circumference;
        ring.style.strokeDasharray = circumference;
        ring.style.strokeDashoffset = offset;
        ringObserver.unobserve(ring);
      }
    });
  }, {threshold:0.4});
  document.querySelectorAll('.ring-fg').forEach(function(el){ ringObserver.observe(el); });

  /* ============================================================
     TIMELINE DRAW ("How it works")
  ============================================================ */
  var timelineEl = document.getElementById('timeline');
  var timelineFill = document.getElementById('timeline-fill');
  function onTimelineScroll(){
    if(!timelineEl) return;
    var rect = timelineEl.getBoundingClientRect();
    var vh = window.innerHeight;
    var total = rect.height;
    var visibleStart = vh * 0.85;
    var progressPx = visibleStart - rect.top;
    var pct = Math.max(0, Math.min(1, progressPx / total));
    timelineFill.style.height = (pct * 100) + '%';
  }
  document.addEventListener('scroll', onTimelineScroll, {passive:true});
  window.addEventListener('resize', onTimelineScroll, {passive:true});

  /* ============================================================
     TESTIMONIAL CAROUSEL — pauses for reduced-motion users
  ============================================================ */
  var carousel = document.querySelector('[data-carousel]');
  if(carousel){
    var slides = Array.prototype.slice.call(carousel.querySelectorAll('[data-carousel-slide]'));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-dot'));
    var currentSlide = 0, carouselTimer;
    function showSlide(index){
      currentSlide = (index + slides.length) % slides.length;
      slides.forEach(function(slide, i){ slide.classList.toggle('is-active', i === currentSlide); });
      dots.forEach(function(dot, i){ dot.classList.toggle('active', i === currentSlide); dot.setAttribute('aria-selected', i === currentSlide ? 'true' : 'false'); });
    }
    function restartCarousel(){
      if(reduceMotion) return;
      clearInterval(carouselTimer);
      carouselTimer = setInterval(function(){ showSlide(currentSlide + 1); }, 5600);
    }
    carousel.querySelector('[data-carousel-prev]').addEventListener('click', function(){ showSlide(currentSlide - 1); restartCarousel(); });
    carousel.querySelector('[data-carousel-next]').addEventListener('click', function(){ showSlide(currentSlide + 1); restartCarousel(); });
    dots.forEach(function(dot, i){ dot.addEventListener('click', function(){ showSlide(i); restartCarousel(); }); });
    showSlide(0); restartCarousel();
  }

  /* ============================================================
     FAQ ACCORDION
  ============================================================ */
  document.querySelectorAll('.faq-q').forEach(function(q){
    q.addEventListener('click', function(){
      var item = q.closest('.faq-item');
      var wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(i){ i.classList.remove('open'); });
      if(!wasOpen){ item.classList.add('open'); }
    });
    q.setAttribute('tabindex','0');
    q.setAttribute('role','button');
    q.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); q.click(); }
    });
  });

  /* ============================================================
     CONTACT FORM — submit ripple + fake success state
  ============================================================ */
  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var btn = form.querySelector('.submit-btn');
    btn.style.transform = 'scale(0.97)';
    setTimeout(function(){ btn.style.transform = ''; }, 180);
    btn.textContent = 'Request sent — we\'ll be in touch';
    btn.disabled = true;
    status.textContent = 'Your walkthrough request has been sent.';
  });
  form.querySelectorAll('.submit-btn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      var ripple = document.createElement('span');
      ripple.className = 'ripple';
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
      btn.appendChild(ripple);
      setTimeout(function(){ ripple.remove(); }, 700);
    });
  });

  /* ============================================================
     THREE.JS HERO SCENE — wireframe globe + orbit particles
  ============================================================ */
  function initHeroScene(){
    var canvas = document.getElementById('hero-canvas');
    if(!canvas || !window.THREE) return;
    var container = canvas.parentElement;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    var renderer = new THREE.WebGLRenderer({canvas:canvas, alpha:true, antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    function setSize(){
      var w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    setSize();

    var globeGroup = new THREE.Group();
    scene.add(globeGroup);

    /* Additional depth layer: independent of the original globe objects. */
    var enhancementGroup = new THREE.Group();
    enhancementGroup.position.z = -0.72;
    scene.add(enhancementGroup);
    var depthParticles = null;
    var outerShell = null;
    var depthHalo = null;

    if(!reduceMotion){
      var depthCount = 120;
      var depthPositions = new Float32Array(depthCount * 3);
      for(var dp = 0; dp < depthCount; dp++){
        var depthRadius = 2.9 + Math.random() * 1.35;
        var depthTheta = Math.random() * Math.PI * 2;
        var depthPhi = Math.acos((Math.random() * 2) - 1);
        depthPositions[dp*3] = depthRadius * Math.sin(depthPhi) * Math.cos(depthTheta);
        depthPositions[dp*3+1] = depthRadius * Math.sin(depthPhi) * Math.sin(depthTheta);
        depthPositions[dp*3+2] = depthRadius * Math.cos(depthPhi);
      }
      var depthGeo = new THREE.BufferGeometry();
      depthGeo.setAttribute('position', new THREE.BufferAttribute(depthPositions, 3));
      var depthMat = new THREE.PointsMaterial({color:0x7dd3fc, size:0.018, transparent:true, opacity:0.42, sizeAttenuation:true});
      depthParticles = new THREE.Points(depthGeo, depthMat);
      enhancementGroup.add(depthParticles);

      var shellGeo = new THREE.SphereGeometry(2.28, 32, 24);
      var shellMat = new THREE.MeshBasicMaterial({color:0x31d1bd, transparent:true, opacity:0.035, wireframe:true});
      outerShell = new THREE.Mesh(shellGeo, shellMat);
      enhancementGroup.add(outerShell);

      var haloGeo = new THREE.SphereGeometry(2.42, 32, 24);
      var haloMat = new THREE.MeshBasicMaterial({color:0x31d1bd, transparent:true, opacity:0.035, side:THREE.BackSide, blending:THREE.AdditiveBlending, depthWrite:false});
      depthHalo = new THREE.Mesh(haloGeo, haloMat);
      enhancementGroup.add(depthHalo);
    }

    // solid subtle sphere (depth)
    var solidGeo = new THREE.SphereGeometry(1.7, 48, 48);
    var solidMat = new THREE.MeshBasicMaterial({color:0x0f1f38, transparent:true, opacity:0.55});
    var solidSphere = new THREE.Mesh(solidGeo, solidMat);
    globeGroup.add(solidSphere);

    // wireframe overlay
    var wireGeo = new THREE.SphereGeometry(1.72, 28, 20);
    var wireMat = new THREE.MeshBasicMaterial({color:0x2dd4bf, wireframe:true, transparent:true, opacity:0.5});
    var wireSphere = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wireSphere);

    // outer glow ring
    var ringGeo = new THREE.TorusGeometry(2.15, 0.006, 8, 100);
    var ringMat = new THREE.MeshBasicMaterial({color:0x7fe8dc, transparent:true, opacity:0.4});
    var ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2.6;
    globeGroup.add(ring1);
    var ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
    ring2.rotation.x = -Math.PI / 3.4;
    ring2.rotation.y = Math.PI / 5;
    ring2.scale.set(1.12,1.12,1.12);
    globeGroup.add(ring2);

    // floating particles around the globe
    var particleCount = 260;
    var positions = new Float32Array(particleCount * 3);
    for(var i = 0; i < particleCount; i++){
      var r = 2.1 + Math.random() * 1.4;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos((Math.random() * 2) - 1);
      positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);
    }
    var particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var particleMat = new THREE.PointsMaterial({color:0x2dd4bf, size:0.028, transparent:true, opacity:0.75, sizeAttenuation:true});
    var particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // connective "node" points on the globe surface (network feel)
    var nodeCount = 22;
    var nodePositions = [];
    var nodeGeo = new THREE.BufferGeometry();
    var nodeArr = new Float32Array(nodeCount * 3);
    for(var n = 0; n < nodeCount; n++){
      var rr = 1.73;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos((Math.random() * 2) - 1);
      var x = rr * Math.sin(ph) * Math.cos(th);
      var y = rr * Math.sin(ph) * Math.sin(th);
      var z = rr * Math.cos(ph);
      nodeArr[n*3] = x; nodeArr[n*3+1] = y; nodeArr[n*3+2] = z;
      nodePositions.push(new THREE.Vector3(x,y,z));
    }
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodeArr, 3));
    var nodeMat = new THREE.PointsMaterial({color:0xffffff, size:0.05, transparent:true, opacity:0.9});
    var nodePoints = new THREE.Points(nodeGeo, nodeMat);
    globeGroup.add(nodePoints);

    // a handful of connecting lines between near nodes for a "network" feel
    var lineMat = new THREE.LineBasicMaterial({color:0x2dd4bf, transparent:true, opacity:0.22});
    var lineGeoPoints = [];
    for(var a = 0; a < nodePositions.length; a++){
      for(var b = a+1; b < nodePositions.length; b++){
        if(nodePositions[a].distanceTo(nodePositions[b]) < 1.05 && Math.random() < 0.5){
          lineGeoPoints.push(nodePositions[a], nodePositions[b]);
        }
      }
    }
    if(lineGeoPoints.length){
      var lineGeo = new THREE.BufferGeometry().setFromPoints(lineGeoPoints);
      var lines = new THREE.LineSegments(lineGeo, lineMat);
      globeGroup.add(lines);
    }

    var mouseX = 0, mouseY = 0, targetRotX = 0, targetRotY = 0;
    var scrollParallax = 0;
    window.addEventListener('scroll', function(){
      if(!reduceMotion) scrollParallax = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
    }, {passive:true});
    window.addEventListener('mousemove', function(e){
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    }, {passive:true});

    var clock = new THREE.Clock();
    var raf;
    function animate(){
      raf = requestAnimationFrame(animate);
      var t = clock.getElapsedTime();
      globeGroup.rotation.y = t * 0.14;
      particles.rotation.y = -t * 0.05;
      ring1.rotation.z = t * 0.08;
      ring2.rotation.z = -t * 0.06;

      if(enhancementGroup){
        enhancementGroup.rotation.y = t * 0.022;
        enhancementGroup.rotation.x = Math.sin(t * 0.32) * 0.025;
        enhancementGroup.position.y = -scrollParallax * 0.08;
        if(depthParticles) depthParticles.rotation.z = -t * 0.018;
        if(outerShell) outerShell.rotation.y = -t * 0.035;
        if(depthHalo) depthHalo.scale.setScalar(1 + Math.sin(t * 1.4) * 0.035);
      }

      targetRotX += (mouseY * 0.25 - targetRotX) * 0.04;
      targetRotY += (mouseX * 0.35 - targetRotY) * 0.04;
      globeGroup.rotation.x = targetRotX;
      camera.position.x += (targetRotY * 1.4 - camera.position.x) * 0.03;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }
    if(!reduceMotion){ animate(); } else { renderer.render(scene, camera); }

    window.addEventListener('resize', function(){ setSize(); }, {passive:true});
  }

  /* ============================================================
     "HOW IT WORKS" AMBIENT PARTICLE CANVAS (lightweight 2D)
  ============================================================ */
  function initHowParticles(){
    var canvas = document.getElementById('how-canvas');
    if(!canvas) return;
    var ctx = canvas.getContext('2d');
    var section = canvas.closest('section');
    var dots = [];
    function resize(){
      canvas.width = section.clientWidth;
      canvas.height = section.clientHeight;
      dots = [];
      var count = Math.floor((canvas.width * canvas.height) / 26000);
      for(var i=0;i<count;i++){
        dots.push({
          x: Math.random()*canvas.width,
          y: Math.random()*canvas.height,
          r: Math.random()*1.4 + 0.4,
          vx: (Math.random()-0.5)*0.15,
          vy: (Math.random()-0.5)*0.15,
          o: Math.random()*0.4 + 0.15
        });
      }
    }
    resize();
    window.addEventListener('resize', resize, {passive:true});

    var inView = false;
    var io = new IntersectionObserver(function(entries){ inView = entries[0].isIntersecting; }, {threshold:0});
    io.observe(section);

    function loop(){
      requestAnimationFrame(loop);
      if(!inView || reduceMotion) return;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#2dd4bf';
      dots.forEach(function(d){
        d.x += d.vx; d.y += d.vy;
        if(d.x < 0) d.x = canvas.width; if(d.x > canvas.width) d.x = 0;
        if(d.y < 0) d.y = canvas.height; if(d.y > canvas.height) d.y = 0;
        ctx.globalAlpha = d.o;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    loop();
  }

  /* ============================================================
     INIT ON REVEAL
  ============================================================ */
  function boot(){
    observeAll();
    observeCounters();
    onTimelineScroll();
    initHeroScene();
    initHowParticles();
  }

  if(appRevealed){ boot(); } else { document.addEventListener('terrahire:revealed', boot, {once:true}); }

})();