const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/api/analyze', upload.single('photo'), async (req, res) => {
  const file = req.file;

  // Отправляем фото в API (например, Nutritionix)
  const form = new FormData();
  form.append('image', file.buffer, { filename: file.originalname });

  try {
    const apiResponse = await axios.post('https://api.nutritionix.com/v1_1/process', form, {
      headers: {
        ...form.getHeaders(),
        'x-app-id': 'YOUR_APP_ID',
        'x-app-key': 'YOUR_API_KEY'
      }
    });

    const result = apiResponse.data;

    // Возвращаем калории
    res.json({
      dish: result.foods[0]?.food_name || 'Неизвестно',
      calories: result.foods[0]?.nf_calories || null,
      protein: result.foods[0]?.nf_protein || null,
      fat: result.foods[0]?.nf_total_fat || null,
      carbs: result.foods[0]?.nf_total_carbohydrate || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));