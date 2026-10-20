import React from 'react';
import {
  MessageSquare,
  Users,
  BrainCircuit,
  Settings,
  BarChart3,
  Smartphone,
  Bot,
  Sparkles,
  PlusCircle,
  RotateCcw,
  LogOut,
  Cloud,
  Phone,
  RefreshCw
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: 'inbox' | 'pipeline' | 'training' | 'settings' | 'analytics';
  setActiveTab: (tab: 'inbox' | 'pipeline' | 'training' | 'settings' | 'analytics') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab
}) => {
  const {
    leads,
    businessProfile,
    aiSettings,
    isSavingToServer,
    isCloudConnected,
    manualCloudSync,
    refreshFromServer
  } = useCrm();
  const { user, logout } = useAuth();

  const humanRequiredCount = leads.filter((l) => !l.aiEnabled && !l.isArchived).length;
  const unreadCount = leads.filter((l) => !l.isArchived).reduce((acc, l) => acc + l.unreadCount, 0);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1">
                  OrdenFacil<span className="text-emerald-400">CRM</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    AI
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <p className="truncate max-w-[140px] sm:max-w-xs text-slate-300 font-semibold">
                  {businessProfile.companyName}
                </p>
                {businessProfile.industry && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                      {businessProfile.industry}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'inbox'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Mensajes</span>
              {humanRequiredCount > 0 ? (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center animate-pulse">
                  {humanRequiredCount}
                </span>
              ) : unreadCount > 0 ? (
                <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 text-[11px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>CRM & Clientes</span>
            </button>

            <button
              onClick={() => setActiveTab('training')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'training'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Entrenar IA & Normativas</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Ajustes & WhatsApp</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Métricas</span>
            </button>
          </nav>

          {/* Quick Actions & AI Status */}
          <div className="flex items-center gap-2.5">
            {/* AI Engine Status Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium">
                {aiSettings.provider === 'openai' ? 'OpenAI GPT-4o' : 'Gemini 3.8 Flash'}
              </span>
            </div>

            {/* Discreet Mini Cloud Sync Indicator */}
            <button
              onClick={manualCloudSync}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors relative flex items-center justify-center"
              title={isSavingToServer ? 'Guardando cambios en la nube...' : 'Nube conectada y sincronizada (Clic para forzar guardado)'}
            >
              <Cloud className={`w-4 h-4 ${isSavingToServer ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
              <span
                className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                  isSavingToServer ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                }`}
              />
            </button>

            {/* Manual Refresh / Sync */}
            <button
              onClick={() => refreshFromServer()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
              title="Actualizar datos ahora desde la base de datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* User Profile & Logout */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="flex items-center gap-2">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-emerald-500/50"
                  />
                  <div className="hidden xl:block text-left">
                    <span className="text-xs font-bold text-white block leading-tight truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-emerald-400 capitalize block leading-tight font-medium">
                      {user.role === 'admin' ? 'Administrador' : user.role === 'supervisor' ? 'Supervisor' : 'Asesor'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => logout()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded ${
              activeTab === 'inbox' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded ${
              activeTab === 'pipeline' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>CRM</span>
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded ${
              activeTab === 'training' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Reglas IA</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded ${
              activeTab === 'settings' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>OpenAI</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded ${
              activeTab === 'analytics' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Métricas</span>
          </button>
        </div>
      </div>
    </header>
  );
};
