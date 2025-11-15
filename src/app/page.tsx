export default function HomePage() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-indigo-700 via-fuchsia-600 to-rose-500 text-white">
      {/* Top Nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20Zm0 3.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13Z"/></svg>
          </div>
          <span className="text-lg font-semibold tracking-wide">UniPost</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm md:flex">
  <a href="#features" className="opacity-90 transition hover:opacity-100">Características</a>
  <a href="#benefits" className="opacity-90 transition hover:opacity-100">Beneficios</a>
  <a href="#contact" className="opacity-90 transition hover:opacity-100">Contacto</a>

  {/* Botones de autenticación */}
  <div className="flex items-center gap-3">
    <a
      href="/login"
      className="rounded-xl border border-white/30 px-4 py-2 font-semibold text-white backdrop-blur-sm hover:bg-white/10 transition"
    >
      Iniciar sesión
    </a>
    <a
      href="/register"
      className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-900 shadow hover:shadow-lg transition"
    >
      Registrarse
    </a>
  </div>
</nav>

      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-10 md:pt-16">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-12 h-72 w-72 -translate-x-1/2 rounded-full bg-white/20 blur-3xl"/>
          <div className="absolute bottom-0 right-10 h-40 w-40 rounded-full bg-black/10 blur-2xl"/>
        </div>
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <span>⚡️ Nuevo</span>
              <span className="opacity-90">Publica en 4 redes con 1 clic</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight drop-shadow sm:text-6xl">
              Marketing que enamora. <span className="inline-block bg-white/90 px-2 text-slate-900">Un solo panel</span>,
              todas tus redes.
            </h1>
            <p className="mt-5 max-w-xl text-base/7 opacity-95 sm:text-lg/8">
              Ahorra horas cada semana con programación inteligente, publicaciones simultáneas y un flujo simple para equipos. UniPost es tu copiloto de Community Management.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="/composer" className="rounded-2xl bg-white px-6 py-3 text-base font-semibold text-slate-900 shadow-lg transition hover:translate-y-[-1px] hover:shadow-xl">Probar demo</a>
              <a href="#features" className="rounded-2xl border border-white/30 px-6 py-3 text-base font-semibold backdrop-blur transition hover:bg-white/10">Ver características</a>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs opacity-90">
              <div className="flex items-center gap-1"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
              <span>+300 equipos felices</span>
              <span>•</span>
              <span>Setup en 5 minutos</span>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur">
              <div className="rounded-2xl bg-slate-900/90 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-300">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500"/>
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400"/>
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"/>
                  <span className="ml-auto">Previsualización</span>
                </div>
                <div className="rounded-xl bg-white p-4 text-slate-900">
                  <div className="mb-2 text-xs font-semibold text-indigo-600">Composer</div>
                  <div className="mb-2 text-lg font-bold">Prepara un nuevo Post</div>
                  <div className="text-sm text-slate-600">Programa y publica en Instagram, Facebook, X y Bluesky al mismo tiempo.</div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                    {['IG','FB','X','BS'].map((k)=> (
                      <div key={k} className="rounded-lg bg-slate-100 px-2 py-3 text-center font-semibold">{k}</div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 p-3 text-center font-semibold text-white shadow">Programado: 10:30 AM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <p className="mb-6 text-center text-sm opacity-90">Confiado por equipos modernos</p>
        <div className="grid grid-cols-2 place-items-center gap-6 opacity-80 sm:grid-cols-3 md:grid-cols-6">
          {['Acme','Globex','Umbrella','Soylent','Initech','Stark'].map((n)=> (
            <div key={n} className="text-sm font-semibold tracking-wide">{n}</div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-center text-3xl font-extrabold sm:text-4xl">Todo lo que necesitas</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm opacity-90">Un flujo simple para crear, programar y publicar sin fricción.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {title:'Publicación multired',desc:'Instagram, Facebook, X y LinkedIn con un clic.'},
            {title:'Programación inteligente',desc:'Ajuste por zona horaria y reintentos automáticos.'},
            {title:'Roles y equipo',desc:'Colabora con aprobaciones y control de cambios.'},
          ].map((f)=> (
            <div key={f.title} className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur">
              <div className="mb-3 inline-flex rounded-lg bg-white/20 p-2 ring-1 ring-white/30">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M4 12a8 8 0 1116 0 8 8 0 01-16 0Zm3.5 0L11 15l5.5-6"/></svg>
              </div>
              <h3 className="text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm opacity-90">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits strip */}
      <section id="benefits" className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {kpi:'50%',label:'menos tiempo publicando'},
            {kpi:'5 min',label:'para tu primer post'},
            {kpi:'4 redes',label:'con un solo clic'},
          ].map((b)=> (
            <div key={b.kpi} className="rounded-2xl bg-black/20 px-6 py-8 text-center ring-1 ring-white/20">
              <div className="text-4xl font-black">{b.kpi}</div>
              <div className="mt-1 text-sm opacity-90">{b.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl bg-white/10 p-8 ring-1 ring-white/20 backdrop-blur">
          <div className="grid items-center gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-extrabold">Empieza gratis</h3>
              <p className="mt-1 text-sm opacity-90">Plan Free para 1 usuario y 2 cuentas sociales. Cambia al Pro cuando tu equipo crezca.</p>
            </div>
            <div className="text-center md:text-right">
              <a href="/composer" className="inline-block rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900 shadow-lg transition hover:translate-y-[-1px] hover:shadow-xl">Crear tu primer post</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-white/15 bg-black/20 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <p className="text-sm opacity-80">© {new Date().getFullYear()} UniPost. Todos los derechos reservados.</p>
          <nav className="flex items-center gap-5 text-sm opacity-90">
            <a href="#features" className="hover:opacity-100">Características</a>
            <a href="#pricing" className="hover:opacity-100">Precios</a>
            <a href="mailto:hola@unipost.fake" className="hover:opacity-100">Contacto</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
