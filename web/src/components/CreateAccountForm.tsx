import { useEffect, useState } from 'react'
import { ApiError } from '../api'
import type { AccountNature, CreateAccountPayload } from '../types'
import styles from './CreateAccountForm.module.css'

export interface CreateAccountFormProps {
  /** Crea la cuenta; lanza ApiError si la API la rechaza. */
  onCreate: (payload: CreateAccountPayload) => Promise<void>
  /** True mientras la creación está en curso (deshabilita el botón). */
  creating: boolean
}

interface FieldErrors {
  code?: string
  name?: string
  nature?: string
}

const CODE_DIGITS_RE = /^\d+$/
/** Un código de cuenta válido tiene 1, 2, 4 o 6 dígitos. */
const VALID_LENGTHS = new Set([1, 2, 4, 6])
/** Solo las clases (código de 1 dígito) definen naturaleza. */
const CLASE_RE = /^\d$/

const NATURE_OPTIONS: { value: AccountNature; label: string }[] = [
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
]

function validate(codigo: string, nombre: string, naturaleza: string): FieldErrors {
  const errores: FieldErrors = {}

  if (codigo === '') {
    errores.code = 'El código es obligatorio.'
  } else if (!CODE_DIGITS_RE.test(codigo)) {
    errores.code = 'El código solo admite dígitos.'
  } else if (!VALID_LENGTHS.has(codigo.length)) {
    errores.code = 'El código debe tener 1, 2, 4 o 6 dígitos.'
  }

  if (nombre === '') {
    errores.name = 'El nombre es obligatorio.'
  }

  if (CLASE_RE.test(codigo) && naturaleza === '') {
    errores.nature = 'Selecciona la naturaleza de la clase.'
  }

  return errores
}

export function CreateAccountForm({ onCreate, creating }: CreateAccountFormProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [nature, setNature] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const trimmedCode = code.trim()
  const esClase = CLASE_RE.test(trimmedCode)

  // La nota de éxito desaparece sola a los pocos segundos.
  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(false), 4000)
    return () => clearTimeout(timer)
  }, [success])

  function clearFieldError(campo: keyof FieldErrors) {
    setFieldErrors((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev))
  }

  function handleCodeChange(nuevo: string) {
    setCode(nuevo)
    clearFieldError('code')
    setFormError(null)
    setSuccess(false)
  }

  function handleNameChange(nuevo: string) {
    setName(nuevo)
    clearFieldError('name')
    setFormError(null)
    setSuccess(false)
  }

  function handleNatureChange(nuevo: string) {
    setNature(nuevo)
    clearFieldError('nature')
    setFormError(null)
    setSuccess(false)
  }

  async function handleSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const codigo = code.trim()
    const nombre = name.trim()
    const errores = validate(codigo, nombre, nature)
    if (errores.code || errores.name || errores.nature) {
      setFieldErrors(errores)
      setFormError(null)
      setSuccess(false)
      return
    }

    const payload: CreateAccountPayload = { code: codigo, name: nombre }
    // La naturaleza solo se envía para clases (1 dígito); los demás niveles la heredan.
    if (esClase) {
      payload.nature = nature as AccountNature
    }

    setFieldErrors({})
    setFormError(null)
    try {
      await onCreate(payload)
      setCode('')
      setName('')
      setNature('')
      setSuccess(true)
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError('No se pudo crear la cuenta. Intenta de nuevo.')
        return
      }
      switch (error.key) {
        case 'INVALID_CODE':
        case 'DUPLICATE_CODE':
        case 'PARENT_NOT_FOUND':
          setFieldErrors({ code: error.message })
          break
        case 'INVALID_NAME':
          setFieldErrors({ name: error.message })
          break
        case 'NATURE_REQUIRED':
          setFieldErrors({ nature: error.message })
          break
        default:
          setFormError(error.message)
      }
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="create-account-code">
          Código
        </label>
        <input
          id="create-account-code"
          className={styles.input}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          aria-invalid={fieldErrors.code ? true : undefined}
          aria-describedby={fieldErrors.code ? 'create-account-code-error' : undefined}
        />
        {fieldErrors.code && (
          <p id="create-account-code-error" className={styles.error}>
            {fieldErrors.code}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="create-account-name">
          Nombre
        </label>
        <input
          id="create-account-name"
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? 'create-account-name-error' : undefined}
        />
        {fieldErrors.name && (
          <p id="create-account-name-error" className={styles.error}>
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="create-account-nature">
          Naturaleza
        </label>
        <select
          id="create-account-nature"
          className={styles.select}
          value={nature}
          onChange={(e) => handleNatureChange(e.target.value)}
          disabled={!esClase}
          aria-invalid={fieldErrors.nature ? true : undefined}
          aria-describedby={
            fieldErrors.nature
              ? 'create-account-nature-error'
              : !esClase
                ? 'create-account-nature-hint'
                : undefined
          }
        >
          <option value="">Selecciona…</option>
          {NATURE_OPTIONS.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>
        {fieldErrors.nature ? (
          <p id="create-account-nature-error" className={styles.error}>
            {fieldErrors.nature}
          </p>
        ) : (
          !esClase && (
            <p id="create-account-nature-hint" className={styles.hint}>
              Solo las clases (1 dígito) definen naturaleza; los demás niveles la heredan.
            </p>
          )
        )}
      </div>

      {formError && (
        <p role="alert" className={styles.formError}>
          {formError}
        </p>
      )}
      {success && (
        <p role="status" className={styles.success}>
          Cuenta creada.
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={creating}>
          {creating ? 'Creando…' : 'Crear cuenta'}
        </button>
      </div>
    </form>
  )
}
