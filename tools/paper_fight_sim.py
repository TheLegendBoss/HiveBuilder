"""Paper-fight simulator: TSC starter deck vs the scavver pack on the Service corridor.
All numbers are placeholders from docs/design.md. Assumptions are listed in ASSUMPTIONS.
Usage: python3 sim.py log SEED   -> narrated fight
       python3 sim.py stats N    -> aggregate over N seeds
"""
import random, sys, itertools, statistics, collections

CAP = 2                    # lane capacity, both sides (assumption)
HAND = 7
LANE_HP = [3, 4, 3]        # Service corridor
IDS = itertools.count(1)

DECK = {
    'Burst Fire': 4, 'Suppressing Fire': 2, 'Brace': 2, 'Focus Fire': 2, 'Shield Up': 2,
    'Counter': 1, 'Bulwark': 1, 'Sustained Fire': 2, 'Pin Down': 1, 'Overdrive': 1,
    'Jury-Rig': 1, 'Field Fix': 1, 'Patch': 1, 'Ammo Crate': 3, 'Repair Parts': 2,
    'Sight Alignment': 1, 'Paint Target': 1, 'Data Burst': 1, 'Sync': 1,
}
FV = {'Ammo Crate': 2, 'Repair Parts': 2}   # fuel value, default 1
GEAR = {   # card -> gear needed (None = any deployed droid)
    'Burst Fire': 'autogun', 'Suppressing Fire': 'autogun', 'Brace': 'plating',
    'Focus Fire': 'lineskill', 'Shield Up': 'shield', 'Counter': 'shield', 'Bulwark': 'vanguard',
    'Sustained Fire': 'heavy', 'Pin Down': 'heavy', 'Overdrive': 'heavyskill',
    'Jury-Rig': 'repairkit', 'Field Fix': 'repairkit', 'Patch': 'repairskill',
    'Ammo Crate': None, 'Repair Parts': None, 'Sight Alignment': 'laser', 'Paint Target': 'laser',
    'Data Burst': 'uplink', 'Sync': 'uplink',
}
FUEL_COST = {'Suppressing Fire': 1}
AMMO_COST = {'Sustained Fire': 1, 'Pin Down': 2}


class Unit:
    def __init__(s, name, side, hp, builtin=0, armor=0, gear=(), pattern=()):
        s.name, s.side, s.hp, s.maxhp = name, side, hp, hp
        s.builtin, s.armor, s.armor_max = builtin, armor, armor
        s.gear, s.lane = set(gear), None
        s.downed = s.dead = s.stunned = s.exposed = s.counter = False
        s.sight = 0
        s.ammo = 4 if 'heavy' in s.gear else 0
        s.pattern, s.pi = list(pattern), 0
        s.id = next(IDS)

    @property
    def live(s):
        return not s.downed and not s.dead

    def total(s):
        return s.hp + s.armor + s.builtin


class Game:
    def __init__(s, seed, log=False):
        s.r = random.Random(seed)
        s.logon = log
        s.out = []
        s.round = 0
        s.laneHP = {'P': list(LANE_HP), 'E': list(LANE_HP)}
        s.lanes = {'P': [[], [], []], 'E': [[], [], []]}
        s.focus = None
        s.sync = [None] * 3
        s.bulwark = [None] * 3
        s.discount = 0
        s.stats = collections.Counter()
        # player
        s.punits = [
            Unit('Line A', 'P', 5, 2, 3, {'autogun', 'plating', 'lineskill', 'laser'}),
            Unit('Line B', 'P', 5, 2, 3, {'autogun', 'plating', 'lineskill', 'uplink'}),
            Unit('Vanguard', 'P', 6, 2, 5, {'shield', 'vanguard', 'plating'}),
            Unit('Heavy', 'P', 6, 2, 3, {'heavy', 'heavyskill', 'plating'}),
            Unit('Repair', 'P', 5, 2, 3, {'repairkit', 'repairskill', 'plating'}),
        ]
        s.pdeck = [c for c, n in DECK.items() for _ in range(n)]
        s.r.shuffle(s.pdeck)
        s.pdisc, s.hand = [], []
        # enemy
        def scav(): return Unit('Scavver', 'E', 3, pattern=['pot', 'shiv'])
        def chief(): return Unit('Scavver Chief', 'E', 5, pattern=['rally', 'bludgeon'])
        s.estart = [scav(), chief(), scav()]
        s.edeck = [scav(), scav()]
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

    def captured(s, side_of_lanehp, lane):
        return s.laneHP[side_of_lanehp][lane] == 0

    def hit(s, u, d, why=''):
        if u.exposed and d > 0:
            d += 1
            u.exposed = False
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

    # ---------- attack bonuses
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
        if s.laneHP['E'][l] == 0:
            out += s.adj(l)
        return out

    def atk_targets(s, actor, dmg):
        """list of (value, kind, target) for a single attack of dmg."""
        res = []
        for L in s.target_lanes(actor):
            en = s.units('E', L)
            if en:
                for t in en:
                    d = dmg + s.bonus(actor, t) + (1 if t.exposed else 0)
                    real = min(d, t.total())
                    v = real + (3 if real >= t.total() else 0) + (1.5 if 'Chief' in t.name else 0)
                    res.append((v, 'unit', t))
            elif s.laneHP['E'][L] > 0:
                d = dmg + s.bonus(actor, None)
                real = min(d, s.laneHP['E'][L])
                v = real * 1.3
                if real >= s.laneHP['E'][L]:
                    v += 3
                    if sum(1 for x in s.laneHP['E'] if x == 0) == 1:
                        v += 6
                res.append((v, 'lane', L))
        return res

    def do_attack(s, actor, kind, tgt, dmg):
        d = dmg + s.bonus(actor, tgt if kind == 'unit' else None)
        if kind == 'unit':
            before = tgt.total()
            res = s.hit(tgt, d)
            s.log(f"    {actor.name} (lane {actor.lane+1}) hits {tgt.name} for {d}{res}")
        else:
            s.laneHP['E'][tgt] = max(0, s.laneHP['E'][tgt] - d)
            s.log(f"    {actor.name} hits enemy lane {tgt+1} HP for {d} -> {s.laneHP['E'][tgt]}"
                  + (" CAPTURED" if s.laneHP['E'][tgt] == 0 else ""))
        s.clear_bonus(actor)

    def options(s):
        opts = []
        P = [u for u in s.punits if u.lane is not None and u.live and not u.stunned]
        # deploy
        undeployed = [u for u in s.punits if u.lane is None and u.live]
        setup = s.round <= 3
        if undeployed:
            for u in undeployed:
                for L in range(3):
                    if len(s.units('P', L, live=False)) >= CAP:
                        continue
                    if setup:
                        if s.lanes['P'][L]:
                            continue
                        pref = {0: 'Line A', 1: 'Vanguard', 2: 'Line B'}[L]
                        if u.name != pref:
                            continue
                        opts.append(dict(v=100, kind='deploy', unit=u, lane=L, fuel=0))
                    else:
                        v = 0
                        if u.name == 'Heavy':
                            v = 1.2 + 0.8 * len(s.units('E', L)) + (0.5 if len(s.units('P', L)) else 0)
                        elif u.name == 'Repair':
                            dmg = sum(x.maxhp - x.hp + x.armor_max - x.armor for x in P)
                            v = 0.6 + 0.35 * dmg
                            v += 0.5 * len(s.units('P', L)) if dmg else 0
                        else:
                            v = 1.5 if not s.units('P', L) else 0.3
                        opts.append(dict(v=v, kind='deploy', unit=u, lane=L, fuel=0))
        if setup:
            return opts, {}
        hand_names = sorted(set(s.hand))
        cardbest = {c: 0.0 for c in hand_names}

        def add(v, desc, run, card=None, fuel=0, ammo=0, actor=None):
            opts.append(dict(v=v, kind='play' if card else 'basic', card=card, fuel=fuel,
                             desc=desc, run=run, ammo=ammo, actor=actor))
            if card:
                cardbest[card] = max(cardbest[card], v)

        for c in hand_names:
            g = GEAR[c]
            actors = [u for u in P if g is None or g in u.gear]
            if g is None:
                actors = actors[:1]
            fuel = FUEL_COST.get(c, 0)
            for a in actors:
                if c in ('Burst Fire',):
                    if a.sight:
                        pass
                    for v, k, t in s.atk_targets(a, 3):
                        add(v, f"{a.name} plays Burst Fire", lambda a=a, k=k, t=t: s.do_attack(a, k, t, 3),
                            c, fuel, actor=a)
                elif c == 'Suppressing Fire':
                    en = s.units('E', a.lane)
                    if en:
                        v = sum(min(1 + (1 if e.exposed else 0), e.total()) + (3 if e.total() <= 1 else 0) for e in en)
                        def run(a=a, en=en):
                            for e in list(en):
                                res = s.hit(e, 1)
                                s.log(f"    {a.name} plays Suppressing Fire: {e.name} takes 1{res}")
                            s.clear_bonus(a)
                        add(v, '', run, c, fuel, actor=a)
                    elif s.laneHP['E'][a.lane] > 0:
                        def run(a=a):
                            s.laneHP['E'][a.lane] -= 1
                            s.log(f"    {a.name} plays Suppressing Fire on lane {a.lane+1} HP -> {s.laneHP['E'][a.lane]}")
                        add(1.3, '', run, c, fuel, actor=a)
                elif c == 'Sustained Fire' and a.ammo >= 1:
                    en = s.units('E', a.lane)
                    if en:
                        tg = sorted(en, key=lambda e: e.total())[:2]
                        v = sum(min(2 + (1 if e.exposed else 0), e.total()) + (3 if e.total() <= 2 else 0) for e in tg)
                        def run(a=a, tg=tg):
                            a.ammo -= 1
                            for e in tg:
                                res = s.hit(e, 2)
                                s.log(f"    {a.name} plays Sustained Fire: {e.name} takes 2{res}")
                        add(v, '', run, c, 0, actor=a)
                    elif s.laneHP['E'][a.lane] > 0:
                        def run(a=a):
                            a.ammo -= 1
                            s.laneHP['E'][a.lane] = max(0, s.laneHP['E'][a.lane] - 2)
                            s.log(f"    {a.name} plays Sustained Fire on lane {a.lane+1} HP -> {s.laneHP['E'][a.lane]}")
                        add(min(2, s.laneHP['E'][a.lane]) * 1.3, '', run, c, 0, actor=a)
                elif c == 'Pin Down' and a.ammo >= 2:
                    en = [e for e in s.units('E', a.lane) if not e.stunned]
                    if en:
                        t = sorted(en, key=lambda e: ('Chief' not in e.name, e.hp))[0]
                        def run(a=a, t=t):
                            a.ammo -= 2; t.stunned = True
                            s.log(f"    {a.name} plays Pin Down: {t.name} stunned")
                        add(2.2 + (1 if 'Chief' in t.name else 0), '', run, c, 0, actor=a)
                elif c in ('Brace', 'Jury-Rig', 'Repair Parts', 'Shield Up'):
                    amt = {'Brace': 2, 'Jury-Rig': 2, 'Repair Parts': 3, 'Shield Up': 3}[c]
                    allies = [a] if c == 'Shield Up' else s.units('P', a.lane) if c != 'Repair Parts' else P
                    for t in allies:
                        miss = t.armor_max - t.armor
                        real = min(amt, miss)
                        if real > 0:
                            urgency = 1.0 + (0.5 if t.hp <= 3 else 0) + (0.3 if s.units('E', t.lane) else -0.3)
                            def run(t=t, real=real, a=a, c=c):
                                t.armor += real
                                s.log(f"    {a.name} plays {c}: {t.name} +{real} soak")
                            add(real * 0.7 * urgency, '', run, c, fuel, actor=a)
                elif c == 'Counter' and not a.counter and s.units('E', a.lane):
                    def run(a=a):
                        a.counter = True; s.log(f"    {a.name} plays Counter")
                    add(1.0, '', run, c, fuel, actor=a)
                elif c == 'Bulwark' and len(s.units('P', a.lane)) >= 2 and not s.bulwark[a.lane] and s.units('E', a.lane):
                    def run(a=a):
                        s.bulwark[a.lane] = a.id; s.log(f"    {a.name} plays Bulwark")
                    add(1.4, '', run, c, fuel, actor=a)
                elif c == 'Focus Fire':
                    en = s.units('E', a.lane)
                    if en and s.focus is None:
                        t = sorted(en, key=lambda e: e.total())[0]
                        def run(a=a, t=t):
                            s.focus = t.id; s.log(f"    {a.name} plays Focus Fire on {t.name}")
                        add(1.1, '', run, c, fuel, actor=a)
                elif c == 'Overdrive':
                    add(0.4, '', lambda a=a: (setattr(s, 'discount', s.discount + 1), s.log(f"    {a.name} plays Overdrive")), c, fuel, actor=a)
                elif c == 'Field Fix':
                    sick = [u for u in P if u.exposed or u.stunned]
                    if sick:
                        def run(a=a, t=sick[0]):
                            t.exposed = t.stunned = False; s.log(f"    {a.name} plays Field Fix on {t.name}")
                        add(1.0, '', run, c, fuel, actor=a)
                elif c == 'Patch':
                    for t in [u for u in s.punits if u.lane is not None and (u.hp < u.maxhp)]:
                        real = 2 if not t.downed else 2
                        if t.downed or t.hp < t.maxhp:
                            def run(a=a, t=t):
                                t.hp = min(t.maxhp, t.hp + 2); t.downed = False
                                s.log(f"    {a.name} plays Patch: {t.name} +2 HP")
                            add(min(2, t.maxhp - t.hp) * 1.2 + (3 if t.downed else 0), '', run, c, fuel, actor=a)
                elif c == 'Ammo Crate':
                    hv = [u for u in s.punits if 'heavy' in u.gear and u.lane is not None]
                    if hv and hv[0].ammo < 4:
                        def run(a=a, h=hv[0]):
                            h.ammo = min(4, h.ammo + 2); s.log(f"    Ammo Crate: {h.name} ammo -> {h.ammo}")
                        add(min(2, 4 - hv[0].ammo) * 0.8, '', run, c, 0, actor=a)
                elif c == 'Sight Alignment' and not a.sight:
                    def run(a=a):
                        a.sight = 1; s.log(f"    {a.name} plays Sight Alignment")
                    add(1.0, '', run, c, fuel, actor=a)
                elif c == 'Paint Target':
                    en = [e for e in s.units('E', a.lane) if not e.exposed]
                    if en:
                        t = sorted(en, key=lambda e: -e.hp)[0]
                        def run(a=a, t=t):
                            t.exposed = True; s.log(f"    {a.name} plays Paint Target: {t.name} Exposed")
                        add(1.4, '', run, c, fuel, actor=a)
                elif c == 'Sync':
                    if len(s.units('P', a.lane)) >= 2 and not s.sync[a.lane]:
                        def run(a=a):
                            s.sync[a.lane] = a.id; s.log(f"    {a.name} plays Sync")
                        add(0.9, '', run, c, fuel, actor=a)
                # Data Burst: no results-deck use in this fight -> dead except as fuel
        # basic actions (fuel)
        for a in P:
            if 'autogun' in a.gear:
                cost = max(0, 1 - (1 if a.sight else 0))
                for v, k, t in s.atk_targets(a, 2):
                    add(v - 0.5 * cost, '', lambda a=a, k=k, t=t: s.do_attack(a, k, t, 2), None, cost, actor=a)
            elif 'heavy' in a.gear and a.ammo >= 1:
                en = s.units('E', a.lane)
                if en:
                    tg = sorted(en, key=lambda e: e.total())[:2]
                    v = sum(min(2, e.total()) + (3 if e.total() <= 2 else 0) for e in tg) - 1.0
                    def run(a=a, tg=tg):
                        a.ammo -= 1
                        for e in tg:
                            res = s.hit(e, 2)
                            s.log(f"    {a.name} Autofire: {e.name} takes 2{res}")
                    add(v, '', run, None, 2, actor=a)
            else:
                for v, k, t in s.atk_targets(a, 1):
                    add(v - 0.5, '', lambda a=a, k=k, t=t: s.do_attack(a, k, t, 1), None, 1, actor=a)
        # discard & draw
        dead = [c for c in s.hand if cardbest.get(c, 0) == 0]
        opts.append(dict(v=0.35 * min(3, len(dead)), kind='cycle', fuel=0, dead=dead))
        return opts, cardbest

    def player_action(s):
        s.draw()
        opts, cardbest = s.options()
        handstr = ', '.join(sorted(s.hand))
        s.log(f"  Hand: {handstr}")
        # filter by fuel feasibility
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
            cand = sorted(s.hand, key=lambda c: (cardbest.get(c, 0) / FV.get(c, 1), -FV.get(c, 1)))
            c = cand[0]
            s.hand.remove(c); s.pdisc.append(c); burned.append(c)
            fuel -= FV.get(c, 1)
        s.stats['burned'] += len(burned)
        for c in burned:
            s.stats['burn_' + c] += 1
        if burned:
            s.log(f"    burns {', '.join(burned)} for fuel")
        if best.get('card'):
            s.stats['play_' + best['card']] += 1
        best['run']()

    # ---------- enemy
    def legal(s, u, act):
        if act == 'rally':
            return bool(s.edeck) and len(s.units('E', u.lane, live=False)) < CAP
        return True

    def enemy_hit_target(s, u):
        """pick a player unit in the attacker's lane (or lane HP)."""
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

    def enemy_attack(s, u, dmg, melee):
        kind, tg = s.enemy_hit_target(u)
        if kind is None:
            return
        if kind == 'lane':
            s.laneHP['P'][tg] = max(0, s.laneHP['P'][tg] - dmg)
            s.log(f"    {u.name} (lane {u.lane+1}) hits your lane {tg+1} HP for {dmg} -> {s.laneHP['P'][tg]}"
                  + (" CAPTURED" if s.laneHP['P'][tg] == 0 else ""))
            return
        t = sorted(tg, key=lambda x: (x.hp, x.armor + x.builtin))[0]
        L = t.lane
        if s.bulwark[L] and s.bulwark[L] != t.id:
            v = [x for x in s.units('P', L) if x.id == s.bulwark[L]]
            if v:
                t = v[0]; s.bulwark[L] = None
                s.log("    Bulwark redirects the attack")
        res = s.hit(t, dmg)
        s.log(f"    {u.name} (lane {u.lane+1}) hits {t.name} for {dmg}{res}  [{t.name} HP {t.hp} soak {t.armor+t.builtin}]")
        if t.counter and u.live:
            t.counter = False
            r2 = s.hit(u, 2)
            s.log(f"      Counter: {u.name} takes 2{r2}")
        if melee and t.live and u.live:
            r2 = s.hit(u, 1)
            s.log(f"      {t.name} fights back for 1 -> {u.name}{r2}")

    def enemy_action(s):
        if s.round <= 3:
            u = s.estart[s.round - 1]
            lane = s.round - 1
            u.lane = lane; s.lanes['E'][lane].append(u)
            s.log(f"    deploys {u.name} to lane {lane+1}")
            return
        units = [u for L in range(3) for u in s.units('E', L)]
        if not units:
            s.log("    (no units; passes)")
            return
        n = len(units)
        for k in range(n):
            u = units[(s.eptr + k) % n]
            if u.stunned:
                u.stunned = False
                s.eptr = (s.eptr + k + 1) % n
                s.log(f"    {u.name} (lane {u.lane+1}) is stunned and loses its action")
                return
            for j in range(len(u.pattern)):
                act = u.pattern[(u.pi + j) % len(u.pattern)]
                if s.legal(u, act):
                    u.pi = (u.pi + j + 1) % len(u.pattern)
                    s.eptr = (s.eptr + k + 1) % n
                    if act == 'pot':
                        s.enemy_attack(u, 2, False)
                    elif act == 'shiv':
                        s.enemy_attack(u, 1, True)
                    elif act == 'bludgeon':
                        s.enemy_attack(u, 2, True)
                    elif act == 'rally':
                        new = s.edeck.pop(0)
                        new.lane = u.lane; s.lanes['E'][u.lane].append(new)
                        s.log(f"    {u.name} rallies: a Scavver is deployed to lane {u.lane+1}")
                    return
        s.log("    (nothing legal; passes)")

    # ---------- run
    def result(s):
        e = sum(1 for x in s.laneHP['E'] if x == 0)
        p = sum(1 for x in s.laneHP['P'] if x == 0)
        if e >= 2:
            return 'win'
        if p >= 2:
            return 'loss'
        return None

    def run(s, maxr=80):
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


def summarize(g):
    s = g
    return (f"lane HP you {s.laneHP['P']} enemy {s.laneHP['E']}; downed "
            f"{[u.name for u in s.punits if u.downed]}; enemy alive "
            f"{sum(len(s.units('E', L)) for L in range(3))}")


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'log':
        g = Game(int(sys.argv[2]), log=True)
        res = g.run()
        print('\n'.join(g.out))
        print(f"\nRESULT: {res} after {g.round} rounds ({g.round-3} after setup). {summarize(g)}")
        print(dict(g.stats))
    else:
        n = int(sys.argv[2])
        wins = 0; rounds = []; downed = []; ctr = collections.Counter(); res = collections.Counter()
        hp_left = []
        for sd in range(n):
            g = Game(sd)
            r = g.run()
            res[r] += 1
            rounds.append(g.round - 3)
            downed.append(sum(u.downed for u in g.punits))
            hp_left.append(sum(u.hp for u in g.punits))
            ctr.update(g.stats)
        print('results', dict(res))
        print('avg player actions after setup', round(statistics.mean(rounds), 1),
              'median', statistics.median(rounds), 'min', min(rounds), 'max', max(rounds))
        print('avg units downed', round(statistics.mean(downed), 2), 'avg total HP left', round(statistics.mean(hp_left), 1))
        tot = ctr['played'] + ctr['burned'] + ctr['cycled']
        print('per fight: played', round(ctr['played']/n, 1), 'burned', round(ctr['burned']/n, 1), 'cycled', round(ctr['cycled']/n, 1),
              'reshuffles', round(ctr['reshuffles']/n, 2))
        print('card plays per fight:', {k[5:]: round(v/n, 2) for k, v in sorted(ctr.items()) if k.startswith('play_')})
        print('card burns per fight:', {k[5:]: round(v/n, 2) for k, v in sorted(ctr.items()) if k.startswith('burn_')})
