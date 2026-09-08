import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { load as parseHtml } from 'cheerio';
import ts from 'typescript';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const modules = new Map();

// Execute the real TypeScript modules with SvelteKit's $lib alias, without a build.
function loadSourceModule(filename) {
	const file = extname(filename) ? filename : `${filename}.ts`;
	if (modules.has(file)) return modules.get(file).exports;
	const module = { exports: {} };
	modules.set(file, module);
	const nodeRequire = createRequire(file);
	const requireSource = (specifier) => {
		if (specifier.startsWith('$lib/')) {
			return loadSourceModule(resolve(projectRoot, 'src/lib', specifier.slice(5)));
		}
		if (specifier.startsWith('.')) return loadSourceModule(resolve(dirname(file), specifier));
		return nodeRequire(specifier);
	};
	const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
	});
	new Function('exports', 'require', 'module', '__filename', '__dirname', outputText)(
		module.exports, requireSource, module, file, dirname(file)
	);
	return module.exports;
}

const { SUPPORTED_LOCALES, literalTranslations, translateText } = loadSourceModule(
	resolve(projectRoot, 'src/lib/i18n.ts')
);
const { createTextTranslator } = loadSourceModule(resolve(projectRoot, 'src/lib/i18n-runtime.ts'));
const { localizeHtml, localizeHtmlShell, createLocalizedHtmlTransformer } = loadSourceModule(
	resolve(projectRoot, 'src/lib/server/i18n-html.ts')
);

const translate = (locale, source) => literalTranslations[locale]?.[source] ?? source;

test('text translation matches complete nodes and preserves surrounding whitespace', () => {
	const t = createTextTranslator({ 'Todas las condiciones': 'All conditions', a: 'to' });
	assert.equal(t(' \n Todas\tlas   condiciones \n'), ' \n All conditions \n');
	assert.equal(t('Todas las condiciones adicionales'), 'Todas las condiciones adicionales');
	assert.equal(t('La francesa Laura'), 'La francesa Laura');
	assert.equal(t('a'), 'a');
	assert.equal(t(' \n\t '), ' \n\t ');
});

test('single-letter attribution connectors stay outside automatic translation', () => {
	const connectors = {
		en: 'to', fr: 'à', pt: 'a', it: 'a', de: 'an', zh: '归于',
		ja: '帰属先：', ko: '귀속 대상:', ru: '', ar: 'إلى'
	};
	for (const [locale, expected] of Object.entries(connectors)) {
		assert.equal(Object.hasOwn(literalTranslations[locale], 'a'), false);
		assert.equal(translateText(locale, 'a'), expected);
		assert.equal(createTextTranslator(literalTranslations[locale])('a'), 'a');
	}
});

test('text translation never translates its output again or infers another language', () => {
	const t = createTextTranslator({ privacidad: 'privacidade', Todas: 'Todos', Todos: 'All' });
	assert.equal(t('privacidad'), 'privacidade');
	assert.equal(t('privacidade'), 'privacidade');
	assert.equal(t('Todas'), 'Todos');
	assert.equal(t(t('Todas')), 'Todos');
	assert.equal(createTextTranslator({})('Email'), 'Email');
	const japanese = createTextTranslator(literalTranslations.ja);
	assert.equal(japanese('Texto'), literalTranslations.ja.Texto);
	assert.equal(japanese(literalTranslations.ja.Texto), literalTranslations.ja.Texto);
});

test('every catalogue title and author in the checked-in graph stays intact in every locale', () => {
	const graph = JSON.parse(readFileSync(resolve(projectRoot, 'static/data/red-obras.json'), 'utf8'));
	const values = [...new Set(graph.nodes.flatMap((node) => [
		node.title, ...node.traditionalAuthors, ...node.stylometryAuthors
	]))];
	const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
	const html = '<section data-i18n-skip>' + values.map((value) => `<p>${escape(value)}</p>`).join('') + '</section>';
	assert.ok(values.length > 2900);
	for (const locale of SUPPORTED_LOCALES) {
		assert.equal(localizeHtml(html, locale), html, locale);
	}
});

test('already localized SEO and language alternate URLs are not rewritten', () => {
	const html = '<!doctype html><html lang="es"><head><title>Segura | ETSO</title>' +
		'<meta name="description" content="Obras" data-i18n-skip>' +
		'<link rel="alternate" hreflang="fr" href="/fr/obras/la-francesa-laura">' +
		'<link rel="canonical" href="/en/obras/la-francesa-laura"></head><body></body></html>';
	assert.equal(localizeHtml(html, 'en'), html);
});

for (const locale of SUPPORTED_LOCALES) {
	test(`${locale}: original work titles and author names survive HTML localization`, () => {
		const titles = ['La francesa Laura', 'Licenciado y el bachiller', 'Obras son amores'];
		const html = '<main class="layout" aria-label="Obras">' +
			titles.map((title) => `<h1>${title}</h1>`).join('') +
			'<p>Vicente Cipriano Segura</p><a href="/obras/la-francesa-laura">Texto</a></main>';
		const $ = parseHtml(localizeHtml(html, locale));
		assert.deepEqual($('h1').map((_, element) => $(element).text()).get(), titles);
		assert.equal($('p').text(), 'Vicente Cipriano Segura');
		assert.equal($('main').length, 1);
		assert.equal($('main').attr('class'), 'layout');
		assert.equal($('main').attr('aria-label'), translate(locale, 'Obras'));
		assert.equal($('a').text(), translate(locale, 'Texto'));
		assert.equal($('a').attr('href'), `${locale === 'es' ? '' : `/${locale}`}/obras/la-francesa-laura`);
	});

	test(`${locale}: protected catalogue data stays unchanged, including nested blocks`, () => {
		const html = '<section data-i18n-skip><section>Obras</section>' +
			'<h1>Obras son amores</h1><p>Segura</p><p>Edición</p>' +
			'<a href="/obras/la-francesa-laura">Texto</a></section>' +
			'<div translate="no"><div>Licencia</div><span>Texto</span></div>' +
			'<p id="ui-label">Texto</p>';
		const $ = parseHtml(localizeHtml(html, locale));
		assert.equal($('section section').text(), 'Obras');
		assert.equal($('h1').text(), 'Obras son amores');
		assert.deepEqual($('section p').map((_, element) => $(element).text()).get(), ['Segura', 'Edición']);
		assert.equal($('[translate="no"] div').text(), 'Licencia');
		assert.equal($('[translate="no"] span').text(), 'Texto');
		assert.equal($('section a').text(), 'Texto');
		assert.equal($('section a').attr('href'), `${locale === 'es' ? '' : `/${locale}`}/obras/la-francesa-laura`);
		assert.equal($('#ui-label').text(), translate(locale, 'Texto'));
	});

	test(`${locale}: scripts, styles, code, form values and hydration markers survive`, () => {
		const html = '<!--[--><script>const value = "Obras y Texto";</script>' +
			'<style>.Obras{--Texto:1}</style><pre><code>Obras y Texto</code></pre>' +
			'<textarea>Licencia y Texto</textarea><input value="Licencia y Texto">' +
			'<span data-result="Licencia" class="Obras">Texto</span><!--]-->';
		const output = localizeHtml(html, locale);
		const $ = parseHtml(output);
		assert.equal($('script').text(), 'const value = "Obras y Texto";');
		assert.equal($('style').text(), '.Obras{--Texto:1}');
		assert.equal($('code').text(), 'Obras y Texto');
		assert.equal($('textarea').text(), 'Licencia y Texto');
		assert.equal($('input').attr('value'), 'Licencia y Texto');
		assert.equal($('span').attr('data-result'), 'Licencia');
		assert.equal($('span').attr('class'), 'Obras');
		assert.equal($('span').text(), translate(locale, 'Texto'));
		assert.ok(output.includes('<!--[-->'));
		assert.ok(output.includes('<!--]-->'));
	});

	test(`${locale}: text and translated UI remain stable across repeated localization`, () => {
		const html = '<p>privacidad</p><p>Todas las condiciones</p><p>Texto</p>' +
			'<h1>Licenciado y el bachiller</h1><p>Vicente Cipriano Segura</p>';
		const once = localizeHtml(html, locale);
		const twice = localizeHtml(once, locale);
		const $ = parseHtml(once);
		assert.equal($('p').eq(0).text(), translate(locale, 'privacidad'));
		assert.equal($('p').eq(1).text(), translate(locale, 'Todas las condiciones'));
		assert.equal($('p').eq(2).text(), translate(locale, 'Texto'));
		assert.equal(twice, once);
	});
}

test('only translatable attributes change; URLs, resources and explicit locale links survive', () => {
	const html = '<a id="work" href="/obras/la-francesa-laura?next=Texto#datos" title="Texto" aria-label="Obras">Texto</a>' +
		'<form action="/buscar?q=Licencia"><input placeholder="Texto"></form>' +
		'<img src="/images/Licencia.png" srcset="/images/Licencia.png 1x, /images/Obras.png 2x" alt="Texto">' +
		'<meta name="description" content="Texto"><meta property="og:url" content="https://etso.es/obras/la-francesa-laura">' +
		'<a id="external" href="https://example.com/Obras">Obras</a>' +
		'<a id="protocol-relative" href="//example.com/Obras">Obras</a>' +
		'<a id="asset" href="/downloads/Obras.pdf">Texto</a>' +
		'<a id="api" href="/api/v1/obras">Texto</a>' +
		'<a id="email" href="mailto:autor@example.com">Texto</a>' +
		'<a id="fragment" href="#Texto">Texto</a>' +
		'<a id="locale" data-i18n-preserve-locale href="/fr/obras/la-francesa-laura">Texto</a>';
	const $ = parseHtml(localizeHtml(html, 'en'));
	assert.equal($('#work').attr('href'), '/en/obras/la-francesa-laura?next=Texto#datos');
	assert.equal($('#work').attr('title'), 'Text');
	assert.equal($('#work').attr('aria-label'), 'Works');
	assert.equal($('form').attr('action'), '/en/buscar?q=Licencia');
	assert.equal($('input').attr('placeholder'), 'Text');
	assert.equal($('img').attr('alt'), 'Text');
	assert.equal($('img').attr('src'), '/images/Licencia.png');
	assert.equal($('img').attr('srcset'), '/images/Licencia.png 1x, /images/Obras.png 2x');
	assert.equal($('meta[name="description"]').attr('content'), 'Text');
	assert.equal($('meta[property="og:url"]').attr('content'), 'https://etso.es/obras/la-francesa-laura');
	assert.equal($('#external').attr('href'), 'https://example.com/Obras');
	assert.equal($('#protocol-relative').attr('href'), '//example.com/Obras');
	assert.equal($('#asset').attr('href'), '/downloads/Obras.pdf');
	assert.equal($('#api').attr('href'), '/api/v1/obras');
	assert.equal($('#email').attr('href'), 'mailto:autor@example.com');
	assert.equal($('#fragment').attr('href'), '#Texto');
	assert.equal($('#locale').attr('href'), '/fr/obras/la-francesa-laura');
});

test('HTML entities are decoded for matching and safely encoded after translation', () => {
	const html = '<p>Todas&#32;las&#32;condiciones</p><h1>Obras &amp; amores</h1>' +
		'<input placeholder="Texto" value="&quot;Obras&quot; &amp; Licencia">';
	const $ = parseHtml(localizeHtml(html, 'en'));
	assert.equal($('p').text(), literalTranslations.en['Todas las condiciones']);
	assert.equal($('h1').text(), 'Obras & amores');
	assert.equal($('input').attr('value'), '"Obras" & Licencia');
});

test('protected blocks can contain scripts without losing their protection', () => {
	const html = '<div data-i18n-skip><script>const label = "Obras";</script>' +
		'<div>Texto</div><p>Licencia</p></div><p id="ui-label">Texto</p>';
	const $ = parseHtml(localizeHtml(html, 'en'));
	assert.equal($('[data-i18n-skip] script').text(), 'const label = "Obras";');
	assert.equal($('[data-i18n-skip] div').text(), 'Texto');
	assert.equal($('[data-i18n-skip] p').text(), 'Licencia');
	assert.equal($('#ui-label').text(), 'Text');
});

test('streamed HTML is localized only after all chunks arrive, with language and direction', () => {
	const html = '<!doctype html><html lang="es"><head><script>const a = "Texto";</script></head>' +
		'<body><!--[--><h1>La francesa Laura</h1><p>Texto</p><!--]--></body></html>';
	for (const locale of SUPPORTED_LOCALES) {
		const expected = localizeHtmlShell(localizeHtml(html, locale), locale);
		for (const split of [1, 23, 57, html.length - 2]) {
			const transform = createLocalizedHtmlTransformer(locale);
			assert.equal(transform(html.slice(0, split), false), '');
			assert.equal(transform(html.slice(split, split + 1), false), '');
			const output = transform(html.slice(split + 1), true);
			assert.equal(output, expected);
			const $ = parseHtml(output);
			assert.equal($('html').attr('lang'), locale);
			assert.equal($('html').attr('dir'), locale === 'ar' ? 'rtl' : 'ltr');
			assert.equal($('h1').text(), 'La francesa Laura');
			assert.equal($('p').text(), translate(locale, 'Texto'));
		}
	}
});
