import assert from 'node:assert/strict';
import test from 'node:test';
import { isHttpError } from '@sveltejs/kit';

import {
	parsePublicApiFields,
	projectPublicApiFields,
	PUBLIC_WORK_METADATA_FIELDS
} from '../src/lib/server/public-api-fields.ts';

const metadata = {
	publicId: 123,
	title: 'Una obra',
	resultado1: null,
	titleVariants: ['Otro título'],
	resources: { work: '/obras/una-obra', summary: null, textAccess: [] }
};

test('sin fields conserva todos los metadatos y su forma original', () => {
	const fields = parsePublicApiFields(null, PUBLIC_WORK_METADATA_FIELDS);
	assert.equal(fields, null);
	assert.equal(projectPublicApiFields(metadata, fields), metadata);
});

test('selecciona únicamente los campos públicos pedidos y elimina duplicados', () => {
	const fields = parsePublicApiFields(' publicId, title,publicId ', ['publicId', 'title'] as const);
	assert.deepEqual(fields, ['publicId', 'title']);
	assert.deepEqual(projectPublicApiFields(metadata, fields), {
		publicId: 123,
		title: 'Una obra'
	});
	assert.equal(metadata.resultado1, null);
	assert.ok('resources' in metadata);
});

test('conserva valores nulos, listas y objetos completos sin proyección anidada', () => {
	const fields = parsePublicApiFields('resultado1,titleVariants,resources', [
		'resultado1',
		'titleVariants',
		'resources'
	] as const);
	assert.deepEqual(projectPublicApiFields(metadata, fields), {
		resultado1: null,
		titleVariants: ['Otro título'],
		resources: { work: '/obras/una-obra', summary: null, textAccess: [] }
	});
});

for (const invalidFields of [
	'',
	' ',
	',',
	'publicId,',
	',publicId',
	'publicId,,title',
	'publicId, ,title',
	'unknown',
	'publicId,unknown',
	'PublicId',
	'*',
	'resources.work',
	'resources[work]',
	'fullText',
	'text',
	'shortSummary',
	'summaryText',
	'resumen_breve',
	'resumen_largo',
	'constructor',
	'__proto__',
	'toString'
]) {
	test(`rechaza fields=${JSON.stringify(invalidFields)} con HTTP 400`, () => {
		assert.throws(
			() => parsePublicApiFields(invalidFields, PUBLIC_WORK_METADATA_FIELDS),
			(error: unknown) => isHttpError(error, 400)
		);
	});
}

test('cada recurso define su lista explícita de campos permitidos', () => {
	const authorFields = ['id', 'stylometryWorkPublicIds'] as const;
	assert.deepEqual(parsePublicApiFields('id,stylometryWorkPublicIds', authorFields), authorFields);
	assert.throws(
		() => parsePublicApiFields('title', authorFields),
		(error: unknown) => isHttpError(error, 400)
	);
});
