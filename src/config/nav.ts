import { FolderOpen, LayoutDashboard, ListTree, Play, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/files", label: "Archivos", icon: FolderOpen },
  { to: "/methods", label: "Métodos", icon: ListTree },
  { to: "/session", label: "Sesión", icon: Play },
  { to: "/settings", label: "Configuración", icon: Settings },
];
