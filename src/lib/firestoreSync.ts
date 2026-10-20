import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot
} from 'firebase/firestore';
import { db, OperationType } from './firebase.ts';
import type {
  BusinessProfile,
  AISettings,
  SpecialRule,
  ProductItem,
  KnowledgeFaq,
  Lead,
  Message
} from '../types/crm.ts';

export interface CompanyCloudData {
  id: string;
  businessProfile: BusinessProfile;
  aiSettings: AISettings;
  rules: SpecialRule[];
  products: ProductItem[];
  faqs: KnowledgeFaq[];
  leads: Lead[];
  messages: Record<string, Message[]>;
  updatedAt: string;
}

// Rate Limiting & Cooldown Protection (Firestore Spark: max 1 write/sec per document)
const MIN_WRITE_INTERVAL_MS = 6000; // 6 seconds cooldown between document writes
let lastWriteTimestamp = 0;
let isCurrentlyWriting = false;
let pendingSaveTimer: any = null;
let latestPendingData: { companyId: string; data: Partial<CompanyCloudData> } | null = null;

async function executeFirestoreWrite(
  companyId: string,
  data: Partial<CompanyCloudData>
): Promise<boolean> {
  if (isCurrentlyWriting) {
    latestPendingData = { companyId, data };
    return true;
  }

  isCurrentlyWriting = true;
  lastWriteTimestamp = Date.now();

  try {
    const docRef = doc(db, 'companies', companyId);
    // Sanitize payload: strip any temporary or internal fields
    const { ...cleanData } = data as any;
    delete cleanData.webhookLogs;

    const payload = {
      ...cleanData,
      id: companyId,
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('rate') || errorMsg.includes('exhausted') || errorMsg.includes('quota')) {
      console.warn('[Firestore] Rate limit protection active, will retry on next user change.');
    } else {
      console.warn('[Firestore Cloud Sync] Notice:', errorMsg);
    }
    return false;
  } finally {
    isCurrentlyWriting = false;
  }
}

/**
 * Persists the company CRM state to Cloud Firestore (/companies/{companyId}).
 * Automatically throttles and debounces writes to respect Firestore limits
 * and prevent "The maximum write rate to the document has been exceeded" errors.
 */
export async function saveCompanyToFirestore(
  companyId: string,
  data: Partial<CompanyCloudData>,
  forceImmediate = false
): Promise<boolean> {
  const timeSinceLastWrite = Date.now() - lastWriteTimestamp;

  // If sufficient time has passed and not writing, or if force requested with cooldown passed:
  if (!isCurrentlyWriting && (forceImmediate || timeSinceLastWrite >= MIN_WRITE_INTERVAL_MS)) {
    if (pendingSaveTimer) {
      clearTimeout(pendingSaveTimer);
      pendingSaveTimer = null;
    }
    latestPendingData = null;
    return executeFirestoreWrite(companyId, data);
  }

  // Otherwise, queue write for when cooldown expires
  latestPendingData = { companyId, data };

  if (!pendingSaveTimer) {
    const remainingCooldown = Math.max(1000, MIN_WRITE_INTERVAL_MS - timeSinceLastWrite);
    pendingSaveTimer = setTimeout(async () => {
      pendingSaveTimer = null;
      if (latestPendingData) {
        const itemToSave = latestPendingData;
        latestPendingData = null;
        await executeFirestoreWrite(itemToSave.companyId, itemToSave.data);
      }
    }, remainingCooldown);
  }

  return true;
}

/**
 * Loads company CRM data from Cloud Firestore.
 */
export async function loadCompanyFromFirestore(
  companyId: string
): Promise<CompanyCloudData | null> {
  const path = `companies/${companyId}`;
  try {
    const docRef = doc(db, 'companies', companyId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as CompanyCloudData;
    }
    return null;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.warn(`[Firestore Cloud Sync] Notice on ${path}:`, errorMsg);
    return null;
  }
}

/**
 * Real-time listener for company changes in Firestore.
 */
export function subscribeCompanyFirestore(
  companyId: string,
  onUpdate: (data: CompanyCloudData) => void
): () => void {
  const path = `companies/${companyId}`;
  const docRef = doc(db, 'companies', companyId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as CompanyCloudData);
      }
    },
    (error) => {
      console.warn(`[Firestore Listener] Notice on ${path}:`, error?.message || error);
    }
  );
}
