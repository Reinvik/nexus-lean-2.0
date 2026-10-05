import { supabase } from '../../../lib/supabase';
import { db, type LocalFiveSCard } from '../../../lib/db';
import type { FiveSCard } from '../../../types';

export interface GetCardsOptions {
  companyId?: string | null;
  statusFilter?: 'all' | 'active' | 'history';
  limit?: number;
}

export const fiveSService = {
  /**
   * Upload an image to Supabase storage bucket 'images'
   */
  async uploadImage(file: File | Blob): Promise<string> {
    const ext = file instanceof File ? file.name.split('.').pop() : 'jpg';
    const fileName = `5s/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      console.warn('Supabase storage upload error:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    return data.publicUrl;
  },

  /**
   * Fetch online cards from Supabase + pending offline cards from Dexie
   */
  async getCards(options: GetCardsOptions = {}): Promise<FiveSCard[]> {
    const { companyId, statusFilter = 'all', limit = 100 } = options;

    let onlineCards: FiveSCard[] = [];

    // 1. Fetch from Supabase if online
    if (navigator.onLine) {
      try {
        let query = supabase
          .from('five_s_cards')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        if (statusFilter === 'active') {
          query = query.neq('status', 'Cerrado');
        } else if (statusFilter === 'history') {
          query = query.eq('status', 'Cerrado');
        }

        const { data, error } = await query;
        if (!error && data) {
          onlineCards = data as FiveSCard[];
        }
      } catch (err) {
        console.warn('Could not fetch online 5S cards:', err);
      }
    }

    // 2. Fetch offline pending cards from Dexie
    let offlineCards: FiveSCard[] = [];
    try {
      let dexieQuery = db.cards.toCollection();
      if (companyId) {
        dexieQuery = db.cards.where('company_id').equals(companyId);
      }
      const rawOffline = await dexieQuery.toArray();

      offlineCards = rawOffline.map((r) => ({
        id: r.tempId,
        tempId: r.tempId,
        cardNumber: r.cardNumber || 'OFF',
        company_id: r.company_id,
        area: r.area,
        description: r.description,
        findings: r.findings,
        priority: r.priority,
        category: r.category,
        status: 'Pendiente de subir',
        assigned_to: r.assigned_to,
        due_date: r.due_date,
        image_url: r.image_urls?.[0] || null,
        image_urls: r.image_urls || [],
        after_image_url: r.after_image_urls?.[0] || null,
        after_image_urls: r.after_image_urls || [],
        created_at: r.created_at,
        isOffline: true,
      }));
    } catch (dexieErr) {
      console.warn('Could not read Dexie offline cards:', dexieErr);
    }

    // Merge offline cards first, followed by online cards
    return [...offlineCards, ...onlineCards];
  },

  /**
   * Create a card (either online directly or offline into Dexie)
   */
  async createCard(
    cardData: Partial<FiveSCard>,
    rawFileBefore?: File | null
  ): Promise<{ success: boolean; card?: FiveSCard; error?: string }> {
    const tempId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // If online, try uploading image and saving to Supabase
    if (navigator.onLine) {
      try {
        let imageUrl: string | null = null;
        if (rawFileBefore) {
          imageUrl = await this.uploadImage(rawFileBefore);
        }

        const payload = {
          ...cardData,
          image_url: imageUrl || cardData.image_url,
          image_urls: imageUrl ? [imageUrl] : cardData.image_urls || [],
          status: cardData.status || 'Abierto',
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('five_s_cards')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        return { success: true, card: data as FiveSCard };
      } catch (err: any) {
        console.warn('Online insert failed, falling back to offline:', err);
      }
    }

    // Offline fallback: save into Dexie
    try {
      let localImageUrl: string | null = null;
      if (rawFileBefore) {
        localImageUrl = URL.createObjectURL(rawFileBefore);
      }

      const offlineRecord: LocalFiveSCard = {
        tempId,
        company_id: cardData.company_id || '',
        area: cardData.area || '',
        description: cardData.description || '',
        findings: cardData.findings,
        priority: cardData.priority || 'Media',
        category: cardData.category || 'Seiri',
        due_date: cardData.due_date,
        status: 'Pendiente de subir',
        assigned_to: cardData.assigned_to,
        image_urls: localImageUrl ? [localImageUrl] : [],
        created_at: new Date().toISOString(),
        isOffline: true,
        syncStatus: 'pending_insert',
        rawFiles: {
          imageBefore: rawFileBefore || undefined,
        },
      };

      await db.cards.add(offlineRecord);
      return {
        success: true,
        card: {
          ...offlineRecord,
          id: tempId,
          image_url: localImageUrl,
        } as FiveSCard,
      };
    } catch (offlineErr: any) {
      return { success: false, error: offlineErr?.message || 'Error guardando offline' };
    }
  },

  /**
   * Update card status, closure comment, or after photo
   */
  async updateCard(
    cardId: string,
    updates: Partial<FiveSCard>,
    rawFileAfter?: File | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let afterImageUrl = updates.after_image_url;

      if (rawFileAfter && navigator.onLine) {
        afterImageUrl = await this.uploadImage(rawFileAfter);
      }

      const payload = {
        ...updates,
        after_image_url: afterImageUrl,
        after_image_urls: afterImageUrl ? [afterImageUrl] : updates.after_image_urls,
        updated_at: new Date().toISOString(),
      };

      // Check if it's an offline card
      if (cardId.startsWith('off_')) {
        await db.cards.update(cardId, payload as any);
        return { success: true };
      }

      const { error } = await supabase
        .from('five_s_cards')
        .update(payload)
        .eq('id', cardId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error actualizando tarjeta' };
    }
  },

  /**
   * Delete card
   */
  async deleteCard(cardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (cardId.startsWith('off_')) {
        await db.cards.delete(cardId);
        return { success: true };
      }

      const { error } = await supabase.from('five_s_cards').delete().eq('id', cardId);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error eliminando tarjeta' };
    }
  },
};
