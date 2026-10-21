import { describe, expect, it } from 'vitest';
import { can, hasBackofficeAccess, ROLE_PERMISSIONS } from './permissions';
import { isRole, ROLES } from './roles';

describe('matriz de permisos', () => {
  it('todos los roles tienen entrada', () => {
    for (const r of ROLES) expect(ROLE_PERMISSIONS[r]).toBeDefined();
  });

  it('el trabajador solo tiene autoservicio', () => {
    expect(can('employee', 'clock:self')).toBe(true);
    expect(can('employee', 'records:read-all')).toBe(false);
    expect(can('employee', 'correction:review')).toBe(false);
    expect(hasBackofficeAccess('employee')).toBe(false);
  });

  it('el coordinador gestiona eventos pero no revisa correcciones ni ve auditoría', () => {
    expect(can('coordinator', 'events:manage')).toBe(true);
    expect(can('coordinator', 'correction:review')).toBe(false);
    expect(can('coordinator', 'audit:read')).toBe(false);
  });

  it('el auditor es de solo lectura y no ficha', () => {
    expect(can('auditor', 'records:read-all')).toBe(true);
    expect(can('auditor', 'audit:read')).toBe(true);
    expect(can('auditor', 'clock:self')).toBe(false);
    const writes = ROLE_PERMISSIONS.auditor.filter((p) =>
      /manage|review|assign|clock|request/.test(p),
    );
    expect(writes).toEqual([]);
  });

  it('sin rol no hay permisos', () => {
    expect(can(null, 'clock:self')).toBe(false);
    expect(can(undefined, 'history:read-self')).toBe(false);
    expect(isRole('superadmin')).toBe(false);
  });
});
