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
  /** weapon slots on this chassis (default 2) */
  weaponSlots?: number;
  /** enemy only: action ids in order */
  pattern?: string[];
  tags?: string[];
}

export interface EnemyActionDef {
  id: string;
  name: string;
  kind: 'attack' | 'rally' | 'buff';
  dmg: number;
  melee: boolean;
  text: string;
  /** attack: the unit hit becomes Suppressed for this many rounds */
  suppress?: number;
  /** rally: most live bodies this side may have in the lane after the deploy (overrides the scenario cap) */
  cap?: number;
  /** buff: built-in soak gained */
  soak?: number;
  /** buff: self, or the best-fit friend in this lane carrying `tag` */
  scope?: 'self' | 'laneTag';
  tag?: string;
  /** buff: built-in soak never grows past this (working rule, stops runaway stacking) */
  soakCap?: number;
  /** attack: the unit hit catches fire for this many rounds */
  burn?: number;
  /** attack: the unit hit is Stunned */
  stun?: boolean;
  /** attack: hits every live unit in the lane with the most live squad members, instead of one unit */
  area?: boolean;
  /** attack: the victim can stand in any lane (the healthiest live unit that is not already stunned) */
  anyLane?: boolean;
  /** the unit spends one action charging before this fires */
  windup?: boolean;
  /** rally: units deployed in one go (default 1) */
  count?: number;
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
  /** rounds left on fire; the unit takes 1 damage at the end of each round (working: stands in for the burn cards) */
  burning: number;
  /** squad units only: rounds a stun outlasts the round it landed in */
  stunWait: number;
  /** enemy only: the action it is winding up, if any */
  charging: string | null;
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
  | { t: 'status'; unit: number; status: 'stunned' | 'exposed' | 'suppressed' | 'burning' | 'counter' | 'sight'; on: boolean }
  | { t: 'deploy'; unit: number; lane: number }
  | { t: 'draw'; count: number; reshuffled: boolean }
  | { t: 'discard'; names: string[] }
  | { t: 'results'; cards: number[] }
  | { t: 'initiative'; squad: InitiativeDraw; enemy: InitiativeDraw; first: Side }
  /** an attack leaving `from` (a unit, or null for no one in particular) for `to`; the damage events follow it */
  | { t: 'strike'; from: number | null; to: Target; melee: boolean; dmg: number }
  | { t: 'intentSkip'; unit: number }
  | { t: 'result'; result: 'win' | 'loss' };

/** One side's initiative card: a results value and a suit (0 clubs, 1 diamonds, 2 hearts, 3 spades; spades beat hearts beat diamonds beat clubs on a tie). */
export interface InitiativeDraw {
  value: number;
  suit: number;
}

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
  /** deployed in order during setup, into lanes 1, 2, 3 unless `startLanes` says otherwise */
  enemyStart: UnitTemplate[];
  /** lane index for each enemyStart unit */
  startLanes?: number[];
  /** win once this many rounds have passed after setup (the reactor shuts down) */
  surviveRounds?: number;
  /** win when every enemy with this tag is dead */
  bossTag?: string;
  /** when a unit with the leader tag dies, every unit with the follower tag dies too */
  linked?: Array<{ leader: string; followers: string }>;
  /** waiting units, drawn from the front */
  enemyDeck: UnitTemplate[];
  /** extra units that land in a lane in the same setup round as that lane's first unit */
  enemyAlso?: Array<{ unit: UnitTemplate; lane: number }>;
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
  enemyAlso: Array<{ id: number; lane: number }>;
  /** rotating pointer into the enemy's live units */
  eptr: number;
  results: number[];
  result: 'win' | 'loss' | null;
  /** how a fight ended: lanes taken, the board cleared, a boss killed, or a hold-out survived */
  how: 'lanes' | 'cleared' | 'boss' | 'held' | null;
  /** which side takes the first action of each round (the initiative winner; the squad until a roll says otherwise) */
  first: Side;
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
  kind: 'deploy' | 'attack' | 'rally' | 'buff' | 'stunned' | 'windup' | 'pass';
  unit: number | null;
  name: string;
  dmg: number;
  melee: boolean;
  /** victim after Bulwark; a unit, or the lane HP being hit */
  victim: Target | null;
  /** a Bulwark moved the hit onto another unit */
  redirected: boolean;
  /** attack: Suppressed rounds put on the unit hit */
  suppress?: number;
  burn?: number;
  stun?: boolean;
  /** attack: the lane whose live units all take the hit */
  areaLane?: number | null;
  /** buff: the friendly unit that gains the soak, and how much */
  ally?: number | null;
  soak?: number;
  /** deploy and rally: the lane the new unit lands in */
  lane: number | null;
  /** pointer and pattern index after the action */
  nextPtr: number;
  nextPi: number | null;
  text: string;
}
