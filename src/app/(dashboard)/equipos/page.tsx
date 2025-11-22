"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

type Metrics = {
    likes: number;
    comments: number;
    publishedPosts: number;
    organizationId: number;
};

type Organization = {
    id: number;
    name: string;
    plan: string;
};

type Member = {
    id: number;
    name: string;
    email: string;
    roleId: number;
    totalPosts: number;
    totalLikes: number;
};

type OrphanUser = {
    id: number;
    name: string;
    email: string;
    roleId: number;
};

export default function EquiposPage() {
    const { data: session } = useSession();

    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [members, setMembers] = useState<Member[]>([]);

    const [orphanedUsers, setOrphanedUsers] = useState<OrphanUser[]>([]);
    const [targetOrgForOrphan, setTargetOrgForOrphan] = useState<{ [userId: number]: string }>({});

    const [selectedOrgId, setSelectedOrgId] = useState<number | "">("");
    const [newOrgName, setNewOrgName] = useState("");
    const [newOrgPlan, setNewOrgPlan] = useState("FREE");

    const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
    const [targetOrgForMove, setTargetOrgForMove] = useState<string>("");

    useEffect(() => {
        fetchData();
    }, [selectedOrgId]);

    async function fetchData() {
        setLoading(true);
        let url = "/api/organizations";
        if (selectedOrgId) {
            url += `?orgId=${selectedOrgId}`;
        }

        const res = await fetch(url);
        const json = await res.json();

        if (json.ok) {
            setIsSuperAdmin(json.data.isSuperAdmin);

            if (json.data.organizations) setOrganizations(json.data.organizations);

            if (json.data.metrics) {
                setMetrics(json.data.metrics);
            } else {
                setMetrics(null);
            }

            if (json.data.members) {
                setMembers(json.data.members);
            } else {
                setMembers([]);
            }

            if (json.data.orphanedUsers) {
                setOrphanedUsers(json.data.orphanedUsers);
            }
        } else {
            toast.error("Error cargando datos de equipo");
        }
        setLoading(false);
    }

    // ... (Funciones handleCreateOrg y handleDeleteOrg se mantienen igual) ...
    async function handleCreateOrg(e: React.FormEvent) {
        e.preventDefault();
        if (!newOrgName) return;

        const res = await fetch("/api/organizations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newOrgName, plan: newOrgPlan }),
        });
        const json = await res.json();

        if (json.ok) {
            toast.success("Organización creada ✅");
            setNewOrgName("");
            fetchData(); // Recargar lista
        } else {
            toast.error("Error al crear organización");
        }
    }

    async function handleDeleteOrg(id: number) {
        if (!confirm("¿Seguro que deseas eliminar esta organización? Esto podría romper usuarios asociados.")) return;

        const res = await fetch(`/api/organizations?id=${id}`, { method: "DELETE" });
        const json = await res.json();

        if (json.ok) {
            toast.success("Organización eliminada 🗑️");
            if (selectedOrgId === id) setSelectedOrgId(""); // Resetear selección si borramos la actual
            fetchData();
        } else {
            toast.error("No se pudo eliminar (verifica dependencias)");
        }
    }

    async function handleMoveUser(userId: number) {
        if (!targetOrgForMove) return;

        const res = await fetch("/api/organizations", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, newOrgId: targetOrgForMove })
        });

        const json = await res.json();

        if (json.ok) {
            toast.success("Usuario transferido exitosamente ✈️");
            setEditingMemberId(null);
            setTargetOrgForMove("");
            // Recargamos para ver que el usuario desaparece de esta lista (porque se fue a otra org)
            fetchData();
        } else {
            toast.error(json.error || "Error al mover usuario");
        }
    }

    async function handleAssignOrphan(userId: number) {
    const orgId = targetOrgForOrphan[userId];
    if (!orgId) return;

    const res = await fetch("/api/organizations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newOrgId: orgId })
    });

    const json = await res.json();
    if (json.ok) {
        toast.success("Usuario asignado correctamente ✅");
        // Limpiar selección local
        setTargetOrgForOrphan(prev => {
            const copy = { ...prev };
            delete copy[userId];
            return copy;
        });
        fetchData(); 
    } else {
        toast.error(json.error || "Error al asignar");
    }
  }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 text-white py-10 px-6">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Panel de Equipos</h1>
                        <p className="text-white/70 mt-2">
                            {isSuperAdmin
                                ? "Modo Administrador Global"
                                : "Vista de Miembro de Organización"}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">{session?.user?.name || session?.user?.email}</p>
                    </div>
                </div>

                {/* 👑 SECCIÓN SUPER ADMIN: Gestión de Organizaciones */}
                {isSuperAdmin && (
                    <div className="mb-10 backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            🏢 Gestión de Organizaciones
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Selector y Lista */}
                            <div>
                                <label className="block text-sm mb-2 text-gray-300">Seleccionar Organización para ver métricas:</label>
                                <select
                                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white mb-4 focus:bg-indigo-900 transition"
                                    value={selectedOrgId}
                                    onChange={(e) => setSelectedOrgId(Number(e.target.value))}
                                >
                                    <option value="">-- Selecciona una organización --</option>
                                    {organizations.map(org => (
                                        <option key={org.id} value={org.id}>{org.name} (ID: {org.id})</option>
                                    ))}
                                </select>

                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                    {organizations.map(org => (
                                        <div key={org.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                                            <span className="text-sm">{org.name} <span className="text-xs text-gray-400">({org.plan})</span></span>
                                            <button
                                                onClick={() => handleDeleteOrg(org.id)}
                                                className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-200 px-2 py-1 rounded transition"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Formulario Crear */}
                            <div className="border-l border-white/10 pl-8">
                                <h3 className="text-lg font-semibold mb-3">Crear Nueva Organización</h3>
                                <form onSubmit={handleCreateOrg} className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Nombre de la organización"
                                        className="w-full p-2 rounded bg-white/10 border border-white/20 placeholder-gray-400 text-white"
                                        value={newOrgName}
                                        onChange={e => setNewOrgName(e.target.value)}
                                        required
                                    />
                                    <select
                                        className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
                                        value={newOrgPlan}
                                        onChange={e => setNewOrgPlan(e.target.value)}
                                    >
                                        <option value="FREE">Plan FREE</option>
                                        <option value="PRO">Plan PRO</option>
                                        <option value="ENTERPRISE">Plan ENTERPRISE</option>
                                    </select>
                                    <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded transition">
                                        + Crear Organización
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

{orphanedUsers.length > 0 && (
              <div className="mb-10 backdrop-blur-xl bg-orange-500/10 border border-orange-500/30 p-6 rounded-2xl shadow-lg animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-orange-200">
                  ⚠️ Usuarios sin Organización
                  <span className="text-sm bg-orange-500/20 px-2 py-1 rounded-full text-white">{orphanedUsers.length}</span>
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-orange-200/60 border-b border-orange-500/20 text-sm uppercase">
                        <th className="p-3">Usuario</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3 text-right">Asignar a Equipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-500/10">
                      {orphanedUsers.map(user => (
                        <tr key={user.id} className="hover:bg-orange-500/5 transition">
                          <td className="p-3">
                            <div className="font-bold">{user.name || "Sin nombre"}</div>
                            <div className="text-sm text-white/50">{user.email}</div>
                          </td>
                          <td className="p-3">
                             <span className="text-xs border border-orange-500/30 px-2 py-1 rounded text-orange-200">
                               ID: {user.roleId}
                             </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <select 
                                className="text-sm bg-black/20 border border-orange-500/30 rounded px-2 py-1.5 text-white focus:outline-none focus:border-orange-500"
                                value={targetOrgForOrphan[user.id] || ""}
                                onChange={(e) => setTargetOrgForOrphan({
                                    ...targetOrgForOrphan, 
                                    [user.id]: e.target.value
                                })}
                              >
                                <option value="">Seleccionar Org...</option>
                                {organizations.map(org => (
                                  <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => handleAssignOrphan(user.id)}
                                disabled={!targetOrgForOrphan[user.id]}
                                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-sm font-semibold transition"
                              >
                                Asignar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

                {/* 📊 SECCIÓN DE MÉTRICAS */}
                {loading ? (
                    <div className="text-center py-10 animate-pulse">Cargando datos del equipo...</div>
                ) : metrics ? (
                    <div className="space-y-10">
                        {/* 1. Tarjetas de Totales */}
                        <div>
                            <h2 className="text-2xl font-bold mb-6 border-b border-white/20 pb-2">
                                📊 Métricas Globales {isSuperAdmin && metrics.organizationId && <span className="text-indigo-300 ml-2">(Org ID: {metrics.organizationId})</span>}
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="backdrop-blur-md bg-white/5 border border-white/10 p-6 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-pink-500/20 rounded-lg text-pink-300 text-2xl">❤️</div>
                                        <div>
                                            <p className="text-sm text-gray-300 uppercase font-bold tracking-wider">Total Likes</p>
                                            <p className="text-4xl font-bold">{metrics.likes}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="backdrop-blur-md bg-white/5 border border-white/10 p-6 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/20 rounded-lg text-blue-300 text-2xl">💬</div>
                                        <div>
                                            <p className="text-sm text-gray-300 uppercase font-bold tracking-wider">Total Comentarios</p>
                                            <p className="text-4xl font-bold">{metrics.comments}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="backdrop-blur-md bg-white/5 border border-white/10 p-6 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-green-500/20 rounded-lg text-green-300 text-2xl">🚀</div>
                                        <div>
                                            <p className="text-sm text-gray-300 uppercase font-bold tracking-wider">Posts Publicados</p>
                                            <p className="text-4xl font-bold">{metrics.publishedPosts}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>



                        {/* 👥 TABLA DE MIEMBROS CON GESTIÓN */}
                        <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg">
                            <h2 className="text-2xl font-bold mb-4">👥 Gestión de Miembros</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-white/60 border-b border-white/10 text-sm uppercase">
                                            <th className="p-4">Usuario</th>
                                            <th className="p-4 text-center">Stats</th>
                                            {/* 👇 Columna extra solo para Super Admin */}
                                            {isSuperAdmin && <th className="p-4 text-right">Acciones Admin</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {members.map((member) => (
                                            <tr key={member.id} className="hover:bg-white/5 transition">
                                                <td className="p-4">
                                                    <div className="font-bold">{member.name}</div>
                                                    <div className="text-sm text-white/50">{member.email}</div>
                                                    <span className="text-xs bg-black/20 px-2 py-0.5 rounded text-white/40">Rol: {member.roleId}</span>
                                                </td>
                                                <td className="p-4 text-center text-sm">
                                                    <div>📝 {member.totalPosts} posts</div>
                                                    <div>❤️ {member.totalLikes} likes</div>
                                                </td>

                                                {/* 👇 Lógica de Gestión para Super Admins */}
                                                {isSuperAdmin && (
                                                    <td className="p-4 text-right">
                                                        {/* Solo permitimos editar si el usuario es Rol 1, 2 o 3 */}
                                                        {member.roleId <= 3 ? (
                                                            editingMemberId === member.id ? (
                                                                <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-4">
                                                                    <select
                                                                        className="text-sm bg-white/20 border border-white/30 rounded px-2 py-1 text-white focus:bg-indigo-900"
                                                                        value={targetOrgForMove}
                                                                        onChange={(e) => setTargetOrgForMove(e.target.value)}
                                                                        autoFocus
                                                                    >
                                                                        <option value="">Destino...</option>
                                                                        {organizations
                                                                            .filter(o => o.id !== metrics.organizationId) // Excluir org actual
                                                                            .map(o => (
                                                                                <option key={o.id} value={o.id}>{o.name}</option>
                                                                            ))}
                                                                    </select>
                                                                    <button
                                                                        onClick={() => handleMoveUser(member.id)}
                                                                        disabled={!targetOrgForMove}
                                                                        className="bg-green-500 hover:bg-green-600 p-1.5 rounded text-white disabled:opacity-50"
                                                                        title="Guardar cambio"
                                                                    >
                                                                        💾
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setEditingMemberId(null); setTargetOrgForMove(""); }}
                                                                        className="bg-red-500/50 hover:bg-red-500 p-1.5 rounded text-white"
                                                                        title="Cancelar"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setEditingMemberId(member.id)}
                                                                    className="text-xs bg-indigo-500/30 hover:bg-indigo-500 border border-indigo-500/50 px-3 py-1.5 rounded transition"
                                                                >
                                                                    🔁 Mover
                                                                </button>
                                                            )
                                                        ) : (
                                                            <span className="text-xs text-white/20 italic">No editable</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-white/50 mt-10">Selecciona una organización para ver detalles.</p>
                )}
            </div>
        </div>
    );
}