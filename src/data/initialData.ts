import type {
  Lead,
  Message,
  SpecialRule,
  ProductItem,
  KnowledgeFaq,
  BusinessProfile,
  AISettings
} from '../types/crm.ts';

export const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  companyName: 'Dentismed',
  industry: 'Clinica medico Dental',
  welcomeMessage: '¡Hola! 👋 Gracias por comunicarte con Dentismed. Soy Den, tu asistente virtual inteligente. ¿En qué podemos ayudarte hoy?',
  defaultTone: 'amigable',
  useEmojis: true,
  currency: 'USD',
  customInstructions: 'Eres Den, el asistente virtual inteligente de la clínica médico dental Dentismed en Quito, Ecuador. Sé siempre cálido, empático y profesional de la salud. Resalta la gran promoción de Limpieza Dental Completa de Niños a solo $15 USD. Para agendamiento de citas solicita nombre completo, fecha y hora preferida. Ante dolor o urgencias dentales graves, transfiere de inmediato al equipo médico humano.',
  handoverMessage: 'Entendido. Un especialista médico de Dentismed tomará esta conversación en breves minutos para brindarte atención personalizada y confirmar tu cita. 🦷👨‍⚕️',
  phone: '0962691048',
  workingHours: 'Lunes a Sábado de 08:30 a 19:00 (Urgencias 24/7)',
  supportEmail: 'dentismed.uio.ec@gmail.com',
  address: 'Quito, Ecuador'
};

export const INITIAL_AI_SETTINGS: AISettings = {
  provider: 'gemini',
  model: 'gemini-3.8-flash',
  openaiApiKey: '',
  temperature: 0.6,
  autoQualifyLeads: true,
  autoTagLeads: true,
  responseDelaySeconds: 1,
  whatsappProvider: 'ycloud',
  ycloudApiKey: '',
  ycloudFromNumber: '+593962691048',
  customWebhookUrl: 'https://ordenfacilcrmwa.ai.studio/api/whatsapp/webhook',
  dailyTrainingEnabled: true,
  lastDailyTrainingAt: new Date().toISOString(),
  trainingCycles: 1,
  dailyTrainingSummary: 'Auto-entrenamiento diario activo por empresa. Perfecciona respuestas basado en el historial real de conversaciones de WhatsApp.'
};

export const INITIAL_RULES: SpecialRule[] = [
  {
    id: 'rule-promo-ninos',
    title: 'Super Promoción Limpieza Dental Niños ($15 USD)',
    description: 'Cuando pregunten por niños, profilaxis infantil, limpieza de peques o promociones vigentes.',
    triggerType: 'keyword',
    triggers: ['niño', 'niños', 'niña', 'hijo', 'hija', 'infantil', 'peques', 'promocion', 'promo', '15', 'limpieza niños'],
    action: 'custom_response',
    actionPayload: {
      tag: 'Promo Infantil $15',
      stage: 'interesado',
      response: '¡Tenemos una super promoción especial en Dentismed! 🧒🦷 Limpieza Dental Completa para Niños a solo $15 USD. Incluye: profilaxis profunda, remoción de placa, flúor protector y técnica de cepillado divertida para cuidar sus dientecitos. ¿Para qué día y hora te gustaría agendar a tu pequeño/a?'
    },
    enabled: true,
    color: '#10B981'
  },
  {
    id: 'rule-handover-human',
    title: 'Traspaso a Doctor / Asesor Humano',
    description: 'Cuando el paciente pida hablar con un doctor, recepcionista o persona del equipo.',
    triggerType: 'keyword',
    triggers: ['doctor', 'doctora', 'odontologo', 'humano', 'persona', 'asesor', 'operador', 'hablar con alguien', 'recepción'],
    action: 'handover',
    actionPayload: {
      message: 'Comprendo perfectamente. Estoy transfiriendo tu chat con nuestro equipo médico de Dentismed para que te atiendan de inmediato. Un momento por favor ⏳🦷👩‍⚕️',
      tag: 'Requiere Doctor',
      stage: 'contactado'
    },
    enabled: true,
    color: '#EF4444'
  },
  {
    id: 'rule-emergencias',
    title: 'Urgencia o Dolor Dental Agudo',
    description: 'Si el paciente manifiesta dolor fuerte, inflamación, muela rota o sangrado.',
    triggerType: 'keyword',
    triggers: ['dolor', 'duele', 'muela', 'urgencia', 'emergencia', 'inflamado', 'hinchado', 'se me rompio', 'sangra'],
    action: 'handover',
    actionPayload: {
      message: '¡Lamento mucho que estés pasando por ese dolor! Tu bienestar es nuestra máxima prioridad. Te estoy derivando en este instante con nuestro odontólogo de turno para darte atención prioritaria inmediata. ¿Puedes confirmarme tu nombre y desde cuándo tienes el dolor?',
      tag: 'Urgencia Dental 🚨',
      stage: 'contactado'
    },
    enabled: true,
    color: '#DC2626'
  },
  {
    id: 'rule-agendar-cita',
    title: 'Agendamiento de Cita Odontológica',
    description: 'Cuando el paciente quiera agendar, reservar turno o preguntar horarios.',
    triggerType: 'keyword',
    triggers: ['cita', 'agendar', 'turno', 'reservar', 'hora', 'horario', 'disponibilidad', 'atención'],
    action: 'move_stage',
    actionPayload: {
      stage: 'cotizado',
      tag: 'Cita Solicitada 📅',
      message: '¡Con gusto te agendamos en Dentismed! 🦷 Atendemos de Lunes a Sábado de 08:30 a 19:00 en Quito. Por favor indícanos: 1. Nombre completo del paciente, 2. Tratamiento de interés, y 3. Día y hora que más te convenga (mañana o tarde).'
    },
    enabled: true,
    color: '#8B5CF6'
  },
  {
    id: 'rule-payment-methods',
    title: 'Medios de Pago en Clínica',
    description: 'Cuando pregunten cómo pagar en la clínica.',
    triggerType: 'keyword',
    triggers: ['cómo pago', 'metodos de pago', 'tarjeta', 'transferencia', 'efectivo', 'pago'],
    action: 'custom_response',
    actionPayload: {
      tag: 'Consultó Pagos',
      response: 'En Dentismed aceptamos los siguientes métodos de pago:\n• 💵 Efectivo\n• 💳 Todas las Tarjetas de Débito y Crédito (diferidos disponibles)\n• 🏦 Transferencia bancaria directa (Pichincha, Guayaquil, Produbanco)\n\n¿En qué tratamiento estás interesado para ayudarte?'
    },
    enabled: true,
    color: '#F59E0B'
  }
];

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-limpieza-ninos',
    name: 'Limpieza Dental Completa de Niños (Promo $15)',
    category: 'Odontopediatría',
    price: 15,
    currency: 'USD',
    description: '¡Super Promoción Especial! Profilaxis completa infantil, eliminación de placa bacteriana, aplicación de flúor remineralizante y técnica de cepillado para los más pequeños.',
    inStock: true,
    features: ['Profilaxis infantil suave', 'Aplicación de flúor', 'Técnica de cepillado divertida', 'Atención sin miedo ni dolor']
  },
  {
    id: 'prod-limpieza-adultos',
    name: 'Limpieza Dental con Ultrasonido Adultos (Promo Octubre $20 / Regular $25)',
    category: 'Higiene & Prevención',
    price: 20,
    currency: 'USD',
    description: 'Remoción profunda de sarro supragingival y manchas con tecnología ultrasónica avanzada. Precio regular $25 USD, ¡en súper promo por el mes de octubre a solo $20 USD!',
    inStock: true,
    features: ['Ultrasonido indoloro', 'Promo Octubre $20 (Regular $25)', 'Eliminación de sarro y manchas', 'Pulido dental con flúor']
  },
  {
    id: 'prod-blanqueamiento',
    name: 'Blanqueamiento Dental LED Clínico ($80 USD)',
    category: 'Estética Dental',
    price: 80,
    currency: 'USD',
    description: 'Aclara de 2 a 4 tonos en una sesión segura de 45 minutos por solo $80 USD. Elimina manchas de café, té y tabaco protegiendo el esmalte dental.',
    inStock: true,
    features: ['Sesión de 45 min', 'Aclara de 2 a 4 tonos', 'Precio especial $80 USD', 'Gel protector de encías']
  },
  {
    id: 'prod-resina-estetica',
    name: 'Calzas y Curaciones con Resina Estética',
    category: 'Operatorio Dental',
    price: 20,
    currency: 'USD',
    description: 'Eliminación completa de caries y restauración con resina de nano-relleno del mismo tono de tu diente. Duradero e imperceptible.',
    inStock: true,
    features: ['Mismo color del diente', 'Alta resistencia', 'Sin amalgamas oscuras', 'Garantía de fijación']
  },
  {
    id: 'prod-ortodoncia',
    name: 'Ortodoncia y Brackets (Cita de Revisión Gratuita)',
    category: 'Ortodoncia',
    price: 0,
    currency: 'USD',
    description: 'En ortodoncia no se da precio por mensaje. ¡Te agendamos una cita de revisión y valoración totalmente GRATIS sin costo! Brackets metálicos o zafiro con pagos mensuales accesibles.',
    inStock: true,
    features: ['Cita de revisión 100% GRATIS', 'Evaluación con especialista', 'Sin precio fijo por mensaje', 'Planes de cuotas mensuales']
  },
  {
    id: 'prod-extraccion-muelas',
    name: 'Extracción de Muelas del Juicio y Terceros Molares',
    category: 'Cirugía Oral',
    price: 35,
    currency: 'USD',
    description: 'Extracción segura y sin dolor de muelas del juicio retenidas o erupcionadas con anestesia de alta calidad y sutura reabsorbible.',
    inStock: true,
    features: ['Anestesia indolora', 'Cirugía de mínima invasión', 'Medicamentos post-operatorios', 'Control de cicatrización']
  },
  {
    id: 'prod-diseno-sonrisa',
    name: 'Diseño de Sonrisa y Carillas Dentales',
    category: 'Alta Estética',
    price: 120,
    currency: 'USD',
    description: 'Carillas de resina de alta estética o porcelana para corregir forma, tamaño, color y espacios dentales (diastemas).',
    inStock: true,
    features: ['Simulación digital previa', 'Carillas de alta duración', 'Sonrisa natural y armónica']
  },
  {
    id: 'prod-consulta-diagnostico',
    name: 'Consulta Odontológica y Diagnóstico Intraoral',
    category: 'Diagnóstico',
    price: 10,
    currency: 'USD',
    description: 'Evaluación integral con cámara intraoral HD para que veas en pantalla el estado real de cada pieza dental. (Gratis al iniciar tratamiento).',
    inStock: true,
    features: ['Cámara intraoral HD', 'Odontograma digital', 'Plan de tratamiento detallado']
  }
];

export const INITIAL_FAQS: KnowledgeFaq[] = [
  {
    id: 'faq-1',
    question: '¿En qué consiste la promoción de limpieza de niños por $15?',
    answer: 'Nuestra promoción infantil de $15 USD incluye revisión dental completa, remoción cuidadosa de placa bacteriana, pulido con pasta especial para niños, aplicación de flúor protector y educación divertida sobre técnicas de cepillado.',
    category: 'Promociones',
    keywords: ['niños', '15', 'promo', 'promoción', 'limpieza', 'flúor']
  },
  {
    id: 'faq-2',
    question: '¿Dónde está ubicada la clínica Dentismed y qué horarios tienen?',
    answer: 'Estamos ubicados en Quito, Ecuador. Atendemos de Lunes a Sábado de 08:30 a 19:00. Para emergencias o agendamiento directo puedes escribirnos a nuestro WhatsApp oficial 0962691048.',
    category: 'Ubicación & Horarios',
    keywords: ['ubicación', 'donde estan', 'dirección', 'horario', 'quito', 'abren']
  },
  {
    id: 'faq-3',
    question: '¿Los procedimientos dentales causan dolor?',
    answer: 'En Dentismed aplicamos técnicas de odontología mínimamente invasiva y anestesia tópica y local de última generación para garantizar que tu atención y la de tus hijos sea 100% cómoda, tranquila y sin dolor.',
    category: 'Tratamientos',
    keywords: ['duele', 'dolor', 'miedo', 'anestesia', 'hijos']
  },
  {
    id: 'faq-4',
    question: '¿Qué formas de pago aceptan en Dentismed?',
    answer: 'Aceptamos efectivo, transferencias bancarias a los principales bancos de Ecuador (Pichincha, Guayaquil, Produbanco, etc.) y todas las tarjetas de crédito o débito con opción a pago diferido.',
    category: 'Pagos',
    keywords: ['pago', 'tarjeta', 'transferencia', 'diferido', 'banco']
  },
  {
    id: 'faq-5',
    question: '¿Qué precio tiene la ortodoncia o brackets?',
    answer: 'En Ortodoncia no damos un precio fijo por mensaje ya que cada mordida y caso es diferente. Lo que sí hacemos es agendarte una cita de revisión y diagnóstico totalmente GRATIS y sin costo alguno. Te explicaremos opciones de brackets metálicos o zafiro con cómodos pagos mensuales.',
    category: 'Ortodoncia',
    keywords: ['brackets', 'ortodoncia', 'precio brackets', 'cuanto cuesta ortodoncia', 'frenillos', 'zafiro']
  },
  {
    id: 'faq-6',
    question: '¿Cuánto cuesta la limpieza dental de adultos con ultrasonido?',
    answer: 'La Limpieza Dental con Ultrasonido para adultos tiene un precio regular de $25 USD, ¡pero durante todo el mes de octubre la tenemos en promoción especial a solo $20 USD! Elimina sarro y manchas sin dolor.',
    category: 'Higiene & Prevención',
    keywords: ['limpieza adultos', 'ultrasonido', 'sarro', 'profilaxis adulto', 'precio limpieza', 'octubre', '20']
  },
  {
    id: 'faq-7',
    question: '¿Cuánto cuesta el blanqueamiento dental?',
    answer: 'El Blanqueamiento Dental Clínico tiene un valor de $80 USD. Aclara de 2 a 4 tonos en una sesión segura de 45 minutos cuidando tu esmalte.',
    category: 'Estética Dental',
    keywords: ['blanqueamiento', 'blanquear dientes', 'precio blanqueamiento', '80', 'manchas dientes']
  }
];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_MESSAGES: Record<string, Message[]> = {};


