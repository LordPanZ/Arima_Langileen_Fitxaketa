import { describe, expect, it } from 'vitest';
import es from './locales/es.json';
import eu from './locales/eu.json';
import review from './locales/eu.review.json';

type Tree = { [k: string]: string | Tree };

function flatten(obj: Tree, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') acc[key] = v;
    else Object.assign(acc, flatten(v, key));
    return acc;
  }, {});
}

const esFlat = flatten(es as Tree);
const euFlat = flatten(eu as Tree);

describe('recursos de traducción', () => {
  it('castellano y euskera tienen exactamente las mismas claves', () => {
    expect(Object.keys(euFlat).sort()).toEqual(Object.keys(esFlat).sort());
  });

  it('ninguna traducción está vacía', () => {
    for (const [k, v] of [...Object.entries(esFlat), ...Object.entries(euFlat)]) {
      expect(v.trim(), k).not.toBe('');
    }
  });

  it('las variables de interpolación coinciden en ambos idiomas', () => {
    const vars = (s: string) =>
      (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((x) => x.replace(/\s/g, '')).sort();
    for (const k of Object.keys(esFlat))
      expect(vars(euFlat[k] ?? ''), k).toEqual(vars(esFlat[k] ?? ''));
  });

  it('todas las claves marcadas para revisión existen', () => {
    for (const k of Object.keys(review).filter((x) => !x.startsWith('_')))
      expect(euFlat[k], k).toBeDefined();
  });
});
