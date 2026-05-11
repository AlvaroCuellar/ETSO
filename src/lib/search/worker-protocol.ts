import type { SearchExecution, SearchOptions, TexoroIndexManifest, TexoroWorkMeta } from './types';

export type TexoroWorkerRequest =
	| {
			id: number;
			action: 'init';
			indexBaseUrl: string;
			worksMeta: TexoroWorkMeta[];
	  }
	| {
			id: number;
			action: 'warmup';
			wildcard?: boolean;
	  }
	| {
			id: number;
			action: 'prime';
			query: string;
			structuredQuery?: SearchOptions['structuredQuery'];
			structuredClauses?: SearchOptions['structuredClauses'];
			wildcard?: boolean;
	  }
	| {
			id: number;
			action: 'search';
			query: string;
			structuredQuery?: SearchOptions['structuredQuery'];
			structuredClauses?: SearchOptions['structuredClauses'];
			options?: SearchOptions;
	  };

export type TexoroWorkerRequestPayload = TexoroWorkerRequest extends infer Request
	? Request extends { id: number }
		? Omit<Request, 'id'>
		: never
	: never;

export type TexoroWorkerResponse =
	| {
			id: number;
			ok: true;
			result?: {
				manifest?: TexoroIndexManifest | null;
				execution?: SearchExecution;
			};
	  }
	| {
			id: number;
			ok: false;
			error: string;
	  };
