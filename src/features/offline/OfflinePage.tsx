import React, { useState, useEffect } from 'react';
import { db, type LocalFiveSCard, type LocalAudit } from '../../lib/db';
import { fiveSService } from '../fives/services/fiveSService';
import { auditService } from '../audits/services/auditService';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { Wifi, WifiOff, UploadCloud, Trash2, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export const OfflinePage: React.FC = () => {
  const [cards, setCards] = useState<LocalFiveSCard[]>([]);
  const [audits, setAudits] = useState<LocalAudit[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineData = async () => {
    try {
      const c = await db.cards.toArray();
      const a = await db.audits.toArray();
      setCards(c);
      setAudits(a);
    } catch (err) {
      console.error('Error loading Dexie offline data:', err);
    }
  };

  useEffect(() => {
    loadOfflineData();
  }, []);

  const handleSyncAll = async () => {
    if (!navigator.onLine) {
      toast.error('No hay conexión a internet para sincronizar.');
      return;
    }

    if (cards.length === 0 && audits.length === 0) {
      toast('No hay registros pendientes de sincronizar.', { icon: 'ℹ️' });
      return;
    }

    setIsSyncing(true);
    let syncedCards = 0;
    let syncedAudits = 0;

    try {
      // 1. Sync Cards
      for (const card of cards) {
        const file = card.rawFiles?.imageBefore as File | undefined;
        const res = await fiveSService.createCard(
          {
            company_id: card.company_id,
            area: card.area,
            description: card.description,
            findings: card.findings,
            priority: card.priority,
            category: card.category,
            status: 'Abierto',
            assigned_to: card.assigned_to,
            due_date: card.due_date,
          },
          file || null
        );

        if (res.success) {
          await db.cards.delete(card.tempId);
          syncedCards++;
        }
      }

      // 2. Sync Audits
      for (const audit of audits) {
        const entries = audit.entries || [];
        const res = await auditService.createAudit(
          {
            company_id: audit.company_id,
            title: audit.title || null,
            area: audit.area,
            auditor: audit.auditor,
            audit_date: audit.audit_date,
            total_score: audit.total_score,
            status: 'Realizada',
          },
          entries.map((e) => ({
            section: e.section as any,
            question: e.question,
            score: e.score,
            comment: e.comment,
          }))
        );

        if (res.success) {
          await db.audits.delete(audit.tempId);
          syncedAudits++;
        }
      }

      toast.success(`Sincronización completa: ${syncedCards} tarjetas y ${syncedAudits} auditorías.`);
      await loadOfflineData();
    } catch (err: any) {
      toast.error(err?.message || 'Error durante la sincronización');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCard = async (tempId: string) => {
    if (window.confirm('¿Eliminar este registro local sin sincronizar?')) {
      await db.cards.delete(tempId);
      setCards((prev) => prev.filter((c) => c.tempId !== tempId));
      toast.success('Registro local eliminado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans flex items-center gap-2.5">
            {isOnline ? (
              <Wifi className="text-emerald-400" size={28} />
            ) : (
              <WifiOff className="text-amber-400" size={28} />
            )}
            <span>Centro de Sincronización Offline</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administra los registros levantados en zonas sin cobertura o conexión a internet.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleSyncAll}
          isLoading={isSyncing}
          disabled={!isOnline || (cards.length === 0 && audits.length === 0)}
          leftIcon={<UploadCloud size={16} />}
        >
          Sincronizar a la Nube
        </Button>
      </div>

      {/* Connection State Banner */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between ${
          isOnline
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}
      >
        <div className="flex items-center gap-3">
          {isOnline ? <CheckCircle2 size={20} /> : <WifiOff size={20} />}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">
              {isOnline ? 'Conexión Restablecida' : 'Dispositivo Desconectado (Offline)'}
            </p>
            <p className="text-xs opacity-80">
              {isOnline
                ? 'Puedes subir todos tus registros pendientes a Supabase con un solo clic.'
                : 'Todas las tarjetas y auditorías se guardan automáticamente en tu almacenamiento local (IndexedDB).'}
            </p>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={loadOfflineData} leftIcon={<RefreshCw size={14} />}>
          Recargar Cola
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Tarjetas 5S Pendientes"
          value={cards.length}
          subtitle="En memoria local"
          icon={Clock}
          accentColor="amber"
        />
        <StatCard
          title="Auditorías Pendientes"
          value={audits.length}
          subtitle="Listas para enviar"
          icon={UploadCloud}
          accentColor="cyan"
        />
      </div>

      {/* Pending Items List */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white font-sans">
          Registros en Cola Local ({cards.length + audits.length})
        </h3>

        {cards.length > 0 ? (
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.tempId}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="amber">Tarjeta 5S Offline</Badge>
                    <Badge variant="cyan">{card.category}</Badge>
                    <span className="text-xs text-slate-400">{card.area}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">{card.description}</h4>
                </div>

                <button
                  onClick={() => handleClearCard(card.tempId)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                  title="Eliminar de la cola"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
            <p>¡No tienes registros pendientes! Todos tus datos están sincronizados con la nube.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflinePage;
