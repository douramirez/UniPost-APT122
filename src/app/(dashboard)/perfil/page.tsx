"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";
import CuentasConectadas from "@/components/CuentasConectadas";

export default function PerfilPage() {
  const { data: session, update } = useSession(); 
  const userEmail = session?.user?.email;

  const [activeTab, setActiveTab] = useState<"cuentas" | "perfil">("cuentas");

  // Estados Perfil
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // 🏢 Estado para el nombre de la Organización
  const [orgName, setOrgName] = useState<string>("Cargando...");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos iniciales
  useEffect(() => {
    if (session?.user?.name) setNewName(session.user.name);
    if (session?.user?.image) setPreviewUrl(session.user.image);
  }, [session]);

  // 🏢 Efecto para obtener el nombre de la organización
  useEffect(() => {
    if (!session?.user?.email) return;

    async function fetchOrg() {
        try {
            // Llamamos a la API de equipos (que devuelve info de la org del usuario)
            // Si esta ruta no te devuelve el nombre directo, podrías crear una ruta simple /api/user/me
            // Pero usaremos la lógica de equipos que ya tienes.
            const res = await fetch("/api/organizations"); // O /api/equipos según tu ruta
            const json = await res.json();
            
            if (json.ok && json.data.userOrgId) {
                // Si tiene ID, buscamos el nombre en la lista o usamos un dato directo si la API lo provee
                // Si la API /api/organizations devuelve "metrics.organizationName" sería ideal.
                // Si no, asumimos que si hay organizations listadas (admin) lo sacamos de ahí,
                // o si eres miembro, la API debería devolver el nombre de TU org.
                
                // Opción A: Si la API devuelve el nombre directo (Ideal)
                if (json.data.organizationName) {
                    setOrgName(json.data.organizationName);
                } 
                // Opción B: Si devuelve lista de orgs y eres admin
                else if (json.data.organizations) {
                    const myOrg = json.data.organizations.find((o: any) => o.id === json.data.userOrgId);
                    setOrgName(myOrg ? myOrg.name : "Independiente");
                }
                // Opción C: Fallback seguro (Si solo tenemos ID y no nombre, podrías necesitar ajustar la API)
                else {
                    // Si no podemos resolver el nombre aquí, mostramos "Mi Organización" o pedimos ajustar API
                    // Para este ejemplo, asumiremos que "Independiente" es el default si no hay ID
                    setOrgName("Mi Organización"); 
                }
            } else {
                setOrgName("Independiente");
            }
        } catch (e) {
            setOrgName("Independiente");
        }
    }
    fetchOrg();
  }, [session]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      setPreviewUrl(URL.createObjectURL(file)); 
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData();
    formData.append("name", newName);
    if (newImage) {
      formData.append("file", newImage);
    }

    try {
      const res = await fetch("/api/profile/update", {
        method: "PUT",
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        toast.success("Perfil actualizado correctamente ✅");
        await update({
          ...session,
          user: {
            ...session?.user,
            name: data.user.name,
            image: data.user.image,
          },
        });
      } else {
        toast.error("Error: " + data.error);
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-700 to-fuchsia-800 text-white p-10">
      <div className="max-w-6xl mx-auto text-center">
        {session ? (
          <>
            {/* --- HEADER --- */}
            <div className="relative inline-block group">
              <img
                src={previewUrl || session.user?.image || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                alt="avatar"
                className="mx-auto w-28 h-28 rounded-full border-4 border-white/30 shadow-lg mb-4 object-cover"
              />
            </div>
            
            <h1 className="text-3xl font-bold mb-1">
              👋 {session.user?.name || session.user?.email}
            </h1>
            
            {/* 🏢 NOMBRE DE ORGANIZACIÓN DINÁMICO */}
            <p className="text-white/70 mb-6 text-lg font-medium bg-white/10 inline-block px-4 py-1 rounded-full">
              {orgName}
            </p>

            {/* --- BOTONES DE ACCIÓN RÁPIDA --- */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <a href="/composer" className="bg-white/20 hover:bg-white/30 text-sm px-5 py-2 rounded-lg transition">✏️ Ir al Composer</a>
              <a href="/metricas" className="bg-white/20 hover:bg-white/30 text-sm px-5 py-2 rounded-lg transition">📊 Ver métricas</a>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="bg-white/20 hover:bg-white/30 text-sm px-5 py-2 rounded-lg transition">🚪 Cerrar sesión</button>
            </div>

            {/* --- NAVEGACIÓN --- */}
            <div className="flex justify-center gap-2 mb-8 border-b border-white/10 pb-1">
              <button onClick={() => setActiveTab("cuentas")} className={`px-6 py-2 rounded-t-lg font-bold transition-all ${activeTab === "cuentas" ? "bg-white/20 text-white border-b-2 border-white" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>🔗 Cuentas Conectadas</button>
              <button onClick={() => setActiveTab("perfil")} className={`px-6 py-2 rounded-t-lg font-bold transition-all ${activeTab === "perfil" ? "bg-white/20 text-white border-b-2 border-white" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>👤 Datos de Perfil</button>
            </div>

            {/* --- CONTENIDO --- */}
            {activeTab === "cuentas" && <CuentasConectadas userEmail={userEmail} />}

            {activeTab === "perfil" && (
              <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/10 text-left">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">👤 Editar Perfil</h2>
                  
                  <form className="space-y-6" onSubmit={handleSaveProfile}>
                    
                    <div className="flex flex-col items-center mb-6">
                      <div 
                        className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                      >
                         <img 
                           src={previewUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                           className="w-full h-full object-cover" 
                           alt="Preview" 
                         />
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-bold">CAMBIAR</div>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                      <p className="text-xs text-white/50 mt-2">Click en la imagen para cambiarla</p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Nombre de Usuario</label>
                      <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-3 rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:border-white/50" />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Correo Electrónico</label>
                      <input type="email" defaultValue={session.user?.email || ""} disabled className="w-full p-3 rounded bg-black/40 border border-white/5 text-white/50 cursor-not-allowed" />
                    </div>

                    <div className="flex justify-end pt-4">
                      <button disabled={isSaving} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold shadow-lg transition flex items-center gap-2">
                        {isSaving ? "Guardando..." : "💾 Guardar Cambios"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-white/80">Inicia sesión para ver tu perfil.</p>
        )}
      </div>
    </div>
  );
}