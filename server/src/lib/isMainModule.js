import { pathToFileURL } from 'node:url';

// True when the file runs as a script (`node file.js`), false when it is imported by another module.
export function isMainModule(moduleUrl) {
  return process.argv[1] !== undefined && moduleUrl === pathToFileURL(process.argv[1]).href;
}
