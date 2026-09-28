import {
  Calendar,
  FolderOpen,
  GraduationCap,
  Home,
  Network,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/methods", label: "Estudiar", icon: GraduationCap },
  { to: "/calendar", label: "Organización", icon: Calendar },
  { to: "/files", label: "Biblioteca", icon: FolderOpen },
  { to: "/graph", label: "Progreso", icon: Network },
];
