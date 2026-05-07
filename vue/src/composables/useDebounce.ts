import { onScopeDispose } from 'vue';

export function useDebounce<T extends (...args: never[]) => void>(fn: T, delay: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  const wrapped = (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...args);
    }, delay);
  };
  const cancel = () => {
    if (t) {
      clearTimeout(t);
      t = null;
    }
  };
  onScopeDispose(cancel);
  return { wrapped, cancel };
}
