import { createContext, useContext, useState, type ReactNode } from 'react'

/** Productor: lenguaje llano y semáforo. Analista: métricas y detalle técnico. */
export type Modo = 'productor' | 'analista'

const CLAVE = 'agrocebada.modo'

function leerModo(): Modo {
  try {
    return localStorage.getItem(CLAVE) === 'analista' ? 'analista' : 'productor'
  } catch {
    return 'productor'
  }
}

const Ctx = createContext<{ modo: Modo; setModo: (m: Modo) => void }>({
  modo: 'productor',
  setModo: () => {},
})

export function ModoProvider({ children }: { children: ReactNode }) {
  const [modo, setModoState] = useState<Modo>(leerModo)
  const setModo = (m: Modo) => {
    setModoState(m)
    try {
      localStorage.setItem(CLAVE, m)
    } catch {
      // sin almacenamiento: el modo dura solo esta sesión
    }
  }
  return <Ctx.Provider value={{ modo, setModo }}>{children}</Ctx.Provider>
}

export const useModo = () => useContext(Ctx)
