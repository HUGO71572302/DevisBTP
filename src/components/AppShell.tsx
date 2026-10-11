"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { DEV } from "@/lib/seed";
import { AuthUser } from "@/lib/types";
import { AuthScreen } from "./AuthScreen";
import { Confetti } from "./ui";

const TABS = [
  { href: "/", label: "Devis", icon: "📝" },
  { href: "/catalogue", label: "Catalogue", icon: "📦" },
  { href: "/historique", label: "Historique", icon: "🗂️" },
  { href: "/parametres", label: "Réglages", icon: "⚙️" },
];
const USER_KEY = "devis_user";

function TabBar() {
  const path = usePathname();
  const idx = Math.max(0, TABS.findIndex((t) => (t.href === "/" ? path === "/" : path.startsWith(t.href))));
  return (
    <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)]">
      <div className="relative mx-auto max-w-2xl grid grid-cols-4 rounded-3xl bg-nuit-900/95 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_-10px_rgba(5,15,36,0.7)] p-1.5">
        <span
          className="absolute top-1.5 bottom-1.5 rounded-2xl bg-gradient-to-br from-or-400 to-or-600 shadow-lg transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1.2)]"
          style={{ left: `calc(${idx * 25}% + 6px)`, width: "calc(25% - 12px)" }}
        />
        {TABS.map((t, i) => {
          const active = i === idx;
          return (
            <Link key={t.href} href={t.href} className={`relative flex flex-col items-center justify-center min-h-[58px] text-[13px] font-bold transition-colors ${active ? "text-nuit-950" : "text-blue-100/70"}`}>
              <span key={active ? "a" + path : "i"} className={`text-[22px] leading-none mb-1 ${active ? "anim-pop" : "grayscale opacity-80"}`}>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Sidebar() {
  const path = usePathname();
  const { user, settings, quotes } = useStore();
  const idx = Math.max(0, TABS.findIndex((t) => (t.href === "/" ? path === "/" : path.startsWith(t.href))));
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <aside className="no-print hidden lg:flex fixed inset-y-0 left-0 z-40 w-72 flex-col overflow-hidden bg-nuit-950 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.12]" />
      <div className="absolute -left-20 top-40 h-64 w-64 rounded-full bg-roi-500/25 blur-3xl" />
      <div className="absolute -right-24 bottom-24 h-64 w-64 rounded-full bg-or-500/15 blur-3xl" />
      <div className="relative flex items-center gap-3 px-6 pt-7">
        <span className="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-or-400 to-or-600 text-2xl shadow-lg">🏗️</span>
        <div>
          <div className="text-xl font-black leading-none">Devis <span className="text-gradient-gold">BTP</span></div>
          <div className="text-xs text-blue-100/60 mt-1">Maçonnerie · Carrelage</div>
        </div>
      </div>
      <nav className="relative mt-8 px-4 space-y-1.5">
        {TABS.map((t, i) => {
          const active = i === idx;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 font-bold transition ${active ? "bg-gradient-to-r from-or-400 to-or-600 text-nuit-950 shadow-lg" : "text-blue-100/75 hover:bg-white/10 hover:text-white"}`}
            >
              <span className={`text-xl transition group-hover:scale-110 ${active ? "" : "grayscale"}`}>{t.icon}</span>
              {t.label}
              {t.href === "/historique" && <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${active ? "bg-nuit-950/15" : "bg-white/10"}`}>{quotes.length}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="relative mt-auto p-4 space-y-3">
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/10 p-3 backdrop-blur">
          <span className="grid place-items-center h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-or-400 to-or-600 font-black text-nuit-950">{initials}</span>
          <div className="min-w-0">
            <div className="font-bold truncate">{user.name}</div>
            <div className="text-xs text-blue-100/60 truncate">{settings.name}</div>
          </div>
        </div>
        <p className="text-[11px] leading-snug text-blue-100/50 text-center">
          Conçu par <b className="text-blue-100/80">{DEV.name}</b> · {DEV.title}
          <br />
          {DEV.phones.join(" / ")}
        </p>
      </div>
    </aside>
  );
}

function Splash() {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-nuit-900 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 anim-kenburns" />
      <div className="relative text-center">
        <div className="mx-auto grid place-items-center h-24 w-24 rounded-3xl bg-gradient-to-br from-or-400 to-or-600 shadow-2xl text-5xl" style={{ animation: "splashTrowel 0.8s cubic-bezier(.2,.8,.2,1) both" }}>🏗️</div>
        <div className="mt-5 text-3xl font-black tracking-tight anim-fade-up" style={{ animationDelay: ".2s" }}>
          Devis <span className="text-gradient-gold">BTP</span>
        </div>
        <div className="mt-1 text-blue-100/80 anim-fade-up" style={{ animationDelay: ".35s" }}>Maçonnerie · Carrelage · Togo</div>
        <div className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
          <div className="h-full bg-gradient-to-r from-or-400 to-or-600 anim-bar" style={{ animationDuration: "0.9s" }} />
        </div>
      </div>
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+28px)] inset-x-0 text-center anim-fade-up" style={{ animationDelay: ".5s" }}>
        <div className="text-[11px] tracking-[0.25em] text-or-400 font-bold">CONÇU PAR</div>
        <div className="font-black">{DEV.name}</div>
        <div className="text-xs text-blue-100/70">{DEV.title} · {DEV.phones.join(" / ")}</div>
      </div>
    </div>
  );
}

function Welcome({ onDone }: { onDone: () => void }) {
  const { user } = useStore();
  const router = useRouter();
  const steps = [
    { icon: "⚙️", t: "Vérifiez vos informations", d: "Logo, slogan, téléphone… dans Réglages." },
    { icon: "✍️", t: "Signez avec le doigt", d: "Votre signature et votre cachet apparaîtront sur chaque PDF." },
    { icon: "📝", t: "Créez votre premier devis", d: "Un devis d'exemple est déjà prêt pour essayer." },
  ];
  return (
    <div className="sheet-backdrop fixed inset-0 z-[80] overflow-y-auto bg-nuit-950/80 backdrop-blur">
      <div className="min-h-full grid place-items-center p-4 py-[calc(env(safe-area-inset-top)+16px)]">
      <div className="anim-pop w-full max-w-md rounded-[2rem] bg-white p-5 text-center shadow-2xl">
        <div className="text-5xl anim-float">🎉</div>
        <h2 className="mt-2 text-2xl font-black text-nuit-900">Bienvenue, {user.name.split(" ")[0]} !</h2>
        <p className="text-slate-500">Votre compte est prêt. Vos données sont à vous seul.</p>
        <div className="mt-5 space-y-2.5 text-left stagger">
          {steps.map((s) => (
            <div key={s.t} className="flex items-center gap-3 rounded-2xl bg-sable-50 p-3">
              <span className="grid place-items-center h-11 w-11 shrink-0 rounded-xl bg-or-100 text-2xl">{s.icon}</span>
              <div>
                <div className="font-black text-nuit-900">{s.t}</div>
                <div className="text-sm text-slate-500">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          className="btn-gold shine w-full mt-5"
          onClick={() => {
            onDone();
            router.push("/parametres");
          }}
        >
          ⚙️ Compléter mes informations
        </button>
        <button className="mt-2 w-full min-h-[48px] font-bold text-nuit-700" onClick={onDone}>Plus tard</button>
      </div>
      </div>
    </div>
  );
}

function LegacyPrompt() {
  const { legacyCount, importLegacy } = useStore();
  if (!legacyCount) return null;
  return (
    <div className="sheet-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-nuit-950/70 backdrop-blur-sm">
      <div className="sheet-panel w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-t-[2rem] bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="text-5xl text-center">📲</div>
        <h2 className="mt-2 text-xl font-black text-nuit-900 text-center">Des devis existent déjà sur ce téléphone</h2>
        <p className="mt-1 text-slate-600 text-center">Voulez-vous les ajouter à votre compte (devis, catalogue et paramètres) ?</p>
        <div className="mt-5 grid gap-2">
          <button className="btn-gold" onClick={() => importLegacy(true)}>✓ Oui, les ajouter à mon compte</button>
          <button className="btn-secondary" onClick={() => importLegacy(false)}>Non, ignorer</button>
        </div>
      </div>
    </div>
  );
}

function Ready({ children }: { children: ReactNode }) {
  const { ready } = useStore();
  if (!ready) return <Splash />;
  return <>{children}</>;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [splash, setSplash] = useState(true);
  const [welcome, setWelcome] = useState(false);
  const [party, setParty] = useState(0);

  useEffect(() => {
    let cached: AuthUser | null = null;
    try {
      cached = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      cached = null;
    }
    if (cached) setUser(cached);
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          localStorage.removeItem(USER_KEY);
          setUser(null);
          return;
        }
        if (!r.ok) throw new Error();
        const { user: u } = await r.json();
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        setUser(u);
      })
      .catch(() => setUser(cached ?? null)); // hors ligne : on garde le compte mémorisé

    const seen = sessionStorage.getItem("splash_seen");
    const id = setTimeout(() => {
      setSplash(false);
      sessionStorage.setItem("splash_seen", "1");
    }, seen ? 0 : 1100);

    if ("serviceWorker" in navigator) {
      const sendUrls = (reg: ServiceWorkerRegistration) => {
        const urls = [location.href, ...performance.getEntriesByType("resource").map((e) => e.name)];
        (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: "CACHE_URLS", urls });
      };
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          sendUrls(reg);
          setTimeout(() => sendUrls(reg), 4000);
        })
        .catch(() => {});
    }
    return () => clearTimeout(id);
  }, []);

  const signedOut = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  if (splash || user === undefined) return <Splash />;

  if (!user) {
    return (
      <AuthScreen
        onAuthed={(u, isNew) => {
          localStorage.setItem(USER_KEY, JSON.stringify(u));
          setUser(u);
          if (isNew) setWelcome(true);
          else setParty((x) => x + 1);
        }}
      />
    );
  }

  return (
    <StoreProvider key={user.id} user={user} onSignedOut={signedOut}>
      <Ready>
        <Sidebar />
        <div className="min-h-dvh pb-32 lg:pb-12 lg:pl-72">{children}</div>
        <TabBar />
        {welcome ? <Welcome onDone={() => setWelcome(false)} /> : <LegacyPrompt />}
        <Confetti fire={party} />
      </Ready>
    </StoreProvider>
  );
}
