import { clsx } from "clsx";
import { NavLink } from "react-router-dom";
import { navItems } from "../../config/nav";

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border-subtle/80 bg-bg-surface/85 backdrop-blur-xl md:hidden">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            clsx(
              "relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-center text-[10px] leading-tight font-medium transition-all duration-150",
              isActive ? "text-accent" : "text-text-tertiary hover:text-text-secondary",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-accent shadow-[0_0_8px_var(--color-accent)]" />
              )}
              <Icon
                size={19}
                strokeWidth={1.75}
                className={clsx("transition-transform", isActive && "scale-110 drop-shadow-[0_0_6px_var(--color-accent)]")}
              />
              <span className="truncate">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
