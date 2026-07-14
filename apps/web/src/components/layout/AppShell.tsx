import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AlarmClock, Building2, FileStack, LayoutDashboard, LogOut, Menu, Radar, Settings, Users, X } from "lucide-react";
import clsx from "clsx";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS, USER_MANAGER_ROLES, type Role } from "@petrus/shared";

const MASTER_ONLY: Role[] = ["MASTER"];

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: undefined },
  { to: "/editais", label: "Radar de Editais", icon: Radar, roles: undefined },
  { to: "/pendencias", label: "Pendências", icon: AlarmClock, roles: undefined },
  { to: "/clientes", label: "Clientes", icon: Building2, roles: undefined },
  { to: "/usuarios", label: "Usuários", icon: Users, roles: USER_MANAGER_ROLES },
  { to: "/modelos-documento", label: "Modelos de Documento", icon: FileStack, roles: USER_MANAGER_ROLES },
  { to: "/configuracoes", label: "Configurações", icon: Settings, roles: MASTER_ONLY },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const itemsVisiveis = navItems.filter((item) => !item.roles || item.roles.includes(user.papel));

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {itemsVisiveis.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-gold-50 text-gold-700" : "text-ink-700 hover:bg-ink-50",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-ink-100 p-4">
        <p className="truncate text-sm font-medium text-ink-900">{user.nome}</p>
        <p className="text-xs text-ink-500">{ROLE_LABELS[user.papel]}</p>
        <button
          onClick={() => logout()}
          className="mt-3 flex items-center gap-2 text-xs font-medium text-ink-500 hover:text-red-600"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-ink-100 bg-white md:block">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg">
            <button
              className="absolute right-3 top-4 text-ink-500"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-ink-100 bg-white px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5 text-ink-700" />
          </button>
          <Logo />
        </header>
        <main className="flex-1 bg-ink-50 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
