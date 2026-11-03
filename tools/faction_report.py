"""Playtest 07 tables: Pressmen Union and Concord Marshals starter decks vs the five test forces.
Chassis-free humanoid squads, armor soak 3 per piece, +1 enemy damage, 4-HP healing, empty-only squid spawning."""
import statistics, collections, sys
import series_sim as S, faction_sim as F
N = 300
S.SPAWN_MODE = 'empty_only'
MAXHP = {'pressmen': 30, 'concord': 19}

def cfg_for(fac, **kw):
    return dict(name='x', faction=fac, enemy_bonus=1, armor_refill=True, armor_per_piece=3, **kw)

def single(fac, **kw):
    print(f"\n{fac}: single fights")
    print(f"{'force':20s} win%  timeout%  actions  avgDowned  HPleft/{MAXHP[fac]}  arrests  authority")
    plays = collections.Counter(); games = 0
    for f in S.FORCES:
        w = to = 0; acts = []; dn = []; hp = []; ar = []; au = []
        for sd in range(N):
            cfg = cfg_for(fac, **kw)
            sq = F.make_squad(cfg); g = F.FGame(sd, sq, f, cfg); r = g.run()
            w += r == 'win'; to += r == 'timeout'; acts.append(g.round - 3)
            dn.append(sum(u.downed for u in sq)); hp.append(sum(u.hp for u in sq))
            ar.append(g.arrests); au.append(g.auth); plays.update(g.cardplays); games += 1
        print(f"{f:20s} {100*w/N:3.0f}%  {100*to/N:6.0f}%  {statistics.mean(acts):6.1f}  {statistics.mean(dn):8.2f}  {statistics.mean(hp):8.1f}  {statistics.mean(ar):6.2f}  {statistics.mean(au):+7.2f}", flush=True)
    return plays, games

def dungeons(fac, **kw):
    print(f"\n{fac}: dungeon finish rates (all five forces mixed)")
    for n in (5, 8, 10):
        ok = 0; done = []; hp = []; loss = collections.Counter(); seen = collections.Counter()
        for sd in range(N):
            d, rec = F.run_series(sd, n, cfg_for(fac, **kw), S.FORCES)
            ok += d == n; done.append(d); hp.append(rec[-1]['hp'])
            for r in rec:
                seen[r['force']] += 1
                if r['res'] != 'win': loss[r['force']] += 1
        lr = ', '.join(f"{f} {100*loss[f]/seen[f]:.0f}%" for f in S.FORCES if seen[f])
        print(f"{n:2d} fights: finish {100*ok/N:3.0f}%  avg fights won {statistics.mean(done):4.1f}  end HP {statistics.mean(hp):4.1f}/{MAXHP[fac]}   loss rate: {lr}", flush=True)

def cards(fac, plays, games):
    print(f"\n{fac}: cards played per fight (all single fights)")
    deck = F.DECKS[fac]
    for c, n in deck.items():
        print(f"  {c:18s} x{n}  played {plays[c]/games:5.2f} per fight")

if __name__ == '__main__':
    for fac in ('pressmen', 'concord'):
        p, g = single(fac); dungeons(fac); cards(fac, p, g)
    print("\nSensitivity: enemy fight-back without the +1 enemy damage")
    for fac in ('pressmen', 'concord'):
        single(fac, fightback_bonus=False); dungeons(fac, fightback_bonus=False)
