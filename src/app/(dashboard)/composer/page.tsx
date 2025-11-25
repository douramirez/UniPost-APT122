// src\app\(dashboard)\composer\page.tsx

"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// --- TIPOS ---
type Variant = {
  network: string;
  text: string;
};

type NewMedia = {
  id: string; 
  file: File;
  previewUrl: string; 
  base64: string; 
  type: "image" | "video";
  order: number; 
};

const ALL_NETWORKS = ["INSTAGRAM", "BLUESKY", "FACEBOOK"] as const;
const CATEGORIES = ["Ilustración", "Evento", "Emprendimiento", "Entretenimiento", "Otro"];

// Usamos IANA IDs para calcular hora real
const TIMEZONES = [
  { label: "Santiago / Buenos Aires", id: "America/Santiago" },
  { label: "Bogotá / Lima / Quito", id: "America/Bogota" },
  { label: "Ciudad de México", id: "America/Mexico_City" },
  { label: "Caracas / La Paz", id: "America/Caracas" },
  { label: "Nueva York / Miami", id: "America/New_York" },
  { label: "Los Angeles (Pacific)", id: "America/Los_Angeles" },
  { label: "Madrid / París / Roma", id: "Europe/Madrid" },
  { label: "Londres / Lisboa", id: "Europe/London" },
  { label: "UTC (Universal)", id: "UTC" },
  { label: "Tokio", id: "Asia/Tokyo" },
];

export default function ComposerPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Estados Formulario
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Otro"); // 👈 Global
  const [visible, setVisible] = useState(false);    // 👈 Global
  
  const [variants, setVariants] = useState<Variant[]>([{ network: "INSTAGRAM", text: "" }]);
  const [loading, setLoading] = useState(false);
  const [medias, setMedias] = useState<NewMedia[]>([]);

  // Estados Scheduler
  const [agendar, setAgendar] = useState(false);
  const [fecha, setFecha] = useState(""); 
  const [hora, setHora] = useState("12:00");
  const [zona, setZona] = useState("America/Santiago");
  const [now, setNow] = useState(new Date());

  // Reloj en vivo para las zonas horarias
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getTimeInZone = (zoneId: string) => {
    try {
      return new Intl.DateTimeFormat("es-CL", {
        timeZone: zoneId, hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(now);
    } catch (e) { return "--:--"; }
  };

  // --- Helpers de Media ---
  function moveMedia(index: number, direction: "left" | "right") {
    setMedias((prev) => {
      const newIndex = index + (direction === "left" ? -1 : 1);
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const arr = [...prev];
      const temp = arr[index]; arr[index] = arr[newIndex]; arr[newIndex] = temp;
      return arr.map((m, idx) => ({ ...m, order: idx }));
    });
  }

  function removeMedia(index: number) {
    setMedias((prev) => {
      const arr = prev.filter((_, i) => i !== index);
      return arr.map((m, idx) => ({ ...m, order: idx }));
    });
  }

  function hasNetwork(network: string) { return variants.some((v) => v.network === network); }

  function canAddMedia(file: File, currentMedias: NewMedia[]) {
    const isVideo = file.type.startsWith("video");
    const isImage = file.type.startsWith("image");
    if (!isVideo && !isImage) return { ok: false, reason: "Solo se permiten imágenes o videos." };
    
    const hasInstagram = hasNetwork("INSTAGRAM");
    const hasBluesky = hasNetwork("BLUESKY");
    const imageCount = currentMedias.filter((m) => m.type === "image").length;
    const videoCount = currentMedias.filter((m) => m.type === "video").length;

    if (hasInstagram && currentMedias.length >= 10) return { ok: false, reason: "Instagram: máx 10 archivos." };
    if (hasBluesky) {
      if (isVideo) {
        if (videoCount >= 1) return { ok: false, reason: "Bluesky: solo 1 video." };
        if (imageCount > 0) return { ok: false, reason: "Bluesky: no mezclar video/imagen." };
      } else {
        if (videoCount > 0) return { ok: false, reason: "Bluesky: no mezclar imagen/video." };
        if (imageCount >= 4) return { ok: false, reason: "Bluesky: máx 4 imágenes." };
      }
    }
    return { ok: true };
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const check = canAddMedia(selected, medias);
    if (!check.ok) { toast.error(check.reason || "Error"); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const isVideo = selected.type.startsWith("video");
      const newMedia: NewMedia = {
        id: crypto.randomUUID(),
        file: selected,
        previewUrl: URL.createObjectURL(selected),
        base64,
        type: isVideo ? "video" : "image",
        order: medias.length,
      };
      setMedias((prev) => [...prev, newMedia]);
      e.target.value = "";
    };
    reader.readAsDataURL(selected);
  }

  // --- SUBMIT ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let schedulePayload = null;
    if (agendar) {
        if (!fecha || !hora) { toast.error("⚠️ Faltan fecha y hora."); setLoading(false); return; }
        try {
            const targetDateStr = `${fecha}T${hora}:00`;
            const offset = getOffsetForZone(zona); 
            const finalIsoString = `${targetDateStr}${offset}`;
            const dateCheck = new Date(finalIsoString);
            if (isNaN(dateCheck.getTime())) throw new Error("Fecha inválida");
            if (dateCheck <= new Date()) { toast.error("⚠️ Fecha debe ser futura."); setLoading(false); return; }
            schedulePayload = { runAt: dateCheck.toISOString(), timezone: zona };
        } catch (err) { toast.error("Error al calcular fecha."); setLoading(false); return; }
    }

    const payload = {
      organizationId: 1, 
      title,
      body,
      category, // 👈 Global
      visible,  // 👈 Global
      variants,
      medias: medias.sort((a, b) => a.order - b.order).map((m) => ({
          base64: m.base64, type: m.type, order: m.order,
        })),
      schedule: schedulePayload,
    };

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (json.ok) {
      toast.success(agendar ? "📅 Agendado correctamente" : "✅ Creado correctamente");
      setTitle(""); setBody(""); setMedias([]); setAgendar(false); setFecha("");
      setCategory("Otro"); setVisible(false);
      setVariants([{ network: "INSTAGRAM", text: "" }]);
    } else {
      toast.error("❌ Error: " + (json.error || "Fallo al crear"));
    }
    setLoading(false);
  }

  function getOffsetForZone(timeZone: string): string {
    const date = new Date();
    const timeString = date.toLocaleString('en-US', { timeZone, timeZoneName: 'shortOffset' });
    const offsetPart = timeString.split('GMT')[1]; 
    if (!offsetPart) return "Z"; 
    let [hours, minutes] = offsetPart.split(':');
    if (!minutes) minutes = "00";
    const sign = hours.includes('-') ? '-' : '+';
    hours = hours.replace('+', '').replace('-', '').padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
  }

  function removeVariant(index: number) {
    setVariants(variants.filter((_, i) => i !== index));
    setMedias([]); 
  }

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...variants];
    // @ts-ignore
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const usedNetworks = variants.map((v) => v.network);
  const availableNetworks = ALL_NETWORKS.filter((net) => !usedNetworks.includes(net));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 text-white py-10 px-6">
      <div className="max-w-4xl mx-auto">
        {session && (
          <div className="flex justify-between items-center mb-6">
             <p>👋 Hola, <span className="font-bold">{session.user?.name}</span></p>
             <div className="flex gap-3">
               <a href="/publicaciones" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition">📂 Biblioteca</a>
               <a href="/perfil" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition">👤 Perfil</a>
               <button onClick={() => signOut({ callbackUrl: "/" })} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition">🚪 Salir</button>
             </div>
          </div>
        )}

        <h1 className="text-4xl font-bold mb-8 text-center tracking-tight">Crear nueva publicación</h1>

        <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-2xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* SECCIÓN PRINCIPAL */}
            <div className="space-y-4">
                <input
                  className="w-full p-4 rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/40 focus:bg-black/40 outline-none"
                  placeholder="Título interno..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <textarea
                        className="w-full p-4 rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/40 focus:bg-black/40 outline-none h-40 resize-none"
                        placeholder="Texto principal..."
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        required
                        />
                    </div>
                    
                    {/* CONFIGURACIÓN GLOBAL (Categoría y Visibilidad) */}
                    <div className="md:w-64 flex flex-col gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                        {/* Categoría */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Categoría</label>
                            <select 
                                value={category} 
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full p-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:bg-black/40 outline-none"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat} className="bg-gray-900 text-white">{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Visibilidad */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Visibilidad</label>
                            <div className="flex items-center gap-2 relative group">
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-white select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={visible}
                                        onChange={(e) => setVisible(e.target.checked)}
                                        className="w-4 h-4 accent-green-500 rounded"
                                    />
                                    Mostrar en Feed
                                </label>
                                
                                {/* Icono Info con Tooltip */}
                                <div className="bg-white/20 text-white/80 rounded-full w-4 h-4 flex items-center justify-center text-xs cursor-help font-serif italic">i</div>
                                <div className="absolute bottom-full right-0 mb-2 w-64 bg-black/95 border border-white/20 text-xs text-white p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                                    Si tu publicación está configurada como visible otros usuarios podrán ver las publicaciones que has realizado a través de UniPost en el feed presente en el inicio. Asegúrate de que el contenido que definas visible cumpla con los términos y condiciones respecto al contenido en nuestra plataforma.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Multimedia */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
              <label className="block text-sm font-bold mb-3 text-gray-200">📎 Multimedia</label>
              <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-500 file:text-white cursor-pointer" />
              {medias.length > 0 && (
                <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                  {medias.sort((a, b) => a.order - b.order).map((m, index) => (
                      <div key={m.id} className="relative min-w-[150px] max-w-[150px] aspect-square border border-white/20 bg-black/40 rounded-xl flex flex-col items-center justify-center overflow-hidden group">
                        <span className="absolute top-1 left-2 text-xs bg-black/70 px-2 py-0.5 rounded-full z-10">#{index + 1}</span>
                        {m.type === "video" ? <video src={m.previewUrl} className="w-full h-full object-cover opacity-80" /> : <img src={m.previewUrl} alt="prev" className="w-full h-full object-cover opacity-80" />}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button type="button" onClick={() => moveMedia(index, "left")} disabled={index === 0} className="p-1 text-gray-300 hover:text-white">◀</button>
                          <button type="button" onClick={() => removeMedia(index)} className="p-1 bg-red-500/80 rounded-full text-white text-xs">🗑️</button>
                          <button type="button" onClick={() => moveMedia(index, "right")} disabled={index === medias.length - 1} className="p-1 text-gray-300 hover:text-white">▶</button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Redes */}
            <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-200">🌍 Variantes por Red</label>
                {variants.map((v, i) => (
                  <div key={i} className="flex gap-3 items-start bg-black/20 p-4 rounded-xl border border-white/10 animate-in slide-in-from-left-2">
                    <select
                      value={v.network}
                      onChange={(e) => updateVariant(i, "network", e.target.value)}
                      className="p-3 bg-black/20 border border-white/10 text-white rounded-lg w-32"
                    >
                      <option>INSTAGRAM</option>
                      <option>BLUESKY</option>
                      <option>FACEBOOK</option>
                    </select>
                    <textarea
                      value={v.text}
                      onChange={(e) => updateVariant(i, "text", e.target.value)}
                      placeholder={`Texto específico para ${v.network} (opcional)`}
                      rows={2}
                      className="flex-1 p-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-white/30 resize-none overflow-hidden"
                      style={{ minHeight: "50px" }}
                    />
                    {variants.length > 1 && (
                      <button type="button" onClick={() => removeVariant(i)} className="p-3 bg-red-500/20 text-red-200 rounded-lg hover:bg-red-500/40 transition">✕</button>
                    )}
                  </div>
                ))}
            </div>

            {availableNetworks.length > 0 && (
              <div className="flex gap-2">
                 <select id="newNetwork" className="p-2 bg-white/10 border border-white/20 rounded-lg text-sm text-black" defaultValue="">
                    <option value="" disabled>Otra red...</option>
                    {availableNetworks.map(r => <option key={r} value={r}>{r}</option>)}
                 </select>
                 <button type="button" onClick={() => {
                    const select = document.getElementById("newNetwork") as HTMLSelectElement;
                    if(select.value) { 
                        setVariants([...variants, { network: select.value, text: "" }]); 
                        select.value = ""; 
                    }
                 }} className="text-sm bg-green-500/20 text-green-300 px-3 py-2 rounded-lg hover:bg-green-500/30 transition">
                    + Agregar
                 </button>
              </div>
            )}

            {/* Scheduler */}
            <div className="pt-4 border-t border-white/10">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 transition w-fit">
                <input type="checkbox" checked={agendar} onChange={() => setAgendar(!agendar)} className="w-5 h-5 accent-indigo-500" />
                <span className="font-bold">📅 Programar publicación</span>
              </label>
              
              {agendar && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-black/20 rounded-xl border border-white/5 animate-in slide-in-from-top-2">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Fecha</label>
                    <input type="date" value={fecha} min={new Date().toISOString().split("T")[0]} onChange={(e) => setFecha(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Hora</label>
                    <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Zona</label>
                    <select value={zona} onChange={(e) => setZona(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm">
                      {TIMEZONES.map((tz) => <option key={tz.id} value={tz.id} className="text-black">{tz.label} ({getTimeInZone(tz.id)})</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button disabled={loading} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition disabled:opacity-50 transform active:scale-[0.99]">
              {loading ? "Procesando..." : agendar ? "📅 Agendar Publicación" : "🚀 Publicar Ahora"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}