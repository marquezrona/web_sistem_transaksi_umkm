import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt, BarChart3,
  Settings, LogOut, Wifi, WifiOff, Building2, Landmark, ScrollText,
  RefreshCw, Radio, Store
} from "lucide-react";

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/umkms", label: "UMKM", icon: Building2 },
  { to: "/admin/transactions", label: "Transaksi", icon: Receipt },
  { to: "/admin/settlement", label: "Settlement", icon: Landmark },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

const umkmNav = [
  { to: "/umkm", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/umkm/pos", label: "Kasir", icon: ShoppingCart },
  { to: "/umkm/products", label: "Produk", icon: Package },
  { to: "/umkm/customers", label: "Pelanggan", icon: Users },
  { to: "/umkm/transactions", label: "Transaksi", icon: Receipt },
  { to: "/umkm/reports", label: "Laporan", icon: BarChart3 },
  { to: "/umkm/settings", label: "Pengaturan", icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { online, forceOffline, toggleForceOffline, pending, syncing, syncNow } = useOffline();
  const nav = useNavigate();
  const isAdmin = user?.role === "admin";
  const items = isAdmin ? adminNav : umkmNav;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <div className="tenun-border" />
      {/* top bar */}
      <header className="h-16 bg-white border-b border-[#E5DEC9] flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A3663] flex items-center justify-center">
            <Store className="w-5 h-5 text-[#E6A100]" />
          </div>
          <div>
            <div className="font-display font-bold text-[#0C2340] leading-tight">Kasir UMKM</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#A63A2B]">Sabu Raijua</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* offline indicator */}
          <div
            data-testid="conn-status"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              online ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {online ? "ONLINE" : "OFFLINE"}
          </div>

          <Button
            data-testid="toggle-offline-btn"
            variant="outline" size="sm"
            onClick={toggleForceOffline}
            className="hidden md:flex text-xs h-8"
          >
            <Radio className="w-3.5 h-3.5 mr-1.5" />
            {forceOffline ? "Hubungkan Kembali" : "Putuskan Sinyal"}
          </Button>

          {pending > 0 && (
            <Button
              data-testid="sync-now-btn"
              variant="outline" size="sm"
              onClick={syncNow}
              disabled={syncing || !online}
              className="text-xs h-8 border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
              {pending} menunggu sync
            </Button>
          )}

          <div className="hidden sm:flex flex-col items-end mr-1">
            <div className="text-xs font-semibold text-[#0C2340]">{user?.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              {isAdmin ? "Super Admin" : "UMKM"}
            </div>
          </div>
          <Button data-testid="logout-btn" variant="ghost" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* sidebar */}
        <aside className="w-64 hidden md:block bg-white border-r border-[#E5DEC9] p-4">
          <nav className="space-y-1">
            {items.map(it => {
              const Ic = it.icon;
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  data-testid={`nav-${it.label.toLowerCase()}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#0A3663] text-white shadow-sm"
                        : "text-[#0C2340] hover:bg-[#F7F4EF]"
                    }`
                  }
                >
                  <Ic className="w-4 h-4" />
                  {it.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {forceOffline && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              <strong>Mode Offline Aktif.</strong> Transaksi akan disimpan lokal dan disinkronkan saat koneksi kembali.
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
