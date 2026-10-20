import React, { useState } from 'react';
import {
  BrainCircuit,
  Shield,
  BookOpen,
  ShoppingBag,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  Smile,
  DollarSign,
  MessageSquare,
  HelpCircle,
  Save,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Clock
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { SpecialRule, RuleAction, ProductItem, KnowledgeFaq } from '../types/crm';

export const AITrainingCenter: React.FC = () => {
  const {
    businessProfile,
    updateBusinessProfile,
    rules,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    faqs,
    addFaq,
    updateFaq,
    deleteFaq,
    loadStarterDemoData,
    aiSettings,
    runDailyTraining,
    trainingHistory
  } = useCrm();

  const [activeTab, setActiveTab] = useState<'training' | 'rules' | 'profile' | 'catalog' | 'faqs'>('training');
  const [savedNotification, setSavedNotification] = useState(false);
  const [isTrainingNow, setIsTrainingNow] = useState(false);
  const [trainingSuccessMsg, setTrainingSuccessMsg] = useState<string | null>(null);

  // New Rule Modal / Form State
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<SpecialRule | null>(null);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleTriggers, setRuleTriggers] = useState('');
  const [ruleAction, setRuleAction] = useState<RuleAction>('handover');
  const [ruleMessage, setRuleMessage] = useState('');
  const [ruleTag, setRuleTag] = useState('');

  // New Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState<number>(0);
  const [prodDesc, setProdDesc] = useState('');

  // New FAQ Modal State
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('');

  const triggerSaveAlert = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2500);
  };

  const openNewRuleModal = (template?: Partial<SpecialRule>) => {
    setEditingRule(null);
    if (template) {
      setRuleTitle(template.title || '');
      setRuleDesc(template.description || '');
      setRuleTriggers((template.triggers || []).join(', '));
      setRuleAction(template.action || 'handover');
      setRuleMessage(template.actionPayload?.message || template.actionPayload?.response || '');
      setRuleTag(template.actionPayload?.tag || '');
    } else {
      setRuleTitle('');
      setRuleDesc('');
      setRuleTriggers('');
      setRuleAction('handover');
      setRuleMessage('');
      setRuleTag('');
    }
    setShowRuleModal(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim() || !ruleTriggers.trim()) return;

    const triggerList = ruleTriggers
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const ruleData: Omit<SpecialRule, 'id'> = {
      title: ruleTitle.trim(),
      description: ruleDesc.trim(),
      triggerType: 'keyword',
      triggers: triggerList,
      action: ruleAction,
      actionPayload: {
        message: ruleMessage.trim(),
        response: ruleMessage.trim(),
        tag: ruleTag.trim() || undefined
      },
      enabled: true,
      color: ruleAction === 'handover' ? '#EF4444' : '#10B981'
    };

    if (editingRule) {
      updateRule(editingRule.id, ruleData);
    } else {
      addRule(ruleData);
    }

    setShowRuleModal(false);
    triggerSaveAlert();
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    addProduct({
      name: prodName.trim(),
      category: prodCategory.trim() || 'General',
      price: Number(prodPrice) || 0,
      currency: businessProfile.currency || 'USD',
      description: prodDesc.trim(),
      inStock: true
    });

    setProdName('');
    setProdCategory('');
    setProdPrice(0);
    setProdDesc('');
    setShowProductModal(false);
    triggerSaveAlert();
  };

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;

    addFaq({
      question: faqQuestion.trim(),
      answer: faqAnswer.trim(),
      category: faqCategory.trim() || 'General',
      keywords: faqQuestion.toLowerCase().split(' ').filter((w) => w.length > 3)
    });

    setFaqQuestion('');
    setFaqAnswer('');
    setFaqCategory('');
    setShowFaqModal(false);
    triggerSaveAlert();
  };

  const handleExecuteTraining = async () => {
    setIsTrainingNow(true);
    setTrainingSuccessMsg(null);
    try {
      const res = await runDailyTraining();
      if (res && res.success) {
        setTrainingSuccessMsg('¡Entrenamiento diario completado con éxito! Tu IA está actualizada con los chats más recientes.');
        setTimeout(() => setTrainingSuccessMsg(null), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTrainingNow(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Centro de Entrenamiento & Normativas IA
              </h1>
              <p className="text-xs text-slate-400">
                Enseña a la IA el tono de tu negocio, tu catálogo y define reglas estrictas para casos especiales.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('training')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'training'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>Entrenamiento Diario ({aiSettings?.trainingScore || 98.4}%)</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Normativas ({rules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Tono & Empresa</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'catalog'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Catálogo ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('faqs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'faqs'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>FAQs ({faqs.length})</span>
          </button>
        </div>
      </div>

      {/* Save Notification Toast */}
      {savedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>¡Cambios guardados con éxito! El bot de IA ya los tiene asimilados.</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Cloud Persistence & Company Onboarding Banner */}
        {products.length === 0 && (
          <div className="bg-emerald-950/40 border border-emerald-500/50 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5 text-sm">
                <span>🏢 Espacio de Trabajo Listo para Configurar</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                  Base de Datos en la Nube
                </span>
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Esta es tu empresa privada. Puedes configurar tus datos de empresa, catálogo y normativas, o presionar este botón para cargar una plantilla comercial base.
              </p>
            </div>
            <button
              onClick={() => {
                loadStarterDemoData();
                triggerSaveAlert();
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs whitespace-nowrap transition-colors shadow-md flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cargar Plantilla de Ejemplo</span>
            </button>
          </div>
        )}

        {/* Success alert for training */}
        {trainingSuccessMsg && (
          <div className="bg-emerald-950/60 border border-emerald-500/50 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-300 shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{trainingSuccessMsg}</span>
            </div>
            <button
              onClick={() => setTrainingSuccessMsg(null)}
              className="text-emerald-400 hover:text-white font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* ==================== TAB 0: DAILY AI TRAINING & SPECIALIZATION ==================== */}
        {activeTab === 'training' && (
          <div className="space-y-6">
            {/* Top Control Hero Card */}
            <div className="bg-gradient-to-r from-purple-950/50 via-slate-900/90 to-slate-900 border border-purple-500/30 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      Entrenamiento Continuo de IA (Ciclo Diario)
                    </h2>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                      Mínimo 1 vez al día
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Cada usuario cuenta con una IA especializada exclusivamente para su empresa. El sistema analiza las conversaciones reales de WhatsApp de los últimos 15 días, el catálogo y las normativas para perfeccionar las respuestas comerciales y de cierre.
                  </p>
                </div>

                <button
                  onClick={handleExecuteTraining}
                  disabled={isTrainingNow}
                  className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/30 hover:scale-102 active:scale-98 disabled:opacity-60 self-start md:self-auto"
                >
                  <Sparkles className={`w-4 h-4 ${isTrainingNow ? 'animate-spin' : ''}`} />
                  <span>{isTrainingNow ? 'Entrenando IA con tus datos...' : '🚀 Entrenar IA Ahora'}</span>
                </button>
              </div>

              {/* Status Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Estado del Ciclo</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Activo Diario</span>
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Último Entrenamiento</span>
                  <span className="text-xs font-bold text-white block mt-0.5 truncate">
                    {aiSettings?.lastDailyTrainingAt
                      ? new Date(aiSettings.lastDailyTrainingAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric'
                        }) +
                        ' ' +
                        new Date(aiSettings.lastDailyTrainingAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Hoy'}
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Precisión Calibrada</span>
                  <span className="text-xs font-bold text-purple-300 block mt-0.5">
                    {aiSettings?.trainingScore || 98.4}%
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Ciclos Completados</span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    {aiSettings?.trainingCycles || 1} sesiones
                  </span>
                </div>
              </div>
            </div>

            {/* Specialization Section (Multi-Industry per user) */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-purple-400" />
                    Especialización Comercial por Empresa
                  </h3>
                  <p className="text-xs text-slate-400">
                    OrdenFacilCRM no es solo para odontología. Configura tu industria para que la IA adapte su vocabulario y tácticas de venta.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold self-start sm:self-auto">
                  {businessProfile.companyName}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Sector o Industria de tu Negocio
                  </label>
                  <select
                    value={businessProfile.industry || 'Comercio & Servicios'}
                    onChange={(e) => {
                      updateBusinessProfile({ industry: e.target.value });
                      triggerSaveAlert();
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Clinica medico Dental">Odontología / Clínica Dental</option>
                    <option value="Salud & Medicina">Salud, Medicina & Consultorios</option>
                    <option value="Inmobiliaria & Bienes Raíces">Inmobiliaria & Bienes Raíces</option>
                    <option value="Concesionario & Automotriz">Concesionario, Taller & Automotriz</option>
                    <option value="E-commerce & Tienda Retail">Comercio, Tienda Online & Retail</option>
                    <option value="Restaurante & Gastronomía">Restaurante, Bar & Gastronomía</option>
                    <option value="Asesoría Legal & Contable">Asesoría Legal, Contable & Fiscal</option>
                    <option value="Agencia & Servicios Digitales">Agencia & Servicios Profesionales</option>
                    <option value="Educación & Cursos">Educación, Capacitación & Cursos</option>
                    <option value="Comercio & Servicios Generales">Otro tipo de negocio comercial</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Nombre Oficial de tu Empresa
                  </label>
                  <input
                    type="text"
                    value={businessProfile.companyName}
                    onChange={(e) => updateBusinessProfile({ companyName: e.target.value })}
                    placeholder="Nombre comercial de tu marca..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Directives from daily training */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-300 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Directivas de Especialización Aprendidas del Entrenamiento
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {aiSettings?.dailyTrainingSummary ||
                    `Entrenamiento diario completado para ${businessProfile.companyName} (${businessProfile.industry}). El bot está sincronizado con tu catálogo y normativas.`}
                </p>
              </div>
            </div>

            {/* Knowledge & Real-Chat Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Conocimientos & Aprendizajes Asimilados (Últimos 15 días)
                </h4>
                <div className="space-y-2">
                  {[
                    `Políticas de precios y catálogo: ${products.length} productos sincronizados con descripciones y monedas.`,
                    `Normativas en casos especiales: ${rules.filter((r) => r.enabled).length} reglas activas para prevenir errores y traspasar a asesores.`,
                    'Cierre de ventas: La IA propone alternativas de horario y medios de pago para concretar la cita o pedido.',
                    'Detección de tono del cliente: Respuestas adaptadas de 2 a 3 párrafos con emojis comerciales amables.'
                  ].map((insight, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2"
                    >
                      <span className="text-purple-400 font-bold">•</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Training Logs History */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  Historial de Sesiones de Entrenamiento
                </h4>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {trainingHistory.length === 0 ? (
                    <div className="p-4 rounded-lg bg-slate-950 text-center text-xs text-slate-400">
                      Entrenamiento inicial listo. Presiona "Entrenar IA Ahora" para registrar una sesión adicional.
                    </div>
                  ) : (
                    trainingHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-white block">
                            Ciclo Diario - {item.date}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Hora: {item.timestamp} • {item.analyzedConversations} chats analizados
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400 block">
                            {item.accuracyScore}% precisión
                          </span>
                          <span className="text-[10px] text-purple-400">Completado</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 1: RULES ENGINE (NORMATIVAS EN CASOS ESPECIALES) ==================== */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  Reglas y Normativas para Casos Especiales
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Protegen a tu empresa de respuestas incorrectas, obligan a traspasar a humanos en quejas o derivaciones y previenen descuentos no autorizados.
                </p>
              </div>

              <button
                onClick={() => openNewRuleModal()}
                className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Normativa</span>
              </button>
            </div>

            {/* Template Quick Actions */}
            <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Plantillas Rápidas de Normativas Populares para WhatsApp Business:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    openNewRuleModal({
                      title: 'Derivación por Reclamo o Queja',
                      description: 'Escalar al supervisor cuando el cliente esté inconforme o reclame',
                      triggers: ['estafa', 'queja', 'reclamo', 'demora', 'no funciona', 'devolución'],
                      action: 'handover',
                      actionPayload: {
                        message: 'Lamentamos mucho el inconveniente. Tu satisfacción es nuestra prioridad; estoy derivando tu mensaje a Supervisión de Clientes para brindarte asistencia inmediata.',
                        tag: 'Reclamo Urgente'
                      }
                    })
                  }
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-red-300 border border-red-800/50 rounded-lg text-xs font-medium transition-colors"
                >
                  + Plantilla: Reclamos y Quejas
                </button>

                <button
                  onClick={() =>
                    openNewRuleModal({
                      title: 'Regla de Enlaces de Pago Seguros',
                      description: 'Proveer pasarelas verificadas cuando soliciten pagar',
                      triggers: ['link de pago', 'cómo pago', 'datos bancarios', 'transferencia', 'tarjeta'],
                      action: 'custom_response',
                      actionPayload: {
                        message: 'Aceptamos transferencias bancarias, tarjetas de crédito/débito y Zelle. ¿Con cuál de estas alternativas prefieres que te genere el enlace de pago seguro?',
                        tag: 'Consultó Pagos'
                      }
                    })
                  }
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800/50 rounded-lg text-xs font-medium transition-colors"
                >
                  + Plantilla: Medios de Pago
                </button>

                <button
                  onClick={() =>
                    openNewRuleModal({
                      title: 'Restricción de Precios & Descuentos',
                      description: 'No rebajar precios sin autorización de gerencia',
                      triggers: ['descuento', 'rebaja', 'menos precio', 'barato', 'haceme un precio'],
                      action: 'discount_warning',
                      actionPayload: {
                        message: 'Nuestros valores oficiales incluyen soporte técnico y garantía. Para planes anuales ofrecemos un 15% de bonificación. ¿Deseas que te enviemos esa opción?',
                        tag: 'Pidió Descuento'
                      }
                    })
                  }
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800/50 rounded-lg text-xs font-medium transition-colors"
                >
                  + Plantilla: Política de Descuentos
                </button>
              </div>
            </div>

            {/* Rules Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => {
                const isHandover = rule.action === 'handover';
                const isDiscount = rule.action === 'discount_warning';

                return (
                  <div
                    key={rule.id}
                    className={`bg-slate-900/90 rounded-xl p-4 border transition-all ${
                      rule.enabled
                        ? isHandover
                          ? 'border-red-900/60 hover:border-red-600/80'
                          : isDiscount
                          ? 'border-amber-900/60 hover:border-amber-600/80'
                          : 'border-slate-800 hover:border-purple-600/80'
                        : 'border-slate-800/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            rule.enabled
                              ? isHandover
                                ? 'bg-red-500 shadow-sm shadow-red-500'
                                : 'bg-emerald-500 shadow-sm shadow-emerald-500'
                              : 'bg-slate-600'
                          }`}
                        />
                        <h3 className="text-sm font-bold text-white">{rule.title}</h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className="text-slate-400 hover:text-white p-1"
                          title={rule.enabled ? 'Pausar regla' : 'Activar regla'}
                        >
                          {rule.enabled ? (
                            <ToggleRight className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="Eliminar regla"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      {rule.description}
                    </p>

                    {/* Trigger keywords */}
                    <div className="mb-3">
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Palabras clave disparadoras ({rule.triggers.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {rule.triggers.map((trigger, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-mono"
                          >
                            "{trigger}"
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action payload summary */}
                    <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400">
                          Acción de la Normativa:
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isHandover
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : isDiscount
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isHandover
                            ? '🚨 Traspaso a Asesor Humano'
                            : isDiscount
                            ? '🛡️ Prohibido Descuentos no Autorizados'
                            : '💬 Respuesta Automática Estricta'}
                        </span>
                      </div>

                      {(rule.actionPayload?.message || rule.actionPayload?.response) && (
                        <p className="text-[11px] text-slate-300 italic border-l-2 border-purple-500 pl-2 mt-1">
                          "{rule.actionPayload.message || rule.actionPayload.response}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: BUSINESS PROFILE & TONE ==================== */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Smile className="w-4 h-4 text-purple-400" />
                Personalidad, Tono e Identidad del Negocio
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Define cómo debe expresarse el asistente de IA al interactuar con tus clientes por WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Company Info */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3.5">
                <h3 className="text-xs font-bold text-slate-200">Datos Principales</h3>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Nombre Oficial de la Empresa
                  </label>
                  <input
                    type="text"
                    value={businessProfile.companyName}
                    onChange={(e) => updateBusinessProfile({ companyName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Rubro / Industria
                  </label>
                  <input
                    type="text"
                    value={businessProfile.industry}
                    onChange={(e) => updateBusinessProfile({ industry: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Moneda Comercial
                    </label>
                    <select
                      value={businessProfile.currency}
                      onChange={(e) => updateBusinessProfile({ currency: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="MXN">MXN ($)</option>
                      <option value="ARS">ARS ($)</option>
                      <option value="COP">COP ($)</option>
                      <option value="CLP">CLP ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Uso de Emojis
                    </label>
                    <select
                      value={businessProfile.useEmojis ? 'yes' : 'no'}
                      onChange={(e) => updateBusinessProfile({ useEmojis: e.target.value === 'yes' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="yes">Sí, amigable y cercano (😊🚀👋)</option>
                      <option value="no">No, formal sin emojis</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Horario de Atención Oficial
                  </label>
                  <input
                    type="text"
                    value={businessProfile.workingHours}
                    onChange={(e) => updateBusinessProfile({ workingHours: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Tone Selection */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3.5">
                <h3 className="text-xs font-bold text-slate-200">Tono de Voz Predeterminado</h3>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'amigable', label: 'Amigable & Cercano', desc: 'Cálido, empático y servicial' },
                    { id: 'profesional', label: 'Profesional & Corporativo', desc: 'Formal, preciso y educado' },
                    { id: 'comercial', label: 'Comercial & Ventas', desc: 'Enfocado en cerrar ventas y citas' },
                    { id: 'tecnico', label: 'Técnico & Preciso', desc: 'Detallista y orientado a datos' }
                  ].map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() =>
                        updateBusinessProfile({ defaultTone: tone.id as any })
                      }
                      className={`p-3 rounded-lg border text-left transition-all ${
                        businessProfile.defaultTone === tone.id
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span className="font-bold text-xs block text-white">{tone.label}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{tone.desc}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Mensaje de Bienvenida Automático
                  </label>
                  <textarea
                    value={businessProfile.welcomeMessage}
                    onChange={(e) => updateBusinessProfile({ welcomeMessage: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Mensaje al Transferir a Asesor Humano
                  </label>
                  <textarea
                    value={businessProfile.handoverMessage}
                    onChange={(e) => updateBusinessProfile({ handoverMessage: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Custom Instructions / Master Prompt */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Instrucciones Maestras del Negocio (System Prompt)
              </label>
              <p className="text-xs text-slate-400">
                La IA incorporará estas directivas en cada mensaje para alinearse exactamente con tus objetivos comerciales.
              </p>
              <textarea
                value={businessProfile.customInstructions}
                onChange={(e) => updateBusinessProfile({ customInstructions: e.target.value })}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 leading-relaxed"
                placeholder="Indica pautas comerciales, valores de la marca, o instrucciones de atención..."
              />
              <div className="flex justify-end pt-1">
                <button
                  onClick={triggerSaveAlert}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Instrucciones</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: PRODUCT CATALOG ==================== */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-purple-400" />
                  Catálogo Oficial de Productos & Servicios
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  La IA utiliza este catálogo como verdad absoluta para cotizar precios, explicar características y no alucinar.
                </p>
              </div>

              <button
                onClick={() => setShowProductModal(true)}
                className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Producto</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                          {prod.category}
                        </span>
                        <h4 className="font-bold text-sm text-white">{prod.name}</h4>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-base font-extrabold text-emerald-400">
                          ${prod.price}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">{prod.currency}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {prod.description}
                    </p>

                    {prod.features && (
                      <div className="space-y-1">
                        {prod.features.map((feat, i) => (
                          <div
                            key={i}
                            className="text-[11px] text-slate-400 flex items-center gap-1.5"
                          >
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        prod.inStock
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {prod.inStock ? 'Disponible para Cotizar' : 'Agotado'}
                    </span>

                    <button
                      onClick={() => deleteProduct(prod.id)}
                      className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: KNOWLEDGE FAQS ==================== */}
        {activeTab === 'faqs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  Base de Conocimientos & Preguntas Frecuentes
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Respuestas oficiales a dudas frecuentes sobre garantía, envíos, métodos y soporte.
                </p>
              </div>

              <button
                onClick={() => setShowFaqModal(true)}
                className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar FAQ</span>
              </button>
            </div>

            <div className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {faq.category}
                      </span>
                      <h4 className="text-sm font-bold text-white">{faq.question}</h4>
                    </div>
                    <button
                      onClick={() => deleteFaq(faq.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pl-2 border-l-2 border-slate-700">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Add / Edit Rule */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveRule}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                {editingRule ? 'Editar Normativa Especial' : 'Crear Nueva Normativa para Casos Especiales'}
              </h3>
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Nombre de la Normativa *
                </label>
                <input
                  type="text"
                  required
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  placeholder="Ej: Derivación Médica Especializada"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Palabras o Frases Clave Disparadoras (separadas por coma) *
                </label>
                <input
                  type="text"
                  required
                  value={ruleTriggers}
                  onChange={(e) => setRuleTriggers(e.target.value)}
                  placeholder="asesor, persona, humano, operador, hablar con alguien"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Acción Obligatoria a Ejecutar
                </label>
                <select
                  value={ruleAction}
                  onChange={(e) => setRuleAction(e.target.value as RuleAction)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="handover">🚨 Traspaso Inmediato a Asesor Humano (Pausa el Bot IA)</option>
                  <option value="discount_warning">🛡️ Prohibido Negociar / Advertencia de Precios</option>
                  <option value="custom_response">💬 Enviar Respuesta Estricta Obligatoria</option>
                  <option value="move_stage">📊 Mover Lead a Etapa Cotizado / Ganado</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Mensaje que se enviará al cliente por WhatsApp
                </label>
                <textarea
                  rows={3}
                  value={ruleMessage}
                  onChange={(e) => setRuleMessage(e.target.value)}
                  placeholder="Texto oficial que la IA enviará cuando se active esta normativa..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Etiqueta a Asignar en el CRM (opcional)
                </label>
                <input
                  type="text"
                  value={ruleTag}
                  onChange={(e) => setRuleTag(e.target.value)}
                  placeholder="Ej: Requiere Asesor, Queja, Prioridad Alta"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow"
              >
                Guardar Normativa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Add Product */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveProduct}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                Agregar Producto al Catálogo
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Nombre del Producto o Servicio *
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ej: Pack Marketing Digital Pro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="Software, Cursos, etc."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Descripción para que la IA la presente
                </label>
                <textarea
                  rows={3}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Qué incluye, a quién va dirigido, beneficios clave..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow"
              >
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Add FAQ */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveFaq}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Agregar Pregunta Frecuente
              </h3>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Pregunta Frecuente *
                </label>
                <input
                  type="text"
                  required
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="Ej: ¿Cuáles son las formas de pago aceptadas?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Respuesta Oficial de la Empresa *
                </label>
                <textarea
                  rows={4}
                  required
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  placeholder="Respuesta oficial que la IA citará en WhatsApp..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Categoría
                </label>
                <input
                  type="text"
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  placeholder="Comercial, Soporte, Envíos, Garantía..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow"
              >
                Guardar FAQ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
