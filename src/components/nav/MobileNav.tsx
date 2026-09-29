import { clsx } from "clsx";
import { NavLink } from "react-router-dom";
import { navItems } from "../../config/nav";

export function MobileNav() {
  return (
    <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border-subtle/90 bg-bg-elevated/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_rgba(15,30,35,0.08)] backdrop-blur-xl md:hidden">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => clsx(
            "relative flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 py-2 text-center text-[10px] font-medium leading-tight transition-colors",
            isActive ? "text-accent-primary" : "text-text-tertiary hover:text-text-secondary",
          )}
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute inset-x-4 top-0 h-0.5 rounded-b-full bg-accent-primary" aria-hidden="true" />}
              <Icon size={18} strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
              <span className="max-w-full truncate">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
