import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useServices } from '../../app/ServicesContext';
import type { PunchType } from '../../domain/model/timeEntry';
import { formatInMadrid, toUtcInstant } from '../../domain/time/zone';
import { useSessionUser } from '../auth/AuthContext';
import { useSimulatedClock } from '../features/clock/SimulatedClock';
import { useAsync } from '../hooks/useAsync';
import { useLocale } from '../hooks/useLocale';
import { useNow } from '../hooks/useNow';
import { Badge, Card, PageHeader } from '../components/ui';

const ACTION_STYLE: Record<PunchType, string> = {
  'clock-in': 'bg-teal-700 text-white',
  'clock-out': 'bg-slate-800 text-white',
  'break-start': 'bg-amber-500 text-slate-900',
  'break-end': 'bg-teal-600 text-white',
};
const ORDER: PunchType[] = ['clock-in', 'break-start', 'break-end', 'clock-out'];

/**
 * Pantalla de fichaje — FASE 1: SIMULACIÓN.
 * Muestra el flujo previsto, pero no envía ni guarda nada. Todos los textos
 * lo indican para que nadie lo confunda con un registro horario válido.
 */
export function ClockPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, serverClock } = useServices();
  const user = useSessionUser();
  const now = useNow();
  const sim = useSimulatedClock();
  const [eventId, setEventId] = useState<string>('');
  const [pending, setPending] = useState<PunchType | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const events = useAsync(async () => {
    const [assignments, all] = await Promise.all([
      data.listAssignmentsForEmployee(user.employeeId ?? ''),
      data.listEvents(),
    ]);
    return all.filter(
      (e) =>
        assignments.some((a) => a.eventId === e.id) &&
        e.status !== 'cancelled' &&
        e.status !== 'finished',
    );
  }, [data, user.employeeId]);

  const reading = useAsync(() => serverClock.read(), [serverClock]);

  const confirm = () => {
    if (!pending) return;
    const r = sim.simulate(pending, eventId || null);
    setLastMessage(
      r.ok
        ? t('clock.simulatedDone', { action: t(`clock.actions.${pending}`) })
        : t('clock.invalidTransition'),
    );
    setPending(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('clock.title')} />

      <div
        role="alert"
        data-testid="simulation-notice"
        className="rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50 p-4 text-sm text-amber-950"
      >
        <p className="font-bold">{t('clock.simulationTitle')}</p>
        <p>{t('clock.simulationBody')}</p>
      </div>

      <Card className="text-center">
        <p className="text-5xl font-black text-slate-900 tabular-nums" aria-live="off">
          {formatInMadrid(toUtcInstant(now), locale, 'time')}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {reading.status === 'success' && reading.data.source === 'server'
            ? t('clock.timeSourceServer')
            : t('clock.timeSourceDevice')}
        </p>
        <p className="mt-3 text-lg">
          {t('clock.currentStatus')}:{' '}
          <strong data-testid="clock-status">{t(`clock.status.${sim.status}`)}</strong>{' '}
          <Badge tone="warning">{t('clock.simulationShort')}</Badge>
        </p>
      </Card>

      <Card>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          {t('clock.eventLabel')}
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-base"
            disabled={sim.status !== 'off'}
          >
            <option value="">{t('clock.noEvent')}</option>
            {events.status === 'success' &&
              events.data.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
        </label>
        <p className="mt-1 text-xs text-slate-500">{t('clock.noEventHelp')}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {ORDER.map((type) => {
          const enabled = sim.allowed.includes(type);
          return (
            <button
              key={type}
              type="button"
              disabled={!enabled}
              onClick={() => setPending(type)}
              className={`min-h-20 rounded-2xl text-lg font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-30 ${ACTION_STYLE[type]}`}
            >
              {t(`clock.actions.${type}`)}
              <span className="block text-xs font-medium opacity-90">
                {t('clock.simulationShort')}
              </span>
            </button>
          );
        })}
      </div>

      {lastMessage && (
        <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm">
          {lastMessage}
        </p>
      )}

      {sim.punches.length > 0 && (
        <Card>
          <h2 className="mb-2 font-bold">{t('clock.simulatedLog')}</h2>
          <ol className="text-sm">
            {sim.punches.map((p, i) => (
              <li key={i} className="flex justify-between border-b border-slate-100 py-1">
                <span>{t(`clock.actions.${p.type}`)}</span>
                <span className="text-slate-600 tabular-nums">
                  {formatInMadrid(p.deviceAt, locale, 'time')} ({t('clock.deviceTime')})
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={sim.reset}
            className="mt-2 text-sm font-semibold text-teal-700"
          >
            {t('clock.resetSimulation')}
          </button>
        </Card>
      )}

      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="confirm-title" className="text-lg font-bold">
              {t('clock.confirmTitle', { action: t(`clock.actions.${pending}`) })}
            </h2>
            <p className="mt-2 text-sm text-slate-700">{t('clock.confirmBody')}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="min-h-12 flex-1 rounded-xl border border-slate-300 font-semibold"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirm}
                className="min-h-12 flex-1 rounded-xl bg-teal-700 font-bold text-white"
              >
                {t('clock.confirmSimulate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
