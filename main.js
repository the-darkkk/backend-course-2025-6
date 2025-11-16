import { program } from 'commander'
import * as fs from 'fs/promises';
import express from 'express';
import path from 'path';

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

app.get('/', (_req, res) => {
  res.send('test');
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
