<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		citation: string;
		allowHtml?: boolean;
		label?: string;
		buttonLabel?: string;
		successMessage?: string;
		emptyCitationMessage?: string;
		copyErrorMessage?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		citation,
		allowHtml = false,
		label = 'Cita sugerida',
		buttonLabel = 'Copiar cita',
		successMessage = 'Cita copiada.',
		emptyCitationMessage = 'No hay cita disponible.',
		copyErrorMessage = 'No se pudo copiar.',
		class: className = '',
		children
	}: Props = $props();

	let toastStatus = $state<'idle' | 'success' | 'error'>('idle');
	let toastMessage = $state('');
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	const clearToastTimer = (): void => {
		if (!toastTimer) return;
		clearTimeout(toastTimer);
		toastTimer = undefined;
	};

	const showToast = (message: string, status: 'success' | 'error'): void => {
		toastMessage = message;
		toastStatus = status;
		clearToastTimer();
		toastTimer = setTimeout(() => {
			toastStatus = 'idle';
			toastMessage = '';
			toastTimer = undefined;
		}, 2200);
	};

	const copyWithExecCommand = (text: string): boolean => {
		if (typeof document === 'undefined') return false;
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.setAttribute('readonly', 'readonly');
		textarea.style.position = 'fixed';
		textarea.style.left = '-9999px';
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();

		let copied = false;
		try {
			copied = document.execCommand('copy');
		} catch {
			copied = false;
		}

		document.body.removeChild(textarea);
		return copied;
	};

	const copyCitation = async (): Promise<void> => {
		const text = citation?.trim() || '';
		const plainText = allowHtml
			? (() => {
					if (typeof document !== 'undefined') {
						const temp = document.createElement('div');
						temp.innerHTML = text;
						return temp.textContent?.trim() || '';
					}
					return text.replace(/<[^>]+>/g, '').trim();
				})()
			: text;
		if (!plainText) {
			showToast(emptyCitationMessage, 'error');
			return;
		}

		try {
			if (
				typeof navigator !== 'undefined' &&
				typeof window !== 'undefined' &&
				window.isSecureContext &&
				navigator.clipboard?.writeText
			) {
				await navigator.clipboard.writeText(plainText);
				showToast(successMessage, 'success');
				return;
			}
		} catch {
			// Fallback handled below.
		}

		if (copyWithExecCommand(plainText)) {
			showToast(successMessage, 'success');
			return;
		}
		showToast(copyErrorMessage, 'error');
	};

	onDestroy(clearToastTimer);
</script>

<section class={`grid gap-2 rounded-card border border-border-accent-blue bg-surface-accent-blue p-4 shadow-soft ${className}`}>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="m-0 font-ui text-[0.8rem] font-bold uppercase tracking-[0.04em] text-text-accent-purple">{label}</p>
		<button
			type="button"
			class="rounded-md border border-border-accent-blue bg-white px-3 py-2 text-[0.82rem] leading-none font-bold text-brand-blue-dark transition hover:bg-surface-accent-blue"
			onclick={copyCitation}
		>
			{buttonLabel}
		</button>
	</div>

	<div class="grid gap-2 text-[0.97rem] leading-[1.65] text-text-main">
		{#if children}
			{@render children()}
		{:else if allowHtml}
			<p class="m-0">{@html citation}</p>
		{:else}
			<p class="m-0">{citation}</p>
		{/if}
	</div>
</section>

{#if toastStatus !== 'idle' && toastMessage}
	<p
		class={`fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-[140] m-0 rounded-md border px-3 py-2 font-ui text-[0.84rem] font-semibold shadow-soft ${
			toastStatus === 'error'
				? 'border-[rgba(187,45,59,0.24)] bg-[#fff4f5] text-[#8c1d2a]'
				: 'border-[rgba(24,121,78,0.24)] bg-[#f1fbf5] text-[#145c3c]'
		}`}
		role="status"
		aria-live="polite"
	>
		{toastMessage}
	</p>
{/if}
