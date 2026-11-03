"""3/4 soak depends on rounding: ceil keeps most droids at full soak, floor drops them. Squid version B, 4-HP packs, +1 enemy damage."""
import statistics, series_sim as S
N = 300
S.BODY_HP = 12; S.TENT_HP = 3; S.SPAWN_HP = 1; S.SPAWN_SICK = False; S.SPAWN_ONLY_UNCAPTURED = True
def soaks(cfg):
    sq = S.make_squad(cfg)
    return f"built-in {sq[0].builtin_max}, armor {[u.armor_max for u in sq]}"
print(f"{'rounding':>8s} {'fights':>6s} {'packs':>5s} {'finish%':>8s} {'avgDone':>8s} {'endHP/27':>9s}   squad soak")
for rnd in ('ceil', 'floor'):
    for n in (5, 10):
        for k in (0, 2, 4):
            cfg = dict(name='x', soak_scale=0.75, enemy_bonus=1, armor_refill=True, heal_cards=k, heal_amount=4, round=rnd)
            ok = 0; done = []; hp = []
            for sd in range(N):
                d, rec = S.run_series(sd, n, cfg, S.FORCES, 0)
                ok += d == n; done.append(d); hp.append(rec[-1]['hp'])
            print(f"{rnd:>8s} {n:6d} {k:5d} {100*ok/N:7.0f}% {statistics.mean(done):8.1f} {statistics.mean(hp):9.1f}   {soaks(cfg) if k==0 and n==5 else ''}", flush=True)
