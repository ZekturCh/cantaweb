# Letras sincronizadas

Cada cancion puede apuntar a un archivo `.lrc` desde `songs/manifest.json`.

Ejemplo:

```json
{
  "title": "Mi cancion",
  "artist": "Mi artista",
  "src": "songs/mi-cancion.mp3",
  "lyricsSrc": "songs/lyrics/mi-cancion.lrc",
  "duration": "03:42"
}
```

Formato `.lrc`:

```text
[00:12.30] Primera linea de la letra
[00:16.80] Segunda linea de la letra
```

Puedes usar letras completas solo si tienes permiso o si son de tu autoria.
