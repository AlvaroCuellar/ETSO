<script lang="ts">
	import { formatConfidence, type AttributionSet, type Confidence } from '$lib/domain/catalog';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import heroBg from '$lib/assets/heros/obra-bg.jpg';
	import AlignLeft from 'lucide-svelte/icons/align-left';
	import Archive from 'lucide-svelte/icons/archive';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Calendar from 'lucide-svelte/icons/calendar';
	import ChartLine from 'lucide-svelte/icons/chart-line';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import Drama from 'lucide-svelte/icons/drama';
	import ExternalLink from 'lucide-svelte/icons/external-link';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const connectorLabel = (connector: 'and' | 'or'): string => (connector === 'and' ? 'y' : 'o');

	const confidenceClass = (confidence?: Confidence): string => {
		if (confidence === 'segura') return 'confidence-segura';
		if (confidence === 'probable') return 'confidence-probable';
		if (confidence === 'posible') return 'confidence-posible';
		if (confidence === 'no_concluyente') return 'confidence-no_concluyente';
		return '';
	};

	const hasTraditionalAttribution = (set: AttributionSet): boolean => !set.unresolved && set.groups.length > 0;
	const hasStylometryAttribution = (set: AttributionSet): boolean =>
		Boolean(set.unresolved || set.groups.length > 0);

	const hasAnyAttribution = (): boolean =>
		hasTraditionalAttribution(data.work.traditionalAttribution) ||
		hasStylometryAttribution(data.work.stylometryAttribution);

	const hasTextAccess = (): boolean => data.work.textLinks.length > 0;
	const hasAnySummary = (): boolean => Boolean(data.work.shortSummary || data.work.longSummary);
</script>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: data.work.title }
		]}
	/>

	<PageHero
		compact
		eyebrow="Ficha de obra"
		title={data.work.title}
		subtitle={data.work.titleVariants.length ? data.work.titleVariants.join(' | ') : undefined}
		backgroundImage={heroBg}
	/>

	<div class="obra-view-wrapper">
		<div class="obra-main-grid">
			<div class="obra-main-content">
				<section class="obra-card obra-atribuciones-card">
					<header class="obra-card-header">
						<h2 class="obra-card-title">Atribución de autoría</h2>
					</header>
					<div class="obra-card-body">
						{#if hasTraditionalAttribution(data.work.traditionalAttribution)}
							<div class="atribucion-block atribucion-tradicional">
								<div class="atribucion-label">
									<span class="badge badge-secondary">Atribución tradicional</span>
								</div>
								<div class="atribucion-content">
									<div class="autor-list">
										{#each data.work.traditionalAttribution.groups as group, groupIndex}
											<div class="autor-group">
												{#each group.members as member, memberIndex}
													<a href={`/autores/${member.authorId}`} class="autor-name">{member.authorName}</a>
													{#if memberIndex < group.members.length - 1}
														<span class="logic-operator">y</span>
													{/if}
												{/each}
											</div>
											{#if groupIndex < data.work.traditionalAttribution.groups.length - 1}
												<span class="logic-operator">
													{connectorLabel(data.work.traditionalAttribution.connector)}
												</span>
											{/if}
										{/each}
									</div>
								</div>
							</div>
						{/if}

						{#if hasStylometryAttribution(data.work.stylometryAttribution)}
							<div class="atribucion-block atribucion-etso">
								<div class="atribucion-label">
									<span class="badge badge-primary">Atribución estilometría</span>
								</div>
								<div class="atribucion-content">
									<div class="autor-list">
										{#if data.work.stylometryAttribution.unresolved}
											<div class="autor-group">
												<span class="autor-name desconocido">Autoría no determinada</span>
												<span class="confidence-badge confidence-no_concluyente">No concluyente</span>
											</div>
										{/if}

										{#each data.work.stylometryAttribution.groups as group, groupIndex}
											<div class="autor-group">
												{#each group.members as member, memberIndex}
													<a href={`/autores/${member.authorId}`} class="autor-name">{member.authorName}</a>
													{#if member.confidence}
														<span
															class={`confidence-badge ${confidenceClass(member.confidence)}`}
														>
															{formatConfidence(member.confidence)}
														</span>
													{/if}
													{#if memberIndex < group.members.length - 1}
														<span class="logic-operator">y</span>
													{/if}
												{/each}
											</div>
											{#if groupIndex < data.work.stylometryAttribution.groups.length - 1}
												<span class="logic-operator">
													{connectorLabel(data.work.stylometryAttribution.connector)}
												</span>
											{/if}
										{/each}
									</div>
								</div>
							</div>
						{/if}

						{#if !hasAnyAttribution()}
							<div class="alert alert-info">No hay información de autoría disponible.</div>
						{/if}
					</div>
				</section>

				{#if data.informe}
					<section class="obra-card obra-informes-card obra-informes-card--mobile">
						<header class="obra-card-header">
							<h2 class="obra-card-title">Informe de análisis estilométrico</h2>
							<p class="informe-context">
								Consulta el informe para contextualizar la atribución de esta obra.
							</p>
						</header>
						<div class="obra-card-body">
							<div class="informes-list">
								<a href={`/informes/${data.informe.id}`} class="informe-link-card">
									<div class="informe-icon" aria-hidden="true">
										<ChartLine class="icon icon--link" />
									</div>
									<div class="informe-info">
										<div class="informe-title">Informe</div>
										<div class="informe-meta">Ver análisis completo</div>
									</div>
									<div class="informe-arrow" aria-hidden="true">
										<ChevronRight class="icon icon--arrow" />
									</div>
								</a>
							</div>
						</div>
					</section>
				{/if}

				<section class="obra-card obra-resumenes-card" id="resumen-automatico">
					<header class="obra-card-header">
						<h2 class="obra-card-title">Resumen automático de la obra</h2>
					</header>
					<div class="obra-card-body">
						{#if hasAnySummary()}
							<div class="resumen-breve-wrapper">
								<div class="resumen-content">
									{#if data.work.shortSummary}
										<p>{data.work.shortSummary}</p>
									{/if}
								</div>
							</div>

							{#if data.work.longSummary}
								<div class="resumen-completo-link-wrapper">
									<a href={`/obras/${data.work.slug}/resumen`} class="resumen-link-card">
										<div class="resumen-icon" aria-hidden="true">
											<AlignLeft class="icon icon--link" />
										</div>
										<div class="resumen-info">
											<div class="resumen-title">Leer resumen automático completo</div>
											<div class="resumen-meta">Descripción extensa de la obra</div>
										</div>
										<div class="resumen-arrow" aria-hidden="true">
											<ChevronRight class="icon icon--arrow" />
										</div>
									</a>
								</div>
							{/if}
						{:else}
							<div class="alert alert-info">No hay resumen disponible para esta obra.</div>
						{/if}
					</div>
				</section>

				<section class="obra-card obra-texto-access obra-texto-access--mobile">
					<header class="obra-card-header">
						<h3 class="obra-card-title">Acceso al texto</h3>
					</header>
					<div class="obra-card-body">
						{#if hasTextAccess()}
							{#each data.work.textLinks as link}
								<a
									href={link.href}
									class="texto-link-card"
									target={link.external ? '_blank' : undefined}
									rel={link.external ? 'noopener noreferrer' : undefined}
								>
									<div class="texto-icon" aria-hidden="true">
										{#if link.kind === 'bicuve'}
											<BookOpen class="icon icon--link" />
										{:else}
											<ExternalLink class="icon icon--link" />
										{/if}
									</div>
									<div class="texto-info">
										{#if link.kind === 'bicuve'}
											<div class="texto-title">{link.label}</div>
											<div class="texto-meta">BICUVE</div>
										{:else}
											<div class="texto-title">Leer texto</div>
											<div class="texto-meta">{link.label}</div>
										{/if}
									</div>
									<div class="texto-arrow" aria-hidden="true">
										<ChevronRight class="icon icon--arrow" />
									</div>
								</a>
							{/each}
						{:else}
							<div class="alert alert-secondary">No hay acceso al texto disponible para esta obra.</div>
						{/if}
					</div>
				</section>
			</div>

			<aside class="obra-sidebar">
				{#if data.informe}
					<section class="obra-card obra-informes-card obra-informes-card--desktop">
						<header class="obra-card-header">
							<h3 class="obra-card-title">Informe de análisis estilométrico</h3>
							<p class="informe-context">
								Consulta el informe para contextualizar la atribución de esta obra.
							</p>
						</header>
						<div class="obra-card-body">
							<div class="informes-list">
								<a href={`/informes/${data.informe.id}`} class="informe-link-card">
									<div class="informe-icon" aria-hidden="true">
										<ChartLine class="icon icon--link" />
									</div>
									<div class="informe-info">
										<div class="informe-title">Informe</div>
										<div class="informe-meta">Ver análisis completo</div>
									</div>
									<div class="informe-arrow" aria-hidden="true">
										<ChevronRight class="icon icon--arrow" />
									</div>
								</a>
							</div>
						</div>
					</section>
				{/if}

				<section class="obra-card obra-texto-access obra-texto-access--desktop">
					<header class="obra-card-header">
						<h3 class="obra-card-title">Acceso al texto</h3>
					</header>
					<div class="obra-card-body">
						{#if hasTextAccess()}
							{#each data.work.textLinks as link}
								<a
									href={link.href}
									class="texto-link-card"
									target={link.external ? '_blank' : undefined}
									rel={link.external ? 'noopener noreferrer' : undefined}
								>
									<div class="texto-icon" aria-hidden="true">
										{#if link.kind === 'bicuve'}
											<BookOpen class="icon icon--link" />
										{:else}
											<ExternalLink class="icon icon--link" />
										{/if}
									</div>
									<div class="texto-info">
										{#if link.kind === 'bicuve'}
											<div class="texto-title">{link.label}</div>
											<div class="texto-meta">BICUVE</div>
										{:else}
											<div class="texto-title">Leer texto</div>
											<div class="texto-meta">{link.label}</div>
										{/if}
									</div>
									<div class="texto-arrow" aria-hidden="true">
										<ChevronRight class="icon icon--arrow" />
									</div>
								</a>
							{/each}
						{:else}
							<div class="alert alert-secondary">No hay acceso al texto disponible para esta obra.</div>
						{/if}
					</div>
				</section>

				<section class="obra-card obra-metadatos-card sticky-card">
					<header class="obra-card-header">
						<h3 class="obra-card-title">Información de la obra</h3>
					</header>
					<div class="obra-card-body">
						<dl class="metadatos-list">
							<div class="metadato-item">
								<dt class="metadato-label">
									<Drama class="icon icon--meta" aria-hidden="true" />
									Género
								</dt>
								<dd class="metadato-value">{data.work.genre}</dd>
							</div>

							<div class="metadato-item">
								<dt class="metadato-label">
									<CircleCheck class="icon icon--meta" aria-hidden="true" />
									Estado del texto
								</dt>
								<dd class="metadato-value">{data.work.textState}</dd>
							</div>

							<div class="metadato-item">
								<dt class="metadato-label">
									<Archive class="icon icon--meta" aria-hidden="true" />
									Procedencia
								</dt>
								<dd class="metadato-value">{data.work.origin}</dd>
							</div>

							<div class="metadato-item">
								<dt class="metadato-label">
									<Calendar class="icon icon--meta" aria-hidden="true" />
									Fecha de adición
								</dt>
								<dd class="metadato-value">{data.work.addedOn}</dd>
							</div>
						</dl>
					</div>
				</section>
			</aside>
		</div>
	</div>
</div>

<style>
	.obra-view-wrapper {
		max-width: 1280px;
		margin: 0 auto;
		font-family: 'Roboto', sans-serif;
	}

	.obra-main-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(19rem, 24rem);
		gap: 2rem;
	}

	.obra-main-content {
		min-width: 0;
	}

	.obra-sidebar {
		min-width: 0;
	}

	.obra-card {
		background: #fff;
		border-radius: 10px;
		border: 1px solid rgba(52, 58, 64, 0.08);
		box-shadow: 0 4px 14px rgba(7, 36, 110, 0.06);
		margin-bottom: 1.25rem;
		overflow: hidden;
	}

	.obra-card-header {
		background: #f8f9fa;
		border-bottom: 1px solid rgba(52, 58, 64, 0.06);
		padding: 1rem;
	}

	.obra-card-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #343a40;
	}

	.obra-card-body {
		padding: 1rem;
	}

	.atribucion-block {
		padding: 1rem;
		border-radius: 10px;
		margin-bottom: 1rem;
		border: 1px solid #e9ecef;
		background: #fafbfc;
	}

	.atribucion-block:last-child {
		margin-bottom: 0;
	}

	.atribucion-tradicional {
		background: linear-gradient(to right, rgba(108, 117, 125, 0.06), transparent);
	}

	.atribucion-etso {
		background: linear-gradient(to right, rgba(102, 126, 234, 0.07), transparent);
	}

	.atribucion-label {
		margin-bottom: 0.75rem;
	}

	.badge {
		display: inline-block;
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		font-size: 0.76rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.badge-secondary {
		background: rgba(108, 117, 125, 0.14);
		color: #495057;
	}

	.badge-primary {
		background: rgba(0, 51, 167, 0.12);
		color: #0033a7;
	}

	.atribucion-content {
		font-size: 0.97rem;
		line-height: 1.6;
		color: #495057;
	}

	.autor-list {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		align-items: flex-start;
	}

	.autor-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.autor-name {
		color: #343a40;
		font-weight: 500;
		text-decoration: none;
	}

	.autor-name:hover {
		color: #0033a7;
		text-decoration: underline;
	}

	.desconocido {
		color: #6c757d;
		font-style: italic;
	}

	.logic-operator {
		display: inline-block;
		padding: 0.2rem 0.45rem;
		background: #ecf0f1;
		border-radius: 4px;
		font-size: 0.72rem;
		font-weight: 700;
		color: #555;
		text-transform: lowercase;
	}

	.confidence-badge {
		display: inline-block;
		padding: 0.24rem 0.55rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.confidence-segura {
		background: #d4edda;
		color: #155724;
	}

	.confidence-probable {
		background: #d1ecf1;
		color: #0c5460;
	}

	.confidence-posible {
		background: #e9ecef;
		color: #495057;
	}

	.confidence-no_concluyente {
		background: #fff3cd;
		color: #856404;
	}

	.informes-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.informe-context {
		margin: 0.65rem 0 0;
		font-size: 0.8rem;
		color: #516273;
	}

	.informe-link-card,
	.texto-link-card,
	.resumen-link-card {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		column-gap: 0.65rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid rgba(0, 51, 167, 0.18);
		border-radius: 8px;
		background: #fff;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}

	.informe-icon,
	.texto-icon,
	.resumen-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #0033a7;
		flex: 0 0 auto;
	}

	.informe-arrow,
	.texto-arrow,
	.resumen-arrow {
		color: #5b6f84;
		flex: 0 0 auto;
	}

	.informe-info,
	.texto-info,
	.resumen-info {
		min-width: 0;
		text-align: left;
		justify-self: start;
	}

	.informe-link-card:hover,
	.texto-link-card:hover,
	.resumen-link-card:hover {
		border-color: rgba(0, 51, 167, 0.34);
		background: #f6f9ff;
		text-decoration: none;
	}

	.informe-title,
	.texto-title,
	.resumen-title {
		font-size: 0.93rem;
		font-weight: 600;
		color: #213549;
	}

	.informe-meta,
	.texto-meta,
	.resumen-meta {
		font-size: 0.78rem;
		color: #62758a;
	}

	.resumen-breve-wrapper {
		margin-bottom: 1rem;
	}

	.resumen-content {
		font-family: 'Lora', serif;
		font-size: 1rem;
		line-height: 1.65;
		color: #495057;
		display: grid;
		gap: 0.85rem;
	}

	.resumen-content p {
		margin: 0;
	}

	.resumen-completo-link-wrapper {
		margin-top: 1rem;
	}

	.metadatos-list {
		margin: 0;
	}

	.metadato-item {
		padding: 0.9rem 0;
		border-bottom: 1px solid #e9ecef;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.metadato-item:first-child {
		padding-top: 0;
	}

	.metadato-item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.metadato-label {
		font-weight: 600;
		color: #6c757d;
		font-size: 0.77rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.metadato-value {
		font-size: 0.96rem;
		color: #2c3e50;
		margin: 0;
	}

	.alert {
		border-radius: 8px;
		padding: 0.85rem 1rem;
		font-size: 0.92rem;
	}

	:global(svg.icon) {
		stroke-width: 2;
	}

	:global(svg.icon--meta) {
		width: 0.82rem;
		height: 0.82rem;
		color: #667eea;
	}

	:global(svg.icon--link) {
		width: 0.9rem;
		height: 0.9rem;
	}

	:global(svg.icon--arrow) {
		width: 0.78rem;
		height: 0.78rem;
	}

	.alert-info {
		background: rgba(0, 51, 167, 0.08);
		color: #24425d;
		border: 1px solid rgba(0, 51, 167, 0.18);
	}

	.alert-secondary {
		background: #f5f7fa;
		color: #4f5f6f;
		border: 1px solid #dee5ee;
	}

	.obra-informes-card--mobile,
	.obra-texto-access--mobile {
		display: none;
	}

	.obra-informes-card--desktop,
	.obra-texto-access--desktop {
		display: block;
	}

	.sticky-card {
		position: sticky;
		top: calc(2rem + 68px);
	}

	@media (max-width: 1024px) {
		.obra-main-grid {
			grid-template-columns: 1fr;
		}

		.obra-informes-card--mobile,
		.obra-texto-access--mobile {
			display: block;
		}

		.obra-informes-card--desktop,
		.obra-texto-access--desktop {
			display: none;
		}

		.sticky-card {
			position: static;
		}
	}

	@media (max-width: 768px) {
		.obra-view-wrapper {
			padding-inline: 0.35rem;
		}

		.obra-header {
			padding: 0.75rem;
		}

		.obra-card-body,
		.obra-card-header {
			padding: 0.85rem;
		}

		.atribucion-block {
			padding: 0.85rem;
		}
	}
</style>




