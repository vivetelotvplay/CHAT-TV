// public/index-protected.js - Proteger la página principal
(function() {
  // Verificar autenticación
  const authToken = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');

  if (!authToken || !userData) {
    // Si no está autenticado, redirigir a login
    window.location.href = '/login.html';
    return;
  }

  // Cargar datos del usuario en la tarjeta
  try {
    const user = JSON.parse(userData);
    
    // Actualizar elementos de la tarjeta
    if (document.getElementById('nombre')) {
      document.getElementById('nombre').textContent = user.fullName || 'Usuario';
    }
    if (document.getElementById('oficio')) {
      document.getElementById('oficio').textContent = user.profession || 'Profesional';
    }
    if (document.getElementById('phone')) {
      document.getElementById('phone').textContent = user.phone || '';
    }
    if (document.getElementById('email')) {
      document.getElementById('email').textContent = user.email || '';
    }
    
    // Actualizar foto si existe
    if (user.photo) {
      const fotoImg = document.querySelector('.foto img');
      if (fotoImg) {
        fotoImg.src = user.photo;
        fotoImg.alt = user.fullName;
      }
    }

    // Actualizar experiencia
    const experienciaEl = document.querySelector('.experiencia');
    if (experienciaEl && user.experience) {
      experienciaEl.textContent = `${user.experience} de experiencia`;
    }

    // Actualizar ubicación
    const ubicacionEl = document.querySelector('.ubicacion');
    if (ubicacionEl && user.location) {
      ubicacionEl.textContent = `📍 ${user.location}`;
    }

    // Actualizar nombre en CLIENT_NAME para el chat
    window.CLIENT_NAME = user.fullName || user.username || 'Usuario';

  } catch (error) {
    console.error('Error cargando datos del usuario:', error);
  }

  // Agregar botón de cerrar sesión
  const header = document.querySelector('.topbar');
  if (header) {
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = '🚪 Cerrar Sesión';
    logoutBtn.style.cssText = `
      margin-left: auto;
      padding: 8px 16px;
      border: none;
      background: rgba(255,255,255,0.05);
      color: var(--muted);
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.3s;
    `;
    logoutBtn.addEventListener('mouseover', () => {
      logoutBtn.style.background = 'rgba(239, 68, 68, 0.2)';
      logoutBtn.style.color = '#ef4444';
    });
    logoutBtn.addEventListener('mouseout', () => {
      logoutBtn.style.background = 'rgba(255,255,255,0.05)';
      logoutBtn.style.color = 'var(--muted)';
    });
    logoutBtn.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/login.html';
      }
    });
    header.appendChild(logoutBtn);
  }
})();