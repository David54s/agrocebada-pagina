# AgroCebada · Aplicación de visualización

Dashboard web del **Reto AgroCebada FIRA 2026**. Muestra y permite consultar las predicciones de
rendimiento de cebada (t/ha) de 197 parcelas de temporal en Hidalgo, Tlaxcala y Puebla. También
permite **ejecutar el modelo** desde el navegador (simulador y predicción por lote desde CSV).

Tiene dos modos de vista, que se cambian desde el encabezado:

- **Productor**: lenguaje llano, semáforo bajo/medio/alto y recomendaciones.
- **Analista**: métricas, intervalos, observado vs. predicho, importancias y preguntas guía.

## Requisitos

- Node.js 20 o superior (probado con 22)

## Uso

```bash
npm install
npm run dev        # http://localhost:5173
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` (sitio estático) |
| `npm run preview` | Sirve el build localmente |
| `npm test` | Pruebas unitarias (modelo sustituto, CSV, clases de color) |
| `npm run mock` | Regenera los datos de **demostración** en `public/data/` |
| `npm run validate` | Valida `public/data/` contra el contrato de datos |

## Conectar el modelo real

1. El equipo de modelación exporta los archivos descritos en [docs/CONTRATO_DATOS.md](docs/CONTRATO_DATOS.md).
2. Se copian a `public/data/`, reemplazando los de demostración.
3. `npm run validate` debe terminar sin errores.
4. En `modelo.json`, `"es_mock": false` quita el aviso amarillo.

No hace falta cambiar código: las variables, etiquetas, umbrales y métricas se leen de los
archivos.

## Pantallas

| Ruta | Contenido |
|---|---|
| `#/` | Resumen: **consulta por ID_POLIGONO**, indicadores, mapa general, rendimiento por estado y distribución |
| `#/mapa` | Mapa interactivo (base OSM o satelital), filtros, panel de parcela y tabla ordenable |
| `#/parcela/<ID_POLIGONO>` | Ficha (también se llega escribiendo el ID en "Consultar por ID_POLIGONO"): estimación con intervalo, comparación con su estado, serie NDVI/EVI/NDRE con filtro de nubes, factores que influyeron |
| `#/simulador` | Controles por variable → predicción en vivo; predicción por lote desde CSV con descarga |
| `#/modelo` | Desempeño (RMSE, MAE, R²), observado vs. predicho, error por estado, importancias, combinaciones, preguntas guía; descarga del CSV de predicciones |
| `#/acerca` | Datos, limitaciones, relación con la inclusión financiera |

## Publicar (enlace para el jurado)

El build es estático (rutas relativas y `HashRouter`), así que funciona en cualquier hosting sin
configuración:

- **Netlify / Vercel**: comando `npm run build`, carpeta `dist`.
- **GitHub Pages**: subir el contenido de `dist/`.

## Estructura

```
scripts/            generate-mock.ts (datos demo), validate-data.ts
public/data/        archivos del contrato (demo ahora, reales después)
src/data/           schema.ts (contrato zod), DataContext (carga/validación), ModoContext
src/model/          surrogate.ts: modelo lineal que corre en el navegador
src/lib/            formato, colores, CSV
src/components/     mapa, panel, UI y gráficas
src/pages/          una por ruta
```

## Tecnologías

React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Leaflet / react-leaflet, Recharts,
zod y PapaParse. Mapas base © OpenStreetMap y © Esri World Imagery.
