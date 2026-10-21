import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LIMITS, validateRequestTimeCorrection } from '../../domain/contracts/functionsApi';
import type { CorrectionKind } from '../../domain/model/correction';
import type { LocalDate } from '../../domain/model/ids';
import type { PunchType } from '../../domain/model/timeEntry';
import {
  AmbiguousOrInvalidLocalTimeError,
  madridLocalDate,
  madridWallTimeToUtc,
  toUtcInstant,
} from '../../domain/time/zone';
import { useSessionUser } from '../auth/AuthContext';
import { Card, PageHeader } from '../components/ui';

const KINDS: CorrectionKind[] = ['add-missing', 'adjust-time', 'void-entry'];
const PUNCHES: PunchType[] = ['clock-in', 'clock-out', 'break-start', 'break-end'];

/**
 * Solicitud de corrección. Fase 1: valida el formulario con el mismo
 * validador que usará Cloud Functions, pero NO envía nada.
 */
export function CorrectionRequestPage() {
  const { t } = useTranslation();
  const user = useSessionUser();
  const today = madridLocalDate(toUtcInstant(new Date()));
  const [kind, setKind] = useState<CorrectionKind>('add-missing');
  const [punchType, setPunchType] = useState<PunchType>('clock-out');
  const [date, setDate] = useState<string>(today);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDone(null);
    const errs: string[] = [];
    let proposedAt: string | null = null;
    if (kind !== 'void-entry') {
      try {
        proposedAt = madridWallTimeToUtc(date as LocalDate, time);
      } catch (err) {
        errs.push(
          err instanceof AmbiguousOrInvalidLocalTimeError
            ? t(`correction.errors.${err.kind}`)
            : t('correction.errors.time'),
        );
      }
    }
    const result = validateRequestTimeCorrection({
      employeeId: user.employeeId ?? '',
      kind,
      // En fase 2 se elegirá el registro afectado desde el historial.
      targetEntryId: kind === 'add-missing' ? null : 'demo-target-entry',
      punchType,
      proposedAt,
      reason,
      clientRequestId: crypto.randomUUID(),
    });
    if (!result.ok && errs.length === 0)
      errs.push(...result.errors.map(() => t('correction.errors.generic')));
    if (reason.trim().length < LIMITS.reasonMinLength)
      errs.push(t('correction.errors.reason', { min: LIMITS.reasonMinLength }));
    setErrors([...new Set(errs)]);
    if (errs.length === 0 && result.ok) setDone(t('correction.simulatedSent'));
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('correction.title')} subtitle={t('correction.subtitle')} />
      <p
        role="note"
        className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
      >
        {t('correction.notSent')}
      </p>
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-slate-700">
              {t('correction.kindLabel')}
            </legend>
            {KINDS.map((k) => (
              <label
                key={k}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3"
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                />
                {t(`correction.kinds.${k}`)}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {t('correction.punchLabel')}
            <select
              value={punchType}
              onChange={(e) => setPunchType(e.target.value as PunchType)}
              className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-base"
            >
              {PUNCHES.map((p) => (
                <option key={p} value={p}>
                  {t(`clock.actions.${p}`)}
                </option>
              ))}
            </select>
          </label>
          {kind !== 'void-entry' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                {t('correction.date')}
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-h-12 rounded-xl border border-slate-300 px-3 text-base"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                {t('correction.time')}
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="min-h-12 rounded-xl border border-slate-300 px-3 text-base"
                />
              </label>
              <p className="col-span-2 text-xs text-slate-500">{t('correction.timezoneHelp')}</p>
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {t('correction.reason')}
            <textarea
              value={reason}
              maxLength={LIMITS.reasonMaxLength}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="rounded-xl border border-slate-300 p-3 text-base"
            />
          </label>
          {errors.length > 0 && (
            <ul role="alert" className="list-disc pl-5 text-sm text-rose-700">
              {errors.map((er) => (
                <li key={er}>{er}</li>
              ))}
            </ul>
          )}
          {done && (
            <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
              {done}
            </p>
          )}
          <button type="submit" className="min-h-12 rounded-xl bg-teal-700 font-bold text-white">
            {t('correction.submit')}
          </button>
          <p className="text-xs text-slate-500">{t('correction.originalKept')}</p>
        </form>
      </Card>
    </div>
  );
}
