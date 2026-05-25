/* =========================================================
   BNS.me — main.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── Config ────────────────────────────────────────────── */
  const WHATSAPP_NUMBER = '5571981686867';
  const WHATSAPP_MSG    = encodeURIComponent('Olá, Bruno! Vi seu portfólio e gostaria de conversar sobre um projeto.');

  /* ── EmailJS ────────────────────────────────────────────
     Dados da conta em emailjs.com
  ──────────────────────────────────────────────────────── */
  const EMAILJS_PUBLIC_KEY  = 'QfX9F0RV4gBqENgR4';
  const EMAILJS_SERVICE_ID  = 'service_01rks9u';
  const EMAILJS_TEMPLATE_ID = 'template_gohmy4x';

  /* ── Category config ─────────────────────────────────── */
  const CATEGORY = {
    case:    { label:'Case',       cls:'badge-case',    hint:'Ver projeto ao vivo' },
    open:    { label:'Open Source', cls:'badge-open',   hint:'Download gratuito'   },
    premium: { label:'Premium',    cls:'badge-premium', hint:'Adquirir acesso'     },
  };

  /* =========================================================
     WhatsApp
  ========================================================= */
  const waBtn = document.getElementById('whatsapp-button');
  if (waBtn) waBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`;

  /* =========================================================
     Mobile nav
  ========================================================= */
  const toggle = document.getElementById('nav-toggle');
  const nav    = document.getElementById('main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* =========================================================
     Active nav on scroll
  ========================================================= */
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 120;
    sections.forEach(section => {
      const id   = section.getAttribute('id');
      const link = document.querySelector(`nav a[href="#${id}"]`);
      if (link) {
        link.classList.toggle(
          'active',
          scrollY >= section.offsetTop && scrollY < section.offsetTop + section.offsetHeight
        );
      }
    });
  }, { passive: true });

  /* =========================================================
     Scroll reveal
  ========================================================= */
  const revealObserver = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
    }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* =========================================================
     Load + render portfolio
  ========================================================= */
  const grid = document.getElementById('projects-grid');
  let allProjects = [];

  try {
    const res = await fetch('data/portfolio.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allProjects = data.projects || [];
    renderCards(allProjects);
  } catch (err) {
    console.error('Erro ao carregar projetos:', err);
    grid.innerHTML = `<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px 0">
      Não foi possível carregar os projetos. Tente novamente mais tarde.</p>`;
  }

  function renderCards(projects) {
    grid.innerHTML = '';
    projects.forEach((p, i) => {
      const cat     = CATEGORY[p.category] || CATEGORY.case;
      const hint    = getHintLabel(p);
      const card    = document.createElement('article');
      card.className = `portfolio-card reveal reveal-delay-${(i % 3) + 1}`;
      card.dataset.category = p.category;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Ver detalhes: ${p.title}`);

      card.innerHTML = `
        <div class="card-thumb">
          <img src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.src='images/project-placeholder.svg'">
        </div>
        <div class="card-content">
          <div class="card-header">
            <h3>${p.title}</h3>
            <span class="category-badge ${cat.cls}">${cat.label}</span>
          </div>
          <p>${truncate(p.description, 100)}</p>
          <div class="card-tags">
            ${(p.tags || []).map(t => `<span class="card-tag">${t}</span>`).join('')}
          </div>
          <div class="card-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            ${hint}
          </div>
        </div>`;

      card.addEventListener('click',   () => openModal(p));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(p); });
      grid.appendChild(card);
      revealObserver.observe(card);
    });
  }

  function getHintLabel(p) {
    if (p.category === 'case')    return 'Clique para ver detalhes';
    if (p.category === 'open')    return 'Download gratuito disponível';
    if (p.category === 'premium') return `Disponível por ${p.price || ''}`;
    return 'Ver detalhes';
  }

  function truncate(str, len) {
    return str.length > len ? str.slice(0, len).trimEnd() + '…' : str;
  }

  /* =========================================================
     Filter tabs
  ========================================================= */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const filter = btn.dataset.filter;
      const filtered = filter === 'all'
        ? allProjects
        : allProjects.filter(p => p.category === filter);

      renderCards(filtered);
    });
  });

  /* =========================================================
     Modal
  ========================================================= */
  const modal      = document.getElementById('project-modal');
  const modalClose = document.getElementById('modal-close');

  function openModal(p) {
    const cat = CATEGORY[p.category] || CATEGORY.case;

    document.getElementById('modal-image').src = p.image;
    document.getElementById('modal-image').alt = p.title;
    document.getElementById('modal-badge').textContent  = cat.label;
    document.getElementById('modal-badge').className    = `category-badge ${cat.cls}`;
    document.getElementById('modal-title').textContent  = p.title;
    document.getElementById('modal-desc').textContent   = p.description;

    // Tags
    const tagsEl = document.getElementById('modal-tags');
    tagsEl.innerHTML = (p.tags || []).map(t => `<span class="card-tag">${t}</span>`).join('');

    // Actions
    const actionsEl = document.getElementById('modal-actions');
    actionsEl.innerHTML = buildActions(p);

    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    modalClose.focus();
  }

  function buildActions(p) {
    const parts = [];
    if (p.category === 'case' && p.url) {
      parts.push(`<a href="${p.url}" target="_blank" rel="noopener" class="btn btn-primary">Ver Projeto ao Vivo</a>`);
    }
    if (p.category === 'open' && p.downloadUrl) {
      parts.push(`<a href="${p.downloadUrl}" download class="btn btn-primary">Download Gratuito</a>`);
    }
    if (p.category === 'premium') {
      if (p.purchaseUrl) {
        const label = p.price ? `Adquirir — ${p.price}` : 'Adquirir Acesso';
        parts.push(`<a href="${p.purchaseUrl}" target="_blank" rel="noopener" class="btn btn-primary">${label}</a>`);
      }
    }
    parts.push(`<a href="#contato" class="btn btn-ghost" id="modal-contact-link">Fale Comigo</a>`);
    return parts.join('');
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal(); });

  // Close modal and scroll to contact when clicking "Fale Comigo" inside modal
  modal.addEventListener('click', e => {
    if (e.target.id === 'modal-contact-link') {
      closeModal();
    }
  });

  /* =========================================================
     Contact form — EmailJS
  ========================================================= */
  const form     = document.getElementById('fs-contact-form');
  const feedback = document.getElementById('form-feedback');

  if (form) {
    const fields = form.querySelectorAll('input, textarea');

    fields.forEach(field => {
      field.addEventListener('input', () => {
        validateField(field);
      });

      field.addEventListener('blur', () => {
        validateField(field);
      });
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();

      let isValid = true;

      fields.forEach(field => {
        if (!validateField(field)) {
          isValid = false;
        }
      });

      if (!isValid) {
        showFeedback(
          'error',
          'Preencha os campos obrigatórios antes de enviar.'
        );
        return;
      }

      hideFeedback();

      const btn = form.querySelector('[type="submit"]');
      const originalText = btn.textContent;

      btn.disabled = true;
      btn.textContent = 'Enviando…';

      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            from_name: form.name.value.trim(),
            from_email: form.email.value.trim(),
            from_phone: form.phone.value.trim(),
            message: form.message.value.trim(),
          }
        );

        showFeedback(
          'success',
          '✓ Mensagem enviada com sucesso!'
        );

        form.reset();

        fields.forEach(field => {
          field.classList.remove('field-success');
        });

      } catch (error) {
        console.error(error);

        showFeedback(
          'error',
          'Erro ao enviar. Tente novamente ou fale comigo pelo WhatsApp.'
        );
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
  });

    function validateField(field) {
      const wrapper = field.closest('.form-group');
      const error = wrapper.querySelector('.error-message');

      let valid = field.checkValidity();

      if (!valid) {
        field.classList.add('field-error');
        field.classList.remove('field-success');

        if (error) error.classList.add('show');

        return false;
      }

      field.classList.remove('field-error');
      field.classList.add('field-success');

      if (error) error.classList.remove('show');

      return true;
    }
  }

  function showFeedback(type, msg) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.className = `form-feedback ${type}`;
    feedback.style.display = 'flex';
    feedback.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }
  function hideFeedback() {
    if (!feedback) return;
    feedback.className = 'form-feedback';
    feedback.style.display = 'none';
  }

});
