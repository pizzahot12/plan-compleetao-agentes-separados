# SKILLS.md - Recursos para PlexParty

Recursos recomendados para desarrollar el proyecto PlexParty (watch party app con streaming).

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
- https://github.com/video-dev/hls.js (HLS para streaming adaptivo)
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
- https://socket.io/ (alternativa)

#### Authentication
- https://jwt.io/ (JWT)
- https://supabase.com/docs/guides/auth

---

### Jellyfin Integration

#### API
- https://api.jellyfin.org/ (documentación oficial)
- https://github.com/jellyfin/jellyfin-apiclient-javascript (cliente)

#### Streaming
- https://jellyfin.org/docs/general/server/transcoding/
- https://github.com/AgentD/scripts/blob/master/documentation/hls.md

---

## DevOps

### Deployment
- https://vercel.com/docs (frontend)
- https://render.com/docs (backend)
- https://docs.docker.com/

### CI/CD
- https://docs.github.com/en/actions
- https://github.com/marketplace?type=

---

## Proyecto de Referencia

### WatchParties (funcionando)
- Repo: https://github.com/pizzahot12/WatchParties
- Tiene HLS streaming con selección de episodios
- Usar como referencia para implementar features

---

## Patrones Importantes

### Sincronización de Video
```
1. Host envia: { type: 'play', time: 123.45 }
2. Todos los clientes reproducen desde ese tiempo
3. Intervalo de sync cada 1-2 segundos
```

### Queries a Jellyfin (LO QUE FUNCIONA)
```typescript
// NO USAR IncludeItemTypes - causa 500 errores desde Render
// USAR folder IDs hardcodeados
/users/${userId}/Items?ParentId=ed2a25286c558a96e1424971742ca250&Recursive=true
```

### Errores Comunes a Evitar
1. ❌ No usar IncludeItemTypes (500 errors)
2. ❌ No hacer queries dinámicas a carpetas (timeout)
3. ❌ No agregar FFmpeg transcoding (SIGTERM por memoria)
4. ❌ No exponer API key de Jellyfin al frontend

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
