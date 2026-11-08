import { nextTick, onBeforeUnmount, onMounted } from 'vue';

/** Focus the dialog's first control on mount, keep Tab inside it, restore focus on close. */
export function useDialogFocus(rootRef, onEscape) {
  let previouslyFocused = null;

  function controls() {
    return [...(rootRef.value?.querySelectorAll('button:not([disabled])') ?? [])];
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onEscape?.();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = controls();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onMounted(async () => {
    previouslyFocused = document.activeElement;
    await nextTick();
    controls()[0]?.focus();
  });

  onBeforeUnmount(() => {
    if (previouslyFocused?.isConnected) previouslyFocused.focus?.({ preventScroll: true });
  });

  return { onKeydown };
}
