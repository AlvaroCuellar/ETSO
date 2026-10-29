import type { AttributionSet, CatalogWork } from '../domain/catalog';

interface ResultOptions {
	translate?: (value: string) => string;
	andLabel?: string;
}

const normalize = (value: string): string => value.normalize('NFD')
	.replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const list = (names: string[], connector: string): string => names.length < 2
	? names[0] ?? ''
	: `${names.slice(0, -1).join(', ')} ${connector} ${names[names.length - 1]}`;

/** Shared by the report, metadata API and exports. Manual approved conclusions win. */
export const resolveStylometryResult = (
	work: Pick<CatalogWork, 'result1' | 'result2' | 'stylometryAttribution' | 'traditionalAttribution'>,
	options: ResultOptions = {}
): string | null => {
	const result = work.result1?.trim() ?? '';
	const marker = normalize(result);
	const automatic = marker === 'no' || /^(automatico|auto)[.!]?$/.test(marker);
	let primary = result;
	if (automatic) primary = generateStylometryResult(work.stylometryAttribution, work.traditionalAttribution, options);
	const extra = work.result2?.trim() ?? '';
	const secondary = normalize(extra) === 'no' ? '' : extra;
	if (!primary) return secondary || null;
	if (!secondary || normalize(primary).includes(normalize(secondary))) return primary;
	return `${primary} ${secondary}`;
};

export const generateStylometryResult = (
	set: AttributionSet,
	traditional: AttributionSet,
	{ translate: t = (value) => value, andLabel = 'y' }: ResultOptions = {}
): string => {
	const raw = normalize(set.rawExpression ?? '');
	if (set.unresolved || raw.includes('no_apunta_a_ningun_autor')) {
		return t('Los análisis de estilometría no permiten asociar esta obra de forma clara con ningún perfil autorial del corpus.');
	}
	if (raw.includes('no_es_posible')) {
		return traditional.groups.length > 1
			? t('Los análisis no permiten contrastar de forma concluyente las atribuciones tradicionales, debido a la insuficiencia de perfiles autoriales independientes. Tampoco identifican con claridad una alternativa.')
			: t('Los análisis no pueden asociar esta obra con el perfil estilístico del autor tradicional, debido a lo reducido de su corpus. Tampoco identifican de forma clara una alternativa autorial.');
	}
	if (raw.includes('no_analizada')) return t('Esta obra no ha sido analizada estilométricamente, por lo que no es posible valorar su asociación con ningún perfil autorial del corpus.');
	if (raw.includes('pendiente_profundidad')) return t('Los resultados estilométricos disponibles requieren una revisión en profundidad antes de formular una conclusión autorial.');
	const members = set.groups.flatMap((group) => group.members).filter((member) => member.authorName.trim());
	const names = members.map((member) => member.authorName.trim());
	const allProbable = members.length > 0 && members.every((member) => member.confidence === 'probable');
	const allSure = members.length > 0 && members.every((member) => member.confidence === 'segura');
	if (members.some((member) => member.scope === 'participation')) {
		// Do not flatten alternative hypotheses or claim sole authorship from a participant.
		if (set.groups.length > 1) return t('Los análisis ofrecen hipótesis alternativas de participación, sin un reparto concluyente.');
		if (set.groups.length === 1 && allSure) return `${t('Los análisis respaldan con claridad la participación de')} ${list(names, andLabel)}.`;
		if (set.groups.length === 1 && allProbable) return `${t('Los análisis apuntan a una participación probable de')} ${list(names, andLabel)}.`;
		return t('Los análisis respaldan las participaciones indicadas, con distintos grados de confianza.');
	}
	if (members.length === 1 && allSure) return `${t('Los análisis de estilometría permiten asociar esta obra de forma clara con el perfil autorial de')} ${names[0]}.`;
	if (members.length === 1 && allProbable) return `${t('Los análisis de estilometría permiten asociar esta obra con el perfil autorial de')} ${names[0]}, ${t('por cuanto algunas de sus obras aparecen en las primeras posiciones, aunque no de forma concluyente.')}`;
	if (members.length > 1 && set.groups.length === 1 && allProbable) return `${t('Los análisis de estilometría permiten asociar esta obra con los perfiles autoriales de')} ${list(names, andLabel)}, ${t('por cuanto algunas de sus obras aparecen en las primeras posiciones, aunque no de forma concluyente.')}`;
	return t('Los resultados estilométricos disponibles requieren revisión antes de formular una conclusión autorial.');
};
