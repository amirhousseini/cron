const { opendirSync } = require('node:fs');
const { join } = require('node:path');

try {
  const dir = opendirSync('./');
  
  let dirent, files = [], directories = [];
  while ((dirent = dir.readSync())) {
    if (dirent.isFile()) files.push(join(dirent.parentPath, dirent.name));
    else if (dirent.isDirectory()) directories.push(join(dirent.parentPath, dirent.name));
  }
  console.log(files.sort());
  console.log(directories.sort());
  //for (const dirent of dir)
  //  console.log(dirent.name);
} catch (err) {
  console.error(err);
}