import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Bot,
  User,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Sparkles,
  Phone,
  Tag,
  Building,
  ShieldAlert
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { LeadStage, Lead } from '../types/crm';

const STAGES: { id: LeadStage; title: string; color: string; border: string; bg: string }[] = [
  { id: 'nuevo', title: 'Nuevo Lead', color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-500/5' },
  { id: 'contactado', title: 'Contactado', color: 'text-slate-300', border: 'border-slate-500/40', bg: 'bg-slate-500/5' },
  { id: 'interesado', title: 'Interesado', color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/5' },
  { id: 'cotizado', title: 'Cotizado', color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-500/5' },
  { id: 'ganado', title: 'Venta Ganada 🎉', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/5' },
  { id: 'perdido', title: 'Perdido', color: 'text-rose-400', border: 'border-rose-500/40', bg: 'bg-rose-500/5' }
];

interface CrmPipelineProps {
  onOpenChat: (leadId: string) => void;
}

export const CrmPipeline: React.FC<CrmPipelineProps> = ({ onOpenChat }) => {
  const { leads, updateLeadStage, toggleLeadAi, deleteLead } = useCrm();
  const [search, setSearch] = useState('');
  const [filterAiOnly, setFilterAiOnly] = useState(false);

  // Pipeline Metrics
  const totalValue = leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  const wonValue = leads
    .filter((l) => l.stage === 'ganado')
    .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  const wonCount = leads.filter((l) => l.stage === 'ganado').length;
  const conversionRate = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;
  const aiManagedCount = leads.filter((l) => l.aiEnabled).length;

  const filteredLeads = leads.filter((lead) => {
    const matchesQuery =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.toLowerCase().includes(search.toLowerCase()) ||
      (lead.company && lead.company.toLowerCase().includes(search.toLowerCase())) ||
      lead.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    if (!matchesQuery) return false;
    if (filterAiOnly && !lead.aiEnabled) return false;

    return true;
  });

  const getStageNext = (current: LeadStage): LeadStage | null => {
    const order: LeadStage[] = ['nuevo', 'contactado', 'interesado', 'cotizado', 'ganado'];
    const idx = order.indexOf(current);
    if (idx >= 0 && idx < order.length - 1) return order[idx + 1];
    return null;
  };

  const getStagePrev = (current: LeadStage): LeadStage | null => {
    const order: LeadStage[] = ['nuevo', 'contactado', 'interesado', 'cotizado', 'ganado'];
    const idx = order.indexOf(current);
    if (idx > 0) return order[idx - 1];
    return null;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header & Pipeline KPIs */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Pipeline de Clientes & CRM Automatizado
            </h1>
            <p className="text-xs text-slate-400">
              Visualiza y gestiona las oportunidades. La IA califica y mueve automáticamente a los clientes según el chat de WhatsApp.
            </p>
          </div>
        </div>

        {/* KPI Mini Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Total Prospectos</span>
              <span className="text-lg font-extrabold text-white">{leads.length}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Pipeline Estimado</span>
              <span className="text-lg font-extrabold text-emerald-400">${totalValue} USD</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Ventas Ganadas</span>
              <span className="text-lg font-extrabold text-white">${wonValue} USD</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Atendidos por IA</span>
              <span className="text-lg font-extrabold text-emerald-400">
                {aiManagedCount} / {leads.length}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, empresa, teléfono o etiqueta..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <button
              onClick={() => setFilterAiOnly(!filterAiOnly)}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
                filterAiOnly
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Solo con Bot IA Activo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board Columns (Horizontal scroll) */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-4 bg-slate-950">
        {STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
          const stageTotal = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

          return (
            <div
              key={stage.id}
              className={`w-72 sm:w-80 flex-shrink-0 flex flex-col rounded-2xl border ${stage.border} ${stage.bg} bg-slate-900/50 overflow-hidden`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-xs ${stage.color}`}>{stage.title}</span>
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                    {stageLeads.length}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  ${stageTotal}
                </span>
              </div>

              {/* Cards List in this column */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {stageLeads.length === 0 ? (
                  <div className="h-32 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-500 text-xs text-center p-4">
                    Sin clientes en esta etapa
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const nextStage = getStageNext(lead.stage);
                    const prevStage = getStagePrev(lead.stage);

                    return (
                      <div
                        key={lead.id}
                        className="bg-slate-900/95 border border-slate-800 rounded-xl p-3.5 space-y-3 hover:border-slate-700 transition-all shadow-md group"
                      >
                        {/* Header: Avatar, Name & Bot Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={lead.avatar}
                              alt={lead.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs text-white truncate">
                                {lead.name}
                              </h4>
                              {lead.company && (
                                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                  <Building className="w-2.5 h-2.5" />
                                  {lead.company}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Value Pill */}
                          <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex-shrink-0">
                            ${lead.estimatedValue}
                          </span>
                        </div>

                        {/* Summary / Last Message */}
                        <p className="text-[11px] text-slate-300 line-clamp-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                          {lead.summary || lead.lastMessageText || 'Sin actividad'}
                        </p>

                        {/* Tags & AI badge */}
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1 flex-wrap">
                            {lead.aiEnabled ? (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-0.5"
                                title="Bot de IA activo respondiendo en WhatsApp"
                              >
                                <Bot className="w-2.5 h-2.5" />
                                Bot IA
                              </span>
                            ) : (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-semibold flex items-center gap-0.5"
                                title="Asesor humano requerido"
                              >
                                <ShieldAlert className="w-2.5 h-2.5" />
                                Humano
                              </span>
                            )}

                            {lead.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[80px]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions footer: Open WhatsApp + Move Stage */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                          <button
                            onClick={() => onOpenChat(lead.id)}
                            className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Abrir Chat</span>
                          </button>

                          <div className="flex items-center gap-1">
                            {prevStage && (
                              <button
                                onClick={() => updateLeadStage(lead.id, prevStage)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                title={`Mover a etapa anterior`}
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {nextStage && (
                              <button
                                onClick={() => updateLeadStage(lead.id, nextStage)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                title={`Avanzar a siguiente etapa`}
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
