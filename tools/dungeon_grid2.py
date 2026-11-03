"""Dungeon runs at 3/4 soak and +1 enemy damage, with 4-HP (and reference 2-HP) healing supplies,
and two squid versions: A = spawns a tentacle whenever it acts in an empty lane (as designed),
B = same, but not in lanes whose lane HP is already broken, and spawned tentacles have 1 HP."""
import statistics, sys, series_sim as S
N = 300
def setsquid(v):
    S.BODY_HP = 12; S.TENT_HP = 3
    S.SPAWN_HP = None if v == 'A' else 1
    S.SPAWN_SICK = False
    S.SPAWN_ONLY_UNCAPTURED = (v == 'B')
print(f"{'squid':>5s} {'heal':>4s} {'fights':>6s} {'packs':>5s} {'finish%':>8s} {'avgDone':>8s} {'endHP/27':>9s}")
rows = [('A', [4]), ('B', [2, 4])]
for sq, heals in rows:
    setsquid(sq)
    for heal in heals:
        for n in (5, 8, 10):
            for k in (0, 2, 4):
                cfg = dict(name='x', soak_scale=0.75, enemy_bonus=1, armor_refill=True, heal_cards=k, heal_amount=heal)
                ok = 0; done = []; hp = []
                for sd in range(N):
                    d, rec = S.run_series(sd, n, cfg, S.FORCES, 0)
                    ok += d == n; done.append(d); hp.append(rec[-1]['hp'])
                print(f"{sq:>5s} {heal:4d} {n:6d} {k:5d} {100*ok/N:7.0f}% {statistics.mean(done):8.1f} {statistics.mean(hp):9.1f}", flush=True)
