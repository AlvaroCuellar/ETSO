<script lang="ts">
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
			<span class="field-help-anchor">
				<span class="field-help-trigger" role="button" tabindex="0" aria-label={`Ayuda sobre ${label}`}>
					?
				</span>
				<span class="field-help-popover" id={helpId}>{helpText}</span>
			</span>
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
		border: 0;
		margin: 0;
		padding: 0;
		min-inline-size: 0;
	}

	.fieldset-legend {
		font-weight: 600;
		font-size: 14px;
		color: #555;
		margin-bottom: 6px;
		padding: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.field-help-anchor {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.field-help-trigger {
		width: 20px;
		height: 20px;
		border: 1px solid #c6d1e4;
		border-radius: 999px;
		background: #f2f6ff;
		color: #0033a7;
		font-size: 12px;
		font-weight: 700;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: help;
	}

	.field-help-popover {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		width: min(320px, 78vw);
		padding: 8px 10px;
		border: 1px solid #d8e0ea;
		border-radius: 6px;
		background: #fff;
		color: #3d4c63;
		font-size: 12px;
		line-height: 1.35;
		font-weight: 400;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
		display: none;
		z-index: 20;
	}

	.field-help-anchor:hover .field-help-popover,
	.field-help-anchor:focus-within .field-help-popover {
		display: block;
	}

	.form-radios {
		display: none;
	}

	.match-toggle {
		display: inline-flex;
		gap: 6px;
		background: #eef2f7;
		border: 1px solid #d8e0ea;
		border-radius: 999px;
		padding: 4px;
		width: fit-content;
	}

	.match-toggle-btn {
		border: 0;
		background: transparent;
		color: #46607d;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.3px;
		padding: 4px 10px;
		cursor: pointer;
	}

	.match-toggle-btn.is-active {
		background: #0033a7;
		color: #fff;
	}

	.match-toggle-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
