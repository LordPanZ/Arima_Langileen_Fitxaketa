import { createBrowserRouter, Outlet, type RouteObject } from 'react-router';
import { RequireAuth, RequireBackoffice, RequirePermission, HomeRedirect } from '../ui/auth/guards';
import { AppShell } from '../ui/components/AppShell';
import { SimulatedClockProvider } from '../ui/features/clock/SimulatedClock';
import { LoginPage } from '../ui/pages/LoginPage';
import { WorkerDashboardPage } from '../ui/pages/WorkerDashboardPage';
import { ClockPage } from '../ui/pages/ClockPage';
import { HistoryPage } from '../ui/pages/HistoryPage';
import { MyEventsPage } from '../ui/pages/MyEventsPage';
import { CorrectionRequestPage } from '../ui/pages/CorrectionRequestPage';
import { AdminDashboardPage } from '../ui/pages/AdminDashboardPage';
import { EmployeesPage } from '../ui/pages/EmployeesPage';
import { EventsAdminPage } from '../ui/pages/EventsAdminPage';
import { IncidentsPage } from '../ui/pages/IncidentsPage';
import { ForbiddenPage } from '../ui/pages/ForbiddenPage';
import { NotFoundPage } from '../ui/pages/NotFoundPage';

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/forbidden', element: <ForbiddenPage /> },
  {
    element: (
      <RequireAuth>
        <SimulatedClockProvider>
          <Outlet />
        </SimulatedClockProvider>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        path: 'app',
        element: (
          <RequirePermission permission="clock:self">
            <AppShell area="worker" />
          </RequirePermission>
        ),
        children: [
          { index: true, element: <WorkerDashboardPage /> },
          { path: 'clock', element: <ClockPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'events', element: <MyEventsPage /> },
          {
            path: 'corrections/new',
            element: (
              <RequirePermission permission="correction:request-self">
                <CorrectionRequestPage />
              </RequirePermission>
            ),
          },
        ],
      },
      {
        path: 'admin',
        element: (
          <RequireBackoffice>
            <AppShell area="admin" />
          </RequireBackoffice>
        ),
        children: [
          { index: true, element: <AdminDashboardPage /> },
          {
            path: 'employees',
            element: (
              <RequirePermission permission="employees:read">
                <EmployeesPage />
              </RequirePermission>
            ),
          },
          {
            path: 'events',
            element: (
              <RequirePermission permission="events:read-all">
                <EventsAdminPage />
              </RequirePermission>
            ),
          },
          {
            path: 'incidents',
            element: (
              <RequirePermission permission="incidents:read">
                <IncidentsPage />
              </RequirePermission>
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];

export const createRouter = () => createBrowserRouter(routes);
