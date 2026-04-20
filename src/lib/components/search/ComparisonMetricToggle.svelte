<script lang="ts">
	import AppButton from '$lib/components/ui/AppButton.svelte';

	export type ComparisonMetric = 'frequency10k' | 'occurrences' | 'share';

	interface Props {
		value: ComparisonMetric;
		disabled?: boolean;
		className?: string;
		onchange?: (value: ComparisonMetric) => void;
	}

	let { value, disabled = false, className = '', onchange = () => {} }: Props = $props();

	const setMetric = (next: ComparisonMetric): void => {
		if (disabled || value === next) return;
		onchange(next);
	};

	const buttonClass = (active: boolean): string =>
		`!h-[32px] !rounded-full !px-3.5 !py-1.5 !font-['Roboto',sans-serif] !text-[0.76rem] !font-semibold !border-0 !shadow-none ${
			active
				? '!bg-[#174ea6] !text-white hover:!bg-[#174ea6]'
				: '!bg-transparent !text-[#355a88] hover:!bg-[#dfe9f8]'
		}`;
</script>

<div class={`inline-flex rounded-full border border-[#d2deef] bg-[#edf3fc] p-1 ${className}`.trim()}>
	<AppButton
		type="button"
		variant="ghost"
		className={buttonClass(value === 'frequency10k')}
		onclick={() => setMetric('frequency10k')}
		disabled={disabled}
		ariaPressed={value === 'frequency10k'}
	>
		Frecuencia/10k
	</AppButton>
	<AppButton
		type="button"
		variant="ghost"
		className={buttonClass(value === 'occurrences')}
		onclick={() => setMetric('occurrences')}
		disabled={disabled}
		ariaPressed={value === 'occurrences'}
	>
		Concurrencias
	</AppButton>
	<AppButton
		type="button"
		variant="ghost"
		className={buttonClass(value === 'share')}
		onclick={() => setMetric('share')}
		disabled={disabled}
		ariaPressed={value === 'share'}
	>
		Reparto %
	</AppButton>
</div>
