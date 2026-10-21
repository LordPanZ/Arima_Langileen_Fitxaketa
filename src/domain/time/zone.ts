import { COMPANY_TIME_ZONE, type LocalDate, type UtcInstant, isUtcInstant } from '../model/ids';

/** Convierte un Date a instante UTC canónico. */
export function toUtcInstant(date: Date): UtcInstant {
  if (Number.isNaN(date.getTime())) throw new Error('Fecha no válida');
  return date.toISOString() as UtcInstant;
}

export function parseUtcInstant(value: string): UtcInstant {
  if (!isUtcInstant(value)) throw new Error(`Instante UTC no válido: "${value}"`);
  return value;
}

export function instantToDate(instant: UtcInstant): Date {
  return new Date(instant);
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    partsFormatterCache.set(timeZone, f);
  }
  return f;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClockAt(instant: Date, timeZone: string): WallClock {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Fecha de calendario en Madrid de un instante UTC (para agrupar jornadas). */
export function madridLocalDate(
  instant: UtcInstant,
  timeZone: string = COMPANY_TIME_ZONE,
): LocalDate {
  const w = wallClockAt(new Date(instant), timeZone);
  return `${String(w.year).padStart(4, '0')}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')}` as LocalDate;
}

/** Desfase (minutos) de la zona respecto a UTC en un instante dado (+60 / +120 en Madrid). */
export function zoneOffsetMinutes(instant: Date, timeZone: string = COMPANY_TIME_ZONE): number {
  const w = wallClockAt(instant, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  const truncated = Math.floor(instant.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / 60000);
}

export class AmbiguousOrInvalidLocalTimeError extends Error {
  constructor(
    message: string,
    readonly kind: 'nonexistent' | 'ambiguous',
  ) {
    super(message);
    this.name = 'AmbiguousOrInvalidLocalTimeError';
  }
}

/**
 * Convierte una hora "de pared" de Madrid (la que introduce una persona en un
 * formulario de corrección) a instante UTC.
 *
 * - Hora inexistente (cambio a horario de verano, 02:00–02:59 del último
 *   domingo de marzo): error "nonexistent".
 * - Hora ambigua (cambio a horario de invierno, 02:00–02:59 del último domingo
 *   de octubre): error "ambiguous" salvo que se indique `prefer`.
 */
export function madridWallTimeToUtc(
  date: LocalDate,
  time: string,
  options: { prefer?: 'earlier' | 'later'; timeZone?: string } = {},
): UtcInstant {
  const timeZone = options.timeZone ?? COMPANY_TIME_ZONE;
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) throw new Error(`Hora no válida: "${time}" (formato HH:mm)`);
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) throw new Error(`Hora no válida: "${time}"`);

  const naiveUtc = Date.UTC(y, mo - 1, d, hh, mm);
  // Candidatos con los desfases posibles en torno a esa fecha.
  const offsets = new Set([
    zoneOffsetMinutes(new Date(naiveUtc - 24 * 3600_000), timeZone),
    zoneOffsetMinutes(new Date(naiveUtc + 24 * 3600_000), timeZone),
  ]);
  const matches: number[] = [];
  for (const off of offsets) {
    const candidate = naiveUtc - off * 60_000;
    const w = wallClockAt(new Date(candidate), timeZone);
    if (w.year === y && w.month === mo && w.day === d && w.hour === hh && w.minute === mm) {
      matches.push(candidate);
    }
  }
  matches.sort((a, b) => a - b);
  if (matches.length === 0) {
    throw new AmbiguousOrInvalidLocalTimeError(
      `La hora ${date} ${time} no existe en ${timeZone} (cambio de hora)`,
      'nonexistent',
    );
  }
  if (matches.length > 1 && !options.prefer) {
    throw new AmbiguousOrInvalidLocalTimeError(
      `La hora ${date} ${time} es ambigua en ${timeZone} (cambio de hora)`,
      'ambiguous',
    );
  }
  const chosen = options.prefer === 'later' ? matches[matches.length - 1] : matches[0];
  return toUtcInstant(new Date(chosen as number));
}

/** Formatea un instante para mostrarlo en Europe/Madrid en el idioma indicado. */
export function formatInMadrid(
  instant: UtcInstant,
  locale: 'es' | 'eu',
  style: 'time' | 'date' | 'datetime' | 'weekday-date' = 'datetime',
): string {
  const base: Intl.DateTimeFormatOptions = { timeZone: COMPANY_TIME_ZONE };
  const opts: Intl.DateTimeFormatOptions =
    style === 'time'
      ? { ...base, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
      : style === 'date'
        ? { ...base, year: 'numeric', month: '2-digit', day: '2-digit' }
        : style === 'weekday-date'
          ? { ...base, weekday: 'long', day: 'numeric', month: 'long' }
          : {
              ...base,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23',
            };
  return new Intl.DateTimeFormat(locale === 'eu' ? 'eu-ES' : 'es-ES', opts).format(
    new Date(instant),
  );
}

/** Duración en minutos enteros entre dos instantes (fin − inicio). */
export function minutesBetween(start: UtcInstant, end: UtcInstant): number {
  return Math.floor((Date.parse(end) - Date.parse(start)) / 60_000);
}

/** "7 h 05 min" → se formatea en la UI con i18n; aquí solo se descompone. */
export function splitMinutes(total: number): { hours: number; minutes: number; negative: boolean } {
  const negative = total < 0;
  const abs = Math.abs(total);
  return { hours: Math.floor(abs / 60), minutes: abs % 60, negative };
}
