/* =========================================================
   BNSTORE — produto.js (página individual do produto)
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {

  const content = document.getElementById('bn-content');
  const breadcrumbEl = document.getElementById('bn-breadcrumb');
  const notFoundEl = content.querySelector('.bn-not-found');

  const MP_LABEL = { shopee: 'Shopee', amazon: 'Amazon', mercadolivre: 'Mercado Livre' };
  const MP_CTA   = { shopee: 'Ver na Shopee', amazon: 'Ver na Amazon', mercadolivre: 'Ver no Mercado Livre' };

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  const loadingEl = document.createElement('p');
  loadingEl.className = 'bn-state-msg';
  loadingEl.style.padding = '100px 0';
  loadingEl.style.textAlign = 'center';
  loadingEl.textContent = 'Carregando produto…';
  content.prepend(loadingEl);

  if (!slug) { showNotFound(); return; }

  let categories = [];
  let allProducts = [];

  try {
    const [catRes, prodRes] = await Promise.all([
      fetch('./data/categorias.json?v=' + Date.now(), { cache: 'no-store' }),
      fetch('./data/produtos.json?v=' + Date.now(), { cache: 'no-store' }),
    ]);
    if (!catRes.ok || !prodRes.ok) throw new Error('Falha ao carregar dados');

    categories  = (await catRes.json()).categories || [];
    allProducts = (await prodRes.json()).products || [];

    const product = allProducts.find(p => p.slug === slug);
    if (!product) { showNotFound(); return; }

    renderProduct(product);

  } catch (err) {
    console.error('Erro ao carregar produto:', err);
    content.innerHTML = `
      <div class="bn-not-found">
        <h1>Não foi possível carregar esse produto</h1>
        <p>Tente atualizar a página em instantes.</p>
        <a href="index.html" class="bn-back">Voltar ao catálogo</a>
      </div>`;
  }

  function showNotFound() {
    loadingEl.remove();
    notFoundEl.style.display = 'block';
  }

  function getCategory(slug) { return categories.find(c => c.slug === slug); }
  function getSubcategory(catSlug, subSlug) {
    const cat = getCategory(catSlug);
    return cat && cat.subcategories.find(s => s.slug === subSlug);
  }

  function renderProduct(p) {
    loadingEl.remove();

    const cat = getCategory(p.category);
    const sub = getSubcategory(p.category, p.subcategory);

    /* SEO */
    document.title = `${p.title} | BNStore`;
    setMeta('#bn-meta-desc', p.review?.summary || p.title);
    setMeta('#bn-og-title', p.title);
    setMeta('#bn-og-desc', p.review?.summary || '');

    /* Breadcrumb */
    if (breadcrumbEl) {
      breadcrumbEl.innerHTML = `
        <a href="index.html">Catálogo</a>
        ${cat ? `<span class="sep">/</span><a href="index.html?categoria=${cat.slug}">${cat.label}</a>` : ''}
        ${sub ? `<span class="sep">/</span><a href="index.html?categoria=${cat.slug}&sub=${sub.slug}">${sub.label}</a>` : ''}
        <span class="sep">/</span><span class="current">${escapeHtml(p.title)}</span>
      `;
    }

    const bulletsBlock = (p.review?.bullets && p.review.bullets.length) ? `
      <ul>
        ${p.review.bullets.map(b => `
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            <span>${escapeHtml(b)}</span>
          </li>`).join('')}
      </ul>` : '';

    const alsoOnBlock = p.alsoOn ? `
      <div class="bn-also-on">
        <span>Também disponível na ${MP_LABEL[p.alsoOn.marketplace] || p.alsoOn.marketplace} por ${escapeHtml(p.alsoOn.price || '')}</span>
        <a href="${p.alsoOn.affiliateUrl}" target="_blank" rel="noopener sponsored">Comparar oferta →</a>
      </div>` : '';

    const amazonDisclosure = p.marketplace === 'amazon' ? `
      <p class="bn-amazon-disclosure">Como Associado Amazon, a BNStore ganha com compras qualificadas feitas através deste link, sem custo adicional para você.</p>
    ` : '';

    content.insertAdjacentHTML('beforeend', `
      <section class="bn-product-hero reveal visible">
        <div class="container bn-product-grid">
          <div class="bn-product-media">
            <div class="frame">
              <img src="${p.image}" alt="${escapeHtml(p.title)}" onerror="this.src='images/product-placeholder.svg'">
            </div>
          </div>
          <div class="bn-product-copy">
            <span class="bn-mp-badge ${p.marketplace}">${MP_LABEL[p.marketplace] || p.marketplace}</span>
            <h1>${escapeHtml(p.title)}</h1>
            <div class="bn-price-block">
              <span class="now">${escapeHtml(p.price || '')}</span>
              ${p.originalPrice ? `<span class="old">${escapeHtml(p.originalPrice)}</span>` : ''}
            </div>
            <p class="bn-price-note">Valor pode ter mudado desde a última atualização — confirme no site antes de finalizar a compra.</p>

            <button type="button" class="bn-cta-primary ${p.marketplace}" id="bn-cta-btn">
              ${MP_CTA[p.marketplace] || 'Ver produto'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </button>

            ${alsoOnBlock}

            <div class="bn-review">
              <h2>Por que eu recomendo</h2>
              <p class="summary">${escapeHtml(p.review?.summary || '')}</p>
              ${bulletsBlock}
              ${amazonDisclosure}
            </div>
          </div>
        </div>
      </section>
    `);

    document.getElementById('bn-cta-btn')?.addEventListener('click', () => {
      window.open(p.affiliateUrl, '_blank', 'noopener');
    });

    renderRelated(p);
  }

  /* =========================================================
     Produtos relacionados — mesma subcategoria, exclui o atual
  ========================================================= */
  function renderRelated(current) {
    const related = allProducts
      .filter(p => p.slug !== current.slug && p.category === current.category && p.subcategory === current.subcategory)
      .slice(0, 4);

    if (!related.length) return;

    const MP = MP_LABEL;
    const html = `
      <section class="bn-related">
        <div class="container">
          <div class="bn-related-head"><h2>Relacionados</h2></div>
          <div class="bn-grid">
            ${related.map(p => `
              <article class="bn-card">
                <div class="bn-card-thumb">
                  <span class="bn-mp-badge ${p.marketplace}">${MP[p.marketplace] || p.marketplace}</span>
                  <img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.src='images/product-placeholder.svg'">
                </div>
                <div class="bn-card-body">
                  <h3>${escapeHtml(p.title)}</h3>
                  <div class="bn-price-row"><span class="now">${escapeHtml(p.price || '')}</span></div>
                  <a href="produto.html?slug=${encodeURIComponent(p.slug)}" class="bn-card-cta">Ver produto</a>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      </section>`;

    content.insertAdjacentHTML('beforeend', html);
  }

  function setMeta(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.setAttribute('content', value);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
});
