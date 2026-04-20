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

<section class={`citation-suggestion-card ${className}`}>
	<div class="citation-suggestion-card__head">
		<p class="citation-suggestion-card__label">{label}</p>
		<button type="button" class="citation-suggestion-card__copy-button" onclick={copyCitation}>
			{buttonLabel}
		</button>
	</div>

	<div class="citation-suggestion-card__content">
		{#if children}
			{@render children()}
		{:else if allowHtml}
			<p class="citation-suggestion-card__text">{@html citation}</p>
		{:else}
			<p class="citation-suggestion-card__text">{citation}</p>
		{/if}
	</div>
</section>

{#if toastStatus !== 'idle' && toastMessage}
	<p class="copy-toast" class:is-error={toastStatus === 'error'} role="status" aria-live="polite">
		{toastMessage}
	</p>
{/if}

<style>
	.citation-suggestion-card {
		display: grid;
		gap: var(--space-2);
		padding: var(--space-4);
		border-radius: var(--radius-md);
		border: 1px solid rgba(0, 51, 167, 0.24);
		background: linear-gradient(180deg, #f4f8ff, #eef4ff);
		box-shadow: var(--shadow-soft);
	}

	.citation-suggestion-card__head {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
	}

	.citation-suggestion-card__label {
		margin: 0;
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-brand-blue-dark);
	}

	.citation-suggestion-card__copy-button {
		border: 1px solid rgba(0, 51, 167, 0.28);
		background: #fff;
		color: var(--color-brand-blue-dark);
		font-family: var(--font-ui);
		font-size: 0.82rem;
		font-weight: 700;
		line-height: 1;
		padding: 0.45rem 0.7rem;
		border-radius: var(--radius-sm);
	}

	.citation-suggestion-card__copy-button:hover,
	.citation-suggestion-card__copy-button:focus-visible {
		background: #f3f7ff;
		text-decoration: none;
	}

	.citation-suggestion-card__content {
		display: grid;
		gap: var(--space-2);
	}

	.citation-suggestion-card__content :global(p) {
		margin: 0;
		font-size: 0.97rem;
		line-height: 1.65;
		color: var(--color-text-main);
	}

	.copy-toast {
		position: fixed;
		right: max(1rem, env(safe-area-inset-right));
		bottom: max(1rem, env(safe-area-inset-bottom));
		margin: 0;
		padding: 0.62rem 0.82rem;
		border-radius: var(--radius-sm);
		border: 1px solid rgba(24, 121, 78, 0.24);
		background: #f1fbf5;
		color: #145c3c;
		font-family: var(--font-ui);
		font-size: 0.84rem;
		font-weight: 600;
		box-shadow: var(--shadow-soft);
		z-index: 140;
	}

	.copy-toast.is-error {
		border-color: rgba(187, 45, 59, 0.24);
		background: #fff4f5;
		color: #8c1d2a;
	}
</style>
