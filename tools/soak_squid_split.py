"""Playtest 05 follow-up: how much of the damage comes from the new soak numbers and how much from the squid."""
import statistics, collections, series_sim as S
N = 300
base = dict(name='x', soak_scale=1.0, chassis_soak=(1, 2), enemy_bonus=1, armor_refill=True, heal_amount=4, heal_cards=2)
print("10 fights, 2 four-HP packs, +1 enemy damage")
for label, mix in (("all five forces", S.FORCES), ("without the squid", [f for f in S.FORCES if f != 'Sump squid'])):
    ok = 0; done = []; lost = collections.Counter(); faced = collections.Counter()
    for sd in range(N):
        d, rec = S.run_series(sd, 10, base, mix, 0); ok += d == 10; done.append(d)
        for r in rec:
            faced[r['force']] += 1
            if r['res'] != 'win': lost[r['force']] += 1
    print(f"  {label:18s} finish {100*ok/N:3.0f}%  avg fights won {statistics.mean(done):.1f}   loss rate per force: "
          + ", ".join(f"{f} {100*lost[f]/max(1,faced[f]):.0f}%" for f in mix))
print("\nSame, with the earlier rounded-up 3/4 soak (built-in 2, armor 3/3/4/3/3) and the new squid:")
old = dict(base); old.pop('chassis_soak'); old['soak_scale'] = 0.75
for label, mix in (("all five forces", S.FORCES), ("without the squid", [f for f in S.FORCES if f != 'Sump squid'])):
    ok = 0; done = []
    for sd in range(N):
        d, rec = S.run_series(sd, 10, old, mix, 0); ok += d == 10; done.append(d)
    print(f"  {label:18s} finish {100*ok/N:3.0f}%  avg fights won {statistics.mean(done):.1f}")
