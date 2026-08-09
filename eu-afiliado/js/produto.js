/* =========================================================
   EU AFILIADO — produto.js (página de vendas dinâmica)

   1 template serve todos os produtos: lê "slug" da URL
   (?slug=nome-do-produto), busca o produto correspondente em
   data/produtos.json e monta a página inteira em runtime.

   Isso é o que permite escalar de 5 pra 50 produtos sem criar
   um HTML novo pra cada um — só edita o JSON.
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {

  const content = document.getElementById('ea-content');
  const notFoundEl = content.querySelector('.ea-not-found');

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  /* Estado de carregamento simples enquanto busca o JSON */
  const loadingEl = document.createElement('p');
  loadingEl.className = 'ea-state-msg';
  loadingEl.style.padding = '120px 0';
  loadingEl.style.textAlign = 'center';
  loadingEl.textContent = 'Carregando produto…';
  content.prepend(loadingEl);

  if (!slug) {
    showNotFound();
    return;
  }

  try {
    const res = await fetch('./data/produtos.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const product = (data.products || []).find(p => p.slug === slug);

    if (!product) {
      showNotFound();
      return;
    }

    renderProduct(product);

  } catch (err) {
    console.error('Erro ao carregar dados do produto:', err);
    content.innerHTML = `
      <div class="ea-not-found">
        <h1>Não foi possível carregar esse produto</h1>
        <p>Tente atualizar a página em instantes.</p>
        <a href="index.html" class="ea-cta-primary">Voltar ao catálogo</a>
      </div>`;
  }

  function showNotFound() {
    loadingEl.remove();
    notFoundEl.style.display = 'block';
  }

  /* =========================================================
     Renderiza a página de vendas a partir do objeto do produto
  ========================================================= */
  function renderProduct(p) {
    loadingEl.remove();

    const sp = p.salesPage || {};

    /* SEO / compartilhamento — atualiza title e meta tags pro produto específico */
    document.title = `${sp.headline || p.title} | Eu Afiliado`;
    setMeta('#ea-meta-desc', sp.subheadline || p.shortDescription || '');
    setMeta('#ea-og-title', sp.headline || p.title);
    setMeta('#ea-og-desc', sp.subheadline || p.shortDescription || '');

    const priceBlock = sp.price ? `
      <div class="ea-price-tag">
        <span class="now">${escapeHtml(sp.price)}</span>
        ${sp.originalPrice ? `<span class="old">${escapeHtml(sp.originalPrice)}</span>` : ''}
      </div>` : '';

    const badgeBlock = sp.badge ? `<span class="ea-badge-pill">${escapeHtml(sp.badge)}</span>` : '';

    const benefitsBlock = (sp.benefits && sp.benefits.length) ? `
      <ul class="ea-benefits">
        ${sp.benefits.map(b => `
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            <span>${escapeHtml(b)}</span>
          </li>`).join('')}
      </ul>` : '';

    content.insertAdjacentHTML('beforeend', `
      <section class="ea-product-hero reveal visible">
        <div class="container ea-product-grid">
          <div class="ea-product-copy">
            ${badgeBlock}
            <span class="ea-eyebrow">${escapeHtml(sp.eyebrow || 'Recomendação pessoal')}</span>
            <h1>${escapeHtml(sp.headline || p.title)}</h1>
            <p style="color:var(--muted); font-size:1.02rem; max-width:520px; font-weight:300; margin-top:14px;">
              ${escapeHtml(sp.subheadline || p.shortDescription || '')}
            </p>
            ${priceBlock}
            ${benefitsBlock}
            <button type="button" class="ea-cta-primary" id="ea-cta-btn">
              ${escapeHtml(sp.ctaLabel || 'Quero garantir o meu')}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <p class="ea-trust-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Você será redirecionado com segurança para a página oficial de pagamento.
            </p>
          </div>
          <div class="ea-product-media">
            <div class="frame">
              <img src="${p.image}" alt="${escapeHtml(p.title)}" onerror="this.src='images/product-placeholder.svg'">
            </div>
            <span class="ea-stamp">Eu<br>recomendo</span>
          </div>
        </div>
      </section>

      ${sp.testimonial ? `
      <section class="ea-testimonial-section">
        <div class="container">
          <div class="ea-testimonial">
            <blockquote>&ldquo;${escapeHtml(sp.testimonial.quote)}&rdquo;</blockquote>
            <cite>${escapeHtml(sp.testimonial.author || 'Bruno Souza')}</cite>
          </div>
        </div>
      </section>` : ''}

      <section class="ea-final-cta">
        <div class="container">
          <p>Pronto pra começar?</p>
          <button type="button" class="ea-cta-primary" id="ea-cta-btn-2">
            ${escapeHtml(sp.ctaLabel || 'Quero garantir o meu')}
          </button>
          <div>
            <a href="index.html" class="ea-back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
              Ver outras recomendações
            </a>
          </div>
        </div>
      </section>
    `);

    /* Ambos os CTAs (topo e rodapé) disparam a mesma ação */
    document.getElementById('ea-cta-btn')?.addEventListener('click', () => goToAffiliate(p.affiliateUrl));
    document.getElementById('ea-cta-btn-2')?.addEventListener('click', () => goToAffiliate(p.affiliateUrl));
  }

  /* =========================================================
     Dispara a conversão do Google Ads e SÓ DEPOIS redireciona
     pro link de afiliado. Usa o padrão oficial do Google:
     event_callback navega quando o gtag confirma o envio, com
     um timeout de segurança caso o gtag não responda a tempo
     (bloqueador de anúncios, rede lenta, etc).
  ========================================================= */
  function goToAffiliate(url) {
    if (!url) return;

    let navigated = false;
    const go = () => {
      if (navigated) return;
      navigated = true;
      window.location.href = url;
    };

    if (typeof gtag === 'function' && window.EA_GOOGLE_ADS_CONVERSION) {
      gtag('event', 'conversion', {
        send_to: window.EA_GOOGLE_ADS_CONVERSION,
        event_callback: go,
      });
      /* Timeout de segurança — nunca trava o usuário esperando o pixel */
      setTimeout(go, 800);
    } else {
      go();
    }
  }

  function setMeta(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.setAttribute('content', value);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
