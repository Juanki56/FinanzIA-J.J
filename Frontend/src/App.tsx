import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { DashboardPage } from '@/pages/DashboardPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { MovementsPage } from '@/pages/MovementsPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { TransfersPage } from '@/pages/TransfersPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { CategoryDetailPage } from '@/pages/CategoryDetailPage'
import { BudgetsPage } from '@/pages/BudgetsPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { GoalDetailPage } from '@/pages/GoalDetailPage'
import { RecurringPage } from '@/pages/RecurringPage'
import { ConnectionsPage } from '@/pages/ConnectionsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/politica-de-privacidad" element={<PrivacyPolicyPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/cuentas" element={<AccountsPage />} />
        <Route path="/movimientos" element={<MovementsPage />} />
        <Route path="/revisar" element={<ReviewPage />} />
        <Route path="/transferencias" element={<TransfersPage />} />
        <Route path="/categorias" element={<CategoriesPage />} />
        <Route path="/categorias/:id" element={<CategoryDetailPage />} />
        <Route path="/presupuestos" element={<BudgetsPage />} />
        <Route path="/objetivos" element={<GoalsPage />} />
        <Route path="/objetivos/:id" element={<GoalDetailPage />} />
        <Route path="/recurrentes" element={<RecurringPage />} />
        <Route path="/conexiones" element={<ConnectionsPage />} />
        <Route path="/configuracion" element={<SettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
