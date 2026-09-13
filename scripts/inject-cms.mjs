import fs from 'fs';
import path from 'path';

const __dirname = path.resolve();
const contactsPath = path.join(__dirname, 'public/content/contacts.json');
const pricesPath = path.join(__dirname, 'public/content/prices.json');

const pages = [
  {
    template: 'templates/index.lv.html',
    output: 'index.html',
    json: 'public/content/lv.json',
  },
  {
    template: 'templates/index.en.html',
    output: 'en/index.html',
    json: 'public/content/en.json',
  },
  {
    template: 'templates/index.ru.html',
    output: 'ru/index.html',
    json: 'public/content/ru.json',
  },
];

function replaceObjectPlaceholders(html, prefix, obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return html;
  }

  Object.entries(obj).forEach(([key, value]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      html = replaceObjectPlaceholders(html, nextPrefix, value);
      return;
    }

    const placeholder = `{{${nextPrefix}}}`;
    if (typeof value === 'string' && html.includes(placeholder)) {
      html = html.split(placeholder).join(value);
    }
  });

  return html;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderRichText(value) {
  if (typeof value !== 'string' || !value.trim()) return '';

  const content = value.trim();
  const containsHtml = /<\/?[a-z][\s\S]*>/i.test(content);
  return containsHtml ? content : `<p>${escapeHtml(content)}</p>`;
}

function renderTip(value) {
  if (typeof value !== 'string' || !value.trim()) return '';

  return `<aside class="acc-details__tip"><p>${escapeHtml(value.trim())}</p></aside>`;
}

pages.forEach((page) => {
  const templatePath = path.join(__dirname, page.template);
  const outputPath = path.join(__dirname, page.output);
  const jsonPath = path.join(__dirname, page.json);

  if (!fs.existsSync(templatePath)) {
    console.warn(`⚠️ Пропуск: Шаблон не найден по пути ${templatePath}`);
    return;
  }
  if (!fs.existsSync(jsonPath)) {
    console.warn(`⚠️ Пропуск: JSON с данными не найден по пути ${jsonPath}`);
    return;
  }
  if (!fs.existsSync(contactsPath)) {
    console.warn(`⚠️ Пропуск: JSON с контактами не найден по пути ${contactsPath}`);
    return;
  }
  if (!fs.existsSync(pricesPath)) {
    console.warn(`⚠️ Пропуск: JSON с ценами не найден по пути ${pricesPath}`);
    return;
  }

  try {
    let html = fs.readFileSync(templatePath, 'utf8');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
    const prices = JSON.parse(fs.readFileSync(pricesPath, 'utf8'));

    // 1. Внедрение общих цен
    if (prices.prices) {
      Object.keys(prices.prices).forEach((key) => {
        const placeholder = `{{prices.${key}}}`;
        html = html.split(placeholder).join(String(prices.prices[key]));
      });
    }

    // 2. Внедрение ФОРМАТОВ (Party Mafia, Bunker и т.д.)
    // Проходим по ключам объекта formats и заменяем title и description
    if (data.formats) {
      Object.keys(data.formats).forEach((key) => {
        const titlePlaceholder = `{{formats.${key}.title}}`;
        const descPlaceholder = `{{formats.${key}.description}}`;
        const richDescPlaceholder = `{{formats.${key}.description_html}}`;
        const tipPlaceholder = `{{formats.${key}.tip_html}}`;

        if (html.includes(titlePlaceholder)) {
          html = html.split(titlePlaceholder).join(data.formats[key].title);
        }
        if (html.includes(descPlaceholder)) {
          html = html
            .split(descPlaceholder)
            .join(data.formats[key].description);
        }

        if (html.includes(richDescPlaceholder)) {
          html = html
            .split(richDescPlaceholder)
            .join(renderRichText(data.formats[key].description));
        }

        if (html.includes(tipPlaceholder)) {
          html = html
            .split(tipPlaceholder)
            .join(renderTip(data.formats[key].tip));
        }

      });
    }

    // 3. Внедрение общих контактов
    html = replaceObjectPlaceholders(html, 'contacts', contacts);

    // 4. Внедрение FAQ
    if (data.faq && html.includes('{{faq_items}}')) {
      const faqHtml = data.faq
        .map(
          (item) => `
    <details class="acc-faq acc-trigger">
      <summary class="acc-faq__summary">
        ${item.question}
        <span class="acc-faq__icon" aria-hidden="true">+</span>
      </summary>
      <div class="acc-faq__panel">
        <div class="acc-faq__content"><p>${item.answer}</p></div>
      </div>
    </details>
  `,
        )
        .join('\n');
      html = html.replace('{{faq_items}}', faqHtml);
    }

    // 5. Внедрение отзывов
    if (data.reviews && html.includes('{{reviews_items}}')) {
      const reviewsHtml = data.reviews
        .map((rev) => {
          const formattedText = rev.text.replace(
            /\*\*(.*?)\*\*/g,
            '<strong>$1</strong>',
          );

          let btnText = 'Show original';
          if (page.json.includes('ru.json')) btnText = 'Показать оригинал';
          if (page.json.includes('lv.json')) btnText = 'Rādīt oriģinālu';

          return `
      <article class="review-card">
        <p class="review-card__text">${formattedText}</p>
        <button class="review-card__btn" type="button" data-open-proof data-proof-src="${rev.image}" data-proof-alt="Review from social">
          ${btnText}
        </button>
      </article>`;
        })
        .join('\n');
      html = html.replace('{{reviews_items}}', reviewsHtml);
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Optional CMS fields can leave whitespace-only lines in generated HTML.
    html = html.replace(/[ \t]+$/gm, '');

    fs.writeFileSync(outputPath, html);
    console.log(`✅ Сгенерирован файл: ${page.output}`);
  } catch (err) {
    console.error(`❌ Ошибка при обработке ${page.template}:`, err);
  }
});

console.log('🚀 Все страницы успешно обновлены из шаблонов!');
