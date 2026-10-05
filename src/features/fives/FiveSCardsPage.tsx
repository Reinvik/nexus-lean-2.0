import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import HeaderWithFilter from '../../components/common/HeaderWithFilter';
import StatCard from '../../components/common/StatCard';
import FiveSCardModal from './components/FiveSCardModal';
import PresentationModal from './components/PresentationModal';
import HistoryModal from './components/HistoryModal';
import type { FiveSCard, Profile, Company } from '../../types';
import {
  Plus,
  Search,
  Camera,
  X,
  Calendar,
  MapPin,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart as BarIcon,
  ChevronDown,
  Activity,
  ArrowRight,
  Trash2,
  CloudOff,
  Save,
  Maximize2,
  FileDown,
  TrendingUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

// Helper: Convert timestamp to dd-mm-yyyy for display
const formatDateForDisplay = (dateStr?: string | null) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return '';
  }
};

const getWeekNumber = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNo;
};

export const FiveSCardsPage: React.FC = () => {
  const { user, globalFilterCompanyId, companies, activeCompanyId } = useAuth();

  // Cards State
  const [cards, setCards] = useState<FiveSCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'active' | 'history'>('all');

  // Modals & Popups State
  const [selectedCard, setSelectedCard] = useState<FiveSCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Target company ID
  const targetCompanyId = useMemo(() => {
    if (!user) return null;
    if (user.isGlobalAdmin) {
      return globalFilterCompanyId && globalFilterCompanyId !== 'all'
        ? globalFilterCompanyId
        : activeCompanyId || null;
    }
    return user.company_id || user.companyId || null;
  }, [user, globalFilterCompanyId, activeCompanyId]);

  // Fetch Cards
  const fetchCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('five_s_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (!user.isGlobalAdmin) {
        const comp = user.company_id || user.companyId;
        if (comp) query = query.eq('company_id', comp);
      } else {
        if (globalFilterCompanyId && globalFilterCompanyId !== 'all') {
          query = query.eq('company_id', globalFilterCompanyId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const mappedCards: FiveSCard[] = (data || []).map((c: any) => {
        let color = '#ef4444';
        if (c.status === 'En Proceso' || c.status === 'En Progreso') color = '#f59e0b';
        if (c.status === 'Cerrado') color = '#10b981';

        return {
          ...c,
          date: c.date || c.card_date || c.created_at,
          cardNumber: c.card_number || c.cardNumber || '?',
          location: c.location || c.area || '',
          area: c.area || c.location || '',
          article: c.article || c.description || '',
          description: c.description || c.article || '',
          reason: c.reason || c.findings || '',
          findings: c.findings || c.reason || '',
          proposedAction: c.proposedAction || c.closure_comment || '',
          closure_comment: c.closure_comment || c.proposedAction || '',
          targetDate: c.targetDate || c.due_date || '',
          due_date: c.due_date || c.targetDate || '',
          solutionDate: c.solutionDate || c.close_date || '',
          close_date: c.close_date || c.solutionDate || '',
          image_urls: c.image_urls || (c.image_url ? [c.image_url] : []),
          after_image_urls: c.after_image_urls || (c.after_image_url ? [c.after_image_url] : []),
          statusColor: color,
        };
      });

      setCards(mappedCards);
    } catch (err) {
      console.error('Error fetching 5S cards:', err);
      toast.error('Error al cargar tarjetas 5S');
    } finally {
      setLoading(false);
    }
  }, [user, globalFilterCompanyId]);

  // Fetch Users
  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase.from('profiles').select('*');
      if (!user.isGlobalAdmin) {
        const comp = user.company_id || user.companyId;
        if (comp) query = query.eq('company_id', comp);
      } else if (globalFilterCompanyId && globalFilterCompanyId !== 'all') {
        query = query.eq('company_id', globalFilterCompanyId);
      }
      const { data, error } = await query;
      if (!error && data) setUsers(data as Profile[]);
    } catch (err) {
      console.warn('Could not fetch profiles:', err);
    }
  }, [user, globalFilterCompanyId]);

  useEffect(() => {
    fetchCards();
    fetchProfiles();
  }, [fetchCards, fetchProfiles]);

  // Unique Lists for Filters
  const personSuggestions = useMemo(() => {
    const list = cards
      .map((c) => c.responsible)
      .filter((n): n is string => Boolean(n && n.trim().length > 0));
    const userNames = users
      .map((u) => (u as any).name || u.full_name || u.email || '')
      .filter(Boolean);
    return [...new Set([...list, ...userNames])].sort();
  }, [cards, users]);

  const uniqueLocations = useMemo(() => {
    const locs = cards
      .map((c) => c.location || c.area)
      .filter((n): n is string => Boolean(n && n.trim().length > 0));
    return [...new Set(locs)].sort();
  }, [cards]);

  // View Mode filtering
  const visibleCards = useMemo(() => {
    if (viewMode === 'active') {
      return cards.filter((c) => c.status !== 'Cerrado');
    }
    if (viewMode === 'history') {
      return cards.filter((c) => c.status === 'Cerrado');
    }
    return cards;
  }, [cards, viewMode]);

  // Filtered Cards for Grid
  const gridCards = useMemo(() => {
    return visibleCards.filter((card) => {
      const searchLower = searchTerm.toLowerCase();
      const locationMatch = filterLocation
        ? (card.location || card.area) === filterLocation
        : true;
      const responsibleMatch = filterResponsible
        ? card.responsible === filterResponsible
        : true;

      const textMatch =
        (card.location || card.area || '').toLowerCase().includes(searchLower) ||
        (card.article || card.description || '').toLowerCase().includes(searchLower) ||
        (card.responsible || '').toLowerCase().includes(searchLower) ||
        (card.reason || card.findings || '').toLowerCase().includes(searchLower);

      let statusMatch = true;
      if (statusFilter !== 'Todos') {
        if (statusFilter === 'En Progreso') {
          statusMatch = card.status === 'En Proceso' || card.status === 'En Progreso';
        } else {
          statusMatch = card.status === statusFilter;
        }
      }

      return locationMatch && responsibleMatch && textMatch && statusMatch;
    });
  }, [visibleCards, searchTerm, filterLocation, filterResponsible, statusFilter]);

  // KPI Calculations
  const kpiData = useMemo(() => {
    const total = gridCards.length;
    if (total === 0) {
      return {
        statusData: [],
        locationData: [],
        weeklyTrend: [],
        completionRate: 0,
        closed: 0,
        pending: 0,
        inProcess: 0,
        total: 0,
        closureStats: { avg: 0, min: 0, max: 0 },
      };
    }

    const statusCounts = gridCards.reduce((acc: Record<string, number>, curr) => {
      let status = curr.status;
      if (status === 'En Progreso') status = 'En Proceso';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const closed = statusCounts['Cerrado'] || 0;
    const open = statusCounts['Abierto'] || 0;
    const inProgress = (statusCounts['En Proceso'] || 0) + (statusCounts['En Progreso'] || 0);

    const statusData = [
      { name: 'Cerrado', value: closed, color: '#10b981' },
      { name: 'En Progreso', value: inProgress, color: '#f59e0b' },
      { name: 'Abierto', value: open, color: '#ef4444' },
    ].filter((d) => d.value > 0);

    // Locations Top 5
    const locationCounts = gridCards.reduce((acc: Record<string, number>, curr) => {
      const loc = curr.location || curr.area || 'General';
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});

    const locationData = Object.entries(locationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Days to close statistics
    const closedCards = gridCards.filter(
      (c) =>
        c.status === 'Cerrado' &&
        c.date &&
        (c.solutionDate || c.close_date)
    );

    let avgDays: string | number = 0;
    let minDays: string | number = 0;
    let maxDays: string | number = 0;

    if (closedCards.length > 0) {
      const daysList = closedCards
        .map((c) => {
          const start = new Date(c.date || c.created_at);
          const end = new Date(c.solutionDate || c.close_date || '');
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
          return Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        })
        .filter((d) => d >= 0);

      if (daysList.length > 0) {
        const totalDays = daysList.reduce((a, b) => a + b, 0);
        avgDays = (totalDays / daysList.length).toFixed(1);
        minDays = Math.min(...daysList).toFixed(1);
        maxDays = Math.max(...daysList).toFixed(1);
      }
    }

    // Weekly trend
    const last8Weeks: Date[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(d.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);
      last8Weeks.push(startOfWeek);
    }

    const weeklyTrend = last8Weeks.map((weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const cardsUntilThen = gridCards.filter(
        (c) => new Date(c.date || c.created_at) < weekEnd
      );
      const totalUntilThen = cardsUntilThen.length;
      const closedUntilThen = cardsUntilThen.filter(
        (c) =>
          c.status === 'Cerrado' &&
          new Date(c.solutionDate || c.close_date || c.updated_at || c.created_at) < weekEnd
      ).length;

      const percentage =
        totalUntilThen > 0 ? Math.round((closedUntilThen / totalUntilThen) * 100) : 0;

      return {
        name: `S${getWeekNumber(weekStart)}`,
        dateRange: `${weekStart.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
        })}`,
        percentage,
        total: totalUntilThen,
        closed: closedUntilThen,
      };
    });

    return {
      statusData,
      locationData,
      weeklyTrend,
      completionRate: Math.round((closed / total) * 100),
      closed,
      pending: open,
      inProcess: inProgress,
      total,
      closureStats: {
        avg: avgDays,
        min: minDays,
        max: maxDays,
      },
    };
  }, [gridCards]);

  // Save Card Handler
  const handleSaveCard = async (cardData: Partial<FiveSCard>): Promise<boolean> => {
    try {
      const assignedComp =
        user?.isGlobalAdmin && globalFilterCompanyId && globalFilterCompanyId !== 'all'
          ? globalFilterCompanyId
          : user?.company_id || user?.companyId || targetCompanyId;

      if (cardData.id) {
        // Update
        const { error } = await supabase
          .from('five_s_cards')
          .update({
            card_number: cardData.cardNumber || cardData.card_number,
            area: cardData.location || cardData.area,
            description: cardData.article || cardData.description,
            findings: cardData.reason || cardData.findings,
            status: cardData.status,
            category: cardData.category,
            assigned_to: cardData.assigned_to,
            responsible: cardData.responsible,
            due_date: cardData.targetDate || cardData.due_date,
            close_date: cardData.solutionDate || cardData.close_date,
            closure_comment: cardData.proposedAction || cardData.closure_comment,
            image_urls: cardData.image_urls || [],
            image_url: cardData.image_urls?.[0] || null,
            after_image_urls: cardData.after_image_urls || [],
            after_image_url: cardData.after_image_urls?.[0] || null,
            date: cardData.date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cardData.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from('five_s_cards').insert({
          company_id: assignedComp,
          card_number: cardData.cardNumber || cardData.card_number,
          area: cardData.location || cardData.area,
          description: cardData.article || cardData.description,
          findings: cardData.reason || cardData.findings,
          status: cardData.status || 'Abierto',
          category: cardData.category || 'Seiri',
          assigned_to: cardData.assigned_to,
          responsible: cardData.responsible,
          due_date: cardData.targetDate || cardData.due_date,
          close_date: cardData.solutionDate || cardData.close_date,
          closure_comment: cardData.proposedAction || cardData.closure_comment,
          image_urls: cardData.image_urls || [],
          image_url: cardData.image_urls?.[0] || null,
          after_image_urls: cardData.after_image_urls || [],
          after_image_url: cardData.after_image_urls?.[0] || null,
          date: cardData.date || new Date().toISOString().split('T')[0],
          created_by: user?.id,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      fetchCards();
      return true;
    } catch (err: any) {
      console.error('Error saving 5S card:', err);
      toast.error('Error al guardar: ' + err.message);
      return false;
    }
  };

  // Delete Card Handler
  const handleDeleteCard = async (cardId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('five_s_cards').delete().eq('id', cardId);
      if (error) throw error;
      fetchCards();
      return true;
    } catch (err: any) {
      console.error('Error deleting 5S card:', err);
      toast.error('Error al eliminar: ' + err.message);
      return false;
    }
  };

  // Export to Excel with Embedded Images
  const handleExportExcel = async () => {
    if (isExporting || gridCards.length === 0) return;
    setIsExporting(true);
    const toastId = toast.loading('Generando reporte Excel con imágenes...');

    const fetchImageBuffer = async (url: string) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await blob.arrayBuffer();
      } catch (e) {
        console.warn('Could not fetch image for Excel:', e);
        return null;
      }
    };

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tarjetas 5S');

      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: {
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb: 'FF1E293B' },
        },
        alignment: { vertical: 'middle' as const, horizontal: 'center' as const },
        border: {
          top: { style: 'thin' as const },
          left: { style: 'thin' as const },
          bottom: { style: 'thin' as const },
          right: { style: 'thin' as const },
        },
      };

      worksheet.columns = [
        { header: 'N°', key: 'number', width: 10 },
        { header: 'FECHA', key: 'date', width: 14 },
        { header: 'UBICACIÓN', key: 'location', width: 24 },
        { header: 'ARTÍCULO/EQUIPO', key: 'article', width: 24 },
        { header: 'HALLAZGO', key: 'reason', width: 38 },
        { header: 'ACCIÓN PROPUESTA', key: 'action', width: 38 },
        { header: 'ESTADO', key: 'status', width: 14 },
        { header: 'RESPONSABLE', key: 'responsible', width: 22 },
        { header: 'FECHA COMPROMISO', key: 'target_date', width: 18 },
        { header: 'FECHA CIERRE', key: 'close_date', width: 16 },
        { header: 'FOTO ANTES', key: 'images_before', width: 24 },
        { header: 'FOTO DESPUÉS', key: 'images_after', width: 24 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.style = headerStyle;
      });

      let excelRowIndex = 2;
      for (const card of gridCards) {
        const dataRow = worksheet.addRow({
          number: card.cardNumber || card.card_number || '?',
          date: formatDateForDisplay(card.date),
          location: card.location || card.area,
          article: card.article || card.description,
          reason: card.reason || card.findings,
          action: card.proposedAction || card.closure_comment || '',
          status: card.status,
          responsible: card.responsible || 'N/A',
          target_date: formatDateForDisplay(card.targetDate || card.due_date || ''),
          close_date: formatDateForDisplay(card.solutionDate || card.close_date || ''),
        });

        dataRow.height = 80;
        dataRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });

        const tlRow = excelRowIndex - 1;

        // Foto Antes (col 10)
        const beforeUrl = card.image_urls?.[0] || card.image_url;
        if (beforeUrl) {
          const buffer = await fetchImageBuffer(beforeUrl);
          if (buffer) {
            try {
              const imageId = workbook.addImage({ buffer, extension: 'jpeg' });
              worksheet.addImage(imageId, {
                tl: { col: 10, row: tlRow },
                ext: { width: 130, height: 100 },
                editAs: 'oneCell',
              });
            } catch (e) {
              console.error('Error adding before image:', e);
            }
          }
        }

        // Foto Después (col 11)
        const afterUrl = card.after_image_urls?.[0] || card.after_image_url;
        if (afterUrl) {
          const buffer = await fetchImageBuffer(afterUrl);
          if (buffer) {
            try {
              const imageId = workbook.addImage({ buffer, extension: 'jpeg' });
              worksheet.addImage(imageId, {
                tl: { col: 11, row: tlRow },
                ext: { width: 130, height: 100 },
                editAs: 'oneCell',
              });
            } catch (e) {
              console.error('Error adding after image:', e);
            }
          }
        }

        excelRowIndex++;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, `Reporte_5S_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast.success('Reporte exportado correctamente', { id: toastId });
    } catch (err: any) {
      console.error('Error exporting excel:', err);
      toast.error('Error al exportar: ' + (err.message || 'Desconocido'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCardClick = (card: FiveSCard) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleNewCard = () => {
    setSelectedCard(null);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full mx-auto space-y-6 pb-6 md:pb-20 animate-in fade-in duration-500 min-h-screen">
      {/* Header */}
      <HeaderWithFilter
        title="Tarjetas 5S"
        subtitle="Gestión visual de anomalías y mejoras continuas"
      >
        <button
          onClick={handleNewCard}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-sm hover:shadow-md font-bold text-xs uppercase tracking-wide active:scale-95"
        >
          <Plus size={18} />
          <span>Nueva Tarjeta</span>
        </button>
      </HeaderWithFilter>

      {/* View Mode Toggles */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('active')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            viewMode === 'active'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Activas
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            viewMode === 'history'
              ? 'bg-slate-800 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Historial (Cerradas)
        </button>
        <button
          onClick={() => setViewMode('all')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            viewMode === 'all'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Todas
        </button>
      </div>

      {/* Action Bar & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ubicación, artículo, responsable..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none text-slate-900 placeholder-slate-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters Dropdown */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
          <div className="relative min-w-[200px]">
            <select
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm appearance-none outline-none cursor-pointer text-slate-900 font-medium"
              value={filterResponsible}
              onChange={(e) => setFilterResponsible(e.target.value)}
            >
              <option value="">Todos los Responsables</option>
              {personSuggestions.map((p, i) => (
                <option key={i} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          <div className="relative min-w-[180px]">
            <select
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm appearance-none outline-none cursor-pointer text-slate-900 font-medium"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="">Todas las Áreas</option>
              {uniqueLocations.map((l, i) => (
                <option key={i} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {(filterResponsible || filterLocation || searchTerm) && (
            <button
              onClick={() => {
                setFilterResponsible('');
                setFilterLocation('');
                setSearchTerm('');
              }}
              className="p-2.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors shrink-0"
              title="Limpiar Filtros"
            >
              <X size={20} />
            </button>
          )}

          <button
            onClick={() => setShowHistory(true)}
            className="p-2.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
            title="Ver Historial de Cambios"
          >
            <Clock size={20} />
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className={`p-2.5 flex items-center gap-2 rounded-lg transition-all font-bold text-xs uppercase tracking-wider shadow-sm ${
              isExporting
                ? 'bg-slate-100 text-slate-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
            }`}
            title="Exportar a Excel"
          >
            <FileDown size={18} />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading && cards.length === 0 ? (
          // Skeleton loaders
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[340px] animate-pulse"
            >
              <div className="h-1.5 bg-slate-200 w-full"></div>
              <div className="p-4 flex flex-col h-full space-y-3">
                <div className="flex justify-between items-start">
                  <div className="h-5 w-16 bg-slate-200 rounded"></div>
                  <div className="h-4 w-20 bg-slate-200 rounded"></div>
                </div>
                <div className="h-5 w-3/4 bg-slate-200 rounded"></div>
                <div className="h-4 w-full bg-slate-200 rounded"></div>
                <div className="grid grid-cols-2 gap-1 h-28 bg-slate-100 rounded"></div>
                <div className="mt-auto flex justify-between items-center pt-2">
                  <div className="h-6 w-6 rounded-full bg-slate-200"></div>
                  <div className="h-4 w-16 bg-slate-200 rounded"></div>
                </div>
              </div>
            </div>
          ))
        ) : gridCards.length > 0 ? (
          gridCards.map((card) => {
            const beforeImg = card.image_urls?.[0] || card.image_url;
            const afterImg = card.after_image_urls?.[0] || card.after_image_url;

            return (
              <div
                key={card.id}
                className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-auto"
                onClick={() => handleCardClick(card)}
              >
                {/* Status Bar */}
                <div
                  className="h-1.5 w-full transition-all"
                  style={{ backgroundColor: card.statusColor || '#ef4444' }}
                ></div>

                <div className="p-3.5 flex flex-col h-auto">
                  <div className="flex justify-between items-start mb-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors bg-slate-100 text-slate-700 border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100">
                      {card.cardNumber || card.card_number || '?'}
                      {user?.isGlobalAdmin &&
                        companies.find((c) => c.id === card.company_id) && (
                          <span className="ml-1 font-normal opacity-80 capitalize">
                            {companies.find((c) => c.id === card.company_id)?.name}
                          </span>
                        )}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      {formatDateForDisplay(card.date)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="mb-2.5 shrink-0">
                    <h4 className="font-bold text-slate-800 mb-0.5 line-clamp-1 text-sm group-hover:text-blue-600 transition-colors">
                      {card.location || card.area}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed h-[40px]">
                      {card.reason || card.findings}
                    </p>
                  </div>

                  {/* Images - Compact Side-by-Side */}
                  <div className="grid grid-cols-2 gap-0.5 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 mb-2.5 h-28 relative">
                    {beforeImg ? (
                      <div className="relative w-full h-full overflow-hidden">
                        <img
                          src={beforeImg}
                          alt="Antes"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] uppercase font-bold text-center py-0.5 backdrop-blur-sm">
                          Antes
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-300">
                        <Camera size={16} />
                      </div>
                    )}

                    {afterImg ? (
                      <div className="relative w-full h-full overflow-hidden">
                        <img
                          src={afterImg}
                          alt="Después"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute bottom-0 left-0 right-0 bg-emerald-600/80 text-white text-[8px] uppercase font-bold text-center py-0.5 backdrop-blur-sm">
                          Después
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-slate-50 text-slate-200 border-l border-slate-200">
                        {beforeImg && <ArrowRight size={14} className="text-slate-300" />}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-2 pt-2.5 border-t border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 border border-white shadow-sm ring-1 ring-slate-100">
                        {card.responsible ? card.responsible.charAt(0) : '?'}
                      </div>
                      <span className="text-[10px] font-medium text-slate-600 truncate max-w-[80px]">
                        {card.responsible || 'Sin asignar'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full shadow-sm"
                        style={{ backgroundColor: card.statusColor || '#ef4444' }}
                      ></div>
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: card.statusColor || '#ef4444' }}
                      >
                        {card.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-4">
              <Search size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              No se encontraron tarjetas
            </h3>
            <p className="text-slate-500 text-sm">
              Intenta ajustar los filtros de búsqueda o cambia la empresa seleccionada.
            </p>
          </div>
        )}
      </div>

      {/* KPI Dashboard Section (Footer) */}
      {gridCards.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 mt-8">
          {/* Header con botón para modo presentación */}
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <BarIcon size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Indicadores de Gestión</h3>
                <p className="text-sm text-slate-500">
                  Análisis visual de anomalías y mejoras
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsPresentationMode(true)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm shadow-sm hover:shadow active:scale-95"
            >
              <Maximize2 size={16} className="text-slate-600" />
              <span>Vista Presentación (PPT 16:9)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stats Cards Column */}
            <div className="grid grid-cols-2 gap-4 content-start">
              <StatCard
                title="Total Tarjetas"
                value={kpiData.total}
                variant="blue"
                type="light"
              />
              <StatCard
                title="Cumplimiento"
                value={`${kpiData.completionRate}%`}
                variant="green"
                type="light"
              />

              <div className="col-span-2">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-emerald-100 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-1.5 bg-emerald-100 rounded-full text-emerald-600">
                      <CheckCircle size={16} />
                    </div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      PROMEDIO DE CIERRE DE TARJETAS 5S
                    </h4>
                  </div>

                  {/* Chart Circle */}
                  <div className="flex flex-col items-center justify-center relative mb-6">
                    <div className="relative w-40 h-40">
                      <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                        <PieChart>
                          <Pie
                            data={[{ value: 1 }]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={70}
                            startAngle={90}
                            endAngle={-270}
                            fill="#ecfdf5"
                            stroke="none"
                            dataKey="value"
                            isAnimationActive={false}
                          />
                          <Pie
                            data={[
                              { value: parseFloat(String(kpiData.closureStats?.avg || 0)) },
                              {
                                value: Math.max(
                                  0,
                                  parseFloat(String(kpiData.closureStats?.max || 1)) -
                                    parseFloat(String(kpiData.closureStats?.avg || 0))
                                ),
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={70}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="transparent" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                          {kpiData.closureStats?.avg || '0'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          Días Promedio
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Min / Max Footer */}
                  <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg p-2.5 px-4 text-xs">
                    <div className="text-center">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">
                        Más Rápida
                      </span>
                      <span className="text-emerald-600 font-black text-sm">
                        {kpiData.closureStats?.min || '0'} días
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="text-center">
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">
                        Más Lenta
                      </span>
                      <span className="text-rose-600 font-black text-sm">
                        {kpiData.closureStats?.max || '0'} días
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Status Distribution */}
            <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 flex flex-col justify-between">
              <h4 className="text-center text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
                <Activity size={14} className="text-blue-500" /> Distribución por Estado
              </h4>
              <div className="flex-1 min-h-[220px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={kpiData.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {kpiData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        fontSize: '11px',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Column 3: Top Areas */}
            <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 flex flex-col justify-between">
              <h4 className="text-center text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
                <BarIcon size={14} className="text-blue-500" /> Top Áreas con Hallazgos
              </h4>
              <div className="flex-1 min-h-[220px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={kpiData.locationData}
                    layout="vertical"
                    margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Detail/Edit Modal */}
      <FiveSCardModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCard(null);
        }}
        card={selectedCard}
        users={users}
        companies={companies}
        currentUser={user}
        targetCompanyId={targetCompanyId}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
        onZoomImage={(url) => setZoomImage(url)}
      />

      {/* Presentation Mode Modal */}
      <PresentationModal
        isOpen={isPresentationMode}
        onClose={() => setIsPresentationMode(false)}
        kpiData={kpiData}
      />

      {/* Audit History Modal */}
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />

      {/* Lightbox / Zoom */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-200"
          onClick={() => setZoomImage(null)}
        >
          <button
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            onClick={() => setZoomImage(null)}
          >
            <X size={28} />
          </button>
          <img
            src={zoomImage}
            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-300"
            alt="Zoom"
          />
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
            <p className="text-white/80 text-xs font-medium">Click fuera para cerrar</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiveSCardsPage;
