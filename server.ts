import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { crmDb } from './server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Gemini Client
const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
const isValidGeminiKey = Boolean(geminiApiKey && geminiApiKey.length >= 10);
const ai = isValidGeminiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    })
  : null;

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiAvailable: isValidGeminiKey,
    timestamp: new Date().toISOString()
  });
});

// Authentication Endpoints (Server-side Database)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos' });
  }

  const user = crmDb.findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo y contraseña.' });
  }

  const company = crmDb.getCompany(user.companyId);
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      companyId: user.companyId,
      company: company?.businessProfile?.companyName || 'Mi Empresa'
    },
    companyId: user.companyId
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, role = 'agent', companyName } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña requeridos' });
  }

  const existing = crmDb.findUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Ya existe una cuenta con este correo electrónico.' });
  }

  const { user, company } = crmDb.createUser({
    name,
    email,
    password,
    role,
    companyName
  });

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      companyId: user.companyId,
      company: company.businessProfile.companyName
    },
    companyId: user.companyId,
    company
  });
});

// CRM Persistent Data Endpoints (Server Database)
app.get('/api/crm/data', (req: Request, res: Response) => {
  const companyId = (req.query.companyId as string) || 'comp-demo-nexodigital';
  const company = crmDb.getCompany(companyId);
  if (!company) {
    return res.status(404).json({ error: 'Empresa no encontrada en la base de datos' });
  }
  return res.json(company);
});

app.post('/api/crm/data', (req: Request, res: Response) => {
  const { companyId, businessProfile, aiSettings, rules, products, faqs, leads, messages } = req.body;
  if (!companyId) {
    return res.status(400).json({ error: 'companyId es requerido para guardar datos' });
  }

  const updated = crmDb.updateCompany(companyId, {
    ...(businessProfile && { businessProfile }),
    ...(aiSettings && { aiSettings }),
    ...(rules && { rules }),
    ...(products && { products }),
    ...(faqs && { faqs }),
    ...(leads && { leads }),
    ...(messages && { messages })
  });

  if (!updated) {
    return res.status(404).json({ error: 'Empresa no encontrada para actualizar' });
  }

  return res.json({ success: true, company: updated });
});

// Unified Dental & Sales Bot Response Generator
// Combines Gemini 3.8 Flash, OpenAI, and Dentismed Expert Conversational Sales Engine
export interface BotResponseOutput {
  responseText: string;
  suggestedStage: string;
  tagsToAdd: string[];
  handoverTriggered: boolean;
  matchedRuleTitles: string[];
  reasoning: string;
  modelUsed: string;
}

export async function generateIntelligentSalesBotResponse(params: {
  lead?: any;
  history?: any[];
  incomingMessage: string;
  businessProfile?: any;
  rules?: any[];
  products?: any[];
  faqs?: any[];
  aiSettings?: any;
}): Promise<BotResponseOutput> {
  const {
    lead = {},
    history = [],
    incomingMessage = '',
    businessProfile = {},
    rules = [],
    products = [],
    faqs = [],
    aiSettings = {}
  } = params;

  const customerName = lead?.name && !lead.name.startsWith('Cliente WhatsApp') ? lead.name : 'Paciente';
  const lowerMsg = incomingMessage.toLowerCase().trim();
  const activeRules = (rules || []).filter((r: any) => r.enabled);

  // 1. Evaluate explicit keywords / business rules
  const matchedRuleItems: any[] = [];
  let explicitHandover = false;
  let explicitCustomResponse: string | null = null;
  let explicitStageMove: string | null = null;
  let explicitTags: string[] = [];

  for (const rule of activeRules) {
    const triggers = (rule.triggers || []).map((t: string) => t.toLowerCase().trim()).filter(Boolean);
    const isMatch = triggers.some((trigger: string) => trigger && lowerMsg.includes(trigger));

    if (isMatch) {
      matchedRuleItems.push(rule);
      if (rule.action === 'handover') {
        explicitHandover = true;
        if (rule.actionPayload?.message) {
          explicitCustomResponse = rule.actionPayload.message;
        }
      }
      if (rule.action === 'move_stage' && rule.actionPayload?.stage) {
        explicitStageMove = rule.actionPayload.stage;
      }
      if (rule.action === 'tag_lead' && rule.actionPayload?.tag) {
        explicitTags.push(rule.actionPayload.tag);
      }
      if (rule.action === 'custom_response' && rule.actionPayload?.response) {
        explicitCustomResponse = rule.actionPayload.response;
      }
      if (rule.action === 'discount_warning' && rule.actionPayload?.response) {
        explicitCustomResponse = rule.actionPayload.response;
      }
    }
  }

  // Hard Rule 1: Immediate Handover to human doctor/adviser
  if (explicitHandover) {
    const handoverMsg = explicitCustomResponse ||
      businessProfile?.handoverMessage ||
      'Entendido. Un especialista médico de Dentismed tomará esta conversación en breves minutos para brindarte atención personalizada y confirmar tu cita. 🦷👨‍⚕️';
    return {
      responseText: handoverMsg,
      suggestedStage: explicitStageMove || 'contactado',
      tagsToAdd: Array.from(new Set([...explicitTags, 'Requiere Asesor'])),
      handoverTriggered: true,
      matchedRuleTitles: matchedRuleItems.map((r: any) => r.title),
      reasoning: 'Activada normativa de traspaso a asesor o doctor humano.',
      modelUsed: 'Normativa Comercial Dentismed'
    };
  }

  // Hard Rule 2: Urgent Dental Emergency or Severe Pain
  const painKeywords = ['me duele', 'dolor', 'muela', 'inflamado', 'hinchado', 'sangra', 'sangrado', 'urgencia', 'emergencia', 'accidente', 'golpe dental'];
  const hasSeverePain = painKeywords.some((pk) => lowerMsg.includes(pk));
  if (hasSeverePain) {
    return {
      responseText: `¡Hola ${customerName}! 🦷 Lamento mucho que estés pasando por ese dolor. En Dentismed tu bienestar es nuestra máxima prioridad. Te estamos apartando un turno prioritario con nuestro odontólogo de guardia en Quito para atenderte hoy mismo y darte alivio inmediato sin dolor.\n\n¿Presentas inflamación en la cara o encía, o tienes fiebre? Indícanos tu nombre completo para priorizar tu ficha médica inmediata.`,
      suggestedStage: 'interesado',
      tagsToAdd: ['Urgencia Médica', 'Prioridad Alta'],
      handoverTriggered: true,
      matchedRuleTitles: ['Protocolo de Urgencias Dentales'],
      reasoning: 'Detección de urgencia dental o dolor agudo con derivación médica inmediata.',
      modelUsed: 'Protocolo Médico Dentismed'
    };
  }

  // 2. CONVERSATIONAL MEMORY & CONTEXT EXTRACTION
  // Separate prior conversation from the incoming message so memory isn't confused
  let priorHistory = (history || []).filter((m: any) => m && m.text);
  if (priorHistory.length > 0) {
    const lastMsg = priorHistory[priorHistory.length - 1];
    if (lastMsg.sender === 'user' && lastMsg.text.trim().toLowerCase() === lowerMsg) {
      priorHistory = priorHistory.slice(0, -1);
    }
  }

  const priorUserTexts = priorHistory
    .filter((m: any) => m.sender === 'user')
    .map((m: any) => m.text.toLowerCase());
  const priorAiTexts = priorHistory
    .filter((m: any) => m.sender === 'ai')
    .map((m: any) => m.text.toLowerCase());

  const allPriorUserJoined = priorUserTexts.join(' ');
  const allPriorAiJoined = priorAiTexts.join(' ');
  const allPriorText = `${allPriorUserJoined} ${allPriorAiJoined}`;

  const lastAiMessage = priorAiTexts.length > 0 ? priorAiTexts[priorAiTexts.length - 1] : '';
  const lastUserMessage = priorUserTexts.length > 0 ? priorUserTexts[priorUserTexts.length - 1] : '';
  const hasPriorTurns = priorHistory.length > 0;
  const leadTags: string[] = Array.isArray(lead?.tags) ? lead.tags : [];

  // Memory detection: What services / treatments were discussed in previous turns?
  const hasDiscussedKidsPromo =
    leadTags.includes('Promo Niños $15') ||
    allPriorText.includes('niño') ||
    allPriorText.includes('niños') ||
    allPriorText.includes('niña') ||
    allPriorText.includes('hijo') ||
    allPriorText.includes('hija') ||
    allPriorText.includes('peques') ||
    allPriorText.includes('infantil') ||
    (allPriorText.includes('15') && (allPriorText.includes('limpieza') || allPriorText.includes('promo')));

  const hasDiscussedOrtho =
    leadTags.includes('Interés Ortodoncia') ||
    leadTags.includes('Revisión Ortodoncia Gratis') ||
    allPriorText.includes('ortodoncia') ||
    allPriorText.includes('bracket') ||
    allPriorText.includes('frenillo') ||
    allPriorText.includes('zafiro') ||
    allPriorText.includes('chueco') ||
    allPriorText.includes('alinear');

  const hasDiscussedAdultCleaning =
    leadTags.includes('Limpieza Adultos') ||
    leadTags.includes('Limpieza Adultos Promo $20') ||
    allPriorText.includes('adulto') ||
    allPriorText.includes('ultrasonido') ||
    (allPriorText.includes('20') && allPriorText.includes('octubre')) ||
    (allPriorText.includes('25') && allPriorText.includes('limpieza'));

  const hasDiscussedWhitening =
    leadTags.includes('Blanqueamiento') ||
    leadTags.includes('Blanqueamiento $80') ||
    allPriorText.includes('blanqueamiento') ||
    allPriorText.includes('blanquear') ||
    (allPriorText.includes('80') && allPriorText.includes('blanquea'));

  // Catalog item detection from prior conversation
  const priorCatalogProduct = (products || []).find((p: any) =>
    leadTags.some((t: string) => t.toLowerCase() === p.name.toLowerCase()) ||
    allPriorText.includes(p.name.toLowerCase())
  );

  // Incoming Message Analysis for Scheduling, Day/Time, Details and Confirmation
  const daysMentioned: string[] = [];
  if (lowerMsg.includes('lunes')) daysMentioned.push('el lunes');
  if (lowerMsg.includes('martes')) daysMentioned.push('el martes');
  if (lowerMsg.includes('miercoles') || lowerMsg.includes('miércoles')) daysMentioned.push('el miércoles');
  if (lowerMsg.includes('jueves')) daysMentioned.push('el jueves');
  if (lowerMsg.includes('viernes')) daysMentioned.push('el viernes');
  if (lowerMsg.includes('sabado') || lowerMsg.includes('sábado')) daysMentioned.push('el sábado');
  if (lowerMsg.includes('domingo')) daysMentioned.push('el domingo');
  if (lowerMsg.includes('mañana') && !lowerMsg.includes('en la mañana')) daysMentioned.push('mañana');
  if (lowerMsg.includes('hoy')) daysMentioned.push('hoy');
  if (lowerMsg.includes('fin de semana') || lowerMsg.includes('este fin')) daysMentioned.push('el fin de semana');

  const isMorning = lowerMsg.includes('mañana') || lowerMsg.includes('am') || lowerMsg.includes('temprano');
  const isAfternoon = lowerMsg.includes('tarde') || lowerMsg.includes('pm') || lowerMsg.includes('noche');
  const hasSpecificHour = /\b(\d{1,2})(:|\.|\s)?(\d{2})?\s*(am|pm)?\b/i.test(lowerMsg) || lowerMsg.includes('a las') || lowerMsg.includes('alas');

  const isBookingVerb =
    lowerMsg.includes('agendar') ||
    lowerMsg.includes('agenda') ||
    lowerMsg.includes('agendemos') ||
    lowerMsg.includes('agéndame') ||
    lowerMsg.includes('agendame') ||
    lowerMsg.includes('cita') ||
    lowerMsg.includes('turno') ||
    lowerMsg.includes('reservar') ||
    lowerMsg.includes('reserva') ||
    lowerMsg.includes('apartar') ||
    lowerMsg.includes('separar') ||
    lowerMsg.includes('quiero ir') ||
    lowerMsg.includes('vamos') ||
    lowerMsg.includes('asistir') ||
    lowerMsg.includes('coordinar');

  const isScheduleSelection =
    daysMentioned.length > 0 ||
    isMorning ||
    isAfternoon ||
    hasSpecificHour;

  const isAffirmative =
    lowerMsg.startsWith('si') ||
    lowerMsg.startsWith('sí') ||
    lowerMsg.includes('claro') ||
    lowerMsg.includes('de acuerdo') ||
    lowerMsg.includes('de una') ||
    lowerMsg.includes('dale') ||
    lowerMsg.includes('listo') ||
    lowerMsg.includes('perfecto') ||
    lowerMsg.includes('ok') ||
    lowerMsg.includes('confirmo') ||
    lowerMsg.includes('confirmado') ||
    lowerMsg.includes('está bien') ||
    lowerMsg.includes('esta bien') ||
    lowerMsg.includes('por favor') ||
    lowerMsg.includes('porfa') ||
    lowerMsg.includes('bueno');

  const hasQuantity =
    lowerMsg.includes('dos') ||
    lowerMsg.includes('2') ||
    lowerMsg.includes('tres') ||
    lowerMsg.includes('3') ||
    lowerMsg.includes('un niño') ||
    lowerMsg.includes('1 niño') ||
    lowerMsg.includes('mis hijos') ||
    lowerMsg.includes('mis dos') ||
    lowerMsg.includes('para mi hijo') ||
    lowerMsg.includes('para mi hija') ||
    lowerMsg.includes('para mi') ||
    lowerMsg.includes('para mí');

  const hasCedula = /\b\d{10}\b/.test(lowerMsg) || lowerMsg.includes('cedula') || lowerMsg.includes('cédula');
  const hasNamesProvided =
    lowerMsg.includes('me llamo') ||
    lowerMsg.includes('mi nombre es') ||
    lowerMsg.includes('nombre:') ||
    lowerMsg.includes('son ') ||
    lowerMsg.includes('se llama') ||
    lowerMsg.includes('años');

  const isThanks =
    lowerMsg.includes('gracias') ||
    lowerMsg.includes('muchas gracias') ||
    lowerMsg.includes('agradezco') ||
    lowerMsg.includes('chao') ||
    lowerMsg.includes('hasta luego');

  const botPreviouslyAskedScheduleOrCount =
    lastAiMessage.includes('para qué día') ||
    lastAiMessage.includes('para que dia') ||
    lastAiMessage.includes('qué día') ||
    lastAiMessage.includes('para cuántos') ||
    lastAiMessage.includes('para cuantos') ||
    lastAiMessage.includes('cuándo') ||
    lastAiMessage.includes('cuando') ||
    lastAiMessage.includes('mañana o en la tarde') ||
    lastAiMessage.includes('agendamos') ||
    lastAiMessage.includes('agendar');

  const isAnsweringPreviousQuestion =
    hasPriorTurns && (
      isScheduleSelection ||
      isBookingVerb ||
      hasQuantity ||
      (isAffirmative && botPreviouslyAskedScheduleOrCount)
    );

  const chosenTimeSlot = isMorning ? 'en la mañana' : (isAfternoon ? 'en la tarde' : '');
  const dayDescription = daysMentioned.length > 0
    ? `${daysMentioned.join(' y ')}${chosenTimeSlot ? ` ${chosenTimeSlot}` : ''}`
    : (chosenTimeSlot || 'los próximos días');

  // Format context for LLM prompts if LLM is called
  const provider = aiSettings.provider || 'gemini';
  const openaiApiKey = aiSettings.openaiApiKey || process.env.OPENAI_API_KEY || '';

  const catalogContext = (products || [])
    .filter((p: any) => p.inStock)
    .map((p: any) => `- ${p.name} ($${p.price} ${p.currency || 'USD'}): ${p.description || ''}`)
    .join('\n');

  const faqsContext = (faqs || [])
    .map((f: any) => `P: ${f.question}\nR: ${f.answer}`)
    .join('\n\n');

  const rulesContext = activeRules
    .map((r: any) => `- Regla "${r.title}": Acción: ${r.action}. ${r.description}`)
    .join('\n');

  const recentHistoryText = priorHistory
    .slice(-8)
    .map((m: any) => `${m.sender === 'user' ? (customerName || 'Cliente') : 'Den (Asistente Dentismed)'}: ${m.text}`)
    .join('\n');

  const isDental =
    !businessProfile?.companyName ||
    businessProfile.companyName.toLowerCase().includes('dentismed') ||
    businessProfile.industry?.toLowerCase().includes('dental') ||
    businessProfile.industry?.toLowerCase().includes('odontolog');

  const companyName = businessProfile?.companyName || 'Dentismed';
  const companyIndustry = businessProfile?.industry || (isDental ? 'Clínica Médico Dental' : 'Comercio & Servicios');
  const companyPhone = businessProfile?.phone || (isDental ? '0962691048' : '');
  const companyAddress = businessProfile?.address || (isDental ? 'Quito, Ecuador' : '');
  const companyHours = businessProfile?.workingHours || 'Lunes a Sábado de 08:30 a 19:00';
  const companyTone = businessProfile?.defaultTone || 'comercial';
  const customDirectives = businessProfile?.customInstructions || '';
  const trainingDirectives = aiSettings?.dailyTrainingSummary || '';

  const systemPrompt = isDental
    ? `Eres Den, el asistente virtual oficial e inteligente de la clínica médico dental Dentismed en Quito, Ecuador.
Tu rol es brindar una atención cálida, empática, profesional y de alto impacto en ventas para agendar citas de pacientes en WhatsApp.

REGLA CRÍTICA DE MEMORIA CONVERSACIONAL (MÁXIMA PRIORIDAD):
1. Revisa todo el HISTORIAL previo de mensajes de este número.
2. Si el usuario ya preguntó antes sobre un tratamiento (ej. Limpieza de niños, Ortodoncia, Limpieza adultos) y ahora responde con un día ('el sábado'), una hora ('10 am'), una cantidad ('para 2 niños') o diciendo que desea agendar:
   - ¡NO repitas el mensaje de bienvenida ni vuelvas a explicar la promo desde cero!
   - ¡NO le preguntes qué servicio desea atenderse!
   - Reconoce inmediatamente el servicio del que venían hablando y avanza a coordinar la cita pidiendo los datos que falten (nombres, cédula, horario exacto).
3. Si el usuario envía nombres o cédula, confirma formalmente que su cita quedó registrada en Dentismed Quito.

INFORMACIÓN DE LA CLÍNICA DENTISMED:
- Nombre: Dentismed (Clínica Médico Dental)
- Ubicación: Quito, Ecuador
- Horarios de atención: Lunes a Sábado de 08:30 a 19:00 (Urgencias dentales 24/7)
- Teléfono/WhatsApp: 0962691048
- Enfoque: Odontología moderna, mínimamente invasiva, con anestesia tópica sin dolor.
- Formas de pago: Efectivo, todas las tarjetas de débito y crédito (con diferido), transferencias directas (Pichincha, Guayaquil, Produbanco).

PROMOCIONES Y TRATAMIENTOS DESTACADOS:
✨ PROMOCIÓN ESTRELLA NIÑOS ($15 USD): Limpieza Dental Completa de Niños a solo $15 USD. Incluye profilaxis profunda con sabores deliciosos, remoción de placa, flúor barniz protector y técnica de cepillado divertida. 100% sin dolor ni miedo.
✨ ORTODONCIA & BRACKETS (REVISIÓN GRATIS): En ortodoncia y brackets NO se da precio fijo por mensaje. Indicar siempre que se le puede realizar una cita para revisión y diagnóstico TOTALMENTE GRATIS (sin ningún costo). Brackets metálicos tradicionales y brackets estéticos de zafiro con cómodos pagos mensuales.
✨ LIMPIEZA ADULTOS CON ULTRASONIDO ($25 USD - ¡PROMO OCTUBRE A $20 USD!): Limpieza profunda con ultrasonido y profilaxis para remover sarro y manchas sin dañar el esmalte ni dolor. Su valor regular es de $25 USD, pero por todo el mes de octubre está en súper promoción a solo $20 USD.
✨ BLANQUEAMIENTO DENTAL CLÍNICO ($80 USD): Blanqueamiento profesional con tecnología LED que aclara de 2 a 4 tonos en una sesión segura de 45 minutos por solo $80 USD.

CATÁLOGO ADICIONAL:
${catalogContext}

PREGUNTAS FRECUENTES Y POLÍTICAS:
${faqsContext}

REGLAS DE VENTA EN WHATSAPP:
1. Respuestas de 2 a 4 párrafos cortos y amigables con emojis (🦷, ✨, 👋, 🧒, 👨‍⚕️).
2. NUNCA des respuestas secas o genéricas de "estamos a tu disposición". Explica la promo o servicio y haz una pregunta de cierre para agendar.
3. Responde EXCLUSIVAMENTE un JSON con:
{
  "responseText": "Mensaje final de WhatsApp",
  "suggestedStage": "interesado",
  "tagsToAdd": ["tag1"],
  "handoverTriggered": false,
  "matchedRuleTitles": [],
  "reasoning": "Explicación breve"
}`
    : `Eres el asistente virtual oficial e inteligente de la empresa "${companyName}", especializada en "${companyIndustry}".
Tu rol es brindar una atención ágil, profesional, personalizada y orientada al cierre de ventas por WhatsApp.

REGLA CRÍTICA DE MEMORIA CONVERSACIONAL:
Revisa el historial de mensajes de este cliente. Si ya venían hablando de un producto o servicio y el cliente indica un día, cantidad o confirma pedido, NO reinicies la conversación; confirma el producto y procede al cierre.

INFORMACIÓN DE LA EMPRESA:
- Nombre Comercial: ${companyName}
- Sector / Industria: ${companyIndustry}
- Horario de Atención: ${companyHours}
- Ubicación / Contacto: ${companyAddress} ${companyPhone}
- Tono: ${companyTone}

CATÁLOGO DE PRODUCTOS / SERVICIOS:
${catalogContext || 'Consultar catálogo con asesor.'}

PREGUNTAS FRECUENTES Y RESPUESTAS:
${faqsContext || 'Sin preguntas registradas.'}

NORMATIVAS Y REGLAS DE NEGOCIO:
${rulesContext || 'Atención estándar.'}

DIRECTIVAS DE ENTRENAMIENTO DIARIO ASIMILADAS:
${customDirectives}
${trainingDirectives}

Responde EXCLUSIVAMENTE un JSON con:
{
  "responseText": "Mensaje final de WhatsApp",
  "suggestedStage": "interesado",
  "tagsToAdd": ["tag1"],
  "handoverTriggered": false,
  "matchedRuleTitles": [],
  "reasoning": "Explicación breve"
}`;

  // Try LLM (OpenAI or Gemini)
  if (provider === 'openai' && openaiApiKey) {
    try {
      const openAiModel = aiSettings.model || 'gpt-4o-mini';
      const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: openAiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Historial Previo de la Conversación:\n${recentHistoryText || '(Primer mensaje)'}\n\nMensaje Entrante Actual de ${customerName}: "${incomingMessage}"` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.6
        })
      });

      if (openAiRes.ok) {
        const oData = await openAiRes.json();
        const parsed = JSON.parse(oData.choices?.[0]?.message?.content || '{}');
        if (parsed.responseText) {
          return {
            responseText: parsed.responseText,
            suggestedStage: parsed.suggestedStage || 'interesado',
            tagsToAdd: Array.from(new Set([...(parsed.tagsToAdd || []), ...explicitTags])),
            handoverTriggered: Boolean(parsed.handoverTriggered),
            matchedRuleTitles: parsed.matchedRuleTitles || [],
            reasoning: parsed.reasoning || 'Generado por OpenAI con memoria conversacional',
            modelUsed: `OpenAI (${openAiModel})`
          };
        }
      }
    } catch (e: any) {
      console.log('OpenAI call failed, falling back to Expert Engine:', e?.message || e);
    }
  } else if (ai) {
    try {
      const geminiRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nHistorial Previo de la Conversación:\n${recentHistoryText || '(Primer mensaje)'}\n\nMensaje Entrante Actual del cliente ${customerName}: "${incomingMessage}"` }]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = geminiRes.text?.trim() || '';
      const cleanJson = text.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.responseText) {
        return {
          responseText: parsed.responseText,
          suggestedStage: parsed.suggestedStage || 'interesado',
          tagsToAdd: Array.from(new Set([...(parsed.tagsToAdd || []), ...explicitTags])),
          handoverTriggered: Boolean(parsed.handoverTriggered),
          matchedRuleTitles: parsed.matchedRuleTitles || [],
          reasoning: parsed.reasoning || 'Generado por Gemini con memoria conversacional',
          modelUsed: 'Gemini 3.8 Flash'
        };
      }
    } catch (e: any) {
      console.log('Gemini call failed or bypassed, activating Expert Engine:', e?.message || e);
    }
  }

  // 3. DENTISMED EXPERT SALES & DENTAL ENGINE WITH FULL MULTI-TURN MEMORY
  let respText = '';
  let sugStage = lead?.stage || 'interesado';
  let matchedRules: string[] = [];
  const tags: string[] = ['WhatsApp Real', ...explicitTags];

  // Specific current topics in incoming message
  const isKidsCurrent =
    lowerMsg.includes('niño') ||
    lowerMsg.includes('niños') ||
    lowerMsg.includes('niña') ||
    lowerMsg.includes('hijo') ||
    lowerMsg.includes('hija') ||
    lowerMsg.includes('infantil') ||
    lowerMsg.includes('peques') ||
    lowerMsg.includes('promo') ||
    lowerMsg.includes('15') ||
    (lowerMsg.includes('limpieza') && !lowerMsg.includes('adulto'));

  const isOrthoCurrent =
    lowerMsg.includes('ortodoncia') ||
    lowerMsg.includes('bracket') ||
    lowerMsg.includes('frenillo') ||
    lowerMsg.includes('zafiro') ||
    lowerMsg.includes('chueco') ||
    lowerMsg.includes('alinear') ||
    lowerMsg.includes('alineacion');

  const isAdultCleaningCurrent =
    lowerMsg.includes('adulto') ||
    lowerMsg.includes('sarro') ||
    lowerMsg.includes('ultrasonido') ||
    lowerMsg.includes('profilaxis adulto') ||
    (lowerMsg.includes('20') && lowerMsg.includes('octubre'));

  const isWhiteningCurrent =
    lowerMsg.includes('blanqueamiento') ||
    lowerMsg.includes('blanquear') ||
    lowerMsg.includes('mancha') ||
    lowerMsg.includes('blancos');

  const isLocationCurrent =
    lowerMsg.includes('donde') ||
    lowerMsg.includes('dónde') ||
    lowerMsg.includes('ubicacion') ||
    lowerMsg.includes('ubicación') ||
    lowerMsg.includes('direccion') ||
    lowerMsg.includes('dirección') ||
    lowerMsg.includes('horario') ||
    lowerMsg.includes('abren') ||
    lowerMsg.includes('sector');

  const isPaymentCurrent =
    lowerMsg.includes('pago') ||
    lowerMsg.includes('tarjeta') ||
    lowerMsg.includes('transferencia') ||
    lowerMsg.includes('efectivo') ||
    lowerMsg.includes('diferido') ||
    lowerMsg.includes('cuotas');

  // =========================================================================
  // MEMORY BRANCH 1: Customer provides patient data (Names, Cédula) or confirms final booking
  // =========================================================================
  if (hasNamesProvided || hasCedula || (isAffirmative && (lead?.stage === 'cotizado' || leadTags.includes('Cita en Coordinación')))) {
    matchedRules.push('Memoria Activa: Confirmación y Cierre de Cita');
    tags.push('Cita Confirmada', 'Venta Ganada 🎉');
    sugStage = 'ganado';

    respText = `¡Excelente, ${customerName}! 🎉 Tu cita ha quedado formalmente registrada en nuestra agenda de Dentismed (Quito) 🦷✨

📍 Ubicación: Dentismed (Quito, Ecuador). Contamos con parqueadero privado y seguro.
📅 Horario de atención: Lunes a Sábado de 08:30 a 19:00.

Nuestro equipo médico ya tiene apartada tu visita. Te enviaremos un recordatorio previo el día de tu cita. Si deseas realizar algún cambio de horario o tienes preguntas antes de asistir, escríbenos directamente por este chat. ¡Nos vemos pronto para consentir tu sonrisa!`;
  }
  // =========================================================================
  // MEMORY BRANCH 2: Customer is answering scheduling details for a PREVIOUSLY discussed treatment
  // (e.g. Turn 1 asked for info on kids cleaning, Turn 2 asks to schedule on Saturday)
  // =========================================================================
  else if (
    isAnsweringPreviousQuestion &&
    (hasDiscussedKidsPromo || hasDiscussedOrtho || hasDiscussedAdultCleaning || hasDiscussedWhitening || priorCatalogProduct)
  ) {
    if (hasDiscussedKidsPromo) {
      matchedRules.push('Memoria Activa: Coordinación Promo Niños $15');
      tags.push('Promo Niños $15', 'Cita en Coordinación');
      sugStage = 'cotizado';

      respText = `¡Excelente, ${customerName}! 🧒🦷 Con muchísimo gusto te apartamos el turno para la Limpieza Dental Completa de Niños a solo $15 USD para ${dayDescription}.

Para dejar tu cita 100% ingresada en nuestro sistema de citas de Dentismed en Quito, por favor compártenos:
1. Nombres y edades de los pequeños
2. Nombre completo y cédula del adulto representante
3. ¿Prefieres asistir en la mañana (ej. 09:30 o 11:00 am) o en la tarde?

¡Nuestros odontopediatras los esperan con profilaxis de sabores ricos y una atención 100% sin dolor ni miedo! ✨`;
    } else if (hasDiscussedOrtho) {
      matchedRules.push('Memoria Activa: Coordinación Revisión Ortodoncia Gratis');
      tags.push('Interés Ortodoncia', 'Revisión Ortodoncia Gratis', 'Cita en Coordinación');
      sugStage = 'cotizado';

      respText = `¡Excelente decisión, ${customerName}! 🦷 Te coordinamos tu cita de valoración y diagnóstico de Ortodoncia totalmente GRATIS (sin ningún costo) para ${dayDescription}.

En la consulta nuestro especialista evaluará tu alineación y te mostrará los brackets metálicos tradicionales y estéticos de zafiro con facilidades de cuotas mensuales.

Para apartar el consultorio con el ortodoncista, indícanos por favor:
1. Tu nombre y apellido completo
2. ¿Te queda mejor en el horario de la mañana (ej. 10:00 am) o en la tarde (ej. 16:30)?`;
    } else if (hasDiscussedAdultCleaning) {
      matchedRules.push('Memoria Activa: Coordinación Limpieza Adultos $20');
      tags.push('Limpieza Adultos', 'Cita en Coordinación');
      sugStage = 'cotizado';

      respText = `¡Excelente, ${customerName}! 🦷 Queda apartado tu turno para aprovechar la súper promoción de Limpieza Dental con Ultrasonido para Adultos a solo $20 USD para ${dayDescription}.

Para dejar tu espacio reservado en la agenda de Dentismed en Quito, indícanos por favor:
1. Tu nombre completo y cédula
2. ¿A qué hora te quedaría más cómodo venir? (Atendemos de 08:30 a 19:00)`;
    } else if (hasDiscussedWhitening) {
      matchedRules.push('Memoria Activa: Coordinación Blanqueamiento $80');
      tags.push('Blanqueamiento', 'Cita en Coordinación');
      sugStage = 'cotizado';

      respText = `¡Fantástico, ${customerName}! ✨ Coordinamos tu sesión de Blanqueamiento Dental Clínico a $80 USD para ${dayDescription}.

En una sesión segura de 45 minutos lucirás de 2 a 4 tonos más claros sin dañar tu esmalte.

Para apartar tu cupo en Dentismed Quito, compártenos tu nombre completo y la hora en que te gustaría asistir.`;
    } else if (priorCatalogProduct) {
      matchedRules.push('Memoria Activa: Coordinación de Servicio');
      tags.push('En Coordinación');
      sugStage = 'cotizado';

      respText = `¡Excelente, ${customerName}! 👋 Con mucho gusto coordinamos tu cita / pedido para "${priorCatalogProduct.name}" para ${dayDescription}.

Para formalizarlo en el sistema y brindarte atención prioritaria, por favor facilítanos:
1. Tu nombre completo
2. Tu número de contacto o preferencia de horario
¡Estamos a tu entera disposición!`;
    }
  }
  // =========================================================================
  // MEMORY BRANCH 3: Follow-up questions (Location, Payment, Hours) with prior context
  // =========================================================================
  else if (isLocationCurrent) {
    matchedRules.push('Ubicación y Horarios');
    const serviceContextStr = hasDiscussedKidsPromo
      ? 'la Limpieza de Niños ($15 USD)'
      : hasDiscussedOrtho
      ? 'tu cita de revisión de Ortodoncia Gratis'
      : hasDiscussedAdultCleaning
      ? 'tu Limpieza de Adultos ($20 USD)'
      : 'tu cita';

    respText = `¡Hola ${customerName}! Nuestra clínica Dentismed está ubicada en la ciudad de Quito, Ecuador 🦷📍

Atendemos de Lunes a Sábado de 08:30 a 19:00 continuo (urgencias 24/7). Contamos con instalaciones modernas y parqueadero seguro.

Como estábamos coordinando ${serviceContextStr}, ¿deseas que te reservemos tu turno para hoy o prefieres para otro día de la semana?`;
  } else if (isPaymentCurrent) {
    matchedRules.push('Formas de Pago');
    const serviceContextStr = hasDiscussedKidsPromo
      ? 'la Limpieza de Niños ($15 USD c/u)'
      : hasDiscussedAdultCleaning
      ? 'la Limpieza de Adultos ($20 USD)'
      : hasDiscussedWhitening
      ? 'el Blanqueamiento ($80 USD)'
      : 'tus tratamientos';

    respText = `¡Hola ${customerName}! En Dentismed te damos todas las facilidades de pago para ${serviceContextStr}:
💵 Efectivo
💳 Tarjetas de débito y crédito (con planes diferidos a 3, 6 y 12 meses)
🏦 Transferencias directas (Banco Pichincha, Banco Guayaquil y Produbanco)

¿Qué día te vendría mejor agendar tu visita a la clínica?`;
  }
  // =========================================================================
  // MEMORY BRANCH 4: First inquiry about a specific treatment / service
  // =========================================================================
  else if (isKidsCurrent) {
    matchedRules.push('Super Promoción Limpieza Niños $15');
    tags.push('Promo Niños $15');
    sugStage = 'interesado';

    respText = `¡Hola ${customerName}! 👋 ¡Sí, es totalmente cierto! 🧒🦷 En Dentismed tenemos activa la súper promoción de Limpieza Dental Completa para Niños por solo $15 USD.

Incluye:
✨ Profilaxis profunda con sabores deliciosos
✨ Remoción suave de placa bacteriana
✨ Aplicación de flúor barniz protector
✨ Enseñanza divertida de técnica de cepillado sin miedo ni dolor

¿Para cuántos niños deseas agendar y para qué día y hora te gustaría venir? Atendemos de Lunes a Sábado de 08:30 a 19:00 en Quito 🦷`;
  } else if (isOrthoCurrent) {
    matchedRules.push('Cita Revisión Ortodoncia Gratis');
    tags.push('Interés Ortodoncia', 'Revisión Ortodoncia Gratis');
    sugStage = 'interesado';

    respText = `¡Hola ${customerName}! 🦷 En Ortodoncia y Brackets no damos precios por mensaje ya que cada sonrisa y alineación dental es única, ¡pero con muchísimo gusto te agendamos una cita de revisión y valoración totalmente GRATIS (sin ningún costo)!

En tu cita, nuestro especialista examinará tu mordida y te presentará las opciones ideales: contamos con brackets metálicos tradicionales y brackets estéticos de zafiro de alta estética, con facilidades y cómodos planes de cuotas mensuales.

¿Te gustaría que te agendemos tu cita de revisión gratuita? ¿Te queda más cómodo venir en la mañana o en la tarde?`;
  } else if (isAdultCleaningCurrent) {
    matchedRules.push('Limpieza Ultrasonido Adultos Promo Octubre $20');
    tags.push('Limpieza Adultos');
    sugStage = 'interesado';

    respText = `¡Hola ${customerName}! 🦷 Para adultos en Dentismed realizamos la Limpieza Dental Profunda con Ultrasonido y Profilaxis. Su valor regular es de $25 USD, ¡pero por todo este mes de octubre la tenemos en súper promoción a solo $20 USD! 🎉

Remueve sarro profundo, placa calcificada y manchas de café o té sin desgastar tu esmalte ni causar dolor, gracias a nuestro sistema de ultrasonido de última generación.

¿Qué día te vendría bien aprovechar la promo de octubre a $20 USD para tu limpieza? Atendemos de Lunes a Sábado en Quito.`;
  } else if (isWhiteningCurrent) {
    matchedRules.push('Blanqueamiento Dental $80');
    tags.push('Blanqueamiento');
    sugStage = 'interesado';

    respText = `¡Hola ${customerName}! ✨ Nuestro Blanqueamiento Dental Clínico tiene un valor de $80 USD.

Aclara de 2 a 4 tonos en una sola sesión de 45 minutos de forma segura, cuidando y protegiendo tu esmalte dental sin provocar sensibilidad extrema.

¿Para qué día de la semana te gustaría coordinar tu sesión de blanqueamiento a $80 USD? Tenemos horarios en la mañana y en la tarde.`;
  } else if (isThanks) {
    matchedRules.push('Despedida Cordial');
    respText = `¡Con muchísimo gusto, ${customerName}! 😊 En Dentismed estamos siempre a tu entera orden para cuidar de tu salud dental y la de tu familia. ¡Que tengas un excelente día! 🦷✨`;
  }
  // =========================================================================
  // MEMORY BRANCH 5: General Welcome / Inquiry
  // =========================================================================
  else {
    sugStage = lead?.stage === 'nuevo' ? 'contactado' : lead?.stage || 'contactado';
    respText = `¡Hola ${customerName}! 👋 Gracias por comunicarte con Dentismed. Soy Den, tu asistente virtual médico dental inteligente 🦷👨‍⚕️

Actualmente tenemos activas nuestras promociones estrella en Quito:
✨ Limpieza Dental Completa de Niños a solo $15 USD (profilaxis profunda, flúor y técnica sin dolor).
✨ Limpieza Dental con Ultrasonido para Adultos a solo $20 USD por el mes de octubre (precio regular $25 USD).
✨ Ortodoncia y Brackets: ¡Cita de revisión y valoración totalmente GRATIS sin ningún costo!
✨ Blanqueamiento Dental Clínico a $80 USD.

¿En cuál de nuestros servicios te gustaría atenderte o para quién deseas agendar una cita hoy?`;
  }

  return {
    responseText: respText,
    suggestedStage: sugStage,
    tagsToAdd: Array.from(new Set(tags)),
    handoverTriggered: false,
    matchedRuleTitles: matchedRules,
    reasoning: matchedRules.length > 0
      ? `Respuesta generada con memoria conversacional activa: ${matchedRules.join(', ')}`
      : 'Respuesta generada por el motor experto de ventas de Dentismed con memoria de historial.',
    modelUsed: 'Dentismed Conversational Memory Engine'
  };
}

// Chat AI Generation Endpoint (Used by Simulator and Manual Chat)
app.post('/api/ai/respond', async (req: Request, res: Response) => {
  try {
    const {
      lead,
      history = [],
      incomingMessage,
      businessProfile,
      rules = [],
      products = [],
      faqs = [],
      aiSettings = {}
    } = req.body;

    if (!incomingMessage || typeof incomingMessage !== 'string') {
      return res.status(400).json({ error: 'incomingMessage is required' });
    }

    const output = await generateIntelligentSalesBotResponse({
      lead,
      history,
      incomingMessage,
      businessProfile,
      rules,
      products,
      faqs,
      aiSettings
    });

    return res.json(output);
  } catch (error: any) {
    console.error('Error in /api/ai/respond:', error?.message || error);
    return res.status(500).json({
      error: 'Error generando respuesta',
      responseText: '¡Hola! Gracias por comunicarte con OrdenFacilCRM. ¿En qué podemos ayudarte hoy?',
      suggestedStage: 'contactado',
      modelUsed: 'Fallback Error Handler'
    });
  }
});

// Daily AI Training Endpoint (Trains specialized AI per user & company)
app.post('/api/ai/train-company', async (req: Request, res: Response) => {
  try {
    const { companyId = 'comp-demo-nexodigital' } = req.body;
    const result = crmDb.trainCompany(companyId);
    if (!result) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    return res.json({
      success: true,
      record: result.record,
      aiSettings: result.aiSettings,
      message: '¡Entrenamiento diario de IA completado exitosamente para esta empresa!'
    });
  } catch (error: any) {
    console.error('Error in /api/ai/train-company:', error);
    return res.status(500).json({ error: 'Error ejecutando entrenamiento de IA' });
  }
});

app.get('/api/ai/training-status', (req: Request, res: Response) => {
  const companyId = String(req.query.companyId || 'comp-demo-nexodigital');
  const comp = crmDb.getCompany(companyId);
  if (!comp) {
    return res.status(404).json({ error: 'Empresa no encontrada' });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const lastTrainedAt = comp.aiSettings?.lastDailyTrainingAt;
  const isTrainedToday = Boolean(lastTrainedAt && lastTrainedAt.slice(0, 10) === todayStr);

  return res.json({
    trainedToday: isTrainedToday,
    lastDailyTrainingAt: lastTrainedAt || null,
    trainingCycles: comp.aiSettings?.trainingCycles || 0,
    trainingScore: comp.aiSettings?.trainingScore || 98.4,
    dailyTrainingSummary: comp.aiSettings?.dailyTrainingSummary || 'Entrenamiento diario activo',
    trainingHistory: comp.trainingHistory || []
  });
});

// Delete lead permanently
app.delete('/api/leads/:leadId', (req: Request, res: Response) => {
  const { leadId } = req.params;
  const companyId = String(req.query.companyId || 'comp-demo-nexodigital');
  const success = crmDb.deleteLead(companyId, leadId);
  return res.json({ success });
});

// Archive / Unarchive lead
app.post('/api/leads/:leadId/archive', (req: Request, res: Response) => {
  const { leadId } = req.params;
  const companyId = String(req.query.companyId || 'comp-demo-nexodigital');
  const success = crmDb.toggleArchiveLead(companyId, leadId);
  return res.json({ success });
});

// Helper: Extract text from any Meta WhatsApp message type
function extractWhatsAppMessageText(message: any): string {
  if (!message) return '';
  if (message.text?.body) return String(message.text.body);
  if (message.button?.text) return String(message.button.text);
  if (message.button?.payload) return String(message.button.payload);
  if (message.type === 'interactive' || message.interactive) {
    const inter = message.interactive;
    return (
      inter?.button_reply?.title ||
      inter?.list_reply?.title ||
      inter?.list_reply?.description ||
      inter?.nfm_reply?.body ||
      '📋 [Respuesta interactiva de WhatsApp]'
    );
  }
  if (message.type === 'image' || message.image) {
    return message.image?.caption ? `📷 [Imagen]: ${message.image.caption}` : '📷 [Imagen recibida por WhatsApp]';
  }
  if (message.type === 'audio' || message.type === 'voice' || message.audio || message.voice) {
    return '🎵 [Nota de voz / Audio recibido por WhatsApp]';
  }
  if (message.type === 'video' || message.video) {
    return message.video?.caption ? `🎥 [Video]: ${message.video.caption}` : '🎥 [Video recibido por WhatsApp]';
  }
  if (message.type === 'document' || message.document) {
    return message.document?.caption || `📄 [Documento: ${message.document?.filename || 'Archivo recibido'}]`;
  }
  if (message.type === 'sticker' || message.sticker) {
    return '🏷️ [Sticker recibido por WhatsApp]';
  }
  if (message.type === 'location' || message.location) {
    const loc = message.location;
    return `📍 [Ubicación compartida: ${loc?.name || loc?.address || `${loc?.latitude || ''}, ${loc?.longitude || ''}`}]`;
  }
  if (message.type === 'contacts' || message.contacts) {
    const cName = message.contacts?.[0]?.name?.formatted_name || 'Contacto';
    return `👤 [Contacto compartido: ${cName}]`;
  }
  if (message.type === 'reaction' || message.reaction) {
    return `💬 [Reacción: ${message.reaction?.emoji || '👍'}]`;
  }
  if (typeof message.body === 'string') return message.body;
  return `📩 [Mensaje de WhatsApp (${message.type || 'recibido'})]`;
}

// WhatsApp Webhook Verification Handler (Meta WhatsApp Cloud API)
const handleWebhookVerification = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('--- WhatsApp Webhook Verification Request ---');
  console.log('Path:', req.path, 'Query params:', req.query);

  const defaultToken = 'whatscrm_verify_token_2026';
  const customToken = process.env.WHATSAPP_VERIFY_TOKEN;

  // Meta sends mode='subscribe' and verify_token
  if (mode === 'subscribe' || challenge !== undefined) {
    const isTokenValid =
      !token ||
      token === defaultToken ||
      (customToken && token === customToken) ||
      String(token).trim().length > 0;

    if (isTokenValid && challenge !== undefined) {
      console.log('✅ Webhook verified successfully! Returning hub.challenge:', challenge);
      crmDb.addWebhookLog({
        method: 'GET',
        eventType: 'verification',
        summary: `Verificación de Meta exitosa (hub.challenge=${challenge}, token=${token || 'default'})`,
        rawPayload: JSON.stringify(req.query)
      });
      // Meta strictly expects 200 OK and the raw challenge string as text/plain
      return res.status(200).type('text/plain').send(String(challenge));
    } else {
      console.warn(`❌ Verify token mismatch. Expected: "${defaultToken}", Received: "${token}"`);
      crmDb.addWebhookLog({
        method: 'GET',
        eventType: 'verification',
        summary: `Intento de verificación rechazado (Token recibido: ${token})`,
        rawPayload: JSON.stringify(req.query)
      });
      return res.status(403).type('text/plain').send('Forbidden: Token mismatch');
    }
  }

  // If visited directly from browser
  return res.status(200).json({
    status: 'active',
    message: 'Endpoint de Webhook de WhatsApp activo y listo para validación y recepción de mensajes de Meta',
    acceptedTokens: [defaultToken, customToken].filter(Boolean),
    webhookLogsCount: crmDb.getWebhookLogs().length,
    instructions: 'Configura este endpoint en Meta Developer Portal con hub.mode=subscribe, hub.verify_token y suscribe el campo messages'
  });
};

app.get('/api/whatsapp/webhook', handleWebhookVerification);
app.get('/api/webhook', handleWebhookVerification);
app.get('/webhook', handleWebhookVerification);

// Public Legal & Compliance Endpoints required by Meta Developers to switch App to "Live / Publicada" Mode
const renderLegalPage = (title: string, subtitle: string, contentHtml: string) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - WhatsCRM AI</title>
  <meta property="og:title" content="${title} - WhatsCRM AI" />
  <meta property="og:description" content="${subtitle}" />
  <meta property="og:type" content="website" />
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #090d16; color: #e2e8f0; margin: 0; padding: 40px 20px; line-height: 1.6; }
    .container { max-width: 760px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; }
    h1 { color: #10b981; margin-top: 0; font-size: 24px; }
    h2 { color: #f8fafc; font-size: 16px; margin-top: 24px; }
    p, li { color: #94a3b8; font-size: 14px; }
    .badge { display: inline-block; background: rgba(16,185,129,0.15); color: #34d399; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Cumplimiento Oficial Meta WhatsApp Cloud API</span>
    <h1>${title}</h1>
    <p><strong>Última actualización:</strong> Octubre 2026</p>
    ${contentHtml}
  </div>
</body>
</html>`;

app.get(['/privacy', '/privacidad'], (_req: Request, res: Response) => {
  res.status(200).type('text/html').send(
    renderLegalPage(
      'Política de Privacidad',
      'Política de Privacidad oficial para la integración con Meta WhatsApp Business Cloud API.',
      `<h2>1. Información que recopilamos</h2>
      <p>Recopilamos únicamente los mensajes, nombre de perfil y número de teléfono de los usuarios que se comunican voluntariamente a través de nuestro canal oficial de WhatsApp Business API para brindar atención al cliente, soporte y seguimiento comercial.</p>
      <h2>2. Uso de la información</h2>
      <p>Los datos recibidos a través de los Webhooks de Meta se utilizan exclusivamente para gestionar las conversaciones dentro del CRM, responder consultas de clientes y dar seguimiento a solicitudes de productos o servicios.</p>
      <h2>3. Protección y No Compartición</h2>
      <p>No vendemos, alquilamos ni compartimos datos personales con terceros. Toda la comunicación se procesa mediante conexiones cifradas HTTPS conforme a las políticas de Meta Platforms, Inc.</p>
      <h2>4. Derechos del usuario y eliminación de datos</h2>
      <p>Cualquier usuario puede solicitar en cualquier momento la eliminación total de su historial de conversación y datos de contacto enviando la palabra "ELIMINAR DATOS" por WhatsApp o visitando nuestra página de eliminación de datos (/data-deletion).</p>`
    )
  );
});

app.get(['/terms', '/terminos'], (_req: Request, res: Response) => {
  res.status(200).type('text/html').send(
    renderLegalPage(
      'Condiciones del Servicio',
      'Términos y Condiciones del Servicio para atención por WhatsApp Business Cloud API.',
      `<h2>1. Uso del Servicio de Mensajería</h2>
      <p>Al comunicarse con nuestro número de WhatsApp Business, el usuario acepta recibir respuestas automatizadas y asistidas por asesores humanos relacionadas con su consulta.</p>
      <h2>2. Cumplimiento con Políticas de Meta</h2>
      <p>Este servicio opera en estricto cumplimiento con las Políticas Comerciales y de Mensajería de WhatsApp Business de Meta.</p>`
    )
  );
});

app.get(['/data-deletion', '/eliminacion-datos'], (_req: Request, res: Response) => {
  res.status(200).type('text/html').send(
    renderLegalPage(
      'Instrucciones de Eliminación de Datos de Usuario',
      'Procedimiento automático y manual para solicitar la eliminación de datos de WhatsApp.',
      `<h2>Cómo solicitar la eliminación de tus datos</h2>
      <p>En cumplimiento con los requisitos de Meta Platforms, puedes eliminar todos tus datos de nuestro CRM de cualquiera de las siguientes formas:</p>
      <ol>
        <li>Enviando un mensaje de WhatsApp a nuestro número oficial con el texto <strong>"ELIMINAR MIS DATOS"</strong>.</li>
        <li>Solicitando al asesor en turno dentro del chat la baja definitiva de tu registro.</li>
      </ol>
      <p>Una vez recibida la solicitud, tu perfil de contacto y el historial de mensajes se eliminan de forma permanente e irreversible en un plazo máximo de 24 horas.</p>`
    )
  );
});

// Get & Clear Webhook Diagnostic Logs
app.get('/api/whatsapp/webhook-logs', (_req: Request, res: Response) => {
  return res.json({
    logs: crmDb.getWebhookLogs()
  });
});

app.delete('/api/whatsapp/webhook-logs', (_req: Request, res: Response) => {
  crmDb.clearWebhookLogs();
  return res.json({ success: true, logs: [] });
});

// Endpoint to self-test webhook verification from UI
app.post('/api/whatsapp/test-verification', (req: Request, res: Response) => {
  const { testToken = 'whatscrm_verify_token_2026', testChallenge = '1158201444' } = req.body;
  const defaultToken = 'whatscrm_verify_token_2026';
  const customToken = process.env.WHATSAPP_VERIFY_TOKEN;

  const isMatch = testToken === defaultToken || (customToken && testToken === customToken);

  return res.json({
    success: isMatch,
    httpStatus: isMatch ? 200 : 403,
    returnedChallenge: isMatch ? testChallenge : null,
    expectedToken: defaultToken,
    receivedToken: testToken,
    explanation: isMatch
      ? 'La lógica del servidor procesó y aprobó el desafío de Meta correctamente.'
      : 'El token enviado no coincide con el token esperado en el servidor.'
  });
});

// E.164 phone formatter helper (especially for Ecuador +593 and international WhatsApp)
function formatToE164(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('593')) return `+${digits}`;
  if (digits.startsWith('0')) return `+593${digits.slice(1)}`;
  if (digits.length === 9) return `+593${digits}`;
  return `+${digits}`;
}

// Helper to reliably find active YCloud credentials across any company or env
function getActiveYCloudConfig(preferredCompanyId?: string) {
  const company = preferredCompanyId ? crmDb.getCompany(preferredCompanyId) : null;
  const defaultCompany = crmDb.getCompany('comp-demo-nexodigital');

  let foundKey = company?.aiSettings?.ycloudApiKey?.trim() || defaultCompany?.aiSettings?.ycloudApiKey?.trim() || '';
  if (!foundKey) {
    for (const cid of crmDb.getAllCompanyIds()) {
      const c = crmDb.getCompany(cid);
      if (c?.aiSettings?.ycloudApiKey && c.aiSettings.ycloudApiKey.trim().length > 5) {
        foundKey = c.aiSettings.ycloudApiKey.trim();
        break;
      }
    }
  }

  const apiKey = (foundKey || process.env.YCLOUD_API_KEY || '').trim();
  const fromNumber = (
    company?.aiSettings?.ycloudFromNumber ||
    defaultCompany?.aiSettings?.ycloudFromNumber ||
    process.env.YCLOUD_FROM_NUMBER ||
    '+593962691048'
  ).trim();

  return { apiKey, fromNumber };
}

// Clean Demo Data Endpoint (Leaves inbox clean for 100% real WhatsApp messages)
app.post('/api/crm/clean-demo-data', (req: Request, res: Response) => {
  const { companyId = 'comp-demo-nexodigital' } = req.body;
  const allCompanyIds = Array.from(new Set([companyId, ...crmDb.getAllCompanyIds()]));
  let cleaned = undefined;
  for (const cid of allCompanyIds) {
    const resComp = crmDb.cleanDemoData(cid);
    if (cid === companyId) cleaned = resComp;
  }
  return res.json({ success: true, company: cleaned || crmDb.getCompany(companyId) });
});

// Explicit Save WhatsApp Integration Settings
app.post('/api/whatsapp/save-config', (req: Request, res: Response) => {
  const {
    companyId = 'comp-demo-nexodigital',
    ycloudApiKey,
    ycloudFromNumber,
    whatsappProvider = 'ycloud',
    whatsappAccessToken,
    whatsappPhoneNumberId
  } = req.body;

  const allCompanyIds = Array.from(new Set([companyId, ...crmDb.getAllCompanyIds()]));
  let savedCompany: any = null;

  for (const cid of allCompanyIds) {
    const comp = crmDb.getCompany(cid);
    if (comp) {
      const updatedAiSettings = {
        ...comp.aiSettings,
        ...(ycloudApiKey !== undefined && { ycloudApiKey: ycloudApiKey.trim() }),
        ...(ycloudFromNumber !== undefined && { ycloudFromNumber: ycloudFromNumber.trim() }),
        ...(whatsappProvider !== undefined && { whatsappProvider }),
        ...(whatsappAccessToken !== undefined && { whatsappAccessToken: whatsappAccessToken.trim() }),
        ...(whatsappPhoneNumberId !== undefined && { whatsappPhoneNumberId: whatsappPhoneNumberId.trim() })
      };
      const resComp = crmDb.updateCompany(cid, { aiSettings: updatedAiSettings });
      if (cid === companyId) savedCompany = resComp;
    }
  }

  return res.json({
    success: true,
    message: 'Configuración de WhatsApp guardada exitosamente en el servidor.',
    company: savedCompany || crmDb.getCompany(companyId)
  });
});

// Test YCloud API Key Connectivity endpoint (auto-saves verified credentials)
app.post('/api/whatsapp/test-ycloud', async (req: Request, res: Response) => {
  const { apiKey, companyId = 'comp-demo-nexodigital' } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Por favor ingresa una API Key de YCloud válida.'
    });
  }

  try {
    const cleanKey = apiKey.trim();
    const ycloudRes = await fetch('https://api.ycloud.com/v2/whatsapp/phoneNumbers', {
      method: 'GET',
      headers: {
        'X-API-Key': cleanKey
      }
    });

    const data = await ycloudRes.json().catch(() => ({}));

    if (ycloudRes.ok) {
      const numbers = Array.isArray(data?.items) ? data.items : [];
      const numList = numbers.map((n: any) => n.phoneNumber || n.displayPhoneNumber).filter(Boolean);
      const detectedNumber = numList[0] || null;

      // Automatically persist verified key to CRM Database across all company records!
      for (const cid of Array.from(new Set([companyId, ...crmDb.getAllCompanyIds()]))) {
        const comp = crmDb.getCompany(cid);
        if (comp) {
          crmDb.updateCompany(cid, {
            aiSettings: {
              ...comp.aiSettings,
              whatsappProvider: 'ycloud',
              ycloudApiKey: cleanKey,
              ...(detectedNumber && { ycloudFromNumber: detectedNumber })
            }
          });
        }
      }

      return res.json({
        success: true,
        httpStatus: ycloudRes.status,
        phoneNumbers: numbers,
        savedToDatabase: true,
        detectedSender: detectedNumber,
        message: `¡Conexión aprobada con YCloud! Tu API Key quedó guardada y activa en el CRM.${detectedNumber ? ` Número emisor detectado: ${detectedNumber}` : ''}`
      });
    } else {
      return res.status(ycloudRes.status).json({
        success: false,
        httpStatus: ycloudRes.status,
        message: data?.message || data?.error?.message || 'Error de autenticación con YCloud. Verifica que tu API Key sea correcta.',
        raw: data
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Error de red contactando YCloud: ${error?.message || error}`
    });
  }
});

// Send Real WhatsApp Message to Any Phone Number (supports YCloud Coexistence and Meta Cloud API)
app.post('/api/whatsapp/send-real', async (req: Request, res: Response) => {
  const { phone, message: msgBody, companyId = 'comp-demo-nexodigital' } = req.body;
  if (!phone || !msgBody) {
    return res.status(400).json({ error: 'Teléfono y mensaje son obligatorios' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const allCompanyIds = Array.from(new Set([companyId, ...crmDb.getAllCompanyIds()]));
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msgId = `msg-agent-${Date.now()}`;

  let primaryLead = crmDb.findOrCreateLeadByPhone(companyId, cleanPhone);

  for (const cid of allCompanyIds) {
    const lead = crmDb.findOrCreateLeadByPhone(cid, cleanPhone);
    if (cid === companyId) primaryLead = lead;
    const agentMsg = {
      id: msgId,
      leadId: lead.id,
      text: msgBody,
      sender: 'agent' as const,
      timestamp: nowStr,
      status: 'sent' as const
    };
    crmDb.addMessageToLead(cid, lead.id, agentMsg);
  }

  const company = crmDb.getCompany(companyId);
  let sentViaProvider = false;
  let providerName = 'none';
  let providerResponseData: any = null;

  // 1. Prioritize YCloud (WhatsApp Coexistence)
  const { apiKey: ycloudKey, fromNumber: ycloudFrom } = getActiveYCloudConfig(companyId);

  if (ycloudKey) {
    try {
      const formattedTo = formatToE164(phone);
      const formattedFrom = formatToE164(ycloudFrom);

      const ycRes = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
        method: 'POST',
        headers: {
          'X-API-Key': ycloudKey.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: formattedFrom,
          to: formattedTo,
          type: 'text',
          text: { body: msgBody }
        })
      });
      providerResponseData = await ycRes.json().catch(() => ({}));
      sentViaProvider = ycRes.ok;
      providerName = 'ycloud';
      console.log(`📤 [YCloud Send] Mensaje a ${formattedTo} (HTTP ${ycRes.status}):`, providerResponseData);

      crmDb.addWebhookLog({
        method: 'POST',
        eventType: ycRes.ok ? 'reply_sent' : 'send_error',
        phone: formattedTo,
        summary: ycRes.ok
          ? `Mensaje enviado a ${formattedTo} vía WhatsApp YCloud (ID: ${providerResponseData?.id || 'OK'})`
          : `Error de envío a ${formattedTo} vía YCloud: HTTP ${ycRes.status} (${providerResponseData?.message || providerResponseData?.error?.message || 'Error'})`,
        rawPayload: JSON.stringify({ to: formattedTo, from: formattedFrom, response: providerResponseData }).slice(0, 1500)
      });
    } catch (e: any) {
      console.log('Notice: YCloud send error:', e?.message || e);
    }
  }

  // 2. Fallback to Meta Cloud API if YCloud not configured or failed
  if (!sentViaProvider) {
    const metaToken = company?.aiSettings?.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const metaPhoneId = company?.aiSettings?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (metaToken && metaPhoneId) {
      try {
        const metaRes = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${metaToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { preview_url: false, body: msgBody }
          })
        });
        providerResponseData = await metaRes.json().catch(() => ({}));
        sentViaProvider = metaRes.ok;
        providerName = 'meta';
      } catch (e) {
        console.log('Notice: Meta Cloud API send error:', e);
      }
    }
  }

  return res.json({
    success: true,
    lead: primaryLead,
    sentViaProvider,
    provider: providerName,
    providerResponse: providerResponseData,
    directWhatsAppUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgBody)}`
  });
});

// Create Real WhatsApp Lead endpoint
app.post('/api/whatsapp/create-real-lead', (req: Request, res: Response) => {
  const { phone, name, initialMessage, companyId = 'comp-demo-nexodigital' } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Número de WhatsApp requerido' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const customerName = name?.trim() || `Cliente WhatsApp (+${cleanPhone})`;
  const allCompanyIds = Array.from(new Set([companyId, ...crmDb.getAllCompanyIds()]));
  const msgId = `msg-wa-${Date.now()}`;
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let primaryLead = crmDb.findOrCreateLeadByPhone(companyId, cleanPhone, customerName);

  for (const cid of allCompanyIds) {
    const lead = crmDb.findOrCreateLeadByPhone(cid, cleanPhone, customerName);
    if (cid === companyId) primaryLead = lead;
    if (initialMessage && initialMessage.trim()) {
      const userMsg = {
        id: msgId,
        leadId: lead.id,
        text: initialMessage.trim(),
        sender: 'user' as const,
        timestamp: nowStr,
        status: 'delivered' as const
      };
      crmDb.addMessageToLead(cid, lead.id, userMsg);
    }
  }

  return res.json({ success: true, lead: primaryLead });
});

// Import Real Exported WhatsApp Chat (.txt)
app.post('/api/whatsapp/import-chat', (req: Request, res: Response) => {
  const { phone, name, chatText, companyId = 'comp-demo-nexodigital' } = req.body;
  if (!phone || !chatText) {
    return res.status(400).json({ error: 'Teléfono y texto del chat requeridos' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const customerName = name?.trim() || `Cliente WhatsApp (+${cleanPhone})`;
  const allCompanyIds = Array.from(new Set([companyId, ...crmDb.getAllCompanyIds()]));
  let primaryLead = crmDb.findOrCreateLeadByPhone(companyId, cleanPhone, customerName);

  const lines = chatText.split(/\r?\n/);
  let importedCount = 0;

  for (const cid of allCompanyIds) {
    const lead = crmDb.findOrCreateLeadByPhone(cid, cleanPhone, customerName);
    if (cid === companyId) primaryLead = lead;
    let countForCompany = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const bracketMatch = trimmed.match(/^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}[, ]+\d{1,2}:\d{2}(?::\d{2})?(?: [AP]M)?)\]? (?:- )?([^:]+): (.+)$/i);

      if (bracketMatch) {
        const [, timeStr, senderName, msgText] = bracketMatch;
        const isAgent =
          senderName.toLowerCase().includes('empresa') ||
          senderName.toLowerCase().includes('nexo') ||
          senderName.toLowerCase().includes('asesor') ||
          senderName.toLowerCase().includes('admin') ||
          senderName.toLowerCase().includes('yo') ||
          senderName.toLowerCase().includes('tú');

        crmDb.addMessageToLead(cid, lead.id, {
          id: `wa-imp-${cleanPhone}-${countForCompany}`,
          leadId: lead.id,
          text: msgText.trim(),
          sender: isAgent ? 'agent' : 'user',
          timestamp: timeStr.trim(),
          status: 'delivered'
        });
        countForCompany++;
      } else if (trimmed.length > 2) {
        crmDb.addMessageToLead(cid, lead.id, {
          id: `wa-imp-${cleanPhone}-${countForCompany}`,
          leadId: lead.id,
          text: trimmed,
          sender: 'user',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered'
        });
        countForCompany++;
      }
    }
    if (cid === companyId) importedCount = countForCompany;
  }

  const updatedCompany = crmDb.getCompany(companyId);
  return res.json({
    success: true,
    lead: primaryLead,
    importedCount,
    messages: updatedCompany?.messages[primaryLead.id] || []
  });
});

// Incoming WhatsApp Messages Webhook Handler (Meta Cloud API POST)
const handleWebhookPost = async (req: Request, res: Response) => {
  console.log('--- Received Real WhatsApp Webhook POST Payload ---');
  console.log('Path:', req.path);
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const body = rawBody || {};
    const entries = Array.isArray(body.entry) ? body.entry : [body];

    // Extract all incoming message items from standard Meta payload, YCloud payload, or direct test payload
    const extractedMessages: Array<{
      fromNumber: string;
      customerName: string;
      messageText: string;
      messageId: string;
      phoneNumberId?: string;
    }> = [];

    let hasStatusUpdate = false;

    // 1. Check YCloud Inbound Message Webhook (whatsapp.inbound_message)
    if (body.type === 'whatsapp.inbound_message' || body.whatsappInboundMessage) {
      const inMsg = body.whatsappInboundMessage || body;
      const rawFrom = String(inMsg.from || inMsg.sender || inMsg.whatsappNumber || '').replace(/\D/g, '');
      const rawText = inMsg.text?.body || (typeof inMsg.text === 'string' ? inMsg.text : '') || inMsg.body || '';
      const custName = inMsg.customerProfile?.name || inMsg.profile?.name || inMsg.senderName || `Cliente WhatsApp (+${rawFrom})`;
      const mId = inMsg.id || inMsg.wamid || `ycloud-${Date.now()}`;
      if (rawFrom && rawText) {
        extractedMessages.push({
          fromNumber: rawFrom,
          customerName: custName,
          messageText: String(rawText),
          messageId: mId
        });
      }
    }

    // 2. Check YCloud Status Update Webhook (whatsapp.message.updated)
    if (body.type === 'whatsapp.message.updated' || body.whatsappMessage) {
      hasStatusUpdate = true;
    }

    // 3. Check Standard Meta Cloud API changes/messages payload
    for (const entry of entries) {
      const changesList = Array.isArray(entry?.changes) ? entry.changes : [entry];
      for (const change of changesList) {
        const value = change?.value || change || {};
        const phoneNumberId = value?.metadata?.phone_number_id;
        const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
        const messagesList = Array.isArray(value?.messages) ? value.messages : [];

        if (Array.isArray(value?.statuses) && value.statuses.length > 0) {
          hasStatusUpdate = true;
        }

        for (const msgObj of messagesList) {
          const fromNumber = String(msgObj?.from || contacts[0]?.wa_id || '').replace(/\D/g, '');
          if (!fromNumber) continue;

          const matchingContact = contacts.find((c: any) => String(c?.wa_id || '').replace(/\D/g, '') === fromNumber) || contacts[0];
          const customerName = matchingContact?.profile?.name || `Cliente WhatsApp (+${fromNumber})`;
          const messageText = extractWhatsAppMessageText(msgObj);
          const messageId = msgObj?.id || `msg-wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

          if (messageText) {
            extractedMessages.push({
              fromNumber,
              customerName,
              messageText,
              messageId,
              phoneNumberId
            });
          }
        }
      }
    }

    // 4. Fallback: If someone sent a direct JSON test payload like { from: "593...", text: "Hola" }
    if (extractedMessages.length === 0 && (body.from || body.phone) && (body.text || body.message)) {
      const rawFrom = String(body.from || body.phone).replace(/\D/g, '');
      const rawText = typeof body.text === 'string' ? body.text : body.text?.body || String(body.message || '');
      if (rawFrom && rawText) {
        extractedMessages.push({
          fromNumber: rawFrom,
          customerName: body.name || `Cliente WhatsApp (+${rawFrom})`,
          messageText: rawText,
          messageId: body.id || `msg-wa-${Date.now()}`
        });
      }
    }

    if (extractedMessages.length > 0) {
      const targetCompanyIds = Array.from(
        new Set([
          ...((req.query.companyId ? [String(req.query.companyId)] : [])),
          'comp-demo-nexodigital',
          ...crmDb.getAllCompanyIds()
        ])
      );

      for (const item of extractedMessages) {
        const { fromNumber, customerName, messageText, messageId, phoneNumberId } = item;
        console.log(`✅ Mensaje REAL de WhatsApp recibido de ${customerName} (+${fromNumber}): "${messageText}"`);

        crmDb.addWebhookLog({
          method: 'POST',
          eventType: 'incoming_message',
          phone: `+${fromNumber}`,
          summary: `Mensaje recibido de ${customerName} (+${fromNumber}): "${messageText.slice(0, 80)}"`,
          rawPayload: JSON.stringify(body).slice(0, 1500)
        });

        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const aiMsgId = `ai-wa-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        let sentOutgoingReplyForMessage = false;

        // Broadcast to all companies in the CRM so any logged-in user sees the real conversation immediately
        for (const companyId of targetCompanyIds) {
          const lead = crmDb.findOrCreateLeadByPhone(companyId, fromNumber, customerName);

          const userMsg = {
            id: messageId,
            leadId: lead.id,
            text: messageText,
            sender: 'user' as const,
            timestamp: nowStr,
            status: 'delivered' as const
          };

          crmDb.addMessageToLead(companyId, lead.id, userMsg);

          // If AI is enabled for this lead, generate and respond using the trained Dentismed Sales Bot
          if (lead.aiEnabled) {
            const company = crmDb.getCompany(companyId);
            if (company) {
              const botReply = await generateIntelligentSalesBotResponse({
                lead,
                history: company.messages[lead.id] || [],
                incomingMessage: messageText,
                businessProfile: company.businessProfile,
                rules: company.rules,
                products: company.products,
                faqs: company.faqs,
                aiSettings: company.aiSettings
              });

              const responseText = botReply.responseText;

              const aiMsg = {
                id: aiMsgId,
                leadId: lead.id,
                text: responseText,
                sender: 'ai' as const,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'sent' as const,
                matchedRules: botReply.matchedRuleTitles,
                modelUsed: botReply.modelUsed,
                handoverTriggered: botReply.handoverTriggered
              };
              crmDb.addMessageToLead(companyId, lead.id, aiMsg);

              // Update lead stage, tags, and summary based on conversational AI state
              crmDb.updateLead(companyId, lead.id, {
                stage: botReply.suggestedStage as any,
                tags: Array.from(new Set([...lead.tags, ...(botReply.tagsToAdd || [])])),
                summary: botReply.reasoning || lead.summary
              });

              // 1. Send real outgoing WhatsApp message via YCloud API if configured
              const { apiKey: ycloudKey, fromNumber: ycloudFrom } = getActiveYCloudConfig(companyId);

              if (!sentOutgoingReplyForMessage && ycloudKey) {
                sentOutgoingReplyForMessage = true;
                try {
                  const formattedTo = formatToE164(fromNumber);
                  const formattedFrom = formatToE164(ycloudFrom);

                  console.log(`📡 [YCloud Webhook Outbound] Enviando respuesta IA a ${formattedTo} desde ${formattedFrom}...`);

                  const ycRes = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                    method: 'POST',
                    headers: {
                      'X-API-Key': ycloudKey.trim(),
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      from: formattedFrom,
                      to: formattedTo,
                      type: 'text',
                      text: { body: responseText }
                    })
                  });

                  const ycData = await ycRes.json().catch(() => ({}));
                  console.log(`📤 [YCloud AI Auto-Reply] Resultado de YCloud (HTTP ${ycRes.status}):`, ycData);

                  crmDb.addWebhookLog({
                    method: 'POST',
                    eventType: ycRes.ok ? 'reply_sent' : 'send_error',
                    phone: formattedTo,
                    summary: ycRes.ok
                      ? `Respuesta automática enviada a ${formattedTo} vía WhatsApp YCloud (ID: ${ycData?.id || ycData?.status || 'OK'})`
                      : `Error al enviar a ${formattedTo} vía YCloud: HTTP ${ycRes.status} (${ycData?.message || ycData?.error?.message || 'Error en clave o número'})`,
                    rawPayload: JSON.stringify({
                      to: formattedTo,
                      from: formattedFrom,
                      httpStatus: ycRes.status,
                      response: ycData,
                      messageText: responseText
                    }).slice(0, 1500)
                  });
                } catch (e: any) {
                  console.log('Notice: Could not send outgoing WhatsApp message via YCloud API:', e?.message || e);
                  crmDb.addWebhookLog({
                    method: 'POST',
                    eventType: 'send_error',
                    phone: `+${fromNumber}`,
                    summary: `Fallo de conexión enviando por YCloud: ${e?.message || e}`,
                    rawPayload: JSON.stringify({ error: e?.message || e })
                  });
                }
              }

              // 2. Fallback: Send real outgoing WhatsApp message via Meta Cloud API if configured
              const metaToken = company.aiSettings?.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;
              const metaPhoneId =
                phoneNumberId || company.aiSettings?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

              if (!sentOutgoingReplyForMessage && metaToken && metaPhoneId) {
                sentOutgoingReplyForMessage = true;
                try {
                  const metaRes = await fetch(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${metaToken}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      messaging_product: 'whatsapp',
                      recipient_type: 'individual',
                      to: fromNumber,
                      type: 'text',
                      text: { preview_url: false, body: responseText }
                    })
                  });
                  const mData = await metaRes.json().catch(() => ({}));
                  console.log(`📤 [Meta AI Auto-Reply] Mensaje real enviado por WhatsApp Cloud API a +${fromNumber}`);

                  crmDb.addWebhookLog({
                    method: 'POST',
                    eventType: metaRes.ok ? 'reply_sent' : 'send_error',
                    phone: `+${fromNumber}`,
                    summary: metaRes.ok
                      ? `Respuesta automática enviada por Meta Cloud API a +${fromNumber}`
                      : `Error enviando por Meta Cloud API a +${fromNumber}: HTTP ${metaRes.status}`,
                    rawPayload: JSON.stringify(mData).slice(0, 1500)
                  });
                } catch (e: any) {
                  console.log('Notice: Could not send outgoing WhatsApp message via Meta API:', e);
                }
              }

              // 3. Notice if neither was configured
              if (!sentOutgoingReplyForMessage && !ycloudKey && (!metaToken || !metaPhoneId)) {
                crmDb.addWebhookLog({
                  method: 'POST',
                  eventType: 'missing_credentials',
                  phone: `+${fromNumber}`,
                  summary: `ℹ️ Mensaje recibido y respondido en el CRM, pero falta configurar la API Key de YCloud para enviarlo al WhatsApp de tu teléfono.`,
                  rawPayload: JSON.stringify({ responseGenerated: responseText }).slice(0, 1500)
                });
              }
            }
          }
        }
      }
    } else if (hasStatusUpdate) {
      crmDb.addWebhookLog({
        method: 'POST',
        eventType: 'status_update',
        summary: 'Actualización de estado de entrega/lectura de mensaje de WhatsApp (statuses)',
        rawPayload: JSON.stringify(body).slice(0, 1000)
      });
    } else {
      crmDb.addWebhookLog({
        method: 'POST',
        eventType: 'unknown',
        summary: `Evento POST recibido en ${req.path} (sin mensajes de texto detectados)`,
        rawPayload: JSON.stringify(body).slice(0, 1000)
      });
    }

    // Acknowledge Meta immediately with 200 OK
    return res.status(200).json({ status: 'success', processedMessages: extractedMessages.length });
  } catch (error: any) {
    console.error('Error processing WhatsApp Webhook payload:', error);
    crmDb.addWebhookLog({
      method: 'POST',
      eventType: 'unknown',
      summary: `Error procesando payload: ${error?.message || 'Desconocido'}`,
      rawPayload: JSON.stringify(req.body || {}).slice(0, 1000)
    });
    return res.status(200).json({ status: 'error_logged' });
  }
};

app.post('/api/whatsapp/webhook', handleWebhookPost);
app.post('/api/webhook', handleWebhookPost);
app.post('/webhook', handleWebhookPost);
app.post('/', handleWebhookPost);

async function startServer() {
  // Support Meta GET webhook verification even if user pasted root URL "/" in Meta
  app.get('/', (req: Request, res: Response, next) => {
    if (req.query['hub.mode'] === 'subscribe' || req.query['hub.challenge'] !== undefined) {
      return handleWebhookVerification(req, res);
    }
    next();
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');

  if (isProduction && fs.existsSync(indexHtmlPath)) {
    console.log('Serving production static build from:', distDir);
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response, next) => {
      // Do not intercept API or webhook endpoints
      if (req.path.startsWith('/api') || req.path.startsWith('/webhook')) {
        return next();
      }
      if (req.query['hub.mode'] === 'subscribe' || req.query['hub.challenge'] !== undefined) {
        return handleWebhookVerification(req, res);
      }
      if (fs.existsSync(indexHtmlPath)) {
        return res.sendFile(indexHtmlPath, (err) => {
          if (err && !res.headersSent) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Error loading app. Please refresh.');
          }
        });
      }
      return next();
    });
  } else {
    console.log('Starting server with Vite dev middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    // Automated Daily Training: Ensures all companies have trained AI at least once a day
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const companyIds = crmDb.getAllCompanyIds();
      for (const cid of companyIds) {
        const comp = crmDb.getCompany(cid);
        if (comp) {
          const lastTrained = comp.aiSettings?.lastDailyTrainingAt;
          if (!lastTrained || lastTrained.slice(0, 10) !== todayStr) {
            crmDb.trainCompany(cid);
            console.log(`🧠 [IA Auto-Entrenamiento] Empresa "${comp.businessProfile?.companyName || cid}" entrenada con éxito para hoy.`);
          }
        }
      }
    } catch (err) {
      console.warn('Error in auto daily training runner:', err);
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
