import React, { useState, useEffect, useRef, Suspense } from "react";
import HeroBackgroundBoundary from "./components/HeroBackgroundBoundary";
import CursorRingField from "./components/CursorRingField";
import StrokeText from "./components/StrokeText";

function HeroBackgroundFallback() {
  return <div className="hero-bg-fallback" aria-hidden="true" />;
}

const services = [
  {icon:"◈", title:"01 Managed IT", tag:"MSP", text:"Support · Monitoring · Microsoft 365 · Endpoints. Proactive monitoring, helpdesk, and lifecycle planning."},
  {icon:"⌁", title:"02 Cybersecurity", tag:"SECURITY", text:"Identity · Endpoint · Email · Network · Backup. Layered protection backed by practical governance."},
  {icon:"◉", title:"03 Infrastructure & Cloud", tag:"CLOUD", text:"Networks · Wi-Fi · Servers · Cloud · Migrations. A practical technology foundation for your business."},
  {icon:"</>", title:"04 Software Development", tag:"SOFTWARE", text:"Websites · Portals · Applications · APIs. Modern systems designed around your real workflows."},
  {icon:"⚙", title:"05 DevOps", tag:"DEVOPS", text:"CI/CD · Cloud · Containers · Automation. Engineering discipline to keep your systems reliable."},
  {icon:"▣", title:"06 Technology Procurement", tag:"LIFECYCLE", text:"Source, deploy and manage the hardware your business depends on. Hardware, deployment and lifecycle."}
];

const capabilities = [
  "24/7 monitoring & proactive management", "Microsoft 365 & cloud management", "Endpoint & identity security",
  "Network design, Wi-Fi & firewall", "Backup & disaster recovery", "Websites & customer portals",
  "Custom business applications", "API & systems integration", "CI/CD & release automation",
  "Cloud architecture & migration", "IT asset lifecycle management", "Priority support per your SLA"
];

const industries = ["SMEs","Professional Services","Healthcare","Construction","Retail","Education","Hospitality","Non-Profits"];

const problems = [
  "IT keeps breaking",
  "Worried about cybersecurity",
  "Microsoft 365 needs managing",
  "Network/Wi-Fi problems",
  "Need a business application",
  "Current IT provider isn't delivering"
];

const caseStudies = [
  { title: "Microsoft 365 Migration", industry: "Professional Services", before: "Aging email infrastructure, frequent downtime, poor collaboration.", solution: "Microsoft 365 migration, identity configuration, security hardening and user rollout.", after: "Modern cloud environment, centralized administration, 99.9% uptime." },
  { title: "Network Upgrade", industry: "Construction", before: "6 Wi-Fi dead zones, unmanaged network, connection drops.", solution: "Network redesign, structured cabling, managed Wi-Fi and segmentation.", after: "Full-site coverage, segmented network, centralized monitoring, reduced support incidents." },
];

const faqs = [
  ["What does an MSP do for a business?","An MSP becomes your ongoing technology partner: monitoring systems, resolving issues, managing devices and cloud services, improving security and helping plan technology before it becomes a business problem."],
  ["How much does managed IT cost?","Plans start from R2,500/month for essentials. We assess your environment to recommend the right model—no surprises."],
  ["Do you support businesses outside Polokwane?","Yes. We provide remote support nationwide, with onsite capability across Limpopo and Gauteng."],
  ["Can you take over from another IT provider?","Yes. We make it easy—we audit your environment, ensure nothing breaks, and migrate you seamlessly."],
  ["Can you build software for an existing business?","Yes. We build portals, dashboards, integrations and internal systems tailored to your exact workflows."],
  ["Do you provide an SLA?","Yes. Priority support is available according to your service plan with defined response and resolution times."],
  ["Can you manage Microsoft 365 licensing?","Yes. We handle user administration, security configuration, licensing guidance and migrations."]
];

function App(){
  const [menuOpen,setMenuOpen]=useState(false);
  const [openFaq,setOpenFaq]=useState(0);
  const navRef=useRef(null);
  const menuBtnRef=useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const focusables = navRef.current?.querySelectorAll('a, button');
    focusables?.[0]?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") { setMenuOpen(false); menuBtnRef.current?.focus(); return; }
      if (e.key === "Tab" && focusables?.length) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target) && !menuBtnRef.current?.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const [heroBgFailed,setHeroBgFailed]=useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLowPower, setIsLowPower] = useState(false);
  const [form,setForm]=useState({name:"",email:"",phone:"",company:"",service:"",message:"",website:""}); // Removed employees, lookingFor
  const [status,setStatus]=useState("idle");

  // Mobile, Low Power, and Reduced Motion detection
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handleResize = () => setIsMobile(mq.matches);
    handleResize();
    mq.addEventListener('change', handleResize);

    const hc = navigator.hardwareConcurrency || 8;
    setIsLowPower(hc <= 4);
    
    return () => mq.removeEventListener('change', handleResize);
  }, []);

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const useStaticFallback = isMobile || isLowPower || heroBgFailed || prefersReducedMotion;

  const CONTACT_ENDPOINT = "https://formspree.io/f/mykvqdoj"; 

  const submit=async(e)=>{
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    
    if (form.website) { setStatus("sent"); return; } // Honeypot

    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
      setForm({name:"",email:"",phone:"",company:"",service:"",message:"",website:""});
    } catch (err) {
      setStatus("error");
    }
  };

  return <div className="app">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <header className="nav">
      <a href="#home" className="brand"><img src="/logo.png" alt="Cyber I.T Masters" onError={e=>e.currentTarget.style.display="none"}/><span><b>CYBER</b> I.T MASTERS<small>IT MSP · SOLUTIONS · SOFTWARE</small></span></a>
      <button ref={menuBtnRef} className="menu-btn" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen} aria-controls="primary-navigation">☰</button>
      <nav ref={navRef} id="primary-navigation" className={menuOpen?"nav-links open":"nav-links"}>
        {/* Updated Nav */}
        {["Services","Solutions","Pricing","Case Studies","Why Us","Contact"].map(x=><a key={x} href={`#${x.toLowerCase().replace(" ", "-")}`} onClick={()=>setMenuOpen(false)}>{x}</a>)}
        <a className="nav-cta" href="#contact">Get Assessment →</a>
      </nav>
    </header>

    <main id="main-content" tabIndex="-1">
      <section id="home" className="hero">
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {useStaticFallback ? <HeroBackgroundFallback /> : (
            <HeroBackgroundBoundary fallback={<HeroBackgroundFallback />}>
              <Suspense fallback={<HeroBackgroundFallback />}>
                <CursorRingField
                  density={150} // Reduced from 300 for performance
                  dotSize={120}
                  speed={6}
                  cameraDistance={160}
                  ring={{ radius: 12, width: 9, push: 50, turbulence: 100 }}
                  colors={["#7189ff", "#3074f9", "#00d9ff"]}
                  background="#04050a"
                />
              </Suspense>
            </HeroBackgroundBoundary>
          )}
        </div>

        <div className="hero-grid" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-copy">
            <div className="eyebrow"><span className="pulse"></span> POLOKWANE · LIMPOPO · SOUTH AFRICA</div>
            <StrokeText
              text="IT THAT WORKS. SOLUTIONS THAT SCALE."
              strokeColor="#00d9ff" 
              fillColor="#ffffff"
              strokeWidth={1.5}
              drawDuration={1.8}
              fillDelay={0.3}
              stagger={0.05}
              ease="power3.out"
              trigger="mount"
              fillMode="wipe"
              fontSize={120}
              fontWeight={900}
              letterSpacing={-2}
            />
            {/* Updated Hero Copy */}
            <p className="hero-lead">IT support, cybersecurity and software for businesses that can't afford technology problems.<br/><br/>Polokwane-based. Nationwide remote support. Enterprise-grade capability without enterprise complexity.</p>
            <div className="hero-actions"><a className="btn primary" href="#contact">Book a Technology Assessment</a><a className="btn ghost" href="#services">Explore Services ↓</a></div>
            <div className="trust-row"><span>✓ Local Support</span><span>✓ Security-first</span><span>✓ One technology partner</span></div>
          </div>
          <div className="hero-panel">
            <div className="panel-top"><span>CYBER I.T / OPERATIONS</span><i>LIVE</i></div>
            <div className="panel-status"><span className="status-dot"></span><b>System Status</b><span>Protected</span></div>
            <div className="signal"><div><strong>NET</strong><small>ONLINE</small></div><div><strong>SEC</strong><small>ACTIVE</small></div><div><strong>DEV</strong><small>READY</small></div></div>
            <div className="panel-lines"><span>Microsoft 365</span><b>Healthy</b><span>Backups</span><b>Verified</b><span>Endpoints</span><b>Monitored</b></div>
            <div className="panel-footer">ONE PARTNER · MULTIPLE TECHNOLOGY DISCIPLINES</div>
          </div>
        </div>
      </section>

      {/* NEW: Problems Section */}
      <section id="solutions" className="section dark-section problems-section">
        <div className="section-head"><div><div className="eyebrow">01 / PROBLEMS</div><h2>What are you trying to <em>fix?</em></h2></div><p>Tell us what's going wrong. We know how to fix it.</p></div>
        <div className="problems-grid">
          {problems.map(p => (
            <div key={p} className="problem-card">⚠️ {p}</div>
          ))}
        </div>
        <div className="takeover-banner">
          <div><strong>Unhappy with your current IT provider?</strong><br/>We'll audit your environment, document what matters, identify risks and transition you without disrupting your business.</div>
          <a className="btn primary" href="#contact">Switch your IT provider →</a>
        </div>
      </section>

      {/* Why Us Section */}
      <section id="why-us" className="section">
        <div className="section-head"><div><div className="eyebrow">02 / WHY US</div><h2>Technology shouldn't be <em>another problem</em> to manage.</h2></div><p>Local support with the capability of a much larger IT operation.</p></div>
        <div className="why-grid">
          {[["Local","Polokwane-based support with onsite capability."],["Proactive","We identify problems before they become downtime."],["Security-first","Security is built into the way we manage technology."],["One Partner","IT support, infrastructure, cloud and software under one roof."],["Business-focused","We care about your workflows and outcomes—not just hardware."]].map(([t, d]) => (
            <div key={t} className="why-card"><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section dark-section pricing-section">
        <div className="section-head"><div><div className="eyebrow">03 / PRICING</div><h2>Managed IT <em>Plans</em>.</h2></div><p>Not sure which fits? We'll assess your environment and recommend the right model.</p></div>
        <div className="price-grid">
          {[["ESSENTIALS","From R2,500/month","For businesses that need reliable IT without employing a full-time IT team.", ["Remote support", "Microsoft 365 management", "Backup monitoring", "Endpoint management", "Basic security"], "See if this plan fits →"],
            ["BUSINESS","From R5,500/month","For growing businesses needing managed infrastructure and security.", ["Everything in Essentials", "Advanced cybersecurity", "Priority SLA"], "See if this plan fits →"],
            ["ENTERPRISE","Custom","For complex environments and larger organisations.", ["Dedicated engineer", "Custom SLAs", "Full stack"], "See if this plan fits →"]
          ].map(([name, price, desc, features, cta]) => (
            <div key={name} className="price-card">
              <h3>{name}</h3>
              <div className="price-tag">{price}</div>
              <p>{desc}</p>
              <ul>{features.map(f => <li key={f}>✓ {f}</li>)}</ul>
              <a className="btn ghost" href="#contact">{cta}</a>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className="section">
        <div className="section-head"><div><div className="eyebrow">04 / CORE SERVICES</div><h2>THE TECHNOLOGY<br/><em>STACK BEHIND</em> YOUR BUSINESS.</h2></div><p>From everyday IT operations to new digital products, we bring infrastructure, security and software engineering into one accountable service.</p></div>
        <div className="service-grid">{services.map(s=><article className="service-card" key={s.title}><div className="service-icon">{s.icon}</div><div className="service-tag">{s.tag}</div><h3>{s.title}</h3><p>{s.text}</p><a href="#contact">Discuss this service →</a></article>)}</div>
      </section>

      <section id="solutions-block" className="section dark-section">
        <div className="section-head"><div><div className="eyebrow">05 / SOLUTIONS</div><h2>BUILD A <em>STRONGER</em><br/>TECHNOLOGY FOUNDATION.</h2></div><p>Technology should be secure, maintainable and aligned to the way your organisation actually operates.</p></div>
        <div className="cap-grid">{capabilities.map((c,i)=><div key={c}><span>{String(i+1).padStart(2,"0")}</span><b>{c}</b></div>)}</div>
      </section>

      <section id="software" className="section">
        <div className="devops-grid">
          <div><div className="eyebrow">06 / SOFTWARE & DEVOPS</div><h2>FROM <em>IDEA</em> TO<br/>PRODUCTION.</h2><p className="large-copy">Need a client portal? Internal system? Business dashboard? Integration? We handle the architecture, development, deployment and ongoing support.</p><a className="btn primary" href="#contact">Discuss a Software Project →</a></div>
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
      </section>

      {/* Case Studies Section */}
      <section id="case-studies" className="section dark-section">
        <div className="section-head"><div><div className="eyebrow">07 / PROOF</div><h2>Technology that delivers <em>outcomes</em>.</h2></div><p>Real projects for real businesses.</p></div>
        <div className="case-grid">
          {caseStudies.map(cs => (
            <div key={cs.title} className="case-card">
              <div className="case-tag">{cs.industry}</div>
              <h3>{cs.title}</h3>
              <div className="case-row before"><strong>Before:</strong> {cs.before}</div>
              <div className="case-row"><strong>Solution:</strong> {cs.solution}</div>
              <div className="case-row result"><strong>After:</strong> {cs.after}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="industries" className="section industry-section">
        <div className="eyebrow">08 / INDUSTRIES</div>
        <h2>TECHNOLOGY FOR<br/><em>REAL OPERATIONS.</em></h2>
        <p className="section-sub">Built for businesses with 5–200+ employees that need technology to simply work. Particularly suited to professional services, construction, healthcare, retail, education and growing SMEs.</p>
        <div className="industry-grid">{industries.map((x,i)=><div key={x}><span>0{i+1}</span><b>{x}</b><small>Technology support & solutions</small></div>)}</div>
      </section>

      <section id="contact" className="section contact-section">
        <div className="contact-grid">
          <div><div className="eyebrow">09 / START HERE</div><h2>LET'S FIX<br/><em>YOUR IT.</em></h2><p className="large-copy">Tell us what you are trying to improve, build or protect. We will route the enquiry to the right technology discipline.</p><div className="contact-details"><a href="tel:+27726650565">072 665 0565</a><a href="mailto:info@mbulahenigroup.co.za">info@mbulahenigroup.co.za</a><span>Polokwane · Limpopo · South Africa</span></div></div>
          <form name="contact" onSubmit={submit} className="contact-form" noValidate>
            <label>Name<input name="name" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
            <label>Company<input name="company" value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/></label>
            <label>Email<input name="email" required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
            <label>Phone / WhatsApp<input name="phone" required type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
            <label className="full">What can we help with?<select name="service" required value={form.service} onChange={e=>setForm({...form,service:e.target.value})}><option value="">Select a service</option><option>Managed IT Services</option><option>Cybersecurity</option><option>Infrastructure / Network</option><option>Microsoft 365</option><option>Software / Website</option><option>DevOps</option></select></label>
            <label className="full">Message<textarea name="message" required minLength="10" rows="4" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></label>
            <label className="hp-field" aria-hidden="true">Leave this field empty<input name="website" tabIndex="-1" autoComplete="off" value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></label>
            <button className="btn primary full" type="submit" disabled={status==="sending"}>{status==="sending" ? "Sending…" : status==="sent" ? "Enquiry sent ✓" : "Send Technology Enquiry →"}</button>
            <div className={`form-status${status==="error"?" error":""}`} role="status" aria-live="polite">{status==="sent" && "Thanks — we'll be in touch shortly."}{status==="error" && "Something went wrong. Please try again or call us."}</div>
          </form>
        </div>
      </section>

      <section id="faq" className="section faq-section">
        <div className="eyebrow">10 / FAQ</div><h2>QUESTIONS, <em>ANSWERED.</em></h2>
        <div className="faq-list">{faqs.map(([q,a],i)=><div className={openFaq===i?"faq open":"faq"} key={q}><button onClick={()=>setOpenFaq(openFaq===i?-1:i)} aria-expanded={openFaq===i} aria-controls={`faq-${i}`}>{q}<span>+</span></button><div id={`faq-${i}`} className="faq-answer"><div className="faq-answer-inner">{a}</div></div></div>)}</div>
      </section>
    </main>

    <footer><div className="footer-brand">CYBER <em>I.T</em> MASTERS<small>MANAGED IT · SECURITY · CLOUD · SOFTWARE</small></div><div className="footer-links"><a href="#services">Services</a><a href="#solutions">Solutions</a><a href="#software">Software</a><a href="#contact">Contact</a></div><span>© {new Date().getFullYear()} Cyber I.T Masters · Mbulaheni Group</span></footer>
    
    <a href="https://wa.me/27726650565" target="_blank" rel="noreferrer" className="wa-float" aria-label="Chat on WhatsApp">
      <svg viewBox="0 0 32 32" fill="currentColor" width="30" height="30"><path d="M16.004 0h-.008C7.174 0 0 7.174 0 16c0 2.823.739 5.465 2.032 7.756L0 32l8.387-2.05A15.93 15.93 0 0 0 16.004 32C24.826 32 32 24.826 32 16S24.826 0 16.004 0zm9.322 22.621c-.383 1.077-2.224 2.063-3.087 2.126-.831.061-1.878.087-3.03-.188-1.075-.254-2.456-.803-4.23-1.59-3.531-1.567-5.905-5.221-6.085-5.459-.18-.238-1.452-2.058-1.452-3.926 0-1.868.973-2.781 1.324-3.166.351-.385.765-.483 1.024-.483.259 0 .517.005.743.012.239.007.561-.092.877.672.328.792 1.109 2.736 1.207 2.94.099.202.165.429.033.694-.131.265-.197.428-.394.659-.197.231-.413.515-.59.69-.196.197-.4.411-.171.805.229.393 1.019 1.678 2.186 2.719 1.502 1.339 2.766 1.754 3.15 1.953.384.198.606.166.829-.099.223-.264.957-1.115 1.212-1.5.254-.385.508-.32.857-.192.348.129 2.191 1.035 2.568 1.223.377.188.627.282.719.439.093.157.093.91-.29 1.988z"/></svg>
    </a>
  </div>;
}
export default App;
