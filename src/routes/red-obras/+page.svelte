<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { normalizePlainText } from '$lib/search/normalize';
	import { formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';

	import type { WorkNetworkGraph, WorkNetworkLink, WorkNetworkNode } from '$lib/domain/catalog';

	const emptyGraph: WorkNetworkGraph = { nodes: [], links: [] };

	interface NetworkLabel {
		id: string;
		left: number;
		top: number;
		title: string;
		genre: string;
		traditional: string;
		stylometry: string;
		active: boolean;
	}

	let canvasElement: HTMLCanvasElement | null = null;
	let graph = $state<WorkNetworkGraph>(emptyGraph);
	let graphLoading = $state(true);
	let graphError = $state('');
	let query = $state('');
	let attributionFilter = $state('');
	let selectedId = $state('');
	let hoveredId = $state('');
	let labels = $state<NetworkLabel[]>([]);

	const nodeById = $derived(new Map(graph.nodes.map((node) => [node.id, node])));
	const allAttributions = $derived(
		Array.from(
			new Set(graph.nodes.flatMap((node) => [...node.traditionalAuthors, ...node.stylometryAuthors]))
		)
			.filter(Boolean)
			.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
	);

	const normalizeFilterText = (value: string): string =>
		normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

	const formatPeople = (people: string[]): string => people.length > 0 ? people.join(', ') : 'No determinada';

	const selectedNode = $derived.by(() => nodeById.get(selectedId));
	const hoveredNode = $derived.by(() => nodeById.get(hoveredId));

	const visibleNodeIds = $derived.by(() => {
		const normalizedQuery = normalizeFilterText(query);
		const ids = new Set<string>();
		for (const node of graph.nodes) {
			const matchesQuery = !normalizedQuery || normalizeFilterText(node.searchText).includes(normalizedQuery);
			const matchesAttribution =
				!attributionFilter ||
				node.traditionalAuthors.includes(attributionFilter) ||
				node.stylometryAuthors.includes(attributionFilter);
			if (matchesQuery && matchesAttribution) ids.add(node.id);
		}
		return ids;
	});

	const filteredCount = $derived(visibleNodeIds.size);

	const visibleResults = $derived.by(() =>
		graph.nodes
			.filter((node) => visibleNodeIds.has(node.id))
			.slice(0, 12)
	);

	const selectedLinks = $derived.by(() => {
		if (!selectedId) return [];
		return graph.links
			.filter((link) => link.source === selectedId || link.target === selectedId)
			.map((link) => ({
				link,
				node: nodeById.get(link.source === selectedId ? link.target : link.source)
			}))
			.filter((entry): entry is { link: WorkNetworkLink; node: WorkNetworkNode } => Boolean(entry.node))
			.sort((a, b) => a.link.distance - b.link.distance)
			.slice(0, 8);
	});

	$effect(() => {
		if (!selectedId && graph.nodes[0]) selectedId = graph.nodes[0].id;
	});

	onMount(() => {
		if (!browser || !canvasElement) return;

		let disposed = false;
		let frameId = 0;
		let scene: import('three').Scene;
		let camera: import('three').PerspectiveCamera;
		let renderer: import('three').WebGLRenderer;
		let controls: import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;
		let nodesMesh: import('three').InstancedMesh;
		let linksMesh: import('three').LineSegments;
		let highlightLines: import('three').LineSegments;
		let resizeObserver: ResizeObserver;

		const nodePositions = new Map<string, import('three').Vector3>();
		const selectedNeighbors = new Set<string>();
		const colorByAttribution = new Map<string, import('three').Color>();

		const init = async () => {
			graphLoading = true;
			graphError = '';
			try {
				const response = await fetch('/api/red-obras');
				if (!response.ok) throw new Error(`No se pudo cargar el grafo: ${response.status}`);
				graph = (await response.json()) as WorkNetworkGraph;
			} catch (cause) {
				graphError = cause instanceof Error ? cause.message : 'No se pudo cargar el grafo';
				graphLoading = false;
				return;
			}

			const THREE = await import('three');
			const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
			if (disposed || !canvasElement) return;

			const nodeKey = (node: WorkNetworkNode): string =>
				node.traditionalAuthors[0] || 'No determinada';

			const nodeColor = (node: WorkNetworkNode): import('three').Color => {
				const key = nodeKey(node);
				const cached = colorByAttribution.get(key);
				if (cached) return cached;
				if (key === 'No determinada') {
					const color = new THREE.Color('#8b96a6');
					colorByAttribution.set(key, color);
					return color;
				}
				let hash = 2166136261;
				for (let index = 0; index < key.length; index += 1) {
					hash ^= key.charCodeAt(index);
					hash = Math.imul(hash, 16777619);
				}
				const normalized = hash >>> 0;
				const hue = ((normalized * 0.618033988749895) % 1 + 1) % 1;
				const saturation = 0.82 + ((normalized >>> 8) % 12) / 100;
				const lightness = 0.56 + ((normalized >>> 16) % 12) / 100;
				const color = new THREE.Color().setHSL(hue, saturation, lightness);
				colorByAttribution.set(key, color);
				return color;
			};

			const degree = new Map<string, number>();
			for (const link of graph.links) {
				degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
				degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
			}

			for (const node of graph.nodes) {
				nodePositions.set(node.id, new THREE.Vector3(node.x, node.y, node.z));
			}

			scene = new THREE.Scene();
			scene.background = new THREE.Color('#fbfcff');
			scene.fog = new THREE.Fog('#fbfcff', 560, 1250);
			camera = new THREE.PerspectiveCamera(52, 1, 0.1, 1000);
			camera.position.set(0, 0, 720);
			renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true, alpha: false });
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

			controls = new OrbitControls(camera, canvasElement);
			controls.enableDamping = true;
			controls.dampingFactor = 0.075;
			controls.minDistance = 28;
			controls.maxDistance = 1200;

			const sphere = new THREE.SphereGeometry(1.25, 14, 10);
			const material = new THREE.MeshBasicMaterial({ vertexColors: true });
			nodesMesh = new THREE.InstancedMesh(sphere, material, graph.nodes.length);
			nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
			scene.add(nodesMesh);

			const linePositions: number[] = [];
			const lineColors: number[] = [];
			for (const link of graph.links) {
				const source = nodePositions.get(link.source);
				const target = nodePositions.get(link.target);
				if (!source || !target) continue;
				const sourceNode = nodeById.get(link.source);
				const targetNode = nodeById.get(link.target);
				const sameCommunity = Boolean(sourceNode && targetNode && sourceNode.community === targetNode.community);
				const strength = Math.max(0, Math.min(1, 1 - link.distance / 3));
				const color = sameCommunity
					? new THREE.Color('#a9bbcf').lerp(new THREE.Color('#244f82'), 0.45 + strength * 0.45)
					: new THREE.Color('#eef2f7').lerp(new THREE.Color('#c7d1df'), strength * 0.25);
				linePositions.push(source.x, source.y, source.z, target.x, target.y, target.z);
				lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
			}
			const lineGeometry = new THREE.BufferGeometry();
			lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
			lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
			linksMesh = new THREE.LineSegments(
				lineGeometry,
				new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.34 })
			);
			scene.add(linksMesh);

			highlightLines = new THREE.LineSegments(
				new THREE.BufferGeometry(),
				new THREE.LineBasicMaterial({ color: '#b45f06', transparent: true, opacity: 0.95 })
			);
			scene.add(highlightLines);

			const updateNodes = () => {
				const matrix = new THREE.Matrix4();
				const color = new THREE.Color();
				const muted = new THREE.Color('#b9c2cf');
				const selectedColor = new THREE.Color('#b45f06');
				const visible = visibleNodeIds;
				for (const [index, node] of graph.nodes.entries()) {
					const position = nodePositions.get(node.id);
					if (!position) continue;
					const isSelected = node.id === selectedId;
					const isHovered = node.id === hoveredId;
					const isNeighbor = selectedNeighbors.has(node.id);
					const isVisible = visible.has(node.id);
					const nodeDegree = degree.get(node.id) ?? 1;
					const base = 0.95 + Math.min(1.35, Math.log1p(nodeDegree) * 0.22);
					const scale = isSelected ? 3.5 : isHovered ? 3.1 : isNeighbor ? 2.35 : isVisible ? base : 0.32;
					matrix.makeScale(scale, scale, scale);
					matrix.setPosition(position);
					nodesMesh.setMatrixAt(index, matrix);
					color.copy(nodeColor(node));
					if (!isVisible) color.copy(muted);
					if (isNeighbor) color.lerp(selectedColor, 0.32);
					if (isSelected || isHovered) color.copy(selectedColor);
					nodesMesh.setColorAt(index, color);
				}
				nodesMesh.instanceMatrix.needsUpdate = true;
				if (nodesMesh.instanceColor) nodesMesh.instanceColor.needsUpdate = true;
			};

			const updateHighlight = () => {
				selectedNeighbors.clear();
				const selectedPosition = nodePositions.get(selectedId);
				const positions: number[] = [];
				if (selectedPosition) {
					for (const link of graph.links) {
						const relatedId =
							link.source === selectedId ? link.target : link.target === selectedId ? link.source : '';
						if (!relatedId) continue;
						selectedNeighbors.add(relatedId);
						const relatedPosition = nodePositions.get(relatedId);
						if (!relatedPosition) continue;
						positions.push(
							selectedPosition.x,
							selectedPosition.y,
							selectedPosition.z,
							relatedPosition.x,
							relatedPosition.y,
							relatedPosition.z
						);
					}
				}
				highlightLines.geometry.dispose();
				const geometry = new THREE.BufferGeometry();
				geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
				highlightLines.geometry = geometry;
				updateNodes();
			};

			const updateLabels = () => {
				if (!canvasElement) return;
				const rect = canvasElement.getBoundingClientRect();
				const labelIds = new Set<string>();
				if (selectedId) labelIds.add(selectedId);
				if (hoveredId) labelIds.add(hoveredId);
				for (const id of selectedNeighbors) labelIds.add(id);
				if (query || attributionFilter) {
					for (const node of visibleResults.slice(0, 24)) labelIds.add(node.id);
				}

				const projected: NetworkLabel[] = [];
				for (const id of labelIds) {
					const node = graph.nodes.find((candidate) => candidate.id === id);
					const position = nodePositions.get(id);
					if (!node || !position) continue;
					const vector = position.clone().project(camera);
					if (vector.z < -1 || vector.z > 1) continue;
					projected.push({
						id,
						left: ((vector.x + 1) / 2) * rect.width,
						top: ((1 - vector.y) / 2) * rect.height - 18,
						title: formatDisplayWorkTitle(node.title),
						genre: node.genre,
						traditional: formatPeople(node.traditionalAuthors),
						stylometry: formatPeople(node.stylometryAuthors),
						active: id === selectedId || id === hoveredId
					});
				}
				labels = projected;
			};

			const centerSelected = () => {
				const position = nodePositions.get(selectedId);
				if (!position) return;
				controls.target.copy(position);
				camera.position.copy(position.clone().add(new THREE.Vector3(0, 0, 120)));
				controls.update();
			};

			const raycaster = new THREE.Raycaster();
			const pointer = new THREE.Vector2();

			const handlePointerMove = (event: PointerEvent) => {
				if (!canvasElement) return;
				const rect = canvasElement.getBoundingClientRect();
				pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
				pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
				raycaster.setFromCamera(pointer, camera);
				const hit = raycaster.intersectObject(nodesMesh, false)[0];
				const nextId =
					hit && typeof hit.instanceId === 'number' ? graph.nodes[hit.instanceId]?.id ?? '' : '';
				if (nextId !== hoveredId) hoveredId = nextId;
			};

			const handleClick = () => {
				if (!hoveredId) return;
				selectedId = hoveredId;
			};

			const handleDoubleClick = () => {
				if (!hoveredId) return;
				selectedId = hoveredId;
				centerSelected();
			};

			canvasElement.addEventListener('pointermove', handlePointerMove);
			canvasElement.addEventListener('click', handleClick);
			canvasElement.addEventListener('dblclick', handleDoubleClick);

			const resize = () => {
				if (!canvasElement) return;
				const rect = canvasElement.getBoundingClientRect();
				const width = Math.max(1, rect.width);
				const height = Math.max(1, rect.height);
				camera.aspect = width / height;
				camera.updateProjectionMatrix();
				renderer.setSize(width, height, false);
			};
			resizeObserver = new ResizeObserver(resize);
			resizeObserver.observe(canvasElement);
			resize();
			updateHighlight();
			graphLoading = false;

			const animate = () => {
				if (disposed) return;
				controls.update();
				updateLabels();
				renderer.render(scene, camera);
				frameId = requestAnimationFrame(animate);
			};
			animate();

			const stopEffects = $effect.root(() => {
				$effect(() => {
					visibleNodeIds;
					hoveredId;
					updateNodes();
				});
				$effect(() => {
					selectedId;
					updateHighlight();
				});
			});

			(window as Window & { centerSelectedWorkNode?: () => void }).centerSelectedWorkNode = centerSelected;

			return () => {
				stopEffects();
				delete (window as Window & { centerSelectedWorkNode?: () => void }).centerSelectedWorkNode;
				canvasElement?.removeEventListener('pointermove', handlePointerMove);
				canvasElement?.removeEventListener('click', handleClick);
				canvasElement?.removeEventListener('dblclick', handleDoubleClick);
			};
		};

		let cleanupEvents: (() => void) | undefined;
		void init().then((cleanup) => {
			cleanupEvents = cleanup;
		});

		return () => {
			disposed = true;
			labels = [];
			if (frameId) cancelAnimationFrame(frameId);
			cleanupEvents?.();
			resizeObserver?.disconnect();
			controls?.dispose();
			nodesMesh?.geometry.dispose();
			(nodesMesh?.material as import('three').Material | undefined)?.dispose();
			linksMesh?.geometry.dispose();
			(linksMesh?.material as import('three').Material | undefined)?.dispose();
			highlightLines?.geometry.dispose();
			(highlightLines?.material as import('three').Material | undefined)?.dispose();
			renderer?.dispose();
		};
	});
</script>

<SeoHead
	title="Red 3D de obras"
	description="Visualización experimental de relaciones estilométricas entre obras de Examen de autorías."
	path="/red-obras"
/>

<div class="grid gap-5">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Red 3D de obras' }]} />

	<section class="grid gap-2">
		<h1 class="m-0 font-ui text-[clamp(1.8rem,3vw,2.35rem)] font-bold leading-[1.12] text-brand-blue-dark">
			Red 3D de obras
		</h1>
		<p class="m-0 max-w-4xl leading-[1.65] text-text-main">
			Visualización experimental de relaciones estilométricas. Cada obra se conecta con sus tres obras más cercanas según las distancias de obra completa.
		</p>
	</section>

	<section class="relative left-1/2 right-1/2 min-h-[calc(100dvh-9rem)] w-[100dvw] max-w-[100dvw] -translate-x-1/2 overflow-hidden bg-[#fbfcff]">
		<canvas bind:this={canvasElement} class="absolute inset-0 h-full w-full touch-none"></canvas>

		<div class="pointer-events-none absolute inset-0 z-[5]">
			{#each labels as label (label.id)}
				<div
					class={`node-label absolute max-w-[18rem] -translate-x-1/2 -translate-y-full rounded-md border px-2.5 py-2 text-left shadow-soft ${label.active ? 'border-brand-blue/35 bg-white/96' : 'border-border bg-white/88'}`}
					style={`left: ${label.left}px; top: ${label.top}px;`}
				>
					<span class="block text-[0.78rem] font-semibold leading-[1.25] text-brand-blue-dark">
						{label.title}
					</span>
					<span class="mt-1 block text-[0.68rem] leading-[1.25] text-text-soft">
						{label.genre}
					</span>
					<span class="mt-1 block text-[0.66rem] leading-[1.25] text-text-soft">
						Trad.: {label.traditional}
					</span>
					<span class="block text-[0.66rem] leading-[1.25] text-text-soft">
						Estil.: {label.stylometry}
					</span>
				</div>
			{/each}
		</div>

		{#if graphLoading}
			<div class="absolute inset-0 z-20 grid place-items-center bg-[#fbfcff] text-[0.95rem] font-medium text-text-soft">
				Calculando red de fuerzas...
			</div>
		{:else if graphError}
			<div class="absolute inset-0 z-20 grid place-items-center bg-[#fbfcff] px-4 text-center text-[0.95rem] font-medium text-text-soft">
				{graphError}
			</div>
		{/if}

		<div class="pointer-events-none absolute inset-x-0 top-0 z-10">
			<div class="pointer-events-auto mx-auto grid w-full max-w-7xl gap-3 px-4 py-4 md:grid-cols-[minmax(16rem,1fr)_minmax(13rem,20rem)_auto] md:items-end">
				<label class="grid gap-1 text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-text-soft" for="network-query">
					Buscar en título, género y atribuciones
					<input
						id="network-query"
						type="search"
						bind:value={query}
						placeholder="Ej: La dama boba, comedia, Lope..."
						class="h-10 rounded-md border border-border bg-white/94 px-3 text-[0.92rem] font-normal normal-case tracking-normal text-text-main shadow-soft"
					/>
				</label>

				<label class="grid gap-1 text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-text-soft" for="network-attribution">
					Atribución
					<select
						id="network-attribution"
						bind:value={attributionFilter}
						class="h-10 rounded-md border border-border bg-white/94 px-3 text-[0.92rem] font-normal normal-case tracking-normal text-text-main shadow-soft"
					>
						<option value="">Todas</option>
						{#each allAttributions as attribution}
							<option value={attribution}>{attribution}</option>
						{/each}
					</select>
				</label>

				<div class="rounded-md border border-border bg-white/94 px-3 py-2 text-[0.86rem] text-text-soft shadow-soft">
					<span class="font-semibold text-brand-blue-dark">{filteredCount}</span> de {graph.nodes.length} obras
				</div>
			</div>

			{#if (query || attributionFilter) && visibleResults.length > 0}
				<div class="pointer-events-auto mx-auto grid w-full max-w-7xl px-4">
					<div class="max-h-52 overflow-auto rounded-md border border-border bg-white/95 shadow-soft md:max-w-2xl">
						{#each visibleResults as node}
							<button
								type="button"
								class="block w-full border-0 border-b border-border bg-transparent px-3 py-2 text-left last:border-b-0 hover:bg-surface-accent-blue"
								onclick={() => {
									selectedId = node.id;
								}}
							>
								<span class="block text-[0.92rem] font-semibold leading-[1.35] text-brand-blue-dark">
									{formatDisplayWorkTitle(node.title)}
								</span>
								<span class="block text-[0.78rem] leading-[1.35] text-text-soft">
									{node.genre} · Trad.: {formatPeople(node.traditionalAuthors)} · Estil.: {formatPeople(node.stylometryAuthors)}
								</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		{#if hoveredNode && hoveredNode.id !== selectedId}
			<div class="pointer-events-none absolute left-4 top-[8.5rem] z-10 hidden max-w-md rounded-md border border-border bg-white/96 px-3 py-2 text-[0.84rem] text-text-main shadow-soft md:block">
				<span class="block font-semibold leading-[1.35] text-brand-blue-dark">{formatDisplayWorkTitle(hoveredNode.title)}</span>
				<span class="block leading-[1.45] text-text-soft">{hoveredNode.genre}</span>
				<span class="block leading-[1.45] text-text-soft">Trad.: {formatPeople(hoveredNode.traditionalAuthors)}</span>
				<span class="block leading-[1.45] text-text-soft">Estil.: {formatPeople(hoveredNode.stylometryAuthors)}</span>
			</div>
		{/if}

		{#if selectedNode}
			<aside class="absolute bottom-4 left-4 right-4 z-10 max-w-2xl rounded-md border border-border bg-white/96 p-4 shadow-soft md:left-auto md:right-6 md:w-[30rem]">
				<p class="m-0 font-ui text-[0.78rem] font-bold uppercase tracking-[0.05em] text-text-soft">Obra seleccionada</p>
				<h2 class="m-0 mt-1 text-[1.08rem] font-semibold leading-[1.25] text-brand-blue-dark">
					{formatDisplayWorkTitle(selectedNode.title)}
				</h2>
				<div class="mt-3 grid gap-2 text-[0.9rem] leading-[1.45] text-text-main">
					<p class="m-0"><span class="font-semibold text-text-soft">Género:</span> {selectedNode.genre}</p>
					<p class="m-0"><span class="font-semibold text-text-soft">Atribución tradicional:</span> {formatPeople(selectedNode.traditionalAuthors)}</p>
					<p class="m-0"><span class="font-semibold text-text-soft">Atribución estilometría:</span> {formatPeople(selectedNode.stylometryAuthors)}</p>
				</div>

				{#if selectedLinks.length > 0}
					<div class="mt-3 border-t border-border pt-3">
						<p class="m-0 mb-1 text-[0.78rem] font-bold uppercase tracking-[0.05em] text-text-soft">Obras conectadas</p>
						<div class="grid gap-1">
							{#each selectedLinks as entry}
								<button
									type="button"
									class="grid border-0 bg-transparent p-0 text-left text-[0.84rem] leading-[1.35] text-brand-blue hover:underline"
									onclick={() => {
										selectedId = entry.node.id;
									}}
								>
									{formatDisplayWorkTitle(entry.node.title)}
									<span class="text-text-soft">distancia {entry.link.distance.toFixed(3)}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<div class="mt-3 flex flex-wrap gap-2">
					<button
						type="button"
						class="rounded-md border border-border bg-white px-3 py-2 text-[0.86rem] font-semibold text-brand-blue"
						onclick={() => {
							(window as Window & { centerSelectedWorkNode?: () => void }).centerSelectedWorkNode?.();
						}}
					>
						Centrar
					</button>
					<a
						href={`/obras/${selectedNode.slug}`}
						class="rounded-md bg-brand-blue px-3 py-2 text-[0.86rem] font-semibold text-white no-underline hover:bg-brand-blue-dark hover:no-underline"
					>
						Ficha
					</a>
					{#if selectedNode.reportSlug}
						<a
							href={`/informes/${selectedNode.reportSlug}`}
							class="rounded-md border border-border bg-white px-3 py-2 text-[0.86rem] font-semibold text-brand-blue no-underline hover:bg-surface-accent-blue hover:no-underline"
						>
							Informe
						</a>
					{/if}
				</div>
			</aside>
		{/if}
	</section>
</div>
