import fs from 'fs';

export const readTextFile = (name: string) => fs.readFileSync(name).toString('utf-8');

export const appendToFile = (path: string, data: string) => fs.appendFileSync(path, `${data}\n`);
