import { useEffect, useState, type DependencyList } from 'react';

export type AsyncState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: Error };

/** Carga asíncrona sencilla con cancelación al desmontar. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: null, error: null });
  useEffect(() => {
    let alive = true;
    // Al cambiar las dependencias se mantienen los datos anteriores hasta
    // que lleguen los nuevos (evita parpadeos).
    fn().then(
      (data) => alive && setState({ status: 'success', data, error: null }),
      (error: unknown) =>
        alive &&
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
