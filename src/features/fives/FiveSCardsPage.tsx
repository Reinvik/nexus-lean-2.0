import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import HeaderWithFilter from '../../components/common/HeaderWithFilter';
import StatCard from '../../components/common/StatCard';
import FiveSCardModal from './components/FiveSCardModal';
import PresentationModal from './components/PresentationModal';
import HistoryModal from './components/HistoryModal';
import { ImageLightbox } from '../../components/common/ImageLightbox';
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
  CheckCircle2,
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
  Filter,
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
  LabelList,
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

  // Carga paralela ultrarrápida
  const fetchCards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let cardsQuery = supabase
        .from('five_s_cards')
        .select('*')
        .order('created_at', { ascending: false });

      let profilesQuery = supabase
        .from('profiles')
        .select('id, full_name, email, role, company_id');

      if (!user.isGlobalAdmin) {
        const comp = user.company_id || user.companyId;
        if (comp) {
          cardsQuery = cardsQuery.eq('company_id', comp);
          profilesQuery = profilesQuery.eq('company_id', comp);
        }
      } else if (globalFilterCompanyId && globalFilterCompanyId !== 'all') {
        cardsQuery = cardsQuery.eq('company_id', globalFilterCompanyId);
        profilesQuery = profilesQuery.eq('company_id', globalFilterCompanyId);
      }

      // Ejecutar ambas consultas en paralelo en un único viaje de red
      const [cardsRes, profRes] = await Promise.all([cardsQuery, profilesQuery]);
      if (cardsRes.error) throw cardsRes.error;

      const profileMap = new Map<string, string>();
      const profList = (profRes.data || []) as Profile[];
      profList.forEach((p: any) => {
        if (p.id) {
          profileMap.set(p.id, p.full_name?.trim() || p.email?.trim() || '');
        }
      });
      setUsers(profList);

      const mappedCards: FiveSCard[] = (cardsRes.data || []).map((c: any) => {
        let color = '#ef4444';
        if (c.status === 'En Proceso' || c.status === 'En Progreso') color = '#f59e0b';
        if (c.status === 'Cerrado') color = '#10b981';

        const responsibleName =
          c.responsible?.trim() || (c.assigned_to ? profileMap.get(c.assigned_to) : '') || '';

        return {
          ...c,
          responsible: responsibleName,
          assigned_to: c.assigned_to || null,
          date: c.date || c.card_date || c.created_at,
          card_date: c.card_date || c.date || c.created_at,
          cardNumber: c.card_number || c.cardNumber || '?',
          card_number: c.card_number || c.cardNumber || '?',
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

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Unique Lists for Filters
  const personSuggestions = useMemo(() => {
    const list = cards
      .map((c) => c.responsible)
      .filter((n): n is string => Boolean(n && n.trim().length > 0));
    const userNames = users
      .map((u) => (u as any).name || u.full_name || u.email || '')
    return [...new Set([...list, ...userNames])].sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
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

  // Smooth scroll helper when filtering from KPI charts
  const scrollToGridIfOffscreen = () => {
    const gridEl = document.getElementById('cards-grid-section');
    if (gridEl) {
      const rect = gridEl.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom < 150) {
        gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Immediate Status Filter Toggle (from Pie chart or Legend)
  const handleStatusFilterToggle = (statusName: string) => {
    let nextStatus = statusName;
    if (
      statusFilter === statusName ||
      (statusName === 'En Progreso' && (statusFilter === 'En Proceso' || statusFilter === 'En Progreso'))
    ) {
      nextStatus = 'Todos';
    }

    setStatusFilter(nextStatus);

    // If user clicked 'Cerrado' but viewMode was 'active', reset to 'all' so cards are visible
    if (nextStatus === 'Cerrado' && viewMode === 'active') {
      setViewMode('all');
    }
    // If user clicked 'Abierto' or 'En Progreso' but viewMode was 'history', reset to 'all'
    if ((nextStatus === 'Abierto' || nextStatus === 'En Progreso') && viewMode === 'history') {
      setViewMode('all');
    }

    if (nextStatus !== 'Todos') {
      toast.success(`Filtrando por estado: ${nextStatus}`, { id: 'status-filter', duration: 1800 });
    }

    scrollToGridIfOffscreen();
  };

  // Immediate Location/Area Filter Toggle (from Bar chart or Area labels)
  const handleLocationFilterToggle = (locationName: string) => {
    const nextLoc = filterLocation === locationName ? '' : locationName;
    setFilterLocation(nextLoc);

    if (nextLoc) {
      toast.success(`Filtrando por área: ${nextLoc}`, { id: 'loc-filter', duration: 1800 });
    }

    scrollToGridIfOffscreen();
  };

  // Base cards for Status Distribution (retains all 3 statuses clickable)
  const statusBaseCards = useMemo(() => {
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

      return locationMatch && responsibleMatch && textMatch;
    });
  }, [visibleCards, searchTerm, filterLocation, filterResponsible]);

  // Base cards for Top Areas (retains top areas clickable)
  const locationBaseCards = useMemo(() => {
    return visibleCards.filter((card) => {
      const searchLower = searchTerm.toLowerCase();
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

      return responsibleMatch && textMatch && statusMatch;
    });
  }, [visibleCards, searchTerm, filterResponsible, statusFilter]);

  // KPI Calculations
  const kpiData = useMemo(() => {
    const total = gridCards.length;

    // Status breakdown from statusBaseCards
    const statusCounts = statusBaseCards.reduce((acc: Record<string, number>, curr) => {
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
    ];

    // Locations Top 5 from locationBaseCards
    const locationCounts = locationBaseCards.reduce((acc: Record<string, number>, curr) => {
      const loc = curr.location || curr.area || 'General';
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});

    const locationData = Object.entries(locationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // If filterLocation is active and not already in top 5, add it
    if (filterLocation && !locationData.some((l) => l.name === filterLocation)) {
      locationData.push({
        name: filterLocation,
        count: locationCounts[filterLocation] || 0,
      });
    }

    if (total === 0) {
      return {
        statusData,
        locationData,
        weeklyTrend: [],
        completionRate: 0,
        closed: 0,
        pending: 0,
        inProcess: 0,
        total: 0,
        closureStats: { avg: 0, min: 0, max: 0 },
      };
    }

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

    const finalClosed = gridCards.filter((c) => c.status === 'Cerrado').length;
    const finalOpen = gridCards.filter((c) => c.status === 'Abierto').length;
    const finalInProcess = gridCards.filter(
      (c) => c.status === 'En Proceso' || c.status === 'En Progreso'
    ).length;

    return {
      statusData,
      locationData,
      weeklyTrend,
      completionRate: Math.round((finalClosed / total) * 100),
      closed: finalClosed,
      pending: finalOpen,
      inProcess: finalInProcess,
      total,
      closureStats: {
        avg: avgDays,
        min: minDays,
        max: maxDays,
      },
    };
  }, [gridCards, statusBaseCards, locationBaseCards, filterLocation]);

  // Save Card Handler
  const handleSaveCard = async (cardData: Partial<FiveSCard>): Promise<boolean> => {
    try {
      const assignedComp =
        user?.isGlobalAdmin && globalFilterCompanyId && globalFilterCompanyId !== 'all'
          ? globalFilterCompanyId
          : user?.company_id || user?.companyId || targetCompanyId;

      // Find user UUID if not explicitly set
      const assignedUser = users.find(
        (u) =>
          u.id === cardData.assigned_to ||
          (u.full_name && u.full_name.trim().toLowerCase() === cardData.responsible?.trim().toLowerCase()) ||
          ((u as any).name && (u as any).name.trim().toLowerCase() === cardData.responsible?.trim().toLowerCase()) ||
          (u.email && u.email.trim().toLowerCase() === cardData.responsible?.trim().toLowerCase())
      );
      const finalAssignedTo = cardData.assigned_to || assignedUser?.id || null;
      const finalResponsible = cardData.responsible || assignedUser?.full_name || (assignedUser as any)?.name || assignedUser?.email || null;
      const finalDate = cardData.date || cardData.card_date || new Date().toISOString().split('T')[0];

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
            assigned_to: finalAssignedTo,
            responsible: finalResponsible,
            due_date: cardData.targetDate || cardData.due_date,
            close_date: cardData.solutionDate || cardData.close_date,
            closure_comment: cardData.proposedAction || cardData.closure_comment,
            image_urls: cardData.image_urls || [],
            image_url: cardData.image_urls?.[0] || null,
            after_image_urls: cardData.after_image_urls || [],
            after_image_url: cardData.after_image_urls?.[0] || null,
            date: finalDate,
            card_date: finalDate,
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
          assigned_to: finalAssignedTo,
          responsible: finalResponsible,
          due_date: cardData.targetDate || cardData.due_date,
          close_date: cardData.solutionDate || cardData.close_date,
          closure_comment: cardData.proposedAction || cardData.closure_comment,
          image_urls: cardData.image_urls || [],
          image_url: cardData.image_urls?.[0] || null,
          after_image_urls: cardData.after_image_urls || [],
          after_image_url: cardData.after_image_urls?.[0] || null,
          date: finalDate,
          card_date: finalDate,
          created_by: user?.id,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      await fetchCards();
      return true;
    } catch (err: any) {
      console.error('Error in handleSaveCard:', err);
      toast.error('Error al guardar tarjeta: ' + (err.message || 'Error desconocido'));
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
          className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-2 rounded-lg transition-all shadow-sm font-semibold text-xs active:scale-[0.98]"
        >
          <Plus size={14} />
          <span>Nueva Tarjeta</span>
        </button>
      </HeaderWithFilter>

      {/* View Mode Toggles */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('active')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'active'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Activas
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'history'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Historial (Cerradas)
        </button>
        <button
          onClick={() => setViewMode('all')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'all'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Todas
        </button>
      </div>

      {/* KPI Dashboard Section (Arriba de las Tarjetas) */}
      {(cards.length > 0 || visibleCards.length > 0) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 transition-all">
          {/* Header con botón para modo presentación */}
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
                <BarIcon size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Indicadores de Gestión 5S</span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    {kpiData.total} {kpiData.total === 1 ? 'tarjeta' : 'tarjetas'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Haz clic en cualquier estado o área para filtrar interactivamente las tarjetas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(statusFilter !== 'Todos' || filterLocation) && (
                <button
                  onClick={() => {
                    setStatusFilter('Todos');
                    setFilterLocation('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors active:scale-95"
                >
                  <X size={13} />
                  <span>Restablecer Filtros</span>
                </button>
              )}

              <button
                onClick={() => setIsPresentationMode(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
                title="Abrir vista de presentación en pantalla completa"
              >
                <Maximize2 size={14} />
                <span>Vista Presentación (PPT 16:9)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna 1: Resumen General y Promedio de Cierre */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Tarjetas
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      {kpiData.total}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      en planta
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Cumplimiento
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                      {kpiData.completionRate}%
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700">
                      resuelto
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-xs border border-emerald-100/90 relative overflow-hidden flex-1 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-emerald-100 rounded-full text-emerald-600">
                    <CheckCircle2 size={14} />
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Promedio de Cierre de Tarjetas 5S
                  </h4>
                </div>

                {/* Circular Gauge */}
                <div className="flex flex-col items-center justify-center relative my-2">
                  <div className="relative w-36 h-36">
                    <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                      <PieChart>
                        <Pie
                          data={[{ value: 1 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={64}
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
                          innerRadius={52}
                          outerRadius={64}
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
                      <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">
                        {kpiData.closureStats?.avg || '0'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Días Promedio
                      </span>
                    </div>
                  </div>
                </div>

                {/* Min / Max Footer */}
                <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg p-2 px-3 text-xs">
                  <div className="text-center">
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">
                      Más Rápida
                    </span>
                    <span className="text-emerald-600 font-black text-xs sm:text-sm">
                      {kpiData.closureStats?.min || '0'} días
                    </span>
                  </div>
                  <div className="h-5 w-px bg-slate-200"></div>
                  <div className="text-center">
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">
                      Más Lenta
                    </span>
                    <span className="text-rose-600 font-black text-xs sm:text-sm">
                      {kpiData.closureStats?.max || '0'} días
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 2: Distribución por Estado (Doughnut central + 3 grandes botones Cerrado, En Progreso, Abierto) */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={15} className="text-blue-600" /> Distribución por Estado
                </h4>
                {statusFilter !== 'Todos' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusFilterToggle(statusFilter);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white hover:bg-rose-600 transition-colors shadow-xs"
                    title="Quitar filtro de estado"
                  >
                    <span>Filtro: {statusFilter}</span>
                    <X size={10} />
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Clic para filtrar</span>
                )}
              </div>

              {/* Gráfico Donut con Métrica Central */}
              <div className="relative h-44 flex items-center justify-center my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={kpiData.statusData.filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={74}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="#ffffff"
                      strokeWidth={2}
                      cursor="pointer"
                      onClick={(entry: any) => {
                        if (entry && entry.name) {
                          handleStatusFilterToggle(entry.name);
                        }
                      }}
                    >
                      {kpiData.statusData.filter((d) => d.value > 0).map((entry, index) => {
                        const isSelected =
                          (entry.name === 'En Progreso' && (statusFilter === 'En Progreso' || statusFilter === 'En Proceso')) ||
                          statusFilter === entry.name;
                        const isAnyStatusActive = statusFilter !== 'Todos';

                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            opacity={isAnyStatusActive && !isSelected ? 0.35 : 1}
                            stroke={isSelected ? '#0f172a' : '#ffffff'}
                            strokeWidth={isSelected ? 3 : 2}
                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                          />
                        );
                      })}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any, name: any) => [
                        `${value} tarjetas (${kpiData.total > 0 ? Math.round((Number(value) / kpiData.total) * 100) : 0}%)`,
                        `${name} (clic para filtrar)`,
                      ]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '10px',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '11px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                      }}
                      itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Número Total en el Centro del Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    Total
                  </span>
                  <span className="text-3xl font-black text-slate-900 tracking-tight my-0.5">
                    {kpiData.total}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider leading-none">
                    Tarjetas
                  </span>
                </div>
              </div>

              {/* 3 Grandes Tarjetas de Estado Interactivas: Cerrado, En Progreso, Abierto */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {/* Cerrado */}
                {(() => {
                  const isSelected = statusFilter === 'Cerrado';
                  const count = kpiData.closed;
                  return (
                    <button
                      type="button"
                      onClick={() => handleStatusFilterToggle('Cerrado')}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer group min-w-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500 ring-offset-1'
                          : 'bg-emerald-50/70 border-emerald-200/90 text-slate-800 hover:bg-emerald-100 hover:border-emerald-300 shadow-xs'
                      }`}
                      title="Clic para filtrar tarjetas Cerradas"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                        <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${
                          isSelected ? 'text-white' : 'text-emerald-900'
                        }`}>
                          Cerrado
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between gap-1 min-w-0">
                        <span className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${
                          isSelected ? 'text-white' : 'text-emerald-700'
                        }`}>
                          {count}
                        </span>
                        <span className={`text-[10px] font-medium truncate ${
                          isSelected ? 'text-emerald-100' : 'text-slate-500'
                        }`}>
                          resueltas
                        </span>
                      </div>
                    </button>
                  );
                })()}

                {/* En Progreso */}
                {(() => {
                  const isSelected = statusFilter === 'En Progreso' || statusFilter === 'En Proceso';
                  const count = kpiData.inProcess;
                  return (
                    <button
                      type="button"
                      onClick={() => handleStatusFilterToggle('En Progreso')}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer group min-w-0 ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400 ring-offset-1'
                          : 'bg-amber-50/70 border-amber-200/90 text-slate-800 hover:bg-amber-100 hover:border-amber-300 shadow-xs'
                      }`}
                      title="Clic para filtrar tarjetas En Progreso"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                        <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${
                          isSelected ? 'text-white' : 'text-amber-900'
                        }`}>
                          En Progreso
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between gap-1 min-w-0">
                        <span className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${
                          isSelected ? 'text-white' : 'text-amber-700'
                        }`}>
                          {count}
                        </span>
                        <span className={`text-[10px] font-medium truncate ${
                          isSelected ? 'text-amber-100' : 'text-slate-500'
                        }`}>
                          en gestión
                        </span>
                      </div>
                    </button>
                  );
                })()}

                {/* Abierto */}
                {(() => {
                  const isSelected = statusFilter === 'Abierto';
                  const count = kpiData.pending;
                  return (
                    <button
                      type="button"
                      onClick={() => handleStatusFilterToggle('Abierto')}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer group min-w-0 ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-500 ring-offset-1'
                          : 'bg-rose-50/70 border-rose-200/90 text-slate-800 hover:bg-rose-100 hover:border-rose-300 shadow-xs'
                      }`}
                      title="Clic para filtrar tarjetas Abiertas"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-white' : 'bg-rose-500'}`} />
                        <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${
                          isSelected ? 'text-white' : 'text-rose-900'
                        }`}>
                          Abierto
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline justify-between gap-1 min-w-0">
                        <span className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${
                          isSelected ? 'text-white' : 'text-rose-700'
                        }`}>
                          {count}
                        </span>
                        <span className={`text-[10px] font-medium truncate ${
                          isSelected ? 'text-rose-100' : 'text-slate-500'
                        }`}>
                          pendientes
                        </span>
                      </div>
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Columna 3: Top Áreas con Hallazgos */}
            <div className="bg-slate-50/50 rounded-xl p-4 sm:p-5 border border-slate-200/80 flex flex-col justify-between transition-all hover:border-slate-300">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <BarIcon size={15} className="text-blue-600" /> Top Áreas con Hallazgos
                </h4>
                {filterLocation ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLocationFilterToggle(filterLocation);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white hover:bg-rose-600 transition-colors shadow-xs"
                    title="Quitar filtro de área"
                  >
                    <span>Filtro: {filterLocation}</span>
                    <X size={10} />
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Clic para filtrar</span>
                )}
              </div>

              <div className="flex-1 min-h-[220px] relative">
                {kpiData.locationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={kpiData.locationData}
                      layout="vertical"
                      margin={{ top: 8, right: 30, left: 10, bottom: 8 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          const areaName = state.activePayload[0].payload.name;
                          handleLocationFilterToggle(areaName);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide domain={[0, 'dataMax + 2']} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={(props: any) => {
                          const { x, y, payload } = props;
                          const isSelected = filterLocation === payload.value;
                          return (
                            <g
                              transform={`translate(${x},${y})`}
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLocationFilterToggle(payload.value);
                              }}
                            >
                              <title>{`Filtrar por ${payload.value}`}</title>
                              <text
                                x={0}
                                y={0}
                                dy={4}
                                textAnchor="end"
                                fill={isSelected ? '#1d4ed8' : '#334155'}
                                fontSize={11}
                                fontWeight={isSelected ? 'bold' : '600'}
                                className="hover:underline transition-colors"
                              >
                                {payload.value.length > 15
                                  ? `${payload.value.substring(0, 13)}…`
                                  : payload.value}
                              </text>
                            </g>
                          );
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value: any, name: any, item: any) => [
                          `${value} hallazgos`,
                          `${item?.payload?.name || name} (clic para filtrar)`,
                        ]}
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          fontSize: '11px',
                        }}
                      />
                      <Bar
                        dataKey="count"
                        radius={[0, 6, 6, 0]}
                        barSize={20}
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.name) {
                            handleLocationFilterToggle(entry.name);
                          }
                        }}
                      >
                        <LabelList
                          dataKey="count"
                          position="right"
                          fill="#1e293b"
                          fontSize={11}
                          fontWeight="bold"
                          offset={8}
                        />
                        {kpiData.locationData.map((entry, index) => {
                          const isSelected = filterLocation === entry.name;
                          const isAnySelected = Boolean(filterLocation);
                          return (
                            <Cell
                              key={`bar-${index}`}
                              fill={isSelected ? '#1d4ed8' : '#3b82f6'}
                              opacity={isAnySelected && !isSelected ? 0.35 : 1}
                              className="cursor-pointer transition-all duration-200"
                              style={{ cursor: 'pointer' }}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    Sin áreas registradas
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

          {(filterResponsible || filterLocation || searchTerm || statusFilter !== 'Todos') && (
            <button
              onClick={() => {
                setFilterResponsible('');
                setFilterLocation('');
                setSearchTerm('');
                setStatusFilter('Todos');
              }}
              className="p-2.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
              title="Limpiar Todos los Filtros"
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
            className={`px-3.5 py-2 inline-flex items-center gap-1.5 rounded-lg transition-all font-semibold text-xs shadow-sm ${
              isExporting
                ? 'bg-slate-100 text-slate-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-[0.98]'
            }`}
            title="Exportar a Excel"
          >
            <FileDown size={15} />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Active Filters Bar */}
      {(statusFilter !== 'Todos' || filterLocation || filterResponsible || searchTerm) && (
        <div className="flex flex-wrap items-center gap-2 bg-blue-50/80 border border-blue-200/90 rounded-xl px-4 py-2.5 text-xs text-slate-700 animate-in fade-in duration-200 shadow-xs">
          <span className="font-bold text-blue-900 flex items-center gap-1.5 mr-1">
            <Filter size={14} className="text-blue-600" /> Filtros aplicados:
          </span>
          {statusFilter !== 'Todos' && (
            <button
              onClick={() => setStatusFilter('Todos')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-white text-slate-800 border border-slate-300 hover:border-rose-400 hover:text-rose-600 transition-colors shadow-xs"
              title="Quitar filtro de estado"
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{
                  backgroundColor:
                    statusFilter === 'Cerrado'
                      ? '#10b981'
                      : statusFilter === 'Abierto'
                      ? '#ef4444'
                      : '#f59e0b',
                }}
              />
              <span>Estado: {statusFilter}</span>
              <X size={12} className="text-slate-400 hover:text-rose-500" />
            </button>
          )}
          {filterLocation && (
            <button
              onClick={() => setFilterLocation('')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-white text-slate-800 border border-slate-300 hover:border-rose-400 hover:text-rose-600 transition-colors shadow-xs"
              title="Quitar filtro de área"
            >
              <MapPin size={12} className="text-blue-500" />
              <span>Área: {filterLocation}</span>
              <X size={12} className="text-slate-400 hover:text-rose-500" />
            </button>
          )}
          {filterResponsible && (
            <button
              onClick={() => setFilterResponsible('')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-white text-slate-800 border border-slate-300 hover:border-rose-400 hover:text-rose-600 transition-colors shadow-xs"
              title="Quitar filtro de responsable"
            >
              <User size={12} className="text-blue-500" />
              <span>Resp: {filterResponsible}</span>
              <X size={12} className="text-slate-400 hover:text-rose-500" />
            </button>
          )}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-white text-slate-800 border border-slate-300 hover:border-rose-400 hover:text-rose-600 transition-colors shadow-xs"
              title="Quitar búsqueda"
            >
              <Search size={12} className="text-blue-500" />
              <span>&quot;{searchTerm}&quot;</span>
              <X size={12} className="text-slate-400 hover:text-rose-500" />
            </button>
          )}
          <button
            onClick={() => {
              setStatusFilter('Todos');
              setFilterLocation('');
              setFilterResponsible('');
              setSearchTerm('');
            }}
            className="ml-auto text-blue-700 hover:text-rose-600 font-bold underline text-[11px] transition-colors"
          >
            Limpiar todos
          </button>
        </div>
      )}

      {/* Cards Grid */}
      <div id="cards-grid-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 scroll-mt-20">
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
                          loading="lazy"
                          decoding="async"
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
                          loading="lazy"
                          decoding="async"
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
      <ImageLightbox
        imageUrl={zoomImage}
        onClose={() => setZoomImage(null)}
        altText="Evidencia fotográfica 5S"
      />
    </div>
  );
};

export default FiveSCardsPage;
