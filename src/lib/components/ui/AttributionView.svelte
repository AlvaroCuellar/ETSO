<script lang="ts">
	import { formatConfidence, type AttributionSet } from '$lib/domain/catalog';

	interface Props {
		set: AttributionSet;
		linkAuthors?: boolean;
	}

	let { set, linkAuthors = true }: Props = $props();

	const connectorLabel = (connector: 'and' | 'or'): string => (connector === 'and' ? 'y' : 'o');
</script>

{#if set.unresolved}
	<p class="unresolved-copy">El analisis no apunta hacia ningun autor.</p>
{:else if !set.groups.length}
	<p class="unresolved-copy">Sin datos de atribucion.</p>
{:else}
	<div class="attribution-expression">
		{#each set.groups as group, groupIndex}
			<span class="attribution-group">
				{#each group.members as member, memberIndex}
					{#if linkAuthors}
						<a href={`/autores/${member.authorId}`}>{member.authorName}</a>
					{:else}
						<span>{member.authorName}</span>
					{/if}

					{#if member.confidence}
						<span class="confidence-chip" class:confidence-chip--segura={member.confidence === 'segura'}
							class:confidence-chip--probable={member.confidence === 'probable'}
							class:confidence-chip--posible={member.confidence === 'posible'}
							class:confidence-chip--no_concluyente={member.confidence === 'no_concluyente'}>
							{formatConfidence(member.confidence)}
						</span>
					{/if}

					{#if memberIndex < group.members.length - 1}
						<span class="logic-operator">y</span>
					{/if}
				{/each}
			</span>

			{#if groupIndex < set.groups.length - 1}
				<span class="logic-operator">{connectorLabel(set.connector)}</span>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.unresolved-copy {
		margin: 0;
		color: var(--color-text-soft);
		font-size: 0.82rem;
	}

	.attribution-expression {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.45rem;
		align-items: center;
		font-size: 0.82rem;
		line-height: 1.45;
		color: var(--color-text-main);
	}

	.attribution-group {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.28rem;
	}

	.attribution-group a {
		color: var(--color-brand-blue);
		text-decoration: none;
		font-weight: 500;
	}

	.attribution-group a:hover {
		text-decoration: underline;
	}

	.logic-operator {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.1rem 0.3rem;
		border-radius: 0.25rem;
		background: var(--color-surface-accent-purple);
		color: var(--color-text-accent-purple);
		font-size: 0.67rem;
		font-weight: 700;
		text-transform: uppercase;
		line-height: 1;
	}

	.confidence-chip {
		display: inline-flex;
		align-items: center;
		padding: 0.12rem 0.4rem;
		border-radius: 999px;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.015em;
		line-height: 1;
	}

	.confidence-chip--segura {
		background: #d4edda;
		color: #155724;
	}

	.confidence-chip--probable {
		background: #d1ecf1;
		color: #0c5460;
	}

	.confidence-chip--posible {
		background: #e9ecef;
		color: #495057;
	}

	.confidence-chip--no_concluyente {
		background: #fff3cd;
		color: #856404;
	}
</style>
