import { clsx } from "clsx";
import { NavLink } from "react-router-dom";
import { navItems } from "../../config/nav";

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border-subtle bg-bg-surface md:hidden">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            clsx(
              "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-center text-[10px] leading-tight font-medium transition-colors duration-150",
              isActive ? "text-accent" : "text-text-tertiary",
            )
          }
        >
          <Icon size={19} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
