import { MajorGod } from '../interfaces/major-god.interface';

export const MAJOR_GODS_DATA: MajorGod[] = [
  // Greek Gods
  { id: 'zeus', name: 'Zeus', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/zeus.png', pantheon: 'Greek' },
  { id: 'poseidon', name: 'Poseidon', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/poseidon.png', pantheon: 'Greek' },
  { id: 'hades', name: 'Hades', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/hades.png', pantheon: 'Greek' },
  
  // Egyptian Gods
  { id: 'ra', name: 'Ra', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/ra.png', pantheon: 'Egyptian' },
  { id: 'isis', name: 'Isis', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/isis.png', pantheon: 'Egyptian' },
  { id: 'set', name: 'Set', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/set.png', pantheon: 'Egyptian' },
  
  // Norse Gods
  { id: 'odin', name: 'Odin', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/odin.png', pantheon: 'Norse' },
  { id: 'thor', name: 'Thor', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/thor.png', pantheon: 'Norse' },
  { id: 'loki', name: 'Loki', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/loki.png', pantheon: 'Norse' },
  { id: 'freyr', name: 'Freyr', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/freyr.png', pantheon: 'Norse' },
  
  // Atlantean Gods
  { id: 'kronos', name: 'Kronos', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/kronos.png', pantheon: 'Atlantean' },
  { id: 'oranos', name: 'Oranos', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/oranos.png', pantheon: 'Atlantean' },
  { id: 'gaia', name: 'Gaia', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/gaia.png', pantheon: 'Atlantean' },
  
  // Chinese Gods
  { id: 'fuxi', name: 'Fuxi', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/fuxi.png', pantheon: 'Chinese' },
  { id: 'nuwa', name: 'Nuwa', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/nuwa.png', pantheon: 'Chinese' },
  { id: 'shennong', name: 'Shennong', imagePath: 'assets/images/tiers/Major Gods (Archaic Age)/shennong.png', pantheon: 'Chinese' }
];

export const DEFAULT_SELECTED_GOD_ID = 'zeus';
