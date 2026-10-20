export type LeadStage = 'nuevo' | 'contactado' | 'interesado' | 'cotizado' | 'ganado' | 'perdido';

export type SentimentType = 'positivo' | 'neutral' | 'negativo' | 'urgente';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar: string;
  stage: LeadStage;
  tags: string[];
  notes: string;
  estimatedValue: number;
  aiEnabled: boolean; // true = IA responde automáticamente, false = atención humana
  sentiment: SentimentType;
  unreadCount: number;
  lastMessageTime: string;
  lastMessageText: string;
  summary: string;
  company?: string;
  isArchived?: boolean;
  createdAt?: string;
}

export interface Message {
  id: string;
  leadId: string;
  text: string;
  sender: 'user' | 'ai' | 'agent';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  matchedRules?: string[];
  modelUsed?: string;
  reasoning?: string;
  handoverTriggered?: boolean;
  suggestedStage?: LeadStage;
}

export type RuleAction = 'handover' | 'custom_response' | 'tag_lead' | 'move_stage' | 'discount_warning';

export interface SpecialRule {
  id: string;
  title: string;
  description: string;
  triggerType: 'keyword' | 'intent' | 'condition';
  triggers: string[];
  action: RuleAction;
  actionPayload?: {
    message?: string;
    response?: string;
    tag?: string;
    stage?: LeadStage;
  };
  enabled: boolean;
  color?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  inStock: boolean;
  features?: string[];
}

export interface KnowledgeFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

export interface BusinessProfile {
  companyName: string;
  industry: string;
  welcomeMessage: string;
  defaultTone: 'amigable' | 'profesional' | 'comercial' | 'tecnico';
  useEmojis: boolean;
  currency: string;
  customInstructions: string;
  handoverMessage: string;
  phone: string;
  workingHours: string;
  supportEmail: string;
  address: string;
}

export interface AISettings {
  provider: 'gemini' | 'openai';
  model: string;
  openaiApiKey: string;
  temperature: number;
  autoQualifyLeads: boolean;
  autoTagLeads: boolean;
  responseDelaySeconds: number;
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappProvider?: 'ycloud' | 'meta';
  ycloudApiKey?: string;
  ycloudFromNumber?: string;
  customWebhookUrl?: string;
  dailyTrainingEnabled?: boolean;
  lastDailyTrainingAt?: string;
  trainingCycles?: number;
  dailyTrainingSummary?: string;
  trainingScore?: number;
  specializedIndustry?: string;
}

export interface AITrainingRecord {
  id: string;
  timestamp: string;
  date: string;
  accuracyScore: number;
  analyzedConversations: number;
  insightsLearned: string[];
  specializedDirectives: string;
  status: 'completado' | 'en_progreso' | 'error';
  cycle: string;
}

export interface WebhookLogEntry {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST';
  eventType: 'verification' | 'incoming_message' | 'status_update' | 'reply_sent' | 'send_error' | 'missing_credentials' | 'unknown';
  phone?: string;
  summary: string;
  rawPayload?: string;
}

