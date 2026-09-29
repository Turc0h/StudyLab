import {
  Calendar,
  FolderOpen,
  GraduationCap,
  Home,
  BrainCircuit,
  PenTool,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/academic", label: "Espacio", icon: BrainCircuit },
  { to: "/methods", label: "Estudiar", icon: GraduationCap },
  { to: "/calendar", label: "Agenda", icon: Calendar },
  { to: "/files", label: "Archivos", icon: FolderOpen },
  { to: "/blackboard", label: "Pizarra", icon: PenTool },
];
