import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "../hooks/useDashboard";
import type { ChatSession } from "../types";

interface Props {
  sessions: ChatSession[];
}

const GRID = "#374151";
const AXIS = "#6b7280";
const BAR = "#3b82f6";

const LEVEL_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  principiante: { label: "Principiante", color: "text-green-400", bg: "bg-green-950", border: "border-green-800" },
  intermedio:   { label: "Intermedio",   color: "text-blue-400",  bg: "bg-blue-950",  border: "border-blue-800"  },
  avanzado:     { label: "Avanzado",     color: "text-orange-400", bg: "bg-orange-950", border: "border-orange-800" },
};

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex gap-3 items-start">
      <span className="text-2xl mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-100 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-blue-400 font-semibold">{payload[0].value} preguntas</p>
    </div>
  );
}

function DocTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-300 mb-1">{label}</p>
      <p className="text-blue-400 font-semibold">{payload[0].value} consultas</p>
    </div>
  );
}

export function Dashboard({ sessions }: Props) {
  const stats = useDashboard(sessions);

  if (stats.totalSessions === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-gray-950">
        <div className="text-5xl mb-4">📊</div>
        <p className="text-lg font-medium text-gray-300">Sin datos todavía</p>
        <p className="text-sm mt-2 text-gray-500 max-w-sm">
          Empieza a usar el tutor y aquí aparecerán tus estadísticas de
          aprendizaje.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 px-5 py-5">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        Dashboard de aprendizaje
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          icon="💬"
          label="Sesiones"
          value={stats.totalSessions}
          sub="conversaciones"
        />
        <StatCard
          icon="❓"
          label="Preguntas"
          value={stats.totalQuestions}
          sub="mensajes enviados"
        />
        <StatCard
          icon="📅"
          label="Días activo"
          value={stats.activeDays}
          sub="días con actividad"
        />
        <StatCard
          icon="🏆"
          label="Racha máx."
          value={stats.maxQuestionsInSession}
          sub="preguntas en 1 sesión"
        />
      </div>

      {/* Actividad chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Actividad — últimos 14 días
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={stats.activityLast14Days}
            barSize={18}
            margin={{ top: 0, right: 4, left: -12, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={GRID}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: AXIS, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: AXIS, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<DarkTooltip />} cursor={{ fill: "#1f2937" }} />
            <Bar dataKey="preguntas" fill={BAR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Documentos más consultados */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Documentos más consultados
          </p>
          {stats.topDocuments.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-10">
              Sin fuentes registradas aún
            </p>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={Math.max(stats.topDocuments.length * 44, 80)}
            >
              <BarChart
                data={stats.topDocuments}
                layout="vertical"
                barSize={14}
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={GRID}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: AXIS, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="filename"
                  tick={{ fill: "#d1d5db", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  content={<DocTooltip />}
                  cursor={{ fill: "#1f2937" }}
                />
                <Bar dataKey="usos" fill={BAR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sesiones recientes */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Sesiones recientes
          </p>
          <div className="space-y-3">
            {stats.recentSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-start gap-3 border-b border-gray-800 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-200 truncate font-medium">
                    {s.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{s.date}</p>
                  {s.topDoc && (
                    <p
                      className="text-xs text-gray-600 truncate mt-0.5"
                      title={s.topDoc}
                    >
                      📄 {s.topDoc}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-xs font-bold text-blue-400 bg-blue-950 border border-blue-800 rounded-lg px-2 py-0.5 whitespace-nowrap">
                    {s.questions}❓
                  </span>
                  {(() => {
                    const badge = LEVEL_BADGE[s.level] ?? LEVEL_BADGE.intermedio;
                    return (
                      <span className={`text-xs font-semibold ${badge.color} ${badge.bg} border ${badge.border} rounded-lg px-2 py-0.5 whitespace-nowrap`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
