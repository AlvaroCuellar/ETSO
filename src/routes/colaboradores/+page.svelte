<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const hasRenderableCards = (
		section: PageData['collaboratorsView']['sections'][number]
	): boolean => section.cards.length > 0;

	const hasStudents = (view: PageData['collaboratorsView']): boolean =>
		Boolean(view.students && view.students.people.length > 0);

	const hasAnyData = (view: PageData['collaboratorsView']): boolean =>
		view.sections.some((section) => hasRenderableCards(section)) ||
		hasStudents(view) ||
		Boolean(view.acknowledgments);
</script>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Más información', href: '/mas-informacion' },
			{ label: 'Colaboradores' }
		]}
	/>

	<section class="grid gap-3">
		<h1 class="text-[clamp(1.6rem,2.7vw,2.1rem)] font-bold text-brand-blue-dark">Colaboradores</h1>
		<p class="max-w-[72ch] leading-[1.62] text-text-main">
			Equipo, colaboradores y entidades que participan en el desarrollo y difusión del proyecto ETSO.
		</p>
	</section>

	{#if !hasAnyData(data.collaboratorsView)}
		<p class="m-0 italic text-text-soft">No hay datos de colaboradores disponibles.</p>
	{:else}
		{#each data.collaboratorsView.sections as section}
			{#if hasRenderableCards(section)}
				<section class="grid gap-3" aria-label={section.title}>
					<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">{section.title}</h2>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each section.cards as card}
							<article class="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
								{#if card.image}
									<img src={card.image} alt={`Imagen de ${card.name}`} class="h-44 w-full object-cover" loading="lazy" />
								{/if}
								<div class="grid gap-2 p-4">
									<h3 class="m-0 font-ui text-[1rem] font-semibold leading-[1.3] text-brand-blue-dark">{card.name}</h3>

									{#if card.affiliations.length > 0}
										<p class="m-0 text-[0.92rem] leading-[1.55] text-text-soft">{card.affiliations.join(' | ')}</p>
									{/if}

									{#if card.description}
										<p class="m-0 text-[0.96rem] leading-[1.62] text-text-main">{card.description}</p>
									{/if}

									{#if card.sourceLabel}
										<p class="m-0 text-[0.78rem] font-ui font-semibold uppercase tracking-[0.04em] text-brand-blue">
											Fuente: {card.sourceLabel}
										</p>
									{/if}
								</div>
							</article>
						{/each}
					</div>
				</section>
			{/if}
		{/each}

		{#if data.collaboratorsView.students && data.collaboratorsView.students.people.length > 0}
			<section class="grid gap-3" aria-label="Estudiantes">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">Estudiantes</h2>

				{#if data.collaboratorsView.students.group || data.collaboratorsView.students.institution}
					<p class="m-0 text-[0.95rem] leading-[1.6] text-text-soft">
						{#if data.collaboratorsView.students.group}
							{data.collaboratorsView.students.group}
						{/if}
						{#if data.collaboratorsView.students.group && data.collaboratorsView.students.institution}
							|
						{/if}
						{#if data.collaboratorsView.students.institution}
							{data.collaboratorsView.students.institution}
						{/if}
					</p>
				{/if}

				<ul class="m-0 columns-1 gap-5 space-y-1.5 pl-5 text-[0.95rem] leading-[1.5] text-text-main sm:columns-2 lg:columns-3 xl:columns-4">
					{#each data.collaboratorsView.students.people as student}
						<li class="break-inside-avoid">{student}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.collaboratorsView.acknowledgments}
			<section class="grid gap-3" aria-label="Agradecimientos">
				<h2 class="m-0 text-[1.25rem] font-semibold leading-[1.2] text-brand-blue-dark">Agradecimientos</h2>
				<article class="grid gap-3 rounded-card border border-[rgba(0,51,167,0.24)] bg-[linear-gradient(180deg,#f4f8ff,#eef4ff)] p-4 shadow-soft">
					{#if data.collaboratorsView.acknowledgments.text}
						<p class="m-0 leading-[1.62] text-text-main">{data.collaboratorsView.acknowledgments.text}</p>
					{/if}

					{#if data.collaboratorsView.acknowledgments.organizations.length > 0}
						<ul class="m-0 grid gap-1.5 pl-5 text-[0.95rem] leading-[1.6] text-text-main">
							{#each data.collaboratorsView.acknowledgments.organizations as organization}
								<li>{organization}</li>
							{/each}
						</ul>
					{/if}
				</article>
			</section>
		{/if}
	{/if}
</div>
