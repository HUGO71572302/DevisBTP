"use client";

import { useEffect, useRef, useState } from "react";
import { todayISO } from "@/lib/format";
import { saveFile } from "@/lib/share";
import { useStore } from "@/lib/store";
import { Settings } from "@/lib/types";
import { Field, NumInput, PageTitle, Toast } from "@/components/ui";
import { SignaturePad } from "@/components/SignaturePad";
import { TemplatePicker } from "@/components/TemplatePicker";
import { DevCredit } from "@/components/DevCredit";
import { SyncBadge } from "@/components/SyncBadge";
import { makeStamp } from "@/lib/stamp";
import { formatPhone } from "@/lib/sync";

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="w-full flex items-center justify-between gap-3 text-left min-h-[56px]">
      <span>
        <span className="block font-bold text-nuit-900">{label}</span>
        {hint && <span className="block text-sm text-slate-500">{hint}</span>}
      </span>
      <span className={`relative shrink-0 h-8 w-14 rounded-full transition ${on ? "bg-gradient-to-r from-or-400 to-or-600" : "bg-slate-300"}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all duration-300 ${on ? "left-7" : "left-1"}`} />
      </span>
    </button>
  );
}

function AccountCard({ onMsg }: { onMsg: (m: string) => void }) {
  const { user, logout, lastSync } = useStore();
  const [pw, setPw] = useState<{ open: boolean; current: string; next: string; busy: boolean }>({ open: false, current: "", next: "", busy: false });
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const changePw = async () => {
    if (pw.next.length < 6) return onMsg("⚠ Nouveau mot de passe : 6 caractères minimum");
    setPw({ ...pw, busy: true });
    try {
      const r = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current: pw.current, next: pw.next }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) onMsg("⚠ " + (d.error || "Erreur"));
      else {
        onMsg("✓ Mot de passe modifié");
        setPw({ open: false, current: "", next: "", busy: false });
        return;
      }
    } catch {
      onMsg("⚠ Pas d'internet");
    }
    setPw((p) => ({ ...p, busy: false }));
  };
  return (
    <section className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl bg-gradient-to-br from-nuit-950 via-nuit-900 to-roi-600">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-or-500/25 blur-2xl" />
      <div className="relative flex items-center gap-4">
        <div className="grid place-items-center h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-or-400 to-or-600 text-2xl font-black text-nuit-950 shadow-lg anim-pop">{initials}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold tracking-widest text-or-400">MON COMPTE</div>
          <div className="text-xl font-black truncate">{user.name}</div>
          <div className="text-blue-100/80 font-semibold">+228 {formatPhone(user.phone)}</div>
        </div>
      </div>
      <div className="relative mt-4 flex items-center justify-between gap-2">
        <SyncBadge dark />
        <span className="text-xs text-blue-100/70">{lastSync ? `Synchro ${new Date(lastSync).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
      </div>
      {pw.open && (
        <div className="relative mt-4 space-y-2 anim-fade-up">
          <input className="input" type="password" placeholder="Mot de passe actuel" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
          <input className="input" type="password" placeholder="Nouveau mot de passe" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
          <button className="btn-gold w-full !min-h-[50px]" onClick={changePw} disabled={pw.busy}>✓ Changer le mot de passe</button>
        </div>
      )}
      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <button className="rounded-2xl min-h-[50px] font-bold bg-white/10 border border-white/20 active:scale-95 transition" onClick={() => setPw({ ...pw, open: !pw.open })}>🔑 Mot de passe</button>
        <button
          className="rounded-2xl min-h-[50px] font-bold bg-red-500/20 border border-red-300/30 text-red-100 active:scale-95 transition"
          onClick={() => {
            if (confirm("Se déconnecter de ce téléphone ?")) logout();
          }}
        >
          ⎋ Déconnexion
        </button>
      </div>
    </section>
  );
}

function resizeImage(file: File, max = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("lecture"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image"));
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * r);
        c.height = Math.round(img.height * r);
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ParametresPage() {
  const { settings, saveSettings, exportData, importData, quotes, catalog } = useStore();
  const [form, setForm] = useState<Settings>(settings);
  const [stampUrl, setStampUrl] = useState("");
  const dirtyRef = useRef(false);
  dirtyRef.current = JSON.stringify(form) !== JSON.stringify(settings);
  // si les données arrivent du serveur (autre téléphone), on met le formulaire à jour
  const lastSettings = useRef(settings);
  useEffect(() => {
    if (lastSettings.current !== settings) {
      const prev = lastSettings.current;
      lastSettings.current = settings;
      setForm((f) => (JSON.stringify(f) === JSON.stringify(prev) ? settings : f));
    }
  }, [settings]);
  useEffect(() => {
    setStampUrl(form.showStamp ? makeStamp(form) : "");
  }, [form]);
  /** Enregistre immédiatement un réglage (signature, cachet…) */
  const saveNow = (patch: Partial<Settings>) => {
    setForm((f) => ({ ...f, ...patch }));
    saveSettings({ ...settings, ...patch });
  };
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);

  const f = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm({ ...form, [k]: v });
  const dirty = JSON.stringify(form) !== JSON.stringify(settings);

  const save = () => {
    if (!form.name.trim()) {
      setErr(true);
      setMsg("Le nom de l'entreprise est obligatoire");
      return;
    }
    setErr(false);
    saveSettings(form);
    setMsg("✓ Paramètres enregistrés");
  };

  const backup = async () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const name = `Sauvegarde_Devis_${todayISO()}.json`;
    const r = await saveFile(blob, name, "Sauvegarde Devis");
    if (r === "downloaded") setMsg(`✓ Sauvegarde enregistrée : ${name}`);
    else if (r === "shared") setMsg("✓ Sauvegarde partagée");
  };

  const restore = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!confirm("Restaurer cette sauvegarde ? Les données actuelles du téléphone seront remplacées.")) return;
      const e = importData(data);
      if (e) setMsg("⚠ " + e);
      else {
        setForm({ ...form, ...data.settings });
        setMsg(`✓ Restauration réussie : ${data.quotes.length} devis, ${data.catalog.length} articles`);
      }
    } catch {
      setMsg("⚠ Fichier illisible : choisissez un fichier .json de sauvegarde");
    }
  };

  return (
    <div>
      <PageTitle image="/images/wood.jpg" icon="⚙️" sub="Saisis une seule fois, utilisés sur tous les devis">Réglages</PageTitle>
      <main className="mx-auto max-w-2xl lg:max-w-5xl p-4 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start stagger">
        <AccountCard onMsg={setMsg} />
        <section className="card space-y-4">
          <h2 className="text-xl font-black text-nuit-900 flex items-center gap-2"><span className="grid place-items-center h-9 w-9 rounded-xl bg-or-100">🏢</span>Mon entreprise</h2>
          <Field label="Nom de l'entreprise *" error={err && !form.name.trim() ? "Obligatoire" : undefined}>
            <input className="input" value={form.name} onChange={(e) => f("name", e.target.value)} />
          </Field>
          <Field label="Slogan">
            <input className="input" value={form.slogan} onChange={(e) => f("slogan", e.target.value)} />
          </Field>
          <Field label="Activités" hint="Une activité par ligne">
            <textarea className="input min-h-[90px]" value={form.activities} onChange={(e) => f("activities", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="BP">
              <input className="input" value={form.bp} onChange={(e) => f("bp", e.target.value)} />
            </Field>
            <Field label="Ville">
              <input className="input" value={form.city} onChange={(e) => f("city", e.target.value)} />
            </Field>
          </div>
          <Field label="Téléphones">
            <input className="input" type="tel" value={form.phones} onChange={(e) => f("phones", e.target.value)} />
          </Field>
          <Field label="Nom du responsable" hint="Apparaît sous « Le Responsable, »">
            <input className="input" value={form.manager} onChange={(e) => f("manager", e.target.value)} />
          </Field>
          <div>
            <span className="label">Logo (facultatif)</span>
            <div className="flex items-center gap-3">
              {form.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo} alt="Logo" className="h-20 w-20 object-contain rounded-lg border" />
              ) : (
                <div className="h-20 w-20 grid place-items-center rounded-lg border-2 border-dashed text-slate-400">Aucun</div>
              )}
              <div className="flex flex-col gap-2 flex-1">
                <button className="btn-secondary !min-h-[48px]" onClick={() => logoRef.current?.click()}>📷 Choisir une image</button>
                {form.logo && <button className="btn-danger !min-h-[44px]" onClick={() => f("logo", "")}>Retirer</button>}
              </div>
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  f("logo", await resizeImage(file));
                } catch {
                  setMsg("⚠ Image illisible");
                }
              }}
            />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="text-xl font-black text-nuit-900 flex items-center gap-2"><span className="grid place-items-center h-9 w-9 rounded-xl bg-or-100">📋</span>Valeurs par défaut</h2>
          <Field label="Conditions de paiement">
            <textarea className="input min-h-[80px]" value={form.paymentTerms} onChange={(e) => f("paymentTerms", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Validité (jours)">
              <NumInput value={form.validityDays} onChange={(n) => f("validityDays", Math.round(n))} />
            </Field>
            <Field label="Acompte (%)">
              <NumInput value={form.depositPercent} onChange={(n) => f("depositPercent", Math.min(100, n))} />
            </Field>
          </div>
          <div>
            <span className="label">TVA sur les nouveaux devis</span>
            <div className="grid grid-cols-2 gap-2">
              {[0, 18].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => f("vatRate", r)}
                  className={`rounded-xl border-2 min-h-[52px] font-bold ${(form.vatRate || 0) === r ? "seg-on" : "seg-off"} transition active:scale-95`}
                >
                  {r === 0 ? "Sans TVA" : "TVA 18 %"}
                </button>
              ))}
            </div>
            <span className="mt-1 block text-sm text-slate-500">Choisissez « TVA 18 % » si votre entreprise est assujettie. Modifiable sur chaque devis.</span>
          </div>
        </section>

        <button className={`w-full sticky bottom-[calc(92px+env(safe-area-inset-bottom))] lg:bottom-6 lg:col-span-2 z-10 shadow-xl ${dirty ? "btn-gold shine" : "btn-primary"}`} onClick={save} disabled={!dirty}>
          {dirty ? "✓ Enregistrer les paramètres" : "Paramètres enregistrés"}
        </button>

        <section className="card space-y-3 lg:col-span-2">
          <h2 className="text-xl font-black text-nuit-900 flex items-center gap-2"><span className="grid place-items-center h-9 w-9 rounded-xl bg-or-100">🎨</span>Modèle de devis par défaut</h2>
          <p className="text-slate-600">Utilisé pour les nouveaux devis. Vous pouvez aussi changer de modèle au moment de l&apos;export.</p>
          <TemplatePicker value={form.defaultTemplate} onChange={(id) => { saveNow({ defaultTemplate: id }); setMsg("✓ Modèle par défaut enregistré"); }} />
        </section>

        <section className="card space-y-4">
          <h2 className="text-xl font-black text-nuit-900 flex items-center gap-2"><span className="grid place-items-center h-9 w-9 rounded-xl bg-or-100">✍️</span>Signature et cachet</h2>
          <p className="text-slate-600">Ils apparaissent automatiquement dans la case « Le Responsable » de chaque devis PDF.</p>
          <div>
            <span className="label">Ma signature</span>
            <SignaturePad value={form.signature} onSave={(sig) => { saveNow({ signature: sig }); setMsg(sig ? "✓ Signature enregistrée" : "Signature retirée"); }} />
          </div>
          <div className="border-t border-slate-100 pt-2">
            <Toggle on={form.showStamp} onChange={(v) => saveNow({ showStamp: v })} label="Cachet automatique" hint="Tampon rond avec le nom de l'entreprise et la ville" />
            {form.showStamp && (
              <div className="mt-2 flex items-center gap-4 anim-fade-up">
                <div className="relative grid place-items-center h-36 w-36 shrink-0 rounded-2xl bg-sable-50 border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {stampUrl && <img key={stampUrl.length + form.stampColor} src={stampUrl} alt="Cachet" className="h-32 w-32 opacity-90 anim-pop" />}
                </div>
                <div className="flex-1 space-y-2">
                  <span className="label">Couleur d&apos;encre</span>
                  {(["bleu", "rouge"] as const).map((c) => (
                    <button key={c} onClick={() => saveNow({ stampColor: c })} className={`w-full flex items-center gap-2 rounded-2xl border-2 px-3 min-h-[48px] font-bold transition active:scale-95 ${form.stampColor === c ? "border-nuit-900 bg-nuit-900 text-white" : "border-slate-200 bg-white"}`}>
                      <span className="h-5 w-5 rounded-full" style={{ background: c === "bleu" ? "#1d3fbf" : "#c3201f" }} />
                      {c === "bleu" ? "Bleu" : "Rouge"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-xl font-black text-nuit-900 flex items-center gap-2"><span className="grid place-items-center h-9 w-9 rounded-xl bg-or-100">💾</span>Sauvegarde des données</h2>
          <p className="text-slate-600">
            {quotes.length} devis et {catalog.length} articles. Ils sont sauvegardés automatiquement dans votre compte dès qu'il y a internet. Vous pouvez aussi garder une copie en fichier.
          </p>
          <button className="btn-primary w-full" onClick={backup}>💾 Sauvegarder mes données</button>
          <button className="btn-secondary w-full" onClick={() => restoreRef.current?.click()}>♻️ Restaurer une sauvegarde</button>
          <input
            ref={restoreRef}
            type="file"
            accept=".json,application/json,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) restore(file);
            }}
          />
        </section>

        <section className="card space-y-2 text-slate-600">
          <h2 className="text-xl font-black text-nuit-900 flex items-center gap-2"><span className="grid place-items-center h-9 w-9 rounded-xl bg-or-100">📲</span>Installer l&apos;application</h2>
          <p><b>Android (Chrome)</b> : menu ⋮ → « Installer l&apos;application » ou « Ajouter à l&apos;écran d&apos;accueil ».</p>
          <p><b>iPhone (Safari)</b> : bouton Partager ⬆️ → « Sur l&apos;écran d&apos;accueil ».</p>
          <p>Ensuite l&apos;application fonctionne même sans internet.</p>
        </section>

        <section className="space-y-2 lg:col-span-2">
          <h2 className="px-1 text-xl font-black text-nuit-900">À propos</h2>
          <DevCredit />
          <p className="text-center text-xs text-slate-400">Devis BTP · version 3.0</p>
        </section>
      </main>
      <Toast msg={msg} onDone={() => setMsg(null)} />
    </div>
  );
}
