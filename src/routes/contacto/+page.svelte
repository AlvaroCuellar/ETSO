<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';

	const recipients = ['alvaro.cuellar@uab.cat', 'german.vega@uva.es'] as const;

	let name = $state('');
	let email = $state('');
	let subject = $state('');
	let message = $state('');

	function openMailClient(event: SubmitEvent): void {
		event.preventDefault();

		const form = event.currentTarget;
		if (!(form instanceof HTMLFormElement)) return;
		if (!form.reportValidity()) return;

		const mailSubject = subject.trim() || 'Consulta a ETSO';
		const mailBody = [
			`Nombre: ${name.trim()}`,
			`Correo: ${email.trim()}`,
			'',
			'Mensaje:',
			message.trim()
		].join('\n');

		const href =
			`mailto:${recipients.join(',')}` +
			`?subject=${encodeURIComponent(mailSubject)}` +
			`&body=${encodeURIComponent(mailBody)}`;

		window.location.href = href;
	}
</script>

<div class="grid gap-7 lg:gap-8">
	<Breadcrumbs
		items={[
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Más información', href: '/mas-informacion' },
			{ label: 'Contacto' }
		]}
	/>

	<section class="grid gap-4">
		<h1 class="m-0 text-[clamp(1.7rem,2.9vw,2.25rem)] font-bold leading-[1.12] text-brand-blue-dark">
			Contacto
		</h1>
		<p class="m-0 leading-[1.72] text-text-main">
			ETSO está abierto a todo tipo de consultas, colaboraciones, preguntas y peticiones.
			Estaremos encantados de ayudar a todo aquel que lo requiera a través del siguiente
			formulario.
		</p>
	</section>

	<section class="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)] lg:items-start">
		<form
			class="grid gap-4 rounded-card border border-border bg-surface p-5 shadow-soft lg:gap-5 lg:p-6"
			on:submit={openMailClient}
		>
			<div class="grid gap-1.5">
				<label for="contact-name" class="font-ui text-[0.83rem] font-semibold uppercase tracking-[0.04em] text-text-soft">
					Nombre
				</label>
				<input
					id="contact-name"
					name="name"
					type="text"
					class="rounded-md border border-border bg-white px-3 py-2.5 text-text-main outline-none transition focus:border-brand-blue/40 focus:bg-surface-accent-blue/30"
					bind:value={name}
					required
				/>
			</div>

			<div class="grid gap-1.5">
				<label for="contact-email" class="font-ui text-[0.83rem] font-semibold uppercase tracking-[0.04em] text-text-soft">
					Correo electrónico
				</label>
				<input
					id="contact-email"
					name="email"
					type="email"
					class="rounded-md border border-border bg-white px-3 py-2.5 text-text-main outline-none transition focus:border-brand-blue/40 focus:bg-surface-accent-blue/30"
					bind:value={email}
					required
				/>
			</div>

			<div class="grid gap-1.5">
				<label for="contact-subject" class="font-ui text-[0.83rem] font-semibold uppercase tracking-[0.04em] text-text-soft">
					Asunto
				</label>
				<input
					id="contact-subject"
					name="subject"
					type="text"
					class="rounded-md border border-border bg-white px-3 py-2.5 text-text-main outline-none transition focus:border-brand-blue/40 focus:bg-surface-accent-blue/30"
					bind:value={subject}
					placeholder="Consulta sobre ETSO"
				/>
			</div>

			<div class="grid gap-1.5">
				<label for="contact-message" class="font-ui text-[0.83rem] font-semibold uppercase tracking-[0.04em] text-text-soft">
					Mensaje
				</label>
				<textarea
					id="contact-message"
					name="message"
					rows="8"
					class="min-h-40 rounded-md border border-border bg-white px-3 py-2.5 text-text-main outline-none transition focus:border-brand-blue/40 focus:bg-surface-accent-blue/30"
					bind:value={message}
					required
				/>
			</div>

			<div class="flex flex-wrap items-center justify-between gap-3 pt-1">
				<p class="m-0 text-[0.88rem] leading-[1.55] text-text-soft">
					El envío abrirá tu aplicación de correo predeterminada con el mensaje ya preparado.
				</p>
				<button
					type="submit"
					class="inline-flex items-center rounded-card border border-brand-blue/20 bg-brand-blue px-5 py-2.5 font-ui text-[0.92rem] font-semibold text-white transition hover:bg-brand-blue-dark"
				>
					Preparar correo
				</button>
			</div>
		</form>

		<aside class="grid gap-4 rounded-card border border-border-accent-blue bg-surface-accent-blue p-5 lg:p-6">
			<div class="grid gap-2">
				<h2 class="m-0 text-[1.15rem] font-semibold leading-[1.2] text-brand-blue-dark">
					Correos de contacto
				</h2>
				<p class="m-0 text-[0.96rem] leading-[1.68] text-text-main">
					Si lo prefieres, también puedes escribir directamente a cualquiera de estas direcciones:
				</p>
			</div>

			<div class="grid gap-2">
				<a class="w-fit font-medium" href="mailto:alvaro.cuellar@uab.cat">alvaro.cuellar@uab.cat</a>
				<a class="w-fit font-medium" href="mailto:german.vega@uva.es">german.vega@uva.es</a>
			</div>
		</aside>
	</section>
</div>
