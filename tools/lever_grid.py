"""Playtest 06: which levers hit the target finish rates (about 85-90% at 5 fights, 60% at 10)?
Chassis soak 1/2, armor 2, 4-HP packs, capped squid. Varies enemy damage bonus and pack count."""
import sys, series_sim as S
N = 300
BASE = dict(name='x', soak_scale=1.0, chassis_soak=(1, 2), armor_refill=True, heal_amount=4)
print(f"{'squid spawns':12s} {'enemy dmg':>9s} {'packs':>5s} {'5 fights':>9s} {'10 fights':>10s}")
for mode in ('empty_only', 'fill_to_cap'):
    S.SPAWN_MODE = mode
    for eb in (1, 0):
        for k in (2, 3, 4, 6):
            out = []
            for n in (5, 10):
                cfg = dict(BASE); cfg['enemy_bonus'] = eb; cfg['heal_cards'] = k
                ok = sum(S.run_series(sd, n, cfg, S.FORCES, 0)[0] == n for sd in range(N))
                out.append(100 * ok / N)
            print(f"{mode:12s} {'+'+str(eb):>9s} {k:5d} {out[0]:8.0f}% {out[1]:9.0f}%", flush=True)
