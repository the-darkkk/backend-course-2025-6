import { program } from 'commander'
import * as fs from 'fs/promises';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

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

app.get('/', (_req, res) => {
  res.send('test');
});

app.get('/RegisterForm.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'RegisterForm.html'));
});

app.get('/SearchForm.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'SearchForm.html'));
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
