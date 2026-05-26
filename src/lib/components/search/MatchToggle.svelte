<script lang="ts">
	import HelpBubble from './HelpBubble.svelte';

	interface Props {
		name: string;
		label?: string;
		value: 'or' | 'and';
		disabled?: boolean;
		helpText?: string;
		onChange?: (next: 'or' | 'and') => void;
	}

	let {
		name,
		label = 'Coincidencia',
		value,
		disabled = false,
		helpText = '',
		onChange = () => {}
	}: Props = $props();

	const helpId = $derived.by(() => `help-${name}`);

	const updateValue = (next: 'or' | 'and'): void => {
		if (disabled || next === value) return;
		onChange(next);
	};
</script>

<fieldset class="filter-group radio-group js-match-toggle match-toggle-hidden">
	<legend class="fieldset-legend field-label-with-help">
		{label}
		{#if helpText}
			<HelpBubble id={helpId} label={label} text={helpText} />
		{/if}
	</legend>

	<div class="form-radios">
		<label class="form-item">
			<input type="radio" name={name} value="or" checked={value === 'or'} disabled={disabled} />
			Cualquiera (OR)
		</label>
		<label class="form-item">
			<input type="radio" name={name} value="and" checked={value === 'and'} disabled={disabled} />
			Todos (AND)
		</label>
	</div>

	<div class="match-toggle" role="group" aria-label={label}>
		<button
			type="button"
			class="match-toggle-btn"
			class:is-active={value === 'or'}
			disabled={disabled}
			onclick={() => updateValue('or')}
		>
			OR
		</button>
		<button
			type="button"
			class="match-toggle-btn"
			class:is-active={value === 'and'}
			disabled={disabled}
			onclick={() => updateValue('and')}
		>
			AND
		</button>
	</div>
</fieldset>

<style>
	.radio-group {
		position: relative;
		border: 0;
		margin: 0;
		padding: 0;
		min-inline-size: 0;
	}

	.fieldset-legend {
		position: relative;
		width: 100%;
		font-family: 'Roboto', sans-serif;
		font-weight: 600;
		font-size: 14px;
		color: var(--color-text-soft);
		margin-bottom: 6px;
		padding: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.form-radios {
		display: none;
	}

	.match-toggle {
		display: inline-flex;
		max-width: 100%;
		flex-wrap: wrap;
		gap: 6px;
		background: var(--color-surface-accent-blue);
		border: 1px solid var(--color-border-accent-blue);
		border-radius: 999px;
		padding: 4px;
		width: fit-content;
	}

	.match-toggle-btn {
		border: 0;
		background: transparent;
		color: var(--color-brand-blue);
		border-radius: 999px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.3px;
		padding: 4px 10px;
		cursor: pointer;
	}

	.match-toggle-btn.is-active {
		background: var(--color-brand-blue);
		color: #fff;
	}

	.match-toggle-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
