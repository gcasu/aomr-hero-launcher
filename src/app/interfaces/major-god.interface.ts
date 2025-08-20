export interface MajorGod {
  id: string;
  name: string;
  imagePath: string;
  pantheon: 'Greek' | 'Egyptian' | 'Norse' | 'Atlantean' | 'Chinese';
}

export type Pantheon = 'Greek' | 'Egyptian' | 'Norse' | 'Atlantean' | 'Chinese';
