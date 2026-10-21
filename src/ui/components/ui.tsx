import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { splitMinutes } from '../../domain/time/zone';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Card({
  children,
  className = '',
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'article' | 'div' | 'li';
  'aria-label'?: string;
  'data-testid'?: string;
}) {
  return (
    <Tag
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'demo';
const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-sky-100 text-sky-800',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-rose-100 text-rose-800',
  demo: 'bg-fuchsia-100 text-fuchsia-800',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function DemoTag() {
  const { t } = useTranslation();
  return <Badge tone="demo">{t('common.demoTag')}</Badge>;
}

export function Duration({ minutes }: { minutes: number | null }) {
  const { t } = useTranslation();
  if (minutes === null) return <span>{t('common.ongoing')}</span>;
  const { hours, minutes: m, negative } = splitMinutes(minutes);
  return (
    <span>
      {t('common.duration', {
        sign: negative ? '−' : '',
        hours,
        minutes: String(m).padStart(2, '0'),
      })}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

export function ErrorState({ error }: { error: Error }) {
  const { t } = useTranslation();
  return (
    <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
      {t('common.error')}: {error.message}
    </p>
  );
}

export function Stat({
  label,
  value,
  testId,
}: {
  label: string;
  value: ReactNode;
  testId?: string;
}) {
  return (
    <Card className="flex flex-col gap-1" {...(testId ? { 'data-testid': testId } : {})}>
      <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</span>
      <span className="text-2xl font-bold text-slate-900">{value}</span>
    </Card>
  );
}
