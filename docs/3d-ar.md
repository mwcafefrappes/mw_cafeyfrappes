# 3D y realidad aumentada

> Creado 2026-10-06. Pista paralela: se aprende y se mejora en la marcha.

## Cómo se ve para el cliente

En el detalle del producto, botón **"Ver en 3D"**: el modelo gira con el
dedo. En celular aparece **"Ver en tu mesa"**: se abre la cámara y la
bebida aparece sobre la superficie, a tamaño real.

- **Android:** Scene Viewer (Google), con Chrome.
- **iPhone/iPad:** Quick Look (Safari). `<model-viewer>` genera el USDZ
  al vuelo; si se ve mal, se sube un `.usdz` hecho a mano.
- **Computadora:** solo 3D, sin cámara.

## Herramientas (todas gratis)

| Herramienta | Para qué | Costo |
|---|---|---|
| `<model-viewer>` (Google) | Mostrar el 3D y lanzar la AR | Gratis, código abierto |
| **Blender** | Limpiar, escalar, modelar, materiales, exportar `.glb` | **Gratis, software libre** (no requiere pago) |
| Meshy / Tripo / Hunyuan3D | Generar un modelo 3D desde una foto | Capa gratuita con créditos limitados |
| Polycam / KIRI Engine | Escanear objetos con el celular (fotogrametría) | Capa gratuita |
| gltf-transform (CLI) | Comprimir (Draco/Meshopt, texturas WebP) | Gratis |
| modelviewer.dev/editor | Probar iluminación y cámara antes de subir | Gratis |

## Estado (2026-10-09)

- **Etapas 1 y 3 hechas:** el visor está en el detalle del producto y el
  modelo se sube, cambia o quita en `/admin/menu/producto/<id>` → "Vista
  3D". Probado con una taza de prueba; falta probar Scene Viewer y Quick
  Look en celulares reales.
- Los modelos se suben directo a Storage (hasta 10 MB; meta ≤ 4 MB) y
  deben venir **en metros y a tamaño real**: "Ver en tu mesa" no deja
  cambiar la escala.
- Siguiente: etapa 2 (modelos reales por IA + Blender).

## Etapas

1. **Visor listo:** `<model-viewer>` en el detalle de producto con un
   modelo de prueba. Medir carga en un celular real.
2. **Piloto por IA (calidad media):** affogato, un frappé y un café.
   - Foto del producto de frente y a 3/4, fondo liso, buena luz.
   - Generar con Meshy/Tripo/Hunyuan3D → abrir en Blender → arreglar
     escala real (vaso de 16 oz ≈ 15 cm de alto, taza ≈ 8 cm), centrar
     en el piso, reducir polígonos (meta < 50 k), hornear texturas a
     1024 px.
   - Exportar `.glb` y comprimir: meta **≤ 4 MB** por modelo (Storage
     gratis = 1 GB).
3. **Desde `/admin`:** subir y reemplazar el `.glb` (y `.usdz` opcional)
   por producto, con vista previa.
4. **Realismo:**
   - **Bebidas** (vidrio, líquido, hielo, crema): el escaneo falla con lo
     transparente. Se modela en Blender un **kit reutilizable** (vaso de
     frappé, taza de café, vaso del affogato, domo, popote, crema
     batida, bola de helado) y se combina por producto.
   - **Waffles y crepas** (opacos): el **escaneo** con Polycam/KIRI
     funciona bien y da el resultado más real.

## Criterios de calidad

- Escala real (para que en la mesa se vea del tamaño correcto).
- Carga en menos de 3 s con 4G; póster (imagen) mientras carga.
- Se ve bien en Android y en iPhone, con luz neutra.
- Lo transparente no se ve negro en Quick Look (probar en iPhone).
