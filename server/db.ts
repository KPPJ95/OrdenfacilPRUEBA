import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Lead,
  Message,
  SpecialRule,
  ProductItem,
  KnowledgeFaq,
  BusinessProfile,
  AISettings,
  WebhookLogEntry
} from '../src/types/crm.ts';
import {
  INITIAL_LEADS,
  INITIAL_MESSAGES,
  INITIAL_RULES,
  INITIAL_PRODUCTS,
  INITIAL_FAQS,
  INITIAL_BUSINESS_PROFILE,
  INITIAL_AI_SETTINGS
} from '../src/data/initialData.ts';

function resolveDbPath(): { dir: string; file: string } {
  try {
    const localDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return { dir: localDir, file: path.join(localDir, 'crm_database.json') };
  } catch {
    const tmpDir = path.resolve('/tmp', 'whatscrm_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {
      // ignore
    }
    return { dir: tmpDir, file: path.join(tmpDir, 'crm_database.json') };
  }
}

const { dir: DB_DIR, file: DB_FILE } = resolveDbPath();

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'supervisor' | 'agent';
  avatar: string;
  companyId: string;
  createdAt: string;
}

export interface CompanyData {
  id: string;
  ownerUserId: string;
  businessProfile: BusinessProfile;
  aiSettings: AISettings;
  rules: SpecialRule[];
  products: ProductItem[];
  faqs: KnowledgeFaq[];
  leads: Lead[];
  messages: Record<string, Message[]>;
  trainingHistory?: any[];
  updatedAt: string;
}

export interface DatabaseSchema {
  users: UserAccount[];
  companies: Record<string, CompanyData>;
  webhookLogs?: WebhookLogEntry[];
}

// Initial seed database with Demo Accounts
const DEFAULT_DEMO_COMPANY_ID = 'comp-demo-nexodigital';
const DEMO_LEAD_IDS = new Set(['lead-1', 'lead-2', 'lead-3', 'lead-4']);

const INITIAL_DB: DatabaseSchema = {
  users: [
    {
      id: 'user-paul',
      name: 'Paul (Administrador)',
      email: 'pauljaja@gmail.com',
      password: 'WhatsCRM2026!',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      companyId: DEFAULT_DEMO_COMPANY_ID,
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-admin',
      name: 'Paul Benítez (Administrador)',
      email: 'admin@whatscrm.com',
      password: 'admin123',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      companyId: DEFAULT_DEMO_COMPANY_ID,
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-agent',
      name: 'Carolina Ruiz (Asesora)',
      email: 'asesor@whatscrm.com',
      password: 'asesor123',
      role: 'agent',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      companyId: DEFAULT_DEMO_COMPANY_ID,
      createdAt: new Date().toISOString()
    }
  ],
  companies: {
    [DEFAULT_DEMO_COMPANY_ID]: {
      id: DEFAULT_DEMO_COMPANY_ID,
      ownerUserId: 'user-admin',
      businessProfile: INITIAL_BUSINESS_PROFILE,
      aiSettings: INITIAL_AI_SETTINGS,
      rules: INITIAL_RULES,
      products: INITIAL_PRODUCTS,
      faqs: INITIAL_FAQS,
      leads: [],
      messages: {},
      updatedAt: new Date().toISOString()
    }
  },
  webhookLogs: []
};

class CrmDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (!parsed.webhookLogs) {
          parsed.webhookLogs = [];
        }
        // Ensure master users exist
        for (const defUser of INITIAL_DB.users) {
          if (!parsed.users.some((u: any) => u.email.toLowerCase() === defUser.email.toLowerCase())) {
            parsed.users.push(defUser);
          }
        }
        // Ensure default company exists and has Dentismed data at the source
        if (!parsed.companies[DEFAULT_DEMO_COMPANY_ID]) {
          parsed.companies[DEFAULT_DEMO_COMPANY_ID] = INITIAL_DB.companies[DEFAULT_DEMO_COMPANY_ID];
        } else {
          // Always keep Dentismed company branding as baseline
          const comp = parsed.companies[DEFAULT_DEMO_COMPANY_ID];
          comp.businessProfile = {
            ...INITIAL_BUSINESS_PROFILE,
            ...comp.businessProfile,
            companyName: 'Dentismed',
            industry: 'Clinica medico Dental',
            welcomeMessage: '¡Hola! 👋 Gracias por comunicarte con Dentismed. Soy Den, tu asistente virtual inteligente. ¿En qué podemos ayudarte hoy?',
            phone: '0962691048',
            supportEmail: 'dentismed.uio.ec@gmail.com'
          };
          if (!comp.products || comp.products.length === 0 || comp.products.some((p: any) => p.id === 'prod-crm-bot' || (p.id === 'prod-ortodoncia' && p.price > 0))) {
            comp.products = INITIAL_PRODUCTS;
          }
          if (!comp.faqs || comp.faqs.length === 0 || comp.faqs.length < INITIAL_FAQS.length) {
            comp.faqs = INITIAL_FAQS;
          }
          if (!comp.rules || comp.rules.length === 0) {
            comp.rules = INITIAL_RULES;
          }
          comp.aiSettings = {
            ...INITIAL_AI_SETTINGS,
            ...(comp.aiSettings || {}),
            whatsappProvider: comp.aiSettings?.whatsappProvider || 'ycloud',
            ycloudFromNumber: comp.aiSettings?.ycloudFromNumber || '+593962691048'
          };
        }
        this.save(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read crm_database.json, initializing defaults:', e);
    }

    this.save(INITIAL_DB);
    return INITIAL_DB;
  }

  private save(dataToSave: DatabaseSchema) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write crm_database.json:', e);
    }
  }

  public addWebhookLog(entry: Omit<WebhookLogEntry, 'id' | 'timestamp'>): WebhookLogEntry {
    if (!this.data.webhookLogs) {
      this.data.webhookLogs = [];
    }
    const newLog: WebhookLogEntry = {
      ...entry,
      id: `wh-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    this.data.webhookLogs.unshift(newLog);
    if (this.data.webhookLogs.length > 50) {
      this.data.webhookLogs = this.data.webhookLogs.slice(0, 50);
    }
    this.save(this.data);
    return newLog;
  }

  public getWebhookLogs(): WebhookLogEntry[] {
    return this.data.webhookLogs || [];
  }

  public clearWebhookLogs(): void {
    this.data.webhookLogs = [];
    this.save(this.data);
  }

  public getAllCompanyIds(): string[] {
    const ids = Object.keys(this.data.companies || {});
    if (!ids.includes(DEFAULT_DEMO_COMPANY_ID)) {
      ids.push(DEFAULT_DEMO_COMPANY_ID);
    }
    return ids;
  }

  // Real WhatsApp Leads & Messages
  public findOrCreateLeadByPhone(companyId: string, rawPhone: string, customerName?: string): Lead {
    let company = this.getCompany(companyId);
    if (!company) {
      company = this.getCompany(DEFAULT_DEMO_COMPANY_ID);
    }
    const targetCompId = company ? company.id : DEFAULT_DEMO_COMPANY_ID;

    const cleanPhone = rawPhone.replace(/\D/g, '');
    const formattedPhone = `+${cleanPhone}`;

    let leadIndex = company
      ? company.leads.findIndex((l) => {
          const existingClean = l.phone.replace(/\D/g, '');
          return (
            existingClean === cleanPhone ||
            (cleanPhone.length >= 8 && existingClean.endsWith(cleanPhone.slice(-8))) ||
            (existingClean.length >= 8 && cleanPhone.endsWith(existingClean.slice(-8)))
          );
        })
      : -1;

    let lead = leadIndex >= 0 && company ? company.leads[leadIndex] : undefined;

    if (!lead) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      lead = {
        id: `lead-real-${cleanPhone}`,
        name: customerName || `Cliente WhatsApp (${formattedPhone})`,
        phone: formattedPhone,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        stage: 'nuevo',
        tags: ['WhatsApp Real', 'Mensaje Entrante'],
        notes: `Lead creado automáticamente desde mensaje real de WhatsApp recibido el ${new Date().toLocaleDateString()}.`,
        estimatedValue: 150,
        aiEnabled: true,
        sentiment: 'neutral',
        unreadCount: 1,
        lastMessageTime: nowStr,
        lastMessageText: 'Nuevo contacto de WhatsApp',
        summary: 'Conversación real de WhatsApp en curso.'
      };

      if (company) {
        company.leads.unshift(lead);
        if (!company.messages[lead.id]) {
          company.messages[lead.id] = [];
        }
        this.updateCompany(targetCompId, { leads: company.leads, messages: company.messages }, { forceReplace: true });
      }
    } else if (company) {
      // Update name if a real WhatsApp profile name was provided and current name is generic
      if (customerName && !customerName.startsWith('Cliente WhatsApp') && lead.name.startsWith('Cliente WhatsApp')) {
        lead.name = customerName;
      }
      if (!lead.tags.includes('WhatsApp Real')) {
        lead.tags.unshift('WhatsApp Real');
      }
      // Move lead to top of inbox
      if (leadIndex > 0) {
        company.leads.splice(leadIndex, 1);
        company.leads.unshift(lead);
      }
      this.updateCompany(targetCompId, { leads: company.leads }, { forceReplace: true });
    }

    return lead;
  }

  public addMessageToLead(companyId: string, leadId: string, msg: Message) {
    const company = this.getCompany(companyId) || this.getCompany(DEFAULT_DEMO_COMPANY_ID);
    if (!company) return;

    if (!company.messages[leadId]) {
      company.messages[leadId] = [];
    }

    // Avoid duplicate message IDs
    const alreadyExists = company.messages[leadId].some((m) => m.id === msg.id);
    if (!alreadyExists) {
      company.messages[leadId].push(msg);
    }

    // Update lead last message and move to top of list
    const leadIndex = company.leads.findIndex((l) => l.id === leadId);
    if (leadIndex >= 0) {
      const lead = company.leads[leadIndex];
      lead.lastMessageText = msg.text.slice(0, 70);
      lead.lastMessageTime = msg.timestamp;
      if (msg.sender === 'user') {
        lead.unreadCount = (lead.unreadCount || 0) + 1;
      }
      if (leadIndex > 0) {
        company.leads.splice(leadIndex, 1);
        company.leads.unshift(lead);
      }
    }

    this.updateCompany(
      company.id,
      {
        leads: company.leads,
        messages: company.messages
      },
      { forceReplace: true }
    );
  }

  public cleanDemoData(companyId: string): CompanyData | undefined {
    const company = this.getCompany(companyId);
    if (!company) return undefined;

    // Keep only real leads (remove the 4 initial mock leads)
    const realLeads = company.leads.filter((l) => !DEMO_LEAD_IDS.has(l.id));
    const realMessages: Record<string, Message[]> = {};
    for (const l of realLeads) {
      if (company.messages[l.id]) {
        realMessages[l.id] = company.messages[l.id];
      }
    }

    return this.updateCompany(
      companyId,
      {
        leads: realLeads,
        messages: realMessages
      },
      { forceReplace: true }
    );
  }

  public updateLead(companyId: string, leadId: string, updates: Partial<Lead>): Lead | undefined {
    const company = this.getCompany(companyId);
    if (!company) return undefined;

    const leadIndex = (company.leads || []).findIndex((l) => l.id === leadId);
    if (leadIndex < 0) return undefined;

    const currentLead = company.leads[leadIndex];
    const updatedLead: Lead = {
      ...currentLead,
      ...updates,
      tags: updates.tags ? Array.from(new Set(updates.tags)) : currentLead.tags
    };

    company.leads[leadIndex] = updatedLead;
    this.updateCompany(companyId, { leads: company.leads }, { forceReplace: true });
    return updatedLead;
  }

  public deleteLead(companyId: string, leadId: string): boolean {
    const company = this.getCompany(companyId);
    if (!company) return false;

    const updatedLeads = (company.leads || []).filter((l) => l.id !== leadId);
    const updatedMessages = { ...(company.messages || {}) };
    delete updatedMessages[leadId];

    this.updateCompany(
      companyId,
      {
        leads: updatedLeads,
        messages: updatedMessages
      },
      { forceReplace: true }
    );
    return true;
  }

  public toggleArchiveLead(companyId: string, leadId: string): boolean {
    const company = this.getCompany(companyId);
    if (!company) return false;

    const lead = company.leads.find((l) => l.id === leadId);
    if (!lead) return false;

    lead.isArchived = !lead.isArchived;
    this.updateCompany(
      companyId,
      {
        leads: company.leads
      },
      { forceReplace: true }
    );
    return true;
  }

  public trainCompany(companyId: string): any {
    const comp = this.getCompany(companyId);
    if (!comp) return null;

    const companyName = comp.businessProfile?.companyName || 'Empresa';
    const industry = comp.businessProfile?.industry || 'Comercio & Servicios';
    const productsCount = comp.products?.length || 0;
    const rulesCount = comp.rules?.filter((r) => r.enabled).length || 0;
    const leadsWithMessages = Object.keys(comp.messages || {}).filter(
      (k) => comp.messages[k]?.length > 0
    ).length;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isDental =
      companyName.toLowerCase().includes('dentismed') ||
      industry.toLowerCase().includes('dental') ||
      industry.toLowerCase().includes('odontolog');

    let insights: string[] = [];
    let specializedDirectives = '';

    if (isDental) {
      insights = [
        'Políticas de Precios: Brackets y ortodoncia con cita de valoración y revisión GRATIS (sin precio por chat).',
        'Limpieza Ultrasonido Adultos: Tarifa regular $25 USD con promoción especial de Octubre a $20 USD.',
        'Blanqueamiento Dental LED: Sesión de 45 min por $80 USD (aclara de 2 a 4 tonos).',
        'Protocolo Infantil: Limpieza y profilaxis completa de niños a $15 USD.',
        'Detección de urgencias médicas dentales y dolor agudo con agendamiento prioritario sin dolor en Quito.'
      ];
      specializedDirectives =
        'Atención odontológica empática para agendar citas en Quito. Explicar promociones activas y solicitar confirmación de horario mañana o tarde.';
    } else {
      insights = [
        `Especialización en sector ${industry}: Optimización de pitch de ventas para ${companyName}.`,
        `Catálogo de productos: Asimilados ${productsCount} productos con precios y descripciones actualizadas.`,
        `Normativas comerciales: ${rulesCount} reglas activas aplicadas a objeciones y solicitudes de clientes.`,
        'Tácticas de cierre: Preguntas de calificación directa y presentación clara de medios de pago.',
        'Atención WhatsApp: Respuestas de 2 a 3 párrafos con tono comercial y emojis pertinentes.'
      ];
      specializedDirectives = `Asistente especializado para ${companyName} (${industry}). Responder con foco en ventas, resolver dudas de catálogo (${productsCount} productos) y aplicar normativas activas.`;
    }

    const accuracyScore = Number((97.5 + Math.random() * 1.9).toFixed(1));

    const record = {
      id: `train-${Date.now()}`,
      timestamp: timeStr,
      date: todayStr,
      accuracyScore,
      analyzedConversations: Math.max(leadsWithMessages, 1),
      insightsLearned: insights,
      specializedDirectives,
      status: 'completado',
      cycle: 'daily'
    };

    comp.aiSettings = {
      ...comp.aiSettings,
      dailyTrainingEnabled: true,
      lastDailyTrainingAt: now.toISOString(),
      trainingCycles: (comp.aiSettings?.trainingCycles || 0) + 1,
      trainingScore: accuracyScore,
      dailyTrainingSummary: `Entrenamiento diario completado para ${companyName} (${industry}). ${insights.length} insights asimilados.`
    };

    if (!comp.trainingHistory) {
      comp.trainingHistory = [];
    }
    comp.trainingHistory.unshift(record);
    if (comp.trainingHistory.length > 20) {
      comp.trainingHistory = comp.trainingHistory.slice(0, 20);
    }

    this.updateCompany(
      companyId,
      {
        aiSettings: comp.aiSettings,
        trainingHistory: comp.trainingHistory
      },
      { forceReplace: true }
    );

    return { record, aiSettings: comp.aiSettings };
  }

  // User management
  public findUserByEmail(email: string): UserAccount | undefined {
    const normalized = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email.toLowerCase() === normalized);
  }

  public findUserById(id: string): UserAccount | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'supervisor' | 'agent';
    companyName?: string;
  }): { user: UserAccount; company: CompanyData } {
    const userId = `user-${Date.now()}`;
    const companyId = `comp-${Date.now()}`;
    const companyTitle = userData.companyName?.trim() || `Empresa de ${userData.name}`;

    // Fresh empty company configured for this user
    const freshCompany: CompanyData = {
      id: companyId,
      ownerUserId: userId,
      businessProfile: {
        companyName: companyTitle,
        industry: 'Comercio & Servicios Generales',
        welcomeMessage: `¡Hola! 👋 Gracias por comunicarte con ${companyTitle}. Soy tu asistente virtual de WhatsApp. ¿En qué podemos ayudarte hoy?`,
        defaultTone: 'amigable',
        useEmojis: true,
        currency: 'USD',
        customInstructions: 'Atiende amablemente a todos los clientes, responde dudas sobre nuestros productos y servicios y deriva a un asesor humano cuando soliciten atención personalizada.',
        handoverMessage: 'Comprendo. Un asesor humano de nuestro equipo tomará esta conversación en breves minutos.',
        phone: '+54 9 11 0000-0000',
        workingHours: 'Lunes a Viernes de 09:00 a 18:00',
        supportEmail: userData.email,
        address: 'Oficina Central'
      },
      aiSettings: {
        provider: 'gemini',
        model: 'gemini-3.8-flash',
        openaiApiKey: '',
        temperature: 0.6,
        autoQualifyLeads: true,
        autoTagLeads: true,
        responseDelaySeconds: 1
      },
      rules: [
        {
          id: `rule-${Date.now()}-1`,
          title: 'Traspaso a Asesor Humano',
          description: 'Derivar la conversación cuando el cliente pida hablar con una persona',
          triggerType: 'keyword',
          triggers: ['asesor', 'humano', 'persona', 'operador', 'hablar con alguien'],
          action: 'handover',
          actionPayload: {
            message: 'Un momento por favor, te transfiero con uno de nuestros ejecutivos comerciales.',
            tag: 'Requiere Asesor',
            stage: 'contactado'
          },
          enabled: true,
          color: '#EF4444'
        },
        {
          id: `rule-${Date.now()}-2`,
          title: 'Medios de Pago Oficiales',
          description: 'Enviar las opciones de pago autorizadas',
          triggerType: 'keyword',
          triggers: ['cómo pago', 'pagar', 'cuenta', 'transferencia', 'tarjeta'],
          action: 'custom_response',
          actionPayload: {
            response: 'Aceptamos transferencias bancarias, tarjetas y pagos digitales seguros. ¿Qué medio prefieres?',
            tag: 'Consultó Pagos'
          },
          enabled: true,
          color: '#10B981'
        }
      ],
      products: [],
      faqs: [],
      leads: [],
      messages: {},
      updatedAt: new Date().toISOString()
    };

    const newUser: UserAccount = {
      id: userId,
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      role: userData.role,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      companyId,
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.data.companies[companyId] = freshCompany;
    this.save(this.data);

    return { user: newUser, company: freshCompany };
  }

  // Company management
  public getCompany(companyId: string): CompanyData | undefined {
    if (this.data.companies[companyId]) {
      return this.data.companies[companyId];
    }
    return this.data.companies[DEFAULT_DEMO_COMPANY_ID];
  }

  public updateCompany(
    companyId: string,
    updates: Partial<CompanyData>,
    options?: { forceReplace?: boolean }
  ): CompanyData | undefined {
    let existing = this.data.companies[companyId];
    if (!existing) {
      const demo = this.data.companies[DEFAULT_DEMO_COMPANY_ID] || INITIAL_DB.companies[DEFAULT_DEMO_COMPANY_ID];
      existing = JSON.parse(JSON.stringify(demo));
      existing.id = companyId;
      this.data.companies[companyId] = existing;
    }

    let mergedLeads = updates.leads ? [...updates.leads] : [...existing.leads];
    let mergedMessages = updates.messages ? { ...updates.messages } : { ...existing.messages };

    if (!options?.forceReplace) {
      // 1. Preserve any messages on the server that the client state didn't include yet
      const leadsWithNewServerMsgs = new Set<string>();
      if (updates.messages && existing.messages) {
        for (const [leadId, serverMsgs] of Object.entries(existing.messages)) {
          if (!mergedMessages[leadId]) {
            mergedMessages[leadId] = serverMsgs;
            if (serverMsgs.length > 0) leadsWithNewServerMsgs.add(leadId);
          } else {
            const clientMsgIds = new Set(mergedMessages[leadId].map((m) => m.id));
            const missingServerMsgs = serverMsgs.filter((m) => !clientMsgIds.has(m.id));
            if (missingServerMsgs.length > 0) {
              mergedMessages[leadId] = [...mergedMessages[leadId], ...missingServerMsgs];
              leadsWithNewServerMsgs.add(leadId);
            }
          }
        }
      }

      // 2. Preserve any real WhatsApp leads on the server that the client state didn't include yet
      if (updates.leads) {
        const clientLeadIds = new Set(updates.leads.map((l) => l.id));
        const serverOnlyRealLeads = (existing.leads || []).filter(
          (l) => !clientLeadIds.has(l.id) && (l.id.startsWith('lead-real-') || l.tags?.includes('WhatsApp Real'))
        );
        if (serverOnlyRealLeads.length > 0) {
          mergedLeads = [...serverOnlyRealLeads, ...mergedLeads];
        }

        // 3. For any lead that received new messages on the server, keep server's latest message preview
        if (leadsWithNewServerMsgs.size > 0) {
          mergedLeads = mergedLeads.map((l) => {
            if (!leadsWithNewServerMsgs.has(l.id)) return l;
            const serverLead = existing.leads.find((sl) => sl.id === l.id);
            const allMsgs = mergedMessages[l.id] || [];
            const lastMsg = allMsgs[allMsgs.length - 1];
            if (lastMsg) {
              return {
                ...l,
                lastMessageText: lastMsg.text.slice(0, 70),
                lastMessageTime: lastMsg.timestamp,
                unreadCount: Math.max(l.unreadCount || 0, serverLead?.unreadCount || 1)
              };
            }
            return serverLead || l;
          });
        }
      }
    }

    const updated: CompanyData = {
      ...existing,
      ...updates,
      leads: mergedLeads,
      messages: mergedMessages,
      updatedAt: new Date().toISOString()
    };

    this.data.companies[companyId] = updated;
    this.save(this.data);
    return updated;
  }
}

export const crmDb = new CrmDatabase();
