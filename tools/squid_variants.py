"""Sump squid under 3/4 soak and +1 enemy damage: how the 'generate a tentacle when acting in an empty lane' rule plays."""
import statistics, series_sim as S
N = 300
cfg = dict(name='x', soak_scale=0.75, enemy_bonus=1)
def run(label, **kw):
    for k, v in dict(BODY_HP=12, TENT_HP=3, SPAWN_HP=None, SPAWN_SICK=False, SPAWN_ONLY_UNCAPTURED=False).items():
        setattr(S, k, v)
    for k, v in kw.items():
        setattr(S, k, v)
    w = to = 0; acts = []; dn = []
    for sd in range(N):
        sq = S.make_squad(cfg); g = S.Game(sd, sq, 'Sump squid', cfg); r = g.run()
        w += r == 'win'; to += r == 'timeout'; acts.append(g.round - 3); dn.append(sum(u.downed for u in sq))
    print(f"{label:52s} win {100*w/N:3.0f}%  timeout {100*to/N:3.0f}%  actions {statistics.mean(acts):5.1f}  downed {statistics.mean(dn):.2f}")
run("A. as designed: spawns in any empty lane, 3-HP, body 12")
run("spawned tentacles have 1 HP", SPAWN_HP=1)
run("spawned tentacles skip their first action", SPAWN_SICK=True)
run("B. no spawn in lanes with broken lane HP, 3-HP", SPAWN_ONLY_UNCAPTURED=True)
run("B + spawned tentacles have 1 HP (used in dungeon grid)", SPAWN_HP=1, SPAWN_ONLY_UNCAPTURED=True)
run("A with body 8", BODY_HP=8)
run("A with body 4", BODY_HP=4)
