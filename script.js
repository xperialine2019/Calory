// Проверка, что это запущено в Telegram Web App
if (window.Telegram && window.Telegram.WebApp) {
  Telegram.WebApp.ready();
  const MainButton = Telegram.WebApp.MainButton;
  MainButton.setText("Отправить фото");
  MainButton.show();
}

const photoInput = document.getElementById('photoInput');
const uploadBtn = document.getElementById('uploadBtn');
const resultDiv = document.getElementById('result');

uploadBtn.addEventListener('click', () => {
  photoInput.click();
});

photoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    MainButton.enable();
    MainButton.show();
  }
});

MainButton.onClick(() => {
  const file = photoInput.files[0];
  if (!file) {
    resultDiv.innerHTML = 'Пожалуйста, выберите фото.';
    return;
  }

  const formData = new FormData();
  formData.append('photo', file);

  resultDiv.innerHTML = 'Обработка...';

  // Отправка фото на ваш сервер (замените URL)
  fetch('https://your-server.com/api/analyze', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    resultDiv.innerHTML = `
      <strong>Блюдо:</strong> ${data.dish || 'Неизвестно'}<br>
      <strong>Калории:</strong> ${data.calories || 'N/A'} ккал<br>
      <strong>Белки:</strong> ${data.protein || 'N/A'} г<br>
      <strong>Жиры:</strong> ${data.fat || 'N/A'} г<br>
      <strong>Углеводы:</strong> ${data.carbs || 'N/A'} г
    `;
  })
  .catch(err => {
    resultDiv.innerHTML = 'Ошибка: ' + err.message;
  });
});