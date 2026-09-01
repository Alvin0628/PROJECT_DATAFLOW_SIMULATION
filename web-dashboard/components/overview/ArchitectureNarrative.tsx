export default function ArchitectureNarrative() {
  return (
    <div className="space-y-8">
      {/* 1. HEADER & TECH PILLS */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
          Data Flow Simulation & MLOps Pipeline
        </h2>
        <p className="text-slate-500 mt-2 text-lg">
          End-to-end Machine Learning Operations with automated training and quality gates.
        </p>
        
        {/* Tech Stack Pills */}
        <div className="flex flex-wrap gap-2 mt-5">
          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-200 shadow-sm flex items-center gap-1.5">
            <span>⚡</span> Next.js 16 (App Router)
          </span>
          <span className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-md border border-red-200 shadow-sm flex items-center gap-1.5">
            <span>🌪️</span> Apache Airflow
          </span>
          <span className="px-3 py-1.5 bg-sky-50 text-sky-700 text-xs font-bold rounded-md border border-sky-200 shadow-sm flex items-center gap-1.5">
            <span>🐳</span> Docker (DooD)
          </span>
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200 shadow-sm flex items-center gap-1.5">
            <span>🐘</span> PostgreSQL (Medallion)
          </span>
          <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-md border border-purple-200 shadow-sm flex items-center gap-1.5">
            <span>🤖</span> ML Quality Gates
          </span>
        </div>
      </div>

      {/* 2. EXECUTIVE SUMMARY */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 leading-relaxed text-slate-600 text-sm">
        <p>
          Proyek ini mendemonstrasikan ekosistem MLOps produksi berskala penuh. Menggunakan pendekatan <strong>Medallion Architecture</strong>, 
          data mentah diproses dari tahap Bronze hingga Gold. Sistem secara otomatis mendeteksi perubahan data, memicu orkestrasi 
          pelatihan model <em>(Continuous Training)</em> di dalam kontainer terisolasi, mengevaluasinya melalui <em>Quality Gate</em> yang ketat, 
          dan menyajikannya menjadi wawasan bisnis yang <em>actionable</em> secara real-time.
        </p>
      </div>

      {/* 3. ARCHITECTURE DIAGRAM (CSS Grid Flow) */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 tracking-widest uppercase mb-4">Pipeline Architecture</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Box 1: Data Layer */}
          <div className="bg-white border-2 border-slate-100 rounded-xl p-5 shadow-sm hover:border-blue-300 transition-colors relative group">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-3">1</div>
            <h4 className="font-semibold text-slate-800 text-sm">Data Layer</h4>
            <p className="text-xs text-slate-500 mt-1 font-mono">Medallion Arch</p>
            <ul className="mt-3 text-xs text-slate-500 space-y-1">
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Bronze (Raw)</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Silver (Clean)</li>
              <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> Gold (Features)</li>
            </ul>
            {/* Panah (Hanya terlihat di desktop) */}
            <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 text-slate-300 z-10 group-hover:text-blue-400 transition-colors">➔</div>
          </div>

          {/* Box 2: Orchestrator */}
          <div className="bg-white border-2 border-slate-100 rounded-xl p-5 shadow-sm hover:border-red-300 transition-colors relative group">
            <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-bold mb-3">2</div>
            <h4 className="font-semibold text-slate-800 text-sm">Orchestrator</h4>
            <p className="text-xs text-slate-500 mt-1 font-mono">Apache Airflow</p>
            <ul className="mt-3 text-xs text-slate-500 space-y-1">
              <li>✓ Trigger DAGs</li>
              <li>✓ Task Routing</li>
              <li>✓ Error Handling</li>
            </ul>
            <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 text-slate-300 z-10 group-hover:text-red-400 transition-colors">➔</div>
          </div>

          {/* Box 3: ML Pipeline */}
          <div className="bg-white border-2 border-slate-100 rounded-xl p-5 shadow-sm hover:border-sky-300 transition-colors relative group">
            <div className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center font-bold mb-3">3</div>
            <h4 className="font-semibold text-slate-800 text-sm">ML Pipeline</h4>
            <p className="text-xs text-slate-500 mt-1 font-mono">Docker-out-of-Docker</p>
            <ul className="mt-3 text-xs text-slate-500 space-y-1">
              <li>✓ Train Model</li>
              <li>✓ Quality Gate Check</li>
              <li>✓ Save Metrics to DB</li>
            </ul>
            <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 text-slate-300 z-10 group-hover:text-sky-400 transition-colors">➔</div>
          </div>

          {/* Box 4: Serving */}
          <div className="bg-white border-2 border-slate-100 rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-colors relative">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold mb-3">4</div>
            <h4 className="font-semibold text-slate-800 text-sm">Serving</h4>
            <p className="text-xs text-slate-500 mt-1 font-mono">Next.js UI</p>
            <ul className="mt-3 text-xs text-slate-500 space-y-1">
              <li>✓ Fetch REST API</li>
              <li>✓ Actionable Insights</li>
              <li>✓ Dynamic Export</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}