import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(root, 'static/data/red-obras.json');
const temporaryOutputPath = `${outputPath}.tmp`;

const validateGraph = (value) => {
	if (!value || !Array.isArray(value.nodes) || !Array.isArray(value.links) || value.nodes.length === 0) {
		throw new Error('El artefacto de red-obras no contiene un grafo válido.');
	}
	return value;
};

const validateExistingGraph = async () => {
	await access(outputPath);
	return validateGraph(JSON.parse(await readFile(outputPath, 'utf8')));
};

const server = await createServer({
	root,
	server: { middlewareMode: true },
	appType: 'custom',
	logLevel: 'error'
});

let graph;

try {
	const { getWorkNetworkGraph } = await server.ssrLoadModule('/src/lib/server/catalog-runtime.ts');
	graph = validateGraph(await getWorkNetworkGraph(3));
} catch (cause) {
	try {
		const existingGraph = await validateExistingGraph();
		const message = cause instanceof Error ? cause.message : String(cause);
		console.warn(
			`No se pudo regenerar red-obras (${message}). Se conserva el artefacto versionado válido de ` +
				`${existingGraph.nodes.length} nodos y ${existingGraph.links.length} enlaces.`
		);
	} catch {
		throw cause;
	}
} finally {
	await server.close();
}

if (graph) {
	// El servidor de Vite observa el árbol de archivos del proyecto. Cerrarlo antes
	// de publicar el JSON evita que procese el rename como un cambio pendiente al
	// mismo tiempo que se destruye durante la compilación en Vercel.
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(temporaryOutputPath, JSON.stringify(graph));
	await rename(temporaryOutputPath, outputPath);
	console.log(
		`Grafo de red-obras generado: ${graph.nodes.length} nodos, ${graph.links.length} enlaces (${outputPath})`
	);
}
