import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useServices } from '../../app/ServicesContext';
import { buildWorkSessions } from '../../domain/clock/workSessions';
import { formatInMadrid, toUtcInstant } from '../../domain/time/zone';
import { useSessionUser } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useLocale } from '../hooks/useLocale';
import {
  Badge,
  Card,
  DemoTag,
  Duration,
  EmptyState,
  ErrorState,
  PageHeader,
} from '../components/ui';

export function HistoryPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data } = useServices();
  const user = useSessionUser();

  const state = useAsync(async () => {
    const [punches, events, corrections] = await Promise.all([
      data.listPunches(user.employeeId ?? ''),
      data.listEvents(),
      data.listCorrections(user.employeeId ?? ''),
    ]);
    const sessions = buildWorkSessions(punches, { now: toUtcInstant(new Date()) }).reverse();
    return { sessions, events, corrections };
  }, [data, user.employeeId]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('history.title')}
        subtitle={t('history.subtitle')}
        actions={<DemoTag />}
      />
      {state.status === 'error' && <ErrorState error={state.error} />}
      {state.status === 'success' && state.data.sessions.length === 0 && (
        <EmptyState>{t('history.empty')}</EmptyState>
      )}
      {state.status === 'success' && (
        <ul className="flex flex-col gap-3">
          {state.data.sessions.map((s) => {
            const event = state.data.events.find((e) => e.id === s.eventId);
            return (
              <Card as="li" key={s.startAt} data-testid="history-session">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{formatInMadrid(s.startAt, locale, 'weekday-date')}</p>
                    <p className="text-sm text-slate-600 tabular-nums">
                      {formatInMadrid(s.startAt, locale, 'time')} –{' '}
                      {s.endAt ? formatInMadrid(s.endAt, locale, 'time') : '—'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {event ? event.name : t('history.noEvent')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      <Duration minutes={s.netMinutes} />
                    </p>
                    {s.breakMinutes > 0 && (
                      <p className="text-xs text-slate-500">
                        {t('history.breaks')}: <Duration minutes={s.breakMinutes} />
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.hasCorrections && <Badge tone="info">{t('history.corrected')}</Badge>}
                  {s.anomalies.map((a) => (
                    <Badge key={a} tone="danger">
                      {t(`history.anomalies.${a}`)}
                    </Badge>
                  ))}
                </div>
                {s.anomalies.length > 0 && (
                  <Link
                    to="/app/corrections/new"
                    className="mt-2 inline-block text-sm font-semibold text-teal-700"
                  >
                    {t('history.requestCorrection')}
                  </Link>
                )}
              </Card>
            );
          })}
        </ul>
      )}
      {state.status === 'success' && state.data.corrections.length > 0 && (
        <Card>
          <h2 className="mb-2 font-bold">{t('history.myCorrections')}</h2>
          <ul className="text-sm">
            {state.data.corrections.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5"
              >
                <span>
                  {t(`correction.kinds.${c.kind}`)} · {t(`clock.actions.${c.punchType}`)}
                  {c.proposedAt ? ` · ${formatInMadrid(c.proposedAt, locale)}` : ''}
                </span>
                <Badge
                  tone={
                    c.status === 'pending'
                      ? 'warning'
                      : c.status === 'approved'
                        ? 'success'
                        : 'neutral'
                  }
                >
                  {t(`correction.status.${c.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
