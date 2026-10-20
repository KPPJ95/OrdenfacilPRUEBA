import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bot,
  User,
  ShieldAlert,
  Send,
  Sparkles,
  Phone,
  Tag,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  ChevronRight,
  Info,
  DollarSign,
  HelpCircle,
  ExternalLink,
  MessageCircle,
  Sliders,
  Filter,
  RotateCw,
  Trash2,
  Radio,
  Archive,
  ArchiveRestore,
  MessageSquare
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Lead, LeadStage, Message } from '../types/crm';

const STAGE_LABELS: Record<LeadStage, { label: string; color: string }> = {
  nuevo: { label: 'Nuevo Lead', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  contactado: { label: 'Contactado', color: 'bg-slate-500/10 text-slate-300 border-slate-500/30' },
  interesado: { label: 'Interesado', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  cotizado: { label: 'Cotizado', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  ganado: { label: 'Venta Ganada', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  perdido: { label: 'Perdido', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' }
};

export const ChatInbox: React.FC = () => {
  const {
    leads,
    activeLeadId,
    setActiveLeadId,
    messages,
    sendMessage,
    toggleLeadAi,
    updateLeadStage,
    updateLeadNotes,
    updateLead,
    deleteLead,
    suggestAiDraft,
    isAiResponding,
    cleanDemoData,
    refreshFromServer,
    webhookLogs
  } = useCrm();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'archived' | 'ai' | 'human'>('all');
  const [inputText, setInputText] = useState('');
  const [showInspector, setShowInspector] = useState(true);
  const [selectedAiMessage, setSelectedAiMessage] = useState<Message | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeLead = leads.find((l) => l.id === activeLeadId) || leads.find((l) => !l.isArchived) || leads[0] || null;
  const currentMessages = activeLead ? messages[activeLead.id] || [] : [];

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isAiResponding]);

  // Filter leads: Exclude ghost mock chats and show only real WhatsApp conversations from the last 15 days
  const filteredLeads = leads.filter((lead) => {
    // Exclude mock ghost leads like lead-1, lead-2, lead-3, etc.
    if (/^lead-\d+$/.test(lead.id)) return false;

    // Filter to last 15 days if createdAt is recorded
    if (lead.createdAt) {
      const createdTime = new Date(lead.createdAt).getTime();
      const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;
      if (!isNaN(createdTime) && createdTime < fifteenDaysAgo) {
        return false;
      }
    }

    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company && lead.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.lastMessageText && lead.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'archived') return Boolean(lead.isArchived);
    if (lead.isArchived) return false;

    if (filterType === 'ai') return lead.aiEnabled;
    if (filterType === 'human') return !lead.aiEnabled;

    return true;
  });

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeLead) return;

    const textToSend = inputText.trim();
    setInputText('');
    await sendMessage(activeLead.id, textToSend, 'agent');
  };

  const handleDraftSuggestion = async () => {
    if (!activeLead) return;
    setIsGeneratingDraft(true);
    try {
      const draft = await suggestAiDraft(activeLead.id);
      if (draft) {
        setInputText(draft);
      }
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleAddTag = () => {
    if (!newTagInput.trim() || !activeLead) return;
    const tag = newTagInput.trim();
    if (!activeLead.tags.includes(tag)) {
      updateLead(activeLead.id, { tags: [...activeLead.tags, tag] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeLead) return;
    updateLead(activeLead.id, {
      tags: activeLead.tags.filter((t) => t !== tagToRemove)
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await refreshFromServer();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const handleCleanMockData = async () => {
    await cleanDemoData();
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 text-slate-100">
      {/* 1. Left Sidebar: Chat List */}
      <div className="w-80 md:w-96 flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/90">
        {/* Real WhatsApp Quick Actions Header */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>WhatsApp en Vivo (Últimos 15 días)</span>
            </span>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
              title="Sincronizar mensajes de WhatsApp recibidos"
            >
              <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
          </div>

          {/* Clean Mock Data button if any ghost leads exist */}
          {leads.some((l) => l.id.startsWith('lead-')) && (
            <div className="pt-0.5">
              <button
                onClick={handleCleanMockData}
                className="w-full py-1.5 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                title="Eliminar chats ficticios de prueba para dejar solo números reales de WhatsApp"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Limpiar Chats Fantasmas (Dejar Solo Reales)</span>
              </button>
            </div>
          )}
        </div>

        {/* Search & Filter Header */}
        <div className="p-3.5 border-b border-slate-800 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar chat, cliente o mensaje..."
              className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                filterType === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Activos ({leads.filter((l) => !l.isArchived).length})
            </button>
            <button
              onClick={() => setFilterType('archived')}
              className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap flex items-center gap-1 transition-colors ${
                filterType === 'archived'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Archive className="w-3 h-3 text-amber-400" />
              <span>Archivados ({leads.filter((l) => l.isArchived).length})</span>
            </button>
            <button
              onClick={() => setFilterType('ai')}
              className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap flex items-center gap-1 transition-colors ${
                filterType === 'ai'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Bot className="w-3 h-3 text-emerald-400" />
              <span>IA Activa</span>
            </button>
            <button
              onClick={() => setFilterType('human')}
              className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap flex items-center gap-1 transition-colors ${
                filterType === 'human'
                  ? 'bg-red-500 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-red-400" />
              <span>Humano ({leads.filter((l) => !l.aiEnabled && !l.isArchived).length})</span>
            </button>
          </div>
        </div>

        {/* Lead List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No se encontraron conversaciones con estos filtros.
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isSelected = activeLead?.id === lead.id;
              const stageBadge = STAGE_LABELS[lead.stage] || STAGE_LABELS.nuevo;

              return (
                <div
                  key={lead.id}
                  onClick={() => setActiveLeadId(lead.id)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all border-l-4 ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500'
                      : 'border-transparent hover:bg-slate-800/40'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={lead.avatar}
                      alt={lead.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-700"
                    />
                    {lead.aiEnabled ? (
                      <span
                        className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-[9px] font-bold shadow"
                        title="Bot de IA activo respondiendo"
                      >
                        🤖
                      </span>
                    ) : (
                      <span
                        className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow animate-pulse"
                        title="Atención humana requerida"
                      >
                        👨‍💼
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-sm font-semibold text-white truncate">{lead.name}</h4>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400 flex-shrink-0">
                          {lead.lastMessageTime}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateLead(lead.id, { isArchived: !lead.isArchived });
                          }}
                          className="p-1 text-slate-500 hover:text-amber-400 rounded transition-colors"
                          title={lead.isArchived ? 'Desarchivar chat' : 'Archivar chat'}
                        >
                          {lead.isArchived ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLeadToDelete(lead);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Eliminar chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 truncate mb-1.5">
                      {lead.lastMessageText || 'Sin mensajes aún'}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${stageBadge.color}`}
                      >
                        {stageBadge.label}
                      </span>

                      {!lead.aiEnabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-semibold flex items-center gap-0.5">
                          <ShieldAlert className="w-2.5 h-2.5" />
                          Humano
                        </span>
                      )}

                      {lead.tags.slice(0, 1).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 truncate max-w-[90px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Middle: WhatsApp Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
        {activeLead ? (
          <>
            {/* Top Bar of Active Conversation */}
            <div className="h-16 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={activeLead.avatar}
                  alt={activeLead.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-white truncate">
                      {activeLead.name}
                    </h3>
                    {/* Stage Selector */}
                    <select
                      value={activeLead.stage}
                      onChange={(e) => updateLeadStage(activeLead.id, e.target.value as LeadStage)}
                      className="bg-slate-800 text-slate-200 border border-slate-700 text-[11px] rounded px-2 py-0.5 font-medium cursor-pointer focus:outline-none focus:border-emerald-500"
                    >
                      <option value="nuevo">Nuevo Lead</option>
                      <option value="contactado">Contactado</option>
                      <option value="interesado">Interesado</option>
                      <option value="cotizado">Cotizado</option>
                      <option value="ganado">Venta Ganada 🎉</option>
                      <option value="perdido">Perdido</option>
                    </select>
                  </div>
                  <p className="text-xs text-slate-400 truncate flex items-center gap-2">
                    <span>{activeLead.phone}</span>
                    {activeLead.company && (
                      <>
                        <span>•</span>
                        <span className="text-slate-300">{activeLead.company}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Bot / Human Mode Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => toggleLeadAi(activeLead.id, true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      activeLead.aiEnabled
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="La IA responderá de forma automática a los mensajes entrantes de este cliente"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Bot IA Activo</span>
                  </button>
                  <button
                    onClick={() => toggleLeadAi(activeLead.id, false)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      !activeLead.aiEnabled
                        ? 'bg-red-500 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Pausar respuestas de la IA para que un asesor humano tome el control"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Modo Manual</span>
                  </button>
                </div>

                {/* Direct WhatsApp Web link */}
                <a
                  href={`https://wa.me/${activeLead.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Abrir este contacto directamente en WhatsApp Web o móvil"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp Web</span>
                </a>

                {/* Archive / Unarchive Button */}
                <button
                  onClick={() => updateLead(activeLead.id, { isArchived: !activeLead.isArchived })}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeLead.isArchived
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                  title={activeLead.isArchived ? 'Desarchivar conversación' : 'Archivar conversación'}
                >
                  {activeLead.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  <span className="hidden md:inline">{activeLead.isArchived ? 'Desarchivar' : 'Archivar'}</span>
                </button>

                {/* Delete Chat Button */}
                <button
                  onClick={() => setLeadToDelete(activeLead)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-950/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title="Eliminar este chat y todos sus mensajes"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Borrar</span>
                </button>

                <button
                  onClick={() => setShowInspector(!showInspector)}
                  className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                    showInspector
                      ? 'bg-slate-800 text-emerald-400 border-slate-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Ficha del Lead & Normativas"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Banner if Handover or Human Mode is Active */}
            {!activeLead.aiEnabled && (
              <div className="bg-amber-950/70 border-b border-amber-800/80 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>Atención Manual Requerida:</strong> La IA ha pausado sus respuestas para este cliente (por solicitud de asesor o activación de normativa).
                  </span>
                </div>
                <button
                  onClick={() => toggleLeadAi(activeLead.id, true)}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-[11px] whitespace-nowrap transition-colors"
                >
                  Reactivar Bot IA
                </button>
              </div>
            )}

            {/* Chat Messages List (WhatsApp Look & Feel) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950">
              {/* Privacy disclaimer */}
              <div className="flex justify-center my-2">
                <div className="bg-slate-900/90 border border-slate-800 text-slate-400 text-[11px] px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                  <Bot className="w-3 h-3 text-emerald-400" />
                  <span>
                    Conversación oficial protegida por OrdenFacilCRM AI con normativas de negocio activas
                  </span>
                </div>
              </div>

              {currentMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isAi = msg.sender === 'ai';
                const isAgent = msg.sender === 'agent';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-md relative ${
                        isUser
                          ? 'bg-slate-800/95 text-slate-100 rounded-tl-sm border border-slate-700/80'
                          : isAi
                          ? 'bg-emerald-950/80 text-emerald-50 rounded-tr-sm border border-emerald-600/40'
                          : 'bg-emerald-600 text-white rounded-tr-sm'
                      }`}
                    >
                      {/* Sender badge */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        {isUser ? (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />
                            {activeLead.name}
                          </span>
                        ) : isAi ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedAiMessage(msg)}
                              className="text-[10px] font-bold text-emerald-300 bg-emerald-900/70 hover:bg-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/40 transition-colors"
                              title="Haz clic para revisar el razonamiento y normativas de esta respuesta de la IA"
                            >
                              <Bot className="w-3 h-3 text-emerald-400" />
                              <span>Respondido por IA</span>
                              <Info className="w-2.5 h-2.5 opacity-80" />
                            </button>
                            {msg.matchedRules && msg.matchedRules.length > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                                ⚖️ {msg.matchedRules[0]}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-100 flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />
                            Asesor Humano
                          </span>
                        )}

                        <span className="text-[10px] opacity-70 ml-2">{msg.timestamp}</span>
                      </div>

                      {/* Message Text with newlines */}
                      <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text">
                        {msg.text}
                      </p>

                      {/* Delivery Status & Inspector hint */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70">
                        {isAi && msg.reasoning && (
                          <button
                            onClick={() => setSelectedAiMessage(msg)}
                            className="text-[10px] text-emerald-300 underline mr-2 hover:text-emerald-200"
                          >
                            Ver razonamiento
                          </button>
                        )}
                        {!isUser && (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Live typing indicator if AI is currently generating response */}
              {isAiResponding && (
                <div className="flex items-start gap-2">
                  <div className="bg-emerald-950/70 border border-emerald-600/30 rounded-2xl rounded-tl-sm px-4 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Alex (IA) está analizando normativas y redactando respuesta...</span>
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSend}
              className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
            >
              {/* Suggest AI Draft button */}
              <button
                type="button"
                onClick={handleDraftSuggestion}
                disabled={isGeneratingDraft}
                className="px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Generar una respuesta sugerida por IA para que el asesor la revise antes de enviar"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">
                  {isGeneratingDraft ? 'Generando...' : 'Sugerir con IA'}
                </span>
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeLead.aiEnabled
                    ? 'Escribe un mensaje como asesor (el cliente lo recibirá por WhatsApp)...'
                    : 'Escribe un mensaje como asesor humano...'
                }
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:hover:bg-emerald-600"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-950">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-bold text-white">Bandeja de Conversaciones de WhatsApp</h3>
              <p className="text-xs text-slate-400">
                Selecciona una conversación activa de la lista lateral para responder, o espera los mensajes entrantes de tus clientes reales en WhatsApp.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Right Sidebar: CRM Lead Card & AI Inspector */}
      {showInspector && activeLead && (
        <div className="w-80 md:w-96 flex-shrink-0 border-l border-slate-800 bg-slate-900/90 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              Ficha del Cliente en CRM
            </h3>
            <button
              onClick={() => setShowInspector(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cerrar
            </button>
          </div>

          {/* Profile Overview */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={activeLead.avatar}
                alt={activeLead.name}
                className="w-12 h-12 rounded-full object-cover border border-slate-700"
              />
              <div>
                <h4 className="font-bold text-sm text-white">{activeLead.name}</h4>
                <p className="text-xs text-slate-400">{activeLead.phone}</p>
                {activeLead.company && (
                  <p className="text-xs text-emerald-400 font-medium">{activeLead.company}</p>
                )}
              </div>
            </div>

            {/* Stage Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Etapa del Embudo Comercial
              </label>
              <select
                value={activeLead.stage}
                onChange={(e) => updateLeadStage(activeLead.id, e.target.value as LeadStage)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="nuevo">Nuevo Lead</option>
                <option value="contactado">Contactado</option>
                <option value="interesado">Interesado</option>
                <option value="cotizado">Cotizado</option>
                <option value="ganado">Venta Ganada 🎉</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>

            {/* Estimated Value */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Valor Estimado de Venta ($ USD)
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  value={activeLead.estimatedValue || 0}
                  onChange={(e) =>
                    updateLead(activeLead.id, { estimatedValue: Number(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* AI Summary */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Resumen de Necesidad (Detectado por IA)
              </label>
              <p className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-slate-300 leading-relaxed">
                {activeLead.summary || 'La IA está perfilando la necesidad del cliente.'}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <label className="text-[11px] font-semibold text-slate-400 block flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" />
              Etiquetas del Lead
            </label>
            <div className="flex flex-wrap gap-1.5">
              {activeLead.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-xs border border-slate-700"
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-red-400 text-xs font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Nueva etiqueta..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleAddTag}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs text-slate-200"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <label className="text-[11px] font-semibold text-slate-400 block">
              Notas Internas del Asesor
            </label>
            <textarea
              value={activeLead.notes}
              onChange={(e) => updateLeadNotes(activeLead.id, e.target.value)}
              rows={3}
              placeholder="Anotaciones para el equipo comercial..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>
        </div>
      )}

      {/* 4. Modal Inspector for AI Reasoning and Rules */}
      {selectedAiMessage && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Detalle de Respuesta del Bot de IA</h3>
              </div>
              <button
                onClick={() => setSelectedAiMessage(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-1">
                  Mensaje Respondido por WhatsApp:
                </span>
                <p className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedAiMessage.text}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Modelo Utilizado</span>
                  <span className="font-semibold text-emerald-400 text-xs">
                    {selectedAiMessage.modelUsed || 'Gemini 3.8 Flash'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Traspaso a Humano</span>
                  <span
                    className={`font-semibold text-xs ${
                      selectedAiMessage.handoverTriggered ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {selectedAiMessage.handoverTriggered ? 'Activado 🚨' : 'No requerido'}
                  </span>
                </div>
              </div>

              {selectedAiMessage.matchedRules && selectedAiMessage.matchedRules.length > 0 && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">
                    Normativas y Reglas Aplicadas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAiMessage.matchedRules.map((rule, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold"
                      >
                        ⚖️ {rule}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedAiMessage.reasoning && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">
                    Razonamiento / Criterio de la IA:
                  </span>
                  <p className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-lg text-emerald-200 leading-relaxed">
                    {selectedAiMessage.reasoning}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAiMessage(null)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Chat Modal */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-white">¿Eliminar este chat?</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Se eliminará permanentemente la conversación con <strong className="text-white">{leadToDelete.name}</strong> ({leadToDelete.phone}) y todos sus mensajes de WhatsApp.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setLeadToDelete(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteLead(leadToDelete.id);
                  setLeadToDelete(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-600/30"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
