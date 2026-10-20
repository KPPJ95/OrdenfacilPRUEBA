import React from 'react';
import {
  BarChart3,
  Bot,
  UserCheck,
  Clock,
  TrendingUp,
  ShieldAlert,
  DollarSign,
  MessageSquare,
  Sparkles,
  Award
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';

export const AnalyticsView: React.FC = () => {
  const { leads, messages, rules } = useCrm();

  // Aggregate message metrics
  let totalMessagesCount = 0;
  let aiMessagesCount = 0;
  let agentMessagesCount = 0;
  let customerMessagesCount = 0;
  let handoverCount = 0;

  Object.values(messages).forEach((chat) => {
    chat.forEach((m) => {
      totalMessagesCount++;
      if (m.sender === 'ai') aiMessagesCount++;
      if (m.sender === 'agent') agentMessagesCount++;
      if (m.sender === 'user') customerMessagesCount++;
      if (m.handoverTriggered) handoverCount++;
    });
  });

  const aiAutomationRate =
    aiMessagesCount + agentMessagesCount > 0
      ? Math.round((aiMessagesCount / (aiMessagesCount + agentMessagesCount)) * 100)
      : 88;

  const totalWonValue = leads
    .filter((l) => l.stage === 'ganado')
    .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

  const totalPipelineValue = leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

  // Leads by stage breakdown
  const stagesBreakdown = [
    { label: 'Nuevo Lead', stage: 'nuevo', color: 'bg-blue-500' },
    { label: 'Contactado', stage: 'contactado', color: 'bg-slate-400' },
    { label: 'Interesado', stage: 'interesado', color: 'bg-amber-500' },
    { label: 'Cotizado', stage: 'cotizado', color: 'bg-purple-500' },
    { label: 'Venta Ganada', stage: 'ganado', color: 'bg-emerald-500' },
    { label: 'Perdido', stage: 'perdido', color: 'bg-rose-500' }
  ].map((item) => {
    const count = leads.filter((l) => l.stage === item.stage).length;
    const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
    return { ...item, count, pct };
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Métricas de Automatización & Desempeño Comercial
              </h1>
              <p className="text-xs text-slate-400">
                Analítica en tiempo real de los mensajes respondidos por la IA, ahorro de tiempo y conversión de clientes.
              </p>
            </div>
          </div>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Tasa de Respuestas IA</span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Bot className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">{aiAutomationRate}%</div>
            <p className="text-[11px] text-slate-400">
              {aiMessagesCount} respuestas generadas por IA sin tocar teclado
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Tiempo Medio de Respuesta</span>
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-blue-400">1.4 seg</div>
            <p className="text-[11px] text-slate-400">
              vs. 42 minutos de promedio de un asesor humano
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Volumen de Pipeline</span>
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-purple-400">${totalPipelineValue} USD</div>
            <p className="text-[11px] text-slate-400">
              ${totalWonValue} USD en ventas cerradas exitosamente
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Traspasos a Humano</span>
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldAlert className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-amber-400">{handoverCount} casos</div>
            <p className="text-[11px] text-slate-400">
              Derivados según normativas estrictas de seguridad
            </p>
          </div>
        </div>

        {/* Funnel & Conversion Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* CRM Stages Distribution */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Distribución de Clientes en el Embudo CRM
            </h3>

            <div className="space-y-3">
              {stagesBreakdown.map((item) => (
                <div key={item.stage} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{item.label}</span>
                    <span className="text-slate-400">
                      {item.count} leads ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(item.pct, 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special Rules Activity & Safety */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Normativas para Casos Especiales Activas ({rules.length})
            </h3>
            <p className="text-xs text-slate-400">
              Reglas prioritarias que gobiernan las respuestas del bot en WhatsApp:
            </p>

            <div className="space-y-2.5">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-white truncate">{rule.title}</h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {rule.triggers.slice(0, 3).join(', ')}...
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${
                      rule.action === 'handover'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {rule.action === 'handover' ? 'Traspaso Humano' : 'Normativa de Venta'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
