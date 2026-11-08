# Spell vs Scale

A turn-based fantasy battle built with Vue 3. You play a wizard facing **Solinvictus**, a red fire dragon, in a lava cavern. Manage mana, cooldowns, status effects and five mana potions. As the dragon weakens it can Enrage, and it telegraphs a Fire Storm one turn before releasing it.

## Running it

Requires Node 22.12+ (an `.nvmrc` pins Node 24).

```bash
nvm use
npm install
npm run dev        # dev server at http://localhost:5173
npm test           # Vitest unit + component tests
npm run lint       # ESLint (flat config, eslint-plugin-vue)
npm run build      # static build in dist/ (relative base path, deployable anywhere)
npm run preview    # serve the production build
```

## How to play

- Keys **1–9** cast the actions in hotbar order; **Esc** opens the menu.
- Hover or focus an action for its damage, effect and why it's unavailable. On touch screens the first tap shows details and a second tap casts.
- **Crystallize** halves damage and status chances during the dragon's next turn. Use it when the dragon is preparing **Fire Storm**.
- **Blizzard**'s Freeze interrupts a charging Fire Storm.
- Each negative status, when it expires or is cured, leaves a one-turn immunity to that same status.


## Key decisions:

- **Rules are separate from Vue.** `src/game` mutates plain objects and takes an injected `rng`, so every rule (Arcanum's cooldown, the immunity timing, Enrage priority, lethal Burn ticks) is tested deterministically.
- **The store orchestrates and does not calculate.** `playAction` validates again in the store, resolves the player's turn synchronously, then schedules the dragon's turn on a timer for readability. Every timer is tagged with a battle generation id, so Restart, Rematch or Main Menu discards stale steps. Opening the menu pauses the pending step.
- **Animation never decides outcomes.** `useBattlePresentation` watches the committed combat log and turns new events into floating numbers, sprite poses, shake and warnings. Removing it would not change any result.
- **Scene art stays aligned at any crop.** `SceneBackground` draws the art in a cover-sized "stage" box, so overlays positioned in image percentages stay on their features: victory coin glints, and defeat light rays aimed at the grave.
- **Accessibility:** semantic buttons, `role="meter"` bars with numeric values, status badges with text and not just color, live-region announcements for critical warnings, focus-trapped dialogs, visible focus rings, and `prefers-reduced-motion` support for all ambient and combat motion.
- **Responsive:** built 16:9 landscape-first. On short or narrow landscape screens the ornate HUD art becomes a compact two-row hotbar. Small portrait screens get a dismissible "rotate your device" prompt.

## Art assets

All artwork lives in `images/` as WebP and is imported directly by the components (Vite fingerprints it at build time). `images/concept_art.webp` is the layout reference only; the app never renders it.

The action icons in `src/assets/icons` are placeholders sliced from `images/icons.webp`. To replace them, drop in files with the same names (`bash`, `immolate`, `thunder`, `blizzard`, `arcanum`, `crystallize`, `heal`, `cure`, `mana-potion`, `menu`); if you change the extension, update the imports in `src/game/spells.js` and `src/components/ActionBar.vue`.

## Balance

All numbers in `src/game/config.js`, `spells.js` and `dragonAbilities.js` are **provisional** and meant to be tuned through playtesting.

## Deployment

`.github/workflows/deploy.yml` tests, builds and publishes `dist/` to GitHub Pages on every push to `main`. In the repository settings, **Pages → Build and deployment → Source** must be set to **GitHub Actions**. The Vite `base` is `./`, so the build works under the `/spell-vs-scale/` project path without changes.
