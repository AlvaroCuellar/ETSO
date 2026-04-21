<script lang="ts">
	import { onMount } from 'svelte';
	import type { ECharts, EChartsOption } from 'echarts';

	export type ComparisonMetric = 'frequency10k' | 'occurrences' | 'share';

	export interface TexoroComparisonSeries {
		key: string;
		label: string;
		color: string;
	}

	export interface TexoroComparisonRow {
		label: string;
		occurrences: number[];
		frequency10k: number[];
		totalOccurrences: number;
	}

	interface Props {
		metric: ComparisonMetric;
		series: TexoroComparisonSeries[];
		rows: TexoroComparisonRow[];
		height?: number;
		className?: string;
	}

	let { metric, series, rows, height = 350, className = '' }: Props = $props();

	let host = $state<HTMLDivElement | null>(null);
	let chart = $state<ECharts | null>(null);
	let resizeObserver: ResizeObserver | null = null;
	let echartsModule: typeof import('echarts') | null = null;

	const brandBlueDark = '#002681';
	const textSoft = '#4f5562';
	const borderAccentBlue = '#c9d9f3';

	const decimalFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

	const truncateLabel = (value: string, maxLength = 34): string =>
		value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;

	const metricValueForRow = (row: TexoroComparisonRow, seriesIndex: number): number => {
		if (metric === 'occurrences') return row.occurrences[seriesIndex] ?? 0;
		if (metric === 'frequency10k') return row.frequency10k[seriesIndex] ?? 0;
		const base = row.totalOccurrences || 0;
		if (base <= 0) return 0;
		return ((row.occurrences[seriesIndex] ?? 0) / base) * 100;
	};

	const xAxisLabel = (value: number): string => {
		if (metric === 'share') return `${decimalFormatter.format(value)}%`;
		return decimalFormatter.format(value);
	};

	const tooltipFormatter = (params: unknown): string => {
		const list = Array.isArray(params) ? params : [params];
		if (list.length === 0) return '';
		const first = list[0] as { dataIndex?: number };
		const dataIndex = typeof first?.dataIndex === 'number' ? first.dataIndex : -1;
		const row = dataIndex >= 0 ? rows[dataIndex] : null;
		if (!row) return '';

		const lines = [`<strong>${row.label}</strong>`];
		for (const entry of list as Array<{ seriesIndex?: number; marker?: string }>) {
			const seriesIndex = typeof entry.seriesIndex === 'number' ? entry.seriesIndex : -1;
			if (seriesIndex < 0 || seriesIndex >= series.length) continue;
			const seriesMeta = series[seriesIndex];
			const occ = row.occurrences[seriesIndex] ?? 0;
			const per10k = row.frequency10k[seriesIndex] ?? 0;
			const share = row.totalOccurrences > 0 ? (occ / row.totalOccurrences) * 100 : 0;
			const mainValue = metricValueForRow(row, seriesIndex);
			lines.push(
				`${entry.marker ?? ''}${seriesMeta.label}: ${decimalFormatter.format(mainValue)}${
					metric === 'share' ? '%' : ''
				}<br/><span style="opacity:.86">occ: ${decimalFormatter.format(occ)} · /10k: ${decimalFormatter.format(per10k)} · %: ${decimalFormatter.format(share)}%</span>`
			);
		}
		return lines.join('<br/>');
	};

	const buildOption = (): EChartsOption => {
		const categoryLabels = rows.map((row) => truncateLabel(row.label));
		const shareMetric = metric === 'share';
		const perSeriesValues = series.map((_, seriesIndex) =>
			rows.map((row) => Number(metricValueForRow(row, seriesIndex).toFixed(4)))
		);

		return {
			animationDuration: 420,
			grid: {
				top: 48,
				right: 22,
				bottom: 24,
				left: 6,
				containLabel: true
			},
			legend: {
				type: 'scroll',
				top: 2,
				left: 'center',
				itemWidth: 11,
				itemHeight: 11,
				textStyle: {
					color: brandBlueDark,
					fontFamily: 'Roboto',
					fontSize: 11.5
				},
				pageTextStyle: {
					color: textSoft,
					fontFamily: 'Roboto'
				},
				formatter: (name: string): string => truncateLabel(name, 22)
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				backgroundColor: 'rgba(0,38,129,0.94)',
				borderWidth: 0,
				textStyle: { color: '#f4f8ff', fontFamily: 'Roboto' },
				formatter: (params: unknown): string => tooltipFormatter(params)
			},
			xAxis: {
				type: 'value',
				max: shareMetric ? 100 : undefined,
				minInterval: shareMetric ? 5 : 0.1,
				axisLabel: {
					color: textSoft,
					fontFamily: 'Roboto',
					fontSize: 11,
					formatter: (value: number): string => xAxisLabel(value)
				},
				splitLine: {
					lineStyle: {
						color: borderAccentBlue
					}
				}
			},
			yAxis: {
				type: 'category',
				inverse: true,
				data: categoryLabels,
				axisTick: { show: false },
				axisLine: { show: false },
				axisLabel: {
					color: brandBlueDark,
					fontFamily: 'Roboto',
					fontSize: 12,
					margin: 12
				}
			},
			series: series.map((meta, seriesIndex) => ({
				name: meta.label,
				type: 'bar',
				barMaxWidth: shareMetric ? 22 : 14,
				stack: shareMetric ? 'share' : undefined,
				itemStyle: {
					color: meta.color,
					borderRadius: shareMetric ? [0, 0, 0, 0] : [0, 8, 8, 0]
				},
				label: shareMetric
					? {
							show: true,
							position: 'insideRight',
							color: '#ffffff',
							fontFamily: 'Roboto',
							fontWeight: 600,
							fontSize: 10.5,
							formatter: (params: unknown): string => {
								const value =
									typeof params === 'object' && params
										? (params as { value?: number }).value ?? 0
										: 0;
								return value >= 8 ? `${decimalFormatter.format(value)}%` : '';
							}
						}
					: { show: false },
				emphasis: { focus: 'series' },
				data: perSeriesValues[seriesIndex]
			}))
		};
	};

	const initializeChart = async (): Promise<void> => {
		if (!host || chart) return;
		if (!echartsModule) echartsModule = await import('echarts');
		chart = echartsModule.init(host, undefined, { renderer: 'canvas' });
		chart.setOption(buildOption(), true);
		resizeObserver = new ResizeObserver(() => {
			chart?.resize();
		});
		resizeObserver.observe(host);
	};

	export function getPngDataUrl(pixelRatio = 4): string | null {
		if (!chart) return null;
		return chart.getDataURL({
			type: 'png',
			pixelRatio,
			backgroundColor: '#ffffff'
		});
	}

	onMount(() => {
		void initializeChart();
		return () => {
			resizeObserver?.disconnect();
			resizeObserver = null;
			chart?.dispose();
			chart = null;
		};
	});

	$effect(() => {
		metric;
		rows;
		series;
		if (!chart) return;
		chart.setOption(buildOption(), true);
		chart.resize();
	});
</script>

<div
	bind:this={host}
	class={`w-full rounded-[9px] ${className}`.trim()}
	style={`height:${height}px;`}
	aria-label="Grafico comparativo por términos"
></div>
