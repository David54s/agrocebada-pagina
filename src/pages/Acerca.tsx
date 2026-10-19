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
          <Li t="Parcelas">
            Polígonos georreferenciados proporcionados por FIRA (197; 138 con rendimiento reportado y 59 por predecir,
            repartidas de forma proporcional entre los tres estados).
          </Li>
          <Li t="Índices de vegetación">
            Planet (NDVI, EVI, LAI, MSAVI, resolución de 3 m) en el modelo final; Sentinel-2 (BASICO) evaluado en los
            experimentos. De cada índice se usa la curva completa del ciclo: valores por mes, emergencia, máximo, duración
            de la temporada verde y velocidad de secado.
          </Li>
          <Li t="Clima">{modelo.variables.filter((v) => v.grupo === 'clima').map((v) => v.etiqueta).join(', ')} durante el ciclo (CHIRPS y temperatura mensual, ~5 km).</Li>
          <Li t="Terreno">Elevación y pendiente del Continuo de Elevaciones Mexicano (INEGI CEM).</Li>
          <Li t="Ubicación">Rendimiento de las 8 parcelas vecinas con dato, promedio de la zona y coordenadas del centroide.</Li>
          <Li t="Mapas base">© OpenStreetMap y colaboradores; imágenes satelitales © Esri, Maxar, Earthstar Geographics.</Li>
        </ul>
      </Card>

      <Card titulo="Modelo">
        <p className="text-sm text-ink-2">{modelo.descripcion}</p>
        <p className="mt-2 text-sm text-ink-2">
          Validación: {modelo.metricas.validacion}. RMSE {modelo.metricas.rmse} t/ha, MAE {modelo.metricas.mae} t/ha, R²{' '}
          {modelo.metricas.r2}. Referencias con los mismos folds: predecir la media regional da RMSE 0.851 y un kNN
          espacial puro 0.506.
        </p>
      </Card>

      <Card titulo="Limitaciones">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">
          <li>
            El rendimiento de entrenamiento lo reporta en su mayoría la comercializadora que compra la cosecha, sin
            medición instrumental; incluye ruido.
          </li>
          <li>El clima viene en celdas de ~5 km: parcelas vecinas comparten el mismo valor de lluvia y temperatura.</li>
          <li>Todas las parcelas son de temporal: el modelo no aplica directamente a parcelas de riego.</li>
          <li>Las nubes y sombras pueden bajar artificialmente los índices satelitales; la ficha permite filtrarlas.</li>
          <li>
            La ubicación explica cerca de dos tercios de la variación del rendimiento; los índices satelitales, el clima
            y el relieve afinan la estimación dentro de cada zona, pero su aporte adicional es pequeño.
          </li>
          <li>
            {modelo.simulador.rmse === 0
              ? 'El simulador ejecuta el mismo modelo lineal que genera las predicciones del mapa.'
              : `El mapa y la ficha muestran el modelo exacto; el simulador usa una regresión lineal sustituta que lo aproxima (diferencia típica ${modelo.simulador.rmse} t/ha).`}
          </li>
        </ul>
      </Card>

      <Card titulo="Ciencia de datos e inclusión financiera">
        <p className="text-sm text-ink-2">
          Una estimación objetiva y temprana del rendimiento reduce la incertidumbre de productores y financieras: ayuda a
          dimensionar créditos de avío según la producción esperada, a diseñar seguros paramétricos y a dar acceso a
          financiamiento formal a pequeños productores que no cuentan con historial documentado.
        </p>
      </Card>

      <Card titulo="Equipo CebadaVision">
        <ul className="space-y-1 text-sm text-ink-2">
          <li>Osmar Javier Hernández Prado</li>
          <li>David Carcamo Bonifacio</li>
          <li>David Cervantes Rojas</li>
          <li>Hugo Antonio Palencia Vazquez</li>
          <li>Isack Chazari Flores</li>
        </ul>
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
