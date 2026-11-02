"""Tuning grid: 10 fights in a row, mixed enemies, no rest, armor refills between fights."""
import statistics, series_sim as S
N = 400
print(f"{'soak':>6s} {'enemy dmg':>10s} {'finish 5':>9s} {'finish 10':>10s} {'avg done (10)':>14s} {'single-fight loss%':>19s}")
for sc in (1.0, 0.75, 0.5):
    for eb in (0, 1):
        cfg = dict(name='x', soak_scale=sc, enemy_bonus=eb, armor_refill=True)
        r = {}
        for n in (5, 10):
            ok = 0; done = []
            for sd in range(N):
                d, rec = S.run_series(sd, n, cfg, S.FORCES, 0); ok += d == n; done.append(d)
            r[n] = (ok / N, statistics.mean(done))
        loss = 0; tot = 0
        for sd in range(N):
            for f in S.FORCES:
                sq = S.make_squad(cfg); g = S.Game(sd, sq, f, cfg); loss += g.run() != 'win'; tot += 1
        print(f"{sc:6.2f} {'+'+str(eb):>10s} {100*r[5][0]:8.0f}% {100*r[10][0]:9.0f}% {r[10][1]:14.1f} {100*loss/tot:18.1f}%")
