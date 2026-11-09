---
name: hive-deck-ui
description: UI and visual design rules for Hive Deck, a grim-dark Phaser 4 deckbuilder. Use when building or changing any screen, card, panel, menu, tooltip, animation or setting.
---

# Hive Deck UI guide (v5 direction)

This guide sets how the game looks and how its screens work, so every screen stays consistent. It sits beside the Phaser conventions skill, which covers code structure (sim separated from view, data not code, Containers for cards, Scale.RESIZE). Where the two overlap, the Phaser conventions win on code and this guide wins on look and feel. Every number marked (working) is a starting value to tune in play, not a settled rule.

The look is brutalist and grimy, but dirt appears only where it carries information. Text and numbers are always on a clean surface. The reference mockups are the "v5" boards on the Hive Deck UI Mockups canvas (Style, Main menu, Combat, Faction skins). Mockups are drawn at 1280 by 720; the numbers below are for the 1920 by 1080 reference (multiply mockup sizes by 1.5).

## 1. Art approach

- Vector line art only for now: no image files. Draw with Phaser Graphics, Shape objects and text. Static shapes are drawn once and redrawn only when state changes.
- Icons are simple shapes built in code (circle, diamond, triangle, bar, skull outline). Each icon shape is defined once in `src/ui/icons.ts` and reused.
- All symbols are original. Do not copy Warhammer or other licensed imagery, names or logos.
- The one asset exception is the bundled fonts (section 3). Portraits and illustrations may come later; leave room for them in card and unit layouts but draw nothing now.

## 2. Palette, signal color and rarity colors

All colors live in `src/data/palette.ts` and nowhere else. Never write a hex value inside a scene.

Mood: near-black with warm grime. Rarity colors are the main color on cards, so everything else stays muted.

| Token | Hex (working) | Use |
| --- | --- | --- |
| bg | #0e0c0a | Screen background |
| panel | #1a1714 | Panels and cards |
| panelDeep | #14110e | Lane backgrounds, inset areas |
| panelRaised | #26211c | Hover, selected panel |
| line | #3a332b | Borders and dividers |
| bolt | #4a4237 | Corner bolts on panels |
| text | #d8cfc0 | Body text |
| textMuted | #8a8174 | Secondary text, disabled labels |
| danger | #c93a2e | Damage, warnings, stamps (same as red rarity) |
| bloodDry | #4a1410 | The lost part of an HP bar |
| hazard | #4a3818 and #14110e | Hazard stripe |
| rarity.white | #d9d4c7 | White cards |
| rarity.green | #6fae5a | Green cards |
| rarity.blue | #4a8fd6 | Blue cards |
| rarity.purple | #9a62d1 | Purple cards |
| rarity.orange | #e08a2e | Orange cards |
| rarity.red | #c93a2e | Red cards (special) |
| rarity.gold | #e5c04a | Gold cards (special) |

### Signal color = faction accent

One color means "live, yours, act here". It is the accent of the faction the player leads, exposed in code as `palette.signal`:

| Faction | Accent (working) |
| --- | --- |
| TSC | #3fa7a0 (teal) |
| Pressmen | #b8553a (ember) |
| Concord | #8f9bb3 (cold steel) |

Signal color is used only for: the acting unit, the selected card, legal targets, the current initiative chip, the hand tray border, cables between a selected card and its targets, and the primary button. Everything else stays dim. Amber is not used as a signal because it collides with the orange and gold rarity colors.

Rules:
- Rarity is shown by frame color plus a text or shape marker (rank label on the card, one notch per step), so it never relies on color alone.
- Statuses and suits each have a color and a shape. Status icons: Stunned, Burning, Exposed, Slowed, Suppressed, Webbed. Suits use their real suit shapes.
- Damage numbers are danger red, healing is rarity green, stress is rarity purple, fuel is a pale pip.

## 3. Typography and text size

- Two bundled fonts, loaded before the first scene so every machine looks the same: Big Shoulders Stencil Display (700 and 900) for titles, names, buttons and stamps, always uppercase; Saira Semi Condensed (400 to 700) for everything else: body, numbers, labels, type lines and rules text. Both are open licence. (Replaces IBM Plex Mono, which read poorly at card sizes. Chosen from five options in the card mockups. Saira has no italic, so bold-italic titles use a synthesized slant.)
- Size scale at the 1080p reference (working): title 90 (menu lockup) or 60, heading 36, unit and card name 24 to 27, body 18, labels 16.
- Floors at the reference: card effect text 18, labels and details 16, never below 14. (The mockups show these as 12 and 11 at 1280 by 720.)
- The Settings text size option scales all of it: 100%, 125% and 150%. Layouts must reflow at 150% without clipping; text wraps instead of shrinking.
- Text color on panels is `text` or `textMuted`. Never put body text directly on a rarity color, a hazard stripe or a grime effect.

## 4. Resolution and scaling

- Reference size 1920 by 1080; minimum supported 1280 by 720.
- Scale.RESIZE with a #game parent. Lay out from `this.scale.width` and `this.scale.height` on every resize.
- UI scale factor = min(width / 1920, height / 1080) times the text size setting. Spacing uses an 8 px base unit times that factor.
- Desktop first, mouse and keyboard. Touch is not a goal yet, but hit targets are at least 32 px at the reference size so it can come later.

## 5. Screens and layouts

One scene per screen. A persistent HUD scene runs in parallel and keeps its own camera.

| Screen | Contents |
| --- | --- |
| Boot | Load fonts and data, then go to Main Menu |
| Main Menu | Title lockup top left, hive cutaway on the left (see below), bolted console on the right with Continue, New Game, Load Game, Sandbox Mode, Settings, Exit. Continue, New Game and Load Game carry an OFFLINE stamp in the first build. Bottom left: Expeditions Lost counter (four digits) with skull outlines, and a memorial plaque |
| Settings | Volume, fullscreen, text size, colorblind mode, animation speed, keyword reminders (on hover or always). Back returns to wherever it was opened from |
| Sandbox Setup | Pick a faction, start tier and ramp, starting Eagles and gear, or load a saved quickstart preset. Save preset, load preset |
| Save / Load | One autosave slot plus manual slots; each shows faction, depth and timestamp |
| Hub (HQ) | Always has a market for packs. Buttons for squad and loadout, deck view, promotion, repairs, selling, and Start Expedition |
| Expedition Map | The floor's rooms and exits, current position, the Eagles, supplies and power counters, the hand |
| Room | One layout per room type (Scavenge, Hazard, Gamble, Rest, Market, Control room and so on), sharing a title bar, a description and a choices area |
| Combat | See section 6 |
| Aftermath | Injury and affliction faces, stress breaks, virtue picks, loot and rewards |

Every screen has Esc open a pause or back menu, and no screen is a dead end.

**Hive cutaway:** a stepped silhouette of the hive, six floors (Spire, Upper Hive, Middle Hive, Lower Hive, Underhive, The Sump), wider toward the bottom, windows as a faint pattern. The Middle Hive floor, the sandbox floor, is lit in the signal color and labelled. A dashed cable runs from the Sandbox Mode item to that floor. In later builds the lit floor follows the campaign position.

**Depth gauge:** eight small blocks in the combat top bar with the current tier lit in the signal color, earlier tiers filled in muted tone, later tiers empty.

## 6. Combat layout

- **One loud area.** The hand tray and the acting unit panel are the biggest, brightest things on screen. Lanes, counters and the log are quieter.
- Three vertical lanes. Enemy units sit at the top of each lane, your squad at the bottom, divided by a hazard-stripe "front line". The lane's terrain shows as a line of text at the bottom of the lane.
- The hand sits in a bolted tray along the bottom with a signal-color border. The deck pile sits at the tray's left end and the shared discard pile at its right end. The results deck draws center screen.
- The acting unit panel fills the right column: name, faction and lane, portrait frame, HP bar, stress pips, fuel pips (the cost of the selected card shows as pending), status chips, scar line, expedition tally, controls hint and the End Turn button.
- The top bar holds the depth gauge, the initiative order as chips (current chip filled with the signal color, enemy chips with the Pressmen plate border, squad chips with the squad border), the round and the supplies.
- A one-line vox log sits between the lanes and the hand.
- Enemy units show an intent badge above the plate (diamond marker plus a short label such as ATK 4 or BRACE 2). The badge always has text, never color alone.
- Selecting a card draws a **cable** from the card to each legal target; targets get a signal-color border and a TARGET tag, illegal targets dim and are tagged OUT OF RANGE. The cable is a dashed signal line over a dark underline. A thin grey cable ties the deck pile to the hand label. Cables are information: they appear only when a card is selected or a draw is in progress.
- A unit plate shows icon, name, HP bar, stress (not for droids), tally marks, and status chips (SOAK, BOSS, BURNING and so on).
- A drawn results card appears center screen for a moment with its band (low, mid, high) named, then settles into the discard.
- Hover shows the full card text.

## 7. Card anatomy

- Fixed card size at the reference resolution (working: 201 by 294, the mockup's 134 by 196), drawn as a Container: frame, burn hexagon, name, type line, art strip, rules box, footer stack.
- Frame color is the rarity. Top left: the name in stencil type, with the type line below it (see 7.2). Top right: the burn value in a red hexagon, like mana on an MTG card, with no label. Buildings have none. Then an art strip (see 7.3), then the rules box (see 7.1). Footer, centered: the faction or restriction name when the card has one (name only), one star per rarity step, then the rarity name. The keyboard shortcut sits in a small box on hand cards.
- Rarity names (decided): white **Basic**, green **Improved**, blue **Advanced**, purple **Enhanced**, orange **[name still to decide]**, red **Unique**, gold **Archeotech**. Anywhere the game names a rarity (card footer, reveal stamps, tooltips, pack summaries) it uses these words, never the color name. Frame color and stars repeat the same information, so rarity never relies on color alone.
- Hand cards show all of the above. Hovering raises the card and shows the full text in a tooltip panel if it is clipped.
- States: normal, hover (raised, panelRaised), selected (raised 36 px at the reference, signal outline plus a glow), disabled or unplayable (dim, with the reason in the tooltip), locked (small lock mark, so it can't be sold by accident), exhausted (turned dim and greyed).
- Clog cards (burn and similar) use the panel color with a danger-red frame and show the discard damage on the card.

### 7.1 Rules box: one grammar for every ability

Every ability is one row, and every row has the same three parts: a leader, a name and an effect.

```
(3): Quick - Deal 2 damage to one enemy.
Passive: Max soak - 3.
```

| Row | Leader | Meaning |
| --- | --- | --- |
| Activated | `(N)` in a red hexagon: the fuel cost to use it, same shape and color as the burn value. `(0)` is printed for free actions | You choose to use it. Gear actions, action cards, supplies |
| Passive | Listed under a `PASSIVE` header | Always on while the card is in play. Stat lines (ammo, max soak), drawbacks and standing triggers ("When ...") |

- A card lists passives first, then activated rows, cheapest first. Rarity riders come last in a row group labelled RIDER, in the same grammar.
- In plain text (data files, docs, tooltips) a row is `(N): Name - Effect` or `Passive: Name - Effect`. On the card the body is up to three sections, each opened by a small header and a rule in the frame color:
  - **PASSIVE** (header, rule): each entry is a bold-italic title and a period, then the text (`Max Soak. 3 Points`, `Ammo. 6 Shots`, `Akimbo. One action...`). A closing rule ends the section.
  - **ACTIVATED** (header, rule): each entry is the cost hexagon, then the bold name and a period with the description running on in the same line, wrapping beside the hexagon (`1  **Aimed Shot.** Deal 6 damage to one enemy.`). A closing rule appears only when a RIDER section follows.
  - **RIDER**: same pattern as PASSIVE.
  Enemy actions use an outlined rust square with the order number instead of a hexagon, since they cost no fuel.
- Names are short (one or two words) and unique on the card.
- The effect is one or two short sentences, imperative, in this vocabulary: **Deal** N damage, **Restore** N HP or soak, **Gain** N soak, **Refill** N ammo, **Draw**, **Remove** a status, **Apply** a status. Targets: "one enemy", "two enemies", "every enemy in the lane", "one unit in this lane", "this unit", "the attached gear".
- Numbers are digits. A card prints final numbers only: a green Scrap cleaver says "Deal 3", never "+1 damage". Deltas between rarities live in tooltips and the Codex.
- Limits come last, as a short sentence: "Once per fight." "Once per expedition." **Consumed.** (the item is destroyed after use, as in the Fate table).
- Keywords are capitalized and defined once in the glossary: Wind-up N, Ranged, Exposed, Stunned, Suppressed, Slowed, Burning, Consumed. Reminder text appears in the hover tooltip. The Settings option **Keyword reminders** switches between **On hover** (default) and **Always** (small italic text under the row).
- Row budget: at most 4 rows on a hand card. Anything longer is cut in design, not shrunk. Mockup space budget for an item card: about 14 lines of 35 characters including headers, so a full card is two activated abilities with 2-line descriptions (about 70 characters) plus one rider.

### 7.2 Type line and card kinds

- Format: `KIND · CLASS, SIZE`. Kinds: GEAR, ACTION, SUPPLY, DISPOSABLE, ATTACHMENT, ACCESSORY, PERK, SKILL, UNIT, CLOG. Example: `GEAR · MELEE, LIGHT`.
- Each kind also gets a frame cue so the silhouette reads before the text does (working, to be reviewed in a card-kinds pass): gear with a cut top-left corner, action cards plain with a faint stripe down the left edge, supplies with a taped edge, disposables with a hazard stripe on the footer, attachments with a socket mark on the frame, perks with a cut bottom-right corner, skills with a cut bottom-left corner, buildings with both bottom corners cut.

### 7.3 Art on cards

- Every card keeps a short **art strip** (270 by 52 in the mockup, about 180 by 35 in game). Cards do not trade rules space for bigger art. Art has to work as a banner: gear shots and scenes, with faces cropped to a focus point.
- The **character screen** (gear up, level up, promotions) and the card **inspect** view show the full, uncropped art. That is where portraits are shown large.
- Commission one master image per card at 5 to 7 portrait (900 by 1260). The strip is a crop with a focus point set per card, and the inspect view shows it whole.
- Crew cards lay their meters over the foot of a taller portrait window (270 by 132 in the mockup) to keep the art visible. Working, to be revisited with the character screen.

### 7.4 Meter colors

- On crew and enemy cards: **HP red** (#d9473b, track #4a1814), **Soak blue** (#4a9be0, built-in soak #2b5b8c) and **Stress yellow** (#e2b93b). Working values, to move into `palette.ts` when the cards are built. They sit near the fuel red, the Advanced blue and the Archeotech gold, so they only ever appear as bars on unit cards, never as frames, and enemy order markers use rust instead of red.

## 8. Faction skins

The same layout is skinned per faction. Only surface treatment changes: border, corner shape, texture and button style. Components never change size or position between skins.

| Faction | Skin |
| --- | --- |
| TSC | Clean steel panel (#11171a), chamfered corners, faint scan lines, L-shaped teal brackets on two corners, a glowing outlined chamfered button |
| Pressmen | Heavy riveted plate (#231913) with a thick border (#5a3a22), a hazard stripe along the top, large rivets, a solid ember button with a darker bottom edge so it looks pressed |
| Concord | Cold panel (#161a20) with a dashed steel border, perforation dots down the left edge, striped writ tape across a corner, a pressed seal drawn from concentric circles and a star, an outlined button reading "Serve writ" for its main action |

Enemy plates use the Pressmen-style heavy border by default. A faction's skin is chosen by the unit's or screen's faction. Only the player's faction supplies `palette.signal`.

## 9. Wear carries information

Dirt and damage are shown only where they mean something, and never on top of text.

- **Blood is the lost HP.** An HP bar's background is dried blood (bloodDry). The fill is the remaining HP in text color. When the unit is hurt, a short drip hangs down from the edge of the fill (one long and one short, 2 px wide). Full HP shows no drip. The bar always matches the numbers next to it.
- **Scorch** is a dark orange gradient rising from the bottom of a plate that has the Burning status, plus the BURNING chip.
- **Tally marks** (vertical strokes, a diagonal slash for every fifth) on a unit plate count expeditions survived.
- **Scars** are small icons with a one-line description in the acting unit panel (lasting injuries). They do not decorate plates.
- **Skulls and the memorial plaque** mark loss: the main menu counts Expeditions Lost with bone-colored skulls (outlines for empty slots), and the plaque lists the names of units who walked into the dark.
- **Stamps** (rotated stencil text in a red box) mark states such as OFFLINE or condemned. They are the only rotated element.
- Hazard stripes mark danger zones (the front line, panel headers). Bolted panels (four corner bolts) are the default container for anything that is a console or tray.
- Faint scan lines may cover a panel. No grime filter, noise or splatter is ever laid over text, cards or numbers.

## 10. Components

Defined once in `src/ui/` and reused:
- Button: normal, hover, pressed, disabled. Labels are short verbs in stencil type. Disabled buttons show a tooltip with the reason; OFFLINE items show the stamp.
- Panel: panel color, 1 px line border, 8 px base padding, optional corner bolts, optional hazard header strip.
- Tooltip: appears after about 250 ms of hover (working), stays inside the screen, never blocks the thing it describes.
- Modal: dims the background, traps focus, closes on Esc or its Cancel button. Confirm buttons name the action ("Sell for 8 Eagles"), not just "OK".
- Toggle and slider: used in Settings; show the current value as text.
- Counter: icon plus number; shows a change as a short colored delta (+3, -1).
- Bar: HP, stress (ten pips), fuel (circle pips), with the blood treatment for HP.
- Lamp: small circle, lit in the signal color or dim; used in panel headers and fuel pips.
- Cable: dashed line between two points over a dark underline, with a dot at each end.

## 11. Input

- Mouse first: click a card to select it, then click a target. Drag and drop onto a legal target works as well; both always work.
- Keyboard extras (working): 1 to 7 pick a card, Tab and Shift+Tab cycle targets, Enter confirms, E or Space ends the turn, Esc opens the pause or back menu. The menu items have number keys 1 to 6.
- Every action reachable by mouse is reachable by keyboard, and the reverse.

## 12. Motion and feel

- Animations are short (working: 120 to 250 ms for moves and hits, up to 600 ms for a results card draw) and use tweens. The sim never waits for an animation; the view catches up from events.
- Panels slide in over 180 ms and stop hard, with a small clunk.
- Stamps land in 90 ms with a 3 px shake and a thud.
- Lamps flicker twice when something goes wrong.
- A cable snaps tight with a click when a target locks.
- A Settings option to speed up or skip animations is planned; build animations so they can be sped up or skipped.
- Feedback for every action: a short flash or number on the target, plus text in the vox log. Nothing important is shown only by color or only by motion.

## 13. Accessibility

- Never color alone: every color has a shape or text partner (sections 2 and 6).
- A colorblind mode in Settings swaps the status and rarity palettes for ones that stay distinct; the shape and text markers already carry the meaning.
- Text scales with the Settings option (section 3) and reflows.
- Contrast: body text on a panel is at least 4.5 to 1.
- Nothing flashes more than three times a second; lamp flicker obeys this.

## 14. Before finishing a UI change

1. Typecheck and build pass.
2. Open the screen in a browser at 1920 by 1080 and at 1280 by 720, and look at it.
3. Check it at 150% text size.
4. No hex value outside `src/data/palette.ts`, and no UI number that belongs in `src/data/`.
5. Hover, disabled and empty states have been looked at, not just the normal state.
6. No effect covers text or numbers (section 9).
