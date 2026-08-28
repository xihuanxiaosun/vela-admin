import type { FormPath } from './path'
import { getFormValue, setFormValue } from './path'

export interface FormDataFieldMapping<TValues, TRecord> {
  /** Path used by VaFormBuilder and useForm. */
  readonly valuePath: FormPath
  /** Source path in the loaded record; defaults to valuePath. False preserves the initial value. */
  readonly recordPath?: FormPath | false
  /** Destination path in the submitted payload; defaults to valuePath. False omits the field. */
  readonly submitPath?: FormPath | false
  readonly deserialize?: (value: unknown, record: Readonly<TRecord>) => unknown
  readonly serialize?: (value: unknown, values: Readonly<TValues>) => unknown
  readonly omitWhen?: (value: unknown, values: Readonly<TValues>) => boolean
}

export interface FormDataMapperOptions<TValues, TRecord, TPayload> {
  readonly createValues: () => TValues
  readonly createPayload: () => TPayload
  readonly fields: readonly FormDataFieldMapping<TValues, TRecord>[]
}

export interface FormDataMapper<TValues, TRecord, TPayload> {
  readonly fromRecord: (record: Readonly<TRecord>) => TValues
  readonly toPayload: (values: Readonly<TValues>) => TPayload
}

/**
 * Builds explicit record-to-form and form-to-payload mappings without embedding endpoint names in
 * presentation schemas. A custom upload renderer can therefore store an UploadResult in form state
 * and serialize only its backend value here.
 */
export function createFormDataMapper<TValues, TRecord, TPayload>(
  options: FormDataMapperOptions<TValues, TRecord, TPayload>,
): FormDataMapper<TValues, TRecord, TPayload> {
  return {
    fromRecord(record) {
      let values = options.createValues()
      for (const field of options.fields) {
        if (field.recordPath === false) continue
        const rawValue = getFormValue(record, field.recordPath ?? field.valuePath)
        const value = field.deserialize ? field.deserialize(rawValue, record) : rawValue
        values = setFormValue(values, field.valuePath, value)
      }
      return values
    },
    toPayload(values) {
      let payload = options.createPayload()
      for (const field of options.fields) {
        if (field.submitPath === false) continue
        const rawValue = getFormValue(values, field.valuePath)
        if (field.omitWhen?.(rawValue, values)) continue
        const value = field.serialize ? field.serialize(rawValue, values) : rawValue
        payload = setFormValue(payload, field.submitPath ?? field.valuePath, value)
      }
      return payload
    },
  }
}
