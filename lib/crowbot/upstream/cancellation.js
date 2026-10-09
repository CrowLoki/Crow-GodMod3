export const abortError = () => new DOMException('Operation cancelled', 'AbortError');

/** Consume late settlement as well as cancellation; never leave a rejection orphaned. */
export function abortable(promise, signal) {
  if (!signal) return Promise.resolve(promise);
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(abortError()); };
    const cleanup = () => signal.removeEventListener('abort', abort);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(
      value => { cleanup(); resolve(value); },
      error => { cleanup(); reject(error); },
    );
    if (signal.aborted) abort();
  });
}

/** Start one owned handshake; its socket can be consumed exactly once. */
export function prepareConnection(open, parentSignal) {
  const controller = new AbortController();
  const signal = parentSignal ? AbortSignal.any([parentSignal, controller.signal]) : controller.signal;
  let taken = false;
  const opening = Promise.resolve().then(() => {
    if (signal.aborted) throw abortError();
    return open(signal);
  }).then(socket => {
    if (signal.aborted) { socket.close(); throw abortError(); }
    return socket;
  });
  opening.catch(() => {});
  return {
    take() {
      if (taken) throw new Error('Prepared connection already consumed');
      taken = true;
      return abortable(opening, signal);
    },
    close() {
      controller.abort();
      opening.then(socket => socket.close(), () => {}).catch(() => {});
    },
  };
}
