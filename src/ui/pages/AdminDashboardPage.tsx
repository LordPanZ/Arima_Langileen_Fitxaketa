import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useServices } from '../../app/ServicesContext';
import { can } from '../../domain/auth/permissions';
import { buildWorkSessions } from '../../domain/clock/workSessions';
import { evaluateRules } from '../../domain/labor/evaluateRules';
import { toUtcInstant } from '../../domain/time/zone';
import { useSessionUser } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { Badge, Card, DemoTag, ErrorState, PageHeader, Stat } from '../components/ui';

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const { data } = useServices();
  const user = useSessionUser();

  const state = useAsync(async () => {
    const now = toUtcInstant(new Date());
    const [employees, events, incidents, corrections, punches, rules] = await Promise.all([
      data.listEmployees(),
      data.listEvents(),
      data.listIncidents(),
      data.listCorrections(),
      data.listAllPunches(),
      data.listLaborRules(),
    ]);
    const findings = employees.flatMap((e) =>
      evaluateRules(
        buildWorkSessions(
          punches.filter((p) => p.employeeId === e.id),
          { now },
        ),
        rules,
      ),
    );
    return {
      activeEmployees: employees.filter((e) => e.status === 'active').length,
      upcomingEvents: events.filter((e) => e.endAt >= now && e.status !== 'cancelled').length,
      openIncidents: incidents.filter((i) => i.status !== 'resolved').length,
      pendingCorrections: corrections.filter((c) => c.status === 'pending').length,
      findings: findings.length,
      rules,
    };
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} actions={<DemoTag />} />
      {state.status === 'error' && <ErrorState error={state.error} />}
      {state.status === 'success' && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              testId="stat-employees"
              label={t('admin.stats.employees')}
              value={state.data.activeEmployees}
            />
            <Stat label={t('admin.stats.events')} value={state.data.upcomingEvents} />
            <Stat label={t('admin.stats.incidents')} value={state.data.openIncidents} />
            <Stat label={t('admin.stats.corrections')} value={state.data.pendingCorrections} />
          </div>
          <Card>
            <h2 className="mb-1 font-bold">{t('admin.rulesTitle')}</h2>
            <p className="mb-3 text-sm text-slate-600">
              {t('admin.rulesHelp', { count: state.data.findings })}
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {state.data.rules.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2"
                >
                  <span>
                    <span className="font-semibold">{t(`rules.codes.${r.code}`)}</span>
                    <span className="block text-xs text-slate-500">{r.legalBasis}</span>
                  </span>
                  <Badge tone={r.status === 'active' ? 'success' : 'warning'}>
                    {t(`rules.status.${r.status}`)}
                  </Badge>
                </li>
              ))}
            </ul>
            {can(user.role, 'labor-rules:manage') && (
              <p className="mt-3 text-xs text-slate-500">{t('admin.rulesEditPhase2')}</p>
            )}
          </Card>
          <Card className="flex flex-wrap gap-4">
            <Link to="/admin/employees" className="text-sm font-semibold text-teal-700">
              {t('nav.employees')}
            </Link>
            <Link to="/admin/events" className="text-sm font-semibold text-teal-700">
              {t('nav.adminEvents')}
            </Link>
            <Link to="/admin/incidents" className="text-sm font-semibold text-teal-700">
              {t('nav.incidents')}
            </Link>
          </Card>
        </>
      )}
    </div>
  );
}
