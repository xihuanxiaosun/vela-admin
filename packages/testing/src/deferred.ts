export interface Deferred<TValue> {
  readonly promise: Promise<TValue>
  readonly resolve: (value: TValue | PromiseLike<TValue>) => void
  readonly reject: (reason?: unknown) => void
}

export function createDeferred<TValue>(): Deferred<TValue> {
  let resolve!: Deferred<TValue>['resolve']
  let reject!: Deferred<TValue>['reject']
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}
