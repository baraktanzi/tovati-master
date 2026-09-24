import fs from 'node:fs/promises';
await fs.rm('public',{recursive:true,force:true});
await fs.mkdir('public',{recursive:true});
await fs.copyFile('index.html','public/index.html');
console.log('Mood Travel AI preview ready');
