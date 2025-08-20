// Data interfaces for the Core Data Guide
export interface DataEntry {
  name: string;
  description: string;
  syntax?: string;
  parameters?: DataEntry[];
  deprecated?: boolean;
}

export interface DataSection {
  name: string;
  type: string;
  entries: DataEntry[];
}

export interface CoreData {
  'ProtoUnits': {
    'Attributes': DataEntry[];
    'Flags': DataEntry[];
  };
  'ProtoActions': {
    'Attributes': DataEntry[];
    'Flags': DataEntry[];
    'Modify Types': DataEntry[];
    'OnHitEffect Types': DataEntry[];
    'Tactic Data': DataEntry[];
  };
  'ProtoUnitCommands': {
    'Attributes': DataEntry[];
    'Flags': DataEntry[];
  };
  'Civilization/Major God Data': {
    'Attributes': DataEntry[];
    'Non-Civilization Attributes': DataEntry[];
  };
  'TechTree Core Data': {
    'Attributes': DataEntry[];
    'Flags': DataEntry[];
  };
}
