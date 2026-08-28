import {
  computed,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import {
  errorState,
  idleState,
  isCancelledError,
  loadingState,
  readAsyncData,
  refreshingState,
  successState,
  type AsyncState,
  type DataPage,
  type DataQuery,
  type DataSource,
  type NormalizedError,
  type PaginationMeta,
  type QueryFilters,
} from '@vela-admin/contracts'

export interface UseDataPageOptions<
  TItem,
  TFilters extends QueryFilters,
  TSortKey extends string,
  TMeta extends PaginationMeta,
> {
  readonly source: DataSource<TItem, TFilters, TSortKey, TMeta>
  readonly query: MaybeRefOrGetter<DataQuery<TFilters, TSortKey>>
  readonly immediate?: boolean
  readonly normalizeError: (error: unknown) => NormalizedError
}

export interface UseDataPageReturn<TItem, TMeta extends PaginationMeta> {
  readonly state: Ref<AsyncState<DataPage<TItem, TMeta>>>
  readonly data: Readonly<Ref<DataPage<TItem, TMeta> | undefined>>
  readonly items: Readonly<Ref<readonly TItem[]>>
  readonly loading: Readonly<Ref<boolean>>
  readonly refreshing: Readonly<Ref<boolean>>
  readonly error: Readonly<Ref<NormalizedError | undefined>>
  readonly execute: () => Promise<void>
  readonly refresh: () => Promise<void>
  readonly cancel: () => void
}

export function useDataPage<
  TItem,
  TFilters extends QueryFilters = QueryFilters,
  TSortKey extends string = string,
  TMeta extends PaginationMeta = PaginationMeta,
>(options: UseDataPageOptions<TItem, TFilters, TSortKey, TMeta>): UseDataPageReturn<TItem, TMeta> {
  const state = shallowRef<AsyncState<DataPage<TItem, TMeta>>>(idleState())
  let requestId = 0
  let controller: AbortController | undefined

  const cancel = () => {
    if (!controller) return
    controller.abort()
    controller = undefined
    requestId += 1
    if (state.value.status === 'loading') state.value = idleState()
    if (state.value.status === 'refreshing') {
      state.value = successState(state.value.data, state.value.receivedAt)
    }
  }

  const execute = async () => {
    cancel()
    const currentRequest = ++requestId
    controller = new AbortController()
    const previous = readAsyncData(state.value)
    state.value =
      previous === undefined
        ? loadingState()
        : refreshingState(successState(previous, Date.now()), Date.now())

    try {
      const result = await options.source.load(toValue(options.query), {
        signal: controller.signal,
        requestId: currentRequest,
      })
      if (currentRequest !== requestId) return
      state.value = successState(result)
    } catch (cause) {
      if (currentRequest !== requestId) return
      const normalized = options.normalizeError(cause)
      if (isCancelledError(normalized)) return
      state.value = errorState(normalized, Date.now(), previous)
    } finally {
      if (currentRequest === requestId) controller = undefined
    }
  }

  const stop = watch(
    () => toValue(options.query),
    () => void execute(),
    { deep: true, immediate: options.immediate ?? true },
  )

  onScopeDispose(() => {
    stop()
    cancel()
  })

  return {
    state,
    data: computed(() => readAsyncData(state.value)),
    items: computed(() => readAsyncData(state.value)?.items ?? []),
    loading: computed(() => state.value.status === 'loading'),
    refreshing: computed(() => state.value.status === 'refreshing'),
    error: computed(() => (state.value.status === 'error' ? state.value.error : undefined)),
    execute,
    refresh: execute,
    cancel,
  }
}
