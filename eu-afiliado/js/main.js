/* =========================================================
   EU AFILIADO — main.js (página de catálogo)
   Mesmo padrão de dados do portfólio: categorias e filtros
   são gerados dinamicamente a partir do JSON, então adicionar
   um produto novo nunca exige mexer neste arquivo.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  const grid    = document.getElementById('ea-grid');
  const filters = document.getElementById('ea-filters');

  /* Labels amigáveis por categoria — categorias fora deste mapa
     recebem label capitalizado automaticamente (fallback), então
     você pode criar categorias novas direto no JSON. */
  const CATEGORY_LABELS = {
    curso:    'Cursos',
    ebook:    'Ebooks',
    software: 'Software',
    mentoria: 'Mentorias',
    template: 'Templates',
  };

  function getCategoryLabel(cat) {
    if (CATEGORY_LABELS[cat]) return CATEGORY_LABELS[cat];
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }

  /* Selo curto exibido no carimbo do card (assinatura visual) */
  function getStampText(cat) {
    const map = {
      curso: 'Eu\nrecomendo',
      ebook: 'Eu\nrecomendo',
      software: 'Eu\nrecomendo',
      mentoria: 'Eu\nrecomendo',
      template: 'Eu\nrecomendo',
    };
    return map[cat] || 'Eu\nrecomendo';
  }

  let allProducts = [];

  async function loadProducts() {
    if (!grid) return;

    try {
      const res = await fetch('./data/produtos.json?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      allProducts = data.products || [];

      if (!allProducts.length) {
        grid.innerHTML = `<p class="ea-state-msg">Nenhum produto cadastrado ainda.</p>`;
        return;
      }

      buildFilters(allProducts);
      renderGrid(allProducts);

    } catch (err) {
      console.error('Erro ao carregar produtos.json:', err);
      grid.innerHTML = `<p class="ea-state-msg">Não foi possível carregar os produtos agora. Tente novamente em instantes.</p>`;
    }
  }

  function buildFilters(products) {
    if (!filters) return;
    filters.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = 'ea-filter-btn active';
    allBtn.dataset.filter = 'all';
    allBtn.setAttribute('role', 'tab');
    allBtn.setAttribute('aria-selected', 'true');
    allBtn.textContent = 'Todos';
    filters.appendChild(allBtn);

    const seen = new Set();
    products.forEach(p => { if (p.category && !seen.has(p.category)) seen.add(p.category); });

    seen.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'ea-filter-btn';
      btn.dataset.filter = cat;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.textContent = getCategoryLabel(cat);
      filters.appendChild(btn);
    });

    filters.addEventListener('click', e => {
      const btn = e.target.closest('.ea-filter-btn');
      if (!btn) return;

      filters.querySelectorAll('.ea-filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const f = btn.dataset.filter;
      const filtered = f === 'all' ? allProducts : allProducts.filter(p => p.category === f);
      renderGrid(filtered);
    });
  }

  function renderGrid(products) {
    grid.innerHTML = '';

    if (!products.length) {
      grid.innerHTML = `<p class="ea-state-msg">Nenhum produto nessa categoria por enquanto.</p>`;
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
      card.className = 'ea-card reveal';

      card.innerHTML = `
        <div class="ea-card-thumb">
          <img src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.src='images/product-placeholder.svg'">
          <span class="ea-stamp">${getStampText(p.category).replace('\n', '<br>')}</span>
        </div>
        <div class="ea-card-body">
          <span class="ea-card-cat">${getCategoryLabel(p.category)}</span>
          <h3>${p.title}</h3>
          <p>${p.shortDescription || ''}</p>
          <div class="ea-card-tags">
            ${(p.tags || []).map(t => `<span class="ea-card-tag">${t}</span>`).join('')}
          </div>
          <a href="produto.html?slug=${encodeURIComponent(p.slug)}" class="ea-card-cta">
            Ver produto
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>`;

      grid.appendChild(card);
      revealObserver.observe(card);
    });

    setTimeout(() => {
      document.querySelectorAll('.ea-card.reveal:not(.visible)').forEach(c => {
        if (c.getBoundingClientRect().top < window.innerHeight) c.classList.add('visible');
      });
    }, 50);
  }

  loadProducts();
});
