"""Playtest 08: Pressmen rerun, Concord v1 rerun, and Concord v2 (four units, concussive guns, lethal Breacher)
at armor 3, 4 and 5 soak per piece. +1 enemy damage including fight-backs, 4-HP healing, empty-only squid."""
import statistics, collections
import series_sim as S, faction_sim as F
N = 300
S.SPAWN_MODE = 'empty_only'
VARIANTS = [
    ('Pressmen', dict(faction='pressmen')),
    ('Concord v1 (3 units, armor 3)', dict(faction='concord')),
    ('Concord v2, armor 3 per piece', dict(faction='concord', v2=True, armor_per_piece=3)),
    ('Concord v2, armor 4 per piece', dict(faction='concord', v2=True, armor_per_piece=4)),
    ('Concord v2, armor 5 per piece', dict(faction='concord', v2=True, armor_per_piece=5)),
]
def cfg_for(kw):
    return dict(dict(name='x', enemy_bonus=1, armor_refill=True, armor_per_piece=3), **kw)

def squad_stats(kw):
    sq = F.make_squad(cfg_for(kw))
    return sum(u.maxhp for u in sq), sum(u.armor_max for u in sq)

for label, kw in VARIANTS:
    hp, soak = squad_stats(kw)
    print(f"\n== {label}: {hp} HP, {soak} armor soak")
    print(f"{'force':18s} win%  actions  downed  HPleft  arrests  authority")
    plays = collections.Counter(); games = 0
    for f in S.FORCES:
        w = 0; acts = []; dn = []; hpl = []; ar = []; au = []
        for sd in range(N):
            cfg = cfg_for(kw); sq = F.make_squad(cfg); g = F.FGame(sd, sq, f, cfg); r = g.run()
            w += r == 'win'; acts.append(g.round - 3); dn.append(sum(u.downed for u in sq))
            hpl.append(sum(u.hp for u in sq)); ar.append(g.arrests); au.append(g.auth); plays.update(g.cardplays); games += 1
        print(f"{f:18s} {100*w/N:3.0f}%  {statistics.mean(acts):6.1f}  {statistics.mean(dn):5.2f}  {statistics.mean(hpl):6.1f}  {statistics.mean(ar):6.2f}  {statistics.mean(au):+7.2f}", flush=True)
    for n in (5, 10):
        ok = 0; loss = collections.Counter(); seen = collections.Counter()
        for sd in range(N):
            d, rec = F.run_series(sd, n, cfg_for(kw), S.FORCES)
            ok += d == n
            for r in rec:
                seen[r['force']] += 1
                if r['res'] != 'win': loss[r['force']] += 1
        lr = ', '.join(f"{f.split()[0]} {100*loss[f]/seen[f]:.0f}%" for f in S.FORCES if seen[f])
        print(f"dungeon {n:2d} fights: finish {100*ok/N:3.0f}%   loss rate per force: {lr}", flush=True)
    if 'Concord' in label:
        unused = [c for c in F.DECKS['concord2' if kw.get('v2') else 'concord'] if plays[c] / games < 0.05]
        print("cards played under 0.05 per fight:", ', '.join(unused) or 'none')
