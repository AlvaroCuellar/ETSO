<script lang="ts">
	export interface BreadcrumbItem {
		label: string;
		href?: string;
	}

	interface Props {
		items: BreadcrumbItem[];
	}

	let { items }: Props = $props();
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
	<ol class="breadcrumbs__list">
		{#each items as item, index}
			<li>
				{#if item.href}
					<a href={item.href}>{item.label}</a>
				{:else}
					<span class="breadcrumbs__current">{item.label}</span>
				{/if}
			</li>
			{#if index < items.length - 1}
				<li class="breadcrumbs__separator" aria-hidden="true">/</li>
			{/if}
		{/each}
	</ol>
</nav>
