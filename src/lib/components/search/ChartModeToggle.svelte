<script lang="ts">
	import AppButton from '$lib/components/ui/AppButton.svelte';

	type ChartMode = 'bars' | 'pie';

	interface Props {
		value: ChartMode;
		disabled?: boolean;
		className?: string;
		onchange?: (value: ChartMode) => void;
	}

	let { value, disabled = false, className = '', onchange = () => {} }: Props = $props();

	const setMode = (next: ChartMode): void => {
		if (disabled || value === next) return;
		onchange(next);
	};

	const buttonClass = (active: boolean): string =>
		`!h-[32px] !rounded-full !px-3.5 !py-1.5 !font-['Roboto',sans-serif] !text-[0.78rem] !font-semibold !border-0 !shadow-none ${
			active
				? '!bg-[#174ea6] !text-white hover:!bg-[#174ea6]'
				: '!bg-transparent !text-[#355a88] hover:!bg-[#dfe9f8]'
		}`;
</script>

<div class={`inline-flex rounded-full border border-[#d2deef] bg-[#edf3fc] p-1 ${className}`.trim()}>
	<AppButton
		type="button"
		variant="ghost"
		className={buttonClass(value === 'bars')}
		onclick={() => setMode('bars')}
		disabled={disabled}
		ariaPressed={value === 'bars'}
	>
		Barras
	</AppButton>
	<AppButton
		type="button"
		variant="ghost"
		className={buttonClass(value === 'pie')}
		onclick={() => setMode('pie')}
		disabled={disabled}
		ariaPressed={value === 'pie'}
	>
		Circular %
	</AppButton>
</div>
