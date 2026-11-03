"""Paper simulator for the Pressmen Union and Concord Marshals starter decks (playtest 07).

Reuses series_sim.Game (lanes, scripted enemy forces, soak, results) and replaces the player side:
decks come from data/*.csv, squads and card handlers are defined here. All numbers are placeholders from
docs/design.md. Modeling assumptions are listed in playtests/07-pressmen-and-concord.md.

Usage:
  python3 tools/faction_sim.py log pressmen "Scavver pack" 3     # narrated fight
  python3 tools/faction_sim.py report                              # single fights + dungeon finish rates
"""
import csv, os, random, statistics, sys, collections
import series_sim as S
from series_sim import Unit, Game

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')

# card -> gear tag required on the acting unit (None = supply, played by anyone)
GEARMAP = {
    'pressmen': {
        'Hammer Blow': 'sledge', 'Sweeping Swing': 'sledge', 'Chain Lash': 'chains',
        'Vent Steam': 'pskill', 'Close Ranks': 'pskill2', 'Shake It Off': 'brawler',
        'Brace the Line': 'mantlet', 'Take the Hit': 'mantlet', 'Rivet Burst': 'rivet',
        'Weld Seam': 'torch', 'Cauterize': 'torch', 'Furnace Apron': 'fplate',
        'Ration Pack': None, 'Rivet Crate': None, 'Counterweight': 'harness', 'Heavy Step': 'harness',
    },
    'concord': {
        'Flechette Volley': 'carbine', 'Pinning Shot': 'carbine', 'Cuff Shot': 'cuff',
        'Stun Pulse': 'stunner', 'Tag Target': 'optics', 'Revise Warrant': 'mskill',
        'Close In': 'mskill', 'Halt': 'mskill', 'Shield Wall': 'gshield', 'Interpose': 'gshield',
        'Plate Check': 'cplate', 'Field Dressing': None, 'Ammo Mag': None, 'Spare Cuffs': None,
    },
}
FUEL_COST = {'Sweeping Swing': 1, 'Stun Pulse': 1, 'Halt': 1}
DEPLOY = {
    'pressmen': ['Hammerhand', 'Ironback', 'Rivet Gunner', 'Furnace Medic'],
    'concord': ['Warden', 'Sentinel', 'Marshal', 'Breacher'],
}
FIGHTBACK = {'Scavver Chief': 2, 'Furnace Hand': 2}  # enemy's most basic melee ability; default 1


def load_deck(fac):
    fn = {'pressmen': 'pressmen_starting_deck.csv', 'concord': 'concord_starting_deck.csv'}[fac]
    deck = {}
    for r in csv.DictReader(open(os.path.join(DATA, fn))):
        deck[r['name']] = int(r['count'])
        S.FV[r['name']] = int(r['fuel_value'])
    assert sum(deck.values()) == 30, (fac, sum(deck.values()))
    return deck


DECKS = {f: load_deck(f) for f in ('pressmen', 'concord')}
# Concord v2 (playtest 08 test variant, not yet in the design doc): concussive guns with more damage, a lethal
# Breacher shotgun, a fourth unit. Cards: name -> count; fuel values stay 1 (supplies 2).
DECKS['concord2'] = {
    'Flechette Volley': 4, 'Cuff Shot': 3, 'Stun Pulse': 2, 'Breach Blast': 2, 'Tag Target': 3, 'Revise Warrant': 1,
    'Close In': 2, 'Halt': 2, 'Shield Wall': 3, 'Interpose': 1, 'Plate Check': 2,
    'Field Dressing': 2, 'Ammo Mag': 2, 'Spare Cuffs': 1,
}
assert sum(DECKS['concord2'].values()) == 30
S.FV['Breach Blast'] = 1
GEARMAP['concord2'] = dict(GEARMAP['concord'], **{'Breach Blast': 'shotgun'})
AMMO_GEAR = {'rivet', 'cuff', 'shotgun'}


def make_squad(cfg):
    ap = cfg.get('armor_per_piece', 3)
    if cfg['faction'] == 'pressmen' and cfg.get('crew3'):
        spec = [
            ('Hammerhand', 8, ap, {'sledge', 'pskill', 'harness', 'fplate'}),
            ('Ironback', 8, 2 * ap, {'mantlet', 'chains', 'pskill2', 'fplate'}),
            ('Rivet Gunner', 7, ap, {'rivet', 'brawler', 'torch', 'fplate'}),
        ]
    elif cfg['faction'] == 'pressmen':
        spec = [
            ('Hammerhand', 8, ap, {'sledge', 'pskill', 'harness', 'fplate'}),
            ('Ironback', 8, 2 * ap, {'mantlet', 'chains', 'pskill2', 'fplate'}),
            ('Rivet Gunner', 7, ap, {'rivet', 'brawler', 'fplate'}),
            ('Furnace Medic', 7, ap, {'torch', 'fplate'}),
        ]
    elif cfg.get('v2'):
        spec = [
            ('Marshal', 6, ap, {'optics', 'mskill', 'cplate'}),
            ('Sentinel', 7, 2 * ap, {'gshield', 'stunner', 'cplate'}),
            ('Warden', 6, ap, {'carbine', 'cuff', 'cplate'}),
            ('Breacher', 7, ap, {'shotgun', 'cplate'}),
        ]
    else:
        spec = [
            ('Marshal', 6, ap, {'optics', 'mskill', 'cplate'}),
            ('Sentinel', 7, 2 * ap, {'gshield', 'stunner', 'cplate'}),
            ('Warden', 6, ap, {'carbine', 'cuff', 'cplate'}),
        ]
    squad = []
    for name, hp, arm, gear in spec:
        u = Unit(name, 'P', hp, 0, arm, gear)
        u.ammo = 4 if (gear & AMMO_GEAR) else 0
        u.wind, u.hstep, u.slowed = None, 0, False
        squad.append(u)
    return squad


class FGame(Game):
    def __init__(s, seed, squad, force, cfg, log=False):
        super().__init__(seed, squad, force, cfg, log)
        s.fac = cfg['faction']
        s.v2 = bool(cfg.get('v2')) and s.fac == 'concord'
        s.deckname = 'concord2' if s.v2 else s.fac
        s.sc = collections.Counter()   # stun counters by unit id
        s.captured = 0
        s.warrant_body = s.v2 and s.monster
        s.pdeck = [c for c, n in DECKS[s.deckname].items() for _ in range(n)]
        s.r.shuffle(s.pdeck)
        s.pdisc, s.hand = [], []
        s.grudge = False
        s.vent = False
        s._melee = s._subdue = False
        s.arrests = 0
        s.auth = 0
        s.warrant_result = None
        s.cardplays = collections.Counter()
        for u in squad:
            u.wind, u.hstep, u.slowed = None, 0, False
        s.warrant = None
        if s.fac == 'concord' and not s.monster:
            pool = list(s.estart) + list(s.edeck)
            lead = [u for u in pool if any(k in u.name for k in ('Chief', 'Captain', 'Slag Hauler', 'Sump Sniper'))]
            s.warrant = (lead or pool)[0]

    # ---------- damage hooks
    def hit(s, u, d):
        was_live = u.live
        res = super().hit(u, d)
        if was_live and not u.live:
            if u.side == 'P':
                u.wind = None
                if s.fac == 'pressmen':
                    s.grudge = True
            else:
                if s._subdue and u.kind == '':
                    s.arrests += 1
                    res = ' ARRESTED'
                    if u is s.warrant:
                        s.auth += 1; s.warrant_result = 'arrested'
                elif u is s.warrant:
                    s.auth -= 1; s.warrant_result = 'killed'
        if s.v2 and u.side == 'E' and u.live:
            s.check_capture(u)
        return res

    def check_capture(s, u):
        """Stun counters at least twice current HP: the unit is taken out (arrested if humanoid)."""
        if u.live and s.sc[u.id] > 0 and s.sc[u.id] >= 2 * u.hp:
            u.dead = True
            if u.kind == '':
                s.arrests += 1; s.captured += 1
                s.log(f"      {u.name} is taken out and captured")
                if u is s.warrant:
                    s.auth += 1; s.warrant_result = 'arrested'
            else:
                s.log(f"      {u.name} is knocked out")
            return True
        return False

    def bonus(s, actor, tgt):
        b = 0
        if s.fac == 'pressmen':
            if s.grudge:
                b += 1
            if s._melee:
                if any(x is not actor and x.live and x.lane == actor.lane for x in s.punits):
                    b += 1
                if actor.hstep:
                    b += 2
        else:
            if tgt is not None and tgt is s.warrant and tgt.live:
                b += 1
            if s.sync[actor.lane] and s.sync[actor.lane] != actor.id:
                b += 1
        return b

    def clear_bonus(s, actor):
        if s.sync[actor.lane] and s.sync[actor.lane] != actor.id:
            s.sync[actor.lane] = None
        if s._melee and actor.hstep:
            actor.hstep = 0; actor.slowed = True

    def targets(s, a, dmg, melee):
        s._melee = melee
        try:
            return s.atk_targets(a, dmg)
        finally:
            s._melee = False

    def fightback(s, a, e):
        base = FIGHTBACK.get(e.name, 1)
        d = s.dmg(base) if s.cfg.get('fightback_bonus', True) else base
        s.log(f"      {e.name} fights back for {d} -> {a.name}{s.hit(a, d)}")

    def p_attack(s, a, kind, tgt, dmg, melee=False, subdue=False, expose=False, stun_exposed=False, extra_exposed=0):
        s._melee, s._subdue = melee, subdue
        try:
            if kind == 'unit':
                if tgt.name == 'Sump Sniper' and s.cover[tgt.lane]:
                    g = [x for x in s.units('E', tgt.lane) if x.id == s.cover[tgt.lane]]
                    s.cover[tgt.lane] = None
                    if g:
                        tgt = g[0]; s.log("    a Sump Guard takes the shot instead")
                was_exp = tgt.exposed
                d = dmg + (extra_exposed if tgt.exposed else 0) + s.bonus(a, tgt)
                res = s.hit(tgt, d)
                s.log(f"    {a.name} (lane {a.lane+1}) hits {tgt.name} for {d}{res}")
                if tgt.live:
                    if expose:
                        tgt.exposed = True
                    if stun_exposed and was_exp:
                        tgt.stunned = True; tgt.pending = None
                        s.log(f"      {tgt.name} is stunned")
                    if melee and a.live:
                        s.fightback(a, tgt)
            else:
                d = dmg + s.bonus(a, None) + (1 if (s.warrant_body and s.laneHP['E'][tgt] == 0) else 0)
                s.log(f"    {a.name} (lane {a.lane+1}):")
                s.lane_hit(tgt, d)
            s.clear_bonus(a)
        finally:
            s._melee = s._subdue = False

    def c_attack(s, a, kind, tgt, dmg):
        """Concussive damage: ignores soak, becomes stun counters instead of HP loss (lane HP and the body take it as damage)."""
        if kind == 'unit':
            if tgt.name == 'Sump Sniper' and s.cover[tgt.lane]:
                g = [x for x in s.units('E', tgt.lane) if x.id == s.cover[tgt.lane]]
                s.cover[tgt.lane] = None
                if g:
                    tgt = g[0]; s.log("    a Sump Guard takes the shot instead")
            d = dmg + s.bonus(a, tgt) + (1 if tgt.exposed else 0)
            tgt.exposed = False
            s.sc[tgt.id] += d
            s.log(f"    {a.name} (lane {a.lane+1}) stuns {tgt.name} for {d} counters -> {s.sc[tgt.id]} (HP {tgt.hp})")
            s.check_capture(tgt)
        else:
            d = dmg + s.bonus(a, None)
            if s.warrant_body and s.laneHP['E'][tgt] == 0:
                d += 1
            s.log(f"    {a.name} (lane {a.lane+1}):")
            s.lane_hit(tgt, d)
        s.clear_bonus(a)

    def conc_value(s, a, t, dmg):
        d = dmg + s.bonus(a, t) + (1 if t.exposed else 0)
        cnt = s.sc[t.id]
        v = 0.8 * d
        if cnt + d >= 2 * t.hp:
            v += 3 + (2 if t is s.warrant else 0)
        elif cnt + d >= t.hp > cnt:
            v += 1.5
        if 'Chief' in t.name or 'Captain' in t.name or 'Sniper' in t.name:
            v += 1.5
        return v

    def conc_targets(s, a, dmg):
        out = []
        for L in s.target_lanes(a):
            for t in s.units('E', L):
                out.append((s.conc_value(a, t, dmg), 'unit', t))
        for v, k, t in s.targets(a, dmg, False):
            if k == 'lane':
                out.append((v, k, t))
        return out

    def enemy_action(s):
        if s.v2:
            for L in range(3):
                for u in s.units('E', L):
                    if s.sc[u.id] >= u.hp > 0:
                        u.stunned = True; u.pending = None
        super().enemy_action()
        if s.cfg.get('decay', 0):
            for k in list(s.sc):
                if s.sc[k] > 0:
                    s.sc[k] = max(0, s.sc[k] - s.cfg['decay'])
        if s.cfg.get('roll'):
            for k in sorted(s.sc):
                if s.sc[k] > 0:
                    r = s.r.randint(1, 6)
                    s.sc[k] = max(0, s.sc[k] - (2 if r == 6 else 1 if r >= 3 else 0))

    # ---------- wind-ups
    def start_windup(s, a, spec):
        if s.vent:
            s.vent = False
            s.log(f"    {a.name}: Vent Steam, no wind-up")
            s.release(a, spec)
            return
        a.wind = dict(spec, left=2 if a.slowed else 1)
        a.slowed = False
        s.log(f"    {a.name} winds up {spec['card']}")

    def release(s, a, spec):
        if not a.live:
            return
        if spec['card'] == 'Hammer Blow':
            tl = s.targets(a, 4, True)
            if tl:
                v, k, t = max(tl, key=lambda x: x[0])
                s.log(f"    {a.name} releases Hammer Blow")
                s.p_attack(a, k, t, 4, melee=True)
            else:
                s.log(f"    {a.name}'s Hammer Blow has no target")
        else:
            L = a.lane
            en = list(s.units('E', L))
            s.log(f"    {a.name} releases Sweeping Swing")
            if en:
                for e in en:
                    if e.live:
                        s.p_attack(a, 'unit', e, 2, melee=True)
            elif s.hittable_lane(L):
                s.p_attack(a, 'lane', L, 2, melee=True)

    def player_action(s):
        if s.round > 3:
            if s.fac == 'pressmen':
                for u in s.punits:
                    if u.live and u.lane is not None and u.armor < u.armor_max and \
                            any(x is not u and x.live and x.lane == u.lane for x in s.punits):
                        u.armor += 1
            for a in s.punits:
                if a.wind:
                    a.wind['left'] -= 1
                    if a.wind['left'] <= 0:
                        spec, a.wind = a.wind, None
                        s.release(a, spec)
            if s.result():
                return
        super().player_action()

    # ---------- player options
    def options(s):
        opts = []
        P = [u for u in s.punits if u.lane is not None and u.live]
        undeployed = [u for u in s.punits if u.lane is None and u.live]
        setup = s.round <= 3
        order = DEPLOY[s.fac]
        for u in undeployed:
            for L in range(3):
                if len(s.units('P', L, live=False)) >= S.CAP:
                    continue
                if setup:
                    if s.lanes['P'][L]:
                        continue
                    live_names = [x.name for x in s.punits if x.live]
                    pref = [n for n in order if n in live_names]
                    want = pref[L] if L < len(pref) else pref[0]
                    if u.name != want:
                        continue
                    opts.append(dict(v=100, kind='deploy', unit=u, lane=L, fuel=0))
                else:
                    mates = s.units('P', L)
                    v = 2.4 + (1.0 if mates else 0) + (0.5 if any(m.name in ('Hammerhand', 'Marshal') for m in mates) else 0) \
                        + 0.3 * len(s.units('E', L))
                    opts.append(dict(v=v, kind='deploy', unit=u, lane=L, fuel=0))
        if setup:
            return opts, {}
        hand_names = sorted(set(s.hand))
        cardbest = {c: 0.0 for c in hand_names}
        gm = GEARMAP[s.deckname]

        def add(v, run, card=None, fuel=0, actor=None):
            if card:
                inner = run
                def run(card=card, inner=inner):
                    s.cardplays[card] += 1
                    inner()
            opts.append(dict(v=v, kind='play' if card else 'basic', card=card, fuel=fuel, run=run, actor=actor))
            if card:
                cardbest[card] = max(cardbest[card], v)

        def warrant_adj(v, k, t, dmg, a, subdue):
            if s.fac == 'concord' and k == 'unit' and t is s.warrant:
                kill = dmg + s.bonus(a, t) + (1 if t.exposed else 0) >= t.total()
                if kill:
                    v += 2.0 if subdue else -3.0
            return v

        def soak_opts(c, a, amt, pool, fuel, k=0.7):
            for t in pool:
                real = min(amt, t.armor_max - t.armor)
                if real > 0:
                    urgency = 1.0 + (0.5 if t.hp <= 3 else 0) + (0.3 if s.units('E', t.lane) else -0.3)
                    def run(t=t, real=real, a=a, c=c):
                        t.armor += real; s.log(f"    {a.name} plays {c}: {t.name} +{real} soak")
                    add(real * k * urgency, run, c, fuel, a)

        for c in hand_names:
            g = gm[c]
            actors = [u for u in P if g is None or g in u.gear]
            if g is None:
                actors = actors[:1]
            fuel = FUEL_COST.get(c, 0)
            for a in actors:
                lane_en = s.units('E', a.lane)
                # ---- attacks
                if s.v2 and c in ('Flechette Volley', 'Cuff Shot', 'Stun Pulse', 'Breach Blast'):
                    if c == 'Flechette Volley':
                        for v, k, t in s.targets(a, 3, False):
                            v = warrant_adj(v, k, t, 3, a, False) + (0.3 if k == 'unit' and t.exposed else 0)
                            add(v, lambda a=a, k=k, t=t: s.p_attack(a, k, t, 3, extra_exposed=1), c, fuel, a)
                        if s.cfg.get('modal'):
                            for v, k, t in s.conc_targets(a, s.cfg['modal']):
                                add(v, lambda a=a, k=k, t=t: s.c_attack(a, k, t, s.cfg['modal']), c, fuel, a)
                    elif c == 'Breach Blast' and a.ammo >= 1:
                        for v, k, t in s.targets(a, 4, False):
                            v = warrant_adj(v, k, t, 4, a, False)
                            def run(a=a, k=k, t=t):
                                a.ammo -= 1; s.p_attack(a, k, t, 4)
                            add(v, run, c, fuel, a)
                    elif c == 'Cuff Shot' and a.ammo >= 1:
                        for v, k, t in s.conc_targets(a, 4):
                            def run(a=a, k=k, t=t):
                                a.ammo -= 1; s.c_attack(a, k, t, 4)
                            add(v, run, c, fuel, a)
                    elif c == 'Stun Pulse':
                        if lane_en:
                            v = sum(s.conc_value(a, e, 2) for e in lane_en)
                            def run(a=a, en=list(lane_en)):
                                for e in en:
                                    if e.live:
                                        s.c_attack(a, 'unit', e, 2)
                            add(v, run, c, fuel, a)
                        elif s.hittable_lane(a.lane):
                            add(1.0, lambda a=a: s.c_attack(a, 'lane', a.lane, 2), c, fuel, a)
                    continue
                if c == 'Flechette Volley':
                    for v, k, t in s.targets(a, 2, False):
                        v = warrant_adj(v, k, t, 2, a, False) + (0.3 if k == 'unit' and t.exposed else 0)
                        add(v, lambda a=a, k=k, t=t: s.p_attack(a, k, t, 2, extra_exposed=1), c, fuel, a)
                elif c == 'Pinning Shot':
                    for v, k, t in s.targets(a, 1, False):
                        v = warrant_adj(v, k, t, 1, a, False)
                        add(v, lambda a=a, k=k, t=t: s.p_attack(a, k, t, 1), c, fuel, a)
                elif c == 'Cuff Shot' and a.ammo >= 1:
                    for v, k, t in s.targets(a, 2, False):
                        v = warrant_adj(v, k, t, 2, a, True) + (1.2 if k == 'unit' and t.exposed else 0)
                        def run(a=a, k=k, t=t):
                            a.ammo -= 1; s.p_attack(a, k, t, 2, subdue=True, stun_exposed=True)
                        add(v, run, c, fuel, a)
                elif c == 'Stun Pulse':
                    if lane_en:
                        v = sum(min(1 + (1 if e.exposed else 0), e.total()) + (3 if e.total() <= 1 else 0) for e in lane_en)
                        def run(a=a, en=list(lane_en)):
                            for e in en:
                                if e.live:
                                    s.p_attack(a, 'unit', e, 1, subdue=True)
                        add(v, run, c, fuel, a)
                    elif s.hittable_lane(a.lane):
                        add(1.0, lambda a=a: s.p_attack(a, 'lane', a.lane, 1), c, fuel, a)
                elif c == 'Rivet Burst' and a.ammo >= 1:
                    if lane_en:
                        tg = sorted(lane_en, key=lambda e: e.total())[:2]
                        v = sum(min(2 + (1 if e.exposed else 0), e.total()) + (3 if e.total() <= 2 else 0) for e in tg)
                        def run(a=a, tg=tg):
                            a.ammo -= 1
                            for e in tg:
                                if e.live:
                                    s.p_attack(a, 'unit', e, 2)
                        add(v, run, c, 0, a)
                    elif s.hittable_lane(a.lane):
                        def run(a=a):
                            a.ammo -= 1; s.p_attack(a, 'lane', a.lane, 2)
                        add(min(2, s.lane_pool(a.lane)) * 1.2, run, c, 0, a)
                elif c == 'Chain Lash':
                    for v, k, t in s.targets(a, 2, True):
                        add(v - 0.4 + (0.6 if k == 'unit' else 0),
                            lambda a=a, k=k, t=t: s.p_attack(a, k, t, 2, melee=True, expose=True), c, fuel, a)
                elif c == 'Hammer Blow' and not a.wind:
                    tl = s.targets(a, 4, True)
                    if tl:
                        v = max(x[0] for x in tl)
                        add(0.8 * v - 0.4, lambda a=a: s.start_windup(a, dict(card='Hammer Blow')), c, fuel, a)
                elif c == 'Sweeping Swing' and not a.wind:
                    if lane_en:
                        v = sum(min(2 + (1 if e.exposed else 0), e.total()) + (3 if e.total() <= 2 else 0) for e in lane_en)
                        add(0.8 * v - 0.4, lambda a=a: s.start_windup(a, dict(card='Sweeping Swing')), c, fuel, a)
                    elif s.hittable_lane(a.lane):
                        add(0.8 * min(2, s.lane_pool(a.lane)) * 1.2 - 0.4,
                            lambda a=a: s.start_windup(a, dict(card='Sweeping Swing')), c, fuel, a)
                elif c == 'Vent Steam':
                    holder = [u for u in P if 'sledge' in u.gear]
                    if holder and not s.vent and any(x in s.hand for x in ('Hammer Blow', 'Sweeping Swing')):
                        def run(a=a):
                            s.vent = True; s.log(f"    {a.name} plays Vent Steam")
                        add(1.3, run, c, fuel, a)
                # ---- soak / defense
                elif c in ('Brace the Line', 'Counterweight'):
                    soak_opts(c, a, 3, [a], fuel)
                elif c == 'Shield Wall':
                    soak_opts(c, a, 3, [a], fuel)
                elif c in ('Furnace Apron', 'Plate Check'):
                    soak_opts(c, a, 2, s.units('P', a.lane), fuel)
                elif c == 'Weld Seam':
                    soak_opts(c, a, 3, P, fuel)
                elif c == 'Close Ranks':
                    mates = s.units('P', a.lane)
                    real = sum(min(2, t.armor_max - t.armor) for t in mates)
                    if real > 0:
                        def run(a=a, mates=mates):
                            for t in mates:
                                t.armor += min(2, t.armor_max - t.armor)
                            s.log(f"    {a.name} plays Close Ranks in lane {a.lane+1}")
                        add(real * 0.7 * (1.3 if lane_en else 0.7), run, c, fuel, a)
                elif c in ('Take the Hit', 'Interpose') and len(s.units('P', a.lane)) >= 2 and not s.bulwark[a.lane] and lane_en:
                    def run(a=a, c=c):
                        s.bulwark[a.lane] = a.id; s.log(f"    {a.name} plays {c}")
                    add(1.4, run, c, fuel, a)
                elif c == 'Heavy Step' and not a.hstep:
                    if any(x in s.hand for x in ('Hammer Blow', 'Sweeping Swing', 'Chain Lash')) and lane_en:
                        def run(a=a):
                            a.hstep = 1; s.log(f"    {a.name} plays Heavy Step")
                        add(1.2, run, c, fuel, a)
                elif c == 'Shake It Off':
                    sick = [u for u in P if u.exposed]
                    if sick:
                        def run(a=a, t=sick[0]):
                            t.exposed = False; s.log(f"    {a.name} plays Shake It Off on {t.name}")
                        add(1.2, run, c, fuel, a)
                # ---- concord utility
                elif c == 'Tag Target':
                    en = [e for e in lane_en if not e.exposed]
                    if en:
                        t = sorted(en, key=lambda e: (e is not s.warrant, -e.hp))[0]
                        syn = 0.6 if any(x in s.hand for x in ('Cuff Shot', 'Flechette Volley')) else 0
                        def run(a=a, t=t):
                            t.exposed = True; s.log(f"    {a.name} plays Tag Target: {t.name} Exposed")
                        add(1.4 + syn, run, c, fuel, a)
                elif c == 'Halt':
                    en = [e for e in lane_en if not e.stunned]
                    if en:
                        t = sorted(en, key=lambda e: (e.pending is None, 'Chief' not in e.name and 'Captain' not in e.name, e.hp))[0]
                        def run(a=a, t=t):
                            t.stunned = True; t.pending = None; s.log(f"    {a.name} plays Halt: {t.name} stunned")
                        add(2.2 + (1 if 'Chief' in t.name or 'Captain' in t.name or t.pending else 0) + (1.5 if t.pending else 0),
                            run, c, fuel, a)
                elif c == 'Close In':
                    if len(s.units('P', a.lane)) >= 2 and not s.sync[a.lane] and lane_en:
                        def run(a=a):
                            s.sync[a.lane] = a.id; s.log(f"    {a.name} plays Close In")
                        add(0.9, run, c, fuel, a)
                elif c == 'Revise Warrant':
                    cands = [e for L in range(3) for e in s.units('E', L) if e is not s.warrant]
                    if s.warrant is not None and cands and not s.warrant.live:
                        def run(a=a, t=sorted(cands, key=lambda e: -e.hp)[0]):
                            s.warrant = t; s.log(f"    {a.name} plays Revise Warrant: {t.name} is Warranted")
                        add(1.0, run, c, fuel, a)
                # ---- healing and ammo
                elif c in ('Ration Pack', 'Field Dressing'):
                    for t in [u for u in s.punits if u.lane is not None and u.hp < u.maxhp]:
                        amt = s.cfg.get('heal_amount', 4)
                        def run(a=a, t=t, amt=amt, c=c):
                            t.hp = min(t.maxhp, t.hp + amt); t.downed = False
                            s.log(f"    {c}: {t.name} +{amt} HP")
                        add(min(amt, t.maxhp - t.hp) * 1.2 + (3 if t.downed else 0), run, c, 0, a)
                elif c == 'Cauterize':
                    for t in [u for u in s.punits if u.lane is not None and u.hp < u.maxhp]:
                        def run(a=a, t=t):
                            t.hp = min(t.maxhp, t.hp + 2); t.downed = False
                            s.log(f"    {a.name} plays Cauterize: {t.name} +2 HP")
                        add(min(2, t.maxhp - t.hp) * 1.2 + (3 if t.downed else 0), run, c, fuel, a)
                elif c in ('Rivet Crate', 'Ammo Mag', 'Spare Cuffs'):
                    pool = [u for u in s.punits if u.live and u.lane is not None and (u.gear & AMMO_GEAR) and u.ammo < 4]
                    if c == 'Rivet Crate':
                        pool = [u for u in pool if 'rivet' in u.gear]
                    if c == 'Spare Cuffs':
                        pool = [u for u in pool if 'cuff' in u.gear]
                    if pool:
                        h = min(pool, key=lambda u: u.ammo)
                        def run(h=h, c=c):
                            h.ammo = min(4, h.ammo + 2); s.log(f"    {c}: {h.name} ammo -> {h.ammo}")
                        add(min(2, 4 - h.ammo) * 0.8, run, c, 0, a)
        # basic attacks (1 damage, 1 fuel; melee for Pressmen)
        for a in P:
            melee = s.fac == 'pressmen'
            for v, k, t in s.targets(a, 1, melee):
                v = warrant_adj(v, k, t, 1, a, False)
                add(v - 0.5 - (0.3 if melee else 0),
                    lambda a=a, k=k, t=t, m=melee: s.p_attack(a, k, t, 1, melee=m), None, 1, a)
        dead = [c for c in s.hand if cardbest.get(c, 0) == 0]
        opts.append(dict(v=0.35 * min(3, len(dead)), kind='cycle', fuel=0, dead=dead))
        return opts, cardbest


def run_series(seed, n, cfg, mix):
    rng = random.Random(seed)
    squad = make_squad(cfg)
    rec = []
    for i in range(n):
        f = rng.choice(mix)
        g = FGame(rng.random(), squad, f, cfg)
        res = g.run()
        rec.append(dict(force=f, res=res, hp=sum(u.hp for u in squad), arrests=g.arrests, auth=g.auth,
                        plays=g.cardplays))
        if res != 'win':
            return i, rec
        for u in squad:
            if u.downed:
                u.downed = False; u.hp = 1
    return n, rec


def narrated(fac, force, seed, cfg=None):
    cfg = dict(name='x', faction=fac, enemy_bonus=1, armor_refill=True, armor_per_piece=3, **(cfg or {}))
    if len(sys.argv) > 5:
        cfg.update(eval(sys.argv[5]))
    S.SPAWN_MODE = 'empty_only'
    squad = make_squad(cfg)
    g = FGame(seed, squad, force, cfg, log=True)
    res = g.run()
    print('\n'.join(g.out))
    print(f"RESULT {res} after {g.round - 3} actions; HP {[ (u.name, u.hp) for u in squad]} arrests {g.arrests} authority {g.auth:+d}")


if __name__ == '__main__':
    if len(sys.argv) >= 4 and sys.argv[1] == 'log':
        narrated(sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 1)
