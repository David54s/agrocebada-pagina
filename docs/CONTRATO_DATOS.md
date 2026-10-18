# Contrato de datos: modelo → app

La app no entrena ni carga el modelo de Python; **lee archivos que exporta el equipo de
modelación** y los valida al arrancar. Mientras esos archivos no existan, `npm run mock` genera
datos de demostración con exactamente este formato.

Todos los archivos van en `public/data/`. Después de copiarlos, ejecutar:

```bash
npm run validate   # revisa formato, tipos y consistencia entre archivos
```

La fuente de verdad del formato es `src/data/schema.ts` (zod). Si cambian algo aquí, cámbienlo allá.

---

## 1. `parcelas.geojson` (obligatorio)

`FeatureCollection` en **EPSG:4326 (lon/lat)**, una `Feature` por parcela (las 197), con
geometría `Polygon` o `MultiPolygon`. Desde el shapefile de FIRA:

```python
import geopandas as gpd
gdf = gpd.read_file("parcelas.shp").to_crs(4326)
# ... unir predicciones y variables por id ...
gdf.to_file("public/data/parcelas.geojson", driver="GeoJSON")
```

### Propiedades de cada parcela

| Campo | Tipo | Descripción |
|---|---|---|
| `ID_POLIGONO` | texto o número | Identificador de la parcela, tal como viene en el shapefile de FIRA. Único. También se acepta con el nombre `id`. |
| `estado` | `"Hidalgo"` \| `"Tlaxcala"` \| `"Puebla"` | Exactamente con esa ortografía. |
| `municipio` | texto | Opcional, pero se muestra en mapa y tabla. |
| `superficie_ha` | número > 0 | Hectáreas. Se usa para producción = rendimiento × superficie. |
| `conjunto` | `"entrenamiento"` \| `"prediccion"` | 70 % con rendimiento / 30 % por predecir (59). |
| `rendimiento_real` | número \| `null` | t/ha reportado por el productor. `null` en las de predicción. |
| `rendimiento_pred` | número | t/ha estimado por el **modelo final** (para las 197). |
| `pred_lo`, `pred_hi` | número | Límites del intervalo de predicción (el nivel va en `modelo.json → intervalo`). |
| `prediccion_cv` | número \| `null` | Predicción **fuera de muestra** (out-of-fold) para entrenamiento; `null` en predicción. Alimenta la gráfica observado vs. predicho. |
| *una propiedad por variable* | número | Cada variable listada en `modelo.json → variables` (ej. `ndvi_max`, `precip_total`). |
| `nota` | texto | Opcional. Explicación en lenguaje llano de cómo se llegó al número (la ficha la muestra tal cual). |
| `factores` | lista | Opcional. `[{ "variable", "etiqueta", "aporte" }]`: factores que más pesaron en esta parcela, con su aporte en t/ha (SHAP). |

Si no tienen un intervalo propio, una aproximación válida es `pred ± 1.28 · RMSE_cv` (≈ 80 %).

## 2. `modelo.json` (obligatorio)

```jsonc
{
  "nombre": "LightGBM",                 // texto libre
  "version": "1.0.0",
  "generado": "2026-10-15",             // fecha de exportación
  "es_mock": false,                     // true muestra el aviso de "datos de demostración"
  "intervalo": "Intervalo de predicción al 80 %",
  "variables": [
    // grupo: "indice" | "clima" | "geofisica" | "otra"
    { "nombre": "ndvi_max", "etiqueta": "NDVI máximo", "unidad": "", "grupo": "indice",
      "descripcion": "Texto llano para productores." }
  ],
  "metricas": {
    "rmse": 0.47, "mae": 0.37, "r2": 0.63,
    "validacion": "CV espacial agrupada por municipio (k = 12)",
    "por_estado": [ { "estado": "Hidalgo", "n": 53, "rmse": 0.46, "mae": 0.38, "r2": 0.63 } ]
  },
  "importancias": [ { "variable": "ndvi_max", "importancia": 0.27 } ],  // la app normaliza a %
  "combinaciones": [                    // pregunta guía 3
    { "nombre": "Índices + clima", "variables": ["ndvi_max", "precip_total"], "rmse": 0.48, "r2": 0.62 }
  ],
  "simulador": {
    "tipo": "lineal",
    "descripcion": "Ridge sustituta ajustada a las predicciones del modelo final.",
    "rmse": 0.12,                       // error del sustituto vs. el modelo final (opcional)
    "intercepto": 3.0,
    "variables": [
      { "nombre": "ndvi_max", "coef": 0.21, "media": 0.66, "std": 0.07, "min": 0.4, "max": 0.9 }
    ]
  },
  "umbrales": { "bajo": 2.5, "alto": 3.5 }, // t/ha del semáforo bajo / medio / alto
  "preguntas_guia": {                       // opcional: si viene, la página Modelo muestra estas respuestas
    "indice": { "respuesta": "EVI (Planet)", "detalle": "..." },
    "clima": { "respuesta": "Precipitación del ciclo", "detalle": "..." },
    "combinacion": { "respuesta": "Ubicación + relieve + clima + fenología", "detalle": "..." }
  }
}
```

### Sobre el simulador (para que la app pueda "ejecutar el modelo")

La app calcula en el navegador:

```
pred = intercepto + Σ coef_i · (x_i − media_i) / std_i
```

- Si el modelo final es lineal (ridge/lasso), exporten sus coeficientes **sobre variables
  estandarizadas**, con `media` y `std` de entrenamiento.
- Si es no lineal (RF, XGBoost, etc.), ajusten una **regresión ridge sustituta** sobre las
  predicciones del modelo final y reporten en `simulador.rmse` qué tanto se parecen.
- `min` / `max` definen el rango de los controles (usar el rango observado en las 197 parcelas).

```python
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
X = df[vars]; sc = StandardScaler().fit(X)
sur = Ridge(alpha=1.0).fit(sc.transform(X), modelo_final.predict(X))
simulador = {
  "tipo": "lineal", "intercepto": float(sur.intercept_),
  "variables": [ {"nombre": v, "coef": float(c), "media": float(m), "std": float(s),
                  "min": float(X[v].min()), "max": float(X[v].max())}
                 for v, c, m, s in zip(vars, sur.coef_, sc.mean_, sc.scale_) ],
}
```

## 3. `series.json` (opcional, recomendado)

Series de índices por parcela para la ficha. Se carga solo al abrir una ficha.

```json
{
  "P001": [   // la clave es el ID_POLIGONO
    { "fecha": "2025-07-15", "indice": "NDVI", "valor": 0.62, "nubosidad": 12, "fuente": "Sentinel-2" }
  ]
}
```

- `fecha` en `YYYY-MM-DD`. La app muestra hasta 3 índices distintos por parcela.
- `nubosidad` en %; `null` o ausente se toma como 0 (criterio de FIRA).

## 4. `predicciones.csv` (obligatorio para la entrega)

El mismo CSV que se manda a innovacion@fira.gob.mx; la app solo ofrece descargarlo.

```
ID_POLIGONO,rendimiento_pred
AGC_003,3.3293
```

Ajustar las columnas a la plantilla que envíe FIRA por correo.
