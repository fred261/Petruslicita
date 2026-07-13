import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UsuariosPage } from "@/pages/UsuariosPage";
import { ClientesListPage } from "@/pages/ClientesListPage";
import { ClienteNovoPage } from "@/pages/ClienteNovoPage";
import { ClienteFichaPage } from "@/pages/ClienteFichaPage";
import { USER_MANAGER_ROLES } from "@petrus/shared";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <DashboardPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <AppShell>
              <ClientesListPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes/novo"
        element={
          <ProtectedRoute>
            <AppShell>
              <ClienteNovoPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <ClienteFichaPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute allow={USER_MANAGER_ROLES}>
            <AppShell>
              <UsuariosPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
