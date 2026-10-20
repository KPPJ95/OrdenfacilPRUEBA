import React, { useState } from 'react';
import {
  Settings,
  Sparkles,
  Key,
  Cpu,
  Sliders,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  RefreshCw,
  AlertCircle,
  Smartphone,
  Eye,
  EyeOff,
  Layers,
  Send,
  Save
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { useAuth } from '../context/AuthContext';

export const IntegrationsSettings: React.FC = () => {
  const { aiSettings, updateAiSettings, manualCloudSync } = useCrm();
  const { user } = useAuth();
  const companyId = user?.companyId || 'comp-demo-nexodigital';

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isVerifyingWebhook, setIsVerifyingWebhook] = useState(false);
  const [webhookDiagnosticResult, setWebhookDiagnosticResult] = useState<any>(null);

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveConfigSuccess, setSaveConfigSuccess] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState(aiSettings.ycloudFromNumber || '+593962691048');
  const [isSendingTestMessage, setIsSendingTestMessage] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ success: boolean; message: string; response?: any } | null>(null);

  const officialWebhookUrl = 'https://ordenfacilcrmwa.ai.studio/api/whatsapp/webhook';
  const dedicatedWebhookUrl = `https://ordenfacilcrmwa.ai.studio/api/whatsapp/webhook?companyId=${companyId}`;
  const [copiedDedicated, setCopiedDedicated] = useState(false);
  const verifyToken = 'whatscrm_verify_token_2026';

  const copyToClipboard = (text: string, type: 'url' | 'dedicated' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } else if (type === 'dedicated') {
      setCopiedDedicated(true);
      setTimeout(() => setCopiedDedicated(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleTestOpenAI = async () => {
    if (!aiSettings.openaiApiKey && aiSettings.provider === 'openai') {
      setTestResult({
        success: false,
        message: 'Por favor ingresa una API Key de OpenAI antes de probar la conexión.'
      });
      return;
    }

    setIsTestingKey(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/ai/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: { name: 'Lead de Prueba', stage: 'nuevo', tags: ['Test'] },
          history: [],
          incomingMessage: 'Hola, prueba de conexión',
          businessProfile: { companyName: 'Test Business' },
          rules: [],
          products: [],
          faqs: [],
          aiSettings: {
            ...aiSettings,
            provider: aiSettings.provider
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.responseText) {
        setTestResult({
          success: true,
          message: `¡Conexión exitosa! El motor (${data.modelUsed || aiSettings.provider}) respondió correctamente.`
        });
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Fallo de conexión: ${err.message || 'Verifica tu clave o saldo en OpenAI'}`
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const [isTestingYCloud, setIsTestingYCloud] = useState(false);
  const [yCloudTestResult, setYCloudTestResult] = useState<{ success: boolean; message: string; numbers?: any[] } | null>(null);
  const [showYCloudKey, setShowYCloudKey] = useState(false);

  const handleTestYCloud = async () => {
    if (!aiSettings.ycloudApiKey?.trim()) {
      setYCloudTestResult({
        success: false,
        message: 'Por favor ingresa tu API Key de YCloud antes de probar la conexión.'
      });
      return;
    }

    setIsTestingYCloud(true);
    setYCloudTestResult(null);

    try {
      const res = await fetch('/api/whatsapp/test-ycloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: aiSettings.ycloudApiKey.trim(),
          companyId
        })
      });

      const data = await res.json();
      setYCloudTestResult({
        success: res.ok && data.success,
        message: data.message || (res.ok ? '¡Conexión aprobada con YCloud!' : 'Fallo de autenticación con YCloud'),
        numbers: data.phoneNumbers
      });

      if (res.ok && data.success) {
        if (data.detectedSender) {
          updateAiSettings({
            ycloudApiKey: aiSettings.ycloudApiKey.trim(),
            ycloudFromNumber: data.detectedSender,
            whatsappProvider: 'ycloud'
          });
          setTestPhoneNumber(data.detectedSender);
        } else {
          updateAiSettings({
            ycloudApiKey: aiSettings.ycloudApiKey.trim(),
            whatsappProvider: 'ycloud'
          });
        }
      }
    } catch (err: any) {
      setYCloudTestResult({
        success: false,
        message: `Error de red al conectar con el servidor: ${err.message}`
      });
    } finally {
      setIsTestingYCloud(false);
    }
  };

  const handleSaveAllConfig = async () => {
    setIsSavingConfig(true);
    setSaveConfigSuccess(false);
    try {
      const res = await fetch('/api/whatsapp/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          ycloudApiKey: aiSettings.ycloudApiKey?.trim() || '',
          ycloudFromNumber: aiSettings.ycloudFromNumber || '+593962691048',
          whatsappProvider: 'ycloud'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveConfigSuccess(true);
        setTimeout(() => setSaveConfigSuccess(false), 5000);
        await manualCloudSync();
      }
    } catch (err: any) {
      console.error('Error saving whatsapp config:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    if (!testPhoneNumber.trim()) return;
    setIsSendingTestMessage(true);
    setTestSendResult(null);
    try {
      const res = await fetch('/api/whatsapp/send-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          phone: testPhoneNumber.trim(),
          message: '¡Hola! 🦷 Este es un mensaje de prueba exitoso de Dentismed enviado mediante YCloud WhatsApp Coexistence. Den (tu asistente virtual inteligente) está 100% activo y respondiendo.'
        })
      });
      const data = await res.json();
      setTestSendResult({
        success: res.ok && data.success && data.sentViaProvider,
        message: data.message || (data.sentViaProvider ? '¡Mensaje entregado a WhatsApp con éxito!' : 'No se pudo enviar. Verifica tu API Key o saldo en YCloud.'),
        response: data
      });
    } catch (err: any) {
      setTestSendResult({
        success: false,
        message: `Error de red al enviar prueba: ${err.message}`
      });
    } finally {
      setIsSendingTestMessage(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Title */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Integración de IA (OpenAI / Gemini) & WhatsApp API
              </h1>
              <p className="text-xs text-slate-400">
                Configura fácilmente OpenAI para gestionar tus clientes de forma automatizada o usa el motor Gemini integrado.
              </p>
            </div>
          </div>
        </div>

        {/* 1. AI Provider Engine Choice */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Proveedor de Inteligencia Artificial para el Bot
          </h2>
          <p className="text-xs text-slate-400">
            Selecciona qué tecnología procesará los mensajes entrantes de WhatsApp y ejecutará las normativas de tu negocio.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gemini Option */}
            <div
              onClick={() => updateAiSettings({ provider: 'gemini' })}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                aiSettings.provider === 'gemini'
                  ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex items-center justify-center">
                    {aiSettings.provider === 'gemini' && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">Google Gemini 3.8 Flash</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Listo para usar
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pre-configurado en el servidor. Ultra rápido (&lt; 1.5s), con razonamiento agudo y comprensión de normas de venta en español. No requiere configurar claves manuales.
              </p>
            </div>

            {/* OpenAI Option */}
            <div
              onClick={() => updateAiSettings({ provider: 'openai' })}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                aiSettings.provider === 'openai'
                  ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex items-center justify-center">
                    {aiSettings.provider === 'openai' && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">OpenAI (GPT-4o / GPT-4o-mini)</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  Integración Directa
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conecta tu propia cuenta de OpenAI para usar GPT-4o o GPT-4o-mini. Ideal si ya tienes créditos en OpenAI o prefieres su modelo conversacional.
              </p>
            </div>
          </div>

          {/* OpenAI Settings Details */}
          {aiSettings.provider === 'openai' && (
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  OpenAI API Key *
                </label>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                >
                  <span>Obtener API Key en OpenAI</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  value={aiSettings.openaiApiKey}
                  onChange={(e) => updateAiSettings({ openaiApiKey: e.target.value })}
                  placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                />
                <button
                  onClick={handleTestOpenAI}
                  disabled={isTestingKey}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingKey ? 'animate-spin' : ''}`} />
                  <span>{isTestingKey ? 'Probando...' : 'Probar Clave'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/40 border-red-500/40 text-red-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Modelo de OpenAI
                  </label>
                  <select
                    value={aiSettings.model}
                    onChange={(e) => updateAiSettings({ model: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Recomendado: Rápido y muy económico)</option>
                    <option value="gpt-4o">gpt-4o (Máxima inteligencia para ventas complejas)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Temperatura ({aiSettings.temperature}) - Creatividad
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={aiSettings.temperature}
                    onChange={(e) => updateAiSettings({ temperature: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>0.0 (Estricto a las normas)</span>
                    <span>1.0 (Creativo y libre)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Automated CRM Settings */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Automatizaciones del CRM & WhatsApp
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div className="pr-4">
                <span className="text-xs font-bold text-white block">
                  Auto-calificación de Etapas en el Embudo CRM
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  La IA mueve al cliente automáticamente (ej: de "Nuevo" a "Interesado" o "Cotizado") cuando detecta intención en la conversación.
                </span>
              </div>
              <input
                type="checkbox"
                checked={aiSettings.autoQualifyLeads}
                onChange={(e) => updateAiSettings({ autoQualifyLeads: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div className="pr-4">
                <span className="text-xs font-bold text-white block">
                  Auto-etiquetado de Clientes
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Asigna etiquetas de forma autónoma (ej: "Pidió Descuento", "Hot Lead", "Requiere Asesor").
                </span>
              </div>
              <input
                type="checkbox"
                checked={aiSettings.autoTagLeads}
                onChange={(e) => updateAiSettings({ autoTagLeads: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-white">
                  Simulación de Escritura Natural (Delay de Respuesta)
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {aiSettings.responseDelaySeconds} segundos
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Tiempo de espera antes de enviar la respuesta del bot para que el cliente vea el indicador "escribiendo..." como una persona real.
              </p>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.5"
                value={aiSettings.responseDelaySeconds}
                onChange={(e) =>
                  updateAiSettings({ responseDelaySeconds: parseFloat(e.target.value) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 3. WhatsApp Business Connectivity (YCloud Coexistence & Meta) */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                Conexión con WhatsApp Business & Webhooks
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Conecta tu número de WhatsApp para que el CRM reciba mensajes en tiempo real y el Bot responda automáticamente.
              </p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Servidor Webhook Listo (200 OK)</span>
            </span>
          </div>

          {/* Provider Selection Tabs: YCloud (Coexistence) vs Meta Cloud API */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => updateAiSettings({ whatsappProvider: 'ycloud' })}
              className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                aiSettings.whatsappProvider !== 'meta'
                  ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/30 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">YCloud (WhatsApp Coexistence)</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-extrabold uppercase">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Mantienes WhatsApp Business en tu celular y conectas la API al mismo tiempo.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateAiSettings({ whatsappProvider: 'meta' })}
              className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                aiSettings.whatsappProvider === 'meta'
                  ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/30 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-xs text-white block">Meta Cloud API Directa</span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Para números dedicados de Meta o números de prueba en developers.facebook.com.
                </p>
              </div>
            </button>
          </div>

          {/* ==================== YCLOUD COEXISTENCE PANEL ==================== */}
          {aiSettings.whatsappProvider !== 'meta' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Coexistence Hero Explanation */}
              <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>¡Modo WhatsApp Coexistence con YCloud Activado para Dentismed!</span>
                </div>
                <p className="text-emerald-200/90 text-[11px] leading-relaxed">
                  Con <strong>WhatsApp Coexistence</strong> no pierdes acceso a la app móvil de WhatsApp Business en tu celular (número <strong>0962691048</strong>). Puedes seguir chateando normalmente desde tu teléfono, mientras que los mensajes recibidos se sincronizan con este CRM y el Bot responde de forma automatizada.
                </p>
              </div>

              {/* 1. YCloud API Key */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Paso 1: API Key de YCloud *</span>
                  </label>
                  <a
                    href="https://www.ycloud.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Ir a la consola de YCloud</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-slate-400">
                  En el panel de YCloud, ve a <strong>Settings ➔ API Keys</strong> (o Developers ➔ API Keys), copia tu clave secreta y pégala aquí:
                </p>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showYCloudKey ? 'text' : 'password'}
                      value={aiSettings.ycloudApiKey || ''}
                      onChange={(e) => updateAiSettings({ ycloudApiKey: e.target.value })}
                      placeholder="key_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowYCloudKey(!showYCloudKey)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                      title={showYCloudKey ? 'Ocultar clave' : 'Mostrar clave'}
                    >
                      {showYCloudKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={handleTestYCloud}
                    disabled={isTestingYCloud}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingYCloud ? 'animate-spin' : ''}`} />
                    <span>{isTestingYCloud ? 'Verificando...' : 'Probar Conexión'}</span>
                  </button>
                </div>

                {/* YCloud Test Result Feedback */}
                {yCloudTestResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                      yCloudTestResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/40 border-red-500/40 text-red-300'
                    }`}
                  >
                    {yCloudTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <span className="font-semibold">{yCloudTestResult.message}</span>
                      {yCloudTestResult.numbers && yCloudTestResult.numbers.length > 0 && (
                        <div className="text-[10px] text-slate-300 font-mono">
                          Número registrado: {yCloudTestResult.numbers.map((n: any) => n.phoneNumber).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. WhatsApp Sender Phone Number */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Paso 2: Tu Número de WhatsApp Emisor (From)</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  El número de teléfono vinculado con WhatsApp Coexistence en YCloud (en formato internacional E.164 con prefijo +593 para Ecuador):
                </p>
                <input
                  type="text"
                  value={aiSettings.ycloudFromNumber || '+593962691048'}
                  onChange={(e) => updateAiSettings({ ycloudFromNumber: e.target.value })}
                  placeholder="+593962691048"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono font-semibold"
                />
              </div>

              {/* Save WhatsApp Configuration button */}
              <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Guardar y Activar Claves en el Servidor</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Asegura que tu API Key y número emisor queden grabados permanentemente en la base de datos para responder a tu celular.
                  </p>
                </div>
                <button
                  onClick={handleSaveAllConfig}
                  disabled={isSavingConfig}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  <Save className={`w-3.5 h-3.5 ${isSavingConfig ? 'animate-spin' : ''}`} />
                  <span>{isSavingConfig ? 'Guardando...' : 'Guardar Configuración'}</span>
                </button>
              </div>

              {saveConfigSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold">¡Claves de WhatsApp guardadas con éxito en el servidor y listas para enviar!</span>
                </div>
              )}

              {/* 3. YCloud Inbound Webhook URL */}
              <div className="bg-slate-950 p-4 rounded-xl border-2 border-emerald-500/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="font-bold text-xs sm:text-sm text-white">
                      Paso 3: URL de Webhook para YCloud (Recibir Mensajes)
                    </h3>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/40">
                    Pública sin cookies
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  Copia tu URL de Webhook y pégala en la sección de <strong>Webhooks</strong> dentro de tu consola de YCloud:
                </p>

                {/* Primary Official Webhook */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">URL Oficial de Callback (Recomendada):</span>
                    <span className="text-[10px] text-emerald-400 font-medium">Recomendado para producción</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={officialWebhookUrl}
                      className="flex-1 bg-slate-900 border border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono select-all font-semibold"
                    />
                    <button
                      onClick={() => copyToClipboard(officialWebhookUrl, 'url')}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
                    >
                      {copiedWebhook ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedWebhook ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* Company Dedicated Webhook */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">URL Dedicada de tu Empresa (Directo a tu ID):</span>
                    <span className="text-[10px] text-slate-400 font-mono">{companyId}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={dedicatedWebhookUrl}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(dedicatedWebhookUrl, 'dedicated')}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      {copiedDedicated ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedDedicated ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-2">
                  <strong className="text-emerald-400 block font-semibold">
                    📋 Dónde pegar el Webhook en YCloud (Guía en 4 pasos):
                  </strong>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
                    <li>
                      En tu cuenta de <strong>YCloud</strong>, dirígete al menú de la izquierda y haz clic en <strong>Settings ➔ Webhooks</strong> (o Developers ➔ Webhooks).
                    </li>
                    <li>
                      Haz clic en el botón azul <strong>"Add Endpoint"</strong> (o "Crear Webhook").
                    </li>
                    <li>
                      En el campo <strong>Endpoint URL</strong>, pega la URL que copiaste arriba (<code className="text-emerald-400 font-mono">{officialWebhookUrl}</code>).
                    </li>
                    <li>
                      En la lista de <strong>Events to send</strong> (Eventos a enviar), marca las siguientes casillas obligatorias:
                      <div className="mt-1 pl-4 space-y-0.5 font-mono text-[10px] text-emerald-300">
                        <div>✔ <strong>whatsapp.inbound_message</strong> (¡El más importante! Para recibir mensajes de clientes).</div>
                        <div>✔ <strong>whatsapp.message.updated</strong> (Para recibir confirmaciones de entrega y lectura).</div>
                      </div>
                    </li>
                    <li>
                      Haz clic en <strong>"Create Endpoint"</strong> / <strong>"Save"</strong>.
                    </li>
                  </ol>
                </div>
              </div>

              {/* Ready to Test Notification */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>¿Cómo probar que todo está funcionando al 100%?</span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Una vez guardada tu API Key y registrado el webhook en YCloud:
                </p>
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-[11px] space-y-1">
                  <div>1. Pídele a un amigo o colega que envíe un WhatsApp a tu número <strong>0962691048</strong> diciendo: <em>"Hola, ¿tienen promociones para niños?"</em></div>
                  <div>2. Verás cómo aparece inmediatamente el mensaje en tu teléfono celular y en la pestaña <strong>"Mensajes"</strong> de este CRM.</div>
                  <div>3. <strong>Den</strong> (tu asistente inteligente) responderá automáticamente con la promoción de $15 USD de limpieza dental infantil.</div>
                </div>
              </div>

              {/* Interactive Outbound Test Message to cellphone */}
              <div className="bg-slate-950 p-4 rounded-xl border-2 border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-xs sm:text-sm text-white">
                      Paso 4: Probar Envío Directo a tu Celular (Test de Salida)
                    </h3>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/40">
                    Verificación en Vivo
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  Ingresa tu número de teléfono de WhatsApp para enviarte un mensaje real de prueba ahora mismo y comprobar que llega a tu celular:
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="+593962691048"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono font-semibold"
                  />
                  <button
                    onClick={handleSendTestWhatsApp}
                    disabled={isSendingTestMessage || !testPhoneNumber.trim()}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingTestMessage ? 'animate-spin' : ''}`} />
                    <span>{isSendingTestMessage ? 'Enviando a celular...' : 'Enviar Prueba a mi Celular'}</span>
                  </button>
                </div>

                {testSendResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                      testSendResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/40 border-red-500/40 text-red-300'
                    }`}
                  >
                    {testSendResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <span className="font-semibold">{testSendResult.message}</span>
                      {testSendResult.response?.providerResponse && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Detalle: {JSON.stringify(testSendResult.response.providerResponse)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== META CLOUD API PANEL ==================== */}
          {aiSettings.whatsappProvider === 'meta' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Alert Explaining Meta Error #N/A:WBxP-461624063-2185703960 */}
              <div className="bg-amber-950/40 border border-amber-600/50 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>¿Por qué Meta WhatsApp da error al intentar registrar el número personal?</span>
                </div>
                <p className="text-amber-200/90 text-[11px] leading-relaxed">
                  Meta Cloud API directa no permite vincular números que ya están activos en la aplicación móvil de WhatsApp sin antes eliminarlos de la app del celular. Por esa razón, <strong>YCloud con Coexistence</strong> es la alternativa ideal que te permite mantener ambos funcionando en simultáneo.
                </p>
              </div>

              {/* SHARED APP URL SECTION */}
              <div className="bg-slate-950 p-4 rounded-xl border-2 border-emerald-500/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      URL de Webhook para Meta Cloud API
                    </h3>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/40">
                    Pública sin cookies
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      URL Oficial de Callback (Recomendada para Meta)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={officialWebhookUrl}
                        className="flex-1 bg-slate-900 border border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono select-all font-semibold"
                      />
                      <button
                        onClick={() => copyToClipboard(officialWebhookUrl, 'url')}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
                      >
                        {copiedWebhook ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedWebhook ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      URL Dedicada con ID de Empresa
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={dedicatedWebhookUrl}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono select-all"
                      />
                      <button
                        onClick={() => copyToClipboard(dedicatedWebhookUrl, 'dedicated')}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                      >
                        {copiedDedicated ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedDedicated ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Token de Verificación (Verify Token)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={verifyToken}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(verifyToken, 'token')}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedToken ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedToken ? '¡Copiado!' : 'Copiar Token'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
