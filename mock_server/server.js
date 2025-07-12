const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 4000; // 任意のポート、Reactと競合しないように

app.use(cors());
app.use(bodyParser.json());

let currentCredits = 250; // 初期クレジット

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'demo_user' && password === 'demo_pass') {
    const carPhotoAngles = ['front', 'side', 'rear', 'front_angled_7_3', 'rear_angled_7_3'];
    const angleLabels = {
      front: 'フロント正面',
      side: '真横',
      rear: 'リア正面',
      front_angled_7_3: '斜め前 7:3',
      rear_angled_7_3: '斜め後 7:3'
    };

    const defaultPersonalUserSettings = {
      numberManagement: {
        licensePlateText: '',
        logoMarkImageUrl: null,
        originalNumberImageUrl: null
      },
      referenceRegistration: {
        favoriteCarName: '',
        carPhotos: carPhotoAngles.map(angle => ({
          viewAngle: angle,
          label: angleLabels[angle],
          imageUrl: null
        }))
      }
    };

    const user = {
      name: 'モックユーザー',
      credits: currentCredits,
      personalSettings: defaultPersonalUserSettings
    };

    res.json(user);
  } else {
    res.status(401).json({ message: '認証失敗：ユーザー名またはパスワードが違います。' });
  }
});

app.post('/api/logout', (req, res) => {
  res.status(200).json({ message: 'ログアウトしました' });
});

// ##### Credits #####
app.get('/api/credits', (req, res) => {
  res.json({ credits: currentCredits });
});

app.post('/api/credits/charge', (req, res) => {
  const { credits } = req.body;
  if (typeof credits !== 'number') {
    return res.status(400).json({ error: 'Invalid credits' });
  }

  currentCredits += credits;

  res.json({ newCredits: currentCredits });
});

app.post('/api/credits/consume', (req, res) => {
  const { credits } = req.body;
  if (typeof credits !== 'number') {
    return res.status(400).json({ error: 'Invalid credits' });
  }

  currentCredits -= credits;

  res.json({ newCredits: currentCredits });
});
// ##########################

// ##### Charge Options #####
// メモリ内DB
let chargeOptions = []; 
let currentId = 1;

app.get('/api/charge-options', (req, res) => {
  res.json(chargeOptions);
});

app.get('/api/charge-options/:id', (req, res) => {
  const item = chargeOptions.find(opt => opt.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.post('/api/charge-options', (req, res) => {
  const { name, price_yen, credits_awarded, credits_bonus, display_info, is_active } = req.body;
  const newItem = {
    id: currentId++,
    name,
    price_yen,
    credits_awarded,
    credits_bonus,
    display_info,
    is_active
  };
  chargeOptions.push(newItem);
  res.status(201).json(newItem);
});

app.put('/api/charge-options/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = chargeOptions.findIndex(opt => opt.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const updated = {
    ...chargeOptions[index],
    ...req.body,
    id // IDは固定
  };
  chargeOptions[index] = updated;
  res.json(updated);
});

app.delete('/api/charge-options/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = chargeOptions.findIndex(opt => opt.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const deleted = chargeOptions.splice(index, 1)[0];
  res.json(deleted);
});
// ##########################

app.listen(port, () => {
  console.log(`Mock API server is running at http://localhost:${port}`);
});
