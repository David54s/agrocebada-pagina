import { Link } from 'react-router-dom'
import BuscadorId from '../components/BuscadorId'
import { botonSecCls } from '../components/ui'

export default function NoEncontrado({ mensaje = 'Esta página no existe.' }: { mensaje?: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-ink-2">{mensaje}</p>
      <div className="mx-auto mt-4 max-w-sm text-left">
        <BuscadorId />
      </div>
      <Link to="/mapa" className={`${botonSecCls} mt-4`}>
        Ir al mapa de parcelas
      </Link>
    </div>
  )
}
