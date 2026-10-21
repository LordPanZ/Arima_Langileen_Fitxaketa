import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test/renderApp';

describe('protección de rutas', () => {
  it('sin sesión redirige al login', async () => {
    const { router } = await renderApp('/app/history', null);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(screen.getByRole('heading', { name: 'Modo demostración' })).toBeInTheDocument();
  });

  it('un trabajador no accede al panel de gestión', async () => {
    const { router } = await renderApp('/admin/employees', 'employee');
    await waitFor(() => expect(router.state.location.pathname).toBe('/forbidden'));
  });

  it('auditoría entra directamente al panel y no puede fichar', async () => {
    const { router } = await renderApp('/', 'auditor');
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
    await router.navigate('/app/clock');
    await waitFor(() => expect(router.state.location.pathname).toBe('/forbidden'));
  });

  it('coordinación ve eventos pero no la plantilla completa (sin permiso employees:read)', async () => {
    const { router } = await renderApp('/admin/events', 'coordinator');
    expect(await screen.findByRole('heading', { name: 'Gestión de eventos' })).toBeInTheDocument();
    await router.navigate('/admin/employees');
    await waitFor(() => expect(router.state.location.pathname).toBe('/forbidden'));
  });

  it('administración ve la plantilla ficticia', async () => {
    await renderApp('/admin/employees', 'admin');
    expect(await screen.findAllByTestId('employee-row')).toHaveLength(6);
    expect(screen.getAllByText(/\(DEMO\)/).length).toBeGreaterThan(0);
  });
});

describe('fichaje simulado', () => {
  it('muestra el aviso de simulación y sigue la máquina de estados', async () => {
    const user = userEvent.setup();
    await renderApp('/app/clock', 'employee');
    expect(await screen.findByTestId('simulation-notice')).toHaveTextContent('SIMULACIÓN');
    expect(screen.getByRole('button', { name: /Salida/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Entrada/ }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('No se enviará ni registrará ninguna hora');
    await user.click(screen.getByRole('button', { name: 'Simular' }));

    expect(screen.getByTestId('clock-status')).toHaveTextContent('Trabajando');
    expect(screen.getByRole('status')).toHaveTextContent('No se ha registrado nada');
    expect(screen.getByRole('button', { name: /Entrada/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Iniciar pausa/ })).toBeEnabled();
  });

  it('permite elegir "Sin evento"', async () => {
    await renderApp('/app/clock', 'employee');
    expect(await screen.findByRole('combobox', { name: /Evento/ })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Sin evento' })).toBeInTheDocument();
  });
});

describe('idiomas', () => {
  it('cambia a euskera desde la interfaz', async () => {
    const user = userEvent.setup();
    await renderApp('/app', 'employee');
    expect((await screen.findAllByRole('link', { name: /^.?Historial/ })).length).toBeGreaterThan(
      0,
    );
    await user.click(screen.getByRole('button', { name: 'EU' }));
    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: /Historia$/ }).length).toBeGreaterThan(0),
    );
    expect(screen.queryAllByRole('link', { name: /Historial/ })).toHaveLength(0);
    expect(document.documentElement.lang).toBe('eu');
    expect(screen.getByRole('button', { name: 'EU' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('historial', () => {
  it('muestra jornadas con salida olvidada y sin evento', async () => {
    await renderApp('/app/history', 'employee');
    const sessions = await screen.findAllByTestId('history-session');
    expect(sessions.length).toBe(5);
    expect(screen.getAllByText('Falta la salida').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sin evento').length).toBeGreaterThan(0);
  });
});
