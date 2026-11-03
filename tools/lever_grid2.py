"""Playtest 06: lever 2 (enemy damage +1 only for the squid and Deserter patrol), lever 3 (armor soak per piece),
and both together. Chassis soak 1/2, 4-HP packs, empty-only squid spawning."""
import series_sim as S
N = 300
BASE = dict(name='x', soak_scale=1.0, chassis_soak=(1, 2), armor_refill=True, heal_amount=4)
HARD = {'Sump squid': 1, 'Deserter patrol': 1}
def run(label, eb, ap, packs):
    out = []
    for n in (5, 10):
        cfg = dict(BASE); cfg.update(enemy_bonus=eb, armor_per_piece=ap, heal_cards=packs)
        out.append(100 * sum(S.run_series(sd, n, cfg, S.FORCES, 0)[0] == n for sd in range(N)) / N)
    print(f"{label:34s} packs {packs}  5 rooms {out[0]:3.0f}%   10 rooms {out[1]:3.0f}%", flush=True)
print("Baseline: +1 to every force, armor 2 per piece")
for k in (2, 3): run("  baseline", 1, 2, k)
print("Lever 2: +1 only vs squid and Deserter patrol, +0 vs the rest")
for k in (2, 3): run("  lever 2", HARD, 2, k)
print("Lever 3: +1 vs every force, more armor soak per piece")
for ap in (3, 4):
    for k in (2, 3): run(f"  lever 3, armor {ap} per piece", 1, ap, k)
print("Both: +1 only vs squid and Deserter patrol, more armor soak per piece")
for ap in (3, 4):
    for k in (2, 3): run(f"  both, armor {ap} per piece", HARD, ap, k)
