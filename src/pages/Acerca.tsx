import type { ReactNode } from 'react'
import { Card } from '../components/ui'
import { useDatos } from '../data/DataContext'

export default function Acerca() {
  const { modelo, parcelas } = useDatos()
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Acerca del proyecto</h1>

      <Card titulo="Objetivo">
        <p className="text-sm text-ink-2">
          Desarrollado para el Reto AgroCebada FIRA 2026. El objetivo es predecir el rendimiento (t/ha) de{' '}
          {parcelas.length} parcelas de cebada de temporal en Hidalgo, Tlaxcala y Puebla a partir de percepción remota,
          clima y relieve, y poner esas predicciones al alcance de analistas y productores.
        </p>
      </Card>

      <Card titulo="Datos">
        <ul className="space-y-1.5 text-sm text-ink-2">
          <Li t="Parcelas">Polígonos georreferenciados proporcionados por FIRA (partición 70 % / 30 % estratificada por estado).</Li>
          <Li t="Índices de vegetación">Sentinel-2, Landsat 8/9 y Planet: {modelo.variables.filter((v) => v.grupo === 'indice').map((v) => v.etiqueta).join(', ')}.</Li>
          <Li t="Clima">{modelo.variables.filter((v) => v.grupo === 'clima').map((v) => v.etiqueta).join(', ')} durante el ciclo.</Li>
          <Li t="Terreno">Elevación y pendiente derivadas de modelos digitales de elevación (DEM).</Li>
          <Li t="Mapas base">© OpenStreetMap y colaboradores; imágenes satelitales © Esri, Maxar, Earthstar Geographics.</Li>
        </ul>
      </Card>

      <Card titulo="Limitaciones">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">
          <li>El rendimiento de entrenamiento es autorreportado por el productor, sin medición instrumental; incluye ruido.</li>
          <li>Todas las parcelas son de temporal: el modelo no aplica directamente a parcelas de riego.</li>
          <li>Las nubes y sombras pueden bajar artificialmente los índices satelitales; la ficha permite filtrarlas.</li>
          <li>El simulador usa un modelo sustituto lineal que aproxima al modelo principal.</li>
        </ul>
      </Card>

      <Card titulo="Ciencia de datos e inclusión financiera">
        <p className="text-sm text-ink-2">
          Una estimación objetiva y temprana del rendimiento reduce la incertidumbre de productores y financieras: ayuda a
          dimensionar créditos de avío según la producción esperada, a diseñar seguros paramétricos y a dar acceso a
          financiamiento formal a pequeños productores que no cuentan con historial documentado.
        </p>
      </Card>

      <Card titulo="Equipo">
        <p className="text-sm text-ink-2">
          Integrantes, roles y uso de herramientas de inteligencia artificial: ver anexos del reporte técnico.
        </p>
      </Card>
    </div>
  )
}

function Li({ t, children }: { t: string; children: ReactNode }) {
  return (
    <li>
      <span className="font-medium text-ink">{t}:</span> {children}
    </li>
  )
}
