"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { computeQuote, totalInWords } from "@/lib/calc";
import { fmtDateLong, fmtNum } from "@/lib/format";
import { BANNER_SRC, PHOTO_STRIP } from "@/lib/pdf";
import { Quote, Settings } from "@/lib/types";

const K = 794 / 210; // px par mm
const mm = (n: number) => n * K;
const money = (n: number) => fmtNum(Math.round(n), 0) + " F";
const NUIT = "#0a1f44";
const ROI = "#1e4fd8";
const OR = "#f0a81c";
const OR_DARK = "#a87008";
const OR_LIGHT = "#fdf1d8";
const ROI_LIGHT = "#e4ecff";
const SABLE = "#f7f5f0";
const GRAY = "#64748b";

function HouseIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <polygon points="50,12 8,50 92,50" fill={OR} />
      <rect x="20" y="48" width="60" height="38" fill={NUIT} />
      <rect x="43" y="62" width="14" height="24" fill={OR} />
    </svg>
  );
}

const lbl: CSSProperties = { fontSize: mm(2.5), fontWeight: 700, color: OR_DARK, letterSpacing: 0.3 };

export function QuoteDocument({ quote: q, settings: s }: { quote: Quote; settings: Settings }) {
  const t = computeQuote(q);
  const [stamp, setStamp] = useState("");
  useEffect(() => {
    if (!s.showStamp) return setStamp("");
    import("@/lib/stamp").then((m) => setStamp(m.makeStamp(s)));
  }, [s]);
  const acts = s.activities
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s*|\s*\*\s*$/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const contacts = [s.phones ? `Tél : ${s.phones}` : "", s.bp ? `BP : ${s.bp}` : "", s.city].filter(Boolean);
  const cond: [string, string][] = [];
  if (t.deposit > 0) cond.push(["Acompte", `${money(t.deposit)}  -  Reste à payer : ${money(t.rest)}`]);
  if (q.paymentTerms) cond.push(["Paiement", q.paymentTerms]);
  if (q.validityDays > 0) cond.push(["Validité", `${q.validityDays} jours à compter de la date d'émission`]);

  return (
    <div className="doc-a4 shadow-2xl">
      {/* Bandeau photo */}
      <div style={{ position: "relative", height: mm(48), backgroundImage: `url(${BANNER_SRC})`, backgroundSize: "100% 100%", backgroundColor: NUIT, color: "white" }}>
        <div style={{ position: "absolute", left: mm(15) - mm(1.2), top: mm(9) - mm(1.2), width: mm(29.4), height: mm(29.4), borderRadius: mm(4.4), border: `${mm(0.8)}px solid ${OR}` }} />
        <div style={{ position: "absolute", left: mm(15), top: mm(9), width: mm(27), height: mm(27), borderRadius: mm(3.5), background: "white", display: "grid", placeItems: "center" }}>
          {s.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo} alt="" style={{ maxWidth: mm(23), maxHeight: mm(23), objectFit: "contain" }} />
          ) : (
            <HouseIcon size={mm(23)} />
          )}
        </div>
        <div style={{ position: "absolute", left: mm(49), top: mm(8), width: mm(120) }}>
          <div style={{ fontSize: mm(8.6), fontWeight: 800, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden" }}>{s.name || "Mon entreprise"}</div>
          {s.slogan && <div style={{ fontSize: mm(3.5), fontWeight: 700, fontStyle: "italic", color: OR, marginTop: mm(1.5), lineHeight: 1.2 }}>{s.slogan}</div>}
          <div style={{ marginTop: mm(1.2) }}>
            {acts.map((a) => (
              <div key={a} style={{ fontSize: mm(2.9), color: "#cddaf2", lineHeight: 1.3, display: "flex", alignItems: "center", gap: mm(1.6) }}>
                <span style={{ width: mm(1.4), height: mm(1.4), borderRadius: 99, background: OR, display: "inline-block" }} />
                {a}
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", left: mm(49), bottom: mm(2.8), fontSize: mm(3), fontWeight: 700, display: "flex", gap: mm(2) }}>
          {contacts.map((c, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: mm(2) }}>
              {i > 0 && <span style={{ width: mm(0.6), height: mm(3), background: OR, display: "inline-block" }} />}
              {c}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", height: mm(1.8) }}>
        <div style={{ width: "64%", background: OR }} />
        <div style={{ flex: 1, background: ROI }} />
      </div>

      <div style={{ padding: `0 ${mm(15)}px`, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Titre + références */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: mm(4) }}>
          <div style={{ marginTop: mm(1.5) }}>
            <div style={{ fontSize: mm(8), fontWeight: 800, color: NUIT, lineHeight: 1 }}>DEVIS ESTIMATIF</div>
            <div style={{ display: "flex", gap: mm(1), marginTop: mm(2) }}>
              <span style={{ width: mm(22), height: mm(1.5), background: OR }} />
              <span style={{ width: mm(8), height: mm(1.5), background: ROI }} />
            </div>
            <div style={{ fontSize: mm(3.1), color: GRAY, marginTop: mm(2) }}>Travaux de bâtiment - estimation en francs CFA</div>
          </div>
          <div style={{ width: mm(66), height: mm(19), background: NUIT, borderRadius: mm(3), borderLeft: `${mm(2.2)}px solid ${OR}`, display: "flex", color: "white", padding: `${mm(3)}px ${mm(4)}px`, gap: mm(4) }}>
            <div style={{ width: mm(27) }}>
              <div style={{ ...lbl, color: OR }}>N° DU DEVIS</div>
              <div style={{ fontSize: mm(3.7), fontWeight: 700, marginTop: mm(1) }}>{q.number}</div>
            </div>
            <div>
              <div style={{ ...lbl, color: OR }}>DATE</div>
              <div style={{ fontSize: mm(3.7), fontWeight: 700, marginTop: mm(1) }}>{fmtDateLong(q.date)}</div>
            </div>
          </div>
        </div>

        {/* Client */}
        <div style={{ marginTop: mm(4), background: SABLE, borderRadius: mm(3), borderLeft: `${mm(2.2)}px solid ${OR}`, height: mm(17), display: "grid", gridTemplateColumns: `${mm(75)}px ${mm(40)}px 1fr`, padding: `${mm(2.8)}px ${mm(4.8)}px`, color: NUIT }}>
          <div>
            <div style={lbl}>CLIENT</div>
            <div style={{ fontSize: mm(4.2), fontWeight: 700, marginTop: mm(1), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.client.name || "-"}</div>
          </div>
          <div>
            <div style={lbl}>TÉLÉPHONE</div>
            <div style={{ fontSize: mm(3.7), fontWeight: 700, marginTop: mm(1.4) }}>{q.client.phone || "-"}</div>
          </div>
          <div>
            <div style={lbl}>LIEU DU CHANTIER</div>
            <div style={{ fontSize: mm(3.7), fontWeight: 700, marginTop: mm(1.4), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.client.site || "-"}</div>
          </div>
        </div>

        {/* Tableau */}
        <table style={{ marginTop: mm(5), color: NUIT }}>
          <colgroup>
            <col style={{ width: mm(11) }} />
            <col />
            <col style={{ width: mm(16) }} />
            <col style={{ width: mm(15) }} />
            <col style={{ width: mm(26) }} />
            <col style={{ width: mm(31) }} />
          </colgroup>
          <thead>
            <tr style={{ background: NUIT, color: "white", fontSize: mm(3.1) }}>
              <th style={{ padding: "8px 6px" }}>N°</th>
              <th style={{ textAlign: "left" }}>DÉSIGNATION</th>
              <th>U</th>
              <th>QTÉ</th>
              <th>P.U.</th>
              <th style={{ textAlign: "right", color: OR }}>MONTANT</th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, i) => {
              const zebra = i % 2 === 1 ? "#f7f9fd" : "white";
              switch (r.k) {
                case "section":
                  return (
                    <tr key={i}>
                      <td colSpan={6} style={{ textAlign: "left", background: OR_LIGHT, color: OR_DARK, fontWeight: 700, fontSize: 12.5 }}>{r.label}</td>
                    </tr>
                  );
                case "line":
                  return (
                    <tr key={i} style={{ background: zebra }}>
                      <td style={{ color: ROI, fontWeight: 700 }}>{r.n}</td>
                      <td style={{ textAlign: "left", fontWeight: 700 }}>{r.designation}</td>
                      <td>{r.unit}</td>
                      <td>{fmtNum(r.qty)}</td>
                      <td>{money(r.pu)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{money(r.amount)}</td>
                    </tr>
                  );
                case "subtotal":
                  return (
                    <tr key={i} style={{ background: ROI_LIGHT, fontWeight: 700 }}>
                      <td colSpan={2} style={{ textAlign: "left" }}>{r.label}</td>
                      <td>{r.unit ?? ""}</td>
                      <td>{r.qty !== undefined ? fmtNum(r.qty) : ""}</td>
                      <td></td>
                      <td style={{ textAlign: "right" }}>{money(r.amount)}</td>
                    </tr>
                  );
                case "labor":
                  return (
                    <tr key={i} style={{ background: SABLE, fontWeight: 700 }}>
                      <td colSpan={2} style={{ textAlign: "left" }}>{r.label}</td>
                      <td>{r.unit}</td>
                      <td>{r.qty !== null ? fmtNum(r.qty) : ""}</td>
                      <td>{r.pu !== null ? money(r.pu) : ""}</td>
                      <td style={{ textAlign: "right" }}>{money(r.amount)}</td>
                    </tr>
                  );
                case "total":
                  return r.strong ? (
                    <tr key={i} style={{ background: NUIT, fontWeight: 800 }}>
                      <td colSpan={5} style={{ textAlign: "right", color: "white", fontSize: 15, padding: "7px" }}>{r.label}</td>
                      <td style={{ textAlign: "right", color: OR, fontSize: 16 }}>{money(r.amount)}</td>
                    </tr>
                  ) : (
                    <tr key={i} style={{ fontWeight: 700 }}>
                      <td colSpan={5} style={{ textAlign: "right", color: GRAY }}>{r.label}</td>
                      <td style={{ textAlign: "right", background: r.label.startsWith("RESTE") ? OR_LIGHT : "white" }}>{money(r.amount)}</td>
                    </tr>
                  );
              }
            })}
          </tbody>
        </table>

        {/* Arrêté */}
        <div style={{ marginTop: mm(5), background: "#f1f5ff", borderRadius: mm(3), borderLeft: `${mm(2.2)}px solid ${ROI}`, padding: `${mm(3)}px ${mm(4)}px ${mm(3)}px ${mm(4.8)}px`, display: "flex", alignItems: "center", gap: mm(4) }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: mm(2.9), fontWeight: 700, color: GRAY }}>ARRÊTÉ LE PRÉSENT DEVIS À LA SOMME DE :</div>
            <div style={{ fontSize: mm(3.7), fontWeight: 700, fontStyle: "italic", color: ROI, marginTop: mm(1) }}>{totalInWords(t)}</div>
          </div>
          <div style={{ background: OR, color: NUIT, borderRadius: 999, padding: `${mm(2.2)}px ${mm(5)}px`, fontWeight: 800, fontSize: mm(4.4), whiteSpace: "nowrap" }}>{fmtNum(t.total, 0)} F CFA</div>
        </div>

        {/* Conditions + signature */}
        <div style={{ display: "flex", gap: mm(6), marginTop: mm(5) }}>
          <div style={{ width: "55%", color: NUIT }}>
            {cond.length > 0 && <div style={{ ...lbl, fontSize: mm(2.7) }}>CONDITIONS</div>}
            {cond.map(([k, v]) => (
              <div key={k} style={{ fontSize: mm(3.2), marginTop: mm(1.6), display: "flex", gap: mm(2) }}>
                <span style={{ width: mm(1.8), height: mm(1.8), background: OR, marginTop: mm(1), flexShrink: 0 }} />
                <span>
                  <b>{k} : </b>
                  <span style={{ color: "#334155" }}>{v}</span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, textAlign: "right", color: NUIT, fontWeight: 700 }}>
            <div style={{ fontSize: mm(3.5) }}>{s.city || "........"}, le {fmtDateLong(q.date)}</div>
            <div style={{ fontSize: mm(4), marginTop: mm(1.5) }}>Le Responsable,</div>
            <div style={{ marginTop: mm(1.5), height: mm(22), border: `1.5px dashed #c7d2e6`, borderRadius: mm(2.5), position: "relative" }}>
              {stamp && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={stamp} alt="Cachet" style={{ position: "absolute", left: mm(2), top: mm(11) - mm(12.5) - mm(1), width: mm(25), height: mm(25), opacity: 0.82 }} />
              )}
              {s.signature && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.signature} alt="Signature" style={{ position: "absolute", right: mm(3), top: mm(1.5), maxWidth: "60%", height: mm(15), objectFit: "contain", objectPosition: "right center" }} />
              )}
              {s.manager ? (
                <span style={{ position: "absolute", right: mm(3), bottom: mm(1.2), fontSize: mm(3.3) }}>{s.manager}</span>
              ) : (
                !s.signature && !stamp && <span style={{ position: "absolute", left: 0, right: 0, bottom: mm(1.5), textAlign: "center", fontSize: mm(2.5), fontStyle: "italic", color: GRAY, fontWeight: 400 }}>Signature et cachet</span>
              )}
            </div>
          </div>
        </div>

        {/* Bandeau photos */}
        <div style={{ marginTop: "auto", paddingTop: mm(4), paddingBottom: mm(4), display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: mm(2.5) }}>
          {PHOTO_STRIP.map((p) => (
            <div key={p.src} style={{ position: "relative", height: mm(17), backgroundImage: `url(${p.src})`, backgroundSize: "cover", backgroundPosition: "center" }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: mm(5), background: "rgba(10,31,68,0.82)", borderLeft: `${mm(1.2)}px solid ${OR}`, color: "white", fontSize: mm(2.4), fontWeight: 700, display: "flex", alignItems: "center", paddingLeft: mm(1.8) }}>
                {p.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pied de page */}
      <div style={{ height: mm(9), background: NUIT, position: "relative", color: "white", fontSize: mm(2.75), fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${mm(0.9)}px ${mm(15)}px 0` }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "64%", height: mm(0.9), background: OR }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: "36%", height: mm(0.9), background: ROI }} />
        <span>{[s.name, s.phones ? `Tél : ${s.phones}` : "", s.city].filter(Boolean).join("   •   ")}</span>
        <span style={{ color: OR }}>{q.number}</span>
      </div>
    </div>
  );
}

/** Affiche le document A4 réduit à la largeur de l'écran. */
export function ScaledDocument(props: { quote: Quote; settings: Settings }) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState(1123);

  useEffect(() => {
    const update = () => {
      if (!wrap.current || !inner.current) return;
      const sc = Math.min(1, wrap.current.clientWidth / 794);
      setScale(sc);
      setH(inner.current.offsetHeight * sc);
    };
    update();
    const ro = new ResizeObserver(update);
    if (wrap.current) ro.observe(wrap.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrap} className="print-area w-full overflow-hidden rounded-xl anim-fade-up">
      <div className="print-scale" style={{ height: h }}>
        <div ref={inner} className="print-scale origin-top-left" style={{ transform: `scale(${scale})`, width: 794 }}>
          <QuoteDocument {...props} />
        </div>
      </div>
    </div>
  );
}
