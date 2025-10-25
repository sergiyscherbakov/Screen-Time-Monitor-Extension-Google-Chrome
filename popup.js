// Глобальні змінні
let allTimeData = {};
let allDailyData = {};
let currentPeriod = 'today';

// Ініціалізація при завантаженні popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  displayStats();
});

// Завантаження даних з background script
async function loadData() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getTimeData' }, (response) => {
      allTimeData = response.timeData || {};
      allDailyData = response.dailyData || {};
      resolve();
    });
  });
}

// Налаштування обробників подій
function setupEventListeners() {
  // Фільтри періодів
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentPeriod = e.target.dataset.period;
      displayStats();
    });
  });

  // Кнопка скидання
  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (confirm('Ви впевнені, що хочете скинути всю статистику?')) {
      await resetData();
    }
  });

  // Кнопка експорту
  document.getElementById('exportBtn').addEventListener('click', () => {
    exportData();
  });
}

// Форматування часу в секундах в читабельний формат
function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds} сек`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} хв`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (minutes === 0) {
      return `${hours} год`;
    }
    return `${hours} год ${minutes} хв`;
  }
}

// Отримання дати для періоду
function getDateForPeriod(period) {
  const now = new Date();
  const dates = [];

  if (period === 'today') {
    dates.push(now.toISOString().split('T')[0]);
  } else if (period === 'week') {
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
  }

  return dates;
}

// Отримання даних для поточного періоду
function getDataForPeriod() {
  if (currentPeriod === 'all') {
    return allTimeData;
  }

  const dates = getDateForPeriod(currentPeriod);
  const periodData = {};

  dates.forEach(date => {
    const dayData = allDailyData[date] || {};
    Object.keys(dayData).forEach(domain => {
      if (!periodData[domain]) {
        periodData[domain] = {
          totalTime: 0,
          favicon: allTimeData[domain]?.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          lastVisit: allTimeData[domain]?.lastVisit || Date.now()
        };
      }
      periodData[domain].totalTime += dayData[domain];
    });
  });

  return periodData;
}

// Відображення статистики
function displayStats() {
  const data = getDataForPeriod();
  const sitesList = document.getElementById('sitesList');

  // Розрахунок загального часу
  let totalTime = 0;
  Object.values(data).forEach(site => {
    totalTime += site.totalTime;
  });

  // Оновлення сумарної статистики
  updateSummaryStats();

  // Перевірка чи є дані
  if (Object.keys(data).length === 0) {
    sitesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">
          Немає даних для відображення.<br>
          Почніть переглядати веб-сайти, і статистика з'явиться тут.
        </div>
      </div>
    `;
    return;
  }

  // Сортування за часом
  const sortedSites = Object.entries(data)
    .sort((a, b) => b[1].totalTime - a[1].totalTime)
    .slice(0, 20); // Показуємо топ-20

  // Генерація HTML для кожного сайту
  const sitesHTML = sortedSites.map(([domain, info]) => {
    const percentage = totalTime > 0 ? (info.totalTime / totalTime * 100).toFixed(1) : 0;
    return `
      <div class="site-item">
        <img src="${info.favicon}" class="site-favicon" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><text y=%2218%22 font-size=%2218%22>🌐</text></svg>'">
        <div class="site-info">
          <div class="site-domain">${domain}</div>
          <div class="site-bar-container">
            <div class="site-bar" style="width: ${percentage}%"></div>
          </div>
          <div class="site-percentage">${percentage}%</div>
        </div>
        <div class="site-time">${formatTime(info.totalTime)}</div>
      </div>
    `;
  }).join('');

  sitesList.innerHTML = sitesHTML;
}

// Оновлення сумарної статистики
function updateSummaryStats() {
  const todayDate = new Date().toISOString().split('T')[0];
  const weekDates = getDateForPeriod('week');

  // Розрахунок часу за сьогодні
  let todayTotal = 0;
  const todayData = allDailyData[todayDate] || {};
  Object.values(todayData).forEach(time => {
    todayTotal += time;
  });

  // Розрахунок часу за тиждень
  let weekTotal = 0;
  weekDates.forEach(date => {
    const dayData = allDailyData[date] || {};
    Object.values(dayData).forEach(time => {
      weekTotal += time;
    });
  });

  document.getElementById('todayTotal').textContent = formatTime(todayTotal);
  document.getElementById('weekTotal').textContent = formatTime(weekTotal);
}

// Скидання даних
async function resetData() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'resetData' }, async (response) => {
      if (response.success) {
        await loadData();
        displayStats();
        resolve();
      }
    });
  });
}

// Експорт даних в JSON
function exportData() {
  const exportObj = {
    timeData: allTimeData,
    dailyData: allDailyData,
    exportDate: new Date().toISOString(),
    summary: generateSummary()
  };

  const dataStr = JSON.stringify(exportObj, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });

  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `screen-time-export-${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

// Генерація підсумку для експорту
function generateSummary() {
  const todayDate = new Date().toISOString().split('T')[0];
  const weekDates = getDateForPeriod('week');

  let todayTotal = 0;
  const todayData = allDailyData[todayDate] || {};
  Object.values(todayData).forEach(time => {
    todayTotal += time;
  });

  let weekTotal = 0;
  weekDates.forEach(date => {
    const dayData = allDailyData[date] || {};
    Object.values(dayData).forEach(time => {
      weekTotal += time;
    });
  });

  let allTimeTotal = 0;
  Object.values(allTimeData).forEach(site => {
    allTimeTotal += site.totalTime;
  });

  return {
    todayTotal: formatTime(todayTotal),
    weekTotal: formatTime(weekTotal),
    allTimeTotal: formatTime(allTimeTotal),
    totalSites: Object.keys(allTimeData).length
  };
}

// Автоматичне оновлення кожні 5 секунд
setInterval(async () => {
  await loadData();
  displayStats();
}, 5000);
