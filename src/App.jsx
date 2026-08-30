import React, { useState, useEffect, useRef, Suspense } from "react";
import HeroBackgroundBoundary from "./components/HeroBackgroundBoundary";
import CursorRingField from "./components/CursorRingField";
import StrokeText from "./components/StrokeText";

// Shown while WebGL/animation isn't available (reduced-motion, no WebGL support, GPU context loss), or if it throws.
function HeroBackgroundFallback() {
  return <div className="hero-bg-fallback" aria-hidden="true" />;
}

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

    const focusables = navRef.current?.querySelectorAll('a, button');
    focusables?.[0]?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
        return;
      }
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

  const [heroBgFailed,setHeroBgFailed]=useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [form,setForm]=useState({name:"",email:"",company:"",service:"",message:"",website:""});
  const [status,setStatus]=useState("idle");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const CONTACT_ENDPOINT = "https://formspree.io/f/mykvqdoj"; 

  const submit=async(e)=>{
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
          {heroBgFailed || isMobile ? <HeroBackgroundFallback /> : (
            <HeroBackgroundBoundary fallback={<HeroBackgroundFallback />}>
              <Suspense fallback={<HeroBackgroundFallback />}>
                <CursorRingField
                  density={300}
                  dotSize={120}
                  speed={6}
                  cameraDistance={160}
                  ring={{ radius: 12, width: 9, push: 50, turbulence: 100 }}
                  colors={["#7189ff", "#3074f9", "#00d9ff"]} // Blue/Purple/Cyan
                  background="#04050a"
                />
              </Suspense>
            </HeroBackgroundBoundary>
          )}
        </div>

        <div className="hero-grid" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-copy">
            <div className="eyebrow"><span className="pulse"></span> TECHNOLOGY PARTNER · POLOKWANE · SOUTH AFRICA</div>
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

      <section className="metrics">
        <div><b>01</b><span>MANAGED IT</span><small>Proactive support & monitoring</small></div>
        <div><b>02</b><span>IT SOLUTIONS</span><small>Infrastructure & cloud</small></div>
        <div><b>03</b><span>SOFTWARE</span><small>Web & application delivery</small></div>
        <div><b>04</b><span>DEVOPS</span><small>Automation & deployment</small></div>
      </section>

      {/* The rest of your file remains EXACTLY the same */}
      <section id="services" className="section">
        {/* ... Keep your existing services, solutions, devops, industries, process, contact, faq code here ... */}
      </section>
</main>
      <footer>
        {/* ... Keep your existing footer here ... */}
      </footer>
      
      {/* Floating WhatsApp Chat */}
      <a href="https://wa.me/27726650565" target="_blank" rel="noreferrer" className="wa-float" aria-label="Chat on WhatsApp">
        <svg viewBox="0 0 32 32" fill="currentColor" width="30" height="30">
          <path d="M16.004 0h-.008C7.174 0 0 7.174 0 16c0 2.823.739 5.465 2.032 7.756L0 32l8.387-2.05A15.93 15.93 0 0 0 16.004 32C24.826 32 32 24.826 32 16S24.826 0 16.004 0zm9.322 22.621c-.383 1.077-2.224 2.063-3.087 2.126-.831.061-1.878.087-3.03-.188-1.075-.254-2.456-.803-4.23-1.59-3.531-1.567-5.905-5.221-6.085-5.459-.18-.238-1.452-2.058-1.452-3.926 0-1.868.973-2.781 1.324-3.166.351-.385.765-.483 1.024-.483.259 0 .517.005.743.012.239.007.561-.092.877.672.328.792 1.109 2.736 1.207 2.94.099.202.165.429.033.694-.131.265-.197.428-.394.659-.197.231-.413.515-.59.69-.196.197-.4.411-.171.805.229.393 1.019 1.678 2.186 2.719 1.502 1.339 2.766 1.754 3.15 1.953.384.198.606.166.829-.099.223-.264.957-1.115 1.212-1.5.254-.385.508-.32.857-.192.348.129 2.191 1.035 2.568 1.223.377.188.627.282.719.439.093.157.093.91-.29 1.988z"/>
        </svg>
      </a>
    </div>;
}
export default App;
