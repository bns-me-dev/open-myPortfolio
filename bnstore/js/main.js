/* =========================================================
   BNSTORE — main.js (catálogo)

   Carrega categorias.json e produtos.json, monta os círculos
   de categoria, os chips de subcategoria e a busca por nome.
   Estado do filtro fica na URL (?categoria=&sub=&q=), então o
   link é compartilhável e volta ao recarregar a página.
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {

  const storiesEl   = document.getElementById('bn-stories');
  const subfiltersEl = document.getElementById('bn-subfilters');
  const searchInput = document.getElementById('bn-search-input');
  const grid         = document.getElementById('bn-grid');

  let categories = [];
  let allProducts = [];

  /* Estado atual dos filtros, sincronizado com a URL */
  const state = {
    category: null, // slug ou null = "Todos"
    sub: null,
    q: '',
  };

  function readStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    state.category = params.get('categoria') || null;
    state.sub      = params.get('sub') || null;
    state.q        = params.get('q') || '';
  }

  function writeStateToUrl() {
    const params = new URLSearchParams();
    if (state.category) params.set('categoria', state.category);
    if (state.sub)      params.set('sub', state.sub);
    if (state.q)        params.set('q', state.q);
    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? `?${qs}` : '');
    window.history.replaceState({}, '', newUrl);
  }

  async function loadData() {
    if (!grid) return;
    grid.innerHTML = `<p class="bn-state-msg">Carregando produtos…</p>`;

    try {
      const [catRes, prodRes] = await Promise.all([
        fetch('./data/categorias.json?v=' + Date.now(), { cache: 'no-store' }),
        fetch('./data/produtos.json?v=' + Date.now(), { cache: 'no-store' }),
      ]);
      if (!catRes.ok || !prodRes.ok) throw new Error('Falha ao carregar dados');

      const catData  = await catRes.json();
      const prodData = await prodRes.json();

      categories   = catData.categories || [];
      allProducts  = prodData.products || [];

      readStateFromUrl();
      buildStories();
      buildSubfilters();
      if (searchInput) searchInput.value = state.q;
      renderGrid();

    } catch (err) {
      console.error('Erro ao carregar dados da BNStore:', err);
      grid.innerHTML = `<p class="bn-state-msg">Não foi possível carregar os produtos agora. Tente novamente em instantes.</p>`;
    }
  }

  /* =========================================================
     Círculos de categoria ("stories")
  ========================================================= */
  function buildStories() {
    if (!storiesEl) return;
    storiesEl.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = 'bn-store-btn' + (!state.category ? ' active' : '');
    allBtn.innerHTML = `<span class="bn-store-ring">✦</span><span>Todos</span>`;
    allBtn.addEventListener('click', () => {
      state.category = null;
      state.sub = null;
      afterFilterChange();
    });
    storiesEl.appendChild(allBtn);

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'bn-store-btn' + (state.category === cat.slug ? ' active' : '');
      const initial = cat.label.charAt(0).toUpperCase();
      btn.innerHTML = `<span class="bn-store-ring">${initial}</span><span>${cat.label}</span>`;
      btn.addEventListener('click', () => {
        state.category = state.category === cat.slug ? null : cat.slug;
        state.sub = null;
        afterFilterChange();
      });
      storiesEl.appendChild(btn);
    });
  }

  /* =========================================================
     Chips de subcategoria — só aparecem com categoria ativa
  ========================================================= */
  function buildSubfilters() {
    if (!subfiltersEl) return;
    subfiltersEl.innerHTML = '';

    if (!state.category) { subfiltersEl.style.display = 'none'; return; }

    const cat = categories.find(c => c.slug === state.category);
    if (!cat || !cat.subcategories || !cat.subcategories.length) {
      subfiltersEl.style.display = 'none';
      return;
    }

    subfiltersEl.style.display = 'flex';

    const allChip = document.createElement('button');
    allChip.className = 'bn-chip' + (!state.sub ? ' active' : '');
    allChip.textContent = `Todos em ${cat.label}`;
    allChip.addEventListener('click', () => { state.sub = null; afterFilterChange(); });
    subfiltersEl.appendChild(allChip);

    cat.subcategories.forEach(sub => {
      const chip = document.createElement('button');
      chip.className = 'bn-chip' + (state.sub === sub.slug ? ' active' : '');
      chip.textContent = sub.label;
      chip.addEventListener('click', () => {
        state.sub = state.sub === sub.slug ? null : sub.slug;
        afterFilterChange();
      });
      subfiltersEl.appendChild(chip);
    });
  }

  function afterFilterChange() {
    writeStateToUrl();
    buildStories();
    buildSubfilters();
    renderGrid();
  }

  /* =========================================================
     Busca por nome — combina com os filtros ativos
  ========================================================= */
  let searchDebounce;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        state.q = searchInput.value.trim();
        writeStateToUrl();
        renderGrid();
      }, 200);
    });
  }

  /* =========================================================
     Filtra + renderiza o grid
  ========================================================= */
  function getFilteredProducts() {
    return allProducts.filter(p => {
      if (state.category && p.category !== state.category) return false;
      if (state.sub && p.subcategory !== state.sub) return false;
      if (state.q) {
        const haystack = (p.title + ' ' + (p.tags || []).join(' ')).toLowerCase();
        if (!haystack.includes(state.q.toLowerCase())) return false;
      }
      return true;
    });
  }

  const MP_LABEL = { shopee: 'Shopee', amazon: 'Amazon', mercadolivre: 'Mercado Livre' };

  function renderGrid() {
    const products = getFilteredProducts();
    grid.innerHTML = '';

    if (!products.length) {
      grid.innerHTML = `<p class="bn-state-msg">Nenhum produto encontrado com esses filtros.</p>`;
      return;
    }

    const revealObserver = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
      }),
      { threshold: 0.05 }
    );

    products.forEach(p => {
      const card = document.createElement('article');
      card.className = 'bn-card reveal';

      card.innerHTML = `
        <div class="bn-card-thumb">
          <span class="bn-mp-badge ${p.marketplace}">${MP_LABEL[p.marketplace] || p.marketplace}</span>
          <img src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.src='images/product-placeholder.svg'">
        </div>
        <div class="bn-card-body">
          <span class="bn-card-cat">${getCategoryLabel(p.category)}${p.subcategory ? ' · ' + getSubcategoryLabel(p.category, p.subcategory) : ''}</span>
          <h3>${p.title}</h3>
          <div class="bn-price-row">
            <span class="now">${p.price || ''}</span>
            ${p.originalPrice ? `<span class="old">${p.originalPrice}</span>` : ''}
          </div>
          <a href="produto.html?slug=${encodeURIComponent(p.slug)}" class="bn-card-cta">
            Ver produto
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>`;

      grid.appendChild(card);
      revealObserver.observe(card);
    });

    setTimeout(() => {
      document.querySelectorAll('.bn-card.reveal:not(.visible)').forEach(c => {
        if (c.getBoundingClientRect().top < window.innerHeight) c.classList.add('visible');
      });
    }, 50);
  }

  function getCategoryLabel(slug) {
    const cat = categories.find(c => c.slug === slug);
    return cat ? cat.label : slug;
  }
  function getSubcategoryLabel(catSlug, subSlug) {
    const cat = categories.find(c => c.slug === catSlug);
    const sub = cat && cat.subcategories.find(s => s.slug === subSlug);
    return sub ? sub.label : subSlug;
  }

  loadData();
});
