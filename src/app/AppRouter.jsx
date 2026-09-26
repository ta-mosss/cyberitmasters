import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../auth/AuthProvider';
import { RequireAuth, RequireRole } from '../auth/guards';
import { PORTAL_ROLES } from '../permissions/roles';
import LoginPage from '../pages/portal/LoginPage';
import WorkspacePage from '../pages/portal/WorkspacePage';
import ModulePage from '../pages/portal/ModulePage';
import EngineerPortalPage from '../pages/engineer/EngineerPortalPage';
import EngineerWorkPage from '../pages/engineer/EngineerWorkPage';
import EngineerSchedulePage from '../pages/engineer/EngineerSchedulePage';
import EngineerHistoryPage from '../pages/engineer/EngineerHistoryPage';
import EngineerProfilePage from '../pages/engineer/EngineerProfilePage';
import ManagementPortalPage from '../pages/management/ManagementPortalPage';
import {
  ManagementDashboardPage, ManagementTicketsPage, ManagementJobsPage, ManagementDispatchPage,
  ManagementEngineersPage, ManagementCustomersPage, ManagementAssetsPage, ManagementQuotesPage,
  ManagementSlaPage, ManagementReportsPage, ManagementAuditPage, ManagementStaffPage, ManagementSettingsPage,
} from '../pages/management';
import CustomerPortalPage from '../pages/customer/CustomerPortalPage';
import CustomerOverviewPage from '../pages/customer/CustomerOverviewPage';
import CustomerTicketsPage from '../pages/customer/CustomerTicketsPage';
import CustomerTicketPage from '../pages/customer/CustomerTicketPage';
import CustomerRequestPage from '../pages/customer/CustomerRequestPage';
import CustomerAssetsPage from '../pages/customer/CustomerAssetsPage';
import CustomerBillingPage from '../pages/customer/CustomerBillingPage';
import CustomerProfilePage from '../pages/customer/CustomerProfilePage';
import CustomerSignoffPage from '../pages/signoff/CustomerSignoffPage';
import '../styles/portal.css';

export default function AppRouter() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<App />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signoff" element={<CustomerSignoffPage />} />

    <Route element={<RequireAuth />}>
      <Route path="/portal" element={<WorkspacePage />} />
      <Route element={<RequireRole roles={PORTAL_ROLES.admin} />}><Route path="/admin" element={<ModulePage type="admin" />} /></Route>
      <Route element={<RequireRole roles={PORTAL_ROLES.management} />}><Route path="/management" element={<ManagementPortalPage />}><Route index element={<ManagementDashboardPage />} /><Route path="tickets" element={<ManagementTicketsPage />} /><Route path="jobs" element={<ManagementJobsPage />} /><Route path="dispatch" element={<ManagementDispatchPage />} /><Route path="engineers" element={<ManagementEngineersPage />} /><Route path="customers" element={<ManagementCustomersPage />} /><Route path="assets" element={<ManagementAssetsPage />} /><Route path="quotes" element={<ManagementQuotesPage />} /><Route path="sla" element={<ManagementSlaPage />} /><Route path="reports" element={<ManagementReportsPage />} /><Route path="audit" element={<ManagementAuditPage />} /><Route path="staff" element={<ManagementStaffPage />} /><Route path="settings" element={<ManagementSettingsPage />} /></Route></Route>
      <Route element={<RequireRole roles={PORTAL_ROLES.engineer} />}><Route path="/engineer" element={<EngineerPortalPage />}><Route index element={<EngineerWorkPage />} /><Route path="schedule" element={<EngineerSchedulePage />} /><Route path="history" element={<EngineerHistoryPage />} /><Route path="profile" element={<EngineerProfilePage />} /></Route></Route>
      <Route element={<RequireRole roles={PORTAL_ROLES.customer} />}><Route path="/customer" element={<CustomerPortalPage />}>
        <Route index element={<CustomerOverviewPage />} />
        <Route path="tickets" element={<CustomerTicketsPage />} />
        <Route path="tickets/:ticketId" element={<CustomerTicketPage />} />
        <Route path="request" element={<CustomerRequestPage />} />
        <Route path="assets" element={<CustomerAssetsPage />} />
        <Route path="billing" element={<CustomerBillingPage />} />
        <Route path="profile" element={<CustomerProfilePage />} />
      </Route></Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>;
}
