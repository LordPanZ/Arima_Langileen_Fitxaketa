import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useServices } from '../../app/ServicesContext';
import { buildWorkSessions } from '../../domain/clock/workSessions';
import { formatInMadrid, madridLocalDate, toUtcInstant } from '../../domain/time/zone';
import { useSessionUser } from '../auth/AuthContext';
import { useSimulatedClock } from '../features/clock/SimulatedClock';
import { useAsync } from '../hooks/useAsync';
import { useLocale } from '../hooks/useLocale';
import { Badge, Card, DemoTag, Duration, ErrorState, PageHeader, Stat } from '../components/ui';

export function WorkerDashboardPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data } = useServices();
  const user = useSessionUser();
  const sim = useSimulatedClock();
  const employeeId = user.employeeId ?? '';

  const state = useAsync(async () => {
    const now = toUtcInstant(new Date());
    const [punches, assignments, events] = await Promise.all([
      data.listPunches(employeeId),
      data.listAssignmentsForEmployee(employeeId),
      data.listEvents(),
    ]);
    const sessions = buildWorkSessions(punches, { now });
    const weekAgo = madridLocalDate(toUtcInstant(new Date(Date.now() - 6 * 86400_000)));
    const weekMinutes = sessions
      .filter((s) => s.localDate >= weekAgo)
      .reduce((a, s) => a + (s.netMinutes ?? 0), 0);
    const pendingIssues = sessions.filter((s) => s.anomalies.length > 0).length;
    const upcoming = assignments
      .map((a) => events.find((e) => e.id === a.eventId))
      .filter((e): e is NonNullable<typeof e> => !!e && e.endAt >= now && e.status !== 'cancelled')
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
    return { weekMinutes, pendingIssues, upcoming };
  }, [data, employeeId]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('dashboard.greeting', { name: user.displayName })}
        subtitle={formatInMadrid(toUtcInstant(new Date()), locale, 'weekday-date')}
      />

      <Card
        aria-label={t('dashboard.statusTitle')}
        className="flex items-center justify-between gap-3"
      >
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {t('dashboard.statusTitle')}
          </p>
          <p className="text-lg font-bold" data-testid="dashboard-status">
            {t(`clock.status.${sim.status}`)}
          </p>
          <Badge tone="warning">{t('clock.simulationShort')}</Badge>
        </div>
        <Link
          to="/app/clock"
          className="flex min-h-12 items-center rounded-xl bg-teal-700 px-5 font-bold text-white"
        >
          {t('dashboard.goClock')}
        </Link>
      </Card>

      {state.status === 'error' && <ErrorState error={state.error} />}
      {state.status === 'success' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label={t('dashboard.week')}
              value={<Duration minutes={state.data.weekMinutes} />}
            />
            <Stat label={t('dashboard.issues')} value={state.data.pendingIssues} />
          </div>
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold">{t('dashboard.upcoming')}</h2>
              <DemoTag />
            </div>
            {state.data.upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">{t('events.none')}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {state.data.upcoming.slice(0, 3).map((e) => (
                  <li key={e.id} className="py-2">
                    <p className="font-semibold">{e.name}</p>
                    <p className="text-sm text-slate-600">
                      {formatInMadrid(e.startAt, locale, 'weekday-date')} ·{' '}
                      {formatInMadrid(e.startAt, locale, 'time')}–
                      {formatInMadrid(e.endAt, locale, 'time')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/app/events"
              className="mt-2 inline-block text-sm font-semibold text-teal-700"
            >
              {t('dashboard.allEvents')}
            </Link>
          </Card>
          <Card className="flex flex-wrap gap-3">
            <Link to="/app/history" className="text-sm font-semibold text-teal-700">
              {t('nav.history')}
            </Link>
            <Link to="/app/corrections/new" className="text-sm font-semibold text-teal-700">
              {t('nav.correction')}
            </Link>
          </Card>
        </>
      )}
    </div>
  );
}
