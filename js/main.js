/* =========================================================
   BNS.me — main.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── Config ────────────────────────────────────────────── */
  const WHATSAPP_NUMBER = '5571981686867';
  const WHATSAPP_MSG    = encodeURIComponent('Olá, Bruno! Vi seu site e gostaria de conversar sobre um projeto.');

  /* ── EmailJS ──────────────────────────────────────────── */
  const EMAILJS_PUBLIC_KEY  = 'QfX9F0RV4gBqENgR4';
  const EMAILJS_SERVICE_ID  = 'service_01rks9u';
  const EMAILJS_TEMPLATE_ID = 'template_gohmy4x';
  emailjs.init(EMAILJS_PUBLIC_KEY);

  /* ── Categorias do portfólio ──────────────────────────────
     Categorias mapeadas explicitamente. Qualquer categoria
     nova no portfolio.json que não esteja aqui cai no
     fallback automático (badge-default) — não é preciso
     alterar o JS para adicionar uma categoria nova.
  ──────────────────────────────────────────────────────── */
  const CATEGORY = {
    automacao: { label: 'Automação & IoT',        cls: 'badge-automacao' },
    hardware:  { label: 'Hardware',               cls: 'badge-hardware'  },
    software:  { label: 'Software & Web',         cls: 'badge-software'  },
    mobile:    { label: 'Mobile',                 cls: 'badge-mobile'    },
    pd:        { label: 'P&D / Pessoal',          cls: 'badge-pd'        },
  };

  function getCategoryConfig(cat) {
    if (CATEGORY[cat]) return CATEGORY[cat];
    const label = cat.charAt(0).toUpperCase() + cat.slice(1);
    return { label, cls: 'badge-default' };
  }

  /* =========================================================
     WhatsApp
  ========================================================= */
  const waBtn = document.getElementById('whatsapp-button');
  if (waBtn) waBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`;

  /* =========================================================
     Rail (sidebar) — abrir/fechar no mobile
  ========================================================= */
  const railToggle  = document.getElementById('rail-toggle');
  const rail        = document.getElementById('rail');
  const railOverlay = document.getElementById('rail-overlay');

  function openRail() {
    rail.classList.add('open');
    railOverlay.classList.add('open');
    railToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeRail() {
    rail.classList.remove('open');
    railOverlay.classList.remove('open');
    railToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (railToggle && rail && railOverlay) {
    railToggle.addEventListener('click', () => {
      rail.classList.contains('open') ? closeRail() : openRail();
    });
    railOverlay.addEventListener('click', closeRail);
    rail.querySelectorAll('a').forEach(link => link.addEventListener('click', closeRail));
  }

  /* =========================================================
     Navegação ativa (pilot-lights) via IntersectionObserver
  ========================================================= */
  const railButtons = document.querySelectorAll('.rail-btn');
  const trackedSections = document.querySelectorAll('#sobre, #projetos, #contato');

  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute('id');
      railButtons.forEach(btn => {
        const isActive = btn.dataset.target === id;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

  trackedSections.forEach(section => navObserver.observe(section));

  /* =========================================================
     Scroll reveal
  ========================================================= */
  const revealObserver = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
    }),
    { threshold: 0.08 }
  );
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* =========================================================
     Linha do tempo — carrega data/timeline.json
  ========================================================= */
  async function loadTimeline() {
    const track = document.getElementById('timeline-track');
    if (!track) return;

    try {
      const response = await fetch('./data/timeline.json?v=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const items = (data.timeline || []).slice().sort((a, b) => b.year - a.year );

      if (!items.length) {
        track.innerHTML = `<p style="color:var(--text-dim);">Nenhum item na linha do tempo ainda.</p>`;
        return;
      }

      track.innerHTML = items.map(item => `
        <div class="timeline-item">
          <span class="timeline-year">${item.year}</span>
          <div class="timeline-card">
            <h4>${item.title}</h4>
            <p class="timeline-desc">${item.description || ''}</p>
            ${item.result ? `<span class="timeline-result">${item.result}</span>` : ''}
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Erro ao carregar timeline.json:', error);
      track.innerHTML = `<p style="color:var(--text-dim);">Não foi possível carregar a linha do tempo.</p>`;
    }
  }

  loadTimeline();

  /* =========================================================
     Portfólio — carrega data/portfolio.json
  ========================================================= */
  const grid = document.getElementById('projects-grid');
  let allProjects = [];
  const PER_PAGE = 6;
  let currentPage = 0;
  let currentList = [];

  async function loadProjects() {
    if (!grid) return;
    grid.innerHTML = `<p style="color:var(--text-dim); text-align:center; grid-column:1/-1; padding:40px 0;">Carregando projetos...</p>`;

    try {
      const response = await fetch('./data/portfolio.json?v=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      allProjects = data.projects || [];

      if (!allProjects.length) {
        grid.innerHTML = `<p style="color:var(--text-dim); text-align:center; grid-column:1/-1; padding:40px 0;">Nenhum projeto encontrado.</p>`;
        return;
      }

      buildFilters(allProjects);
      renderCards(allProjects);

    } catch (error) {
      console.error('Erro ao carregar portfolio.json:', error);
      grid.innerHTML = `<p style="color:var(--text-dim); text-align:center; grid-column:1/-1; padding:40px 0;">Não foi possível carregar os projetos.</p>`;
    }
  }

  loadProjects();

  function renderCards(projects) {
    currentList = projects;
    currentPage = 0;
    renderPage();
  }

  function renderPage() {
    grid.innerHTML = '';
    const start      = currentPage * PER_PAGE;
    const slice      = currentList.slice(start, start + PER_PAGE);
    const totalPages = Math.ceil(currentList.length / PER_PAGE);

    slice.forEach(p => {
      const cat = getCategoryConfig(p.category);
      const card = document.createElement('article');
      card.className = 'portfolio-card reveal';
      card.dataset.category = p.category;
      card.dataset.projectId = p.id;

      card.innerHTML = `
        <div class="card-thumb">
          <img src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.src='images/project-placeholder.svg'">
        </div>
        <div class="card-content">
          <div class="card-header">
            <h3>${p.title}</h3>
            <span class="category-badge ${cat.cls}">${cat.label}</span>
          </div>
          <p>${p.description}</p>
          <div class="card-tags">
            ${(p.tags || []).map(t => `<span class="card-tag">${t}</span>`).join('')}
          </div>
          <div class="card-action">
            ${buildCardAction(p)}
          </div>
        </div>`;

      grid.appendChild(card);
      revealObserver.observe(card);
    });

    setTimeout(() => {
      document.querySelectorAll('.portfolio-card.reveal:not(.visible)').forEach(c => {
        if (c.getBoundingClientRect().top < window.innerHeight) c.classList.add('visible');
      });
    }, 50);

    updateCarouselNav(totalPages);
  }

  function updateCarouselNav(totalPages) {
    const prevBtn  = document.getElementById('carousel-prev');
    const nextBtn  = document.getElementById('carousel-next');
    const dotsWrap = document.getElementById('carousel-dots');
    const countEl  = document.getElementById('carousel-count');
    const navEl    = document.querySelector('.carousel-nav');

    if (navEl) navEl.style.display = totalPages > 1 ? 'flex' : 'none';
    if (!prevBtn || !nextBtn || !dotsWrap || !countEl) return;

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages - 1;
    countEl.textContent = totalPages > 1 ? `${currentPage + 1} / ${totalPages}` : '';

    dotsWrap.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === currentPage ? ' active' : '');
      dot.setAttribute('aria-label', `Página ${i + 1}`);
      dot.addEventListener('click', () => goToPage(i));
      dotsWrap.appendChild(dot);
    }
  }

  function goToPage(page) {
    currentPage = page;
    renderPage();
    document.getElementById('projetos').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.getElementById('carousel-prev')?.addEventListener('click', () => {
    if (currentPage > 0) goToPage(currentPage - 1);
  });
  document.getElementById('carousel-next')?.addEventListener('click', () => {
    if (currentPage < Math.ceil(currentList.length / PER_PAGE) - 1) goToPage(currentPage + 1);
  });

  /* =========================================================
     Ações do card por categoria
  ========================================================= */
  function buildCardAction(p) {
    if (p.url) {
      return `<a href="${p.url}" target="_blank" rel="noopener" class="btn btn-outline card-btn">Ver Projeto</a>`;
    }
    if (p.repoUrl) {
      return `<a href="${p.repoUrl}" target="_blank" rel="noopener" class="btn btn-primary card-btn">Ver Código</a>`;
    }
    return `<a href="#contato" class="btn btn-primary card-btn">Peça o seu</a>`;
  }

  /* =========================================================
     Filtros
  ========================================================= */
  function buildFilters(projects) {
    const filtersEl = document.querySelector('.portfolio-filters');
    if (!filtersEl) return;

    filtersEl.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.dataset.filter = 'all';
    allBtn.setAttribute('role', 'tab');
    allBtn.setAttribute('aria-selected', 'true');
    allBtn.textContent = 'Todos';
    filtersEl.appendChild(allBtn);

    const seen = new Set();
    projects.forEach(p => { if (p.category && !seen.has(p.category)) seen.add(p.category); });

    seen.forEach(cat => {
      const cfg = getCategoryConfig(cat);
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = cat;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.textContent = cfg.label;
      filtersEl.appendChild(btn);
    });

    filtersEl.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      filtersEl.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const filter = btn.dataset.filter;
      const filtered = filter === 'all' ? allProjects : allProjects.filter(p => p.category === filter);
      renderCards(filtered);
    });
  }

  /* =========================================================
     Formulário de contato — EmailJS
  ========================================================= */
  const form     = document.getElementById('fs-contact-form');
  const feedback = document.getElementById('form-feedback');

  if (form) {
    const fields = form.querySelectorAll('input, textarea');

    fields.forEach(field => {
      field.addEventListener('input', () => validateField(field));
      field.addEventListener('blur',  () => validateField(field));
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();

      let isValid = true;
      fields.forEach(field => { if (!validateField(field)) isValid = false; });

      if (!isValid) {
        showFeedback('error', 'Preencha os campos obrigatórios antes de enviar.');
        return;
      }

      hideFeedback();

      const btn = form.querySelector('[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Enviando…';

      try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          from_name: form.name.value.trim(),
          from_email: form.email.value.trim(),
          from_phone: form.phone.value.trim(),
          message: form.message.value.trim(),
        });

        showFeedback('success', '✓ Mensagem enviada com sucesso!');
        form.reset();
        fields.forEach(field => field.classList.remove('field-success'));

      } catch (error) {
        console.error(error);
        showFeedback('error', 'Erro ao enviar. Tente novamente ou fale comigo pelo WhatsApp.');
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });

    function validateField(field) {
      const wrapper = field.closest('.form-group');
      const error = wrapper.querySelector('.error-message');
      const valid = field.checkValidity();

      field.classList.toggle('field-error', !valid);
      field.classList.toggle('field-success', valid);
      if (error) error.classList.toggle('show', !valid);

      return valid;
    }
  }

  function showFeedback(type, msg) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.className = `form-feedback ${type}`;
    feedback.style.display = 'flex';
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function hideFeedback() {
    if (!feedback) return;
    feedback.className = 'form-feedback';
    feedback.style.display = 'none';
  }

});
