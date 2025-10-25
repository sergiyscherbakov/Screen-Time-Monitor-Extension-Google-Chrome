// Глобальні змінні для відстеження часу
let currentTabId = null;
let currentDomain = null;
let startTime = null;
let updateInterval = null;

// Ініціалізація при встановленні розширення
chrome.runtime.onInstalled.addListener(() => {
  console.log('Розширення моніторингу екранного часу встановлено');
  initializeStorage();
  startTracking();
});

// Запуск відстеження при старті браузера
chrome.runtime.onStartup.addListener(() => {
  startTracking();
});

// Ініціалізація сховища
async function initializeStorage() {
  const result = await chrome.storage.local.get(['timeData', 'dailyData']);

  if (!result.timeData) {
    await chrome.storage.local.set({ timeData: {} });
  }

  if (!result.dailyData) {
    await chrome.storage.local.set({ dailyData: {} });
  }
}

// Отримання домену з URL
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

// Отримання поточної дати в форматі YYYY-MM-DD
function getCurrentDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Збереження часу для поточного домену
async function saveTime() {
  if (!currentDomain || !startTime) return;

  const endTime = Date.now();
  const timeSpent = Math.floor((endTime - startTime) / 1000); // В секундах

  if (timeSpent < 1) return; // Ігноруємо дуже короткі інтервали

  const currentDate = getCurrentDate();
  const result = await chrome.storage.local.get(['timeData', 'dailyData']);

  let timeData = result.timeData || {};
  let dailyData = result.dailyData || {};

  // Оновлення загального часу
  if (!timeData[currentDomain]) {
    timeData[currentDomain] = {
      totalTime: 0,
      lastVisit: Date.now(),
      favicon: `https://www.google.com/s2/favicons?domain=${currentDomain}&sz=64`
    };
  }
  timeData[currentDomain].totalTime += timeSpent;
  timeData[currentDomain].lastVisit = Date.now();

  // Оновлення денної статистики
  if (!dailyData[currentDate]) {
    dailyData[currentDate] = {};
  }
  if (!dailyData[currentDate][currentDomain]) {
    dailyData[currentDate][currentDomain] = 0;
  }
  dailyData[currentDate][currentDomain] += timeSpent;

  // Збереження даних
  await chrome.storage.local.set({
    timeData: timeData,
    dailyData: dailyData
  });

  console.log(`Збережено ${timeSpent} секунд для ${currentDomain}`);
}

// Запуск відстеження нового таба
async function startTrackingTab(tabId, url) {
  // Зберігаємо час для попереднього домену
  await saveTime();

  const domain = getDomain(url);

  // Перевірка чи це валідний веб-сайт
  if (!domain || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    currentTabId = null;
    currentDomain = null;
    startTime = null;
    return;
  }

  currentTabId = tabId;
  currentDomain = domain;
  startTime = Date.now();

  console.log(`Розпочато відстеження: ${domain}`);
}

// Зупинка відстеження
async function stopTracking() {
  await saveTime();
  currentTabId = null;
  currentDomain = null;
  startTime = null;
}

// Обробник зміни активного таба
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    await startTrackingTab(activeInfo.tabId, tab.url);
  }
});

// Обробник оновлення URL в табі
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tabId === currentTabId) {
    await startTrackingTab(tabId, changeInfo.url);
  }
});

// Обробник закриття таба
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === currentTabId) {
    await stopTracking();
  }
});

// Обробник зміни фокусу вікна
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Вікно втратило фокус
    await saveTime();
    startTime = Date.now(); // Оновлюємо час для можливого відновлення
  } else {
    // Вікно отримало фокус
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId: windowId });
      if (tab && tab.url) {
        await startTrackingTab(tab.id, tab.url);
      }
    } catch (e) {
      console.error('Помилка при отриманні активного таба:', e);
    }
  }
});

// Періодичне збереження даних (кожні 10 секунд)
function startPeriodicSave() {
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  updateInterval = setInterval(async () => {
    if (currentDomain && startTime) {
      await saveTime();
      startTime = Date.now(); // Перезапускаємо лічильник
    }
  }, 10000); // Кожні 10 секунд
}

// Очищення старих даних (старше 30 днів)
async function cleanOldData() {
  const result = await chrome.storage.local.get('dailyData');
  let dailyData = result.dailyData || {};

  const currentDate = new Date();
  const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  Object.keys(dailyData).forEach(date => {
    const dateObj = new Date(date);
    if (dateObj < thirtyDaysAgo) {
      delete dailyData[date];
    }
  });

  await chrome.storage.local.set({ dailyData: dailyData });
}

// Щоденне очищення старих даних (опівночі)
chrome.alarms.create('cleanOldData', { periodInMinutes: 1440 }); // Кожні 24 години

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanOldData') {
    cleanOldData();
  }
});

// Запуск всього відстеження
async function startTracking() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      await startTrackingTab(tab.id, tab.url);
    }
    startPeriodicSave();
  } catch (e) {
    console.error('Помилка при запуску відстеження:', e);
  }
}

// Обробник повідомлень від popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTimeData') {
    chrome.storage.local.get(['timeData', 'dailyData'], (result) => {
      sendResponse({
        timeData: result.timeData || {},
        dailyData: result.dailyData || {}
      });
    });
    return true; // Асинхронна відповідь
  } else if (request.action === 'resetData') {
    chrome.storage.local.set({
      timeData: {},
      dailyData: {}
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
