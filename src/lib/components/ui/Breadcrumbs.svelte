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

<nav class="mb-4" aria-label="Breadcrumb">
	<ol class="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-[0.83rem] font-ui text-text-soft">
		{#each items as item, index}
			<li>
				{#if item.href}
					<a class="text-inherit no-underline hover:no-underline focus-visible:no-underline" href={item.href}
						>{item.label}</a
					>
				{:else}
					<span class="font-semibold text-brand-purple-dark">{item.label}</span>
				{/if}
			</li>
			{#if index < items.length - 1}
				<li aria-hidden="true" class="opacity-55">/</li>
			{/if}
		{/each}
	</ol>
</nav>
