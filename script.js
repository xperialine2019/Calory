// Проверка, что это запущено в Telegram Web App
if (window.Telegram && window.Telegram.WebApp) {
  Telegram.WebApp.ready();
  const MainButton = Telegram.WebApp.MainButton;
  MainButton.setText("Отправить фото");
  MainButton.show();
}

const photoInput = document.getElementById('photoInput');
const uploadBtn = document.getElementById('uploadBtn');
const galleryBtn = document.getElementById('galleryBtn');
const weightInput = document.getElementById('weightInput');
const dishWeightInput = document.getElementById('dishWeight');
const resultDiv = document.getElementById('result');
const saveBtn = document.getElementById('saveBtn');
const historyBtn = document.getElementById('historyBtn');
const historyDiv = document.getElementById('history');
const historyList = document.getElementById('historyList');
const actionsDiv = document.querySelector('.actions');

// Ваши API-ключи
const CLARIFAI_PAT = '74e31e88798e4c13940b37a502b934e0';
const DEEPSEEK_API_KEY = 'sk-040e926efe4a4f8e8ca78db3d7838671';

// Функция для распознавания блюда через Clarifai
async function recognizeDishWithClarifai(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('https://api.clarifai.com/v2/models/food-image-recognition/outputs', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${CLARIFAI_PAT}`
    },
    body: formData
  });

  const data = await response.json();
  const concepts = data.outputs[0].data.concepts;

  // Берем самый вероятный тег (первый)
  return concepts[0]?.name || 'Неизвестно';
}

// Функция для генерации калорий и БЖУ с помощью DeepSeek
async function analyzeDishWithDeepSeek(dish) {
  const prompt = `Ты диетолог. Определи примерную калорийность (в ккал), белки (г), жиры (г) и углеводы (г) на 100 грамм блюда: "${dish}". Ответь в формате JSON: { "calories": ..., "protein": ..., "fat": ..., "carbs": ... }`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 200
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Парсим JSON из ответа
  const match = content.match(/```json\n([\s\S]*?)\n```|{[\s\S]*?}/);
  if (match) {
    return JSON.parse(match[1] || match[0]);
  } else {
    throw new Error('Не удалось распознать JSON из ответа');
  }
}

// Функция для генерации совета с помощью DeepSeek
async function generateAdviceWithDeepSeek(calories, dish) {
  const prompt = `Ты диетолог. Пользователь съел блюдо "${dish}", которое содержит ${calories} ккал. Дай короткий и полезный совет по питанию.`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 100
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// Функция для отображения результата
async function showResult(data) {
  const weight = parseInt(dishWeightInput.value) || 100; // по умолчанию 100 г

  // Пересчёт калорий и БЖУ на указанный вес
  const scale = weight / 100;
  const scaledCalories = (data.calories * scale).toFixed(2);
  const scaledProtein = (data.protein * scale).toFixed(2);
  const scaledFat = (data.fat * scale).toFixed(2);
  const scaledCarbs = (data.carbs * scale).toFixed(2);

  resultDiv.innerHTML = `
    <strong>Блюдо:</strong> ${data.dish}<br>
    <strong>Вес:</strong> ${weight} г<br>
    <strong>Калории:</strong> ${scaledCalories} ккал<br>
    <strong>Белки:</strong> ${scaledProtein} г<br>
    <strong>Жиры:</strong> ${scaledFat} г<br>
    <strong>Углеводы:</strong> ${scaledCarbs} г
  `;

  // Генерация совета с DeepSeek
  try {
    const advice = await generateAdviceWithDeepSeek(scaledCalories, data.dish);
    resultDiv.innerHTML += `<br><strong>Совет:</strong> ${advice}`;
  } catch (err) {
    console.error('Ошибка при генерации совета:', err);
  }

  resultDiv.classList.remove('hidden');
  actionsDiv.classList.remove('hidden');
}

// Загрузка фото через камеру
uploadBtn.addEventListener('click', () => {
  photoInput.click();
});

// Загрузка фото из галереи
galleryBtn.addEventListener('click', () => {
  photoInput.click();
});

// После выбора фото показываем поле для ввода веса
photoInput.addEventListener('change', (e) => {
  weightInput.classList.remove('hidden');
});

// Обработка загрузки файла
MainButton.onClick(() => {
  const file = photoInput.files[0];
  if (!file) {
    resultDiv.innerHTML = 'Пожалуйста, выберите фото.';
    resultDiv.classList.remove('hidden');
    return;
  }

  resultDiv.innerHTML = 'Обработка...';
  resultDiv.classList.remove('hidden');
  actionsDiv.classList.add('hidden');

  recognizeDishWithClarifai(file)
    .then(dish => analyzeDishWithDeepSeek(dish))
    .then(data => {
      data.dish = dish;
      showResult(data);
    })
    .catch(err => {
      resultDiv.innerHTML = 'Ошибка: ' + err.message;
    });
});

// Сохранение блюда
saveBtn.addEventListener('click', () => {
  const dish = resultDiv.querySelector('strong').nextSibling.textContent;
  const calories = resultDiv.innerHTML.match(/Калории: ([\d.]+)/)?.[1] || 'N/A';
  const weight = resultDiv.innerHTML.match(/Вес: ([\d.]+)/)?.[1] || 'N/A';
  const date = new Date().toLocaleDateString();

  const savedItems = JSON.parse(localStorage.getItem('calorieHistory')) || [];
  savedItems.push({ dish, calories, weight, date });
  localStorage.setItem('calorieHistory', JSON.stringify(savedItems));

  alert('Блюдо сохранено!');
});

// Показ истории
historyBtn.addEventListener('click', () => {
  const savedItems = JSON.parse(localStorage.getItem('calorieHistory')) || [];
  if (savedItems.length === 0) {
    historyList.innerHTML = '<li>Нет сохранённых блюд</li>';
  } else {
    historyList.innerHTML = savedItems.map(item => `
      <li>
        <strong>${item.dish}</strong><br>
        Калории: ${item.calories} ккал | Вес: ${item.weight} г | ${item.date}
      </li>
    `).join('');
  }
  historyDiv.classList.remove('hidden');
});