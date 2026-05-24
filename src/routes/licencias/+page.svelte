<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
</script>

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Derechos y licencias' }]} />

	<section class="grid gap-4">
		<h1 class="m-0 text-[clamp(1.7rem,2.9vw,2.25rem)] font-bold leading-[1.12] text-brand-blue-dark">
			Derechos y licencias
		</h1>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			Salvo indicación contraria, los contenidos descriptivos elaborados por ETSO pueden consultarse, citarse y reutilizarse con fines académicos y no comerciales, siempre que se indique la procedencia (<a href="https://creativecommons.org/licenses/by-nc/4.0/deed.es" target="_blank">CC BY-NC 4.0</a>).
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			Los textos identificados como procedentes de BICUVE se ofrecen bajo licencia Creative Commons CC BY-NC 4.0 cuando así conste expresamente en su ficha.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			El corpus de TEXORO se ofrece únicamente como herramienta de búsqueda textual. Los fragmentos mostrados son contextos breves de consulta y no permiten ni autorizan la reconstrucción, descarga, copia o reutilización de los textos completos. Algunos textos integrados en TEXORO proceden de investigadores, proyectos o instituciones que conservan sus derechos sobre los materiales aportados.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			Los datos del Examen de autorías, los resúmenes y los metadatos pueden citarse de forma puntual. La extracción masiva, reproducción íntegra o reutilización sustancial de la base de datos de ETSO requiere autorización expresa.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			Las imágenes, documentos, logotipos y materiales procedentes de terceros se rigen por las condiciones indicadas por sus respectivas fuentes o titulares.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			La identidad visual y diseño de ETSO queda protegida por los derechos de autor. El código fuente y componentes técnicos están disponibles en abierto en <a href="https://github.com/AlvaroCuellar/ETSO" target="_blank">GitHub</a>, pero su uso o adaptación para proyectos externos requiere autorización y atribución adecuada.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			Para solicitar autorización para usos no previstos en esta página, puede contactarse con el equipo del proyecto <a href="/contacto" target="_blank">aquí</a>.
		</p>
	</section>
</div>
