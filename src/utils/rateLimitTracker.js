const store = new Map();

const DAILY_LIMIT = 100;
const WINDOW_MS = 24*60 * 60 * 1000;

function getRecord(userId) {
    const now = Date.now();

    if(!store.has(userId)) {
        store.set(userId, {count: 0, windowStart: now});
    }

    const record = store.get(userId);
    if(now - record.windowStart > WINDOW_MS) {
        record.count = 0;
        record.windowStart = now;
    }

    return record;
}

function increment(userId) {
    const record = getRecord(userId);
    record.count += 1;
    store.set(userId, record);
}

function getUsage(userId) {
    const record  = getRecord(userId);
    const now = Date.now();
    const elpsed = now  - record.windowStart;
    const resetAt = new Date(record.windowStart + WINDOW_MS).toISOString();

    return {
        userId,
        used: record.count,
        remaining: Math.max(0, DAILY_LIMIT - record.count),
        limit: DAILY_LIMIT,
        resetAt,
        windowAge: `${Math.floor(elpsed / 1000 / 60)} Minutes`,
        isExhausted: record.count >= DAILY_LIMIT,
    };
}

function getAllUsage() {
    return Array.from(store.keys()).map(getUsage);
}

export {increment, getUsage, getAllUsage};
