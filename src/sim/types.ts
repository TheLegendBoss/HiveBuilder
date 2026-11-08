export type Side = 'P' | 'E';

/** What a squad member or enemy is built from. Content lives in src/data. */
export interface UnitTemplate {
  name: string;
  hp: number;
  /** built-in soak: absorbs damage after armor and is never refilled mid-fight */
  builtin: number;
  /** armor soak pool maximum (refilled by cards) */
  armor: number;
  /** gear source names, matching the `source` column of the deck CSV */
  gear: string[];
  ammo?: number;
  /** enemy only: action ids in order */
  pattern?: string[];
  tags?: string[];
}

export interface EnemyActionDef {
  id: string;
  name: string;
  kind: 'attack' | 'rally';
  dmg: number;
  melee: boolean;
  text: string;
}

export interface Unit {
  id: number;
  name: string;
  side: Side;
  hp: number;
  maxHp: number;
  builtin: number;
  armor: number;
  armorMax: number;
  gear: string[];
  lane: number | null;
  /** order of arrival, used for turn order inside a lane */
  arrived: number;
  downed: boolean;
  dead: boolean;
  stunned: boolean;
  exposed: boolean;
  /** rounds left; player units pay +1 fuel while it lasts */
  suppressed: number;
  counter: boolean;
  /** Sight Alignment is armed */
  sight: boolean;
  ammo: number;
  ammoMax: number;
  pattern: string[];
  /** index into pattern of the next action */
  pi: number;
  tags: string[];
}

export interface CardInst {
  iid: number;
  name: string;
}

export type Target = { k: 'unit'; id: number } | { k: 'lane'; side: Side; lane: number };

export type Ev =
  | { t: 'log'; text: string }
  | { t: 'played'; card: string | null; actor: number | null; burned: string[] }
  | { t: 'damage'; unit: number; hp: number; soaked: number; downed: boolean; killed: boolean; exposed: boolean }
  | { t: 'laneDamage'; side: Side; lane: number; amount: number; captured: boolean }
  | { t: 'heal'; unit: number; hp: number; revived: boolean }
  | { t: 'soakGain'; unit: number; amount: number }
  | { t: 'ammoGain'; unit: number; amount: number }
  | { t: 'status'; unit: number; status: 'stunned' | 'exposed' | 'suppressed' | 'counter' | 'sight'; on: boolean }
  | { t: 'deploy'; unit: number; lane: number }
  | { t: 'draw'; count: number; reshuffled: boolean }
  | { t: 'discard'; names: string[] }
  | { t: 'results'; cards: number[] }
  | { t: 'intentSkip'; unit: number }
  | { t: 'result'; result: 'win' | 'loss' };

export interface Battlefield {
  name: string;
  laneHp: [number, number, number];
}

export interface Scenario {
  name: string;
  battlefield: Battlefield;
  squad: UnitTemplate[];
  deck: Array<{ name: string; count: number }>;
  handSize: number;
  enemyName: string;
  /** deployed in order into lanes 1, 2, 3 during setup */
  enemyStart: UnitTemplate[];
  /** waiting units, drawn from the front */
  enemyDeck: UnitTemplate[];
  enemyActions: Record<string, EnemyActionDef>;
  setupRounds: number;
  /** most live-or-downed bodies per lane per side; null means no cap */
  laneCap: number | null;
  /** most cards a discard-and-draw can throw away */
  cycleLimit: number;
}

export interface Game {
  scenario: Scenario;
  rng: number;
  round: number;
  turn: Side;
  laneHP: Record<Side, number[]>;
  units: Unit[];
  hand: CardInst[];
  deck: CardInst[];
  discard: CardInst[];
  /** unit id that Focus Fire marked */
  focus: number | null;
  /** per lane: id of the unit that played Sync */
  sync: Array<number | null>;
  /** per lane: id of the unit that played Bulwark */
  bulwark: Array<number | null>;
  /** gear actions still discounted by Overdrive */
  discount: number;
  enemyDeck: number[];
  enemyStart: number[];
  /** rotating pointer into the enemy's live units */
  eptr: number;
  results: number[];
  result: 'win' | 'loss' | null;
  nextId: number;
  nextIid: number;
  arrivals: number;
  stats: Record<string, number>;
}

export type ActionKind = 'play' | 'basic' | 'deploy' | 'cycle';

/** A fully specified thing the player can do right now. */
export interface Action {
  key: string;
  kind: ActionKind;
  label: string;
  /** card name when kind is play */
  card?: string;
  /** the specific card in hand that gets played */
  cardIid?: number;
  /** acting unit */
  actor?: number;
  /** basic gear action name */
  gear?: string;
  targets: Target[];
  variant?: string;
  /** deploy: which unit and lane */
  unit?: number;
  lane?: number;
  /** fuel to pay after discounts and penalties */
  fuel: number;
  /** fuel before the Overdrive discount, to know if it gets used up */
  baseFuel: number;
  ammo: number;
}

export interface EnemyPlan {
  kind: 'deploy' | 'attack' | 'rally' | 'stunned' | 'pass';
  unit: number | null;
  name: string;
  dmg: number;
  melee: boolean;
  /** victim after Bulwark; a unit, or the lane HP being hit */
  victim: Target | null;
  /** a Bulwark moved the hit onto another unit */
  redirected: boolean;
  /** deploy and rally: the lane the new unit lands in */
  lane: number | null;
  /** pointer and pattern index after the action */
  nextPtr: number;
  nextPi: number | null;
  text: string;
}
