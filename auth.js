// public/auth.js - Sistema de autenticación actualizado
(function () {
  const API_URL = window.location.origin;

  // Elementos DOM
  const tabBtns = document.querySelectorAll('.tab-btn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const photoInput = document.getElementById('photoInput');
  const photoPreview = document.getElementById('photoPreview');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');

  let uploadedPhoto = null;

  // Cambiar entre tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
      });
      
      if (tab === 'login') {
        loginForm.classList.add('active');
      } else {
        registerForm.classList.add('active');
      }
      
      hideMessages();
    });
  });

  // Preview de foto
  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('La imagen es muy grande. Máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedPhoto = event.target.result;
      photoPreview.innerHTML = `<img src="${uploadedPhoto}" alt="Preview" />`;
    };
    reader.readAsDataURL(file);
  });

  // Manejar inicio de sesión
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      showError('Por favor completa todos los campos');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('¡Inicio de sesión exitoso!');
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        setTimeout(() => {
          window.location.href = '/feed.html'; // Redirigir al feed
        }, 1000);
      } else {
        showError(data.message || 'Credenciales incorrectas');
      }
    } catch (error) {
      console.error('Error de login:', error);
      showError('Error al conectar con el servidor');
    }
  });

  // Manejar registro
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const username = document.getElementById('regUsername').value.trim();
    const fullName = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const location = document.getElementById('regLocation').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const profession = document.getElementById('regProfession').value.trim();
    const experience = document.getElementById('regExperience').value;

    if (!username || !fullName || !email || !password || !location || !phone || !profession || !experience) {
      showError('Por favor completa todos los campos');
      return;
    }

    if (password.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!uploadedPhoto) {
      showError('Por favor sube una foto de perfil');
      return;
    }

    const userData = {
      username,
      fullName,
      email,
      password,
      location,
      phone,
      profession,
      experience,
      photo: uploadedPhoto
    };

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('¡Cuenta creada exitosamente! Redirigiendo...');
        registerForm.reset();
        photoPreview.innerHTML = '<span class="photo-preview-placeholder">👤</span>';
        uploadedPhoto = null;

        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));

        setTimeout(() => {
          window.location.href = '/feed.html'; // Redirigir al feed
        }, 2000);
      } else {
        showError(data.message || 'Error al crear la cuenta');
      }
    } catch (error) {
      console.error('Error de registro:', error);
      showError('Error al conectar con el servidor');
    }
  });

  // Funciones auxiliares
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
  }

  function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
  }

  function hideMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
  }
})();