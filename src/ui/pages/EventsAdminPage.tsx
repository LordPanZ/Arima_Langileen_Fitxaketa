import { useTranslation } from 'react-i18next';
import { useServices } from '../../app/ServicesContext';
import { can } from '../../domain/auth/permissions';
import { formatInMadrid } from '../../domain/time/zone';
import { useSessionUser } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useLocale } from '../hooks/useLocale';
import { Badge, Card, DemoTag, ErrorState, PageHeader } from '../components/ui';

export function EventsAdminPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data } = useServices();
  const user = useSessionUser();
  const canManage = can(user.role, 'events:manage');

  const state = useAsync(async () => {
    const [events, employees] = await Promise.all([data.listEvents(), data.listEmployees()]);
    return Promise.all(
      events.map(async (e) => ({
        event: e,
        staff: (await data.listAssignmentsForEvent(e.id)).map((a) => ({
          a,
          name: employees.find((x) => x.id === a.employeeId)?.displayName ?? a.employeeId,
        })),
      })),
    );
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('adminEvents.title')}
        subtitle={t('adminEvents.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <DemoTag />
            {canManage && (
              <button
                type="button"
                disabled
                title={t('common.phase2')}
                className="min-h-10 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white opacity-40"
              >
                {t('adminEvents.add')}
              </button>
            )}
          </div>
        }
      />
      {state.status === 'error' && <ErrorState error={state.error} />}
      {state.status === 'success' && (
        <ul className="flex flex-col gap-3">
          {state.data.map(({ event: e, staff }) => (
            <Card as="li" key={e.id} data-testid="event-row">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{e.name}</p>
                  <p className="text-xs text-slate-500">{e.code}</p>
                  <p className="text-sm text-slate-600">
                    {formatInMadrid(e.startAt, locale, 'weekday-date')} ·{' '}
                    {formatInMadrid(e.startAt, locale, 'time')}–
                    {formatInMadrid(e.endAt, locale, 'time')}
                  </p>
                  {e.locationLabel && <p className="text-sm text-slate-600">{e.locationLabel}</p>}
                </div>
                <Badge tone="info">{t(`events.status.${e.status}`)}</Badge>
              </div>
              <h3 className="mt-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {t('adminEvents.staff', { count: staff.length })}
              </h3>
              <ul className="mt-1 flex flex-wrap gap-1">
                {staff.map(({ a, name }) => (
                  <li key={a.id}>
                    <Badge tone={a.status === 'confirmed' ? 'success' : 'neutral'}>
                      {name}
                      {a.task ? ` · ${a.task}` : ''}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
