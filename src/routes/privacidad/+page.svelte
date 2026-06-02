<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';

	const PRIVACIDAD_SEO_DESCRIPTION =
		'Política de privacidad y tratamiento de datos personales en la web de ETSO.';
</script>

<SeoHead title="Política de privacidad" description={PRIVACIDAD_SEO_DESCRIPTION} path="/privacidad" />

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Política de privacidad' }]} />

	<section class="grid gap-4">
		<h1 class="m-0 text-[clamp(1.7rem,2.9vw,2.25rem)] font-bold leading-[1.12] text-brand-blue-dark">
			Política de privacidad
		</h1>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			<strong>Responsable del tratamiento:</strong> Álvaro Cuéllar y Germán Vega García-Luengos.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			<strong>Contacto:</strong>
			<a class="font-medium underline" href="mailto:alvaro.cuellar@uab.cat">alvaro.cuellar@uab.cat</a> ·
			<a class="font-medium underline" href="mailto:german.vega@uva.es">german.vega@uva.es</a>
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			ETSO recoge y trata únicamente los datos personales necesarios para el funcionamiento de la web y para la gestión de las comunicaciones enviadas por las personas usuarias.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			Los datos facilitados a través de formularios, correo electrónico u otros canales de contacto se utilizarán exclusivamente para responder a la consulta, gestionar colaboraciones o atender solicitudes relacionadas con el proyecto.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			La web puede registrar datos técnicos básicos de navegación, como dirección IP, fecha y hora de acceso, navegador o páginas visitadas, con fines de seguridad, mantenimiento técnico y análisis general del funcionamiento del sitio.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			Los datos personales no se cederán a terceros, salvo obligación legal o cuando sea necesario para la prestación técnica del servicio mediante proveedores de alojamiento, despliegue, formularios, analítica o correo electrónico.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			Los datos se conservarán durante el tiempo necesario para cumplir la finalidad para la que fueron recogidos y, en su caso, para atender responsabilidades legales o administrativas.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			Las personas usuarias pueden solicitar el acceso, rectificación, supresión, limitación u oposición al tratamiento de sus datos, así como cualquier otra información relacionada con su privacidad, escribiendo al equipo del proyecto.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			ETSO no utiliza los datos personales para fines comerciales ni para la elaboración de perfiles publicitarios.
		</p>

		<p class="m-0 max-w-[84ch] leading-[1.68] text-text-main">
			Esta política podrá actualizarse para reflejar cambios técnicos, legales o de funcionamiento de la web.
		</p>
	</section>
</div>
