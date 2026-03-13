<script lang="ts">
	import { onMount } from "svelte";
	import AnimatedNumber from "$lib/components/ui/AnimatedNumber.svelte";
	import {
		UNICODE,
		formatDuration,
		getTimeComparison,
	} from "$lib/utils/format";
	import type { UserStats } from "$lib/server/stats";
	import ShareButton from "../ui/ShareButton.svelte";

	export let stats: UserStats;

	let visible = false;
	let phase = 0; // 0=hidden, 1=lead, 2=number, 3=breakdown, 4=comparison, 5=counts

	$: duration = formatDuration(stats.totalMinutes);
	$: comparison = getTimeComparison(stats.totalMinutes);

	onMount(() => {
		setTimeout(() => {
			visible = true;
			startNarrative();
		}, 100);
	});

	// Re-add startNarrative function as it's used in onMount and phase is used in HTML
	function startNarrative() {
		const timeline = [
			{ phase: 1, delay: 0 }, // "You watched"
			{ phase: 2, delay: 400 }, // Big number
			{ phase: 3, delay: 1500 }, // Hours/minutes breakdown
			{ phase: 4, delay: 2200 }, // Comparison
			{ phase: 5, delay: 2900 }, // Movies/episodes/shows
		];

		timeline.forEach(({ phase: p, delay }) => {
			setTimeout(() => {
				phase = p;
			}, delay);
		});
	}
</script>

<div class="card-base" class:visible id="total-time-card">
	<!-- Background gradient -->
	<div class="bg-gradient"></div>

	{#if visible}
		<div class="share-container">
			<ShareButton
				targetId="total-time-card"
				fileName="emby-wrapped-time.png"
			/>
		</div>
	{/if}

	<div class="card-content">
		<!-- Phase 1: Lead -->
		<p class="lead" class:show={phase >= 1}>
			<span class="unicode">{UNICODE.dots}</span>
			You watched
		</p>

		<!-- Phase 2: Big Number -->
		<div class="big-number" class:show={phase >= 2}>
			{#if duration.days > 0}
				<span class="number font-display">
					<AnimatedNumber value={duration.days} duration={2500} />
				</span>
				<span class="unit">DAYS</span>
			{:else}
				<span class="number font-display">
					<AnimatedNumber value={duration.hours} duration={2000} />
				</span>
				<span class="unit">HOURS</span>
			{/if}
		</div>

		<p class="subtitle" class:show={phase >= 2}>of content</p>

		<!-- Phase 3: Breakdown -->
		<div class="breakdown" class:show={phase >= 3}>
			<div class="stat">
				<span class="stat-value font-mono">
					<AnimatedNumber
						value={Math.round(stats.totalMinutes / 60)}
						duration={2000}
					/>
				</span>
				<span class="stat-label">hours</span>
			</div>
			<div class="divider">{UNICODE.separator}</div>
			<div class="stat">
				<span class="stat-value font-mono">
					<AnimatedNumber
						value={stats.totalMinutes}
						duration={2500}
					/>
				</span>
				<span class="stat-label">minutes</span>
			</div>
		</div>

		<!-- Phase 4: Comparison -->
		<div class="comparison" class:show={phase >= 4}>
			<span class="comparison-icon">{UNICODE.asterism}</span>
			<p>{comparison}</p>
		</div>

		<!-- Phase 5: Content counts -->
		<div class="content-counts" class:show={phase >= 5}>
			<div class="count-item">
				<span class="count-value font-mono">
					<AnimatedNumber
						value={stats.moviesWatched}
						duration={1500}
					/>
				</span>
				<span class="count-label">movies</span>
			</div>
			<div class="count-item">
				<span class="count-value font-mono">
					<AnimatedNumber
						value={stats.episodesWatched}
						duration={1800}
					/>
				</span>
				<span class="count-label">episodes</span>
			</div>
			<div class="count-item">
				<span class="count-value font-mono">
					<AnimatedNumber value={stats.uniqueShows} duration={1600} />
				</span>
				<span class="count-label">shows</span>
			</div>
		</div>
	</div>
</div>

<style>
	.card-base {
		position: relative;
		width: 100%;
		min-height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		text-align: center;
		opacity: 0;
		transition: opacity 0.4s ease;
	}

	.card-base.visible {
		opacity: 1;
	}

	.bg-gradient {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at center,
			rgba(29, 185, 84, 0.12) 0%,
			transparent 60%
		);
		pointer-events: none;
	}

	.card-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	/* Shared animation pattern */
	.lead,
	.big-number,
	.subtitle,
	.breakdown,
	.comparison,
	.content-counts {
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.lead.show,
	.big-number.show,
	.subtitle.show,
	.breakdown.show,
	.comparison.show,
	.content-counts.show {
		opacity: 1;
		transform: translateY(0);
	}

	/* Big number gets special treatment */
	.big-number {
		transform: translateY(30px) scale(0.8);
	}

	.big-number.show {
		transform: translateY(0) scale(1);
	}

	.lead {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.unicode {
		font-family: "JetBrains Mono", monospace;
		color: rgba(255, 255, 255, 0.3);
	}

	.big-number {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 0.5rem 0;
	}

	.number {
		font-size: clamp(5rem, 20vw, 10rem);
		font-weight: 700;
		line-height: 1;
		background: linear-gradient(
			135deg,
			#1db954 0%,
			#1ed760 50%,
			#3b82f6 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.share-container {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 200;
		/* Add a generous invisible tap area around the container */
		padding: 0.5rem;
		margin: -0.5rem;
	}

	.unit {
		font-size: 1.5rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		letter-spacing: 0.3em;
		margin-top: 0.5rem;
	}

	.subtitle {
		font-size: 1.25rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
	}

	.breakdown {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		margin-top: 1rem;
		padding: 1rem 1.5rem;
		background: rgba(20, 20, 20, 0.6);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: white;
	}

	.stat-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.divider {
		font-family: "JetBrains Mono", monospace;
		color: rgba(255, 255, 255, 0.2);
		font-size: 1.5rem;
	}

	.comparison {
		margin-top: 1.5rem;
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		background: rgba(124, 58, 237, 0.1);
		border-radius: 8px;
		border: 1px solid rgba(124, 58, 237, 0.2);
		max-width: 320px;
	}

	.comparison-icon {
		font-family: "JetBrains Mono", monospace;
		color: rgba(255, 255, 255, 0.3);
		flex-shrink: 0;
	}

	.comparison p {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
		font-style: italic;
		text-align: left;
		line-height: 1.4;
	}

	.content-counts {
		display: flex;
		gap: 2rem;
		margin-top: 2rem;
	}

	.count-item {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.count-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
	}

	.count-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Snapshot Overrides */
	:global(.snapshot-mode) .share-container {
		display: none !important;
	}

	:global(.snapshot-mode) .number {
		color: #1db954 !important;
		-webkit-text-fill-color: #1db954 !important;
		background: none !important;
	}

	:global(.snapshot-mode) .lead,
	:global(.snapshot-mode) .big-number,
	:global(.snapshot-mode) .subtitle,
	:global(.snapshot-mode) .breakdown,
	:global(.snapshot-mode) .comparison,
	:global(.snapshot-mode) .content-counts {
		opacity: 1 !important;
		transform: none !important;
	}

	/* Prevent unit label overlapping the big number */
	:global(.snapshot-mode) .unit {
		margin-top: 1rem !important;
	}
</style>
