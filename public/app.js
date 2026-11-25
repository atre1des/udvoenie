const rates = {
  USD: 1, EUR: 0.92, KZT: 500, RUB: 90, UAH: 41, GBP: 0.78,
  TRY: 34, PLN: 4, GEL: 2.7, UZS: 12700, AED: 3.67,
  BYN: 3.3, KGS: 87, AMD: 390, AZN: 1.7,
};
const totalDays = 30;
const storageKey = 'udvoenie:v1';
const milestones = [7, 14, 30];
const app = document.querySelector('#app');
const notice = document.querySelector('#notice');
const currencyFormat = new Map();
const compact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 2 });

function guessedCurrency() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = {
    Almaty: 'KZT', Qyzylorda: 'KZT', Qostanay: 'KZT', Aqtau: 'KZT', Aqtobe: 'KZT', Oral: 'KZT',
    Moscow: 'RUB', Kiev: 'UAH', Kyiv: 'UAH', Tbilisi: 'GEL', Tashkent: 'UZS',
    Minsk: 'BYN', London: 'GBP', Istanbul: 'TRY', Warsaw: 'PLN', Dubai: 'AED',
    Bishkek: 'KGS', Yerevan: 'AMD', Baku: 'AZN',
  };
  if (zones[zone?.split('/').at(-1)]) return zones[zone.split('/').at(-1)];
  const region = new Intl.Locale(navigator.language).region;
  const regions = {
    KZ: 'KZT', RU: 'RUB', UA: 'UAH', GB: 'GBP', TR: 'TRY', PL: 'PLN', GE: 'GEL',
    UZ: 'UZS', AE: 'AED', BY: 'BYN', KG: 'KGS', AM: 'AMD', AZ: 'AZN',
  };
  if (regions[region]) return regions[region];
  return zone?.startsWith('Europe/') ? 'EUR' : 'USD';
}

function initialState() {
  return { base: 'USD', local: guessedCurrency(), entries: [], draft: '', answers: [], reflecting: false };
}

function load() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : initialState();
  } catch {
    notice.textContent = 'Не удалось загрузить данные этого браузера.';
    notice.hidden = false;
    return initialState();
  }
}

let state = load();

function writeState(next) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    state = next;
    notice.hidden = true;
    return true;
  } catch {
    notice.textContent = 'Браузер не смог сохранить изменения. Проверьте настройки хранилища.';
    notice.hidden = false;
    return false;
  }
}

const dayAmount = (day, seed = 1000) => seed * 2 ** (day - 1);
const convert = (value, from, to) => value / rates[from] * rates[to];

function formatter(currency) {
  if (!currencyFormat.has(currency)) {
    currencyFormat.set(currency, new Intl.NumberFormat('ru-RU', {
      style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 0,
    }));
  }
  return currencyFormat.get(currency);
}

function money(amount, currency) {
  return formatter(currency).format(amount);
}

function amountLabel(value, currency) {
  if (value < 1e6) return money(value, currency);
  const symbol = formatter(currency);
  return compact.format(value) + ' ' + symbol.formatToParts(value).find(part => part.type === 'currency').value;
}

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content != null) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function fillSelect(node, options, selected) {
  node.replaceChildren(...options.map(code => new Option(code, code, false, code === selected)));
}

function showTemplate(target, id) {
  target.replaceChildren(document.getElementById(id).content.cloneNode(true));
}

function questionsFor(day) {
  const common = 'Какой выбор дался вам легче всего и почему?';
  if (day <= 7) return [common, 'Какое ваше желание стоит за одной из этих трат?'];
  if (day <= 14) return [common, 'Откуда могли бы прийти эти деньги и чего вы ожидали бы взамен?'];
  if (day <= 22) return ['За какие последствия своих трат вы готовы отвечать?', 'Что из выбранного останется важным через десять лет?'];
  return ['Где вы бы провели границу между своими желаниями и ожиданиями других?', 'Что вы хотели бы сохранить, даже если сумма исчезнет?'];
}

function renderGame() {
  showTemplate(app, 'game');
  const completed = state.entries.length;
  const day = Math.min(totalDays, completed + 1);
  const base = app.querySelector('#base');
  const local = app.querySelector('#local');
  fillSelect(base, ['USD', 'EUR'], state.base);
  fillSelect(local, Object.keys(rates), state.local);
  base.disabled = completed > 0;
  for (const [input, key] of [[base, 'base'], [local, 'local']]) {
    input.onchange = () => {
      if (writeState({ ...state, [key]: input.value })) {
        renderAmounts();
        const advance = app.querySelector('#advance');
        if (advance) advance.textContent = advanceLabel(day);
      } else {
        input.value = state[key];
      }
    };
  }

  app.querySelector('#progress-label').textContent = completed + ' из 30 дней завершено';
  const progress = app.querySelector('#progress');
  progress.value = completed;
  progress.setAttribute('aria-label', 'Завершённые дни');
  const days = app.querySelector('#days');
  for (let n = 1; n <= totalDays; n++) {
    const tile = element('span', n, n <= completed ? 'done' : '');
    if (n === day && completed < totalDays) tile.setAttribute('aria-current', 'step');
    days.append(tile);
  }
  const exercise = app.querySelector('#exercise');
  app.querySelector('#day-label').textContent = completed === totalDays ? '30 дней завершено' : 'День ' + day + ' из 30';
  const amount = app.querySelector('#amount');
  const converted = app.querySelector('#converted');

  function renderAmounts() {
    const value = dayAmount(day);
    amount.textContent = amountLabel(value, state.base);
    amount.title = money(value, state.base);
    converted.textContent = state.base === state.local
      ? 'Виртуальная сумма на день'
      : '≈ ' + amountLabel(convert(value, state.base, state.local), state.local) + ' · примерный курс';
  }

  renderAmounts();
  if (completed === totalDays) {
    const journal = element('button', 'Открыть дневник', 'primary');
    journal.onclick = () => navigate('journal');
    exercise.append(element('h2', 'Вы прошли все 30 дней'), element('p', 'Вернитесь к своим решениям, чтобы увидеть, как менялись ваши приоритеты.'), journal);
  } else if (state.reflecting) {
    renderReflection(exercise, day);
  } else {
    renderWriting(exercise);
  }
}

function renderWriting(target) {
  showTemplate(target, 'write');
  const field = target.querySelector('#spending');
  field.value = state.draft;
  field.oninput = () => {
    field.setCustomValidity('');
    writeState({ ...state, draft: field.value });
  };
  const help = target.querySelector('#help');
  const hints = target.querySelector('#hints');
  help.setAttribute('aria-controls', 'hints');
  help.setAttribute('aria-expanded', 'false');
  help.onclick = () => {
    hints.hidden = !hints.hidden;
    help.setAttribute('aria-expanded', String(!hints.hidden));
  };
  target.querySelector('form').onsubmit = event => {
    event.preventDefault();
    if (field.value.trim().length < 5) {
      field.setCustomValidity('Опишите траты хотя бы несколькими словами.');
      field.reportValidity();
      return;
    }
    if (writeState({ ...state, draft: field.value.trim(), reflecting: true })) {
      renderGame();
      focusHeading();
    }
  };
}

function advanceLabel(day) {
  return day === totalDays ? 'Завершить игру' : 'Следующий день · ' + amountLabel(dayAmount(day + 1), state.base);
}

function renderReflection(target, day) {
  showTemplate(target, 'reflect');
  target.querySelector('#saved-spending').textContent = state.draft;
  const cards = target.querySelector('#questions');
  const prompts = questionsFor(day);
  const fields = prompts.map((prompt, index) => {
    const label = element('label', prompt);
    const field = element('textarea');
    field.id = 'answer-' + index;
    field.rows = 2;
    field.maxLength = 4000;
    field.value = state.answers[index] ?? '';
    field.oninput = () => writeState({ ...state, answers: fields.map(input => input.value) });
    label.htmlFor = field.id;
    cards.append(label, field);
    return field;
  });
  target.querySelector('#edit').onclick = () => {
    if (writeState({ ...state, answers: fields.map(field => field.value), reflecting: false })) {
      renderGame();
      app.querySelector('#spending').focus();
    }
  };
  const advance = target.querySelector('#advance');
  advance.textContent = advanceLabel(day);
  advance.onclick = () => {
    const entry = {
      day, base: state.base, amount: dayAmount(day), spending: state.draft,
      reflection: prompts.map((question, index) => ({ question, answer: fields[index].value.trim() })),
    };
    if (writeState({ ...state, entries: [...state.entries, entry], draft: '', answers: [], reflecting: false })) {
      renderGame();
      focusHeading();
      window.scrollTo(0, 0);
    }
  };
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = element('a');
  link.href = url;
  link.download = 'udvoenie.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderJournal() {
  showTemplate(app, 'journal');
  const list = app.querySelector('#entries');
  const checkpoints = app.querySelector('#checkpoints');
  const print = [];
  for (const milestone of milestones.filter(value => value <= state.entries.length)) {
    const details = element('details');
    details.append(element('summary', 'Итоги первых ' + milestone + ' дней'));
    details.append(element('p', 'Какие темы повторяются в ваших решениях? Что изменилось, когда суммы выросли? Какой выбор вы хотели бы пересмотреть?'));
    const button = element('button', 'Печать / PDF');
    button.onclick = () => {
      const rows = [...list.children];
      const expanded = rows.map(row => row.open);
      rows.forEach((row, index) => {
        row.hidden = index >= milestone;
        row.open = index < milestone;
      });
      print.forEach(node => { node.hidden = node !== details; });
      window.print();
      rows.forEach((row, index) => {
        row.hidden = false;
        row.open = expanded[index];
      });
      print.forEach(node => { node.hidden = false; });
    };
    details.append(button);
    print.push(details);
    checkpoints.append(details);
  }
  if (state.entries.length) {
    app.querySelector('#journal-intro').textContent = 'Завершено дней: ' + state.entries.length + ' из 30.';
  }
  for (const entry of state.entries) {
    const details = element('details');
    details.append(element('summary', 'День ' + entry.day + ' · ' + money(entry.amount, entry.base)));
    details.append(element('p', entry.spending, 'entry-text'));
    for (const { question, answer } of entry.reflection) {
      if (answer) details.append(element('strong', question), element('p', answer, 'entry-text'));
    }
    list.append(details);
  }
  app.querySelector('#export').onclick = exportData;
  app.querySelector('#erase').onclick = () => {
    if (!window.confirm('Удалить все записи и черновики из этого браузера?')) return;
    try {
      localStorage.removeItem(storageKey);
      state = initialState();
      renderJournal();
      notice.textContent = 'Записи и черновики удалены.';
    } catch {
      notice.textContent = 'Не удалось удалить данные. Проверьте настройки браузера.';
    }
    notice.hidden = false;
  };
}

function renderCalculator() {
  showTemplate(app, 'calculator');
  const currency = app.querySelector('#calc-currency');
  fillSelect(currency, Object.keys(rates), state.base);
  const output = app.querySelector('#calc-result');
  const calculate = () => {
    const seed = app.querySelector('#seed').valueAsNumber;
    const day = app.querySelector('#calc-day').valueAsNumber;
    const cents = BigInt(Math.round(seed * 100)) * (2n ** BigInt(day - 1));
    const parts = formatter(currency.value).formatToParts(cents / 100n);
    const fraction = cents % 100n;
    if (fraction) {
      const lastDigit = parts.findLast(part => part.type === 'integer');
      lastDigit.value += ',' + String(fraction).padStart(2, '0');
    }
    output.textContent = parts.map(part => part.value).join('');
  };
  app.querySelector('#calc-form').onsubmit = event => {
    event.preventDefault();
    calculate();
  };
  calculate();
}

function focusHeading() {
  const target = app.querySelector('#exercise h2') ?? app.querySelector('h1');
  if (target) {
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
}

function navigate(view, focus = true) {
  const renderers = { game: renderGame, journal: renderJournal, calculator: renderCalculator };
  renderers[view]();
  document.querySelectorAll('nav [data-view]').forEach(button => {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (focus) {
    window.scrollTo(0, 0);
    focusHeading();
  }
}

document.querySelectorAll('[data-view]').forEach(button => {
  button.onclick = () => navigate(button.dataset.view);
});
navigate('game', false);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
