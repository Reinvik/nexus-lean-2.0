import Dexie, { type Table } from 'dexie';
import type { FiveSCategory, FiveSStatus } from '../types';

export interface LocalFiveSCard {
  tempId: string;
  id?: string;
  cardNumber?: string;
  company_id: string;
  area: string;
  description: string;
  findings?: string | null;
  priority: 'Baja' | 'Media' | 'Alta';
  category: FiveSCategory;
  due_date?: string | null;
  status: FiveSStatus;
  assigned_to?: string | null;
  image_urls?: string[];
  after_image_urls?: string[];
  closure_comment?: string | null;
  created_at: string;
  updated_at?: string;
  isOffline?: boolean;
  syncStatus: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
  rawFiles?: {
    imageBefore?: Blob | File;
    imageAfter?: Blob | File;
  };
}

export interface LocalAudit {
  tempId: string;
  id?: string;
  title?: string | null;
  area: string;
  auditor: string;
  audit_date: string;
  total_score: number;
  company_id: string;
  created_at: string;
  syncStatus: 'synced' | 'pending_insert';
  entries?: LocalAuditEntry[];
}

export interface LocalAuditEntry {
  id?: string;
  audit_temp_id: string;
  section: string;
  question: string;
  score: number;
  comment?: string | null;
}

export class NexusLeanDB extends Dexie {
  cards!: Table<LocalFiveSCard, string>;
  audits!: Table<LocalAudit, string>;
  auditEntries!: Table<LocalAuditEntry, number>;

  constructor() {
    super('NexusLean2DB');
    this.version(1).stores({
      cards: 'tempId, company_id, status, syncStatus, created_at',
      audits: 'tempId, company_id, syncStatus, audit_date',
      auditEntries: '++id, audit_temp_id, section',
    });
  }
}

export const db = new NexusLeanDB();
