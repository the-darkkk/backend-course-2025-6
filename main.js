import { program } from 'commander'
import * as fs from 'fs/promises';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

program
  .option('-h, --host <type>', 'Server host')
  .option('-p, --port <type>', 'Server port')
  .option('-c, --cache <type>', 'Cache folder path');

program.parse(process.argv);
const options = program.opts();

if (!options.host || !options.port || !options.cache) {
  console.error('Error : please specify the neccesary input parameters! (host, port and cache folder)');
  process.exit(1);
}

const app = express();
const cache_path = path.resolve(options.cache);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: cache_path,
  filename: (_req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const newName = Date.now() + fileExt; 
    cb(null, newName);
  }
});
const upload = multer({ storage: storage });

app.get('/', (_req, res) => {
  res.send('test');
});

app.get('/RegisterForm.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'RegisterForm.html'));
});

app.get('/SearchForm.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'SearchForm.html'));
});

app.post('/register', upload.single('photo'), async (req, res) => {
  try {
    const { inventory_name, description } = req.body;
    if (!inventory_name) {
      return res.status(400).send('Error: "inventory_name" is required.');
    }
    let inventory = [];
    try {
      const dbData = await fs.readFile(path.join(cache_path, 'db.json'), 'utf8');
      inventory = JSON.parse(dbData);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err; 
    }
    
    const maxId = inventory.reduce((max, item) => Math.max(max, item.id), 0);
    const newId = maxId + 1;
    const photoName = req.file ? req.file.filename : null;

    const newItem = {
      id: newId, 
      name: inventory_name,
      description: description || '',
      photo: photoName 
    };

    inventory.push(newItem);
    await fs.writeFile(path.join(cache_path, 'db.json'), JSON.stringify(inventory, null, 2));

    console.log(`Registered item ${newId} with photo ${photoName}`);
    res.status(201).json(newItem);

  } catch (err) {
    console.error('Error processing /register request:', err);
    res.status(500).send('Internal Server Error');
  }
});

(async () => {
  try {
    await fs.mkdir(cache_path, { recursive: true });
    console.log('Cache folder directory', cache_path);
    app.listen(options.port, options.host, () => {
      console.log(`Server started on http://${options.host}:${options.port}`);
    });
  } catch (err) {
    console.error('Error :', err.message);
    process.exit(1);
  }
})();
