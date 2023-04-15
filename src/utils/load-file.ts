import fs from 'fs';

export const readTextFile = (name: string) => fs.readFileSync(name).toString('utf-8');