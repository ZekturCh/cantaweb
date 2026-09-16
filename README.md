# CantaWeb

CantaWeb es una PWA estatica para karaoke portatil en tablet Android.

## Hardware recomendado

- Samsung Galaxy Tab S9 o similar.
- Hub USB-C con Power Delivery passthrough.
- Power bank USB-C PD de 65W o mas.
- Microfono inalambrico 2.4 GHz con receptor USB.
- Parlante conectado por cable AUX o por una interfaz USB de audio.

Evita Bluetooth para monitorear la voz en vivo, porque agrega latencia.

## Canciones

La app esta limitada a 3 canciones desde `dist/songs/manifest.json`.

Incluye 3 audios demo generados para prueba. Reemplazalos por tus audios reales cuando tengas las pistas:

- `dist/songs/pulso-solar.wav`
- `dist/songs/ruta-neon.wav`
- `dist/songs/cabina-azul.wav`

Luego ajusta titulos/artistas en:

```json
dist/songs/manifest.json
```

No subas canciones comerciales a GitHub si no tienes derechos para distribuirlas.

## Probar localmente

Desde la carpeta `cantaweb`:

```bash
cd dist
python -m http.server 5173
```

Abre:

```text
http://localhost:5173
```

En la tablet, sirve la carpeta desde una red local o publica la app. El microfono requiere HTTPS o `localhost`.

## Uso

1. Conecta el hub USB-C a la tablet.
2. Conecta la bateria al puerto PD del hub.
3. Conecta el receptor USB del microfono.
4. Conecta el parlante por salida de audio cableada.
5. Abre CantaWeb.
6. Toca `Activar audio`.
7. Elige el microfono y prueba la entrada.
8. Reproduce una cancion y ajusta mezcla.
