# SKILLS.md - Recursos para PlexParty

Recursos recomendados basados en la comunidad para desarrollar el proyecto PlexParty (watch party app con streaming).

---

## Stack Principal

### Frontend

#### React + TypeScript
- https://react.dev
- https://www.typescriptlang.org/docs/
- https://tanstack.com/query/ (React Query para server state)
- https://reactrouter.com/ (enrutamiento)

#### State Management
- https://zustand-demo.pmnd.rs/ (Zustand - más simple que Redux)
- https://redux-toolkit.js.org/ (alternativa)

#### Video Streaming
- https://github.com/video-dev/hls.js (HLS para streaming adaptativo)
- https://plyr.io/ (player UI)
- https://videojs.com/ (alternativa más robusta)

#### UI
- https://tailwindcss.com/
- https://ui.shadcn.com/ (componentes React)
- https://lucide.dev/ (iconos)

#### WebSocket Client
- https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- https://socket.io/ (si se necesita reconexión automática)

---

### Backend

#### Node.js + Hono
- https://hono.dev/
- https://nodejs.org/docs/
- https://github.com/honojs/awesome-hono

#### Database (Supabase/PostgreSQL)
- https://supabase.com/docs
- https://www.postgresql.org/docs/
- https://www.prisma.io/ (ORM)

#### WebSocket Server
- https://github.com/honojs/node-ws (WebSocket para Hono)
- https://socket.io/ (alternativa más robusta con rooms)

---

## Mejores Prácticas de la Comunidad

### Video Streaming con HLS.js

**Patrón recomendado para React:**
```typescript
import Hls from 'hls.js';
import { useRef, useEffect } from 'react';

function VideoPlayer({ src }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }
    return () => hlsRef.current?.destroy();
  }, [src]);

  return <video ref={videoRef} controls />;
}
```

**Mejores prácticas:**
- Usar `enableWorker: true` para rendimiento
- `lowLatencyMode: true` para streaming en vivo
- Siempre manejar el evento `ERROR` para recovery
- Hacer fallback a HLS nativo en Safari

---

### Sincronización con WebSocket/Socket.io

**Arquitectura de sincronización (según comunidad):**

```
1. Host envía: { type: 'play', time: 123.45, videoId: 'xxx' }
2. Server difunde a todos en la sala
3. Clientes reproducen desde ese tiempo
4. Intervalo de sync cada 1-2 segundos
```

**Patrón recomendado:**
```typescript
// Server (Socket.io)
io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('video-action', ({ roomId, action, time }) => {
    // Broadcast a todos EXCEPTO el emisor
    socket.to(roomId).emit('sync', { action, time });
  });
});
```

**Room Management:**
- Usar room IDs únicos e impredecibles
- Trackear membresía en aplicación si es necesario
- Usar Redis adapter para escalar multi-servidor
- Limitar eventos broadcast a rooms específicos

**Errores comunes a evitar:**
- No hacer broadcast a todos (usar `socket.to(room)`)
- No manejar reconexión automáticamente
- No validar room antes de enviar eventos

---

### Proyectos de Referencia (Watch Party)

| Proyecto | Tech Stack | Estrellas | URL |
|----------|-----------|-----------|-----|
| **streamparty** | React + Socket.io + Express | 85 | https://github.com/jengmicah/streamparty |
| **sludgy-sync** | React + Socket.io + Next.js + HLS | - | https://github.com/ericesposito/sludgy-sync |
| **WatchTogether** | React + Socket.io + YouTube API | - | https://github.com/iBVerma/Watch-Together |
| **go-party** | Go + Next.js + WebSockets | - | https://github.com/raghavyuva/go-party |
| **PeerPlay** | Next.js + Socket.io | 2 | https://github.com/johnexzy/peerplay |
| **WatchParties** (tu referencia) | Similar a PlexParty | - | https://github.com/pizzahot12/WatchParties |

---

## Errores Comunes y Soluciones

### 1. Render → Jellyfin 500 errors
- **Causa**: Timeouts de conexión desde Render a Jellyfin
- **Solución**: NO usar `IncludeItemTypes`, usar folder IDs hardcodeados

### 2. FFmpeg SIGTERM
- **Causa**: Memoria insuficiente en Render
- **Solución**: No hacer transcodificación en servidor, delegar a Jellyfin

### 3. Videos no cargan
- **Causa**: CORS o URLs incorrectas
- **Solución**: Verificar que Jellyfin permita requests desde el dominio

### 4. Sync no funciona
- **Causa**: Latencia alta o eventos no enviados
- **Solución**: Usar `socket.broadcast.to(room)` en lugar de `io.emit`

---

## Commits Importantes

- `5f6559b7` - Última versión estable (películas funcionan)
- Tag: `jellyfin-integration-v1`

---

## Variables de Entorno (Production)

### Backend (Render)
```
JELLYFIN_URL=https://jellyfin.watchtogether.nl
JELLYFIN_API_KEY=fab44659f9b74192924b80d2a3b0e8a2
SUPABASE_URL=https://qrtiwmyxdzthecxqdpzo.supabase.co
SUPABASE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
PORT=3000
NODE_ENV=production
```

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://watch-together-2x.onrender.com/api
VITE_WS_BASE_URL=wss://watch-together-2x.onrender.com
VITE_SUPABASE_URL=https://qrtiwmyxdzthecxqdpzo.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

---

## URLs de Producción

- Frontend: https://plexparty.vercel.app
- Backend: https://watch-together-2x.onrender.com
- Jellyfin: https://jellyfin.watchtogether.nl

---

## Git Repos

1. Frontend: https://github.com/pizzahot12/plexparty-frontend
2. Backend: https://github.com/pizzahot12/plan-compleetao-agentes-separados

---

## Recursos Adicionales

### Artículos Recomendados
- https://blog.logrocket.com/next-js-real-time-video-streaming-hls-js-alternatives/
- https://videosdk.live/developer-hub/developer-hub/socketio/socketio-rooms
- https://getstream.io/blog/webrtc-websocket-av-sync/

### WebSocket vs WebRTC
- **WebSocket**: Para sincronización de control (play/pause/seek)
- **WebRTC**: Para chat de voz/video en tiempo real
