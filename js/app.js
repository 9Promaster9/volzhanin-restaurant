(function () {
  'use strict';

  function makeFallbackSvg(label) {
    const safe = String(label || 'Фото интерьера').replace(/[&<>"]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#1B3156"/><rect x="36" y="36" width="728" height="928" fill="none" stroke="#9E6836" stroke-width="2"/><text x="400" y="485" fill="#F5F2EB" font-family="Georgia, serif" font-size="38" text-anchor="middle">Волжанин</text><text x="400" y="535" fill="#CFC8BA" font-family="sans-serif" font-size="20" text-anchor="middle">${safe}</text></svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  function applyImageFallback(img, label) {
    if (!img) return;
    img.addEventListener(
      'error',
      () => {
        img.src = makeFallbackSvg(label);
      },
      { once: true }
    );
  }

  async function loadData() {
    try {
      const res = await fetch('data/data.json', { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {
      // Fallback to window.VOLZHANIN_DATA when opened via file://
    }
    return window.VOLZHANIN_DATA;
  }

  function renderAnnouncement(data) {
    const bar = document.getElementById('announcement-bar');
    if (!bar) return;
    if (data.announcement && data.announcement.enabled && data.announcement.text) {
      bar.textContent = data.announcement.text;
      bar.hidden = false;
    } else {
      bar.hidden = true;
    }
  }

  function renderHeroAndAbout(data) {
    const r = data.restaurant;
    const heroImg = document.getElementById('hero-img');
    const aboutImg = document.getElementById('about-img');

    if (heroImg && data.gallery[0]) {
      applyImageFallback(heroImg, data.gallery[0].caption);
      heroImg.src = data.gallery[0].src;
      heroImg.alt = data.gallery[0].alt;
    }
    if (aboutImg && data.gallery[1]) {
      applyImageFallback(aboutImg, data.gallery[1].caption);
      aboutImg.src = data.gallery[1].src;
      aboutImg.alt = data.gallery[1].alt;
    }

    const descWrap = document.getElementById('about-description');
    if (descWrap && Array.isArray(r.description)) {
      descWrap.innerHTML = r.description.map((p) => `<p>${p}</p>`).join('');
    }

    const featList = document.getElementById('feature-list');
    if (featList && Array.isArray(r.features)) {
      featList.innerHTML = r.features
        .map(
          (f) => `
          <li class="feature-list__item">
            <span class="feature-list__label">${f.label}</span>
            <span class="feature-list__value">${f.value}</span>
          </li>`
        )
        .join('');
    }
  }

  function renderMenu(data) {
    const container = document.getElementById('menu-container');
    if (!container) return;

    const menu = data.menu || {};
    if (!menu.available || !Array.isArray(menu.items) || menu.items.length === 0) {
      container.innerHTML = `
        <div class="menu-unavailable" role="status" aria-live="polite">
          <span class="menu-unavailable__stamp">Раздел меню</span>
          <div class="menu-unavailable__code">${menu.unavailableCode || 'Н/Д'}</div>
          <h3 class="menu-unavailable__title">${menu.unavailableTitle || 'Меню сейчас недоступно'}</h3>
          <div class="menu-unavailable__divider" aria-hidden="true"></div>
          <p class="menu-unavailable__note">${menu.unavailableNote || ''}</p>
        </div>
      `;
      return;
    }

    const categories = menu.categories || [];
    let activeCat = categories[0] || '';

    const renderList = () => {
      const filtered = menu.items.filter((item) => !activeCat || item.category === activeCat);
      const listHtml = filtered
        .map(
          (item) => `
          <div class="menu-editorial-row">
            <div>
              <strong>${item.name}</strong>
              ${item.weight ? `<span> · ${item.weight}</span>` : ''}
              ${item.description ? `<p>${item.description}</p>` : ''}
            </div>
            <div><strong>${item.price || 'Н/Д'}</strong></div>
          </div>`
        )
        .join('');

      container.innerHTML = `
        <div class="menu-tabs" role="tablist">
          ${categories
            .map(
              (c) =>
                `<button type="button" class="menu-tab ${c === activeCat ? 'is-active' : ''}" data-cat="${c}">${c}</button>`
            )
            .join('')}
        </div>
        <div class="menu-editorial-list">${listHtml}</div>
      `;

      container.querySelectorAll('.menu-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeCat = btn.dataset.cat;
          renderList();
        });
      });
    };

    renderList();
  }

  function renderGallery(data) {
    const grid = document.getElementById('gallery-grid');
    if (!grid || !Array.isArray(data.gallery)) return;

    const layoutClasses = [
      'gallery-card--wide',
      'gallery-card--tall',
      'gallery-card--tall',
      'gallery-card--wide'
    ];

    grid.innerHTML = data.gallery
      .map((item, idx) => {
        const cls = layoutClasses[idx % layoutClasses.length];
        return `
          <figure class="gallery-card ${cls}" data-idx="${idx}" tabindex="0" role="button" aria-label="Открыть фото: ${item.caption}">
            <div class="gallery-card__img-wrap">
              <img class="gallery-card__img" src="${item.src}" alt="${item.alt}" loading="lazy">
            </div>
            <figcaption class="gallery-card__meta">
              <span class="gallery-card__caption">${item.caption}</span>
              <span class="gallery-card__tag">${item.tag}</span>
            </figcaption>
          </figure>
        `;
      })
      .join('');

    grid.querySelectorAll('.gallery-card').forEach((card) => {
      const idx = Number(card.dataset.idx);
      const item = data.gallery[idx];
      const img = card.querySelector('img');
      if (item && img) applyImageFallback(img, item.caption);
    });

    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbCaption = document.getElementById('lightbox-caption');
    const lbClose = document.getElementById('lightbox-close');

    const openLightbox = (idx) => {
      const item = data.gallery[idx];
      if (!item || !lightbox) return;
      applyImageFallback(lbImg, item.caption);
      lbImg.src = item.src;
      lbImg.alt = item.alt;
      lbCaption.textContent = item.caption;
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
      if (!lightbox) return;
      lightbox.hidden = true;
      document.body.style.overflow = '';
    };

    grid.querySelectorAll('.gallery-card').forEach((card) => {
      card.addEventListener('click', () => openLightbox(Number(card.dataset.idx)));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(Number(card.dataset.idx));
        }
      });
    });

    if (lbClose) lbClose.addEventListener('click', closeLightbox);
    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox();
    });
  }

  function renderReviews(data) {
    const tabsWrap = document.getElementById('reviews-tabs');
    const panelWrap = document.getElementById('reviews-panel');
    if (!tabsWrap || !panelWrap || !data.reviews || !Array.isArray(data.reviews.sources)) return;

    const sources = data.reviews.sources;
    let activeId = sources[0].id;

    const render = () => {
      tabsWrap.innerHTML = sources
        .map(
          (src) => `
          <button
            type="button"
            class="reviews-tab ${src.id === activeId ? 'is-active' : ''}"
            role="tab"
            aria-selected="${src.id === activeId}"
            data-source="${src.id}"
          >
            ${src.name}
          </button>`
        )
        .join('');

      const current = sources.find((s) => s.id === activeId) || sources[0];
      const hasItems = Array.isArray(current.items) && current.items.length > 0;

      const linkBtn = current.url
        ? `<a class="btn btn--outline btn--sm" href="${current.url}" target="_blank" rel="noopener noreferrer">Открыть на ${current.name}</a>`
        : `<span class="form-hint">Ссылка на карточку: Н/Д</span>`;

      const rightHtml = hasItems
        ? current.items
            .map(
              (rev) => `
              <article class="reviews-empty">
                <strong>${rev.author}</strong>
                <p class="reviews-empty__text">${rev.text}</p>
              </article>`
            )
            .join('')
        : `
          <div class="reviews-empty">
            <div class="reviews-empty__code">Н/Д</div>
            <p class="reviews-empty__text">
              ${
                current.url
                  ? `Тексты отзывов с площадки «${current.name}» в демонстрационной версии не выгружены. Вы можете посмотреть все ${current.reviewsCount} напрямую в карточке ресторана.`
                  : `По площадке «${current.name}» открытые данные и отзывы сейчас отсутствуют (Н/Д).`
              }
            </p>
          </div>
        `;

      panelWrap.innerHTML = `
        <div class="reviews-summary">
          <div>
            <div class="reviews-summary__source">${current.name}</div>
            <div class="reviews-summary__score">${current.rating}</div>
            <div class="reviews-summary__counts">${current.ratingsCount} · ${current.reviewsCount}</div>
          </div>
          <div>${linkBtn}</div>
        </div>
        ${rightHtml}
      `;

      tabsWrap.querySelectorAll('.reviews-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeId = btn.dataset.source;
          render();
        });
      });
    };

    render();
  }

  function initBookingForm() {
    const form = document.getElementById('booking-form');
    const modal = document.getElementById('demo-modal');
    const modalDetails = document.getElementById('modal-details');
    const modalClose = document.getElementById('modal-close');
    const dateInput = document.getElementById('booking-date');

    if (dateInput) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const minDate = `${yyyy}-${mm}-${dd}`;
      dateInput.min = minDate;
      dateInput.value = minDate;
    }

    if (!form) return;

    const closeModal = () => {
      if (!modal) return;
      modal.hidden = true;
      document.body.style.overflow = '';
    };

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const fields = {
        date: document.getElementById('booking-date'),
        time: document.getElementById('booking-time'),
        guests: document.getElementById('booking-guests'),
        name: document.getElementById('booking-name'),
        comment: document.getElementById('booking-comment')
      };

      let valid = true;

      const setErr = (id, msg) => {
        const el = document.getElementById(`err-${id}`);
        if (el) el.textContent = msg;
        if (msg) valid = false;
      };

      setErr('date', fields.date.value ? '' : 'Выберите дату визита');
      setErr('time', fields.time.value ? '' : 'Укажите время');
      setErr(
        'guests',
        fields.guests.value && Number(fields.guests.value) >= 1 && Number(fields.guests.value) <= 20
          ? ''
          : 'Укажите от 1 до 20 гостей'
      );
      setErr('name', fields.name.value.trim().length >= 2 ? '' : 'Введите ваше имя');

      if (!valid) return;

      if (modal && modalDetails) {
        const commentText = fields.comment.value.trim() || 'Без комментария';
        modalDetails.innerHTML = `
          <div><strong>Гость:</strong> ${fields.name.value.trim()}</div>
          <div><strong>Дата и время:</strong> ${fields.date.value}, ${fields.time.value}</div>
          <div><strong>Количество гостей:</strong> ${fields.guests.value}</div>
          <div><strong>Комментарий:</strong> ${commentText}</div>
        `;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
      }
    });
  }

  function initMobileNav() {
    const burger = document.getElementById('burger-btn');
    const mobileNav = document.getElementById('mobile-nav');
    if (!burger || !mobileNav) return;

    burger.addEventListener('click', () => {
      const expanded = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!expanded));
      mobileNav.hidden = expanded;
    });

    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        burger.setAttribute('aria-expanded', 'false');
        mobileNav.hidden = true;
      });
    });
  }

  function initScrollReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    items.forEach((el) => observer.observe(el));
  }

  async function init() {
    const data = await loadData();
    if (!data) return;
    renderAnnouncement(data);
    renderHeroAndAbout(data);
    renderMenu(data);
    renderGallery(data);
    renderReviews(data);
    initBookingForm();
    initMobileNav();
    initScrollReveal();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
