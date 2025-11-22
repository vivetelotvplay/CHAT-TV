# Tarjeta Digital Profesional con Chat P2P

Sistema completo de autenticación y chat en tiempo real usando **Deno**.

## 🚀 Instalación y ejecución

### Requisitos
- [Deno](https://deno.land/) instalado (v1.37+)

### Iniciar el servidor

```bash
# Desarrollo (con auto-reload)
deno task dev

# Producción
deno task start

# O directamente
deno run --allow-net --allow-read --allow-write server.ts
```

### Acceder a la aplicación
- **Login/Registro**: http://localhost:3000/
- **Página principal**: http://localhost:3000/index.html (requiere login)

## 📁 Estructura de archivos

```
proyecto/
├── public/
│   ├── login.html          # Página de login/registro
│   ├── auth.js             # Lógica de autenticación
│   ├── index-protected.js  # Protección de página
│   ├── index.html          # Tarjeta principal
│   ├── app.js              # Chat WebSocket
│   └── style.css           # Estilos
├── server.ts               # Servidor Deno
├── deno.json               # Configuración Deno
├── users.json              # Base de datos (se crea automáticamente)
└── README.md
```

## ✨ Características

✅ **Autenticación completa** (registro + login)
✅ **Subida de fotos** (base64)
✅ **Almacenamiento en JSON**
✅ **Chat P2P en tiempo real** (WebSocket)
✅ **Sistema de PINs** para conectar usuarios
✅ **Diseño moderno y responsive**
✅ **Protección de rutas**
✅ **Hash de contraseñas** (SHA-256)

## 🔐 Seguridad

- Las contraseñas se hashean con SHA-256
- Los tokens se generan con crypto aleatorio
- Las fotos se almacenan en base64 (máx 5MB)

## 📝 Uso

1. **Registrarse**: Crear cuenta con todos los datos
2. **Iniciar sesión**: Acceder con email y contraseña
3. **Ver tarjeta**: Tu información profesional
4. **Chatear**: Compartir tu PIN y conectar con otros usuarios

## 🛠️ Desarrollo

```bash
# Modo desarrollo con watch
deno task dev

# Formatear código
deno fmt

# Lint
deno lint
```

## 📦 Dependencias

Solo usa módulos estándar de Deno:
- `std/http/server.ts` - Servidor HTTP
- `std/http/file_server.ts` - Servir archivos estáticos
- API Web Crypto - Hash y tokens

¡Sin `node_modules`! 🎉