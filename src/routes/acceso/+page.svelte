<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Acceso restringido | ETSO</title>
	<meta
		name="robots"
		content="noindex,nofollow"
	/>
</svelte:head>

<div class="mx-auto w-full max-w-[560px] px-4 py-10 sm:px-6 lg:py-14">
	<section class="rounded-[16px] border border-border-accent-blue bg-white p-6 shadow-[0_18px_44px_rgba(7,29,66,0.12)] sm:p-7">
		<p class="m-0 font-['Roboto',sans-serif] text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-text-accent-purple">
			Acceso temporal
		</p>
		<h1 class="mt-3 mb-0 font-['Roboto',sans-serif] text-[1.8rem] font-bold leading-[1.1] text-brand-blue-dark">
			Sitio en pruebas
		</h1>
		<p class="mt-3 mb-0 max-w-[46ch] font-['Lora',serif] text-[1rem] leading-[1.6] text-text-main">
			Introduce la contraseña de acceso para entrar en la web mientras el proyecto sigue en revisión.
		</p>

		<form method="POST" action="/acceso/login" class="mt-6 grid gap-4">
			<input type="hidden" name="next" value={data.next} />

			<div class="grid gap-1.5">
				<label for="site-access-password" class="font-['Roboto',sans-serif] text-[0.86rem] font-semibold text-brand-blue-dark">
					Contraseña
				</label>
				<input
					id="site-access-password"
					name="password"
					type="password"
					required
					autocomplete="current-password"
					class="h-[46px] rounded-[10px] border border-border bg-white px-3 py-2 text-[0.96rem] text-text-main outline-none transition focus:border-brand-blue/35 focus:ring-0"
				/>
			</div>

			{#if data.invalid}
				<p class="m-0 rounded-[10px] border border-[#f1c7cf] bg-[#fff6f8] px-3 py-2 text-[0.9rem] text-[#972842]">
					La contraseña no es correcta.
				</p>
			{/if}

			<button
				type="submit"
				class="inline-flex h-[46px] items-center justify-center rounded-[10px] bg-brand-blue px-5 py-2 font-['Roboto',sans-serif] text-[0.92rem] font-semibold text-white transition hover:bg-brand-blue-dark"
			>
				Entrar
			</button>
		</form>
	</section>
</div>
