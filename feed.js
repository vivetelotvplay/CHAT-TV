// public/feed.js - Feed social conectado con servidor Deno
(function() {
  const API_URL = window.location.origin;
  
  // Elementos DOM
  const feedContent = document.getElementById('feedContent');
  const btnNewPost = document.getElementById('btnNewPost');
  const postModal = document.getElementById('postModal');
  const closePostModal = document.getElementById('closePostModal');
  const newPostForm = document.getElementById('newPostForm');
  const postImage = document.getElementById('postImage');
  const uploadArea = document.getElementById('uploadArea');
  const postText = document.getElementById('postText');
  const filterChips = document.querySelectorAll('.filter-chip');
  const btnProfile = document.getElementById('btnProfile');
  const headerProfileImg = document.getElementById('headerProfileImg');

  let currentFilter = 'all';
  let uploadedImage = null;
  let allFeedItems = [];

  // Cargar foto de perfil del usuario logueado
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  if (userData.photo) {
    headerProfileImg.src = userData.photo;
  }

  // Verificar autenticación
  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    window.location.href = '/login.html';
    return;
  }

  // Abrir modal de nuevo post
  btnNewPost.addEventListener('click', () => {
    postModal.classList.add('active');
    postText.focus();
  });

  // Cerrar modal
  closePostModal.addEventListener('click', () => {
    postModal.classList.remove('active');
    newPostForm.reset();
    uploadedImage = null;
    uploadArea.classList.remove('has-image');
    uploadArea.innerHTML = `
      <div class="upload-icon">📷</div>
      <div class="upload-text">Click para subir una foto</div>
    `;
  });

  // Cerrar modal al hacer click fuera
  postModal.addEventListener('click', (e) => {
    if (e.target === postModal) {
      closePostModal.click();
    }
  });

  // Ir al perfil del usuario
  btnProfile.addEventListener('click', () => {
    window.location.href = '/index.html';
  });

  // Upload de imagen
  uploadArea.addEventListener('click', () => {
    postImage.click();
  });

  postImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedImage = event.target.result;
      uploadArea.classList.add('has-image');
      uploadArea.innerHTML = `
        <div class="upload-preview">
          <img src="${uploadedImage}" alt="Preview" />
        </div>
      `;
    };
    reader.readAsDataURL(file);
  });

  // Submit de nuevo post
  newPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const text = postText.value.trim();
    if (!text) {
      alert('Por favor escribe algo');
      return;
    }

    const submitBtn = document.getElementById('submitPost');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publicando...';

    try {
      const response = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          text,
          image: uploadedImage
        })
      });

      const data = await response.json();

      if (response.ok) {
        closePostModal.click();
        loadFeed(); // Recargar feed
        showNotification('Post publicado exitosamente! 🎉', 'success');
      } else {
        showNotification(data.message || 'Error al publicar', 'error');
      }
    } catch (error) {
      console.error('Error publicando post:', error);
      showNotification('Error al conectar con el servidor', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publicar';
    }
  });

  // Filtros
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderFeed();
    });
  });

  // Cargar feed desde el servidor
  async function loadFeed() {
    try {
      feedContent.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <div>Cargando contenido...</div>
        </div>
      `;

      const response = await fetch(`${API_URL}/api/feed`);
      const data = await response.json();

      if (response.ok) {
        allFeedItems = data.feed || [];
        renderFeed();
      } else {
        feedContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">😕</div>
            <div>Error al cargar el feed</div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error cargando feed:', error);
      feedContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔌</div>
          <div>Error de conexión</div>
        </div>
      `;
    }
  }

  // Renderizar feed según filtro
  function renderFeed() {
    let filteredItems = [...allFeedItems];

    // Aplicar filtro
    if (currentFilter === 'workers') {
      filteredItems = filteredItems.filter(item => item.type === 'worker');
    } else if (currentFilter === 'posts') {
      filteredItems = filteredItems.filter(item => item.type === 'post');
    } else if (currentFilter === 'recent') {
      filteredItems = filteredItems.slice(0, 10); // Solo los 10 más recientes
    }

    if (filteredItems.length === 0) {
      feedContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div>No hay contenido para mostrar</div>
          <p style="margin-top: 8px; font-size: 14px;">¡Sé el primero en publicar algo!</p>
        </div>
      `;
      return;
    }

    feedContent.innerHTML = filteredItems.map(item => createFeedCard(item)).join('');

    // Agregar eventos de click a las tarjetas
    document.querySelectorAll('.feed-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        const item = filteredItems[index];
        if (item.type === 'worker' || item.type === 'post') {
          goToProfile(item.userId);
        }
      });
    });
  }

  // Crear HTML de tarjeta
  function createFeedCard(item) {
    const isWorker = item.type === 'worker';
    const timeAgo = getTimeAgo(item.createdAt);
    const defaultPhoto = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop';

    if (isWorker) {
      // Tarjeta de nuevo profesional registrado
      return `
        <div class="feed-card" data-id="${item.id}" data-type="${item.type}">
          <div class="card-header">
            <div class="card-avatar">
              <img src="${item.photo || defaultPhoto}" alt="${item.fullName}" />
            </div>
            <div class="card-user-info">
              <div class="card-username">${item.fullName}</div>
              <div class="card-profession">${item.profession}</div>
              <div class="card-meta">
                <span>📍 ${item.location}</span>
                <span>⏱️ ${timeAgo}</span>
              </div>
            </div>
            <div class="card-type-badge badge-worker">
              Nuevo Profesional
            </div>
          </div>

          <div class="card-stats">
            <div class="stat-item">
              💼 ${item.experience}
            </div>
            <div class="stat-item">
              📞 ${item.phone}
            </div>
            <div class="stat-item">
              ✉️ ${item.email}
            </div>
          </div>
        </div>
      `;
    } else {
      // Tarjeta de post
      return `
        <div class="feed-card" data-id="${item.id}" data-type="${item.type}">
          <div class="card-header">
            <div class="card-avatar">
              <img src="${item.photo || defaultPhoto}" alt="${item.fullName}" />
            </div>
            <div class="card-user-info">
              <div class="card-username">${item.profession} ${item.fullName}</div>
              <div class="card-meta">
                <span>📅 ${timeAgo}</span>
                <span>📍 ${item.location}</span>
              </div>
            </div>
            <div class="card-type-badge badge-post">
              Post
            </div>
          </div>

          ${item.text ? `
            <div class="card-text">${escapeHtml(item.text)}</div>
          ` : ''}

          ${item.image ? `
            <div class="card-content">
              <div class="card-image">
                <img src="${item.image}" alt="Trabajo realizado" />
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }
  }

  // Escapar HTML para prevenir XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Calcular "hace cuánto tiempo"
  function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)}d`;
    
    // Formato de fecha local
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  // Ir al perfil de un usuario
  function goToProfile(userId) {
    localStorage.setItem('viewingUserId', userId);
    window.location.href = '/profile.html';
  }

  // Mostrar notificación
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 12px;
      background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
      color: white;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Agregar estilos de animación
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Inicializar
  loadFeed();

  // Recargar feed cada 30 segundos
  setInterval(loadFeed, 30000);
})();