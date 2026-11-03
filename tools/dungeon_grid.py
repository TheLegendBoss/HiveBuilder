"""Dungeon runs: 5 to 10 fights in a row, full heal at the end (so only the run itself is simulated),
healing supply cards (Repair Pack, heals 2 HP, fuel 2) added to the 30-card TSC deck."""
import statistics, series_sim as S
N = 500
cfgs = {
    'harsh (half soak, +1 dmg)': dict(S.HARSH),
    'full soak, +1 dmg': dict(name='x', soak_scale=1.0, enemy_bonus=1),
}
print(f"{'settings':26s} {'fights':>6s} {'packs':>5s} {'finish%':>8s} {'avgDone':>8s} {'endHP/27':>9s}")
for cname, base in cfgs.items():
    for n in (5, 8, 10):
        for k in (0, 2, 4, 6):
            cfg = dict(base); cfg['armor_refill'] = True; cfg['heal_cards'] = k
            ok = 0; done = []; hp = []
            for sd in range(N):
                d, rec = S.run_series(sd, n, cfg, S.FORCES, 0)
                ok += d == n; done.append(d); hp.append(rec[-1]['hp'])
            print(f"{cname:26s} {n:6d} {k:5d} {100*ok/N:7.0f}% {statistics.mean(done):8.1f} {statistics.mean(hp):9.1f}")
