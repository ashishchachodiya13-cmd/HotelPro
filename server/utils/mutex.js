// Tiny keyed async mutex. Serialises critical sections (e.g. "check availability then insert")
// per room inside ONE Node process. For multi-instance deployments use a MongoDB replica set
// with transactions or a distributed lock instead (see README).
const tails = new Map();

async function withLock(key, fn) {
  const prev = tails.get(key) || Promise.resolve();
  let release;
  const next = new Promise((r) => (release = r));
  const tail = prev.then(() => next);
  tails.set(key, tail);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (tails.get(key) === tail) tails.delete(key);
  }
}

module.exports = { withLock };
