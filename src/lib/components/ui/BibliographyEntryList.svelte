<script lang="ts">
	import type { InformeBibliographyEntry } from '$lib/domain/catalog';

	interface Props {
		entries: InformeBibliographyEntry[];
	}

	let { entries }: Props = $props();
</script>

<ul class="m-0 grid min-w-0 max-w-full list-none gap-3 p-0">
	{#each entries as entry}
		<li class="min-w-0 max-w-full">
			<p
				class="m-0 min-w-0 max-w-full break-words pl-6 text-[0.98rem] leading-[1.58] text-text-main [-webkit-hyphens:auto] [hyphens:auto] [overflow-wrap:anywhere] [text-indent:-1.5rem]"
				data-i18n-skip
			>
				<span class="font-ui font-semibold text-text-soft" aria-hidden="true">- </span>
				{#each entry.parts as part}
					{#if part.kind === 'link'}
						<a
							href={part.href ?? part.value}
							target="_blank"
							rel="noopener noreferrer"
							class="break-words underline [overflow-wrap:anywhere]"
						>
							{part.value}
						</a>
					{:else if part.kind === 'italic'}
						<em>{part.value}</em>
					{:else}
						{part.value}
					{/if}
				{/each}
			</p>
		</li>
	{/each}
</ul>
