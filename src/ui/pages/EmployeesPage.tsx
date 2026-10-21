import { useTranslation } from 'react-i18next';
import { useServices } from '../../app/ServicesContext';
import { can } from '../../domain/auth/permissions';
import { useSessionUser } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { Badge, Card, DemoTag, ErrorState, PageHeader } from '../components/ui';

export function EmployeesPage() {
  const { t } = useTranslation();
  const { data } = useServices();
  const user = useSessionUser();
  const state = useAsync(() => data.listEmployees(), [data]);
  const canManage = can(user.role, 'employees:manage');

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('employees.title')}
        subtitle={t('employees.subtitle')}
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
                {t('employees.add')}
              </button>
            )}
          </div>
        }
      />
      {state.status === 'error' && <ErrorState error={state.error} />}
      {state.status === 'success' && (
        <ul className="flex flex-col gap-3" aria-label={t('employees.title')}>
          {state.data.map((e) => (
            <Card as="li" key={e.id} data-testid="employee-row">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{e.displayName}</p>
                  <p className="truncate text-sm text-slate-600">{e.email}</p>
                  <p className="text-xs text-slate-500">
                    {e.employeeCode} · {t(`language.long.${e.preferredLocale}`)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone="info">{t(`roles.${e.role}`)}</Badge>
                  <Badge tone={e.status === 'active' ? 'success' : 'neutral'}>
                    {t(`employees.status.${e.status}`)}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500">{t('employees.privacyNote')}</p>
    </div>
  );
}
