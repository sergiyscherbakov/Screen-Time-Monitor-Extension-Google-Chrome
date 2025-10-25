# Технічна документація

## Архітектура розширення

### Компоненти

```
┌─────────────────────────────────────────┐
│         Chrome Extension                │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  Background  │◄──►│   Popup UI   │  │
│  │    Script    │    │   (HTML/JS)  │  │
│  └──────┬───────┘    └──────────────┘  │
│         │                               │
│         ▼                               │
│  ┌──────────────┐                      │
│  │Chrome Storage│                      │
│  │    (Local)   │                      │
│  └──────────────┘                      │
│                                         │
└─────────────────────────────────────────┘
```

### 1. Manifest (manifest.json)

**Версія:** Manifest V3 (найновіша)

**Ключові налаштування:**
- `manifest_version: 3` - використання нового API
- `permissions` - необхідні дозволи для роботи
- `background.service_worker` - фоновий скрипт
- `action.default_popup` - інтерфейс popup

### 2. Background Script (background.js)

**Роль:** Service Worker для відстеження часу

**Основні функції:**

```javascript
// Глобальний стан
currentTabId      // ID активної вкладки
currentDomain     // Домен поточного сайту
startTime         // Час початку відстеження
updateInterval    // Інтервал періодичного збереження

// Життєвий цикл
onInstalled()     // Ініціалізація при встановленні
onStartup()       // Запуск при старті браузера
startTracking()   // Початок відстеження

// Відстеження
startTrackingTab() // Початок відстеження нової вкладки
saveTime()         // Збереження часу в storage
stopTracking()     // Зупинка відстеження

// Обробники подій
onActivated()      // Зміна активної вкладки
onUpdated()        // Оновлення URL у вкладці
onRemoved()        // Закриття вкладки
onFocusChanged()   // Зміна фокусу вікна
```

**Алгоритм роботи:**

1. **Ініціалізація:**
   ```javascript
   chrome.runtime.onInstalled.addListener(() => {
     initializeStorage();
     startTracking();
   });
   ```

2. **Відстеження активності:**
   ```javascript
   chrome.tabs.onActivated.addListener((activeInfo) => {
     // Збереження часу для попереднього таба
     await saveTime();
     // Початок відстеження нового таба
     await startTrackingTab(activeInfo.tabId, tab.url);
   });
   ```

3. **Періодичне збереження:**
   ```javascript
   setInterval(async () => {
     if (currentDomain && startTime) {
       await saveTime();
       startTime = Date.now(); // Перезапуск лічильника
     }
   }, 10000); // Кожні 10 секунд
   ```

### 3. Popup Interface (popup.html/js/css)

**Компоненти інтерфейсу:**

```html
<!-- Структура -->
<div class="container">
  <header>               <!-- Заголовок та кнопки -->
  <div class="stats-summary">  <!-- Загальна статистика -->
  <div class="filter-tabs">    <!-- Фільтри періодів -->
  <div class="sites-list">     <!-- Список сайтів -->
  <footer>               <!-- Експорт даних -->
</div>
```

**JavaScript функції:**

```javascript
loadData()          // Завантаження даних з background
displayStats()      // Відображення статистики
formatTime()        // Форматування часу
getDataForPeriod()  // Фільтрація за періодом
exportData()        // Експорт у JSON
resetData()         // Скидання статистики
```

## Структура даних

### Chrome Storage Schema

**timeData** (загальна статистика):
```javascript
{
  "example.com": {
    totalTime: 7325,        // Секунди
    lastVisit: 1704067200000, // Unix timestamp
    favicon: "https://..."    // URL іконки
  },
  "github.com": {
    totalTime: 5430,
    lastVisit: 1704153600000,
    favicon: "https://..."
  }
}
```

**dailyData** (щоденна статистика):
```javascript
{
  "2025-01-01": {
    "example.com": 3600,  // Секунди за день
    "github.com": 2400
  },
  "2025-01-02": {
    "example.com": 3725,
    "stackoverflow.com": 1800
  }
}
```

## API взаємодії

### Background ↔ Popup Communication

**Запит даних (Popup → Background):**
```javascript
chrome.runtime.sendMessage(
  { action: 'getTimeData' },
  (response) => {
    // response.timeData
    // response.dailyData
  }
);
```

**Скидання даних (Popup → Background):**
```javascript
chrome.runtime.sendMessage(
  { action: 'resetData' },
  (response) => {
    // response.success
  }
);
```

**Обробник у Background:**
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTimeData') {
    chrome.storage.local.get(['timeData', 'dailyData'], (result) => {
      sendResponse(result);
    });
    return true; // Асинхронна відповідь
  }
});
```

## Алгоритми

### 1. Розрахунок часу

**Базовий алгоритм:**
```javascript
const timeSpent = Math.floor((endTime - startTime) / 1000);
if (timeSpent >= 1) {
  timeData[domain].totalTime += timeSpent;
  dailyData[currentDate][domain] += timeSpent;
}
```

**Точність:** ±10 секунд (інтервал збереження)

### 2. Фільтрація за періодом

**Сьогодні:**
```javascript
const today = new Date().toISOString().split('T')[0];
const todayData = dailyData[today] || {};
```

**Тиждень:**
```javascript
const weekData = {};
for (let i = 0; i < 7; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const dateStr = date.toISOString().split('T')[0];
  // Об'єднання даних за кожен день
}
```

### 3. Сортування сайтів

```javascript
const sortedSites = Object.entries(data)
  .sort((a, b) => b[1].totalTime - a[1].totalTime)
  .slice(0, 20); // Топ-20
```

### 4. Візуалізація прогресу

```javascript
const percentage = (siteTime / totalTime * 100).toFixed(1);
<div style="width: ${percentage}%"></div>
```

## Продуктивність

### Оптимізації

1. **Періодичне збереження:**
   - Збереження кожні 10 секунд замість щосекундного
   - Зменшення навантаження на storage API

2. **Обмеження списку:**
   - Відображення тільки топ-20 сайтів
   - Зменшення об'єму DOM

3. **Автоматичне очищення:**
   - Видалення даних старше 30 днів
   - Запобігання накопиченню зайвих даних

4. **Асинхронність:**
   - Всі операції storage - асинхронні
   - Використання Promise та async/await

### Використання ресурсів

- **Пам'ять:** ~5-10 MB
- **CPU:** Мінімальне (події-based)
- **Storage:** ~100-500 KB (залежить від кількості сайтів)

## Безпека

### Захист даних

1. **Локальне збереження:**
   ```javascript
   chrome.storage.local.set({ data }) // Тільки локально
   ```

2. **Обмеження доступу:**
   - Дані доступні тільки розширенню
   - Жоден зовнішній код не має доступу

3. **Фільтрація URL:**
   ```javascript
   if (url.startsWith('chrome://') ||
       url.startsWith('chrome-extension://')) {
     return; // Ігнорування системних сторінок
   }
   ```

### Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "default-src 'self'"
  }
}
```

## Тестування

### Ручне тестування

**Тест 1: Базове відстеження**
1. Відкрити сайт A
2. Почекати 30 секунд
3. Відкрити popup → перевірити час на сайті A

**Тест 2: Зміна вкладок**
1. Відкрити сайт A
2. Почекати 20 секунд
3. Переключитися на сайт B
4. Почекати 20 секунд
5. Перевірити час на обох сайтах

**Тест 3: Втрата фокусу**
1. Відкрити сайт A
2. Згорнути вікно Chrome
3. Відкрити через 30 секунд
4. Перевірити, що час НЕ збільшився

**Тест 4: Фільтри періодів**
1. Зібрати дані за кілька днів
2. Перевірити фільтр "Сьогодні"
3. Перевірити фільтр "Тиждень"
4. Перевірити фільтр "Все"

**Тест 5: Експорт та скидання**
1. Експортувати дані
2. Перевірити JSON файл
3. Скинути дані
4. Перевірити, що popup порожній

### Автоматизоване тестування

**Jest тести (приклад):**
```javascript
describe('Time formatting', () => {
  test('formats seconds correctly', () => {
    expect(formatTime(45)).toBe('45 сек');
    expect(formatTime(120)).toBe('2 хв');
    expect(formatTime(3600)).toBe('1 год');
    expect(formatTime(3660)).toBe('1 год 1 хв');
  });
});
```

## Налагодження

### Chrome DevTools

**Background Script:**
```
1. chrome://extensions/
2. Знайти розширення
3. Деталі → "Inspect views: service worker"
```

**Popup:**
```
1. Відкрити popup
2. Правий клік → "Перевірити"
```

### Логування

**Background:**
```javascript
console.log(`Збережено ${timeSpent} секунд для ${domain}`);
```

**Popup:**
```javascript
console.log('Loaded data:', allTimeData);
```

## Розширення функціональності

### Додавання нових функцій

**Приклад: Додавання лімітів часу**

1. **Storage Schema:**
```javascript
limits: {
  "facebook.com": 1800, // 30 хвилин
  "youtube.com": 3600   // 1 година
}
```

2. **Background:**
```javascript
function checkLimit(domain, timeSpent) {
  const limit = limits[domain];
  if (limit && timeSpent >= limit) {
    showNotification(domain);
  }
}
```

3. **Popup:**
```html
<input type="number" id="limit-${domain}"
       placeholder="Ліміт (хв)">
```

### API для інтеграцій

```javascript
// Зовнішній API (для майбутніх розширень)
window.ScreenTimeAPI = {
  getTotalTime: async () => { },
  getSiteTime: async (domain) => { },
  exportData: () => { }
};
```

## Публікація

### Chrome Web Store

1. **Підготовка:**
   - Створити ZIP архів проекту
   - Підготувати скріншоти (1280x800)
   - Написати опис (українською та англійською)

2. **Завантаження:**
   - https://chrome.google.com/webstore/devconsole
   - Новий елемент → Завантажити ZIP
   - Заповнити форму

3. **Перевірка:**
   - Google перевірить розширення (1-3 дні)
   - Публікація після схвалення

## Ліцензування

**MIT License** - вільне використання та модифікація

```
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge...
```

## Підтримка

### Відомі проблеми

1. **Service Worker засинає**
   - Chrome вимикає SW після 30 секунд неактивності
   - Рішення: chrome.alarms API для періодичних задач

2. **Обмеження Storage**
   - chrome.storage.local: 10 MB ліміт
   - Рішення: очищення старих даних

### Майбутні покращення

- [ ] IndexedDB для великих обсягів даних
- [ ] Web Workers для обчислень
- [ ] Chart.js для графіків
- [ ] Export у CSV/PDF
- [ ] Синхронізація через chrome.storage.sync

---

**Версія документації:** 1.0
**Останнє оновлення:** 2025
