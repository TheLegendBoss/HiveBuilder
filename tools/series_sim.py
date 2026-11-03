"""Multi-fight paper simulator: TSC starter deck vs the five test enemy forces.
All numbers are placeholders from docs/design.md. See playtests/02-tsc-series.md for assumptions.

Usage:
  python3 tools/series_sim.py single            # per-force win rates, baseline vs harsh
  python3 tools/series_sim.py series            # 5/10/15 fights in a row
  python3 tools/series_sim.py log FORCE SEED    # narrated single fight (harsh config)
"""
import random, sys, itertools, statistics, collections, math

CAP = 2
HAND = 7
LANE_HP = [3, 4, 3]
IDS = itertools.count(1)

DECK = {
    'Burst Fire': 4, 'Suppressing Fire': 2, 'Brace': 2, 'Focus Fire': 2, 'Shield Up': 2,
    'Counter': 1, 'Bulwark': 1, 'Sustained Fire': 2, 'Pin Down': 1, 'Overdrive': 1,
    'Jury-Rig': 1, 'Field Fix': 1, 'Patch': 1, 'Ammo Crate': 3, 'Repair Parts': 2,
    'Sight Alignment': 1, 'Paint Target': 1, 'Data Burst': 1, 'Sync': 1,
}
FV = {'Ammo Crate': 2, 'Repair Parts': 2, 'Repair Pack': 2}
GEAR = {
    'Burst Fire': 'autogun', 'Suppressing Fire': 'autogun', 'Brace': 'plating',
    'Focus Fire': 'lineskill', 'Shield Up': 'shield', 'Counter': 'shield', 'Bulwark': 'vanguard',
    'Sustained Fire': 'heavy', 'Pin Down': 'heavy', 'Overdrive': 'heavyskill',
    'Jury-Rig': 'repairkit', 'Field Fix': 'repairkit', 'Patch': 'repairskill',
    'Ammo Crate': None, 'Repair Parts': None, 'Repair Pack': None, 'Sight Alignment': 'laser', 'Paint Target': 'laser',
    'Data Burst': 'uplink', 'Sync': 'uplink',
}
FUEL_COST = {'Suppressing Fire': 1}

BASE = dict(name='baseline', soak_scale=1.0, enemy_bonus=0)
BODY_HP = 12
TENT_HP = 2
TENT_CAP = 3             # max tentacles per lane
SPAWN_MODE = 'empty_only'  # 'empty_only': spawn only when the lane has no tentacle; 'fill_to_cap': spawn whenever the squid acts in an open lane with fewer than the cap
BODY_ATTACK = 2          # damage of the squid body's attack in a closed lane
CHAIN = True             # when a tentacle attacks, another tentacle in the lane attacks for free
SPAWN_HP = None          # HP of spawned tentacles (None = TENT_HP)
SPAWN_SICK = False       # spawned tentacle loses its first action
SPAWN_ONLY_UNCAPTURED = False  # squid does not spawn in lanes whose lane HP is already broken
HARSH = dict(name='harsh (half soak, +1 enemy damage)', soak_scale=0.5, enemy_bonus=1)


class Unit:
    def __init__(s, name, side, hp, builtin=0, armor=0, gear=(), pattern=(), kind=''):
        s.name, s.side, s.hp, s.maxhp = name, side, hp, hp
        s.builtin, s.builtin_max, s.armor, s.armor_max = builtin, builtin, armor, armor
        s.gear, s.lane, s.kind = set(gear), None, kind
        s.downed = s.dead = s.stunned = s.exposed = s.counter = False
        s.sight = 0
        s.ammo = 4 if 'heavy' in s.gear else 0
        s.pattern, s.pi, s.pending = list(pattern), 0, None
        s.id = next(IDS)

    @property
    def live(s):
        return not s.downed and not s.dead

    def total(s):
        return s.hp + s.armor + s.builtin


def make_squad(cfg):
    if cfg.get('chassis_soak'):
        # built-in soak: small chassis 1, large chassis 2. Armor soak: 2 per armor piece.
        sm, lg = cfg['chassis_soak']
        ap = cfg.get('armor_per_piece', 2)
        return [
            Unit('Line A', 'P', 5, sm, ap, {'autogun', 'plating', 'lineskill', 'laser'}),
            Unit('Line B', 'P', 5, sm, ap, {'autogun', 'plating', 'lineskill', 'uplink'}),
            Unit('Vanguard', 'P', 6, lg, 2 * ap, {'shield', 'vanguard', 'plating'}),
            Unit('Heavy', 'P', 6, lg, ap, {'heavy', 'heavyskill', 'plating'}),
            Unit('Repair', 'P', 5, sm, ap, {'repairkit', 'repairskill', 'plating'}),
        ]
    def soak(x):
        f = math.floor if cfg.get('round') == 'floor' else math.ceil
        return int(f(x * cfg['soak_scale']))
    mk = lambda n, hp, arm, gear: Unit(n, 'P', hp, soak(2), soak(arm), gear)
    return [
        mk('Line A', 5, 3, {'autogun', 'plating', 'lineskill', 'laser'}),
        mk('Line B', 5, 3, {'autogun', 'plating', 'lineskill', 'uplink'}),
        mk('Vanguard', 6, 5, {'shield', 'vanguard', 'plating'}),
        mk('Heavy', 6, 3, {'heavy', 'heavyskill', 'plating'}),
        mk('Repair', 5, 3, {'repairkit', 'repairskill', 'plating'}),
    ]


def make_force(name):
    scav = lambda: Unit('Scavver', 'E', 3, pattern=['pot', 'shiv'])
    if name == 'Scavver pack':
        return [scav(), Unit('Scavver Chief', 'E', 5, pattern=['rally', 'bludgeon']), scav()], [scav(), scav()], None
    if name == 'Slag hauler':
        hand = lambda: Unit('Furnace Hand', 'E', 4, pattern=['hammer', 'brace'])
        return [hand(), Unit('Slag Hauler', 'E', 8, builtin=4, pattern=['shove', 'heavy_swing']), hand()], [], None
    if name == 'Sump sniper team':
        guard = lambda: Unit('Sump Guard', 'E', 3, pattern=['stock_bash', 'cover'])
        sniper = lambda: Unit('Sump Sniper', 'E', 4, pattern=['mark', 'long_shot'])
        return [guard(), sniper(), guard()], [sniper(), guard()], None
    if name == 'Deserter patrol':
        guard = lambda: Unit('Deserter Guard', 'E', 4, builtin=2, pattern=['carbine', 'baton'])
        return [guard(), Unit('Deserter Captain', 'E', 6, pattern=['sidearm', 'rally_order']), guard()], [guard()], None
    if name == 'Sump squid':
        t = lambda: Unit('Tentacle', 'E', TENT_HP, pattern=['lash', 'grapple'], kind='part')
        body = Unit('Squid Body', 'E', BODY_HP, pattern=['ink'], kind='body')
        return [t(), t(), t()], [], body
    raise KeyError(name)


FORCES = ['Scavver pack', 'Slag hauler', 'Sump sniper team', 'Sump squid', 'Deserter patrol']


class Game:
    def __init__(s, seed, squad, force, cfg, log=False):
        s.r = random.Random(seed)
        s.cfg, s.logon, s.out = cfg, log, []
        s.force_name = force
        s.round = 0
        s.laneHP = {'P': list(LANE_HP), 'E': list(LANE_HP)}
        s.lanes = {'P': [[], [], []], 'E': [[], [], []]}
        s.focus, s.sync, s.bulwark, s.cover = None, [None] * 3, [None] * 3, [None] * 3
        s.rally_bonus = [False] * 3
        s.discount = 0
        s.stats = collections.Counter()
        s.punits = squad
        for u in squad:
            u.lane = None; u.stunned = u.exposed = u.counter = False; u.sight = 0
            u.builtin = u.builtin_max
            if cfg.get('armor_refill', True):
                u.armor = u.armor_max
            u.pending = None
        deck = dict(DECK)
        if cfg.get('heal_cards'):
            deck['Repair Pack'] = cfg['heal_cards']
        s.pdeck = [c for c, n in deck.items() for _ in range(n)]
        s.r.shuffle(s.pdeck)
        s.pdisc, s.hand = [], []
        s.estart, s.edeck, s.body = make_force(force)
        s.monster = s.body is not None
        s.regrown = set()
        s.eptr = 0

    def log(s, m):
        if s.logon:
            s.out.append(m)

    # ---------- helpers
    def units(s, side, lane, live=True):
        return [u for u in s.lanes[side][lane] if (u.live if live else True)]

    @staticmethod
    def adj(l):
        return [1] if l != 1 else [0, 2]

    def lane_open(s, L):
        """enemy lane captured (or, for the squid, cleared of tentacles)."""
        return s.laneHP['E'][L] == 0

    def hittable_lane(s, L):
        if s.units('E', L):
            return False
        if s.laneHP['E'][L] > 0:
            return True
        return s.monster and s.body.live

    def lane_pool(s, L):
        return s.laneHP['E'][L] if s.laneHP['E'][L] > 0 else s.body.hp

    def lane_hit(s, L, d):
        if s.laneHP['E'][L] == 0 and s.monster:
            s.body.hp = max(0, s.body.hp - d)
            if s.body.hp == 0:
                s.body.dead = True
            s.log(f"    hits the squid body for {d} -> {s.body.hp}")
        else:
            s.laneHP['E'][L] = max(0, s.laneHP['E'][L] - d)
            s.log(f"    hits enemy lane {L+1} HP for {d} -> {s.laneHP['E'][L]}"
                  + (" CAPTURED" if s.laneHP['E'][L] == 0 else ""))

    def hit(s, u, d):
        if u.exposed and d > 0:
            d += 1; u.exposed = False
        a = min(u.armor, d); u.armor -= a; d -= a
        b = min(u.builtin, d); u.builtin -= b; d -= b
        u.hp -= d
        res = ''
        if u.hp <= 0:
            u.hp = 0
            if u.side == 'P':
                u.downed = True; res = ' DOWNED'
            else:
                u.dead = True; res = ' killed'
        return res

    def draw(s):
        while len(s.hand) < HAND:
            if not s.pdeck:
                if not s.pdisc:
                    break
                s.pdeck = s.pdisc; s.pdisc = []; s.r.shuffle(s.pdeck)
                s.stats['reshuffles'] += 1
            s.hand.append(s.pdeck.pop())

    def bonus(s, actor, tgt):
        b = 0
        if tgt is not None and s.focus == tgt.id:
            b += 1
        if actor.sight and 'autogun' in actor.gear:
            b += 1
        if s.sync[actor.lane] and s.sync[actor.lane] != actor.id:
            b += 1
        return b

    def clear_bonus(s, actor):
        s.focus = None
        if 'autogun' in actor.gear:
            actor.sight = 0
        if s.sync[actor.lane] and s.sync[actor.lane] != actor.id:
            s.sync[actor.lane] = None

    # ---------- player option generation
    def target_lanes(s, actor):
        l = actor.lane
        out = [l]
        if s.lane_open(l):
            out += s.adj(l)
        return out

    def open_count(s):
        return sum(1 for L in range(3) if s.lane_open(L))

    def atk_targets(s, actor, dmg):
        res = []
        for L in s.target_lanes(actor):
            en = s.units('E', L)
            if en:
                for t in en:
                    d = dmg + s.bonus(actor, t) + (1 if t.exposed else 0)
                    real = min(d, t.total())
                    v = real + (3 if real >= t.total() else 0) + (1.5 if 'Chief' in t.name or 'Captain' in t.name or 'Sniper' in t.name else 0)
                    res.append((v, 'unit', t))
            elif s.hittable_lane(L):
                d = dmg + s.bonus(actor, None)
                pool = s.lane_pool(L)
                real = min(d, pool)
                on_body = s.monster and s.laneHP['E'][L] == 0
                v = real * (1.0 if on_body else 1.3)
                if on_body and real >= pool:
                    v += 8
                elif not on_body and real >= pool:
                    v += 3
                    if not s.monster and s.open_count() == 1:
                        v += 6
                res.append((v, 'lane', L))
        return res

    def do_attack(s, actor, kind, tgt, dmg):
        if kind == 'unit' and tgt.name == 'Sump Sniper' and s.cover[tgt.lane]:
            g = [x for x in s.units('E', tgt.lane) if x.id == s.cover[tgt.lane]]
            s.cover[tgt.lane] = None
            if g:
                tgt = g[0]; s.log("    a Sump Guard takes the shot instead")
        d = dmg + s.bonus(actor, tgt if kind == 'unit' else None)
        if kind == 'unit':
            res = s.hit(tgt, d)
            s.log(f"    {actor.name} (lane {actor.lane+1}) hits {tgt.name} for {d}{res}")
        else:
            s.log(f"    {actor.name} (lane {actor.lane+1}):")
            s.lane_hit(tgt, d)
        s.clear_bonus(actor)

    def options(s):
        opts = []
        P = [u for u in s.punits if u.lane is not None and u.live and not u.stunned]
        undeployed = [u for u in s.punits if u.lane is None and u.live]
        setup = s.round <= 3
        for u in undeployed:
            for L in range(3):
                if len(s.units('P', L, live=False)) >= CAP:
                    continue
                if setup:
                    if s.lanes['P'][L]:
                        continue
                    live_names = [x.name for x in s.punits if x.live]
                    pref = [n for n in ('Line A', 'Vanguard', 'Line B', 'Heavy', 'Repair') if n in live_names]
                    want = {0: pref[0], 1: pref[1] if len(pref) > 1 else pref[0], 2: pref[2] if len(pref) > 2 else pref[0]}[L]
                    if u.name != want:
                        continue
                    opts.append(dict(v=100, kind='deploy', unit=u, lane=L, fuel=0))
                else:
                    if u.name == 'Heavy':
                        v = 1.2 + 0.8 * len(s.units('E', L)) + (0.5 if len(s.units('P', L)) else 0)
                    elif u.name == 'Repair':
                        dmg = sum(x.maxhp - x.hp + x.armor_max - x.armor for x in P)
                        v = 0.6 + 0.35 * dmg + (0.5 * len(s.units('P', L)) if dmg else 0)
                    else:
                        v = 1.5 if not s.units('P', L) else 0.3
                    if s.cfg.get('early_deploy'):
                        v = max(v, 2.6)
                    opts.append(dict(v=v, kind='deploy', unit=u, lane=L, fuel=0))
        if setup:
            return opts, {}
        hand_names = sorted(set(s.hand))
        cardbest = {c: 0.0 for c in hand_names}

        def add(v, run, card=None, fuel=0, actor=None):
            opts.append(dict(v=v, kind='play' if card else 'basic', card=card, fuel=fuel, run=run, actor=actor))
            if card:
                cardbest[card] = max(cardbest[card], v)

        for c in hand_names:
            g = GEAR[c]
            actors = [u for u in P if g is None or g in u.gear]
            if g is None:
                actors = actors[:1]
            fuel = FUEL_COST.get(c, 0)
            for a in actors:
                if c == 'Burst Fire':
                    for v, k, t in s.atk_targets(a, 3):
                        add(v, lambda a=a, k=k, t=t: s.do_attack(a, k, t, 3), c, fuel, a)
                elif c == 'Suppressing Fire':
                    en = s.units('E', a.lane)
                    if en:
                        v = sum(min(1 + (1 if e.exposed else 0), e.total()) + (3 if e.total() <= 1 else 0) for e in en)
                        def run(a=a, en=en):
                            for e in list(en):
                                s.log(f"    {a.name} plays Suppressing Fire: {e.name} takes 1{s.hit(e, 1)}")
                            s.clear_bonus(a)
                        add(v, run, c, fuel, a)
                    elif s.hittable_lane(a.lane):
                        def run(a=a):
                            s.log(f"    {a.name} plays Suppressing Fire:"); s.lane_hit(a.lane, 1)
                        add(1.0, run, c, fuel, a)
                elif c == 'Sustained Fire' and a.ammo >= 1:
                    en = s.units('E', a.lane)
                    if en:
                        tg = sorted(en, key=lambda e: e.total())[:2]
                        v = sum(min(2 + (1 if e.exposed else 0), e.total()) + (3 if e.total() <= 2 else 0) for e in tg)
                        def run(a=a, tg=tg):
                            a.ammo -= 1
                            for e in tg:
                                s.log(f"    {a.name} plays Sustained Fire: {e.name} takes 2{s.hit(e, 2)}")
                        add(v, run, c, 0, a)
                    elif s.hittable_lane(a.lane):
                        def run(a=a):
                            a.ammo -= 1
                            s.log(f"    {a.name} plays Sustained Fire:"); s.lane_hit(a.lane, 2)
                        add(min(2, s.lane_pool(a.lane)) * 1.2, run, c, 0, a)
                elif c == 'Pin Down' and a.ammo >= 2:
                    en = [e for e in s.units('E', a.lane) if not e.stunned]
                    if en:
                        t = sorted(en, key=lambda e: (e.pending is None, 'Chief' not in e.name, e.hp))[0]
                        def run(a=a, t=t):
                            a.ammo -= 2; t.stunned = True; t.pending = None
                            s.log(f"    {a.name} plays Pin Down: {t.name} stunned")
                        add(2.2 + (1 if 'Chief' in t.name or t.pending else 0) + (1.5 if t.pending else 0), run, c, 0, a)
                elif c in ('Brace', 'Jury-Rig', 'Repair Parts', 'Shield Up'):
                    amt = {'Brace': 2, 'Jury-Rig': 2, 'Repair Parts': 3, 'Shield Up': 3}[c]
                    allies = [a] if c == 'Shield Up' else (P if c == 'Repair Parts' else s.units('P', a.lane))
                    for t in allies:
                        real = min(amt, t.armor_max - t.armor)
                        if real > 0:
                            urgency = 1.0 + (0.5 if t.hp <= 3 else 0) + (0.3 if s.units('E', t.lane) else -0.3)
                            def run(t=t, real=real, a=a, c=c):
                                t.armor += real; s.log(f"    {a.name} plays {c}: {t.name} +{real} soak")
                            add(real * 0.7 * urgency, run, c, fuel, a)
                elif c == 'Counter' and not a.counter and s.units('E', a.lane):
                    def run(a=a):
                        a.counter = True; s.log(f"    {a.name} plays Counter")
                    add(1.0, run, c, fuel, a)
                elif c == 'Bulwark' and len(s.units('P', a.lane)) >= 2 and not s.bulwark[a.lane] and s.units('E', a.lane):
                    def run(a=a):
                        s.bulwark[a.lane] = a.id; s.log(f"    {a.name} plays Bulwark")
                    add(1.4, run, c, fuel, a)
                elif c == 'Focus Fire':
                    en = s.units('E', a.lane)
                    if en and s.focus is None:
                        t = sorted(en, key=lambda e: e.total())[0]
                        def run(a=a, t=t):
                            s.focus = t.id; s.log(f"    {a.name} plays Focus Fire on {t.name}")
                        add(1.1, run, c, fuel, a)
                elif c == 'Overdrive':
                    add(0.4, lambda a=a: (setattr(s, 'discount', s.discount + 1), s.log(f"    {a.name} plays Overdrive")), c, fuel, a)
                elif c == 'Field Fix':
                    sick = [u for u in P if u.exposed or u.stunned]
                    if sick:
                        def run(a=a, t=sick[0]):
                            t.exposed = t.stunned = False; s.log(f"    {a.name} plays Field Fix on {t.name}")
                        add(1.2, run, c, fuel, a)
                elif c == 'Patch':
                    for t in [u for u in s.punits if u.lane is not None and u.hp < u.maxhp]:
                        def run(a=a, t=t):
                            t.hp = min(t.maxhp, t.hp + 2); t.downed = False
                            s.log(f"    {a.name} plays Patch: {t.name} +2 HP")
                        add(min(2, t.maxhp - t.hp) * 1.2 + (3 if t.downed else 0), run, c, fuel, a)
                elif c == 'Repair Pack':
                    for t in [u for u in s.punits if u.lane is not None and u.hp < u.maxhp]:
                        amt = s.cfg.get('heal_amount', 2)
                        def run(a=a, t=t, amt=amt):
                            t.hp = min(t.maxhp, t.hp + amt); t.downed = False
                            s.log(f"    Repair Pack: {t.name} +{amt} HP")
                        add(min(amt, t.maxhp - t.hp) * 1.2 + (3 if t.downed else 0), run, c, 0, a)
                elif c == 'Ammo Crate':
                    hv = [u for u in s.punits if 'heavy' in u.gear and u.lane is not None and u.live]
                    if hv and hv[0].ammo < 4:
                        def run(a=a, h=hv[0]):
                            h.ammo = min(4, h.ammo + 2); s.log(f"    Ammo Crate: {h.name} ammo -> {h.ammo}")
                        add(min(2, 4 - hv[0].ammo) * 0.8, run, c, 0, a)
                elif c == 'Sight Alignment' and not a.sight:
                    def run(a=a):
                        a.sight = 1; s.log(f"    {a.name} plays Sight Alignment")
                    add(1.0, run, c, fuel, a)
                elif c == 'Paint Target':
                    en = [e for e in s.units('E', a.lane) if not e.exposed]
                    if en:
                        t = sorted(en, key=lambda e: -e.hp)[0]
                        def run(a=a, t=t):
                            t.exposed = True; s.log(f"    {a.name} plays Paint Target: {t.name} Exposed")
                        add(1.4, run, c, fuel, a)
                elif c == 'Sync':
                    if len(s.units('P', a.lane)) >= 2 and not s.sync[a.lane]:
                        def run(a=a):
                            s.sync[a.lane] = a.id; s.log(f"    {a.name} plays Sync")
                        add(0.9, run, c, fuel, a)
        for a in P:
            if 'autogun' in a.gear:
                cost = max(0, 1 - (1 if a.sight else 0))
                for v, k, t in s.atk_targets(a, 2):
                    add(v - 0.5 * cost, lambda a=a, k=k, t=t: s.do_attack(a, k, t, 2), None, cost, a)
            elif 'heavy' in a.gear and a.ammo >= 1:
                en = s.units('E', a.lane)
                if en:
                    tg = sorted(en, key=lambda e: e.total())[:2]
                    v = sum(min(2, e.total()) + (3 if e.total() <= 2 else 0) for e in tg) - 1.0
                    def run(a=a, tg=tg):
                        a.ammo -= 1
                        for e in tg:
                            s.log(f"    {a.name} Autofire: {e.name} takes 2{s.hit(e, 2)}")
                    add(v, run, None, 2, a)
            else:
                for v, k, t in s.atk_targets(a, 1):
                    add(v - 0.5, lambda a=a, k=k, t=t: s.do_attack(a, k, t, 1), None, 1, a)
        dead = [c for c in s.hand if cardbest.get(c, 0) == 0]
        opts.append(dict(v=0.35 * min(3, len(dead)), kind='cycle', fuel=0, dead=dead))
        return opts, cardbest

    def player_action(s):
        s.draw()
        opts, cardbest = s.options()
        s.log(f"  Hand: {', '.join(sorted(s.hand))}")
        feas = []
        for o in opts:
            fuel = o.get('fuel', 0)
            if s.discount and fuel > 0:
                fuel -= 1
            others = list(s.hand)
            if o.get('card'):
                others.remove(o['card'])
            if sum(FV.get(c, 1) for c in others) >= fuel:
                o['fuel_eff'] = fuel
                o['v_eff'] = o['v'] - 0.45 * fuel
                feas.append(o)
        best = max(feas, key=lambda o: (o['v_eff'], s.r.random()))
        if best['kind'] == 'deploy':
            u = best['unit']; u.lane = best['lane']; s.lanes['P'][u.lane].append(u)
            s.log(f"    deploys {u.name} to lane {u.lane+1}")
            return
        if best['kind'] == 'cycle':
            dead = best['dead'][:3]
            for c in dead:
                s.hand.remove(c); s.pdisc.append(c)
            s.stats['cycled'] += len(dead)
            s.log(f"    discards {', '.join(dead) or 'nothing'} and draws")
            return
        fuel = best['fuel_eff']
        if s.discount and best.get('fuel', 0) > 0:
            s.discount -= 1
        if best.get('card'):
            s.hand.remove(best['card']); s.pdisc.append(best['card']); s.stats['played'] += 1
        burned = []
        while fuel > 0:
            c = sorted(s.hand, key=lambda c: (cardbest.get(c, 0) / FV.get(c, 1), -FV.get(c, 1)))[0]
            s.hand.remove(c); s.pdisc.append(c); burned.append(c)
            fuel -= FV.get(c, 1)
        s.stats['burned'] += len(burned)
        if burned:
            s.log(f"    burns {', '.join(burned)} for fuel")
        best['run']()

    # ---------- enemy
    def dmg(s, base):
        b = s.cfg['enemy_bonus']
        if isinstance(b, dict):
            b = b.get(s.force_name, 0)
        return base + b

    def enemy_hit_target(s, u):
        lane = u.lane
        tg = s.units('P', lane)
        if tg:
            return 'unit', tg
        if s.laneHP['P'][lane] > 0:
            return 'lane', lane
        for L in s.adj(lane):
            tg = s.units('P', L)
            if tg:
                return 'unit', tg
            if s.laneHP['P'][L] > 0:
                return 'lane', L
        return None, None

    def enemy_attack(s, u, base, melee, prefer_exposed=False):
        d = s.dmg(base)
        if u.name == 'Deserter Guard' and s.rally_bonus[u.lane]:
            d += 1; s.rally_bonus[u.lane] = False
        kind, tg = s.enemy_hit_target(u)
        if kind is None:
            return
        if kind == 'lane':
            s.laneHP['P'][tg] = max(0, s.laneHP['P'][tg] - d)
            s.log(f"    {u.name} (lane {u.lane+1}) hits your lane {tg+1} HP for {d} -> {s.laneHP['P'][tg]}"
                  + (" CAPTURED" if s.laneHP['P'][tg] == 0 else ""))
            return
        pool = tg
        if prefer_exposed and any(x.exposed for x in tg):
            pool = [x for x in tg if x.exposed]
        t = sorted(pool, key=lambda x: (x.hp, x.armor + x.builtin))[0]
        L = t.lane
        if s.bulwark[L] and s.bulwark[L] != t.id:
            v = [x for x in s.units('P', L) if x.id == s.bulwark[L]]
            if v:
                t = v[0]; s.bulwark[L] = None; s.log("    Bulwark redirects the attack")
        res = s.hit(t, d)
        s.log(f"    {u.name} (lane {u.lane+1}) hits {t.name} for {d}{res}  [{t.name} HP {t.hp} soak {t.armor+t.builtin}]")
        if t.counter and u.live:
            t.counter = False
            s.log(f"      Counter: {u.name} takes 2{s.hit(u, 2)}")
        if melee and t.live and u.live:
            s.log(f"      {t.name} fights back for 1 -> {u.name}{s.hit(u, 1)}")

    def legal(s, u, act):
        if act == 'rally':
            return bool(s.edeck) and len(s.units('E', u.lane, live=False)) < CAP
        if act == 'rally_order':
            return any(x is not u and x.name == 'Deserter Guard' for x in s.units('E', u.lane))
        if act == 'cover':
            return any(x.name == 'Sump Sniper' for x in s.units('E', u.lane))
        if act == 'mark':
            return bool(s.units('P', u.lane))
        return True

    def perform(s, u, act):
        if act == 'pot': s.enemy_attack(u, 2, False)
        elif act == 'shiv': s.enemy_attack(u, 1, True)
        elif act == 'bludgeon': s.enemy_attack(u, 2, True)
        elif act == 'shove': s.enemy_attack(u, 1, True)
        elif act == 'hammer': s.enemy_attack(u, 2, True)
        elif act == 'brace':
            u.builtin += 2; s.log(f"    {u.name} (lane {u.lane+1}) braces: +2 soak")
        elif act == 'stock_bash': s.enemy_attack(u, 1, True)
        elif act == 'carbine': s.enemy_attack(u, 2, False)
        elif act == 'sidearm': s.enemy_attack(u, 2, False)
        elif act == 'baton': s.enemy_attack(u, 1, True)
        elif act == 'lash':
            s.enemy_attack(u, 2, True); s.chain(u)
        elif act == 'grapple':
            s.enemy_attack(u, 1, True); s.chain(u)
        elif act in ('heavy_swing', 'long_shot'):
            u.pending = act; s.log(f"    {u.name} (lane {u.lane+1}) winds up {act.replace('_', ' ')}")
        elif act == 'mark':
            t = sorted(s.units('P', u.lane), key=lambda x: x.hp)[0]
            t.exposed = True; s.log(f"    {u.name} marks {t.name}: Exposed")
        elif act == 'cover':
            s.cover[u.lane] = u.id; s.log(f"    {u.name} (lane {u.lane+1}) covers the snipers")
        elif act == 'rally_order':
            s.rally_bonus[u.lane] = True; s.log(f"    {u.name} gives a rally order in lane {u.lane+1}")
        elif act == 'rally':
            new = s.edeck.pop(0); new.lane = u.lane; s.lanes['E'][u.lane].append(new)
            s.log(f"    {u.name} rallies: a Scavver is deployed to lane {u.lane+1}")
        elif act == 'ink':
            lanes = sorted(range(3), key=lambda L: -len(s.units('P', L)))
            L = lanes[0]
            for x in s.units('P', L):
                x.exposed = True
            s.log(f"    the squid inks lane {L+1}: your units there are Exposed")

    def chain(s, u):
        if not CHAIN:
            return
        others = [x for x in s.units('E', u.lane) if x is not u and not x.stunned]
        if others:
            s.log("    another tentacle attacks for free")
            s.enemy_attack(others[0], 2, True)

    def resolve_pending(s):
        for L in range(3):
            for u in s.units('E', L):
                if u.pending:
                    act, u.pending = u.pending, None
                    if act == 'heavy_swing':
                        s.log(f"    {u.name} releases heavy swing")
                        s.enemy_attack(u, 4, True)
                    else:
                        s.log(f"    {u.name} fires long shot")
                        s.enemy_attack(u, 3, False, prefer_exposed=True)

    def enemy_action(s):
        if s.round <= 3:
            u = s.estart[s.round - 1]
            lane = s.round - 1
            u.lane = lane; s.lanes['E'][lane].append(u)
            s.log(f"    deploys {u.name} to lane {lane+1}")
            return
        s.resolve_pending()
        if s.result():
            return
        # fill empty lanes / regrow
        for L in range(3):
            if not s.units('E', L):
                if s.monster:
                    continue
                elif s.edeck:
                    u = s.edeck.pop(0); u.lane = L; s.lanes['E'][L].append(u)
                    s.log(f"    deploys {u.name} to empty lane {L+1}")
                    return
        units = []
        for L in range(3):
            us = s.units('E', L)
            if not s.monster:
                units += us
                continue
            open_lane = s.laneHP['E'][L] > 0
            if us and not (SPAWN_MODE == 'fill_to_cap' and open_lane and len(us) < TENT_CAP):
                units += us
            else:
                sp = Unit('Squid body', 'E', 1, kind='spawner'); sp.lane = L
                units.append(sp)
        if s.monster and s.body.live:
            units.append(s.body)
        if not units:
            s.log("    (no units; passes)")
            return
        n = len(units)
        for k in range(n):
            u = units[(s.eptr + k) % n]
            if u.stunned:
                u.stunned = False; u.pending = None
                s.eptr = (s.eptr + k + 1) % n
                s.log(f"    {u.name} is stunned and loses its action")
                return
            if u.kind == 'spawner':
                s.eptr = (s.eptr + k + 1) % n
                L = u.lane
                if s.laneHP['E'][L] > 0 and len(s.units('E', L)) < TENT_CAP:
                    t = Unit('Tentacle', 'E', SPAWN_HP or TENT_HP, pattern=['lash', 'grapple'], kind='part')
                    t.stunned = SPAWN_SICK
                    t.lane = L; s.lanes['E'][L].append(t)
                    s.log(f"    the squid acts in lane {L+1} and generates a new tentacle")
                else:
                    s.log(f"    the squid body attacks in closed lane {L+1}")
                    s.enemy_attack(u, BODY_ATTACK, False)
                return
            if u.kind == 'body':
                s.eptr = (s.eptr + k + 1) % n
                s.perform(u, 'ink')
                return
            for j in range(len(u.pattern)):
                act = u.pattern[(u.pi + j) % len(u.pattern)]
                if s.legal(u, act):
                    u.pi = (u.pi + j + 1) % len(u.pattern)
                    s.eptr = (s.eptr + k + 1) % n
                    s.perform(u, act)
                    return
        s.log("    (nothing legal; passes)")

    def result(s):
        if s.monster:
            if s.round > 3 and not s.body.live:
                return 'win'
        elif sum(1 for x in s.laneHP['E'] if x == 0) >= 2:
            return 'win'
        if sum(1 for x in s.laneHP['P'] if x == 0) >= 2:
            return 'loss'
        return None

    def run(s, maxr=90):
        while s.round < maxr:
            s.round += 1
            s.log(f"Round {s.round}")
            s.log("  Player:")
            s.player_action()
            r = s.result()
            if r:
                return r
            s.log("  Enemy:")
            s.enemy_action()
            r = s.result()
            if r:
                return r
        return 'timeout'


# ---------- series driver
def clinic(squad, hp):
    for _ in range(hp):
        cand = [u for u in squad if u.hp < u.maxhp]
        if not cand:
            return
        min(cand, key=lambda u: u.hp / u.maxhp).hp += 1


def run_series(seed, n, cfg, mix, rest):
    rng = random.Random(seed)
    squad = make_squad(cfg)
    rec = []
    for i in range(n):
        f = rng.choice(mix)
        g = Game(rng.random(), squad, f, cfg)
        res = g.run()
        rec.append(dict(force=f, res=res, rounds=g.round - 3,
                        downed=sum(u.downed for u in squad),
                        hp=sum(u.hp for u in squad)))
        if res != 'win':
            return i, rec
        for u in squad:
            if u.downed:
                u.downed = False; u.hp = 1
        if rest and (i + 1) % 5 == 0:
            clinic(squad, rest)
    return n, rec


def pct(x):
    return f"{100*x:.0f}%"


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'log':
        force = sys.argv[2]
        cfg = HARSH
        g = Game(int(sys.argv[3]), make_squad(cfg), force, cfg, log=True)
        res = g.run()
        print('\n'.join(g.out))
        print(f"\nRESULT: {res} after {g.round} rounds ({g.round-3} after setup). downed {[u.name for u in g.punits if u.downed]}")
    elif mode == 'single':
        N = 1000
        print(f"{'force':20s} {'config':8s} win%  actions  avgDowned  HPleft/27")
        for cfg in (BASE, HARSH):
            for f in FORCES:
                wins = 0; rounds = []; down = []; hp = []
                for sd in range(N):
                    squad = make_squad(cfg)
                    g = Game(sd, squad, f, cfg)
                    r = g.run()
                    wins += r == 'win'; rounds.append(g.round - 3)
                    down.append(sum(u.downed for u in squad)); hp.append(sum(u.hp for u in squad))
                print(f"{f:20s} {cfg['name'][:8]:8s} {pct(wins/N):>4s}  {statistics.mean(rounds):6.1f}  {statistics.mean(down):8.2f}  {statistics.mean(hp):7.1f}")
    else:
        N = 1000
        mixes = {'mixed (all five)': FORCES, 'squad tier only': ['Slag hauler', 'Sump sniper team', 'Sump squid']}
        rests = {'no rest': 0, 'clinic: +5 HP every 5th fight': 5}
        print(f"{'enemy mix':18s} {'healing':32s} {'armor':9s} {'fights':6s} finish%  avgDone  endHP  downedAtEnd")
        for mname, mix in mixes.items():
            for rname, rest in rests.items():
                for refill in (True, False):
                    cfg = dict(HARSH); cfg['armor_refill'] = refill
                    for n in (5, 10, 15):
                        done = []; ok = 0; hp_end = []; dn = []
                        for sd in range(N):
                            d, rec = run_series(sd, n, cfg, mix, rest)
                            done.append(d); ok += d == n
                            hp_end.append(rec[-1]['hp']); dn.append(rec[-1]['downed'])
                        print(f"{mname:18s} {rname:32s} {'refills' if refill else 'no refill':9s} {n:6d} {pct(ok/N):>6s}  {statistics.mean(done):6.1f}  {statistics.mean(hp_end):5.1f}  {statistics.mean(dn):5.2f}")
