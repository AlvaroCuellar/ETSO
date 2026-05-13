import { createClient } from '@libsql/client';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	buildReportSlugBase,
	buildUniqueReportSlug,
	formatReportDisplayWorkTitle,
	normalizeReportSlugOverrides,
	REPORT_SLUG_PREFIX,
	slugifyReportTitle
} from '../src/lib/utils/report-slug.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const oldCsvPath = path.join(repoRoot, 'old-cetso-informes.csv');
const sqlitePath = path.join(repoRoot, 'deploy', 'input', 'turso', 'etso.sqlite');
const outputDir = path.join(repoRoot, 'reports', 'informe-slugs');
const overridesPath = path.join(repoRoot, 'src', 'lib', 'data', 'informe-slug-overrides.json');
const DESCRIPTOR_PATTERN = /\b(burlesca|auto|entremes|loa|mojiganga|zarzuela|baile|sainete)\b/i;

const parseCsv = (text) => {
	const rows = [];
	let row = [];
	let value = '';
	let quoted = false;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		const next = text[index + 1];
		if (quoted) {
			if (char === '"' && next === '"') {
				value += '"';
				index += 1;
			} else if (char === '"') {
				quoted = false;
			} else {
				value += char;
			}
			continue;
		}
		if (char === '"') {
			quoted = true;
		} else if (char === ',') {
			row.push(value);
			value = '';
		} else if (char === '\n') {
			row.push(value);
			rows.push(row);
			row = [];
			value = '';
		} else if (char !== '\r') {
			value += char;
		}
	}
	if (value || row.length) {
		row.push(value);
		rows.push(row);
	}

	const [header = [], ...body] = rows;
	return body
		.filter((cells) => cells.some((cell) => cell.trim()))
		.map((cells) =>
			Object.fromEntries(header.map((name, index) => [name.trim(), cells[index]?.trim() ?? '']))
		);
};

const toCsv = (rows, columns) => {
	const escape = (value) => {
		const text = value === undefined || value === null ? '' : String(value);
		if (!/[",\n\r]/.test(text)) return text;
		return `"${text.replaceAll('"', '""')}"`;
	};
	return [
		columns.join(','),
		...rows.map((row) => columns.map((column) => escape(row[column])).join(','))
	].join('\n');
};

const splitVariants = (value) =>
	String(value ?? '')
		.split('|')
		.map((variant) => variant.trim())
		.filter(Boolean);

const lastPathSegment = (url) => {
	try {
		const parsed = new URL(url);
		return parsed.pathname.split('/').filter(Boolean).at(-1) ?? '';
	} catch {
		return String(url).split('/').filter(Boolean).at(-1) ?? '';
	}
};

const reportUrl = (slug) => `https://etso.es/informes/${slug}`;

const matchKey = (title) =>
	slugifyReportTitle(formatReportDisplayWorkTitle(String(title ?? '')).replace(/^A\s+/i, ''));

const descriptorKey = (title) =>
	matchKey(
		String(title ?? '')
			.replace(/\([^)]*\)/g, ' ')
			.replace(DESCRIPTOR_PATTERN, ' ')
	);

const addToMapList = (map, key, value) => {
	if (!key) return;
	const values = map.get(key) ?? [];
	values.push(value);
	map.set(key, values);
};

const joinCandidates = (rows) =>
	rows.map((row) => `${row.slug} [${row.title}]`).filter(Boolean).join('; ');

const loadOverrides = async () => {
	try {
		return normalizeReportSlugOverrides(JSON.parse(await readFile(overridesPath, 'utf8')));
	} catch {
		return {};
	}
};

const db = createClient({ url: `file:${sqlitePath}` });

const [oldRowsRaw, workResult, attributionResult, overrides] = await Promise.all([
	readFile(oldCsvPath, 'utf8').then(parseCsv),
	db.execute(`SELECT id, titulo, otrostitulos, resultado1, resultado2
		FROM works
		ORDER BY titulo COLLATE NOCASE`),
	db.execute(`SELECT work_id, attribution_type, raw_expression
		FROM attribution_sets
		ORDER BY work_id, attribution_type`),
	loadOverrides()
]);

const oldRows = oldRowsRaw.map((row, index) => {
	const slug = lastPathSegment(row.url);
	return {
		index,
		title: row.titulo ?? '',
		url: row.url ?? '',
		slug,
		titleKey: matchKey(row.titulo),
		descriptorKey: descriptorKey(row.titulo),
		slugBody: slug.startsWith(REPORT_SLUG_PREFIX) ? slug.slice(REPORT_SLUG_PREFIX.length) : slug
	};
});

const oldBySlug = new Map(oldRows.map((row) => [row.slug, row]));
const oldByTitleKey = new Map();
const oldByDescriptorKey = new Map();
for (const row of oldRows) {
	addToMapList(oldByTitleKey, row.titleKey, row);
	addToMapList(oldByDescriptorKey, row.descriptorKey, row);
}

const attributionByWork = new Map();
for (const row of attributionResult.rows) {
	const current = attributionByWork.get(row.work_id) ?? {};
	current[row.attribution_type] = row.raw_expression ?? '';
	attributionByWork.set(row.work_id, current);
}

const reportSlugCounts = new Map();
const works = workResult.rows
	.map((row) => {
		const title = String(row.titulo ?? '');
		const hasReport = Boolean(String(row.resultado1 ?? '').trim() || String(row.resultado2 ?? '').trim());
		if (!hasReport) return undefined;
		const baseSlug = buildReportSlugBase(title);
		const automaticSlug = buildUniqueReportSlug(baseSlug, reportSlugCounts);
		const finalSlug = overrides[row.id] ?? automaticSlug;
		const variants = splitVariants(row.otrostitulos);
		const titleKey = matchKey(title);
		const variantKeys = variants.map(matchKey).filter(Boolean);
		const workDescriptorKey = descriptorKey(title);
		const attribution = attributionByWork.get(row.id) ?? {};
		return {
			id: String(row.id),
			title,
			variants,
			titleKey,
			variantKeys,
			descriptorKey: workDescriptorKey,
			baseSlug,
			automaticSlug,
			finalSlug,
			traditionalAttribution: attribution.tradicional ?? '',
			stylometryAttribution: attribution.estilometria ?? ''
		};
	})
	.filter(Boolean);

const workByFinalSlug = new Map();
const finalSlugCounts = new Map();
for (const work of works) {
	workByFinalSlug.set(work.finalSlug, work);
	finalSlugCounts.set(work.finalSlug, (finalSlugCounts.get(work.finalSlug) ?? 0) + 1);
}

const worksByTitleKey = new Map();
const worksByBaseSlug = new Map();
for (const work of works) {
	addToMapList(worksByTitleKey, work.titleKey, work);
	addToMapList(worksByBaseSlug, work.baseSlug, work);
}

const consumedOldSlugs = new Set();
const matched = [];
const changed = [];
const newOnly = [];

const candidateOldRowsForWork = (work) => {
	const candidates = new Map();
	for (const candidate of oldByTitleKey.get(work.titleKey) ?? []) candidates.set(candidate.slug, candidate);
	for (const key of work.variantKeys) {
		for (const candidate of oldByTitleKey.get(key) ?? []) candidates.set(candidate.slug, candidate);
	}
	for (const candidate of oldByDescriptorKey.get(work.descriptorKey) ?? []) {
		candidates.set(candidate.slug, candidate);
	}
	return Array.from(candidates.values());
};

for (const work of works) {
	const oldExact = oldBySlug.get(work.finalSlug);
	if (oldExact) {
		consumedOldSlugs.add(oldExact.slug);
		matched.push({
			work_id: work.id,
			title: work.title,
			old_url: oldExact.url,
			new_url: reportUrl(work.finalSlug),
			slug: work.finalSlug
		});
		continue;
	}

	const candidates = candidateOldRowsForWork(work);
	if (candidates.length) {
		for (const candidate of candidates) consumedOldSlugs.add(candidate.slug);
		const hasTitleMatch = candidates.some((candidate) => candidate.titleKey === work.titleKey);
		const hasVariantMatch = work.variantKeys.some((key) =>
			candidates.some((candidate) => candidate.titleKey === key)
		);
		const hasDescriptorMatch =
			(work.descriptorKey !== work.titleKey ||
				candidates.some((candidate) => candidate.descriptorKey !== candidate.titleKey)) &&
			candidates.some((candidate) => candidate.descriptorKey === work.descriptorKey);
		changed.push({
			work_id: work.id,
			title: work.title,
			otrostitulos: work.variants.join(' | '),
			old_url_candidates: candidates.map((candidate) => candidate.url).join('; '),
			old_slug_candidates: joinCandidates(candidates),
			new_url: reportUrl(work.finalSlug),
			new_slug: work.finalSlug,
			automatic_slug: work.automaticSlug,
			evidence: [
				hasTitleMatch ? 'title-match' : '',
				hasVariantMatch ? 'variant-match' : '',
				hasDescriptorMatch ? 'descriptor-match' : ''
			].filter(Boolean).join('; ')
		});
		continue;
	}

	newOnly.push({
		work_id: work.id,
		title: work.title,
		otrostitulos: work.variants.join(' | '),
		new_url: reportUrl(work.finalSlug),
		slug: work.finalSlug
	});
}

const missingOld = oldRows
	.filter((row) => !consumedOldSlugs.has(row.slug))
	.map((row) => ({
		title: row.title,
		old_url: row.url,
		old_slug: row.slug,
		title_key: row.titleKey
	}));

const duplicateGroupKeys = new Set();
for (const [key, rows] of worksByTitleKey) {
	if (rows.length > 1) duplicateGroupKeys.add(`title:${key}`);
}
for (const [key, rows] of worksByBaseSlug) {
	if (rows.length > 1) duplicateGroupKeys.add(`base:${key}`);
}
for (const [key, rows] of oldByTitleKey) {
	if (rows.length > 1) duplicateGroupKeys.add(`old-title:${key}`);
}

const duplicateReviewRows = [];
const addDuplicateReviewRows = (groupWorks, groupLabel) => {
	for (const work of groupWorks) {
		const titleCandidates = oldByTitleKey.get(work.titleKey) ?? [];
		const variantCandidates = work.variantKeys.flatMap((key) => oldByTitleKey.get(key) ?? []);
		const descriptorCandidates = oldByDescriptorKey.get(work.descriptorKey) ?? [];
		const candidates = Array.from(
			new Map(
				[...titleCandidates, ...variantCandidates, ...descriptorCandidates].map((candidate) => [
					candidate.slug,
					candidate
				])
			).values()
		);
		const exactTitleDuplicate = (worksByTitleKey.get(work.titleKey) ?? []).length > 1;
		const hasVariantMatch = variantCandidates.length > 0;
		const hasDescriptorMatch =
			DESCRIPTOR_PATTERN.test(work.title) ||
			work.variants.some((variant) => DESCRIPTOR_PATTERN.test(variant)) ||
			descriptorCandidates.some((candidate) => candidate.titleKey !== work.titleKey);
		const reviewType = exactTitleDuplicate
			? 'exact-title-duplicate'
			: hasVariantMatch
				? 'variant-match'
				: hasDescriptorMatch
					? 'descriptor-match'
					: 'order-ambiguous';

		duplicateReviewRows.push({
			review_type: reviewType,
			group: groupLabel,
			work_id: work.id,
			titulo: work.title,
			otrostitulos: work.variants.join(' | '),
			autoria_tradicional: work.traditionalAttribution,
			autoria_estilometrica: work.stylometryAttribution,
			automatic_slug: work.automaticSlug,
			generated_slug: work.finalSlug,
			old_slug_candidates: joinCandidates(candidates),
			old_title_candidates: candidates.map((candidate) => candidate.title).join(' | '),
			evidence: [
				`duplicate_title_count=${worksByTitleKey.get(work.titleKey)?.length ?? 0}`,
				`duplicate_base_count=${worksByBaseSlug.get(work.baseSlug)?.length ?? 0}`,
				hasVariantMatch ? 'variant_candidates=yes' : '',
				hasDescriptorMatch ? 'descriptor_candidates=yes' : ''
			]
				.filter(Boolean)
				.join('; ')
		});
	}
};

for (const key of duplicateGroupKeys) {
	if (key.startsWith('title:')) {
		const groupKey = key.slice('title:'.length);
		addDuplicateReviewRows(worksByTitleKey.get(groupKey) ?? [], key);
	} else if (key.startsWith('base:')) {
		const groupKey = key.slice('base:'.length);
		addDuplicateReviewRows(worksByBaseSlug.get(groupKey) ?? [], key);
	} else if (key.startsWith('old-title:')) {
		const groupKey = key.slice('old-title:'.length);
		const groupWorks = works.filter((work) => work.titleKey === groupKey || work.variantKeys.includes(groupKey));
		addDuplicateReviewRows(groupWorks, key);
	}
}

const duplicateReviewByWorkId = new Map();
for (const row of duplicateReviewRows) {
	const existing = duplicateReviewByWorkId.get(row.work_id);
	if (!existing) {
		duplicateReviewByWorkId.set(row.work_id, row);
		continue;
	}
	existing.group = Array.from(new Set(`${existing.group}; ${row.group}`.split('; '))).join('; ');
	existing.evidence = Array.from(new Set(`${existing.evidence}; ${row.evidence}`.split('; ')))
		.filter(Boolean)
		.join('; ');
	if (!existing.old_slug_candidates && row.old_slug_candidates) {
		existing.old_slug_candidates = row.old_slug_candidates;
	}
	if (!existing.old_title_candidates && row.old_title_candidates) {
		existing.old_title_candidates = row.old_title_candidates;
	}
}

const duplicateReview = Array.from(duplicateReviewByWorkId.values()).sort(
	(a, b) => a.titulo.localeCompare(b.titulo, 'es') || a.work_id.localeCompare(b.work_id)
);

const manualRowsByWorkId = new Map();
for (const row of changed) {
	const candidates = row.old_slug_candidates
		.split('; ')
		.map((candidate) => candidate.split(' [')[0])
		.filter(Boolean);
	manualRowsByWorkId.set(row.work_id, {
		work_id: row.work_id,
		title: row.title,
		otrostitulos: row.otrostitulos,
		automatic_slug: row.automatic_slug,
		current_generated_slug: row.new_slug,
		desired_report_slug: candidates.length === 1 ? candidates[0] : '',
		reason: row.evidence || 'changed',
		old_slug_candidates: row.old_slug_candidates
	});
}
for (const row of duplicateReview) {
	if (manualRowsByWorkId.has(row.work_id)) continue;
	const candidates = row.old_slug_candidates
		.split('; ')
		.map((candidate) => candidate.split(' [')[0])
		.filter(Boolean);
	manualRowsByWorkId.set(row.work_id, {
		work_id: row.work_id,
		title: row.titulo,
		otrostitulos: row.otrostitulos,
		automatic_slug: row.automatic_slug,
		current_generated_slug: row.generated_slug,
		desired_report_slug: candidates.length === 1 ? candidates[0] : '',
		reason: row.review_type,
		old_slug_candidates: row.old_slug_candidates
	});
}

const overrideDiagnostics = [];
for (const [workId, overrideSlug] of Object.entries(overrides)) {
	const work = works.find((candidate) => candidate.id === workId);
	const oldExists = oldBySlug.has(overrideSlug);
	const duplicated = (finalSlugCounts.get(overrideSlug) ?? 0) > 1;
	let status = 'ok';
	if (!work) status = 'unknown-work';
	else if (duplicated) status = 'duplicate-final-slug';
	else if (work.automaticSlug === overrideSlug) status = 'already-automatic';
	else if (!oldExists) status = 'old-slug-not-found';
	overrideDiagnostics.push({
		work_id: workId,
		title: work?.title ?? '',
		override_slug: overrideSlug,
		automatic_slug: work?.automaticSlug ?? '',
		status,
		detail: oldExists ? 'present-in-old-csv' : 'not-present-in-old-csv'
	});
}

await mkdir(outputDir, { recursive: true });
await Promise.all([
	writeFile(
		path.join(outputDir, 'matched.csv'),
		toCsv(matched, ['work_id', 'title', 'old_url', 'new_url', 'slug'])
	),
	writeFile(
		path.join(outputDir, 'new-only.csv'),
		toCsv(newOnly, ['work_id', 'title', 'otrostitulos', 'new_url', 'slug'])
	),
	writeFile(
		path.join(outputDir, 'missing-old.csv'),
		toCsv(missingOld, ['title', 'old_url', 'old_slug', 'title_key'])
	),
	writeFile(
		path.join(outputDir, 'changed.csv'),
		toCsv(changed, [
			'work_id',
			'title',
			'otrostitulos',
			'old_url_candidates',
			'old_slug_candidates',
			'new_url',
			'new_slug',
			'automatic_slug',
			'evidence'
		])
	),
	writeFile(
		path.join(outputDir, 'duplicates-review.csv'),
		toCsv(duplicateReview, [
			'review_type',
			'group',
			'work_id',
			'titulo',
			'otrostitulos',
			'autoria_tradicional',
			'autoria_estilometrica',
			'automatic_slug',
			'generated_slug',
			'old_slug_candidates',
			'old_title_candidates',
			'evidence'
		])
	),
	writeFile(
		path.join(outputDir, 'manual-overrides-template.csv'),
		toCsv(Array.from(manualRowsByWorkId.values()), [
			'work_id',
			'title',
			'otrostitulos',
			'automatic_slug',
			'current_generated_slug',
			'desired_report_slug',
			'reason',
			'old_slug_candidates'
		])
	),
	writeFile(
		path.join(outputDir, 'override-diagnostics.csv'),
		toCsv(overrideDiagnostics, [
			'work_id',
			'title',
			'override_slug',
			'automatic_slug',
			'status',
			'detail'
		])
	),
	writeFile(
		path.join(outputDir, 'summary.json'),
		`${JSON.stringify(
			{
				oldCsvRows: oldRows.length,
				oldUniqueSlugs: oldBySlug.size,
				dbInformeRows: works.length,
				matched: matched.length,
				changed: changed.length,
				newOnly: newOnly.length,
				missingOld: missingOld.length,
				duplicatesReview: duplicateReview.length,
				manualOverridesTemplate: manualRowsByWorkId.size,
				overrides: Object.keys(overrides).length
			},
			null,
			2
		)}\n`
	)
]);

console.log(`Old CSV rows: ${oldRows.length}`);
console.log(`DB informes: ${works.length}`);
console.log(`Matched: ${matched.length}`);
console.log(`Changed/probable: ${changed.length}`);
console.log(`New only: ${newOnly.length}`);
console.log(`Missing old: ${missingOld.length}`);
console.log(`Duplicate review rows: ${duplicateReview.length}`);
console.log(`Reports written to ${path.relative(repoRoot, outputDir)}`);
