# AeroSLP

Aplicación web estática para aficionados a la aviación en San Luis Potosí, México. Aeropuerto base: MMSP / Aeropuerto Internacional Ponciano Arriaga.

## Funciones

- Radar polar con norte arriba y radios de 40, 80, 140 y 200 NM, centrado en 22.25426172, -100.9307605.
- Posiciones ADS-B de [adsb.fi](https://adsb.fi/), consultadas cada 20 segundos mientras la página permanece visible. Mediante un servicio HTTPS de AeroSLP que resuelve CORS; sin claves en el navegador.
- Callsign, matrícula, tipo, altitud, velocidad sobre suelo, track, marcación y distancia, cuando la fuente los proporciona.
- Selector de seis frecuencias aportadas por el usuario: Torre 118.850, Aproximación 127.500, Centro 1 126.600, Centro 8 127.300, Centro 9 133.100 e Información 122.350 MHz.
- Candidatos ATC heurísticos, claramente identificados como estimación no oficial. Sin porcentajes de confianza inventados ni atribución de sectores sin polígonos oficiales.
- Bitácora local de escuchas y exportación CSV. Los registros existentes con clave `aeroslp.logs` se conservan.
- Configuración de un stream propio HTTPS por frecuencia y controles nativos de audio. Safari admite formatos según su reproductor; HLS depende de soporte nativo. No hay reproducción automática.
- LiveATC se abre exclusivamente en un enlace externo. No se incrusta, consulta ni redistribuye su audio.
- Diseño adaptable, controles táctiles, etiquetas accesibles y caché del armazón para consultar frecuencias y bitácora sin conexión después de una primera visita correcta.

## Límites de los datos

ADS-B no transmite la frecuencia utilizada. La heurística orienta sobre posibles dependencias, sin servir como fuente operacional. Los umbrales de 8/50 NM y 10,500/20,000 ft son criterios visuales de esta aplicación, no límites oficiales de espacio aéreo. Para tránsito en altura se ofrecen los tres canales de México Centro sin asignar un sector. La altitud no representa altura sobre terreno. El track es dirección de desplazamiento sobre suelo, no rumbo magnético.

La cobertura depende de receptores voluntarios. Posiciones con más de 60 segundos de antigüedad se retiran. Si falla la red, el navegador bloquea CORS o el proveedor limita consultas, se informa el error y se reintenta con espera progresiva; jamás se sustituye el tráfico por datos ficticios. Se conserva la hora de la fuente. El servicio sólo consulta las coordenadas fijas de MMSP y cuatro radios permitidos. No actúa como proxy de URLs arbitrarias ni incluye credenciales en el cliente.

Los datos de adsb.fi se utilizan sólo para uso personal y no comercial, con atribución y enlace a su sitio. [Condiciones y documentación de la API](https://github.com/adsbfi/opendata). Sus límites y disponibilidad pueden cambiar. El servicio aplica una caché breve para reducir las consultas; no garantiza cobertura completa ni continuidad.

## Audio propio

Conectar un receptor físico a un codificador/servidor de streaming que entregue MP3, AAC o un formato que el navegador admita. Publicar ese audio mediante HTTPS y configurar su URL en el canal correspondiente. El servidor, receptor y permisos sobre el audio no forman parte de este repositorio. No incluir claves privadas en URLs. La configuración sólo vive en el navegador y no se publica en GitHub.

## Privacidad y persistencia

La bitácora y los ajustes están en `localStorage` del dispositivo. No hay cuenta de AeroSLP ni sincronización. El borrado de datos del navegador los elimina; exportar CSV para respaldo. El proveedor ADS-B recibe consultas de tráfico, pero no la bitácora. No se solicita geolocalización. Los datos externos se escapan antes de mostrarse.

## Desarrollo y publicación

La interfaz de GitHub Pages no requiere dependencias ni compilación. Para ejecutar localmente: `python3 -m http.server 8000` desde esta carpeta. Pruebas de lógica: `node --test core.test.cjs`. El servicio de tráfico permite el origen publicado en GitHub; para una copia de desarrollo, configure su propio servicio y el origen permitido.

Servicio publicado: `https://aeroslp-traffic.vmtsj.chatgpt.site/api/aircraft?radius=140`. Su código está en `traffic-api.ts`: es un Route Handler compatible con Vinext/Next.js, ubicado como `app/api/aircraft/route.ts` en el proyecto de servidor. Se despliega por separado de GitHub Pages en Sites. Usa las APIs estándar Request, Response, fetch y AbortController, caché de 10 segundos, validación de radio, CORS restringido al sitio y tiempo máximo de 8.5 segundos. Para trasladarlo a otro proveedor, cambie el endpoint en `app.js`, configure `ORIGIN` y aumente la versión de `sw.js`.

En GitHub: Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save. El archivo `.nojekyll` permite servir los archivos estáticos directamente. Todos los recursos usan rutas relativas para funcionar dentro de `/aeroslp/`.

El service worker sólo guarda recursos de esta aplicación; nunca almacena ni intercepta ADS-B o audio externo. Al cambiar recursos, incrementar la versión de caché en `sw.js`.

**No utilizar para navegación, separación de aeronaves ni decisiones de vuelo.**

## Estado verificado · 26 de septiembre de 2026

La interfaz está publicada en https://victorressj.github.io/aeroslp/ desde `main`. Se probaron el selector, la persistencia y exportación CSV de la bitácora, y el rechazo de audio HTTP o de LiveATC. La interfaz se revisó en Chrome con marcos de 390 y 320 píxeles, sin desbordamiento horizontal; no se probó un iPhone físico ni Safari.

**Pendiente: tráfico en vivo.** ADSB.lol y adsb.fi devolvieron HTTP 403 al servicio de consulta alojado; adsb.fi mostró una página de seguridad de Cloudflare. El navegador alcanza el servicio con CORS correcto, pero éste no puede obtener las posiciones. Se necesita una fuente que autorice consultas desde este alojamiento (o un endpoint de un receptor propio). No se sortea el bloqueo ni se muestran posiciones ficticias. Ante este rechazo se detiene el sondeo automático y el servidor aplica una pausa de 15 minutos.

El audio requiere que el usuario configure el stream HTTPS real de su receptor; no se ha probado reproducción con ese equipo.
