<script lang="ts">
	import { onMount } from 'svelte';
	import type { ECharts, EChartsOption } from 'echarts';

	export interface TexoroChartRow {
		label: string;
		value: number;
		percentage: number;
		color: string;
	}

	type ChartMode = 'bars' | 'pie';

	interface Props {
		mode: ChartMode;
		rows: TexoroChartRow[];
		total: number;
		height?: number;
		className?: string;
	}

	let { mode, rows, total, height = 320, className = '' }: Props = $props();

	let host = $state<HTMLDivElement | null>(null);
	let chart = $state<ECharts | null>(null);
	let resizeObserver: ResizeObserver | null = null;
	let echartsModule: typeof import('echarts') | null = null;

	const brandBlueDark = '#002681';
	const textSoft = '#4f5562';
	const borderAccentBlue = '#c9d9f3';

	const decimalFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

	const truncateLabel = (value: string, maxLength = 38): string =>
		value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;

	const isNearlyInteger = (value: number): boolean => Math.abs(value - Math.round(value)) < 1e-9;

	const buildBarOption = (): EChartsOption => {
		const maxValue = Math.max(1, ...rows.map((row) => row.value));
		const hasSingleBar = rows.length <= 1;
		const allIntegerValues = rows.every((row) => isNearlyInteger(row.value));
		const paddedMax = hasSingleBar ? maxValue : maxValue * 1.08;
		const axisMax = allIntegerValues
			? hasSingleBar
				? Math.max(1, Math.round(maxValue))
				: Math.max(1, Math.ceil(paddedMax))
			: Math.max(1, Number((Math.ceil(paddedMax * 10) / 10).toFixed(1)));

		const formatAxisValue = (value: number): string => {
			if (allIntegerValues) return `${Math.round(value)}`;
			return decimalFormatter.format(Number(value.toFixed(1)));
		};

		return {
			animationDuration: 380,
			grid: {
				top: 8,
				right: 24,
				bottom: 24,
				left: 6,
				containLabel: true
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				backgroundColor: 'rgba(0,38,129,0.94)',
				borderWidth: 0,
				textStyle: { color: '#f4f8ff', fontFamily: 'Roboto' },
				formatter: (params: unknown): string => {
					const first = Array.isArray(params) ? params[0] : params;
					const dataIndex = typeof first === 'object' && first ? (first as { dataIndex?: number }).dataIndex : -1;
					const row = typeof dataIndex === 'number' ? rows[dataIndex] : null;
					if (!row) return '';
					return `${row.label}<br/>${decimalFormatter.format(row.value)} (${decimalFormatter.format(row.percentage)}%)`;
				}
			},
			xAxis: {
				type: 'value',
				max: axisMax,
				minInterval: allIntegerValues ? 1 : 0.1,
				splitNumber: hasSingleBar ? 5 : 6,
				axisLabel: {
					color: textSoft,
					fontFamily: 'Roboto',
					fontSize: 11,
					formatter: (value: number): string => formatAxisValue(value)
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
				data: rows.map((row) => truncateLabel(row.label)),
				axisTick: { show: false },
				axisLine: { show: false },
				axisLabel: {
					color: brandBlueDark,
					fontFamily: 'Roboto',
					fontSize: 12,
					margin: 12
				}
			},
			series: [
				{
					type: 'bar',
					barMaxWidth: 18,
					itemStyle: {
						borderRadius: [0, 8, 8, 0]
					},
					label: {
						show: true,
						position: 'right',
						color: brandBlueDark,
						fontFamily: 'Roboto',
						fontWeight: 600,
						fontSize: 11.5,
						formatter: (params: unknown): string => {
							const dataIndex =
								typeof params === 'object' && params
									? (params as { dataIndex?: number }).dataIndex
									: -1;
							const row = typeof dataIndex === 'number' ? rows[dataIndex] : null;
							if (!row) return '';
							return `${decimalFormatter.format(row.value)} (${decimalFormatter.format(row.percentage)}%)`;
						}
					},
					data: rows.map((row) => ({
						value: Number(row.value.toFixed(3)),
						itemStyle: { color: row.color }
					}))
				}
			]
		};
	};

	const buildPieOption = (): EChartsOption => ({
		animationDuration: 380,
		tooltip: {
			trigger: 'item',
			backgroundColor: 'rgba(0,38,129,0.94)',
			borderWidth: 0,
			textStyle: { color: '#f4f8ff', fontFamily: 'Roboto' },
			formatter: (params: unknown): string => {
				const item = params as { name?: string; value?: number; percent?: number };
				return `${item.name ?? ''}<br/>${decimalFormatter.format(item.value ?? 0)} (${decimalFormatter.format(item.percent ?? 0)}%)`;
			}
		},
		legend: {
			type: 'scroll',
			bottom: 0,
			left: 'center',
			itemWidth: 11,
			itemHeight: 11,
			pageTextStyle: {
				color: textSoft,
				fontFamily: 'Roboto'
			},
			textStyle: {
				color: brandBlueDark,
				fontFamily: 'Roboto',
				fontSize: 11.5
			},
			formatter: (name: string): string => truncateLabel(name, 28)
		},
		series: [
			{
				type: 'pie',
				radius: ['44%', '71%'],
				center: ['50%', '39%'],
				itemStyle: {
					borderColor: '#ffffff',
					borderWidth: 2
				},
				label: {
					show: false
				},
				data: rows.map((row) => ({
					name: row.label,
					value: Number(row.value.toFixed(3)),
					itemStyle: { color: row.color }
				}))
			}
		],
		graphic: [
			{
				type: 'group',
				left: 'center',
				top: '30%',
				children: [
					{
						type: 'text',
						left: 'center',
						style: {
							text: decimalFormatter.format(total),
							font: '700 18px Roboto',
							fill: brandBlueDark
						}
					},
					{
						type: 'text',
						top: 24,
						left: 'center',
						style: {
							text: 'total',
							font: '500 11px Roboto',
							fill: textSoft
						}
					}
				]
			}
		]
	});

	const buildOption = (): EChartsOption => (mode === 'bars' ? buildBarOption() : buildPieOption());

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
		mode;
		rows;
		total;
		if (!chart) return;
		chart.setOption(buildOption(), true);
		chart.resize();
	});
</script>

<div
	bind:this={host}
	class={`w-full rounded-[9px] ${className}`.trim()}
	style={`height:${height}px;`}
	aria-label="Grafico de concurrencias"
></div>
