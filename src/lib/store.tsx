"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthUser, BackupData, CatalogItem, Quote, Settings, SyncDoc } from "./types";
import { defaultSettings, emptyLabor } from "./seed";
import { todayISO, uid } from "./format";
import { WORK_TYPES } from "./types";
import { emptyDoc, mergeDocs, normalizeDoc, parseNumber, sameDoc } from "./sync";

export type SyncState = "synced" | "pending" | "syncing" | "offline";

interface Store {
  ready: boolean;
  user: AuthUser;
  settings: Settings;
  quotes: Quote[];
  catalog: CatalogItem[];
  seq: Record<string, number>;
  syncState: SyncState;
  lastSync: number | null;
  legacyCount: number;
  saveSettings: (s: Settings) => void;
  upsertQuote: (q: Quote) => void;
  deleteQuote: (id: string) => void;
  discardIfEmpty: (id: string) => void;
  newQuote: () => Quote;
  duplicateQuote: (id: string) => Quote | null;
  setCatalog: (c: CatalogItem[]) => void;
  rememberPrices: (q: Quote) => void;
  exportData: () => BackupData;
  importData: (d: unknown) => string | null;
  importLegacy: (accept: boolean) => void;
  syncNow: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
const LEGACY = { settings: "devis_settings", quotes: "devis_quotes", catalog: "devis_catalog", seeded: "devis_seeded_v1" };

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Un devis « vide » : aucun client, aucune ligne. Inutile de le garder. */
export function isEmptyQuote(q: Quote): boolean {
  return !q.client.name.trim() && !q.client.phone.trim() && q.sections.every((s) => s.lines.length === 0) && q.materials.length === 0;
}

export function nextNumber(quotes: Quote[], date: string, seq: Record<string, number> = {}): string {
  const year = (date || todayISO()).slice(0, 4);
  const prefix = `DEV-${year}-`;
  // le compteur ne redescend jamais : un numéro supprimé n'est pas réattribué
  let max = seq[year] ?? 0;
  for (const q of quotes) {
    if (q.number.startsWith(prefix)) {
      const n = parseInt(q.number.slice(prefix.length), 10);
      if (n > max) max = n;
    }
  }
  return prefix + String(max + 1).padStart(3, "0");
}

function legacyQuotes(): Quote[] {
  const q = readJSON<Quote[]>(LEGACY.quotes) ?? [];
  // ignore le devis d'exemple jamais modifié
  return q.filter((x) => x && x.id && !(x.client?.name === "Client exemple" && x.updatedAt === x.createdAt));
}

export function StoreProvider({ user, onSignedOut, children }: { user: AuthUser; onSignedOut: () => void; children: ReactNode }) {
  const KEY = `devis_doc_${user.id}`;
  const PENDING = `devis_pending_${user.id}`;
  const [ready, setReady] = useState(false);
  const [doc, setDocState] = useState<SyncDoc>(emptyDoc);
  const [syncState, setSyncState] = useState<SyncState>("synced");
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [legacyCount, setLegacyCount] = useState(0);
  const docRef = useRef<SyncDoc>(doc);
  const rev = useRef(0);
  const inflight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Écriture locale regroupée : au lieu d'écrire tout le document à chaque lettre tapée,
  // on écrit 400 ms après la dernière frappe (et immédiatement si l'appli passe en arrière-plan).
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signedOut = useRef(false);
  const writeNow = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (signedOut.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(docRef.current));
    } catch {
      alert("Mémoire du téléphone pleine : impossible d'enregistrer localement.");
    }
  }, [KEY]);
  const persist = useCallback(
    (_d: SyncDoc) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(writeNow, 400);
    },
    [writeNow],
  );

  const setDoc = useCallback(
    (d: SyncDoc) => {
      docRef.current = d;
      setDocState(d);
      persist(d);
    },
    [persist],
  );

  /* ---------------- Synchronisation ---------------- */
  const push = useCallback(async (): Promise<boolean> => {
    if (inflight.current) return false;
    inflight.current = true;
    setSyncState("syncing");
    const sentRev = rev.current;
    try {
      const res = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: docRef.current }),
      });
      if (res.status === 401) {
        onSignedOut();
        return false;
      }
      if (!res.ok) throw new Error("http " + res.status);
      const { data } = await res.json();
      setDoc(mergeDocs(docRef.current, normalizeDoc(data)));
      setLastSync(Date.now());
      if (rev.current === sentRev) {
        localStorage.removeItem(PENDING);
        setSyncState("synced");
      } else {
        setSyncState("pending");
        inflight.current = false;
        return push();
      }
      return true;
    } catch {
      setSyncState("offline");
      return false;
    } finally {
      inflight.current = false;
    }
  }, [setDoc, onSignedOut, PENDING]);

  const schedulePush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(), 2500);
  }, [push]);

  const mutate = useCallback(
    (fn: (d: SyncDoc) => SyncDoc) => {
      setDoc(fn(docRef.current));
      rev.current++;
      localStorage.setItem(PENDING, "1");
      setSyncState((s) => (s === "offline" ? "offline" : "pending"));
      schedulePush();
    },
    [setDoc, schedulePush, PENDING],
  );

  // Chargement : copie locale immédiate, puis fusion avec le serveur
  useEffect(() => {
    let cancelled = false;
    const local = readJSON<SyncDoc>(KEY);
    if (local) {
      setDoc(normalizeDoc(local));
      setReady(true);
    }
    const lq = legacyQuotes();
    const ls = readJSON<Settings>(LEGACY.settings);
    if (lq.length || (ls && JSON.stringify({ ...defaultSettings, ...ls }) !== JSON.stringify(defaultSettings))) setLegacyCount(Math.max(lq.length, 1));
    else if (localStorage.getItem(LEGACY.quotes) || localStorage.getItem(LEGACY.settings)) {
      Object.values(LEGACY).forEach((k) => localStorage.removeItem(k));
    }

    (async () => {
      try {
        const res = await fetch("/api/data", { cache: "no-store" });
        if (res.status === 401) return onSignedOut();
        if (!res.ok) throw new Error();
        const { data } = await res.json();
        if (cancelled) return;
        const server = normalizeDoc(data);
        const merged = mergeDocs(docRef.current, server);
        setDoc(merged);
        setLastSync(Date.now());
        setReady(true);
        if (!sameDoc(merged, server) || localStorage.getItem(PENDING)) push();
        else setSyncState("synced");
      } catch {
        if (cancelled) return;
        setReady(true);
        setSyncState(localStorage.getItem(PENDING) ? "offline" : "offline");
      }
    })();

    const online = () => push();
    window.addEventListener("online", online);
    const hide = () => {
      if (document.visibilityState !== "hidden") return;
      writeNow();
      if (localStorage.getItem(PENDING) && navigator.onLine) push();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", writeNow);
    const iv = setInterval(() => {
      if (localStorage.getItem(PENDING) && navigator.onLine) push();
    }, 30_000);
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    return () => {
      cancelled = true;
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", writeNow);
      writeNow();
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [KEY]);

  /* ---------------- Actions ---------------- */
  const saveSettings = useCallback((s: Settings) => mutate((d) => ({ ...d, settings: s, settingsAt: Date.now() })), [mutate]);

  const upsertQuote = useCallback(
    (q: Quote) =>
      mutate((d) => {
        const updated = { ...q, updatedAt: Date.now() };
        const exists = d.quotes.some((x) => x.id === q.id);
        let seq = d.seq;
        const p = parseNumber(q.number);
        if (p && !isEmptyQuote(q) && (seq[p.year] ?? 0) < p.n) seq = { ...seq, [p.year]: p.n };
        return { ...d, seq, quotes: exists ? d.quotes.map((x) => (x.id === q.id ? updated : x)) : [updated, ...d.quotes] };
      }),
    [mutate],
  );

  const deleteQuote = useCallback(
    (id: string) => mutate((d) => ({ ...d, quotes: d.quotes.filter((q) => q.id !== id), deleted: { ...d.deleted, [id]: Date.now() } })),
    [mutate],
  );

  const discardIfEmpty = useCallback(
    (id: string) => {
      const q = docRef.current.quotes.find((x) => x.id === id);
      if (q && isEmptyQuote(q)) deleteQuote(id);
    },
    [deleteQuote],
  );

  const newQuote = useCallback((): Quote => {
    const date = todayISO();
    const now = Date.now();
    const s = docRef.current.settings;
    const q: Quote = {
      id: uid(),
      number: nextNumber(docRef.current.quotes, date, docRef.current.seq),
      status: "brouillon",
      client: { name: "", phone: "", site: "" },
      date,
      sections: [],
      materials: [],
      laborScope: "global",
      labor: { ...emptyLabor(), mode: "m2", autoQty: true },
      depositMode: "percent",
      depositValue: s.depositPercent,
      customRest: undefined,
      vatRate: s.vatRate || 0,
      paymentTerms: s.paymentTerms,
      validityDays: s.validityDays,
      template: s.defaultTemplate,
      createdAt: now,
      updatedAt: now,
    };
    mutate((d) => ({ ...d, quotes: [q, ...d.quotes] }));
    return q;
  }, [mutate]);

  const duplicateQuote = useCallback(
    (id: string): Quote | null => {
      const src = docRef.current.quotes.find((q) => q.id === id);
      if (!src) return null;
      const date = todayISO();
      const now = Date.now();
      const copy: Quote = JSON.parse(JSON.stringify(src));
      copy.id = uid();
      copy.date = date;
      copy.number = nextNumber(docRef.current.quotes, date, docRef.current.seq);
      copy.status = "brouillon";
      copy.createdAt = now;
      copy.updatedAt = now;
      copy.sections.forEach((s) => {
        s.id = uid();
        s.lines.forEach((l) => (l.id = uid()));
      });
      copy.materials.forEach((l) => (l.id = uid()));
      const p = parseNumber(copy.number);
      mutate((d) => ({ ...d, seq: p ? { ...d.seq, [p.year]: Math.max(d.seq[p.year] ?? 0, p.n) } : d.seq, quotes: [copy, ...d.quotes] }));
      return copy;
    },
    [mutate],
  );

  const setCatalog = useCallback((c: CatalogItem[]) => mutate((d) => ({ ...d, catalog: c, catalogAt: Date.now() })), [mutate]);

  const rememberPrices = useCallback(
    (q: Quote) => {
      const next = [...docRef.current.catalog];
      let changed = false;
      const upd = (cat: CatalogItem["category"], designation: string, unit: CatalogItem["unit"], pu: number) => {
        const name = designation.trim();
        if (!name || !(pu > 0)) return;
        const key = name.toLowerCase();
        const i = next.findIndex((c) => c.category === cat && c.designation.trim().toLowerCase() === key);
        if (i >= 0) {
          if (next[i].pu !== pu || next[i].unit !== unit) {
            next[i] = { ...next[i], pu, unit };
            changed = true;
          }
        } else {
          next.push({ id: uid(), category: cat, designation: name, unit, pu });
          changed = true;
        }
      };
      q.sections.forEach((s) => s.lines.forEach((l) => upd(s.type, l.designation, l.unit, l.pu)));
      q.materials.forEach((l) => upd("materiaux", l.designation, l.unit, l.pu));
      if (changed) setCatalog(next);
    },
    [setCatalog],
  );

  const exportData = useCallback(
    (): BackupData => ({
      app: "devis-btp",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: docRef.current.settings,
      quotes: docRef.current.quotes,
      catalog: docRef.current.catalog,
    }),
    [],
  );

  const importData = useCallback(
    (raw: unknown): string | null => {
      if (!raw || typeof raw !== "object") return "Fichier invalide.";
      const data = raw as Partial<BackupData>;
      if (data.app !== "devis-btp" || !Array.isArray(data.quotes) || !Array.isArray(data.catalog) || !data.settings) {
        return "Ce fichier n'est pas une sauvegarde de l'application Devis.";
      }
      const validTypes = WORK_TYPES.map((w) => w.key);
      const now = Date.now();
      const quotes = data.quotes
        .filter((q) => q && typeof q.id === "string" && Array.isArray(q.sections) && q.sections.every((s) => validTypes.includes(s.type)))
        .map((q) => ({ ...q, updatedAt: now }));
      const keep = new Set(quotes.map((q) => q.id));
      mutate((d) => {
        const deleted = { ...d.deleted };
        d.quotes.forEach((q) => {
          if (!keep.has(q.id)) deleted[q.id] = now;
        });
        quotes.forEach((q) => delete deleted[q.id]);
        return {
          settings: { ...defaultSettings, ...data.settings },
          settingsAt: now,
          catalog: data.catalog as CatalogItem[],
          catalogAt: now,
          quotes,
          deleted,
          seq: d.seq,
        };
      });
      return null;
    },
    [mutate],
  );

  const importLegacy = useCallback(
    (accept: boolean) => {
      if (accept) {
        const lq = legacyQuotes();
        const ls = readJSON<Settings>(LEGACY.settings);
        const lc = readJSON<CatalogItem[]>(LEGACY.catalog);
        const now = Date.now();
        mutate((d) => ({
          ...d,
          quotes: [...lq.map((q) => ({ ...q, updatedAt: now })), ...d.quotes.filter((q) => !lq.some((x) => x.id === q.id))],
          settings: ls ? { ...defaultSettings, ...ls } : d.settings,
          settingsAt: ls ? now : d.settingsAt,
          catalog: lc && lc.length ? lc : d.catalog,
          catalogAt: lc && lc.length ? now : d.catalogAt,
        }));
      }
      Object.values(LEGACY).forEach((k) => localStorage.removeItem(k));
      setLegacyCount(0);
    },
    [mutate],
  );

  const syncNow = useCallback(() => push(), [push]);

  const logout = useCallback(async () => {
    if (localStorage.getItem(PENDING)) {
      const ok = await push();
      if (!ok && !confirm("Certaines modifications ne sont pas encore envoyées (pas d'internet). Elles seront perdues sur ce téléphone. Se déconnecter quand même ?")) return;
    }
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* hors ligne */
    }
    signedOut.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    localStorage.removeItem(KEY);
    localStorage.removeItem(PENDING);
    onSignedOut();
  }, [push, KEY, PENDING, onSignedOut]);

  return (
    <Ctx.Provider
      value={{
        ready,
        user,
        settings: doc.settings,
        quotes: doc.quotes,
        catalog: doc.catalog,
        seq: doc.seq,
        syncState,
        lastSync,
        legacyCount,
        saveSettings,
        upsertQuote,
        deleteQuote,
        discardIfEmpty,
        newQuote,
        duplicateQuote,
        setCatalog,
        rememberPrices,
        exportData,
        importData,
        importLegacy,
        syncNow,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider manquant");
  return s;
}
