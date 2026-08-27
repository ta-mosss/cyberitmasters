import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import HeroBackgroundBoundary from "./components/HeroBackgroundBoundary";

// Deferred: ogl (WebGL) is a non-trivial chunk for a purely decorative
// background — no reason to block first paint on it.
const SoftAurora = lazy(() => import("./components/SoftAurora"));

// Shown while SoftAurora is loading, when WebGL/animation isn't available
// (reduced-motion, no WebGL support, GPU context loss), or if it throws.
function HeroBackgroundFallback() {
  return <div className="hero-bg-fallback" aria-hidden="true" />;
}

// Using Netlify Forms — no external endpoint needed, Netlify intercepts
// the POST at the CDN edge based on the form's `name` + `data-netlify`
// attribute (see the <form> below, and the hidden static duplicate in
// index.html that lets Netlify's build bot detect the form at all, since
// it can't see JS-rendered markup).
//
// If you move off Netlify later, worker/index.js is a ready-to-deploy
// Cloudflare Worker alternative — swap the submit() body back to a fetch
// against that endpoint.

const services = [
  {icon:"◈", title:"Managed IT Services", tag:"MSP", text:"Proactive monitoring, helpdesk, patching, endpoint management, backups and lifecycle planning — with one accountable technology partner."},
  {icon:"⌁", title:"Cybersecurity", tag:"SECURITY", text:"Layered protection for identities, endpoints, email, networks and data, backed by practical security governance."},
  {icon:"◉", title:"IT Solutions & Infrastructure", tag:"INFRASTRUCTURE", text:"Business networks, Wi-Fi, servers, cloud platforms, Microsoft 365, hardware, migrations and structured technology projects."},
  {icon:"</>", title:"Web & Application Development", tag:"SOFTWARE", text:"Modern websites, portals, business applications, APIs and integrations designed around real operational workflows."},
  {icon:"⚙", title:"DevOps & Cloud Engineering", tag:"DEVOPS", text:"CI/CD pipelines, source control, environments, containers, observability, deployment automation and cloud-ready application delivery."},
  {icon:"▣", title:"IT Procurement & Technology", tag:"TECHNOLOGY", text:"Technology sourcing, deployment and lifecycle management for laptops, desktops, networking, printers and business infrastructure."}
];

const capabilities = [
  "24/7 remote monitoring & support", "Microsoft 365 & cloud management", "Endpoint & identity security",
  "Network design, Wi-Fi & firewall", "Backup & disaster recovery", "Websites & customer portals",
  "Custom business applications", "API & systems integration", "CI/CD & release automation",
  "Cloud architecture & migration", "IT asset lifecycle management", "Technical consulting"
];

const industries = ["SMEs","Professional Services","Healthcare","Construction","Retail","Education","Hospitality","Non-Profits"];

const faqs = [
  ["What does an MSP do for a business?","An MSP becomes your ongoing technology partner: monitoring systems, resolving issues, managing devices and cloud services, improving security and helping plan technology before it becomes a business problem."],
  ["Can you handle both IT support and software development?","Yes. The new positioning combines Managed IT, IT Solutions and Web/Application Development & DevOps so a client can work with one technology partner across infrastructure and software."],
  ["Do you support Microsoft 365?","Yes. Microsoft 365 support can include user administration, email, security configuration, licensing guidance, migrations and ongoing management."],
  ["Can you build a custom business portal?","Yes. We can scope customer portals, internal management systems, dashboards, workflow applications, APIs and integrations around your business process."],
  ["Do you offer cybersecurity for smaller businesses?","Yes. Security should scale to the business. We focus on practical controls such as identity protection, endpoint security, backups, email security, network protection and security awareness."],
  ["Can you manage a website after development?","Yes. Website/application maintenance, hosting coordination, monitoring, backups, updates and ongoing development can be part of the support relationship."]
];

function App(){
  const [menuOpen,setMenuOpen]=useState(false);
  const [openFaq,setOpenFaq]=useState(0);
  const navRef=useRef(null);
  const menuBtnRef=useRef(null);

  useEffect(() => {
    if (!menuOpen) return;

    // Move focus into the open drawer so keyboard/screen-reader users
    // land somewhere sensible instead of the toggle button.
    const focusables = navRef.current?.querySelectorAll('a, button');
    focusables?.[0]?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
        return;
      }
      // Basic focus trap: keep Tab cycling within the open drawer.
      if (e.key === "Tab" && focusables?.length) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target) && !menuBtnRef.current?.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Set when WebGL is unsupported/disabled, prefers-reduced-motion is on,
  // the shader fails to compile, or the GPU context is lost mid-session.
  const [heroBgFailed,setHeroBgFailed]=useState(false);
  // NEW: State to track if we are on mobile
  const [isMobile, setIsMobile] = useState(false);
  const [form,setForm]=useState({name:"",email:"",company:"",service:"",message:"",website:""});
  const [status,setStatus]=useState("idle"); // idle | sending | sent | error

  // NEW: Detect mobile screen size and update on resize
  useEffect(() => {
    const handleResize = () => {
      // Change 768 to whatever breakpoint you prefer (tablet size, etc.)
      setIsMobile(window.innerWidth < 768);
    };

    // Check on initial load
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const submit=async(e)=>{
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ "form-name": "contact", ...form }).toString(),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
      setForm({name:"",email:"",company:"",service:"",message:"",website:""});
    } catch (err) {
      setStatus("error");
    }
  };

  return <div className="app">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <header className="nav">
      <a href="#home" className="brand"><img src="/logo.png" alt="Cyber I.T Masters" onError={e=>e.currentTarget.style.display="none"}/><span><b>CYBER</b> I.T MASTERS<small>IT MSP · SOLUTIONS · SOFTWARE</small></span></a>
      <button ref={menuBtnRef} className="menu-btn" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>☰</button>
      <nav ref={navRef} className={menuOpen?"nav-links open":"nav-links"}>
        {["Services","Solutions","DevOps","Industries","Process","Contact"].map(x=><a key={x} href={`#${x.toLowerCase()}`} onClick={()=>setMenuOpen(false)}>{x}</a>)}
        <a className="nav-cta" href="#contact">Book an Assessment →</a>
      </nav>
    </header>

    <main id="main-content" tabIndex="-1">
      <section id="home" className="hero">
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {/* UPDATED: Check if mobile OR failed */}
          {heroBgFailed || isMobile ? <HeroBackgroundFallback /> : (
            <HeroBackgroundBoundary fallback={<HeroBackgroundFallback />}>
              <Suspense fallback={<HeroBackgroundFallback />}>
                <SoftAurora
                  speed={0.6}
                  scale={1.5}
                  brightness={1.0}
                  color1="#0A29FF"
                  color2="#5227FF"
                  noiseFrequency={2.5}
                  noiseAmplitude={1.0}
                  bandHeight={0.5}
                  bandSpread={1.0}
                  octaveDecay={0.1}
                  layerOffset={0}
                  colorSpeed={1.0}
                  enableMouseInteraction={true}
                  mouseInfluence={0.25}
                  onError={()=>setHeroBgFailed(true)}
                />
              </Suspense>
            </HeroBackgroundBoundary>
          )}
        </div>

        <div className="hero-grid" style={{ position: 'relative', zIndex: 1 }}>
          {/* ... rest of the Hero content ... */}
          <div className="hero-copy">
            <div className="eyebrow"><span className="pulse"></span> TECHNOLOGY PARTNER · POLOKWANE · SOUTH AFRICA</div>
            <h1>IT THAT <em>WORKS.</em><br/>SOLUTIONS THAT <em>SCALE.</em></h1>
            <p className="hero-lead">Cyber I.T Masters is a full-service technology partner delivering <strong>Managed IT, IT Solutions, Cybersecurity, Web & Application Development and DevOps</strong> for businesses that cannot afford technology to slow them down.</p>
            <div className="hero-actions"><a className="btn primary" href="#contact">Start a Technology Assessment</a><a className="btn ghost" href="#services">Explore Services ↓</a></div>
            <div className="trust-row"><span>✓ Proactive IT</span><span>✓ Security-first</span><span>✓ Business-focused</span><span>✓ One technology partner</span></div>
          </div>
          <div className="hero-panel">
            <div className="panel-top"><span>CYBER I.T / COMMAND CENTRE</span><i>LIVE</i></div>
            <div className="panel-status"><span className="status-dot"></span><b>Technology operations</b><span>Protected</span></div>
            <div className="signal"><div><strong>MSP</strong><small>MANAGED IT</small></div><div><strong>SEC</strong><small>CYBERSECURITY</small></div><div><strong>DEV</strong><small>SOFTWARE</small></div></div>
            <div className="panel-lines"><span>Infrastructure</span><b>Operational</b><span>Security posture</span><b>Monitored</b><span>Cloud & applications</span><b>Scalable</b></div>
            <div className="panel-footer">ONE PARTNER · MULTIPLE TECHNOLOGY DISCIPLINES</div>
          </div>
        </div>
      </section>

      {/* The rest of your file (Metrics, Services, etc.) remains EXACTLY the same as before */}
      <section className="metrics">
        <div><b>01</b><span>MANAGED IT</span><small>Proactive support & monitoring</small></div>
        <div><b>02</b><span>IT SOLUTIONS</span><small>Infrastructure & cloud</small></div>
        <div><b>03</b><span>SOFTWARE</span><small>Web & application delivery</small></div>
        <div><b>04</b><span>DEVOPS</span><small>Automation & deployment</small></div>
      </section>

      {/* Include the rest of your sections here exactly as they were */}
      {/* ... Services, Solutions, DevOps, Industries, Process, Contact, FAQ, Footer ... */}
      <section id="services" className="section">
        <div className="section-head"><div><div className="eyebrow">01 / CORE SERVICES</div><h2>THE TECHNOLOGY<br/><em>STACK BEHIND</em> YOUR BUSINESS.</h2></div><p>From everyday IT operations to new digital products, we bring infrastructure, security and software engineering into one accountable service.</p></div>
        <div className="service-grid">{services.map(s=><article className="service-card" key={s.title}><div className="service-icon">{s.icon}</div><div className="service-tag">{s.tag}</div><h3>{s.title}</h3><p>{s.text}</p><a href="#contact">Discuss this service →</a></article>)}</div>
      </section>

      <section id="solutions" className="section dark-section">
        <div className="section-head"><div><div className="eyebrow">02 / IT SOLUTIONS</div><h2>BUILD A <em>STRONGER</em><br/>TECHNOLOGY FOUNDATION.</h2></div><p>Technology should be secure, maintainable and aligned to the way your organisation actually operates.</p></div>
        <div className="cap-grid">{capabilities.map((c,i)=><div key={c}><span>{String(i+1).padStart(2,"0")}</span><b>{c}</b></div>)}</div>
        <div className="solution-band"><div><span>NEED A ROADMAP?</span><h3>Turn scattered IT into a managed technology strategy.</h3></div><a className="btn primary" href="#contact">Book a Technology Review →</a></div>
      </section>

      <section id="devops" className="section">
        <div className="devops-grid">
          <div><div className="eyebrow">03 / WEB · APPS · DEVOPS</div><h2>FROM <em>IDEA</em> TO<br/>PRODUCTION.</h2><p className="large-copy">We design and build digital systems that connect your people, customers and operations — then put the engineering discipline around them to keep them reliable.</p><a className="btn primary" href="#contact">Discuss a Software Project →</a></div>
          <div className="terminal"><div className="terminal-bar"><span></span><span></span><span></span><b>deployment.pipeline</b></div><pre>{`$ git push origin main

✓ lint & type checks
✓ automated tests
✓ security scan
✓ build application
✓ package release
✓ deploy staging
✓ smoke tests
→ production ready

STATUS:  ALL SYSTEMS GO`}</pre></div>
        </div>
        <div className="devops-cards"><article><b>01</b><h3>Websites</h3><p>Fast, responsive, SEO-ready business websites and landing pages.</p></article><article><b>02</b><h3>Applications</h3><p>Portals, dashboards, workflow systems and custom business software.</p></article><article><b>03</b><h3>DevOps</h3><p>Git workflows, CI/CD, environments, deployments and operational visibility.</p></article><article><b>04</b><h3>Integrations</h3><p>APIs, payment, messaging, CRM and third-party platform integrations.</p></article></div>
      </section>

      <section id="industries" className="section industry-section">
        <div className="eyebrow">04 / INDUSTRIES</div><h2>TECHNOLOGY FOR<br/><em>REAL OPERATIONS.</em></h2>
        <p className="section-sub">Solutions are shaped around business risk, users, workflows and growth — not generic technology checklists.</p>
        <div className="industry-grid">{industries.map((x,i)=><div key={x}><span>0{i+1}</span><b>{x}</b><small>Technology support & solutions</small></div>)}</div>
      </section>

      <section id="process" className="section dark-section">
        <div className="eyebrow">05 / DELIVERY MODEL</div><h2>DISCOVER. <em>DESIGN.</em><br/>DELIVER. SUPPORT.</h2>
        <div className="process-grid">{[["01","Discover","Understand your environment, business goals, risks and pain points."],["02","Design","Build a practical technology roadmap, architecture and delivery plan."],["03","Deliver","Implement, migrate, develop and deploy with controlled change."],["04","Operate","Monitor, support, secure, optimise and continuously improve."]].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
      </section>

      <section id="contact" className="section contact-section">
        <div className="contact-grid">
          <div><div className="eyebrow">06 / START HERE</div><h2>LET'S FIX<br/><em>YOUR IT.</em></h2><p className="large-copy">Tell us what you are trying to improve, build or protect. We will route the enquiry to the right technology discipline.</p><div className="contact-details"><a href="tel:+27726650565">+27 72 665 0565</a><a href="mailto:info@mbulahenigroup.co.za">info@mbulahenigroup.co.za</a><span>Polokwane · Limpopo · South Africa</span></div></div>
          <form
            name="contact"
            onSubmit={submit}
            className="contact-form"
            noValidate
            data-netlify="true"
            netlify-honeypot="website"
          >
            <input type="hidden" name="form-name" value="contact" />
            <label>Name<input name="name" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
            <label>Company<input name="company" value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/></label>
            <label>Email<input name="email" required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
            <label>What do you need?<select name="service" required value={form.service} onChange={e=>setForm({...form,service:e.target.value})}><option value="">Select a service</option><option>Managed IT Services</option><option>IT Solutions & Infrastructure</option><option>Cybersecurity</option><option>Microsoft 365 / Cloud</option><option>Website Development</option><option>Application Development</option><option>DevOps / Cloud Engineering</option><option>IT Procurement</option></select></label>
            <label className="full">Project / IT requirements<textarea name="message" required minLength="10" rows="5" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></label>
            <label className="hp-field" aria-hidden="true">
              Leave this field empty
              <input name="website" tabIndex="-1" autoComplete="off" value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/>
            </label>
            <button className="btn primary full" type="submit" disabled={status==="sending"}>
              {status==="sending" ? "Sending…" : status==="sent" ? "Enquiry sent ✓" : "Send Technology Enquiry →"}
            </button>
            <div className={`form-status${status==="error"?" error":""}`} role="status" aria-live="polite">
              {status==="sent" && "Thanks — your enquiry has been sent. We'll be in touch shortly."}
              {status==="error" && "Something went wrong sending that. Please try again, or call/email us directly."}
            </div>
            <small className="form-note">Your enquiry is sent directly to our team — no email client required.</small>
          </form>
        </div>
      </section>

      <section id="faq" className="section faq-section">
        <div className="eyebrow">07 / FAQ</div><h2>QUESTIONS, <em>ANSWERED.</em></h2>
        <div className="faq-list">{faqs.map(([q,a],i)=><div className={openFaq===i?"faq open":"faq"} key={q}><button onClick={()=>setOpenFaq(openFaq===i?-1:i)} aria-expanded={openFaq===i}>{q}<span>+</span></button><div className="faq-answer"><div className="faq-answer-inner">{a}</div></div></div>)}</div>
      </section>
    </main>

    <footer><div className="footer-brand">CYBER <em>I.T</em> MASTERS<small>MANAGED IT · IT SOLUTIONS · SOFTWARE · DEVOPS</small></div><div className="footer-links"><a href="#services">Services</a><a href="#solutions">Solutions</a><a href="#devops">Development</a><a href="#contact">Contact</a></div><span>© {new Date().getFullYear()} Cyber I.T Masters · Mbulaheni Group</span></footer>
  </div>;
}
export default App;
