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
