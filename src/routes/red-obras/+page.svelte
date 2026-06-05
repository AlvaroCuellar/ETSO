<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import HelpBubble from '$lib/components/search/HelpBubble.svelte';
	import TokenMultiSelect from '$lib/components/search/TokenMultiSelect.svelte';
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
		width: number;
		height: number;
		anchorLeft: number;
		anchorTop: number;
		lineStartLeft: number;
		lineStartTop: number;
		title: string;
		genre: string;
		traditional: string;
		stylometry: string;
		active: boolean;
	}

	type AttributionMode = 'traditional' | 'stylometry';

	interface AuthorColorAssignment {
		mode: AttributionMode;
		author: string;
		color: string;
	}

	interface NetworkAuthorMarker {
		id: string;
		left: number;
		top: number;
		radius: number;
		color: string;
		active: boolean;
	}

	let canvasElement: HTMLCanvasElement | null = null;
	let graph = $state<WorkNetworkGraph>(emptyGraph);
	let graphLoading = $state(true);
	let graphError = $state('');
	let query = $state('');
	let selectedId = $state('');
	let hoveredId = $state('');
	let labels = $state<NetworkLabel[]>([]);
	let authorMarkers = $state<NetworkAuthorMarker[]>([]);
	let attributionMode = $state<AttributionMode>('traditional');
	let authorColorAssignments = $state<AuthorColorAssignment[]>([]);

	const MAX_AUTHOR_COLOR_ASSIGNMENTS = 10;
	const MAX_DISPLAYED_CONNECTED_WORKS = 3;
	const authorColorPalette = ['#7c3aed', '#059669', '#ea580c', '#0284c7', '#db2777', '#65a30d', '#9333ea', '#0f766e', '#c2410c', '#2563eb'];

	const nodeById = $derived(new Map(graph.nodes.map((node) => [node.id, node])));

	const normalizeFilterText = (value: string): string =>
		normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

	const formatPeople = (people: string[]): string => people.length > 0 ? people.join(', ') : 'No apunta hacia ningún autor';
	const authorsForMode = (node: WorkNetworkNode, mode: AttributionMode): string[] =>
		mode === 'traditional' ? node.traditionalAuthors : node.stylometryAuthors;

	const selectedNode = $derived.by(() => nodeById.get(selectedId));
	const hoveredNode = $derived.by(() => nodeById.get(hoveredId));
	const activeAuthorColorAssignments = $derived.by(() =>
		authorColorAssignments.filter((assignment) => assignment.mode === attributionMode).slice(0, MAX_AUTHOR_COLOR_ASSIGNMENTS)
	);
	const selectedAuthorIds = $derived(activeAuthorColorAssignments.map((assignment) => assignment.author));
	const availableAuthors = $derived.by(() => {
		const names = new Set<string>();
		for (const node of graph.nodes) {
			for (const author of authorsForMode(node, attributionMode)) {
				if (author && author !== 'No apunta hacia ningún autor') names.add(author);
			}
		}
		return Array.from(names).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
	});
	const authorOptions = $derived(availableAuthors.map((author) => ({ id: author, label: author })));

	const updateSelectedAuthors = (nextAuthors: string[]): void => {
		const cappedAuthors = nextAuthors.slice(0, MAX_AUTHOR_COLOR_ASSIGNMENTS);
		const previousByAuthor = new Map(
			activeAuthorColorAssignments.map((assignment) => [assignment.author, assignment] as const)
		);
		const nextAssignments = cappedAuthors.map((author, index) => ({
			mode: attributionMode,
			author,
			color: previousByAuthor.get(author)?.color ?? authorColorPalette[index % authorColorPalette.length] ?? '#7c3aed'
		}));
		authorColorAssignments = [
			...authorColorAssignments.filter((assignment) => assignment.mode !== attributionMode),
			...nextAssignments
		];
	};

	const visibleNodeIds = $derived.by(() => {
		const normalizedQuery = normalizeFilterText(query);
		const ids = new Set<string>();
		for (const node of graph.nodes) {
			const matchesQuery = !normalizedQuery || normalizeFilterText(node.searchText).includes(normalizedQuery);
			if (matchesQuery) ids.add(node.id);
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
			.slice(0, MAX_DISPLAYED_CONNECTED_WORKS);
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
		let adjacentNodesMesh: import('three').InstancedMesh;
		let selectedNodeMesh: import('three').Mesh;
		let linksMesh: import('three').LineSegments;
		let highlightLines: import('three').LineSegments;
		let resizeObserver: ResizeObserver;
		let initialCameraPosition: import('three').Vector3;
		let initialControlTarget: import('three').Vector3;
		let animationStartCameraPosition: import('three').Vector3 | null = null;
		let animationStartControlTarget: import('three').Vector3 | null = null;
		let targetCameraPosition: import('three').Vector3 | null = null;
		let targetControlTarget: import('three').Vector3 | null = null;
		let cameraAnimationStartedAt = 0;
		let cameraAnimationDuration = 0;
		let initialFocusTimeout: number | null = null;

		const nodePositions = new Map<string, import('three').Vector3>();
		const selectedNeighbors = new Set<string>();
		const normalizedAuthorsByMode: Record<AttributionMode, Map<string, Set<string>>> = {
			traditional: new Map(),
			stylometry: new Map()
		};

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

			const degree = new Map<string, number>();
			for (const link of graph.links) {
				degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
				degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
			}

			for (const node of graph.nodes) {
				nodePositions.set(node.id, new THREE.Vector3(node.x, node.y, node.z));
				normalizedAuthorsByMode.traditional.set(
					node.id,
					new Set(node.traditionalAuthors.map((author) => normalizeFilterText(author)))
				);
				normalizedAuthorsByMode.stylometry.set(
					node.id,
					new Set(node.stylometryAuthors.map((author) => normalizeFilterText(author)))
				);
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
			nodesMesh = new THREE.InstancedMesh(
				sphere,
				new THREE.MeshBasicMaterial({ color: '#111111' }),
				graph.nodes.length
			);
			nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
			nodesMesh.renderOrder = 1;
			scene.add(nodesMesh);
			adjacentNodesMesh = new THREE.InstancedMesh(
				sphere,
				new THREE.MeshBasicMaterial({ color: '#1f4ea3', depthTest: false, depthWrite: false }),
				graph.nodes.length
			);
			adjacentNodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
			adjacentNodesMesh.renderOrder = 3;
			scene.add(adjacentNodesMesh);
			selectedNodeMesh = new THREE.Mesh(
				sphere.clone(),
				new THREE.MeshBasicMaterial({ color: '#c62828', depthTest: false, depthWrite: false })
			);
			selectedNodeMesh.visible = false;
			selectedNodeMesh.renderOrder = 5;
			scene.add(selectedNodeMesh);

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
					: new THREE.Color('#dfe7f0').lerp(new THREE.Color('#8095af'), 0.25 + strength * 0.45);
				linePositions.push(source.x, source.y, source.z, target.x, target.y, target.z);
				lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
			}
			const lineGeometry = new THREE.BufferGeometry();
			lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
			lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
			linksMesh = new THREE.LineSegments(
				lineGeometry,
				new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.52 })
			);
			scene.add(linksMesh);

			highlightLines = new THREE.LineSegments(
				new THREE.BufferGeometry(),
				new THREE.LineBasicMaterial({ color: '#b45f06', transparent: true, opacity: 0.95 })
			);
			scene.add(highlightLines);

			type ActiveAssignmentEntry = {
				assignment: AuthorColorAssignment;
				authorKey: string;
			};

			const getActiveAssignmentEntries = (): ActiveAssignmentEntry[] =>
				activeAuthorColorAssignments.map((assignment) => ({
					assignment,
					authorKey: normalizeFilterText(assignment.author)
				}));

			const getNodeAuthorAssignment = (
				node: WorkNetworkNode,
				activeAssignments: ActiveAssignmentEntry[]
			): AuthorColorAssignment | undefined => {
				const authorKeys = normalizedAuthorsByMode[attributionMode].get(node.id);
				if (!authorKeys) return undefined;
				return activeAssignments.find((entry) => authorKeys.has(entry.authorKey))?.assignment;
			};

			const updateNodes = () => {
				const matrix = new THREE.Matrix4();
				const hiddenMatrix = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001);
				hiddenMatrix.setPosition(100000, 100000, 100000);
				const visible = visibleNodeIds;
				const activeAssignments = getActiveAssignmentEntries();
				for (const [index, node] of graph.nodes.entries()) {
					const position = nodePositions.get(node.id);
					if (!position) continue;
					const isSelected = node.id === selectedId;
					const isHovered = node.id === hoveredId;
					const isNeighbor = selectedNeighbors.has(node.id);
					const isVisible = visible.has(node.id);
					const nodeDegree = degree.get(node.id) ?? 1;
					const base = 0.95 + Math.min(1.35, Math.log1p(nodeDegree) * 0.22);
					const assignment = getNodeAuthorAssignment(node, activeAssignments);
					const scale = isSelected ? 2.1 : isHovered ? 2.55 : isNeighbor ? 2.2 : isVisible ? base : 0.32;
					matrix.makeScale(scale, scale, scale);
					matrix.setPosition(position);
					nodesMesh.setMatrixAt(index, matrix);
					if (isNeighbor && !isSelected && !assignment && isVisible) {
						const adjacentScale = isHovered ? 2.75 : 2.42;
						matrix.makeScale(adjacentScale, adjacentScale, adjacentScale);
						matrix.setPosition(position);
						adjacentNodesMesh.setMatrixAt(index, matrix);
					} else {
						adjacentNodesMesh.setMatrixAt(index, hiddenMatrix);
					}
				}
				nodesMesh.instanceMatrix.needsUpdate = true;
				adjacentNodesMesh.instanceMatrix.needsUpdate = true;
			};

			const updateSelectedNode = () => {
				const position = nodePositions.get(selectedId);
				if (!position) {
					selectedNodeMesh.visible = false;
					return;
				}
				selectedNodeMesh.visible = true;
				selectedNodeMesh.position.copy(position);
				selectedNodeMesh.scale.setScalar(4.2);
			};

			const updateHighlight = () => {
				selectedNeighbors.clear();
				const selectedPosition = nodePositions.get(selectedId);
				const positions: number[] = [];
				if (selectedPosition) {
					const closestLinks = graph.links
						.map((link) => ({
							link,
							relatedId:
								link.source === selectedId ? link.target : link.target === selectedId ? link.source : ''
						}))
						.filter((entry) => entry.relatedId)
						.sort((a, b) => a.link.distance - b.link.distance)
						.slice(0, MAX_DISPLAYED_CONNECTED_WORKS);
					for (const { relatedId } of closestLinks) {
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
				updateSelectedNode();
			};

			const updateLabels = () => {
				if (!canvasElement) return;
				const rect = canvasElement.getBoundingClientRect();
				const labelIds = new Set<string>();
				if (selectedId) labelIds.add(selectedId);
				if (hoveredId) labelIds.add(hoveredId);
				for (const id of selectedNeighbors) labelIds.add(id);
				if (query) {
					for (const node of visibleResults.slice(0, 24)) labelIds.add(node.id);
				}

				type LabelPlacement = NetworkLabel & {
					priority: number;
				};
				const candidates: LabelPlacement[] = [];
				for (const id of labelIds) {
					const node = graph.nodes.find((candidate) => candidate.id === id);
					const position = nodePositions.get(id);
					if (!node || !position) continue;
					const vector = position.clone().project(camera);
					if (vector.z < -1 || vector.z > 1) continue;
					const anchorLeft = ((vector.x + 1) / 2) * rect.width;
					const anchorTop = ((1 - vector.y) / 2) * rect.height;
					const active = id === selectedId || id === hoveredId;
					const width = active ? 264 : 236;
					const height = active ? 94 : 86;
					candidates.push({
						id,
						left: anchorLeft,
						top: anchorTop,
						width,
						height,
						anchorLeft,
						anchorTop,
						lineStartLeft: anchorLeft,
						lineStartTop: anchorTop,
						title: formatDisplayWorkTitle(node.title),
						genre: node.genre,
						traditional: formatPeople(node.traditionalAuthors),
						stylometry: formatPeople(node.stylometryAuthors),
						active,
						priority: id === selectedId ? 0 : id === hoveredId ? 1 : 2
					});
				}

				candidates.sort((a, b) => a.priority - b.priority || a.anchorTop - b.anchorTop);
				const placed: NetworkLabel[] = [];
				const occupied: Array<{ left: number; top: number; right: number; bottom: number }> = [];
				const gap = 10;
				const edgePadding = 12;
				const nodePadding = 20;
				const overlaps = (
					left: number,
					top: number,
					width: number,
					height: number,
					anchorLeft: number,
					anchorTop: number
				): boolean => {
					const right = left + width;
					const bottom = top + height;
					if (
						anchorLeft >= left - nodePadding &&
						anchorLeft <= right + nodePadding &&
						anchorTop >= top - nodePadding &&
						anchorTop <= bottom + nodePadding
					) {
						return true;
					}
					return occupied.some(
						(box) =>
							left < box.right + gap &&
							right > box.left - gap &&
							top < box.bottom + gap &&
							bottom > box.top - gap
					);
				};

				for (const label of candidates) {
					const offsetX = 26;
					const offsetY = 22;
					const placements = [
						{ left: label.anchorLeft + offsetX, top: label.anchorTop - label.height - offsetY },
						{ left: label.anchorLeft - label.width - offsetX, top: label.anchorTop - label.height - offsetY },
						{ left: label.anchorLeft + offsetX, top: label.anchorTop + offsetY },
						{ left: label.anchorLeft - label.width - offsetX, top: label.anchorTop + offsetY },
						{ left: label.anchorLeft + offsetX, top: label.anchorTop - label.height / 2 },
						{ left: label.anchorLeft - label.width - offsetX, top: label.anchorTop - label.height / 2 }
					].map((placement) => ({
						left: Math.min(
							Math.max(edgePadding, placement.left),
							Math.max(edgePadding, rect.width - label.width - edgePadding)
						),
						top: Math.min(
							Math.max(edgePadding, placement.top),
							Math.max(edgePadding, rect.height - label.height - edgePadding)
						)
					}));

					let chosen = placements.find((placement) =>
						!overlaps(placement.left, placement.top, label.width, label.height, label.anchorLeft, label.anchorTop)
					);

					if (!chosen) {
						let fallbackLeft = Math.min(
							Math.max(edgePadding, label.anchorLeft + offsetX),
							Math.max(edgePadding, rect.width - label.width - edgePadding)
						);
						let fallbackTop = Math.min(
							Math.max(edgePadding, label.anchorTop - label.height - offsetY),
							Math.max(edgePadding, rect.height - label.height - edgePadding)
						);
						while (
							overlaps(
								fallbackLeft,
								fallbackTop,
								label.width,
								label.height,
								label.anchorLeft,
								label.anchorTop
							) &&
							fallbackTop < rect.height - label.height - edgePadding
						) {
							fallbackTop += label.height + gap;
						}
						chosen = { left: fallbackLeft, top: fallbackTop };
					}

					const centerX = chosen.left + label.width / 2;
					const centerY = chosen.top + label.height / 2;
					const dx = label.anchorLeft - centerX;
					const dy = label.anchorTop - centerY;
					const absDx = Math.abs(dx);
					const absDy = Math.abs(dy);
					let lineStartLeft = centerX;
					let lineStartTop = centerY;
					if (absDx > absDy) {
						lineStartLeft = dx > 0 ? chosen.left + label.width : chosen.left;
						lineStartTop = Math.min(chosen.top + label.height - 12, Math.max(chosen.top + 12, label.anchorTop));
					} else {
						lineStartTop = dy > 0 ? chosen.top + label.height : chosen.top;
						lineStartLeft = Math.min(chosen.left + label.width - 12, Math.max(chosen.left + 12, label.anchorLeft));
					}

					placed.push({
						...label,
						left: chosen.left,
						top: chosen.top,
						lineStartLeft,
						lineStartTop
					});
					occupied.push({
						left: chosen.left,
						top: chosen.top,
						right: chosen.left + label.width,
						bottom: chosen.top + label.height
					});
				}

				labels = placed;
			};

			const updateAuthorMarkers = () => {
				if (!canvasElement || activeAuthorColorAssignments.length === 0) {
					authorMarkers = [];
					return;
				}
				const rect = canvasElement.getBoundingClientRect();
				const visible = visibleNodeIds;
				const activeAssignments = getActiveAssignmentEntries();
				const nextMarkers: NetworkAuthorMarker[] = [];
				for (const node of graph.nodes) {
					if (node.id === selectedId || !visible.has(node.id)) continue;
					const assignment = getNodeAuthorAssignment(node, activeAssignments);
					if (!assignment) continue;
					const position = nodePositions.get(node.id);
					if (!position) continue;
					const vector = position.clone().project(camera);
					if (vector.z < -1 || vector.z > 1) continue;
					const left = ((vector.x + 1) / 2) * rect.width;
					const top = ((1 - vector.y) / 2) * rect.height;
					const cameraDistance = camera.position.distanceTo(position);
					const baseRadius = Math.max(5.2, Math.min(18, 2200 / Math.max(85, cameraDistance)));
					const active = node.id === hoveredId || selectedNeighbors.has(node.id);
					nextMarkers.push({
						id: `${node.id}:${assignment.author}`,
						left,
						top,
						radius: active ? baseRadius * 1.32 : baseRadius,
						color: assignment.color,
						active
					});
				}
				authorMarkers = nextMarkers;
			};

			const clearSearchContext = () => {
				query = '';
			};

			const easeInOutCubic = (value: number): number =>
				value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

			const animateCameraTo = (
				cameraPosition: import('three').Vector3,
				controlTarget: import('three').Vector3,
				duration = 1800
			) => {
				animationStartCameraPosition = camera.position.clone();
				animationStartControlTarget = controls.target.clone();
				targetCameraPosition = cameraPosition;
				targetControlTarget = controlTarget;
				cameraAnimationStartedAt = performance.now();
				cameraAnimationDuration = duration;
			};

			const focusNode = (nodeId: string, distance = 120) => {
				const position = nodePositions.get(nodeId);
				if (!position) return;
				clearSearchContext();
				selectedId = nodeId;
				animateCameraTo(position.clone().add(new THREE.Vector3(0, 0, distance)), position.clone());
			};

			const centerSelected = (nodeId?: string) => {
				const resolvedNodeId = nodeId || selectedId;
				if (!resolvedNodeId) return;
				focusNode(resolvedNodeId);
			};

			const resetView = () => {
				selectedId = '';
				hoveredId = '';
				animateCameraTo(initialCameraPosition.clone(), initialControlTarget.clone(), 1400);
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
				clearSearchContext();
				selectedId = hoveredId;
			};

			const handleDoubleClick = () => {
				if (!hoveredId) return;
				focusNode(hoveredId);
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
			initialCameraPosition = camera.position.clone();
			initialControlTarget = controls.target.clone();
			const requestedSlug = new URL(window.location.href).searchParams.get('obra');
			if (requestedSlug) {
				const requestedNode = graph.nodes.find((node) => node.slug === requestedSlug);
				if (requestedNode) {
					initialFocusTimeout = window.setTimeout(() => {
						focusNode(requestedNode.id, 110);
						initialFocusTimeout = null;
					}, 1800);
				}
			}
			updateHighlight();
			graphLoading = false;

			const animate = () => {
				if (disposed) return;
				if (
					targetCameraPosition &&
					targetControlTarget &&
					animationStartCameraPosition &&
					animationStartControlTarget
				) {
					const elapsed = performance.now() - cameraAnimationStartedAt;
					const progress = Math.min(1, elapsed / Math.max(1, cameraAnimationDuration));
					const easedProgress = easeInOutCubic(progress);
					camera.position.copy(
						animationStartCameraPosition.clone().lerp(targetCameraPosition, easedProgress)
					);
					controls.target.copy(
						animationStartControlTarget.clone().lerp(targetControlTarget, easedProgress)
					);
					if (progress >= 1) {
						targetCameraPosition = null;
						targetControlTarget = null;
						animationStartCameraPosition = null;
						animationStartControlTarget = null;
						cameraAnimationStartedAt = 0;
						cameraAnimationDuration = 0;
					}
				}
				controls.update();
				updateLabels();
				updateAuthorMarkers();
				renderer.render(scene, camera);
				frameId = requestAnimationFrame(animate);
			};
			animate();

			const stopEffects = $effect.root(() => {
				$effect(() => {
					visibleNodeIds;
					hoveredId;
					attributionMode;
					activeAuthorColorAssignments;
					updateNodes();
				});
				$effect(() => {
					selectedId;
					updateHighlight();
				});
			});

			(
				window as Window & {
					centerSelectedWorkNode?: (nodeId?: string) => void;
					resetWorkNetworkView?: () => void;
				}
			).centerSelectedWorkNode = centerSelected;
			(
				window as Window & {
					centerSelectedWorkNode?: (nodeId?: string) => void;
					resetWorkNetworkView?: () => void;
				}
			).resetWorkNetworkView = resetView;

			return () => {
				stopEffects();
				delete (
					window as Window & {
						centerSelectedWorkNode?: (nodeId?: string) => void;
						resetWorkNetworkView?: () => void;
					}
				).centerSelectedWorkNode;
				delete (
					window as Window & {
						centerSelectedWorkNode?: (nodeId?: string) => void;
						resetWorkNetworkView?: () => void;
					}
				).resetWorkNetworkView;
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
			authorMarkers = [];
			if (frameId) cancelAnimationFrame(frameId);
			if (initialFocusTimeout) window.clearTimeout(initialFocusTimeout);
			cleanupEvents?.();
			resizeObserver?.disconnect();
			controls?.dispose();
			nodesMesh?.geometry.dispose();
			(nodesMesh?.material as import('three').Material | undefined)?.dispose();
			adjacentNodesMesh?.geometry.dispose();
			(adjacentNodesMesh?.material as import('three').Material | undefined)?.dispose();
			selectedNodeMesh?.geometry.dispose();
			(selectedNodeMesh?.material as import('three').Material | undefined)?.dispose();
			linksMesh?.geometry.dispose();
			(linksMesh?.material as import('three').Material | undefined)?.dispose();
			highlightLines?.geometry.dispose();
			(highlightLines?.material as import('three').Material | undefined)?.dispose();
			renderer?.dispose();
		};
	});
</script>

<SeoHead
	title="Red de obras (BETA)"
	description="Visualización experimental de relaciones estilométricas entre obras de Examen de autorías."
	path="/red-obras"
/>

<div class="grid gap-5">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Red de obras (BETA)' }]} />

	<section class="grid gap-2">
		<h1 class="m-0 font-ui text-[clamp(1.8rem,3vw,2.35rem)] font-bold leading-[1.12] text-brand-blue-dark">
			Red de obras (BETA)
		</h1>
		<p class="m-0 max-w-4xl leading-[1.65] text-text-main">
			Visualización experimental de relaciones estilométricas. Cada obra se conecta con sus tres obras más cercanas según las distancias de obra completa.
		</p>
	</section>

	<div class="mx-auto grid w-full max-w-7xl gap-4">
		<div class="grid gap-5 rounded-[10px] border border-border/70 bg-[var(--color-surface-subtle)] p-4 shadow-[0_8px_24px_rgba(25,46,80,0.06)]">
			<div class="grid gap-5 min-[960px]:grid-cols-[minmax(0,1fr)_auto] min-[960px]:items-end">
				<div class="relative flex flex-col">
					<div class="relative mb-[6px] inline-flex w-full items-center gap-1 font-['Roboto',sans-serif] text-[14px] font-semibold text-text-soft">
						<label for="network-query">Título, género y atribuciones</label>
						<HelpBubble
							id="help-network-query"
							label="Título, género y atribuciones"
							text="Busca por palabras del título, género, atribución tradicional o atribución estilométrica."
						/>
					</div>
					<input
						id="network-query"
						type="search"
						bind:value={query}
						placeholder="Ej: La dama boba, comedia, Lope..."
						class="box-border h-[46px] w-full rounded-[10px] border border-border bg-white px-3 text-[15px] text-text-main transition focus:border-brand-blue/35 focus:shadow-[0_0_0_3px_rgba(13,63,145,0.1)] focus:outline-none"
					/>
				</div>

				<div class="grid grid-cols-2 gap-2 sm:grid-cols-[auto_auto_auto] min-[960px]:justify-end">
					<div class="col-span-2 flex h-[46px] items-center justify-center rounded-[10px] border border-border bg-white px-3 text-[0.9rem] text-text-soft sm:col-span-1">
						<span class="font-semibold text-brand-blue-dark">{filteredCount}</span>&nbsp;de {graph.nodes.length} obras
					</div>
					<button
						type="button"
						class="h-[46px] rounded-[10px] border border-border bg-white px-4 font-['Roboto',sans-serif] text-[0.9rem] font-semibold text-brand-blue transition hover:bg-surface-accent-blue disabled:cursor-default disabled:opacity-45"
						disabled={!selectedId}
						onclick={() => {
							selectedId = '';
							hoveredId = '';
						}}
					>
						Limpiar
					</button>
					<button
						type="button"
						class="h-[46px] rounded-[10px] border border-border bg-white px-4 font-['Roboto',sans-serif] text-[0.9rem] font-semibold text-brand-blue transition hover:bg-surface-accent-blue"
						onclick={() => {
							(window as Window & { resetWorkNetworkView?: () => void }).resetWorkNetworkView?.();
						}}
					>
						Reset
					</button>
				</div>
			</div>

			<div class="grid gap-5 min-[760px]:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)] min-[760px]:items-start">
				<div class="relative flex flex-col">
					<div class="relative mb-[6px] inline-flex w-full items-center gap-1 font-['Roboto',sans-serif] text-[14px] font-semibold text-text-soft">
						<label for="author-mode">Tipo de atribución</label>
					</div>
					<select
						id="author-mode"
						bind:value={attributionMode}
						class="box-border h-[46px] w-full rounded-[10px] border border-border bg-white px-3 text-[15px] text-text-main transition focus:border-brand-blue/35 focus:shadow-[0_0_0_3px_rgba(13,63,145,0.1)] focus:outline-none"
					>
						<option value="traditional">Tradicional</option>
						<option value="stylometry">Estilometría</option>
					</select>
				</div>

				<div class="grid gap-2">
					<TokenMultiSelect
						name="red_autores"
						label="Autor"
						placeholder="Escribe y selecciona autores"
						options={authorOptions}
						selectedIds={selectedAuthorIds}
						helpText={`Permite seleccionar hasta ${MAX_AUTHOR_COLOR_ASSIGNMENTS} autores para colorear sus obras en la red.`}
						inputClass="js-author-multiselect"
						onChange={updateSelectedAuthors}
					/>
					<p class="m-0 text-right text-[0.76rem] text-text-soft">
						{activeAuthorColorAssignments.length} de {MAX_AUTHOR_COLOR_ASSIGNMENTS} autores
					</p>
				</div>
			</div>
		</div>

		{#if activeAuthorColorAssignments.length > 0}
			<div class="grid gap-2 rounded-[10px] border border-border/70 bg-[var(--color-surface-subtle)] p-4 shadow-[0_8px_24px_rgba(25,46,80,0.06)]">
					<p class="m-0 text-[0.74rem] font-semibold uppercase tracking-[0.04em] text-text-soft">
						Colores de autores seleccionados
					</p>
					<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{#each activeAuthorColorAssignments as assignment}
							<label class="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2 rounded-[10px] border border-border bg-white px-2.5 py-2 text-[0.9rem] text-text-main">
								<input
									type="color"
									value={assignment.color}
									class="h-8 w-10 rounded-md border border-border bg-white p-1"
									oninput={(event) => {
										const color = event.currentTarget.value;
										authorColorAssignments = authorColorAssignments.map((entry) =>
											entry.mode === assignment.mode && entry.author === assignment.author
												? { ...entry, color }
												: entry
										);
									}}
								/>
								<span class="truncate">{assignment.author}</span>
							</label>
						{/each}
					</div>
				</div>
		{/if}

		{#if query && visibleResults.length > 0}
			<div class="max-h-64 overflow-auto rounded-[10px] border border-border/70 bg-white shadow-[0_8px_24px_rgba(25,46,80,0.06)]">
				{#each visibleResults as node}
					<button
						type="button"
						class="grid w-full gap-1 border-0 border-b border-border bg-transparent px-4 py-3 text-left transition last:border-b-0 hover:bg-surface-accent-blue focus:bg-surface-accent-blue focus:outline-none"
						onclick={() => {
							(window as Window & { centerSelectedWorkNode?: (nodeId?: string) => void }).centerSelectedWorkNode?.(node.id);
						}}
					>
						<span class="block text-[0.95rem] font-semibold leading-[1.35] text-brand-blue-dark">
							{formatDisplayWorkTitle(node.title)}
						</span>
						<span class="block text-[0.8rem] leading-[1.4] text-text-soft">
							{node.genre}
						</span>
						<span class="block text-[0.78rem] leading-[1.4] text-text-soft">
							Trad.: {formatPeople(node.traditionalAuthors)}
						</span>
						<span class="block text-[0.78rem] leading-[1.4] text-text-soft">
							Estil.: {formatPeople(node.stylometryAuthors)}
						</span>
					</button>
				{/each}
			</div>
		{/if}

		{#if selectedNode}
			<section class="rounded-md border border-[#b45f06]/22 bg-[#fffdfa] p-4 shadow-soft">
				<div class="grid gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start">
					<div class="grid gap-2">
						<div>
							<p class="m-0 font-ui text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[#b45f06]">Obra seleccionada</p>
							<h2 class="m-0 mt-1 text-[1rem] font-semibold leading-[1.2] text-[#b45f06]">
								{formatDisplayWorkTitle(selectedNode.title)}
							</h2>
						</div>
						<div class="grid gap-1 text-[0.82rem] leading-[1.35] text-text-main">
							<p class="m-0"><span class="font-semibold text-text-soft">Género:</span> {selectedNode.genre}</p>
							<p class="m-0"><span class="font-semibold text-text-soft">Trad.:</span> {formatPeople(selectedNode.traditionalAuthors)}</p>
							<p class="m-0"><span class="font-semibold text-text-soft">Estil.:</span> {formatPeople(selectedNode.stylometryAuthors)}</p>
						</div>
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								class="network-panel-action rounded-md border border-border bg-white px-3 py-2 text-brand-blue"
								onclick={() => {
									selectedId = '';
									hoveredId = '';
								}}
							>
								Limpiar
							</button>
							<button
								type="button"
								class="network-panel-action rounded-md border border-border bg-white px-3 py-2 text-brand-blue"
								onclick={() => {
									(window as Window & { resetWorkNetworkView?: () => void }).resetWorkNetworkView?.();
								}}
							>
								Reset
							</button>
							<button
								type="button"
								class="network-panel-action rounded-md border border-border bg-white px-3 py-2 text-brand-blue"
								onclick={() => {
									(window as Window & { centerSelectedWorkNode?: (nodeId?: string) => void }).centerSelectedWorkNode?.();
								}}
							>
								Centrar
							</button>
							<a
								href={`/obras/${selectedNode.slug}`}
								class="network-panel-action rounded-md border border-border bg-white px-3 py-2 text-brand-blue no-underline hover:bg-surface-accent-blue hover:no-underline"
							>
								Ficha
							</a>
							{#if selectedNode.reportSlug}
								<a
									href={`/informes/${selectedNode.reportSlug}`}
									class="network-panel-action rounded-md border border-border bg-white px-3 py-2 text-brand-blue no-underline hover:bg-surface-accent-blue hover:no-underline"
								>
									Informe
								</a>
							{/if}
						</div>
					</div>

					{#if selectedLinks.length > 0}
						<div class="border-t border-border pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
							<p class="m-0 mb-2 text-[0.72rem] font-bold uppercase tracking-[0.05em] text-text-soft">Obras conectadas (se indican las 3 más próximas)</p>
							<div class="grid max-h-40 gap-2 overflow-auto pr-1">
								{#each selectedLinks as entry}
									<button
										type="button"
										class="grid rounded-md border border-border/80 bg-white/70 px-3 py-2 text-left text-[0.78rem] leading-[1.25] text-brand-blue hover:bg-surface-accent-blue"
										onclick={() => {
											(window as Window & { centerSelectedWorkNode?: (nodeId?: string) => void }).centerSelectedWorkNode?.(entry.node.id);
										}}
									>
										<span class="font-semibold">{formatDisplayWorkTitle(entry.node.title)}</span>
										<span class="text-text-soft">{entry.node.genre} · distancia {entry.link.distance.toFixed(3)}</span>
										<span class="text-text-soft">Trad.: {formatPeople(entry.node.traditionalAuthors)}</span>
										<span class="text-text-soft">Estil.: {formatPeople(entry.node.stylometryAuthors)}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</section>
		{/if}
	</div>

	<section class="relative mx-auto h-[calc(100dvh-24rem)] min-h-[31rem] w-full max-w-7xl overflow-hidden rounded-lg border border-border/70 bg-[#fbfcff] shadow-soft md:h-[calc(100dvh-22rem)] md:min-h-[35rem] md:max-h-[42rem]">
		<canvas bind:this={canvasElement} class="absolute inset-0 h-full w-full touch-none"></canvas>

		<div class="pointer-events-none absolute inset-0 z-[5]">
			<svg class="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
				<defs>
					<marker
						id="network-label-arrow"
						viewBox="0 0 10 10"
						refX="8"
						refY="5"
						markerWidth="5"
						markerHeight="5"
						orient="auto-start-reverse"
					>
						<path d="M 0 0 L 10 5 L 0 10 z" fill="#90a3bd"></path>
					</marker>
				</defs>
				{#each authorMarkers as marker (marker.id)}
					<circle
						cx={marker.left}
						cy={marker.top}
						r={marker.radius}
						fill={marker.color}
						stroke={marker.active ? '#111111' : '#ffffff'}
						stroke-width={marker.active ? '2.2' : '1.4'}
						opacity="0.96"
					/>
				{/each}
				{#each labels as label (label.id)}
					<line
						x1={label.lineStartLeft}
						y1={label.lineStartTop}
						x2={label.anchorLeft}
						y2={label.anchorTop}
						stroke={label.id === selectedId ? '#c62828' : '#90a3bd'}
						stroke-width={label.id === selectedId ? '1.8' : '1.2'}
						stroke-linecap="round"
						marker-end="url(#network-label-arrow)"
						opacity={label.id === selectedId ? '0.92' : '0.76'}
					/>
				{/each}
			</svg>
			{#each labels as label (label.id)}
				<div
					class={`node-label absolute rounded-md border px-2.5 py-2 text-left shadow-soft ${label.id === selectedId ? 'border-[#c62828]/35 bg-[#fff5f5]' : label.active ? 'border-brand-blue/35 bg-white/96' : 'border-border bg-white/90'}`}
					style={`left: ${label.left}px; top: ${label.top}px; width: ${label.width}px; min-height: ${label.height}px;`}
				>
					<span class={`block text-[0.78rem] font-semibold leading-[1.25] ${label.id === selectedId ? 'text-[#c62828]' : 'text-brand-blue-dark'}`}>
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

	</section>
</div>

<style>
	.network-panel-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.5rem;
		font-family: var(--font-ui) !important;
		font-size: 0.82rem !important;
		font-weight: 500 !important;
		line-height: 1.2 !important;
		letter-spacing: 0 !important;
	}
</style>
