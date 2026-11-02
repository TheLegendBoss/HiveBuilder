"""Extra series cuts: baseline config for context, who ends expeditions, HP by fight number."""
import collections, statistics, series_sim as S
N = 600
mix = S.FORCES
print("Baseline (full soak, no enemy bonus), mixed, no rest, armor refills:")
for n in (5, 10, 15):
    cfg = dict(S.BASE); cfg['armor_refill'] = True
    ok = 0; done = []
    for sd in range(N):
        d, rec = S.run_series(sd, n, cfg, mix, 0); ok += d == n; done.append(d)
    print(f"  {n:2d} fights: finish {100*ok/N:.0f}%  avg fights done {statistics.mean(done):.1f}")
print("\nHarsh, mixed, no rest, armor refills, 10 fights: what ends the expedition")
cfg = dict(S.HARSH); cfg['armor_refill'] = True
ends = collections.Counter(); faced = collections.Counter(); lost = collections.Counter()
hp_by = collections.defaultdict(list)
for sd in range(N):
    d, rec = S.run_series(sd, 10, cfg, mix, 0)
    for i, r in enumerate(rec):
        faced[r['force']] += 1
        hp_by[i + 1].append(r['hp'])
        if r['res'] != 'win':
            lost[r['force']] += 1
for f in mix:
    print(f"  {f:18s} faced {faced[f]:5d}  lost {lost[f]:4d}  loss rate {100*lost[f]/max(1,faced[f]):.0f}%")
print("  total squad HP after fight k (max 27):", {k: round(statistics.mean(v), 1) for k, v in sorted(hp_by.items())})
