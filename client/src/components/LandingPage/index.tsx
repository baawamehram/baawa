import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Player } from "@remotion/player";
import { motion } from "framer-motion";
import { HeroComposition } from "../../remotion/HeroVideo";
import { LogoDark } from "../Logo";
import { ProblemSection } from "./ProblemSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { ScrollLatticeBackground } from "./ScrollLatticeBackground";
import { easingConfig } from "../../lib/animationEasing";

interface Props {
  onStart: () => void;
}

// Preserved: IdentityTypewriter
function IdentityTypewriter() {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [speed, setSpeed] = useState(70);

  const IDENTITY_ITEMS = [
    { text: "Entrepreneurs", color: "#059669" },
    { text: "Filmmakers", color: "#059669" },
    { text: "Investment Bankers", color: "#059669" },
    { text: "Consultants", color: "#059669" },
    { text: "Agency Owners", color: "#059669" },
    { text: "AI Engineers", color: "#059669" },
    { text: "Brand Strategists", color: "#059669" },
    { text: "Behavioral Architects", color: "#059669" },
    { text: "Geeks who obsess over business", color: "#059669" },
  ];

  const currentItem = IDENTITY_ITEMS[index % IDENTITY_ITEMS.length];

  useEffect(() => {
    let timer: number;
    const word = currentItem.text;
    if (!isDeleting && text === word) {
      timer = window.setTimeout(() => setIsDeleting(true), 1800);
    } else if (isDeleting && text === "") {
      setIsDeleting(false);
      setIndex((prev) => prev + 1);
      setSpeed(70);
    } else {
      timer = window.setTimeout(() => {
        setText(word.substring(0, text.length + (isDeleting ? -1 : 1)));
        setSpeed(isDeleting ? 30 : 70);
      }, speed);
    }
    return () => clearTimeout(timer);
  }, [text, isDeleting, index, speed]);

  return (
    <div className="text-center py-2">
      <span style={{ color: currentItem.color, fontSize: "24px", fontWeight: "600" }}>
        {text}
        <span className="animate-pulse">_</span>
      </span>
    </div>
  );
}

// Preserved: LoginMenu
function LoginMenu() {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_email");
    setIsLoggedIn(false);
    setOpen(false);
    navigate("/");
  };

  const handlePortalAccess = () => {
    navigate("/portal");
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 text-sm font-medium text-saturn-white hover:text-saturn-emerald-light transition"
      >
        {isLoggedIn ? "Portal" : "Login"}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-saturn-gray rounded-lg shadow-lg z-50">
          {isLoggedIn ? (
            <>
              <button
                onClick={handlePortalAccess}
                className="block w-full text-left px-4 py-2 text-saturn-white hover:bg-saturn-charcoal transition"
              >
                View Portal
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-saturn-white hover:bg-saturn-charcoal transition border-t border-saturn-muted"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                navigate("/portal");
                setOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-saturn-white hover:bg-saturn-charcoal transition"
            >
              Login to Portal
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// New: CTA Button with Framer Motion animations
const CTAButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({
  onClick,
  children,
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    transition={easingConfig.buttonSpring}
    className="px-8 py-3 bg-saturn-emerald-light text-saturn-charcoal font-semibold rounded hover:bg-saturn-emerald-mid transition"
  >
    {children}
  </motion.button>
);

export function LandingPage({ onStart }: Props) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Refs for scroll detection
  const heroRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const whoItForRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-saturn-charcoal text-saturn-white">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 bg-saturn-charcoal/95 backdrop-blur z-40 border-b border-saturn-gray">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <LogoDark height={32} />
            <span className="hidden md:inline text-sm text-saturn-muted">
              The Digital Tailors
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <CTAButton onClick={onStart}>Take the diagnostic</CTAButton>
            <LoginMenu />
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-saturn-white"
          >
            ☰
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-saturn-gray border-t border-saturn-muted p-4 flex flex-col gap-4">
            <CTAButton onClick={() => { onStart(); setIsMobileMenuOpen(false); }}>
              Take the diagnostic
            </CTAButton>
            <LoginMenu />
          </div>
        )}
      </nav>

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative h-screen flex flex-col items-center justify-center overflow-hidden pt-20"
      >
        {/* Remotion video background */}
        <div className="absolute inset-0 w-full h-full">
          <Player
            component={HeroComposition}
            durationInFrames={450}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{
              width: "100%",
              height: "100%",
            }}
            loop
            autoPlay
            controls={false}
          />
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-saturn-charcoal/50 via-saturn-charcoal/30 to-saturn-charcoal/60" />

        {/* Hero content */}
        <div className="relative z-20 text-center px-4 max-w-4xl">
          <h1
            className="text-6xl md:text-7xl font-bold mb-6 leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Bespoke AI systems. Built for your business. Owned by you forever.
          </h1>
          <p className="text-lg md:text-xl text-saturn-muted mb-8 max-w-2xl mx-auto">
            We measure, we build, we stitch — and we stay. As you grow, we adjust the fit.
          </p>
          <CTAButton onClick={onStart}>Start your free diagnostic</CTAButton>
        </div>
      </section>

      {/* PROOF BAR - Replaced with single line */}
      <div className="bg-saturn-charcoal border-y border-saturn-gray py-4">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-saturn-emerald-light">Custom built · You own everything · We grow with you</p>
        </div>
      </div>

      {/* PROBLEM SECTION */}
      <ProblemSection ref={problemRef} />

      {/* IDENTITY TYPEWRITER SECTION */}
      <section className="py-16 px-6 bg-saturn-gray">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-saturn-emerald-light mb-4 tracking-widest">WHO WE WORK WITH</p>
          <IdentityTypewriter />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <HowItWorksSection ref={howItWorksRef} />

      {/* WHO WE WORK WITH - New Section */}
      <section className="py-20 px-6 bg-saturn-charcoal relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-5xl md:text-6xl font-bold text-center mb-16"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Who We Work With
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Card 1: Genesis */}
            <div className="bg-saturn-gray p-8 rounded">
              <h3 className="text-2xl font-semibold mb-4">Genesis</h3>
              <p className="text-lg text-saturn-gray mb-2 font-semibold">New & Early-Stage Founders</p>
              <p className="text-saturn-muted">
                You're launching. We build your entire operational backbone — marketing, sales, operations — from day one. All connected. All yours.
              </p>
            </div>

            {/* Card 2: Archaeology */}
            <div className="bg-saturn-gray p-8 rounded">
              <h3 className="text-2xl font-semibold mb-4">Archaeology</h3>
              <p className="text-lg text-saturn-gray mb-2 font-semibold">Established Businesses</p>
              <p className="text-saturn-muted">
                You've been running for years. Your data is sitting dead. We excavate it, structure it, and turn it into your most valuable business asset.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section ref={whoItForRef} className="py-20 px-6 bg-saturn-charcoal relative overflow-hidden">
        <ScrollLatticeBackground state="whoItFor" className="opacity-40" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2
            className="text-5xl md:text-6xl font-bold mb-8"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            You launched. You're moving. But you're drowning in decisions that shouldn't be yours to make.
          </h2>
          <p className="text-xl text-saturn-muted">
            We take the chaos and systematize it. Build it for you. Train you. Then get out of the way so you can focus on your business.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-6 bg-saturn-gray flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl">
          <h2
            className="text-5xl md:text-6xl font-bold mb-6"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Ready for something made for you?
          </h2>
          <p className="text-xl text-saturn-muted mb-8">
            No templates. No off-the-shelf. A system built around your business — and a partner who stays as you grow.
          </p>
          <CTAButton onClick={onStart}>Start your free diagnostic</CTAButton>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 bg-saturn-charcoal border-t border-saturn-muted/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <LogoDark height={24} />
          <p className="text-sm text-saturn-muted">
            © {new Date().getFullYear()} Baawa — The Digital Tailors
          </p>
        </div>
      </footer>
    </div>
  );
}
