'use client';


import React, { useMemo, useState } from "react";

// UniPost MVP – Single-file React component (no external UI libs)
// - Tailwind-friendly classes
// - Simulates multi-network post composing, scheduling & mock publish
// - Ready to drop into a Next.js/React app as a starting point

// --- Types
const NETWORKS = [
  { key: "instagram", label: "Instagram", limits: { text: 2200 } },
  { key: "facebook", label: "Facebook", limits: { text: 63206 } },
  { key: "twitter", label: "X / Twitter", limits: { text: 280 } },
  { key: "linkedin", label: "LinkedIn", limits: { text: 3000 } },
] as const;

type NetworkKey = typeof NETWORKS[number]["key"]; 

type Variant = {
  enabled: boolean;
  text: string;
  media: File[];
  status: "idle" | "queued" | "publishing" | "success" | "error";
  externalId?: string;
  error?: string;
};

// --- Helpers
function classNames(...arr: (string | false | undefined | null)[]) {
  return arr.filter(Boolean).join(" ");
}

function formatDateTimeLocal(dt: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = dt.getFullYear();
  const m = pad(dt.getMonth() + 1);
  const d = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mm = pad(dt.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

// Fake API that simulates network publish with random success
async function mockPublishAPI(network: NetworkKey, payload: { text: string; when?: string; mediaCount: number; }) {
  // Simulate latency
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 1200));
  // 85% success rate
  const ok = Math.random() < 0.85;
  if (!ok) {
    throw new Error(`Rate limit or validation error on ${network}`);
  }
  return { externalId: `${network}-${Date.now()}` };
}

export default function UniPostMVP() {
  const [orgName] = useState("Demo Org");
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState<string>(formatDateTimeLocal(new Date(Date.now() + 60*60*1000)));
  const [activeTab, setActiveTab] = useState<NetworkKey>("instagram");
  const [variants, setVariants] = useState<Record<NetworkKey, Variant>>({
    instagram: { enabled: true, text: "", media: [], status: "idle" },
    facebook: { enabled: true, text: "", media: [], status: "idle" },
    twitter: { enabled: false, text: "", media: [], status: "idle" },
    linkedin: { enabled: true, text: "", media: [], status: "idle" },
  });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const publishList = useMemo(() => NETWORKS.filter(n => variants[n.key].enabled), [variants]);

  function updateVariant<K extends keyof Variant>(key: NetworkKey, field: K, value: Variant[K]) {
    setVariants(v => ({ ...v, [key]: { ...v[key], [field]: value } }));
  }

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>, key: NetworkKey){
    const files = Array.from(e.target.files || []);
    updateVariant(key, "media", files);
  }

  function autoFillFromBase() {
    // Simple heuristic: copy current active text to all enabled variants that are empty
    const base = variants[activeTab].text;
    setVariants(prev => {
      const next = { ...prev };
      for (const n of NETWORKS) {
        if (next[n.key].enabled && !next[n.key].text) next[n.key].text = base;
      }
      return next;
    });
    setToast("Texto propagado a variantes vacías.");
  }

  async function handlePublish() {
    setBusy(true);
    setToast(null);
    const whenISO = new Date(schedule).toISOString();

    // Validate: at least one network enabled & text length constraints
    const enabled = NETWORKS.filter(n => variants[n.key].enabled);
    if (enabled.length === 0) {
      setToast("Activa al menos una red para publicar.");
      setBusy(false);
      return;
    }
    for (const n of enabled) {
      const txt = variants[n.key].text.trim();
      if (!txt) { setToast(`Falta texto en ${n.label}`); setBusy(false); return; }
      const limit = n.limits.text;
      if (txt.length > limit) { setToast(`${n.label}: supera límite de ${limit} caracteres`); setBusy(false); return; }
    }

    // Queue each publish
    setVariants(v => {
      const copy = { ...v } as typeof v;
      for (const n of enabled) copy[n.key].status = "queued";
      return copy;
    });

    for (const n of enabled) {
      try {
        setVariants(v => ({ ...v, [n.key]: { ...v[n.key], status: "publishing", error: undefined }}));
        const res = await mockPublishAPI(n.key, { text: variants[n.key].text, when: whenISO, mediaCount: variants[n.key].media.length });
        setVariants(v => ({ ...v, [n.key]: { ...v[n.key], status: "success", externalId: res.externalId } }));
      } catch (err: any) {
        setVariants(v => ({ ...v, [n.key]: { ...v[n.key], status: "error", error: err?.message || "Unknown error" } }));
      }
    }

    setToast("Proceso de publicación simulado finalizado.");
    setBusy(false);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">UniPost – MVP Composer</h1>
          <p className="text-sm text-slate-600">Organización: {orgName}</p>
        </header>

        {/* Title + schedule */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Título interno</label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Lanzamiento Septiembre – Post #1"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Programar</label>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:ring-2 focus:ring-indigo-500"
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">Se guarda en UTC en el backend.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex flex-wrap gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n.key}
              className={classNames(
                "rounded-full border px-4 py-2 text-sm transition",
                activeTab === n.key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-slate-100 border-slate-300"
              )}
              onClick={() => setActiveTab(n.key)}
            >
              {n.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {NETWORKS.map((n) => {
            const v = variants[n.key];
            const active = n.key === activeTab;
            return (
              <section key={n.key} className={active ? "block" : "hidden"}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={v.enabled}
                      onChange={(e) => updateVariant(n.key, "enabled", e.target.checked)}
                    />
                    Activar publicación en {n.label}
                  </label>
                  <span className="text-xs text-slate-500">Límite de texto: {n.limits.text} chars</span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Texto</label>
                    <textarea
                      rows={6}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={`Escribe el copy para ${n.label}…`}
                      value={v.text}
                      onChange={(e) => updateVariant(n.key, "text", e.target.value)}
                    />
                    <div className="mt-1 text-xs text-slate-500 text-right">{v.text.length}/{n.limits.text}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Medios (simulado)</label>
                    <input type="file" multiple onChange={(e) => handleMediaChange(e, n.key)} />
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      {v.media.length === 0 ? (
                        <p>Sin archivos.</p>
                      ) : (
                        v.media.map((f, i) => <p key={i}>• {f.name}</p>)
                      )}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <strong>Estado:</strong>{" "}
                  {v.status === "idle" && <span className="text-slate-600">En edición</span>}
                  {v.status === "queued" && <span className="text-amber-600">En cola…</span>}
                  {v.status === "publishing" && <span className="text-blue-600">Publicando…</span>}
                  {v.status === "success" && (
                    <span className="text-emerald-700">Publicado ✓ {v.externalId ? `(${v.externalId})` : ""}</span>
                  )}
                  {v.status === "error" && (
                    <span className="text-rose-700">Error: {v.error}</span>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            className="rounded-xl bg-slate-800 px-5 py-3 text-white shadow hover:bg-slate-900 disabled:opacity-60"
            onClick={autoFillFromBase}
            disabled={busy}
          >
            Propagar texto a variantes vacías
          </button>
          <button
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
            onClick={handlePublish}
            disabled={busy}
          >
            {busy ? "Publicando…" : "Publicar (simulado)"}
          </button>
        </div>

        {toast && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow">
            {toast}
          </div>
        )}

        {/* Aside: Summary */}
        <aside className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">Resumen</h2>
          <div className="overflow-hidden rounded-2xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left">Red</th>
                  <th className="px-3 py-2 text-left">Activo</th>
                  <th className="px-3 py-2 text-left">Chars</th>
                  <th className="px-3 py-2 text-left">Medios</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {NETWORKS.map(n => {
                  const v = variants[n.key];
                  return (
                    <tr key={n.key} className="odd:bg-white even:bg-slate-50">
                      <td className="px-3 py-2">{n.label}</td>
                      <td className="px-3 py-2">{v.enabled ? "Sí" : "No"}</td>
                      <td className="px-3 py-2">{v.text.length}</td>
                      <td className="px-3 py-2">{v.media.length}</td>
                      <td className="px-3 py-2">{v.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-600">Programado para: <span className="font-mono">{schedule}</span></p>
        </aside>
      </div>
    </div>
  );
}
