<script lang="ts">
	import { onMount } from 'svelte';
	import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';

	type DesktopOffset = 'up' | 'down' | 'none';

	interface Props {
		Icon: any;
		value: string | number;
		label: string;
		href?: string;
		ariaLabel?: string;
		desktopOffset?: DesktopOffset;
	}

	let {
		Icon,
		value,
		label,
		href = undefined,
		ariaLabel = undefined,
		desktopOffset = 'none'
	}: Props = $props();

	let displayValue = $state('');
	let animationFrame = 0;

	const formatter = new Intl.NumberFormat('es-ES');

	const offsetClass = (offset: DesktopOffset): string => {
		if (offset === 'up') return 'lg:-translate-y-[14px]';
		if (offset === 'down') return 'lg:translate-y-[14px]';
		return '';
	};

	const interactiveOffsetClass = (offset: DesktopOffset): string => {
		if (offset === 'up') return 'hover:-translate-y-[2px] focus-visible:-translate-y-[2px] lg:hover:-translate-y-[18px] lg:focus-visible:-translate-y-[18px]';
		if (offset === 'down') return 'hover:-translate-y-[2px] focus-visible:-translate-y-[2px] lg:hover:translate-y-[10px] lg:focus-visible:translate-y-[10px]';
		return 'hover:-translate-y-[2px] focus-visible:-translate-y-[2px]';
	};

	const cardBaseClass =
		'flex min-h-[170px] flex-col items-start gap-[0.65rem] rounded-[10px] border border-border-accent-blue bg-white px-[1.1rem] pb-[1.1rem] pt-[1.35rem] shadow-[0_8px_20px_rgba(25,37,77,0.08)] transition';

	const parseNumericValue = (input: string | number): number | null => {
		if (typeof input === 'number' && Number.isFinite(input)) return input;
		if (typeof input !== 'string') return null;
		const cleaned = input.replace(/[^\d]/g, '');
		if (!cleaned) return null;
		const parsed = Number(cleaned);
		return Number.isFinite(parsed) ? parsed : null;
	};

	const syncDisplayValue = (): void => {
		const targetNumber = parseNumericValue(value);
		if (typeof window === 'undefined' || targetNumber === null) {
			displayValue = String(value);
			return;
		}

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducedMotion) {
			displayValue = formatter.format(targetNumber);
			return;
		}

		cancelAnimationFrame(animationFrame);
		const startedAt = performance.now();
		const duration = 1100;

		const tick = (now: number): void => {
			const progress = Math.min((now - startedAt) / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			displayValue = formatter.format(Math.round(targetNumber * eased));

			if (progress < 1) {
				animationFrame = requestAnimationFrame(tick);
				return;
			}

			displayValue = formatter.format(targetNumber);
		};

		displayValue = '0';
		animationFrame = requestAnimationFrame(tick);
	};

	onMount(() => {
		syncDisplayValue();
		return () => {
			cancelAnimationFrame(animationFrame);
		};
	});

	$effect(() => {
		value;
		syncDisplayValue();
	});
</script>

{#if href}
	<a
		href={href}
		aria-label={ariaLabel}
		class={`group ${`${cardBaseClass} ${offsetClass(desktopOffset)} ${interactiveOffsetClass(desktopOffset)} text-inherit no-underline hover:border-border-accent-blue hover:bg-surface hover:no-underline focus-visible:border-border-accent-blue focus-visible:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue/20`.trim()}`}
	>
		<div class="flex w-full items-start justify-between gap-3">
			<div class="inline-flex h-[2.2rem] w-[2.2rem] items-center justify-center text-text-accent-purple" aria-hidden="true">
				<Icon class="h-[1.9rem] w-[1.9rem] stroke-[2.2]" />
			</div>
			<ArrowUpRight
				class="h-[1.05rem] w-[1.05rem] text-text-soft transition group-hover:text-brand-blue group-focus-visible:text-brand-blue"
				aria-hidden="true"
			/>
		</div>
		<div class="min-w-0">
			<div class="max-w-full whitespace-nowrap text-[clamp(1.8rem,2.7vw,2.35rem)] leading-none font-bold text-brand-blue-dark">{displayValue}</div>
			<div class="font-ui text-[1.04rem] font-medium text-text-main">{label}</div>
		</div>
	</a>
{:else}
	<article class={`${cardBaseClass} ${offsetClass(desktopOffset)}`.trim()}>
		<div class="inline-flex h-[2.2rem] w-[2.2rem] items-center justify-center text-text-accent-purple" aria-hidden="true">
			<Icon class="h-[1.9rem] w-[1.9rem] stroke-[2.2]" />
		</div>
		<div class="min-w-0">
			<div class="max-w-full whitespace-nowrap text-[clamp(1.8rem,2.7vw,2.35rem)] leading-none font-bold text-brand-blue-dark">{displayValue}</div>
			<div class="font-ui text-[1.04rem] font-medium text-text-main">{label}</div>
		</div>
	</article>
{/if}
