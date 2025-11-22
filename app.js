// public/app.js - cliente adaptado: modal de conexión antes de abrir chat
(function () {
  const WS_URL = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/ws";

  function randomPin() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }
  function el(id) { return document.getElementById(id); }

  // DOM references
  const myPinEl = el("myPin");
  const remotePinInput = el("remotePin");
  const connectBtn = el("connectBtn");
  const copyPinBtn = el("copyPinBtn");
  const statusEl = el("status");

  // connect overlay (modal para pedir PIN)
  const openChatBtn = el("openChatBtn");
  const connectOverlay = el("connectOverlay");
  const closeConnectBtn = el("closeConnectBtn");

  // chat overlay elements
  const chatOverlay = el("chatOverlay");
  const closeChatBtn = el("closeChatBtn");
  const overlayMessages = el("overlayMessages");
  const overlayInput = el("overlayInput");
  const overlaySend = el("overlaySend");
  const ledEl = el("led");
  const chatNameEl = el("chatName");
  const chatSubEl = el("chatSub");

  // profile data from page
  const profile = {
    username: window.CLIENT_NAME || el("nombre")?.textContent || "Anon",
    phone: el("phone")?.textContent || "",
    email: el("email")?.textContent || "ejemplo@correo.com",
    profession: el("oficio")?.textContent || "",
  };

  const state = {
    myPin: randomPin(),
    partnerPin: null,
    connected: false,
    ws: null,
    username: profile.username,
    checkingPresenceInterval: null,
  };

  function setStatus(text, ok = true) {
    statusEl.textContent = text;
    statusEl.style.color = ok ? "var(--muted)" : "#ff6b6b";
  }

  function appendMessageTo(elRoot, { text, fromUsername, fromPin, ts }, mine = false) {
    const d = document.createElement("div");
    d.className = "message " + (mine ? "me" : "them");
    const txt = document.createElement("div");
    txt.textContent = text;
    const meta = document.createElement("div");
    meta.className = "meta";
    const t = new Date(ts || Date.now());
    meta.textContent = `${fromUsername || (mine ? "Tú" : fromPin)} · ${t.toLocaleTimeString()}`;
    d.appendChild(txt);
    d.appendChild(meta);
    elRoot.appendChild(d);
    elRoot.scrollTop = elRoot.scrollHeight;
  }

  function appendSystem(text, elRoot) {
    const s = document.createElement("div");
    s.className = "message them";
    s.style.fontStyle = "italic";
    s.style.opacity = "0.95";
    s.textContent = text;
    elRoot.appendChild(s);
    elRoot.scrollTop = elRoot.scrollHeight;
  }

  function connectWebSocket() {
    state.ws = new WebSocket(WS_URL);

    state.ws.addEventListener("open", () => {
      state.ws.send(JSON.stringify({
        type: "register",
        pin: state.myPin,
        username: state.username,
        email: profile.email,
        phone: profile.phone,
        profession: profile.profession,
      }));
    });

    state.ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (!msg || !msg.type) return;
        
        if (msg.type === "registered") {
          myPinEl.textContent = state.myPin;
          setStatus("Listo. Toca 'Abrir chat' para conectar.");
        } 
        else if (msg.type === "paired") {
          state.partnerPin = String(msg.with || "");
          state.connected = true;
          setStatus("Conectado con " + state.partnerPin, true);
          const partner = msg.partnerProfile || {};
          chatNameEl.textContent = partner.username || "Desconocido";
          chatSubEl.textContent = `${partner.phone || partner.email || ""} · ${partner.profession || ""}`;
          appendSystem("Conectado, puedes escribir.", overlayMessages);
          
          // Cerrar modal de conexión y abrir chat
          connectOverlay.setAttribute("aria-hidden", "true");
          chatOverlay.setAttribute("aria-hidden", "false");
          setTimeout(() => overlayInput.focus(), 260);
          setLed(true);
        } 
        else if (msg.type === "message") {
          appendMessageTo(overlayMessages, { 
            text: msg.text, 
            fromUsername: msg.fromUsername, 
            fromPin: msg.fromPin, 
            ts: msg.ts 
          }, msg.fromPin === state.myPin);
        } 
        else if (msg.type === "history") {
          (msg.messages || []).forEach((m) => {
            appendMessageTo(overlayMessages, { 
              text: m.text, 
              fromUsername: m.fromUsername, 
              fromPin: m.fromPin, 
              ts: m.ts 
            }, m.fromPin === state.myPin);
          });
        } 
        else if (msg.type === "error") {
          setStatus("Error: " + (msg.message || "error"), false);
        } 
        else if (msg.type === "partner_disconnected") {
          setStatus("El partner se desconectó.", false);
          state.connected = false;
          state.partnerPin = null;
          setLed(false);
          appendSystem("El partner se desconectó.", overlayMessages);
        } 
        else if (msg.type === "typing") {
          const ind = document.createElement("div");
          ind.className = "message them";
          ind.textContent = `${msg.fromUsername || msg.fromPin} está escribiendo...`;
          ind.style.fontStyle = "italic";
          ind.style.opacity = "0.7";
          overlayMessages.appendChild(ind);
          setTimeout(() => ind.remove(), 1200);
        } 
        else if (msg.type === "presence") {
          if (String(msg.pin) === String(remotePinInput.value || state.partnerPin || "")) {
            setLed(!!msg.online);
          }
        } 
        else if (msg.type === "system") {
          appendSystem(msg.text, overlayMessages);
        }
      } catch (err) {
        console.error("Invalid message", ev.data);
      }
    });

    state.ws.addEventListener("close", () => {
      setStatus("Conexión con servidor cerrada.", false);
      state.connected = false;
      state.partnerPin = null;
      setLed(false);
      
      // Intentar reconectar después de 3 segundos
      setTimeout(() => {
        setStatus("Reconectando...");
        connectWebSocket();
      }, 3000);
    });

    state.ws.addEventListener("error", () => {
      setStatus("Error de WebSocket.", false);
      setLed(false);
    });
  }

  // presence LED control
  function setLed(isOnline) {
    if (!ledEl) return;
    if (isOnline) {
      ledEl.classList.remove("red"); 
      ledEl.classList.add("green");
      ledEl.title = "Estado: conectado";
    } else {
      ledEl.classList.remove("green"); 
      ledEl.classList.add("red");
      ledEl.title = "Estado: desconectado";
    }
  }

  function startPresenceChecks() {
    if (state.checkingPresenceInterval) clearInterval(state.checkingPresenceInterval);
    state.checkingPresenceInterval = setInterval(() => {
      const targetPin = remotePinInput.value.trim() || state.partnerPin;
      if (!/^\d{8}$/.test(targetPin)) {
        setLed(false);
        return;
      }
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: "presence_check", toPin: targetPin }));
      }
    }, 1000);
  }

  // UI events - Modal de conexión
  openChatBtn.addEventListener("click", () => {
    // Abrir modal de conexión en lugar del chat directamente
    connectOverlay.setAttribute("aria-hidden", "false");
    setTimeout(() => remotePinInput.focus(), 260);
    startPresenceChecks();
  });

  closeConnectBtn.addEventListener("click", () => {
    connectOverlay.setAttribute("aria-hidden", "true");
    remotePinInput.value = "";
  });

  connectBtn.addEventListener("click", () => {
    const remote = remotePinInput.value.trim();
    if (!/^\d{8}$/.test(remote)) {
      setStatus("Introduce un PIN válido de 8 dígitos.", false);
      return;
    }
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
      setStatus("Conectando al servidor... intenta de nuevo en un momento.", false);
      return;
    }
    state.ws.send(JSON.stringify({ type: "connect", toPin: remote }));
    setStatus("Intentando conectar con " + remote + " ...");
    startPresenceChecks();
    // El modal se cerrará automáticamente cuando llegue el mensaje "paired"
  });

  copyPinBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.myPin);
      setStatus("Mi PIN copiado al portapapeles.");
      
      // Feedback visual
      copyPinBtn.textContent = "✓ Copiado";
      setTimeout(() => {
        copyPinBtn.textContent = "📋 Copiar mi PIN";
      }, 2000);
    } catch {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = state.myPin;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setStatus("Mi PIN copiado al portapapeles.");
        copyPinBtn.textContent = "✓ Copiado";
        setTimeout(() => {
          copyPinBtn.textContent = "📋 Copiar mi PIN";
        }, 2000);
      } catch (err) {
        setStatus("No se pudo copiar el PIN.", false);
      }
      document.body.removeChild(textArea);
    }
  });

  // Chat overlay controls
  closeChatBtn.addEventListener("click", () => {
    chatOverlay.setAttribute("aria-hidden", "true");
    // Limpiar input y permitir nueva conexión
    remotePinInput.value = "";
    setStatus("Chat cerrado. Puedes conectar con otro PIN.");
    
    // Opcionalmente desconectar del partner actual
    if (state.connected && state.partnerPin) {
      state.connected = false;
      state.partnerPin = null;
      setLed(false);
    }
  });

  overlaySend.addEventListener("click", () => {
    const text = overlayInput.value.trim();
    if (!text) return;
    if (!state.connected) {
      appendSystem("No estás conectado a nadie.", overlayMessages);
      return;
    }
    state.ws.send(JSON.stringify({ type: "message", text }));
    appendMessageTo(overlayMessages, { 
      text, 
      fromUsername: state.username, 
      fromPin: state.myPin, 
      ts: Date.now() 
    }, true);
    overlayInput.value = "";
  });

  overlayInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      overlaySend.click();
    } else {
      // Notificar que está escribiendo
      if (state.ws && state.ws.readyState === WebSocket.OPEN && state.connected) {
        state.ws.send(JSON.stringify({ type: "typing" }));
      }
    }
  });

  // Prevenir pérdida de datos al cerrar/recargar
  window.addEventListener("beforeunload", (e) => {
    if (state.connected) {
      e.preventDefault();
      e.returnValue = "Tienes una conversación activa. ¿Seguro que quieres salir?";
      return e.returnValue;
    }
  });

  // init
  myPinEl.textContent = state.myPin;
  setStatus("Conectando al servidor...");
  setLed(false);
  connectWebSocket();
  startPresenceChecks();

  // Log de debug (remover en producción)
  console.log("🚀 Chat inicializado");
  console.log("📌 Mi PIN:", state.myPin);
  console.log("👤 Usuario:", state.username);
})();