import type { NormalizedError } from './error'

export interface IdleState {
  readonly status: 'idle'
}

export interface LoadingState {
  readonly status: 'loading'
  readonly startedAt: number
}

export interface SuccessState<TData> {
  readonly status: 'success'
  readonly data: TData
  readonly receivedAt: number
}

export interface RefreshingState<TData> {
  readonly status: 'refreshing'
  readonly data: TData
  readonly receivedAt: number
  readonly startedAt: number
}

export interface ErrorState<TData, TError extends NormalizedError = NormalizedError> {
  readonly status: 'error'
  readonly error: TError
  readonly failedAt: number
  readonly previous?: TData
}

export type AsyncState<TData, TError extends NormalizedError = NormalizedError> =
  | IdleState
  | LoadingState
  | SuccessState<TData>
  | RefreshingState<TData>
  | ErrorState<TData, TError>

export function idleState(): IdleState {
  return { status: 'idle' }
}

export function loadingState(startedAt = Date.now()): LoadingState {
  return { status: 'loading', startedAt }
}

export function successState<TData>(data: TData, receivedAt = Date.now()): SuccessState<TData> {
  return { status: 'success', data, receivedAt }
}

export function refreshingState<TData>(
  current: SuccessState<TData> | RefreshingState<TData>,
  startedAt = Date.now(),
): RefreshingState<TData> {
  return {
    status: 'refreshing',
    data: current.data,
    receivedAt: current.receivedAt,
    startedAt,
  }
}

export function errorState<TData, TError extends NormalizedError>(
  error: TError,
  failedAt = Date.now(),
  previous?: TData,
): ErrorState<TData, TError> {
  return previous === undefined
    ? { status: 'error', error, failedAt }
    : { status: 'error', error, failedAt, previous }
}

export function hasAsyncData<TData, TError extends NormalizedError>(
  state: AsyncState<TData, TError>,
): state is
  | SuccessState<TData>
  | RefreshingState<TData>
  | (ErrorState<TData, TError> & {
      previous: TData
    }) {
  return (
    state.status === 'success' ||
    state.status === 'refreshing' ||
    (state.status === 'error' && state.previous !== undefined)
  )
}

export function readAsyncData<TData, TError extends NormalizedError>(
  state: AsyncState<TData, TError>,
): TData | undefined {
  if (state.status === 'success' || state.status === 'refreshing') return state.data
  if (state.status === 'error') return state.previous
  return undefined
}
