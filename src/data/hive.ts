// The hive cutaway on the main menu. Widths are at the 1920 by 1080 reference.
export interface HiveFloor {
  id: string;
  name: string;
  width: number;
  /** the floor that is lit in the signal color on the menu */
  lit?: boolean;
}

export const hiveFloors: HiveFloor[] = [
  { id: 'spire', name: 'Spire', width: 210 },
  { id: 'upper', name: 'Upper Hive', width: 360 },
  { id: 'middle', name: 'Middle Hive. Sandbox floor.', width: 540, lit: true },
  { id: 'lower', name: 'Lower Hive', width: 690 },
  { id: 'under', name: 'Underhive', width: 810 },
  { id: 'sump', name: 'The Sump', width: 930 }
];

export const hiveGeometry = {
  floorHeight: 96,
  floorStep: 102,
  topPad: 24,
  windowPitchX: 18,
  windowPitchY: 15,
  windowW: 6,
  windowH: 4.5
};
