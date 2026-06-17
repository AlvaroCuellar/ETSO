interface RateLimitRule {
	name: string;
	windowMs: number;
	max: number;
}

interface RateLimitState {
	count: number;
	resetAt: number;
}

export interface RateLimitResult {
	limited: boolean;
	remaining: number;
	retryAfterSeconds: number;
	resetAt: number;
}

const buckets = new Map<string, RateLimitState>();
let lastPruneAt = 0;

const pruneExpiredBuckets = (now: number): void => {
	if (now - lastPruneAt < 60_000) return;
	lastPruneAt = now;

	for (const [key, state] of buckets) {
		if (state.resetAt <= now) buckets.delete(key);
	}
};

export const checkRateLimit = (key: string, rule: RateLimitRule, now = Date.now()): RateLimitResult => {
	pruneExpiredBuckets(now);

	const bucketKey = `${rule.name}:${key}`;
	const current = buckets.get(bucketKey);
	const state =
		current && current.resetAt > now
			? current
			: {
					count: 0,
					resetAt: now + rule.windowMs
				};

	state.count += 1;
	buckets.set(bucketKey, state);

	const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
	const remaining = Math.max(0, rule.max - state.count);

	return {
		limited: state.count > rule.max,
		remaining,
		retryAfterSeconds,
		resetAt: state.resetAt
	};
};
