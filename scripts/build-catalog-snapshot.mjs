import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ROOT = process.cwd();
const DB_PATH = resolve(ROOT, 'data', 'sqlite', 'etso-prueba.sqlite');
const TEXTS_DIR = resolve(ROOT, 'data', 'texts');
const SUMMARIES_DIR = resolve(ROOT, 'data', 'resumenes');
const OUTPUT_PATH = resolve(ROOT, 'src', 'lib', 'server', 'generated', 'catalog-snapshot.generated.json');
const UNRESOLVED_AUTHOR_ID = 'no_apunta_a_ningun_autor';
const AMBITOS = new Set(['obracompleta', 'jornada1', 'jornada2', 'jornada3', 'jornada4', 'jornada5']);

const splitVariants = (value) => {
	if (!value) return [];
	return value
		.split(/\s*[|;]\s*/)
		.map((chunk) => chunk.trim())
		.filter((chunk) => chunk.length > 0);
};

const slugify = (value) =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

const normalizeConfidence = (raw) => {
	if (!raw) return undefined;
	const value = raw.toLowerCase().trim();
	if (value === 'segura') return 'segura';
	if (value === 'probable') return 'probable';
	if (value === 'posible') return 'posible';
	if (value === 'no_concluyente' || value === 'sin_confianza') return 'no_concluyente';
	return undefined;
};

const resolveConnector = (rawExpression) => (/\bOR\b/i.test(rawExpression) ? 'or' : 'and');

const ensureDistanceRecord = () => ({
	obracompleta: [],
	jornada1: [],
	jornada2: [],
	jornada3: [],
	jornada4: [],
	jornada5: []
});

const hasAnyDistanceRows = (distances) => Object.values(distances).some((rows) => rows.length > 0);

const resolveWorkBaseSlug = (row) => {
	const preferred = row.slug?.trim() ? slugify(row.slug) : '';
	if (preferred) return preferred;

	const fromTitle = slugify(row.titulo ?? '');
	if (fromTitle) return fromTitle;

	const fromId = slugify(row.id ?? '');
	if (fromId) return fromId;

	return 'obra';
};

const parseSummaryFile = (workId) => {
	const filePath = join(SUMMARIES_DIR, `${workId}.json`);
	if (!existsSync(filePath)) return {};

	try {
		const raw = readFileSync(filePath, 'utf8');
		const parsed = JSON.parse(raw);
		const shortSummary = Array.isArray(parsed.resumen_breve)
			? parsed.resumen_breve.map((paragraph) => paragraph.trim()).filter(Boolean).join('\n\n')
			: undefined;
		const longSummary = Array.isArray(parsed.resumen_largo)
			? parsed.resumen_largo.map((paragraph) => paragraph.trim()).filter(Boolean).join('\n\n')
			: undefined;

		return {
			shortSummary,
			longSummary
		};
	} catch {
		return {};
	}
};

const memberNameFromId = (authorId, authorMap) => {
	const author = authorMap.get(authorId);
	if (author) return author.name;
	return authorId
		.split('_')
		.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
		.join(' ');
};

if (!existsSync(DB_PATH)) {
	throw new Error(`No se encontro la base de datos local en ${DB_PATH}`);
}

const textIds = new Set(
	existsSync(TEXTS_DIR)
		? readdirSync(TEXTS_DIR)
				.filter((entry) => extname(entry).toLowerCase() === '.txt')
				.map((entry) => entry.slice(0, -4))
		: []
);

const db = new DatabaseSync(DB_PATH, { readOnly: true });

try {
	const authorRows = db
		.prepare(
			`SELECT id, nombre, variaciones_nombre
			 FROM authors
			 ORDER BY nombre COLLATE NOCASE`
		)
		.all();

	const authors = authorRows.map((row) => ({
		id: row.id,
		name: row.nombre,
		nameVariants: splitVariants(row.variaciones_nombre)
	}));
	const authorById = new Map(authors.map((author) => [author.id, author]));

	const attributionRows = db
		.prepare(
			`SELECT
				s.id AS set_id,
				s.work_id,
				s.attribution_type,
				s.raw_expression,
				g.id AS group_id,
				g.group_order,
				m.author_id,
				m.member_order,
				m.confianza
			 FROM attribution_sets s
			 LEFT JOIN attribution_groups g ON g.attribution_set_id = s.id
			 LEFT JOIN attribution_members m ON m.attribution_group_id = g.id
			 ORDER BY s.work_id, s.attribution_type, g.group_order, m.member_order`
		)
		.all();

	const tempSets = new Map();
	for (const row of attributionRows) {
		if (!tempSets.has(row.set_id)) {
			tempSets.set(row.set_id, {
				workId: row.work_id,
				attributionType: row.attribution_type,
				rawExpression: row.raw_expression,
				groups: new Map()
			});
		}

		const set = tempSets.get(row.set_id);
		if (row.group_id == null || row.group_order == null) continue;

		if (!set.groups.has(row.group_id)) {
			set.groups.set(row.group_id, {
				order: row.group_order,
				members: []
			});
		}

		if (row.author_id) {
			set.groups.get(row.group_id).members.push({
				memberOrder: row.member_order ?? 0,
				authorId: row.author_id,
				confidence: row.confianza
			});
		}
	}

	const attributionByWorkType = new Map();
	for (const set of tempSets.values()) {
		const sortedGroups = [...set.groups.values()]
			.sort((a, b) => a.order - b.order)
			.map((group) => ({
				members: group.members
					.sort((a, b) => a.memberOrder - b.memberOrder)
					.map((member) => ({
						authorId: member.authorId,
						authorName: memberNameFromId(member.authorId, authorById),
						confidence: normalizeConfidence(member.confidence)
					}))
			}))
			.filter((group) => group.members.length > 0);

		const unresolved =
			set.rawExpression.toLowerCase().includes(UNRESOLVED_AUTHOR_ID) ||
			sortedGroups.some((group) =>
				group.members.some((member) => member.authorId === UNRESOLVED_AUTHOR_ID)
			);

		attributionByWorkType.set(
			`${set.workId}::${set.attributionType}`,
			unresolved
				? {
						groups: [],
						connector: 'and',
						unresolved: true
					}
				: {
						groups: sortedGroups,
						connector: resolveConnector(set.rawExpression)
					}
		);
	}

	const textAccessRows = db
		.prepare(
			`SELECT work_id, tipo, etiqueta, url, position
			 FROM text_access
			 ORDER BY work_id, position`
		)
		.all();
	const textAccessByWork = new Map();
	for (const row of textAccessRows) {
		if (!textAccessByWork.has(row.work_id)) {
			textAccessByWork.set(row.work_id, []);
		}
		textAccessByWork.get(row.work_id).push({
			label: row.etiqueta || row.tipo || 'Acceso externo',
			href: row.url,
			kind: 'texto_externo',
			external: true
		});
	}

	const distanceRows = db
		.prepare(
			`SELECT work_id, ambito, rank, related_work_id, distancia
			 FROM work_distances
			 ORDER BY work_id, ambito, rank`
		)
		.all();
	const distancesByWork = new Map();
	for (const row of distanceRows) {
		if (!AMBITOS.has(row.ambito)) continue;
		if (!distancesByWork.has(row.work_id)) {
			distancesByWork.set(row.work_id, ensureDistanceRecord());
		}
		distancesByWork.get(row.work_id)[row.ambito].push({
			rank: row.rank,
			relatedWorkId: row.related_work_id,
			distancia: row.distancia
		});
	}

	const worksTableColumns = db.prepare('PRAGMA table_info(works)').all();
	const hasWorkSlugColumn = worksTableColumns.some((column) => column.name === 'slug');

	const workRows = db
		.prepare(
			`SELECT id, ${hasWorkSlugColumn ? 'slug' : 'NULL AS slug'}, titulo, variaciones_titulo, genero, adicion, estado_texto,
			 examen_autorias, bicuve, bicuve_nombre, tiene_acceso_externo,
			 procede, resultado1, resultado2, resumen_breve
			 FROM works
			 WHERE examen_autorias = 1
			 ORDER BY titulo COLLATE NOCASE`
		)
		.all();

	const slugCounts = new Map();
	const bicuveNameByWorkId = new Map();

	const works = workRows.map((row) => {
		const summaries = parseSummaryFile(row.id);
		const traditionalAttribution =
			attributionByWorkType.get(`${row.id}::tradicional`) ?? { groups: [], connector: 'and' };
		const stylometryAttribution =
			attributionByWorkType.get(`${row.id}::estilometria`) ?? { groups: [], connector: 'and' };

		const links = [];
		if (Number(row.bicuve) === 1 && textIds.has(row.id)) {
			const label = row.bicuve_nombre?.trim()
				? `Texto BICUVE (${row.bicuve_nombre.trim()})`
				: 'Texto BICUVE';
			links.push({
				label,
				href: `/bicuve/${row.id}`,
				kind: 'bicuve'
			});
		}
		for (const link of textAccessByWork.get(row.id) ?? []) {
			links.push(link);
		}

		const distanceRecord = distancesByWork.get(row.id) ?? ensureDistanceRecord();
		if (!distancesByWork.has(row.id)) {
			distancesByWork.set(row.id, distanceRecord);
		}

		const shortSummary =
			row.resumen_breve?.trim() || summaries.shortSummary || 'Sin resumen breve disponible.';

		const baseSlug = resolveWorkBaseSlug(row);
		const currentCount = (slugCounts.get(baseSlug) ?? 0) + 1;
		slugCounts.set(baseSlug, currentCount);
		const slug = currentCount === 1 ? baseSlug : `${baseSlug}-${currentCount}`;
		const bicuveNombre = row.bicuve_nombre?.trim() || 'ETSO';
		bicuveNameByWorkId.set(row.id, bicuveNombre);

		return {
			id: row.id,
			slug,
			title: row.titulo,
			titleVariants: splitVariants(row.variaciones_titulo),
			genre: row.genero?.trim() || 'Sin genero',
			origin: row.procede?.trim() || 'Sin procedencia',
			textState: row.estado_texto?.trim() || 'Sin estado',
			addedOn: row.adicion?.trim() || 'Sin fecha',
			shortSummary,
			longSummary: summaries.longSummary,
			result1: row.resultado1?.trim() || undefined,
			result2: row.resultado2?.trim() || undefined,
			traditionalAttribution,
			stylometryAttribution,
			textLinks: links,
			reportId: hasAnyDistanceRows(distanceRecord) ? row.id : undefined
		};
	});

	const snapshot = {
		works,
		authors,
		bicuveNameByWorkId: Object.fromEntries(bicuveNameByWorkId),
		distancesByWork: Object.fromEntries(distancesByWork)
	};

	mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
	writeFileSync(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
	console.log(
		`[build:catalog] Snapshot generado en ${OUTPUT_PATH} con ${works.length} obras y ${authors.length} autores.`
	);
} finally {
	db.close();
}
