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
const database_path = path.join(cache_path, 'db.json')
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
      const dbData = await fs.readFile(database_path, 'utf8');
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
    await fs.writeFile(database_path, JSON.stringify(inventory, null, 2));

    console.log(`Registered item ${newId} with photo ${photoName}`);
    res.status(201).json(newItem);

  } catch (err) {
    console.error('Error processing /register request:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/inventory/:id/photo', async (req, res) => {
  try {
    const requestedId = parseInt(req.params.id, 10);
    if (isNaN(requestedId)) {
      return res.status(400).send('Invalid ID.');
    }
    let dbData;
    try {
      dbData = await fs.readFile(database_path, 'utf8');
    } catch (dbErr) {
      if (dbErr.code === 'ENOENT') {
        return res.status(404).send('Inventory database not found.');
      }
      throw dbErr;
    }

    const inventory = JSON.parse(dbData);
    const item = inventory.find(i => i.id === requestedId);

    if (!item) {
      return res.status(404).send(`Item with ID ${requestedId} not found.`);
    }
    if (!item.photo) {
      return res.status(404).send('Item has no photo.');
    }
    const photoPath = path.join(cache_path, item.photo);
    
    res.sendFile(photoPath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.status(404).send('Photo file not found on disk.');
        } else {
          console.error('Error sending file:', err);
          res.status(500).send('Server error sending file.');
        }
      }
    });

  } catch (err) {
    console.error('Error processing /inventory/:id/photo', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/inventory', async (_req, res) => {
  try {
    const dbData = await fs.readFile(database_path, 'utf8');
    const inventory = JSON.parse(dbData);
    const inventoryWithUrls = inventory.map(item => {
      const { photo, ...rest } = item;
      if (photo) {
        return {
          ...rest,
          photo_url: `/inventory/${item.id}/photo`
        };
      }
      return rest;
    });
    res.json(inventoryWithUrls);

  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).send('Inventory database not found.');
    } else {
      console.error('Error reading db.json:', err);
      res.status(500).send('Server Error');
    }
  }
});

app.get('/inventory/:id', async (req, res) => {
  try {
    const requestedId = parseInt(req.params.id, 10);
    if (isNaN(requestedId)) {
      return res.status(400).send('Invalid ID. Must be a number.');
    }
    let dbData;
    try {
      dbData = await fs.readFile(database_path, 'utf8');
    } catch (dbErr) {
      if (dbErr.code === 'ENOENT') {
        return res.status(404).send('Inventory database not found.');
      }
      throw dbErr;
    }
    const inventory = JSON.parse(dbData);
    const item = inventory.find(i => i.id === requestedId);

    if (!item) {
      return res.status(404).send(`Item with ID ${requestedId} not found.`);
    }
    const { photo, ...rest } = item;
    let itemResponse;
    if (photo) {
      itemResponse = {
        ...rest,
        photo_url: `/inventory/${item.id}/photo`
      };
    } else {
      itemResponse = rest;
    }
    res.json(itemResponse);
  } catch (err) {
    console.error('Error processing /inventory/:id', err);
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
