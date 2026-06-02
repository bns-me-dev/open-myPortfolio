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

  emailjs.init(EMAILJS_PUBLIC_KEY);

  /* ── Category config ─────────────────────────────────────
     Categorias com comportamento especial:
       site     → "Ver Site" (outline) + "Peça o seu" (primary)
       template → "Abrir Código" (primary) → GitHub
       product  → "Comprar · R$xx" (primary) → Hotmart/Gumroad

     Qualquer outra categoria (app, sistema, api, automacao…)
     cai no fallback automático → "Peça o seu" → #contato.

     Para adicionar um novo tipo de projeto basta criar a
     categoria no portfolio.json — não é preciso alterar o JS.
  ──────────────────────────────────────────────────────── */
  const CATEGORY = {
    /* Categorias com comportamento especial */
    site:     { label: 'Site',      cls: 'badge-site',     },
    template: { label: 'Template',  cls: 'badge-template',  },
    product:  { label: 'Produto',   cls: 'badge-product',   },

    /* Exemplos de categorias livres — label/badge gerados automaticamente */
    app:      { label: 'App',       cls: 'badge-default',   },
    sistema:  { label: 'Sistema',   cls: 'badge-default',   },
    api:      { label: 'API',       cls: 'badge-default',   },
  };

  /**
   * Retorna a config de uma categoria, criando uma config padrão
   * para categorias não mapeadas explicitamente (label capitalizado,
   * badge padrão). Isso garante que qualquer categoria nova no JSON
   * seja exibida corretamente no filtro e no badge sem precisar
   * alterar o código.
   *
   * @param {string} cat — valor de project.category
   * @returns {{ label: string, cls: string }}
   */
  function getCategoryConfig(cat) {
    if (CATEGORY[cat]) return CATEGORY[cat];
    /* Fallback dinâmico para categorias não mapeadas */
    const label = cat.charAt(0).toUpperCase() + cat.slice(1);
    return { label, cls: 'badge-default' };
  }

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
    { threshold: 0.05, rootMargin: '0px 0px 0px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* =========================================================
     Load + render portfolio
  ========================================================= */
  const grid = document.getElementById('projects-grid');
  let allProjects = [];

  async function loadProjects() {
    if (!grid) return;

    grid.innerHTML = `
      <p style="
        color: var(--muted);
        text-align:center;
        grid-column:1/-1;
        padding:40px 0;
      ">
        Carregando projetos...
      </p>
    `;

    try {
      const response = await fetch('./data/portfolio.json?v=' + Date.now(), {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      allProjects = data.projects || [];

      if (!allProjects.length) {
        grid.innerHTML = `
          <p style="
            color: var(--muted);
            text-align:center;
            grid-column:1/-1;
            padding:40px 0;
          ">
            Nenhum projeto encontrado.
          </p>
        `;
        return;
      }

      /* Constrói os filtros dinamicamente antes de renderizar */
      buildFilters(allProjects);

      renderCards(allProjects);

    } catch (error) {
      console.error('Erro ao carregar portfolio.json:', error);

      grid.innerHTML = `
        <p style="
          color: var(--muted);
          text-align:center;
          grid-column:1/-1;
          padding:40px 0;
        ">
          Não foi possível carregar os projetos.
        </p>
      `;
    }
  }

  loadProjects();

  /* ── Carousel state ── */
  const PER_PAGE = 6;
  let currentPage = 0;
  let currentList = [];

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

    slice.forEach((p, i) => {
      const cat = getCategoryConfig(p.category);
      const card = document.createElement('article');
      card.className = `portfolio-card reveal reveal-delay-${(i % 3) + 1}`;
      card.dataset.category = p.category;

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

    // Força visibilidade dos cards já visíveis na tela
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
     buildCardAction — gera os botões de ação do card

     Lógica por categoria:
       site     → "Peça o seu" (primary) + "Ver Site" (outline, se tiver url)
       template → "Abrir Código" (primary) → GitHub
       product  → "Comprar · R$xx" (primary) → Hotmart/Gumroad
       *resto*  → "Peça o seu" (primary) → #contato  ← fallback universal
  ========================================================= */
  function buildCardAction(p) {

    /* ── SITE ────────────────────────────────────────────── */
    if (p.category === 'site') {
      const verSite = p.url
        ? `<a href="${p.url}" target="_blank" rel="noopener"
              class="btn btn-outline card-btn">Ver Site</a>`
        : '';
      return `
        <div class="card-actions-row">
          <a href="#contato" class="btn btn-primary card-btn">Peça o seu</a>
          ${verSite}
        </div>`;
    }

    /* ── TEMPLATE ────────────────────────────────────────── */
    if (p.category === 'template') {
      const href  = p.repoUrl || p.url || '#contato';
      const attrs = (p.repoUrl || p.url) ? `target="_blank" rel="noopener"` : '';
      return `<a href="${href}" ${attrs} class="btn btn-primary card-btn">Abrir Código</a>`;
    }

    /* ── PRODUCT ─────────────────────────────────────────── */
    if (p.category === 'product') {
      const label = p.price ? `Comprar · ${p.price}` : 'Comprar';
      const href  = p.purchaseUrl || '#contato';
      const attrs = p.purchaseUrl ? `target="_blank" rel="noopener"` : '';
      return `<a href="${href}" ${attrs} class="btn btn-primary card-btn">${label}</a>`;
    }

    /* ── FALLBACK UNIVERSAL (app, sistema, api, etc.) ────── */
    return `<a href="#contato" class="btn btn-primary card-btn">Peça o seu</a>`;
  }

  function truncate(str, len) {
    return str.length > len ? str.slice(0, len).trimEnd() + '…' : str;
  }

  /* =========================================================
     Filter tabs — gerados dinamicamente a partir das
     categorias presentes no JSON. Só aparecem categorias
     que de fato existem nos projetos carregados.
  ========================================================= */

  /**
   * Constrói os botões de filtro com base nas categorias
   * existentes no array de projetos. O botão "Todos" é
   * sempre inserido primeiro e fica fixo. Os demais são
   * criados apenas se houver ao menos 1 projeto naquela
   * categoria — sem categorias fantasma.
   *
   * @param {Array} projects — lista completa de projetos
   */
  function buildFilters(projects) {
    const filtersEl = document.querySelector('.portfolio-filters');
    if (!filtersEl) return;

    /* Limpa botões anteriores (exceto se vier a re-render) */
    filtersEl.innerHTML = '';

    /* Botão fixo "Todos" */
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.dataset.filter = 'all';
    allBtn.setAttribute('role', 'tab');
    allBtn.setAttribute('aria-selected', 'true');
    allBtn.textContent = 'Todos';
    filtersEl.appendChild(allBtn);

    /* Coleta categorias únicas na ordem em que aparecem */
    const seen = new Set();
    projects.forEach(p => {
      if (p.category && !seen.has(p.category)) seen.add(p.category);
    });

    seen.forEach(cat => {
      const cfg = getCategoryConfig(cat); /* suporta qualquer categoria */

      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = cat;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.textContent = cfg.label;
      filtersEl.appendChild(btn);
    });

    /* Delega o evento de clique no container */
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
      const filtered = filter === 'all'
        ? allProjects
        : allProjects.filter(p => p.category === filter);

      renderCards(filtered);
    });
  }

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