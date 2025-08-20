export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  type: 'link' | 'dropdown';
  children?: NavItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

export type NavigationItem = NavItem | NavGroup;
