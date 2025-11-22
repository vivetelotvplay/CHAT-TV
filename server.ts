// server.ts - Backend actualizado con feed y posts conectados
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.208.0/http/file_server.ts";

const PORT = 3000;
const USERS_FILE = "./users.json";
const POSTS_FILE = "./posts.json";

// Store de tokens de sesión (en producción usar base de datos)
const activeSessions = new Map<string, string>(); // token -> userId

// Store para WebSocket connections
const pins = new Map();
const pairs = new Map();
const messageHistory = new Map();
const sockets = new Set<WebSocket>();

// Utilidades de archivos
async function loadUsers() {
  try {
    const data = await Deno.readTextFile(USERS_FILE);
    return JSON.parse(data);
  } catch {
    await Deno.writeTextFile(USERS_FILE, JSON.stringify([]));
    return [];
  }
}

async function saveUsers(users: any[]) {
  await Deno.writeTextFile(USERS_FILE, JSON.stringify(users, null, 2));
}

async function loadPosts() {
  try {
    const data = await Deno.readTextFile(POSTS_FILE);
    return JSON.parse(data);
  } catch {
    await Deno.writeTextFile(POSTS_FILE, JSON.stringify([]));
    return [];
  }
}

async function savePosts(posts: any[]) {
  await Deno.writeTextFile(POSTS_FILE, JSON.stringify(posts, null, 2));
}

// Hash de contraseña
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generar token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Obtener usuario por token
function getUserByToken(token: string, users: any[]): any | null {
  const userId = activeSessions.get(token);
  if (!userId) return null;
  return users.find((u: any) => u.id === userId) || null;
}

// Handler principal
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // WebSocket para chat
  if (pathname === "/ws") {
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    let myPin: string | null = null;

    socket.onopen = () => {
      sockets.add(socket);
    };

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "register") {
          myPin = String(msg.pin);
          pins.set(myPin, {
            ws: socket,
            username: msg.username || "Anon",
            email: msg.email || "",
            phone: msg.phone || "",
            profession: msg.profession || "",
          });
          socket.send(JSON.stringify({ type: "registered", pin: myPin }));
        } 
        else if (msg.type === "connect") {
          const toPin = String(msg.toPin);
          const target = pins.get(toPin);

          if (!target) {
            socket.send(JSON.stringify({ type: "error", message: "PIN no encontrado" }));
            return;
          }

          pairs.set(myPin, toPin);
          pairs.set(toPin, myPin);

          const pairKey = [myPin, toPin].sort().join("-");
          if (!messageHistory.has(pairKey)) {
            messageHistory.set(pairKey, []);
          }

          const me = pins.get(myPin);
          socket.send(JSON.stringify({
            type: "paired",
            with: toPin,
            partnerProfile: target,
          }));
          target.ws.send(JSON.stringify({
            type: "paired",
            with: myPin,
            partnerProfile: me,
          }));

          const history = messageHistory.get(pairKey) || [];
          socket.send(JSON.stringify({ type: "history", messages: history }));
          target.ws.send(JSON.stringify({ type: "history", messages: history }));
        } 
        else if (msg.type === "message") {
          const partnerPin = pairs.get(myPin);
          if (!partnerPin) return;

          const partner = pins.get(partnerPin);
          if (!partner) return;

          const pairKey = [myPin, partnerPin].sort().join("-");
          const msgData = {
            text: msg.text,
            fromPin: myPin,
            fromUsername: pins.get(myPin)?.username || myPin,
            ts: Date.now(),
          };

          if (!messageHistory.has(pairKey)) {
            messageHistory.set(pairKey, []);
          }
          messageHistory.get(pairKey).push(msgData);

          partner.ws.send(JSON.stringify({
            type: "message",
            ...msgData,
          }));
        } 
        else if (msg.type === "typing") {
          const partnerPin = pairs.get(myPin);
          if (!partnerPin) return;
          const partner = pins.get(partnerPin);
          if (!partner) return;
          partner.ws.send(JSON.stringify({
            type: "typing",
            fromPin: myPin,
            fromUsername: pins.get(myPin)?.username || myPin,
          }));
        } 
        else if (msg.type === "presence_check") {
          const targetPin = String(msg.toPin);
          const isOnline = pins.has(targetPin);
          socket.send(JSON.stringify({
            type: "presence",
            pin: targetPin,
            online: isOnline,
          }));
        }
      } catch (err) {
        console.error("Error procesando mensaje:", err);
      }
    };

    socket.onclose = () => {
      sockets.delete(socket);
      if (myPin) {
        const partnerPin = pairs.get(myPin);
        if (partnerPin) {
          const partner = pins.get(partnerPin);
          if (partner) {
            partner.ws.send(JSON.stringify({ type: "partner_disconnected" }));
          }
          pairs.delete(partnerPin);
          pairs.delete(myPin);
        }
        pins.delete(myPin);
      }
    };

    return response;
  }

  // API: Registro
  if (pathname === "/api/register" && req.method === "POST") {
    try {
      const body = await req.json();
      const { username, fullName, email, password, location, phone, profession, experience, photo } = body;

      if (!username || !fullName || !email || !password || !location || !phone || !profession || !experience) {
        return new Response(JSON.stringify({ message: "Todos los campos son obligatorios" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ message: "La contraseña debe tener al menos 6 caracteres" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const users = await loadUsers();

      if (users.find((u: any) => u.email === email)) {
        return new Response(JSON.stringify({ message: "Este correo ya está registrado" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (users.find((u: any) => u.username === username)) {
        return new Response(JSON.stringify({ message: "Este nombre de usuario ya existe" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const newUser = {
        id: Date.now().toString(),
        username,
        fullName,
        email,
        password: await hashPassword(password),
        location,
        phone,
        profession,
        experience,
        photo: photo || null,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      await saveUsers(users);

      const token = generateToken();
      activeSessions.set(token, newUser.id);

      const { password: _, ...userWithoutPassword } = newUser;

      return new Response(JSON.stringify({
        message: "Usuario registrado exitosamente",
        token,
        user: userWithoutPassword,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error en registro:", error);
      return new Response(JSON.stringify({ message: "Error al registrar usuario" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // API: Login
  if (pathname === "/api/login" && req.method === "POST") {
    try {
      const body = await req.json();
      const { email, password } = body;

      if (!email || !password) {
        return new Response(JSON.stringify({ message: "Email y contraseña son obligatorios" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const users = await loadUsers();
      const hashedPassword = await hashPassword(password);
      const user = users.find((u: any) => u.email === email && u.password === hashedPassword);

      if (!user) {
        return new Response(JSON.stringify({ message: "Credenciales incorrectas" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const token = generateToken();
      activeSessions.set(token, user.id);

      const { password: _, ...userWithoutPassword } = user;

      return new Response(JSON.stringify({
        message: "Inicio de sesión exitoso",
        token,
        user: userWithoutPassword,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error en login:", error);
      return new Response(JSON.stringify({ message: "Error al iniciar sesión" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // API: Obtener feed (usuarios + posts) - ACTUALIZADO
  if (pathname === "/api/feed" && req.method === "GET") {
    try {
      const users = await loadUsers();
      const posts = await loadPosts();

      // Crear feed combinado
      const feed: any[] = [];

      // Agregar usuarios como "workers" (nuevos registros)
      users.forEach((user: any) => {
        const { password, ...userWithoutPassword } = user;
        feed.push({
          id: `worker-${userWithoutPassword.id}`,
          userId: userWithoutPassword.id,
          type: 'worker',
          fullName: userWithoutPassword.fullName,
          username: userWithoutPassword.username,
          profession: userWithoutPassword.profession,
          location: userWithoutPassword.location,
          phone: userWithoutPassword.phone,
          email: userWithoutPassword.email,
          experience: userWithoutPassword.experience,
          photo: userWithoutPassword.photo,
          createdAt: userWithoutPassword.createdAt,
        });
      });

      // Agregar posts con información del usuario que lo publicó
      for (const post of posts) {
        const author = users.find((u: any) => u.id === post.userId);
        if (author) {
          feed.push({
            id: post.id,
            userId: post.userId,
            type: 'post',
            fullName: author.fullName,
            username: author.username,
            profession: author.profession,
            location: author.location,
            photo: author.photo,
            text: post.text,
            image: post.image,
            createdAt: post.createdAt,
          });
        }
      }

      // Ordenar por fecha (más recientes primero)
      feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return new Response(JSON.stringify({ feed }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error obteniendo feed:", error);
      return new Response(JSON.stringify({ message: "Error al cargar el feed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // API: Crear post - ACTUALIZADO
  if (pathname === "/api/posts" && req.method === "POST") {
    try {
      const authToken = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!authToken) {
        return new Response(JSON.stringify({ message: "No autorizado" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { text, image } = body;

      if (!text) {
        return new Response(JSON.stringify({ message: "El texto es obligatorio" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Obtener usuario actual desde el token
      const users = await loadUsers();
      const currentUser = getUserByToken(authToken, users);

      if (!currentUser) {
        return new Response(JSON.stringify({ message: "Usuario no encontrado o sesión expirada" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const posts = await loadPosts();

      const newPost = {
        id: Date.now().toString(),
        userId: currentUser.id,
        text,
        image: image || null,
        createdAt: new Date().toISOString(),
      };

      posts.push(newPost);
      await savePosts(posts);

      return new Response(JSON.stringify({
        message: "Post creado exitosamente",
        post: {
          ...newPost,
          fullName: currentUser.fullName,
          username: currentUser.username,
          profession: currentUser.profession,
          photo: currentUser.photo,
          type: 'post',
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error creando post:", error);
      return new Response(JSON.stringify({ message: "Error al crear post" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // API: Obtener usuario por ID
  if (pathname.startsWith("/api/user/") && req.method === "GET") {
    try {
      const userId = pathname.split("/api/user/")[1];
      const users = await loadUsers();
      const user = users.find((u: any) => u.id === userId);

      if (!user) {
        return new Response(JSON.stringify({ message: "Usuario no encontrado" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { password, ...userWithoutPassword } = user;

      return new Response(JSON.stringify({ user: userWithoutPassword }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      return new Response(JSON.stringify({ message: "Error al obtener usuario" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Redirección principal
  if (pathname === "/") {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login.html" },
    });
  }

  // Servir archivos estáticos
  return serveDir(req, {
    fsRoot: "public",
    showDirListing: false,
    enableCors: true,
  });
}

console.log(`🚀 Servidor Deno corriendo en http://localhost:${PORT}`);
console.log(`📁 Archivo de usuarios: ${USERS_FILE}`);
console.log(`📁 Archivo de posts: ${POSTS_FILE}`);

await serve(handler, { port: PORT });