import {
  BrainCircuit,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  ListTree,
  Network,
  Play,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/academic", label: "Academic Hub", icon: GraduationCap },
  { to: "/workspace", label: "Workspace OS", icon: BrainCircuit },
  { to: "/graph", label: "Grafo Causal", icon: Network },
  { to: "/files", label: "Archivos", icon: FolderOpen },
  { to: "/methods", label: "Métodos", icon: ListTree },
  { to: "/session", label: "Sesión", icon: Play },
  { to: "/settings", label: "Configuración", icon: Settings },
];
