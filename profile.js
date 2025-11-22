// public/profile.js - Cargar perfil de usuario específico
(async function() {
  const API_URL = window.location.origin;
  const viewingUserId = localStorage.getItem('viewingUserId');
  const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');

  if (!viewingUserId) {
    // Si no hay usuario para ver, cargar el propio
    window.location.href = '/index.html';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/user/${viewingUserId}`);
    const data = await response.json();

    if (response.ok && data.user) {
      const user = data.user;

      // Actualizar elementos de la tarjeta
      document.getElementById('nombre').textContent = user.fullName || 'Usuario';
      document.getElementById('oficio').textContent = user.profession || 'Profesional';
      document.getElementById('phone').textContent = user.phone || '';
      document.getElementById('email').textContent = user.email || '';
      
      const fotoImg = document.querySelector('.foto img');
      if (user.photo) {
        fotoImg.src = user.photo;
        fotoImg.alt = user.fullName;
      }

      const experienciaEl = document.querySelector('.experiencia');
      if (user.experience) {
        experienciaEl.textContent = `${user.experience} de experiencia`;
      }

      const ubicacionEl = document.querySelector('.ubicacion');
      if (user.location) {
        ubicacionEl.textContent = `📍 ${user.location}`;
      }

      window.CLIENT_NAME = user.fullName || user.username || 'Usuario';

    } else {
      alert('No se pudo cargar el perfil');
      window.location.href = '/feed.html';
    }
  } catch (error) {
    console.error('Error cargando perfil:', error);
    alert('Error al cargar el perfil');
    window.location.href = '/feed.html';
  }
})();