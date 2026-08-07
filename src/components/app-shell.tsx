import Link from "next/link";
import { logoutAction } from "@/app/actions";
import {
  Archive,
  BarChart3,
  Database,
  FolderTree,
  History,
  Home,
  Import,
  LogOut,
  Search,
  Settings
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Irányítópult", icon: Home },
  { href: "/new-search", label: "Új keresés", icon: Search },
  { href: "/businesses", label: "Vállalkozások", icon: Database },
  { href: "/folders", label: "Mappák és listák", icon: FolderTree },
  { href: "/search-history", label: "Keresési előzmények", icon: History },
  { href: "/api-usage", label: "API-használat", icon: BarChart3 },
  { href: "/import", label: "Import", icon: Import },
  { href: "/trash", label: "Lomtár", icon: Archive },
  { href: "/settings", label: "Beállítások", icon: Settings }
];

export function AppShell({ children, email }: { children: React.ReactNode; email?: string }) {
  return (
    <div className="surface-grid min-h-screen bg-mist text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-ink text-white shadow-panel lg:block">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-forest text-white ring-1 ring-white/15">
              <Database className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold">Leadgyűjtő</p>
              <p className="mt-1 truncate text-xs text-white/52">{email ?? "Privát fiók"}</p>
            </div>
          </div>
        </div>
        <nav className="p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/68 transition hover:bg-white/9 hover:text-white"
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="absolute bottom-4 left-3 right-3">
          <button className="flex w-full items-center gap-3 rounded-md border border-white/10 px-3 py-2.5 text-sm font-medium text-white/68 transition hover:bg-white/9 hover:text-white">
            <LogOut className="size-4" aria-hidden="true" />
            Kilépés
          </button>
        </form>
      </aside>

      <header className="sticky top-0 z-20 border-b border-line bg-white/92 px-4 py-3 shadow-soft backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Leadgyűjtő</span>
          <form action={logoutAction}>
            <button aria-label="Kilépés" className="rounded-md border border-line p-2">
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex shrink-0 items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-xs font-medium shadow-soft">
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-md border border-white/80 bg-white/62 p-3 shadow-soft backdrop-blur sm:p-4 lg:p-5">
            {children}
          </div>
          <footer className="mt-8 flex items-center gap-2 border-t border-line pt-4 text-xs text-ink/55">
            <span>Helyadatok forrása:</span>
            <img
              src="https://www.gstatic.com/images/branding/googlelogo/1x/googlelogo_color_74x24dp.png"
              alt="Google"
              className="h-4 w-auto"
            />
          </footer>
        </div>
      </main>
    </div>
  );
}
