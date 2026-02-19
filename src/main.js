import './scss/main.scss';
import Swiper from 'swiper';
import { Navigation, Pagination, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const SELECTORS = {
  header: '.header',
  burger: '.burger',
  menu: '.menu',
  detailsTrigger: '.acc-trigger',
  accLink: 'a[data-acc]',
  proofDialog: '#proof',
  proofImg: '.proof__img',
  proofClose: '[data-proof-close]',
  proofOpen: '[data-open-proof]',
  gallerySlider: '.gallery__slider',
  galleryWrapper: '#gallery-wrapper',
  galleryImage: '.gallery__slide-img',
  year: '#year',
};

const CLASSES = {
  bodyLocked: 'body--locked',
  headerScrolled: 'header--scrolled',
  burgerOpen: 'burger--open',
  menuOpen: 'menu--open',
  portraitContain: 'is-contain',
};

const ATTRS = {
  ariaExpanded: 'aria-expanded',
  ariaHidden: 'aria-hidden',
};

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function setBodyLocked(locked) {
  document.body.classList.toggle(CLASSES.bodyLocked, locked);
}

function initHeaderScrollState() {
  const headerEl = qs(SELECTORS.header);
  if (!headerEl) return;

  const updateHeaderState = () => {
    headerEl.classList.toggle(CLASSES.headerScrolled, window.scrollY > 30);
  };

  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
}

function initMobileMenu() {
  const burger = qs(SELECTORS.burger);
  const menu = qs(SELECTORS.menu);

  if (!burger || !menu) return;

  const setMenuOpen = (open) => {
    burger.classList.toggle(CLASSES.burgerOpen, open);
    menu.classList.toggle(CLASSES.menuOpen, open);

    burger.setAttribute(ATTRS.ariaExpanded, open ? 'true' : 'false');
    menu.setAttribute(ATTRS.ariaHidden, open ? 'false' : 'true');

    setBodyLocked(open);
  };

  burger.addEventListener('click', () => {
    setMenuOpen(!menu.classList.contains(CLASSES.menuOpen));
  });

  menu.addEventListener('click', (event) => {
    if (event.target.closest('[data-menu-close]')) {
      setMenuOpen(false);
      return;
    }

    if (event.target.closest('a[href^="#"]')) {
      setMenuOpen(false);
    }
  });
}

function initAccordions() {
  const detailsList = qsa(SELECTORS.detailsTrigger);
  if (!detailsList.length) return;

  detailsList.forEach((detail) => {
    detail.addEventListener('click', () => {
      detailsList.forEach((otherDetail) => {
        if (otherDetail !== detail) {
          otherDetail.removeAttribute('open');
        }
      });
    });
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest(SELECTORS.accLink);
    if (!link) return;

    const id = link.dataset.acc;
    if (!id) return;

    const target = document.getElementById(id);
    if (!target || target.tagName !== 'DETAILS') return;

    detailsList.forEach((detail) => detail.removeAttribute('open'));
    target.setAttribute('open', '');
  });
}

function initProofDialog() {
  const proofDialog = qs(SELECTORS.proofDialog);
  if (!proofDialog) return;

  const proofImg = qs(SELECTORS.proofImg, proofDialog);
  const proofClose = qs(SELECTORS.proofClose, proofDialog);

  const canUseDialog =
    typeof HTMLDialogElement !== 'undefined' &&
    typeof proofDialog.showModal === 'function';

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest(SELECTORS.proofOpen);
    if (!trigger) return;

    const src = trigger.dataset.proofSrc;
    const alt = trigger.dataset.proofAlt || 'Оригинал отзыва';
    if (!src) return;

    if (!canUseDialog) {
      window.open(src, '_blank', 'noopener,noreferrer');
      return;
    }

    if (proofImg) {
      proofImg.src = src;
      proofImg.alt = alt;
    }

    proofDialog.showModal();
  });

  proofClose?.addEventListener('click', () => proofDialog.close());

  proofDialog.addEventListener('close', () => {
    if (!proofImg) return;
    proofImg.src = '';
    proofImg.alt = '';
  });
}

function initCurrentYear() {
  const yearEl = qs(SELECTORS.year);
  if (!yearEl) return;

  yearEl.textContent = String(new Date().getFullYear());
}

function markPortraitImages(root) {
  const images = qsa(SELECTORS.galleryImage, root);

  images.forEach((image) => {
    const applyOrientationClass = () => {
      const isPortrait = image.naturalHeight > image.naturalWidth;
      image.classList.toggle(CLASSES.portraitContain, isPortrait);
    };

    if (image.complete) {
      applyOrientationClass();
      return;
    }

    image.addEventListener('load', applyOrientationClass, { once: true });
  });
}

function createGallerySlides(gallery) {
  return gallery
    .map(
      (item) => `
      <div class="swiper-slide">
        <figure class="gallery__frame">
          <img class="gallery__slide-img" src="${item.image}" alt="${item.caption}" loading="lazy" decoding="async" />
          <figcaption class="gallery__cap">${item.caption}</figcaption>
        </figure>
      </div>
    `,
    )
    .join('');
}

async function initDynamicGallery() {
  const sliderEl = qs(SELECTORS.gallerySlider);
  const wrapper = qs(SELECTORS.galleryWrapper);

  if (!sliderEl || !wrapper) return;

  const contentPath = '/content/gallery.json';

  try {
    const response = await fetch(contentPath);
    if (!response.ok) {
      throw new Error(`Failed to load ${contentPath}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.gallery) || data.gallery.length === 0) return;

    wrapper.innerHTML = createGallerySlides(data.gallery);
    markPortraitImages(wrapper);

    new Swiper(sliderEl, {
      modules: [Navigation, Pagination, A11y],
      loop: true,
      speed: 800,
      slidesPerView: 1,
      spaceBetween: 20,
      navigation: {
        nextEl: '.gallery__nav--next',
        prevEl: '.gallery__nav--prev',
      },
      pagination: {
        el: '.gallery__pagination',
        clickable: true,
      },
      a11y: true,
      grabCursor: true,
    });
  } catch (error) {
    console.error('Ошибка загрузки галереи:', error);
  }
}

function initApp() {
  initHeaderScrollState();
  initMobileMenu();
  initAccordions();
  initProofDialog();
  initCurrentYear();
  initDynamicGallery();
}

initApp();
