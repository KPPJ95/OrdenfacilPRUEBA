import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Lead,
  Message,
  SpecialRule,
  ProductItem,
  KnowledgeFaq,
  BusinessProfile,
  AISettings,
  LeadStage,
  WebhookLogEntry,
  AITrainingRecord
} from '../types/crm';
import {
  INITIAL_LEADS,
  INITIAL_MESSAGES,
  INITIAL_RULES,
  INITIAL_PRODUCTS,
  INITIAL_FAQS,
  INITIAL_BUSINESS_PROFILE,
  INITIAL_AI_SETTINGS
} from '../data/initialData';
import { useAuth } from './AuthContext';
import {
  saveCompanyToFirestore,
  loadCompanyFromFirestore
} from '../lib/firestoreSync';
import { testConnection } from '../lib/firebase';

interface CrmContextType {
  leads: Lead[];
  activeLeadId: string | null;
  setActiveLeadId: (id: string | null) => void;
  messages: Record<string, Message[]>;
  rules: SpecialRule[];
  products: ProductItem[];
  faqs: KnowledgeFaq[];
  businessProfile: BusinessProfile;
  aiSettings: AISettings;
  trainingHistory: AITrainingRecord[];
  isAiResponding: boolean;
  isSavingToServer: boolean;
  lastSavedTime: string | null;
  isCloudConnected: boolean;
  cloudSyncStatus: string;
  manualCloudSync: () => Promise<void>;
  webhookLogs: WebhookLogEntry[];
  clearWebhookLogs: () => Promise<void>;
  
  // Lead actions
  updateLeadStage: (leadId: string, newStage: LeadStage) => void;
  toggleLeadAi: (leadId: string, enabled?: boolean) => void;
  updateLeadNotes: (leadId: string, notes: string) => void;
  addLead: (lead: Omit<Lead, 'id' | 'unreadCount' | 'lastMessageTime' | 'lastMessageText'>) => Lead;
  updateLead: (leadId: string, updates: Partial<Lead>) => void;
  deleteLead: (leadId: string) => void;
  toggleArchiveLead: (leadId: string) => Promise<void>;

  // Messaging & AI
  sendMessage: (leadId: string, text: string, sender?: 'user' | 'agent' | 'ai') => Promise<void>;
  generateAiResponse: (leadId: string, incomingUserMessage: string) => Promise<any>;
  suggestAiDraft: (leadId: string) => Promise<string>;

  // Training & Config actions
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => void;
  updateAiSettings: (settings: Partial<AISettings>) => void;
  addRule: (rule: Omit<SpecialRule, 'id'>) => void;
  updateRule: (ruleId: string, updates: Partial<SpecialRule>) => void;
  deleteRule: (ruleId: string) => void;
  toggleRule: (ruleId: string) => void;
  
  // Catalog actions
  addProduct: (product: Omit<ProductItem, 'id'>) => void;
  updateProduct: (productId: string, updates: Partial<ProductItem>) => void;
  deleteProduct: (productId: string) => void;

  // FAQ actions
  addFaq: (faq: Omit<KnowledgeFaq, 'id'>) => void;
  updateFaq: (faqId: string, updates: Partial<KnowledgeFaq>) => void;
  deleteFaq: (faqId: string) => void;

  // Reset or template loading
  cleanDemoData: () => Promise<void>;
  refreshFromServer: () => Promise<void>;
  runDailyTraining: () => Promise<any>;
  loadStarterDemoData: () => void;
  resetToDefaults: () => void;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

const DEMO_IDS = new Set(['lead-1', 'lead-2', 'lead-3', 'lead-4']);

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const companyId = user?.companyId || 'comp-demo-nexodigital';
  const STORAGE_KEY_PREFIX = `whatscrm_${companyId}_`;

  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'leads');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((l: Lead) => !/^lead-\d+$/.test(l.id)) : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [activeLeadId, setActiveLeadId] = useState<string | null>(() => {
    return leads.length > 0 ? leads[0].id : null;
  });

  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'messages');
      return saved ? JSON.parse(saved) : (companyId === 'comp-demo-nexodigital' ? INITIAL_MESSAGES : {});
    } catch {
      return companyId === 'comp-demo-nexodigital' ? INITIAL_MESSAGES : {};
    }
  });

  const [rules, setRules] = useState<SpecialRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'rules');
      return saved ? JSON.parse(saved) : INITIAL_RULES;
    } catch {
      return INITIAL_RULES;
    }
  });

  const [products, setProducts] = useState<ProductItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'products');
      return saved ? JSON.parse(saved) : (companyId === 'comp-demo-nexodigital' ? INITIAL_PRODUCTS : []);
    } catch {
      return companyId === 'comp-demo-nexodigital' ? INITIAL_PRODUCTS : [];
    }
  });

  const [faqs, setFaqs] = useState<KnowledgeFaq[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'faqs');
      return saved ? JSON.parse(saved) : (companyId === 'comp-demo-nexodigital' ? INITIAL_FAQS : []);
    } catch {
      return companyId === 'comp-demo-nexodigital' ? INITIAL_FAQS : [];
    }
  });

  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'business');
      return saved
        ? JSON.parse(saved)
        : {
            ...INITIAL_BUSINESS_PROFILE,
            companyName: user?.company || INITIAL_BUSINESS_PROFILE.companyName
          };
    } catch {
      return INITIAL_BUSINESS_PROFILE;
    }
  });

  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'ai');
      return saved ? JSON.parse(saved) : INITIAL_AI_SETTINGS;
    } catch {
      return INITIAL_AI_SETTINGS;
    }
  });

  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([]);
  const [trainingHistory, setTrainingHistory] = useState<AITrainingRecord[]>([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isServerLoaded, setIsServerLoaded] = useState(false);
  const [isSavingToServer, setIsSavingToServer] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string>('Verificando Firestore Cloud...');
  const isUserDirtyRef = useRef<boolean>(false);
  const leadsRef = useRef(leads);
  leadsRef.current = leads;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const activeLeadIdRef = useRef(activeLeadId);
  activeLeadIdRef.current = activeLeadId;

  // Mark state dirty only on direct user edits (never on initial boot or background sync)
  const markUserEdited = () => {
    isUserDirtyRef.current = true;
  };

  // 1. Fetch Company Data from Cloud Firestore and Server Database (Zero writes on startup)
  useEffect(() => {
    let isMounted = true;
    async function loadCompanyData() {
      try {
        // Test Firestore connection on boot (non-blocking)
        testConnection()
          .then((ok) => {
            if (isMounted) {
              setIsCloudConnected(ok);
              setCloudSyncStatus(ok ? 'Conectado a Firebase Firestore (GCP Cloud)' : 'Modo local activo');
            }
          })
          .catch(() => {});

        // 1. First fetch from server database (instant, local JSON storage)
        let loadedData = false;
        try {
          const res = await fetch(`/api/crm/data?companyId=${encodeURIComponent(companyId)}`);
          if (res.ok) {
            const company = await res.json();
            if (isMounted && company) {
              loadedData = true;
              if (company.businessProfile) setBusinessProfile(company.businessProfile);
              if (company.aiSettings) setAiSettings(company.aiSettings);
              if (company.rules) setRules(company.rules);
              if (company.products) setProducts(company.products);
              if (company.faqs) setFaqs(company.faqs);
              if (company.leads) {
                const realLeads = company.leads.filter((l: Lead) => !/^lead-\d+$/.test(l.id));
                setLeads(realLeads);
                setActiveLeadId(realLeads.length > 0 ? realLeads[0].id : null);
              }
              if (company.messages) setMessages(company.messages);
              if (company.trainingHistory) setTrainingHistory(company.trainingHistory);
              setIsServerLoaded(true);
              setLastSavedTime('Sincronizado con la base de datos');
            }
          }
        } catch (serverErr) {
          console.warn('Server load notice:', serverErr);
        }

        // 2. Fetch from Cloud Firestore in background (persistent across republishes)
        try {
          const cloudCompany = await loadCompanyFromFirestore(companyId);
          if (isMounted && cloudCompany && cloudCompany.businessProfile) {
            if (!loadedData) {
              setBusinessProfile(cloudCompany.businessProfile);
              if (cloudCompany.aiSettings) setAiSettings(cloudCompany.aiSettings);
              if (cloudCompany.rules && cloudCompany.rules.length > 0) setRules(cloudCompany.rules);
              if (cloudCompany.products && cloudCompany.products.length > 0) setProducts(cloudCompany.products);
              if (cloudCompany.faqs && cloudCompany.faqs.length > 0) setFaqs(cloudCompany.faqs);
              if (cloudCompany.leads && cloudCompany.leads.length > 0) {
                const realLeads = cloudCompany.leads.filter((l: Lead) => !/^lead-\d+$/.test(l.id));
                setLeads(realLeads);
                setActiveLeadId(realLeads.length > 0 ? realLeads[0].id : null);
              }
              if (cloudCompany.messages) setMessages(cloudCompany.messages);
            }
            setIsCloudConnected(true);
            setCloudSyncStatus('Conectado a Firebase Firestore (whatsapp-dentismed)');
          }
        } catch (cloudErr) {
          console.warn('[Firestore] Cloud sync notice:', cloudErr);
        }

        if (isMounted) {
          setIsServerLoaded(true);
        }
      } catch (err) {
        console.warn('Could not fetch from server database, using cached data:', err);
        if (isMounted) setIsServerLoaded(true);
      }
    }

    setIsServerLoaded(false);
    loadCompanyData();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  // 2. Persist to localStorage (Browser Cache)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'leads', JSON.stringify(leads));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'messages', JSON.stringify(messages));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'rules', JSON.stringify(rules));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'products', JSON.stringify(products));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'faqs', JSON.stringify(faqs));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'business', JSON.stringify(businessProfile));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'ai', JSON.stringify(aiSettings));
    } catch (e) {
      console.warn('Could not persist to localStorage:', e);
    }
  }, [leads, messages, rules, products, faqs, businessProfile, aiSettings, STORAGE_KEY_PREFIX]);

  // 3. Persist to Server Database and Cloud Firestore ONLY when user has made actual edits
  useEffect(() => {
    // Zero writes on boot or when state was populated by background sync
    if (!isServerLoaded || !isUserDirtyRef.current) return;

    const timeout = setTimeout(async () => {
      if (!isUserDirtyRef.current) return;
      isUserDirtyRef.current = false;

      try {
        setIsSavingToServer(true);
        const payload = {
          companyId,
          businessProfile,
          aiSettings,
          rules,
          products,
          faqs,
          leads,
          messages
        };

        const [res, cloudOk] = await Promise.all([
          fetch('/api/crm/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => null),
          saveCompanyToFirestore(companyId, payload).catch(() => false)
        ]);

        if (cloudOk) {
          setIsCloudConnected(true);
          setCloudSyncStatus('Sincronizado con Firebase Firestore');
        }

        if (res && res.ok) {
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLastSavedTime(`Guardado en Firebase & Servidor (${nowStr})`);
        } else if (cloudOk) {
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLastSavedTime(`Guardado en Firestore Cloud (${nowStr})`);
        }
      } catch (e) {
        console.warn('Error saving to server database:', e);
      } finally {
        setIsSavingToServer(false);
      }
    }, 3500);

    return () => clearTimeout(timeout);
  }, [companyId, isServerLoaded, businessProfile, aiSettings, rules, products, faqs, leads, messages]);

  const manualCloudSync = async () => {
    setIsSavingToServer(true);
    try {
      const payload = {
        companyId,
        businessProfile,
        aiSettings,
        rules,
        products,
        faqs,
        leads,
        messages
      };
      const [res, cloudOk] = await Promise.all([
        fetch('/api/crm/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null),
        saveCompanyToFirestore(companyId, payload).catch(() => false)
      ]);
      if (cloudOk) {
        setIsCloudConnected(true);
        setCloudSyncStatus('Sincronización forzada a Firebase Firestore exitosa');
      }
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(`Respaldo en Nube Firebase Guardado (${nowStr})`);
    } catch (e) {
      console.warn('Manual cloud sync failed:', e);
    } finally {
      setIsSavingToServer(false);
    }
  };

  // Lead actions
  const updateLeadStage = (leadId: string, newStage: LeadStage) => {
    markUserEdited();
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, stage: newStage } : lead))
    );
  };

  const toggleLeadAi = (leadId: string, enabled?: boolean) => {
    markUserEdited();
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== leadId) return lead;
        const newAiState = enabled !== undefined ? enabled : !lead.aiEnabled;
        return {
          ...lead,
          aiEnabled: newAiState,
          tags: newAiState
            ? lead.tags.filter((t) => t !== 'Requiere Asesor')
            : Array.from(new Set([...lead.tags, 'Requiere Asesor']))
        };
      })
    );
  };

  const updateLeadNotes = (leadId: string, notes: string) => {
    markUserEdited();
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, notes } : lead))
    );
  };

  const updateLead = (leadId: string, updates: Partial<Lead>) => {
    markUserEdited();
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, ...updates } : lead))
    );
  };

  const addLead = (leadData: Omit<Lead, 'id' | 'unreadCount' | 'lastMessageTime' | 'lastMessageText'>): Lead => {
    markUserEdited();
    const newId = `lead-${Date.now()}`;
    const newLead: Lead = {
      ...leadData,
      id: newId,
      unreadCount: 0,
      lastMessageTime: 'Ahora',
      lastMessageText: 'Conversación iniciada'
    };
    setLeads((prev) => [newLead, ...prev]);
    setMessages((prev) => ({
      ...prev,
      [newId]: [
        {
          id: `msg-${Date.now()}`,
          leadId: newId,
          text: businessProfile.welcomeMessage,
          sender: 'ai',
          timestamp: 'Ahora',
          status: 'delivered',
          modelUsed: aiSettings.provider === 'openai' ? 'OpenAI GPT-4o' : 'Gemini 3.8 Flash'
        }
      ]
    }));
    setActiveLeadId(newId);
    return newLead;
  };

  const deleteLead = (leadId: string) => {
    markUserEdited();
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setMessages((prev) => {
      const copy = { ...prev };
      delete copy[leadId];
      return copy;
    });
    if (activeLeadId === leadId) {
      const remaining = leads.filter((l) => l.id !== leadId);
      setActiveLeadId(remaining.length > 0 ? remaining[0].id : null);
    }
    fetch(`/api/leads/${leadId}?companyId=${companyId}`, { method: 'DELETE' }).catch((e) =>
      console.warn('Delete lead error on server:', e)
    );
  };

  const toggleArchiveLead = async (leadId: string): Promise<void> => {
    markUserEdited();
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, isArchived: !l.isArchived } : l))
    );
    try {
      await fetch(`/api/leads/${leadId}/archive?companyId=${companyId}`, { method: 'POST' });
    } catch (e) {
      console.warn('Archive lead error on server:', e);
    }
  };

  // Generate AI Response calling backend
  const generateAiResponse = async (leadId: string, incomingUserMessage: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return null;

    setIsAiResponding(true);
    try {
      const leadHistory = messages[leadId] || [];

      const res = await fetch('/api/ai/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          lead,
          history: leadHistory,
          incomingMessage: incomingUserMessage,
          businessProfile,
          rules,
          products,
          faqs,
          aiSettings
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const responseText = data.responseText || 'Hola, hemos recibido tu mensaje y te responderemos en breve.';
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        leadId,
        text: responseText,
        sender: 'ai',
        timestamp: nowStr,
        status: 'delivered',
        matchedRules: data.matchedRules || data.matchedRuleTitles,
        modelUsed: data.modelUsed || (aiSettings.provider === 'openai' ? 'OpenAI GPT-4o-mini' : 'WhatsCRM Engine'),
        reasoning: data.reasoning,
        handoverTriggered: data.handoverTriggered,
        suggestedStage: data.suggestedStage
      };

      setMessages((prev) => ({
        ...prev,
        [leadId]: [...(prev[leadId] || []), aiMessage]
      }));

      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== leadId) return l;

          let updatedTags = l.tags;
          if (data.tagsToAdd && Array.isArray(data.tagsToAdd)) {
            updatedTags = Array.from(new Set([...updatedTags, ...data.tagsToAdd]));
          }

          let updatedStage = l.stage;
          if (aiSettings.autoQualifyLeads && data.suggestedStage) {
            updatedStage = data.suggestedStage;
          }

          const shouldDisableAi = data.handoverTriggered;

          return {
            ...l,
            stage: updatedStage,
            tags: updatedTags,
            aiEnabled: shouldDisableAi ? false : l.aiEnabled,
            lastMessageText: responseText.slice(0, 70) + (responseText.length > 70 ? '...' : ''),
            lastMessageTime: nowStr,
            unreadCount: 0
          };
        })
      );

      return data;
    } catch (err) {
      console.error('Error generating AI response:', err);
      const fallbackText = 'Hola, he recibido tu mensaje. Para darte la mejor atención, un asesor de nuestro equipo te contactará de inmediato.';
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const fallbackMsg: Message = {
        id: `ai-fallback-${Date.now()}`,
        leadId,
        text: fallbackText,
        sender: 'ai',
        timestamp: nowStr,
        status: 'delivered',
        reasoning: 'Respuesta de contingencia automática',
        modelUsed: 'Fallback Engine'
      };
      setMessages((prev) => ({
        ...prev,
        [leadId]: [...(prev[leadId] || []), fallbackMsg]
      }));
      return { responseText: fallbackText };
    } finally {
      setIsAiResponding(false);
    }
  };

  const suggestAiDraft = async (leadId: string): Promise<string> => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return '';
    const leadHistory = messages[leadId] || [];
    const lastUserMsg = [...leadHistory].reverse().find((m) => m.sender === 'user')?.text || 'Hola';

    try {
      const res = await fetch('/api/ai/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          lead,
          history: leadHistory,
          incomingMessage: lastUserMsg,
          businessProfile,
          rules,
          products,
          faqs,
          aiSettings
        })
      });
      const data = await res.json();
      return data.responseText || '';
    } catch {
      return '¡Hola! Con mucho gusto te asisto de manera personalizada. ¿Qué dudas tienes sobre nuestros servicios?';
    }
  };

  const sendMessage = async (leadId: string, text: string, sender: 'user' | 'agent' | 'ai' = 'agent') => {
    if (!text.trim()) return;

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      leadId,
      text: text.trim(),
      sender,
      timestamp: nowStr,
      status: sender === 'user' ? 'read' : 'delivered'
    };

    markUserEdited();
    setMessages((prev) => ({
      ...prev,
      [leadId]: [...(prev[leadId] || []), newMsg]
    }));

    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        return {
          ...l,
          lastMessageText: text.trim().slice(0, 70),
          lastMessageTime: nowStr,
          unreadCount: sender === 'user' ? l.unreadCount + 1 : 0
        };
      })
    );

    const targetLead = leads.find((l) => l.id === leadId);

    // If agent sends a message to a real WhatsApp contact, also send via backend/Meta API
    if (sender === 'agent' && targetLead && targetLead.phone) {
      fetch('/api/whatsapp/send-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetLead.phone,
          message: text.trim(),
          companyId
        })
      }).catch(() => {});
    }

    if (sender === 'user') {
      if (targetLead && targetLead.aiEnabled) {
        const delay = Math.max(500, (aiSettings.responseDelaySeconds || 1) * 1000);
        setTimeout(() => {
          generateAiResponse(leadId, text.trim());
        }, delay);
      }
    }
  };

  const updateBusinessProfile = (profileUpdates: Partial<BusinessProfile>) => {
    markUserEdited();
    setBusinessProfile((prev) => ({ ...prev, ...profileUpdates }));
  };

  const updateAiSettings = (settingsUpdates: Partial<AISettings>) => {
    markUserEdited();
    setAiSettings((prev) => ({ ...prev, ...settingsUpdates }));
  };

  const addRule = (ruleData: Omit<SpecialRule, 'id'>) => {
    markUserEdited();
    const newRule: SpecialRule = {
      ...ruleData,
      id: `rule-${Date.now()}`
    };
    setRules((prev) => [newRule, ...prev]);
  };

  const updateRule = (ruleId: string, updates: Partial<SpecialRule>) => {
    markUserEdited();
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, ...updates } : r))
    );
  };

  const deleteRule = (ruleId: string) => {
    markUserEdited();
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const toggleRule = (ruleId: string) => {
    markUserEdited();
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const addProduct = (productData: Omit<ProductItem, 'id'>) => {
    markUserEdited();
    const newProd: ProductItem = {
      ...productData,
      id: `prod-${Date.now()}`
    };
    setProducts((prev) => [...prev, newProd]);
  };

  const updateProduct = (productId: string, updates: Partial<ProductItem>) => {
    markUserEdited();
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
  };

  const deleteProduct = (productId: string) => {
    markUserEdited();
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const addFaq = (faqData: Omit<KnowledgeFaq, 'id'>) => {
    markUserEdited();
    const newFaq: KnowledgeFaq = {
      ...faqData,
      id: `faq-${Date.now()}`
    };
    setFaqs((prev) => [...prev, newFaq]);
  };

  const updateFaq = (faqId: string, updates: Partial<KnowledgeFaq>) => {
    markUserEdited();
    setFaqs((prev) =>
      prev.map((f) => (f.id === faqId ? { ...f, ...updates } : f))
    );
  };

  const deleteFaq = (faqId: string) => {
    markUserEdited();
    setFaqs((prev) => prev.filter((f) => f.id !== faqId));
  };

  const loadStarterDemoData = () => {
    markUserEdited();
    setProducts(INITIAL_PRODUCTS);
    setFaqs(INITIAL_FAQS);
    setRules(INITIAL_RULES);
    setLeads(INITIAL_LEADS);
    setMessages(INITIAL_MESSAGES);
    if (INITIAL_LEADS.length > 0) {
      setActiveLeadId(INITIAL_LEADS[0].id);
    }
  };

  const cleanDemoData = async () => {
    try {
      const res = await fetch('/api/crm/clean-demo-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId })
      });
      isUserDirtyRef.current = false;
      if (res.ok) {
        const data = await res.json();
        const remainingLeads: Lead[] = data.company?.leads || [];
        const remainingMsgs: Record<string, Message[]> = data.company?.messages || {};
        setLeads(remainingLeads);
        setMessages(remainingMsgs);
        setActiveLeadId(remainingLeads.length > 0 ? remainingLeads[0].id : null);
      } else {
        setLeads([]);
        setActiveLeadId(null);
        setMessages({});
      }
      try {
        localStorage.removeItem(STORAGE_KEY_PREFIX + 'leads');
        localStorage.removeItem(STORAGE_KEY_PREFIX + 'messages');
      } catch {}
      setLastSavedTime('Datos demo eliminados. Modo 100% Mensajes Reales activo.');
    } catch (e) {
      console.warn('Error cleaning demo data:', e);
      setLeads([]);
      setActiveLeadId(null);
      setMessages({});
    }
  };

  const runDailyTraining = async (): Promise<any> => {
    try {
      const res = await fetch('/api/ai/train-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.aiSettings) {
          setAiSettings((prev) => ({ ...prev, ...data.aiSettings }));
        }
        if (data.record) {
          setTrainingHistory((prev) => [data.record, ...prev.slice(0, 19)]);
        }
        await refreshFromServer();
        return data;
      }
    } catch (e) {
      console.error('Error running daily training:', e);
    }
    return null;
  };

  const clearWebhookLogs = async () => {
    try {
      await fetch('/api/whatsapp/webhook-logs', { method: 'DELETE' });
      setWebhookLogs([]);
    } catch (e) {
      console.warn('Error clearing webhook logs:', e);
    }
  };

  const refreshFromServer = async () => {
    try {
      const res = await fetch(`/api/crm/data?companyId=${encodeURIComponent(companyId)}`);
      if (res.status === 429) {
        console.warn('[Sync] Server rate limit protection active, backing off.');
        return;
      }
      if (!res.ok) return;

      const company = await res.json();
      if (!company) return;

      const serverLeads: Lead[] = company.leads || [];
      const serverMsgs: Record<string, Message[]> = company.messages || {};

      const curMsgs = messagesRef.current;
      const curLeads = leadsRef.current;
      const curActiveId = activeLeadIdRef.current;

      const localMsgCount = Object.values(curMsgs).reduce((acc, arr) => acc + arr.length, 0);
      const serverMsgCount = Object.values(serverMsgs).reduce((acc, arr) => acc + arr.length, 0);
      const hasLeadDiff =
        serverLeads.length !== curLeads.length ||
        serverLeads.some((sl, idx) => sl.id !== curLeads[idx]?.id || sl.lastMessageText !== curLeads[idx]?.lastMessageText);

      if (hasLeadDiff || serverMsgCount !== localMsgCount) {
        isUserDirtyRef.current = false; // Background sync, do not trigger a circular POST
        setLeads(serverLeads);
        setMessages(serverMsgs);

        // Auto-select incoming real WhatsApp lead if user is on a mock lead or no lead
        const topLead = serverLeads[0];
        if (
          topLead &&
          (topLead.id.startsWith('lead-real-') || topLead.tags?.includes('WhatsApp Real')) &&
          (!curActiveId || DEMO_IDS.has(curActiveId))
        ) {
          setActiveLeadId(topLead.id);
        } else if (!curActiveId && serverLeads.length > 0) {
          setActiveLeadId(serverLeads[0].id);
        }
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(`Sincronizado en vivo ${nowStr}`);
      }
    } catch (e: any) {
      console.warn('Notice refreshing from server:', e?.message || e);
    }
  };

  // 4. Polling for Incoming Meta WhatsApp Webhook Messages (every 20s, paused when inactive)
  useEffect(() => {
    if (!isServerLoaded) return;
    let isPolling = false;

    const interval = setInterval(async () => {
      // 1. Never poll if browser tab is hidden / minimized
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      // 2. Prevent overlapping polls
      if (isPolling) return;

      isPolling = true;
      try {
        await refreshFromServer();
      } finally {
        isPolling = false;
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [isServerLoaded, companyId]);

  const resetToDefaults = () => {
    setLeads(INITIAL_LEADS);
    setMessages(INITIAL_MESSAGES);
    setRules(INITIAL_RULES);
    setProducts(INITIAL_PRODUCTS);
    setFaqs(INITIAL_FAQS);
    setBusinessProfile(INITIAL_BUSINESS_PROFILE);
    setAiSettings(INITIAL_AI_SETTINGS);
    setActiveLeadId(INITIAL_LEADS[0].id);
  };

  return (
    <CrmContext.Provider
      value={{
        leads,
        activeLeadId,
        setActiveLeadId,
        messages,
        rules,
        products,
        faqs,
        businessProfile,
        aiSettings,
        trainingHistory,
        isAiResponding,
        isSavingToServer,
        lastSavedTime,
        isCloudConnected,
        cloudSyncStatus,
        manualCloudSync,
        webhookLogs,
        clearWebhookLogs,
        updateLeadStage,
        toggleLeadAi,
        updateLeadNotes,
        addLead,
        updateLead,
        deleteLead,
        toggleArchiveLead,
        sendMessage,
        generateAiResponse,
        suggestAiDraft,
        updateBusinessProfile,
        updateAiSettings,
        addRule,
        updateRule,
        deleteRule,
        toggleRule,
        addProduct,
        updateProduct,
        deleteProduct,
        addFaq,
        updateFaq,
        deleteFaq,
        cleanDemoData,
        refreshFromServer,
        runDailyTraining,
        loadStarterDemoData,
        resetToDefaults
      }}
    >
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};
