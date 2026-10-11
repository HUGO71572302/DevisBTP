"use client";

import { FormEvent, useState } from "react";
import { DEV } from "@/lib/seed";
import { AuthUser } from "@/lib/types";
import { DevCredit } from "./DevCredit";
import { Confetti } from "./ui";

type Mode = "login" | "register";

function strength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 9) s++;
  if (/\d/.test(pw) && /[a-zA-Z]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw) || /[A-Z]/.test(pw)) s++;
  const labels = ["Trop court", "Faible", "Correct", "Bon", "Excellent"];
  const colors = ["#ef4444", "#f97316", "#f0a81c", "#22c55e", "#16a34a"];
  return { score: s, label: labels[s], color: colors[s] };
}

function PwInput({ value, onChange, placeholder, error, autoComplete }: { value: string; onChange: (v: string) => void; placeholder: string; error?: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className={`input pr-16 ${error ? "input-error" : ""}`}
        type={show ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xl active:scale-90 transition" aria-label={show ? "Masquer" : "Afficher"}>
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

export function AuthScreen({ onAuthed }: { onAuthed: (u: AuthUser, isNew: boolean) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [f, setF] = useState({ name: "", company: "", city: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [party, setParty] = useState(0);
  const set = (k: keyof typeof f, v: string) => {
    setF({ ...f, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: "" });
  };
  const st = strength(f.password);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const errs: Record<string, string> = {};
    const digits = f.phone.replace(/\D/g, "");
    if (digits.length < 8) errs.phone = "Numéro à 8 chiffres";
    if (f.password.length < 6) errs.password = "6 caractères minimum";
    if (mode === "register" && f.name.trim().length < 2) errs.name = "Indiquez votre nom";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (!navigator.onLine) {
      setMsg("Pas d'internet : la connexion au compte nécessite internet la première fois.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { phone: f.phone, password: f.password } : f),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Erreur, réessayez");
        if (data.errors) setErrors(data.errors);
        return;
      }
      if (mode === "register") {
        setParty((x) => x + 1);
        setTimeout(() => onAuthed(data.user, true), 900);
      } else onAuthed(data.user, false);
    } catch {
      setMsg("Impossible de joindre le serveur. Vérifiez internet.");
    } finally {
      setBusy(false);
    }
  };

  const err = (k: string) => (errors[k] ? <span className="mt-1 block text-sm font-bold text-red-300 anim-fade-up">⚠ {errors[k]}</span> : null);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-nuit-950 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 anim-kenburns" />
      <div className="absolute inset-0 bg-gradient-to-b from-nuit-950/60 via-nuit-900/80 to-nuit-950" />
      <div className="absolute -left-20 top-24 h-64 w-64 rounded-full bg-roi-500/30 blur-3xl" />
      <div className="absolute -right-20 bottom-40 h-64 w-64 rounded-full bg-or-500/25 blur-3xl" />

      <div className="relative mx-auto max-w-md px-5 pt-[calc(env(safe-area-inset-top)+36px)] pb-10">
        <div className="text-center anim-fade-up">
          <div className="mx-auto grid place-items-center h-20 w-20 rounded-3xl bg-gradient-to-br from-or-400 to-or-600 text-4xl shadow-2xl" style={{ animation: "splashTrowel .8s cubic-bezier(.2,.8,.2,1) both" }}>
            🏗️
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight">
            Devis <span className="text-gradient-gold">BTP</span>
          </h1>
          <p className="mt-1 text-blue-100/80">Vos devis de chantier, partout avec vous.</p>
        </div>

        <div className="mt-7 rounded-[2rem] bg-white/10 backdrop-blur-2xl border border-white/15 p-5 shadow-2xl anim-fade-up" style={{ animationDelay: ".1s" }}>
          {/* Onglets */}
          <div className="relative grid grid-cols-2 rounded-2xl bg-nuit-950/50 p-1">
            <span className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-br from-or-400 to-or-600 transition-all duration-500 ease-[cubic-bezier(.2,.9,.2,1.2)]" style={{ left: mode === "login" ? 4 : "calc(50%)" }} />
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setErrors({});
                  setMsg(null);
                  setForgot(false);
                }}
                className={`relative min-h-[50px] font-black transition-colors ${mode === m ? "text-nuit-950" : "text-blue-100/80"}`}
              >
                {m === "login" ? "Se connecter" : "Créer un compte"}
              </button>
            ))}
          </div>

          <form key={mode} onSubmit={submit} className="mt-5 space-y-4 stagger" noValidate>
            {mode === "register" && (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-or-400">Votre nom complet</span>
                  <input className={`input ${errors.name ? "input-error" : ""}`} value={f.name} autoComplete="name" placeholder="Ex : Koffi MENSAH" onChange={(e) => set("name", e.target.value)} />
                  {err("name")}
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-or-400">Nom de l&apos;entreprise</span>
                  <input className="input" value={f.company} autoComplete="organization" placeholder="Ex : Ma. Mo. Co. B" onChange={(e) => set("company", e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-or-400">Ville</span>
                  <input className="input" value={f.city} placeholder="Ex : Kara, Lomé, Sokodé…" onChange={(e) => set("city", e.target.value)} />
                </label>
              </>
            )}
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-or-400">Numéro de téléphone</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg bg-nuit-900 px-2 py-1 text-sm font-black text-or-400">🇹🇬 +228</span>
                <input className={`input !pl-[104px] ${errors.phone ? "input-error" : ""}`} type="tel" inputMode="tel" autoComplete="tel" value={f.phone} placeholder="90 00 00 00" onChange={(e) => set("phone", e.target.value)} />
              </div>
              {err("phone")}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-or-400">Mot de passe</span>
              <PwInput value={f.password} onChange={(v) => set("password", v)} placeholder={mode === "register" ? "6 caractères minimum" : "Votre mot de passe"} error={!!errors.password} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              {err("password")}
              {mode === "register" && f.password && (
                <div className="mt-2 anim-fade-up">
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className="h-1.5 rounded-full transition-all duration-300" style={{ background: st.score >= i ? st.color : "rgba(255,255,255,.15)" }} />
                    ))}
                  </div>
                  <span className="text-xs font-bold" style={{ color: st.color }}>{st.label}</span>
                </div>
              )}
            </label>

            {msg && <div className="rounded-2xl bg-red-500/20 border border-red-300/40 px-4 py-3 font-semibold anim-pop">⚠ {msg}</div>}

            <button type="submit" disabled={busy} className="btn-gold shine w-full !min-h-[62px] !text-xl">
              {busy ? <span className="inline-block h-6 w-6 rounded-full border-[3px] border-nuit-950 border-t-transparent animate-spin" /> : mode === "login" ? "Se connecter →" : "Créer mon compte ✨"}
            </button>

            {mode === "login" && (
              <button type="button" onClick={() => setForgot(!forgot)} className="w-full text-center text-blue-100/80 font-semibold underline underline-offset-4">
                Mot de passe oublié ?
              </button>
            )}
            {forgot && (
              <div className="rounded-2xl bg-nuit-950/60 border border-or-500/30 p-4 text-sm anim-pop">
                <p>Contactez le développeur pour réinitialiser votre mot de passe :</p>
                <a
                  href={`https://wa.me/${DEV.whatsapp}?text=${encodeURIComponent(`Bonjour, j'ai oublié mon mot de passe Devis BTP. Mon numéro : ${f.phone}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 rounded-xl min-h-[50px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#25d366,#128c4a)" }}
                >
                  💬 Écrire sur WhatsApp
                </a>
              </div>
            )}
          </form>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-blue-100/80 stagger">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><div className="text-2xl mb-1">🔒</div>Données privées</div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><div className="text-2xl mb-1">☁️</div>Sauvegarde auto</div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><div className="text-2xl mb-1">📶</div>Marche hors ligne</div>
        </div>

        <div className="mt-6 anim-fade-up" style={{ animationDelay: ".3s" }}>
          <DevCredit variant="dark" />
        </div>
      </div>
      <Confetti fire={party} />
    </div>
  );
}
