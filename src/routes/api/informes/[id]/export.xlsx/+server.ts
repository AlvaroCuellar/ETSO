import ExcelJS from 'exceljs';
import { error } from '@sveltejs/kit';
import { ambitos, formatAttribution, type Ambito, type InformeDistanceView } from '$lib/domain/catalog';
import {
	getInformeById,
	getInformeByReportSlug,
	getInformeByWorkSlug,
	getInformeDistanceRows
} from '$lib/server/catalog-runtime';
import { formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';

import type { RequestHandler } from './$types';

const SLOW_API_LOG_MS = 1_500;

const sheetNames: Record<Ambito, string> = {
	obracompleta: 'Obra',
	jornada1: 'Jornada 1',
	jornada2: 'Jornada 2',
	jornada3: 'Jornada 3',
	jornada4: 'Jornada 4',
	jornada5: 'Jornada 5'
};

const resolveInforme = async (id: string) => {
	const informe =
		(await getInformeByReportSlug(id)) ??
		(await getInformeByWorkSlug(id)) ??
		(await getInformeById(id));
	if (!informe) throw error(404, 'Informe no encontrado');
	return informe;
};

const safeFilenamePart = (value: string): string => {
	const normalized = value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return normalized || 'informe';
};

const addHeaderStyle = (worksheet: ExcelJS.Worksheet): void => {
	const header = worksheet.getRow(1);
	header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
	header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D3F91' } };
	header.alignment = { vertical: 'middle', wrapText: true };
	worksheet.views = [{ state: 'frozen', ySplit: 1 }];
	worksheet.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: worksheet.columnCount || 1 }
	};
};

const applyReadableCells = (worksheet: ExcelJS.Worksheet): void => {
	worksheet.eachRow((row, rowNumber) => {
		if (rowNumber === 1) return;
		row.alignment = { vertical: 'top', wrapText: true };
	});
};

const addDistanceSheet = (
	workbook: ExcelJS.Workbook,
	ambito: Ambito,
	rows: InformeDistanceView[]
): void => {
	const worksheet = workbook.addWorksheet(sheetNames[ambito]);
	worksheet.columns = [
		{ header: 'Posición', key: 'position', width: 10 },
		{ header: 'Título', key: 'title', width: 42 },
		{ header: 'Atribución tradicional', key: 'traditionalAttribution', width: 42 },
		{ header: 'Atribución estilometría', key: 'stylometryAttribution', width: 42 },
		{ header: 'Género', key: 'genre', width: 22 },
		{ header: 'Procedencia', key: 'origin', width: 46 },
		{ header: 'Estado del texto', key: 'textState', width: 24 }
	];

	for (const row of rows) {
		const work = row.relatedWork;
		worksheet.addRow({
			position: row.rank,
			title: formatDisplayWorkTitle(work.title),
			traditionalAttribution: formatAttribution(work.traditionalAttribution),
			stylometryAttribution: formatAttribution(work.stylometryAttribution),
			genre: work.genre,
			origin: work.origin,
			textState: work.textState
		});
	}

	addHeaderStyle(worksheet);
	applyReadableCells(worksheet);
};

export const GET: RequestHandler = async ({ params }) => {
	const startedAt = Date.now();

	try {
		const informe = await resolveInforme(params.id);
		const distanceEntries = await Promise.all(
			ambitos.map(async (ambito) => [ambito, await getInformeDistanceRows(informe, ambito)] as const)
		);

		const workbook = new ExcelJS.Workbook();
		workbook.creator = 'ETSO';
		workbook.created = new Date();
		workbook.modified = new Date();
		workbook.properties.date1904 = false;

		for (const [ambito, rows] of distanceEntries) {
			if (ambito !== 'obracompleta' && rows.length === 0) continue;
			addDistanceSheet(workbook, ambito, rows);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		const elapsed = Date.now() - startedAt;
		if (elapsed >= SLOW_API_LOG_MS) {
			console.warn(`[api/informes/export.xlsx] slow request: ${elapsed}ms`);
		}

		const filename = `etso-informe-${safeFilenamePart(informe.slug)}.xlsx`;
		return new Response(buffer, {
			headers: {
				'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'content-disposition': `attachment; filename="${filename}"`,
				'cache-control': 'no-store'
			}
		});
	} catch (cause) {
		if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
		console.error('[api/informes/export.xlsx] Unable to export informe', cause);
		throw error(500, cause instanceof Error ? cause.message : 'No se pudo exportar el informe');
	}
};
