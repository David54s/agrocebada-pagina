import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDatos } from '../data/DataContext'
import { buscarId } from '../lib/buscar'
import { botonCls } from './ui'

/** Campo "Consultar por ID_POLIGONO": lleva a la ficha de la parcela o avisa si no existe. */
export default function BuscadorId({ compacto = false }: { compacto?: boolean }) {
  const { porId, parcelas } = useDatos()
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')
  const uid = useId()

  const consultar = (e: FormEvent) => {
    e.preventDefault()
    if (!texto.trim()) {
      setError('Escribe un ID_POLIGONO.')
      return
    }
    const id = buscarId(porId.keys(), texto)
    if (!id) {
      setError(`No encontramos el ID_POLIGONO "${texto.trim()}".`)
      return
    }
    setError('')
    setTexto('')
    navigate(`/parcela/${encodeURIComponent(id)}`)
  }

  const ejemplo = parcelas[0]?.props.id

  return (
    <form onSubmit={consultar} role="search" aria-label="Consultar parcela por ID_POLIGONO" noValidate>
      {!compacto && (
        <label htmlFor={`${uid}-id`} className="mb-1 block text-sm font-medium">
          Consultar por ID_POLIGONO
        </label>
      )}
      <div className="flex gap-2">
        <input
          id={`${uid}-id`}
          list={`${uid}-ids`}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            if (error) setError('')
          }}
          placeholder={compacto ? 'ID_POLIGONO' : `Ej. ${ejemplo ?? 'P001'}`}
          aria-label={compacto ? 'ID_POLIGONO' : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${uid}-err` : undefined}
          autoComplete="off"
          className={`min-w-0 rounded-lg border bg-surface px-3 py-1.5 text-sm text-ink ${
            error ? 'border-[var(--critical)]' : 'border-line'
          } ${compacto ? 'w-36' : 'flex-1'}`}
        />
        <datalist id={`${uid}-ids`}>
          {parcelas.map((p) => (
            <option key={p.props.id} value={p.props.id}>
              {p.props.municipio}, {p.props.estado}
            </option>
          ))}
        </datalist>
        <button type="submit" className={botonCls}>
          Consultar
        </button>
      </div>
      {error && (
        <p
          id={`${uid}-err`}
          role="alert"
          className={`mt-1 text-xs text-[var(--critical-text)] ${compacto ? 'absolute rounded bg-surface px-2 py-1 shadow' : ''}`}
        >
          {error}
        </p>
      )}
    </form>
  )
}
