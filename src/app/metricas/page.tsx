"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Metric = {
  id: number;
  network: string;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  collectedAt: string;
  post: { title: string };
};

export default function MetricasPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setMetrics(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Agrupar likes, comentarios y shares por red para el gráfico
  const chartData = Object.values(
    metrics.reduce((acc: any, m) => {
      if (!acc[m.network])
        acc[m.network] = { network: m.network, likes: 0, comments: 0, shares: 0 };
      acc[m.network].likes += m.likes;
      acc[m.network].comments += m.comments;
      acc[m.network].shares += m.shares;
      return acc;
    }, {})
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-700 to-fuchsia-600 text-white p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <h1 className="text-4xl font-bold text-center mb-8">
          📈 Dashboard de Métricas
        </h1>

        {/* Navegación superior */}
        <div className="flex justify-center gap-4 mb-8">
          <a
            href="/perfil"
            className="bg-white/20 hover:bg-white/30 text-sm px-5 py-2 rounded-lg transition"
          >
            👤 Volver al perfil
          </a>
          <a
            href="/composer"
            className="bg-white/20 hover:bg-white/30 text-sm px-5 py-2 rounded-lg transition"
          >
            ✏️ Ir al Composer
          </a>
        </div>

        {/* Contenido */}
        {loading ? (
          <p className="text-center text-gray-200">Cargando métricas...</p>
        ) : metrics.length === 0 ? (
          <p className="text-center text-gray-300">
            Aún no hay métricas registradas.
          </p>
        ) : (
          <>
            {/* Tabla */}
            <div className="overflow-x-auto backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">📋 Detalle de publicaciones</h2>
              <table className="w-full text-sm text-left text-white/90">
                <thead>
                  <tr className="border-b border-white/30 text-white/80">
                    <th className="py-2">Publicación</th>
                    <th>Red</th>
                    <th>❤️ Likes</th>
                    <th>💬 Comentarios</th>
                    <th>🔁 Shares</th>
                    <th>👀 Alcance</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-2">{m.post.title}</td>
                      <td>{m.network}</td>
                      <td>{m.likes}</td>
                      <td>{m.comments}</td>
                      <td>{m.shares}</td>
                      <td>{m.impressions}</td>
                      <td>{new Date(m.collectedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gráfico */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-semibold mb-6 text-center">📊 Interacciones por red</h3>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="network" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        borderRadius: "10px",
                      }}
                      cursor={{ fill: "rgba(255,255,255,0.1)" }}
                    />
                    <Bar dataKey="likes" fill="#f9a8d4" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="comments" fill="#a5b4fc" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="shares" fill="#c4b5fd" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
