"""Playtest 05: chassis soak (small chassis 1, large chassis 2 built-in; 2 per armor piece), +1 enemy damage,
4-HP healing supplies, and the revised squid (2-HP tentacles capped at 3 per lane, free chain attack,
no spawning in closed lanes but the body still attacks there)."""
import statistics, sys, series_sim as S
N = 300
CFG = dict(name='x', soak_scale=1.0, chassis_soak=(1, 2), enemy_bonus=1, armor_refill=True, heal_amount=4)

def single():
    print(f"{'force':20s} {'mode':12s} win%  timeout%  actions  avgDowned  HPleft/27")
    for f in S.FORCES:
        modes = ['empty_only', 'fill_to_cap'] if f == 'Sump squid' else ['-']
        for mode in modes:
            if mode != '-':
                S.SPAWN_MODE = mode
            w = to = 0; acts = []; dn = []; hp = []
            for sd in range(N):
                cfg = dict(CFG); cfg['heal_cards'] = 2
                sq = S.make_squad(cfg); g = S.Game(sd, sq, f, cfg); r = g.run()
                w += r == 'win'; to += r == 'timeout'; acts.append(g.round - 3)
                dn.append(sum(u.downed for u in sq)); hp.append(sum(u.hp for u in sq))
            print(f"{f:20s} {mode:12s} {100*w/N:3.0f}%  {100*to/N:6.0f}%  {statistics.mean(acts):6.1f}  {statistics.mean(dn):8.2f}  {statistics.mean(hp):7.1f}", flush=True)
    S.SPAWN_MODE = 'empty_only'

def grid():
    print(f"\n{'squid spawns':12s} {'fights':>6s} {'packs':>5s} {'finish%':>8s} {'avgDone':>8s} {'endHP/27':>9s}")
    for mode in ('empty_only', 'fill_to_cap'):
        S.SPAWN_MODE = mode
        for n in (5, 8, 10):
            for k in (0, 2, 4):
                cfg = dict(CFG); cfg['heal_cards'] = k
                ok = 0; done = []; hp = []
                for sd in range(N):
                    d, rec = S.run_series(sd, n, cfg, S.FORCES, 0)
                    ok += d == n; done.append(d); hp.append(rec[-1]['hp'])
                print(f"{mode:12s} {n:6d} {k:5d} {100*ok/N:7.0f}% {statistics.mean(done):8.1f} {statistics.mean(hp):9.1f}", flush=True)

if __name__ == '__main__':
    single(); grid()
