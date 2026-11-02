import paper_fight_sim as sim, statistics, collections
def run(label, extra_dmg=0, builtin=2, armor_scale=1.0, n=1500):
    orig = sim.Game.enemy_attack
    class G(sim.Game):
        def __init__(s, seed, log=False):
            super().__init__(seed, log)
            for u in s.punits:
                u.builtin = builtin
                u.armor = u.armor_max = round(u.armor_max * armor_scale)
        def enemy_attack(s, u, dmg, melee):
            return super().enemy_attack(u, dmg + extra_dmg, melee)
    res = collections.Counter(); rounds = []; downed = []; hp = []
    for sd in range(n):
        g = G(sd); r = g.run(); res[r] += 1
        rounds.append(g.round - 3); downed.append(sum(u.downed for u in g.punits)); hp.append(sum(u.hp for u in g.punits))
    print(f"{label:34s} {dict(res)} len {statistics.mean(rounds):.1f} downed {statistics.mean(downed):.2f} HP left {statistics.mean(hp):.1f}/27")
run("baseline")
run("no built-in soak", builtin=0)
run("half armor soak", armor_scale=0.5)
run("no built-in + half armor", builtin=0, armor_scale=0.5)
run("enemy +1 damage", extra_dmg=1)
run("enemy +1 dmg, no built-in", extra_dmg=1, builtin=0)
run("enemy +1 dmg, no built-in, half arm", extra_dmg=1, builtin=0, armor_scale=0.5)
