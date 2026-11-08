---
name: hive-deck-ui
description: UI and visual design rules for Hive Deck (working title), a grim-dark deckbuilding game in Phaser 4. Use when building or changing any screen, card, panel, menu, tooltip, animation or setting.
---

# Hive Deck UI guide

This guide sets how the game looks and how its screens work, so every screen stays consistent. It sits beside the Phaser conventions skill, which covers code structure (sim separated from view, data not code, Containers for cards, Scale.RESIZE). Where the two overlap, the Phaser conventions win on code and this guide wins on look and feel. Every number marked (working) is a starting value to tune in play, not a settled rule.

## 1. Art approach

- Vector line art only for now: no image files. Draw with Phaser Graphics, Shape objects and text. Static shapes are drawn once and redrawn only when state changes.
- Icons are simple shapes built in code (circle, diamond, triangle, bar). Each icon shape is defined once in `src/ui/icons.ts` and reused.
- The one asset exception is the bundled font (section 3). Portraits and illustrations may come later; leave room for them in card and unit layouts but draw nothing now.

## 2. Palette and rarity colors

All colors live in `src/data/palette.ts` and nowhere else. Never write a hex value inside a scene.

Mood: near-black with warm grime. Rarity colors are the main color on screen, so everything else stays muted.

| Token | Hex (working) | Use |
| --- | --- | --- |
| bg | #0e0c0a | Screen background |
| panel | #1a1714 | Panels and cards |
| panelRaised | #26211c | Hover, selected panel |
| line | #3a332b | Borders and dividers |
| text | #d8cfc0 | Body text |
| textMuted | #8a8174 | Secondary text, disabled labels |
| danger | #c93a2e | Damage, warnings (same as red rarity) |
| rarity.white | #d9d4c7 | White cards |
| rarity.green | #6fae5a | Green cards |
| rarity.blue | #4a8fd6 | Blue cards |
| rarity.purple | #9a62d1 | Purple cards |
| rarity.orange | #e08a2e | Orange cards |
| rarity.red | #c93a2e | Red cards (special) |
| rarity.gold | #e5c04a | Gold cards (special) |

Faction accents (TSC, Pressmen, Concord) are used only for a small crest and one header strip per screen. They must not look like a rarity color. Pick the accent hexes when each faction's screen is built (open).

Rules:
- Rarity is shown by frame color plus a shape marker (one notch per rarity step), so it never relies on color alone.
- Statuses and suits each have a color and a shape. Status icons: Stunned, Burning, Exposed, Slowed, Suppressed, Webbed. Suits: clubs, diamonds, hearts, spades use their real suit shapes.
- Damage numbers are danger red, healing is rarity green, stress is rarity purple, fuel is a pale pip.

## 3. Typography and text size

- One bundled monospace font (an open-licence font such as IBM Plex Mono or JetBrains Mono, chosen at build time), loaded before the first scene. Same look on every machine.
- Size scale at the 1080p reference (working): title 40, heading 28, body 18, small 14, never below 12.
- The Settings text size option scales all of it: 100%, 125% and 150%. Layouts must reflow at 150% without clipping; text wraps instead of shrinking.
- Text color on panels is `text` or `textMuted`. Never put body text directly on a rarity color.

## 4. Resolution and scaling

- Reference size 1920 by 1080; minimum supported 1280 by 720.
- Scale.RESIZE with a #game parent. Lay out from `this.scale.width` and `this.scale.height` on every resize.
- UI scale factor = min(width / 1920, height / 1080) times the text size setting. Spacing uses an 8 px base unit times that factor.
- Desktop first, mouse and keyboard. Touch is not a goal yet, but hit targets are at least 32 px at the reference size so it can come later.

## 5. Screens and layouts

One scene per screen. A persistent HUD scene runs in parallel and keeps its own camera.

| Screen | Contents |
| --- | --- |
| Boot | Load font and data, then go to Main Menu |
| Main Menu | Continue, New Game, Load Game, Sandbox Mode, Settings, Exit. Continue, New Game and Load Game are greyed out as "coming soon" in the first build |
| Settings | Volume, fullscreen, text size. Back returns to wherever it was opened from |
| Sandbox Setup | Pick a faction, start tier and ramp, starting Eagles and gear, or load a saved quickstart preset. Save preset, load preset |
| Save / Load | One autosave slot plus manual slots; each shows faction, depth and timestamp |
| Hub (HQ) | Always has a market for packs. Buttons for squad and loadout, deck view, promotion, repairs, selling, and Start Expedition |
| Expedition Map | The floor's rooms and exits, current position, the Eagles, supplies and power counters, the hand |
| Room | One layout per room type (Scavenge, Hazard, Gamble, Rest, Market, Control room and so on), sharing a title bar, a description and a choices area |
| Combat | See section 6 |
| Aftermath | Injury and affliction faces, stress breaks, virtue picks, loot and rewards |

Every screen has Esc open a pause or back menu, and no screen is a dead end.

## 6. Combat layout

- Three vertical lanes. Enemy units sit at the top of each lane, your squad at the bottom, and the lane's terrain (suit) shows as a band down its middle.
- The hand sits along the bottom edge. The deck, the shared discard pile (countable) and the results deck sit at the right edge. Initiative order sits along the top.
- A unit shows its name, HP, soak, stress (not for droids), and status icons. Enemy units also show their next intended action when it is known (wind-up).
- A drawn results card appears center screen for a moment with its band (low, mid, high) named, then settles into the discard.
- Selecting a card highlights every legal target; illegal targets dim. Hover shows the full text.

## 7. Card anatomy

- Fixed card size at the reference resolution (working: 180 by 252), drawn as a Container: frame, name, fuel pips, effect text, and a footer.
- Frame color is the rarity. Top left: name. Top right: fuel value as pips (up to 5 plus a number for 32). Body: effect text. Footer: type tag (weapon, perk, skill, supplies, clog) and the rarity notches.
- Hand cards show name, fuel and a one-line effect; hovering raises the card and shows the full text in a tooltip panel.
- States: normal, hover (raised, panelRaised), selected (bright outline), disabled or unplayable (dim, with the reason in the tooltip), locked (small lock mark, so it can't be sold by accident), exhausted (turned dim and greyed).
- Clog cards (burn and similar) use the panel color with a danger-red frame and show the discard damage on the card.

## 8. Components

Defined once in `src/ui/` and reused:
- Button: normal, hover, pressed, disabled. Labels are short verbs. Disabled buttons show a tooltip with the reason.
- Panel: panel color, 1 px line border, 8 px base padding.
- Tooltip: appears after about 250 ms of hover (working), stays inside the screen, never blocks the thing it describes.
- Modal: dims the background, traps focus, closes on Esc or its Cancel button. Confirm buttons name the action ("Sell for 8 Eagles"), not just "OK".
- Toggle and slider: used in Settings; show the current value as text.
- Counter: icon plus number; shows a change as a short colored delta (+3, -1).

## 9. Input

- Mouse first: click a card to select it, then click a target. Drag and drop onto a legal target works as well; both always work.
- Keyboard extras (working): 1 to 3 pick a lane, Space ends the turn, Esc opens the pause or back menu, Tab cycles targets, Enter confirms.
- Every action reachable by mouse is reachable by keyboard, and the reverse.

## 10. Motion and feedback

- Animations are short (working: 120 to 250 ms for moves and hits, up to 600 ms for a results card draw) and use tweens. The sim never waits for an animation; the view catches up from events.
- A Settings option to speed up or skip animations is planned; build animations so they can be sped up or skipped.
- Feedback for every action: a short flash or number on the target, plus text in the combat log. Nothing important is shown only by color or only by motion.

## 11. Accessibility

- Never color alone: every color has a shape or text partner (section 2).
- Text scales with the Settings option (section 3) and reflows.
- Contrast: body text on a panel is at least 4.5 to 1.
- Nothing flashes more than three times a second.

## 12. Before finishing a UI change

1. Typecheck and build pass.
2. Open the screen in a browser at 1920 by 1080 and at 1280 by 720, and look at it.
3. Check it at 150% text size.
4. No hex value outside `src/data/palette.ts`, and no UI number that belongs in `src/data/`.
5. Hover, disabled and empty states have been looked at, not just the normal state.
