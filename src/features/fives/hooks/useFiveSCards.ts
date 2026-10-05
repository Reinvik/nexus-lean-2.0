import { useState, useEffect, useMemo, useCallback } from 'react';
import { fiveSService } from '../services/fiveSService';
import type { FiveSCard, FiveSPriority, FiveSCategory, FiveSStatus } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

export interface FiveSFilters {
  search: string;
  status: 'all' | 'Abierto' | 'En Progreso' | 'Cerrado' | 'Pendiente de subir';
  category: 'all' | FiveSCategory;
  priority: 'all' | FiveSPriority;
}

export function useFiveSCards() {
  const { activeCompanyId } = useAuth();
  const [cards, setCards] = useState<FiveSCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiveSFilters>({
    search: '',
    status: 'all',
    category: 'all',
    priority: 'all',
  });

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fiveSService.getCards({ companyId: activeCompanyId });
      setCards(data);
    } catch (err) {
      console.error('Error fetching 5S cards:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Search text filter
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchesArea = card.area?.toLowerCase().includes(q);
        const matchesDesc = card.description?.toLowerCase().includes(q);
        const matchesFindings = card.findings?.toLowerCase().includes(q);
        const matchesNum = card.cardNumber?.toLowerCase().includes(q);
        const matchesAssignee = card.assigned_to?.toLowerCase().includes(q);
        if (!matchesArea && !matchesDesc && !matchesFindings && !matchesNum && !matchesAssignee) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all' && card.status !== filters.status) {
        return false;
      }

      // Category filter
      if (filters.category !== 'all' && card.category !== filters.category) {
        return false;
      }

      // Priority filter
      if (filters.priority !== 'all' && card.priority !== filters.priority) {
        return false;
      }

      return true;
    });
  }, [cards, filters]);

  // Statistics
  const stats = useMemo(() => {
    const total = cards.length;
    const open = cards.filter((c) => c.status === 'Abierto').length;
    const inProgress = cards.filter((c) => c.status === 'En Progreso').length;
    const closed = cards.filter((c) => c.status === 'Cerrado').length;
    const pendingOffline = cards.filter((c) => c.isOffline).length;
    const complianceRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    return {
      total,
      open,
      inProgress,
      closed,
      pendingOffline,
      complianceRate,
    };
  }, [cards]);

  const createCard = async (data: Partial<FiveSCard>, rawFile?: File | null) => {
    const res = await fiveSService.createCard(
      { ...data, company_id: data.company_id || activeCompanyId || '' },
      rawFile
    );
    if (res.success && res.card) {
      setCards((prev) => [res.card!, ...prev]);
    }
    return res;
  };

  const updateCard = async (
    cardId: string,
    updates: Partial<FiveSCard>,
    rawFileAfter?: File | null
  ) => {
    const res = await fiveSService.updateCard(cardId, updates, rawFileAfter);
    if (res.success) {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId || c.tempId === cardId ? { ...c, ...updates } : c))
      );
    }
    return res;
  };

  const deleteCard = async (cardId: string) => {
    const res = await fiveSService.deleteCard(cardId);
    if (res.success) {
      setCards((prev) => prev.filter((c) => c.id !== cardId && c.tempId !== cardId));
    }
    return res;
  };

  return {
    cards: filteredCards,
    rawCards: cards,
    loading,
    filters,
    setFilters,
    stats,
    refresh: loadCards,
    createCard,
    updateCard,
    deleteCard,
  };
}
