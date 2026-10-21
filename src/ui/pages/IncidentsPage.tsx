import { useTranslation } from 'react-i18next';
import { useServices } from '../../app/ServicesContext';
import { formatInMadrid } from '../../domain/time/zone';
import { useAsync } from '../hooks/useAsync';
import { useLocale } from '../hooks/useLocale';
import { Badge, Card, DemoTag, EmptyState, ErrorState, PageHeader } from '../components/ui';

const SEVERITY_TONE = { info: 'info', warning: 'warning', critical: 'danger' } as const;

export function IncidentsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data } = useServices();
  const state = useAsync(async () => {
    const [incidents, employees] = await Promise.all([data.listIncidents(), data.listEmployees()]);
    return incidents.map((i) => ({
      i,
      name: employees.find((e) => e.id === i.employeeId)?.displayName ?? '—',
    }));
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('incidents.title')}
        subtitle={t('incidents.subtitle')}
        actions={<DemoTag />}
      />
      {state.status === 'error' && <ErrorState error={state.error} />}
      {state.status === 'success' && state.data.length === 0 && (
        <EmptyState>{t('incidents.empty')}</EmptyState>
      )}
      {state.status === 'success' && (
        <ul className="flex flex-col gap-3">
          {state.data.map(({ i, name }) => (
            <Card as="li" key={i.id} data-testid="incident-row">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{t(`incidents.types.${i.type}`)}</p>
                  <p className="text-sm text-slate-600">
                    {name} · {formatInMadrid(i.detectedAt, locale)}
                  </p>
                  <p className="mt-1 text-sm">{i.summary}</p>
                  {i.resolutionNote && (
                    <p className="mt-1 text-xs text-slate-500">{i.resolutionNote}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={SEVERITY_TONE[i.severity]}>
                    {t(`incidents.severity.${i.severity}`)}
                  </Badge>
                  <Badge tone={i.status === 'resolved' ? 'success' : 'neutral'}>
                    {t(`incidents.status.${i.status}`)}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500">{t('incidents.noAutoSanction')}</p>
    </div>
  );
}
