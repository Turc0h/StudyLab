import {
  Calendar,
  FolderOpen,
  GraduationCap,
  Home,
  Network,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/workspace", label: "Estudiar", icon: GraduationCap },
  { to: "/calendar", label: "Organización", icon: Calendar },
  { to: "/files", label: "Biblioteca", icon: FolderOpen },
  { to: "/methods", label: "Repasar", icon: RotateCcw },
  { to: "/graph", label: "Progreso", icon: Network },
];
