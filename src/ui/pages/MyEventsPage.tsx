import { useTranslation } from 'react-i18next';
import { useServices } from '../../app/ServicesContext';
import { formatInMadrid } from '../../domain/time/zone';
import { useSessionUser } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useLocale } from '../hooks/useLocale';
import { Badge, Card, DemoTag, EmptyState, ErrorState, PageHeader } from '../components/ui';

export function MyEventsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data } = useServices();
  const user = useSessionUser();

  const state = useAsync(async () => {
    const [assignments, events] = await Promise.all([
      data.listAssignmentsForEmployee(user.employeeId ?? ''),
      data.listEvents(),
    ]);
    return assignments
      .map((a) => ({ a, e: events.find((e) => e.id === a.eventId) }))
      .filter((x): x is { a: typeof x.a; e: NonNullable<typeof x.e> } => !!x.e)
      .sort((x, y) => x.e.startAt.localeCompare(y.e.startAt));
  }, [data, user.employeeId]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('events.mineTitle')}
        subtitle={t('events.mineSubtitle')}
        actions={<DemoTag />}
      />
      {state.status === 'error' && <ErrorState error={state.error} />}
      {state.status === 'success' && state.data.length === 0 && (
        <EmptyState>{t('events.none')}</EmptyState>
      )}
      {state.status === 'success' && (
        <ul className="flex flex-col gap-3">
          {state.data.map(({ a, e }) => (
            <Card as="li" key={a.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{e.name}</p>
                  <p className="text-sm text-slate-600">
                    {formatInMadrid(e.startAt, locale, 'weekday-date')} ·{' '}
                    {formatInMadrid(e.startAt, locale, 'time')}–
                    {formatInMadrid(e.endAt, locale, 'time')}
                  </p>
                  {e.locationLabel && <p className="text-sm text-slate-600">{e.locationLabel}</p>}
                  {a.task && (
                    <p className="text-sm">
                      {t('events.task')}: {a.task}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone="info">{t(`events.status.${e.status}`)}</Badge>
                  <Badge tone={a.status === 'confirmed' ? 'success' : 'neutral'}>
                    {t(`events.assignment.${a.status}`)}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
