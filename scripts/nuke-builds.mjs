import { deleteAsync } from 'del';

const toDelete = ['node_modules/.cache', 'dist'];
const projectFolders = ['lib', 'rumpus', 'stitch'];
const outPaths = [
  'build',
  'dist',
  'app',
  'out',
  '.svelte-kit',
  '.turbo',
  '*.tsbuildinfo',
  'cdk.out',
];

for (const projectFolder of projectFolders) {
  for (const outPath of outPaths) {
    toDelete.push(`${projectFolder}/*/${outPath}`);
  }
}

await deleteAsync(toDelete);
