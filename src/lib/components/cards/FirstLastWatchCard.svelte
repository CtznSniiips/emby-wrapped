<script lang="ts">
	import { onMount } from "svelte";
	import { UNICODE, formatDate } from "$lib/utils/format";
	import type { UserStats } from "$lib/server/stats";
	import ShareButton from "../ui/ShareButton.svelte";

	export let stats: UserStats;

	let visible = false;
	let phase = 0; // 0=hidden, 1=title, 2=first, 3=connector, 4=last, 5=tagline

	onMount(() => {
		setTimeout(() => {
			visible = true;
			startNarrative();
		}, 100);
	});

	function startNarrative() {
		const timeline = [
			{ phase: 1, delay: 0 }, // Title
			{ phase: 2, delay: 600 }, // First watch card
			{ phase: 3, delay: 1800 }, // Connector animation
			{ phase: 4, delay: 2800 }, // Last watch card
			{ phase: 5, delay: 4000 }, // Tagline
		];
		timeline.forEach(({ phase: p, delay }) => {
			setTimeout(() => {
				phase = p;
			}, delay);
		});
	}

	$: firstName =
		stats.firstWatch?.name.split(" - ")[0] ||
		stats.firstWatch?.name ||
		"Unknown";
	$: lastName =
		stats.lastWatch?.name.split(" - ")[0] ||
		stats.lastWatch?.name ||
		"Unknown";
	$: firstDate = stats.firstWatch ? formatDate(stats.firstWatch.date) : "";
	$: lastDate = stats.lastWatch ? formatDate(stats.lastWatch.date) : "";
	$: firstType = stats.firstWatch?.type.toLowerCase() || "";
	$: lastType = stats.lastWatch?.type.toLowerCase() || "";
	$: totalPlays = stats.episodesWatched + stats.moviesWatched;
</script>

<div class="card-base" class:visible id="journey-card">
	<div class="share-container">
		<ShareButton
			targetId="journey-card"
			fileName="emby-wrapped-journey.png"
		/>
	</div>

	<div class="card-content">
		<!-- Title -->
		<div class="title-section" class:show={phase >= 1}>
			<span class="unicode">{UNICODE.arrow}</span>
			<h2 class="section-title font-display">Your {stats.timeRangeLabel} Journey</h2>
		</div>

		<!-- Timeline -->
		<div class="timeline">
			<!-- First watch -->
			<div class="timeline-card first" class:show={phase >= 2}>
				<div class="card-header">
					<div class="icon-circle start">
						<span class="icon">{UNICODE.triangleUp}</span>
					</div>
					<div class="header-text">
						<span class="label-text">IT ALL STARTED WITH</span>
						<span class="date-text font-mono">{firstDate}</span>
					</div>
				</div>
				<h3 class="content-title font-display">{firstName}</h3>
				<span class="content-type">{firstType}</span>
			</div>

			<!-- Connector -->
			<div class="connector" class:show={phase >= 3}>
				<div class="connector-line"></div>
				<div class="connector-badge">
					<span class="badge-number font-mono">{totalPlays}</span>
					<span class="badge-label">plays later</span>
				</div>
				<div class="connector-line"></div>
			</div>

			<!-- Last watch -->
			<div class="timeline-card last" class:show={phase >= 4}>
				<div class="card-header">
					<div class="icon-circle end">
						<span class="icon">{UNICODE.triangleDown}</span>
					</div>
					<div class="header-text">
						<span class="label-text">MOST RECENTLY</span>
						<span class="date-text font-mono">{lastDate}</span>
					</div>
				</div>
				<h3 class="content-title font-display">{lastName}</h3>
				<span class="content-type">{lastType}</span>
			</div>
		</div>

		<!-- Tagline -->
		<div class="tagline" class:show={phase >= 5}>
			<span class="tagline-icon">{UNICODE.infinity}</span>
			<p>The story continues...</p>
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
		padding: 2rem 1.5rem;
		opacity: 0;
		transition: opacity 0.4s ease;
	}

	.card-base.visible {
		opacity: 1;
	}

	.share-container {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 50;
	}

	:global(.snapshot-mode) .share-container {
		display: none !important;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		width: 100%;
		max-width: 360px;
	}

	/* Title */
	.title-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		opacity: 0;
		transform: translateY(-20px);
		transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.title-section.show {
		opacity: 1;
		transform: translateY(0);
	}

	.unicode {
		font-family: "JetBrains Mono", monospace;
		font-size: 1.25rem;
		color: #1db954;
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
		margin: 0;
	}

	/* Timeline */
	.timeline {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* Timeline Cards */
	.timeline-card {
		width: 100%;
		padding: 1.25rem;
		background: rgba(20, 20, 20, 0.7);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		opacity: 0;
		transform: translateX(-30px);
		transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.timeline-card.show {
		opacity: 1;
		transform: translateX(0);
	}

	.timeline-card.first {
		border-left: 3px solid #1db954;
	}

	.timeline-card.last {
		border-left: 3px solid #7c3aed;
		transform: translateX(30px);
	}

	.timeline-card.last.show {
		transform: translateX(0);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.icon-circle {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.icon-circle.start {
		background: rgba(29, 185, 84, 0.15);
	}

	.icon-circle.end {
		background: rgba(124, 58, 237, 0.15);
	}

	.icon {
		font-family: "JetBrains Mono", monospace;
		font-size: 1.125rem;
	}

	.icon-circle.start .icon {
		color: #1db954;
	}
	.icon-circle.end .icon {
		color: #7c3aed;
	}

	.header-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.label-text {
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.4);
		letter-spacing: 0.1em;
		font-weight: 500;
	}

	.date-text {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.content-title {
		font-size: 1.375rem;
		font-weight: 600;
		color: white;
		margin: 0;
		line-height: 1.25;
	}

	.content-type {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		text-transform: capitalize;
		margin-top: 0.25rem;
		display: inline-block;
	}

	/* Connector */
	.connector {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 0;
		opacity: 0;
		transition: opacity 0.6s ease;
	}

	.connector.show {
		opacity: 1;
	}

	.connector-line {
		width: 40px;
		height: 2px;
		background: linear-gradient(90deg, #1db954, #7c3aed);
		border-radius: 1px;
	}

	.connector-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.badge-number {
		font-size: 1.125rem;
		font-weight: 700;
		color: white;
	}

	.badge-label {
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Tagline */
	.tagline {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.5s ease;
	}

	.tagline.show {
		opacity: 1;
		transform: translateY(0);
	}

	.tagline-icon {
		font-family: "JetBrains Mono", monospace;
		color: rgba(255, 255, 255, 0.3);
	}

	.tagline p {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
		font-style: italic;
	}
</style>
