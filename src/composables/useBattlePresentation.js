import { onBeforeUnmount, reactive, ref, watch } from 'vue';

const WIZARD_ATTACKS = new Set(['bash', 'immolate', 'thunder', 'blizzard', 'arcanum']);
const WIZARD_CASTS = new Set(['crystallize', 'heal', 'cure', 'mana-potion']);

/**
 * Turns committed combat log events into short-lived visual cues: floating numbers,
 * sprite poses, shake and warnings. It only reads the log; it never changes combat state.
 * All timers are tied to this component instance and cleared on unmount.
 */
export function useBattlePresentation(getLog) {
  const floats = ref([]);
  const poses = reactive({ wizard: 'idle', dragon: 'idle' });
  const hits = reactive({ wizard: 0, dragon: 0 });
  const shakeKey = ref(0);
  const warning = ref(null);
  const announcement = ref('');

  const timers = new Set();
  let seen = getLog().length;
  let disposed = false;

  function later(fn, ms) {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!disposed) fn();
    }, ms);
    timers.add(t);
  }

  function pose(actor, value, ms) {
    poses[actor] = value;
    later(() => {
      if (poses[actor] === value) poses[actor] = 'idle';
    }, ms);
  }

  function addFloat(target, text, kind, delay) {
    later(() => {
      const id = `${Date.now()}-${Math.random()}`;
      floats.value.push({ id, target, text, kind, offset: (floats.value.length % 3) - 1 });
      later(() => (floats.value = floats.value.filter((f) => f.id !== id)), 1400);
    }, delay);
  }

  function showWarning(text, tone, ms = 2400) {
    const id = Date.now();
    warning.value = { id, text, tone };
    announcement.value = text;
    later(() => {
      if (warning.value?.id === id) warning.value = null;
    }, ms);
  }

  function handle(event, index) {
    const delay = index * 260;
    const { type, target, amount, action, actor } = event;

    if (actor === 'wizard' && WIZARD_ATTACKS.has(action)) pose('wizard', 'attack', 900);
    if (actor === 'wizard' && WIZARD_CASTS.has(action)) pose('wizard', 'cast', 800);
    if (actor === 'dragon' && (type === 'damage' || type === 'miss')) pose('dragon', 'attack', 420);

    switch (type) {
      case 'damage':
        addFloat(
          target,
          `-${amount}`,
          target === 'wizard' ? 'damage-wizard' : 'damage',
          delay + 150,
        );
        later(() => hits[target]++, delay + 150);
        if (event.heavy || amount >= 30) later(() => shakeKey.value++, delay + 150);
        break;
      case 'burn-tick':
        addFloat(target, `-${amount} 🔥`, 'burn', delay);
        later(() => hits[target]++, delay);
        break;
      case 'heal':
        addFloat('wizard', `+${amount}`, 'heal', delay);
        break;
      case 'mana':
        addFloat('wizard', `+${amount} MP`, 'mana', delay);
        break;
      case 'miss':
        addFloat(target, 'Miss', 'miss', delay + 150);
        break;
      case 'status-applied':
        addFloat(target, event.message.match(/with (\w+)/)?.[1] ?? 'Status', 'status', delay + 350);
        break;
      case 'status-immune':
        addFloat(target, 'Immune', 'miss', delay + 350);
        break;
      case 'status-resisted':
        addFloat(target, 'Resisted', 'miss', delay + 350);
        break;
      case 'skip':
        addFloat(target, target === 'dragon' ? 'Frozen!' : 'Stunned!', 'status', delay);
        break;
      case 'crystallize':
        addFloat('wizard', 'Crystallize', 'crystal', delay);
        break;
      case 'firestorm-charge':
        showWarning('Solinvictus is preparing Fire Storm!', 'fire', 2800);
        break;
      case 'firestorm-interrupt':
        showWarning('Fire Storm interrupted!', 'ice');
        break;
      case 'enrage':
        showWarning('Solinvictus is Enraged!', 'rage');
        break;
      case 'victory':
        poses.dragon = 'defeated';
        announcement.value = 'Victory! Solinvictus has been slain.';
        break;
      case 'defeat':
        poses.wizard = 'defeated';
        announcement.value = 'Defeat. The wizard has fallen.';
        break;
    }
  }

  const stop = watch(
    () => getLog().length,
    (length) => {
      const fresh = getLog().slice(seen, length);
      seen = length;
      fresh.forEach(handle);
    },
  );

  onBeforeUnmount(() => {
    disposed = true;
    stop();
    timers.forEach(clearTimeout);
    timers.clear();
  });

  return { floats, poses, hits, shakeKey, warning, announcement };
}
