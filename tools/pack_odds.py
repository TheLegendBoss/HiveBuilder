"""Working model for pack ramp odds (placeholder numbers, to be tuned in playtests).

Each of the 15 slots rolls to step up one rarity rung. The chance on slot k (from 0) is
BASE + GROWTH[tier] * k, capped at CAP. Each higher rung is harder than the last: the chance
to take rung r is that chance times DECAY[tier] ** r. There are no guaranteed floors. A 5-card pack
is the first 5 slots. Rungs: white, green, blue, purple, orange, then red/gold above orange.

Run: python3 tools/pack_odds.py
"""
BASE = 0.036
CAP = 0.85
# per-slot growth: the earlier draft values (2, 3.5, 5, 7, 10, 14 percent) raised 20 percent
GROWTH = {'Basic': 0.024, 'Standard': 0.042, 'Veteran': 0.060, 'Elite': 0.084, 'Vault': 0.120, 'Eagle': 0.168}
DECAY = {'Basic': 0.60, 'Standard': 0.60, 'Veteran': 0.60, 'Elite': 0.60, 'Vault': 0.65, 'Eagle': 0.685}
NAMES = ['white', 'green', 'blue', 'purple', 'orange', 'red/gold']


def slot_chance(tier, k):
    return min(BASE + GROWTH[tier] * k, CAP)


def expected_counts(tier, slots):
    out = [0.0] * 6
    for k in range(slots):
        p, q = slot_chance(tier, k), 1.0
        for r in range(6):
            if r == 5:
                out[r] += q
                break
            pr = p * DECAY[tier] ** r
            out[r] += q * (1 - pr)
            q *= pr
    return out


def p_at_least(tier, slots, rung):
    none = 1.0
    for k in range(slots):
        pr = 1.0
        for r in range(rung):
            pr *= slot_chance(tier, k) * DECAY[tier] ** r
        none *= 1 - pr
    return 1 - none


if __name__ == '__main__':
    print('tier,pack,blue+,purple+,orange+,red/gold')
    for tier in GROWTH:
        for slots in (15, 5):
            vals = [p_at_least(tier, slots, r) * 100 for r in (2, 3, 4, 5)]
            print(f"{tier},{slots}," + ','.join(f"{v:.1f}%" for v in vals))
