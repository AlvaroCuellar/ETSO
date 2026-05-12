<script lang="ts">
	import InfoCard from '$lib/components/ui/InfoCard.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		highlighted?: boolean;
		class?: string;
		children?: Snippet;
	}

	let { label, highlighted = false, class: className = '', children }: Props = $props();
</script>

<InfoCard {label} {highlighted} class={className}>
	{#if children}
		{@render children()}
	{/if}
</InfoCard>
