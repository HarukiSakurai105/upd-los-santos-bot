import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataDir = path.resolve('data');
const dataFile = path.join(dataDir, 'guilds.json');
let queue = Promise.resolve();

async function readAll() {
  try {
    return JSON.parse(await readFile(dataFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

async function writeAll(data) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function getGuildData(guildId) {
  await queue.catch(() => undefined);
  const all = await readAll();
  return all[guildId] || { roles: {}, channels: {}, warnings: {}, tickets: 0, setupComplete: false };
}

export function updateGuildData(guildId, updater) {
  const operation = queue.catch(() => undefined).then(async () => {
    const all = await readAll();
    const current = all[guildId] || { roles: {}, channels: {}, warnings: {}, tickets: 0, setupComplete: false };
    all[guildId] = await updater(current);
    await writeAll(all);
    return all[guildId];
  });
  queue = operation.catch(() => undefined);
  return operation;
}
