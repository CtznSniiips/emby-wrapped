<script lang="ts">
	import { onMount } from "svelte";
	import { UNICODE, formatDuration } from "$lib/utils/format";
	import type { BingeSession } from "$lib/server/stats";
	import ShareButton from "../ui/ShareButton.svelte";

	export let binge: BingeSession;
	export let totalBinges: number;

	let visible = false;
	let phase = 0; // 0=hidden, 1=setup, 2=show, 3=episodes, 4=duration, 5=date, 6=total

	onMount(() => {
		setTimeout(() => {
			visible = true;
			startNarrative();
		}, 100);
	});

	function startNarrative() {
		const timeline = [
			{ phase: 1, delay: 0 }, // "Binge Mode: ON" + "Your longest session"
			{ phase: 2, delay: 800 }, // Show name appears
			{ phase: 3, delay: 1600 }, // Episode count with dramatic reveal
			{ phase: 4, delay: 2400 }, // Duration
			{ phase: 5, delay: 3200 }, // Date/time
			{ phase: 6, delay: 4000 }, // Total binges this year
		];

		timeline.forEach(({ phase: p, delay }) => {
			setTimeout(() => {
				phase = p;
			}, delay);
		});
	}

	// Parse binge data
	$: startDate = new Date(binge.startTime);
	$: endDate = new Date(binge.endTime);
	$: dateString = startDate.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
	$: startTimeString = startDate.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
	$: endTimeString = endDate.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
	$: duration = formatDuration(binge.totalMinutes);
</script>

<div class="card-base" class:visible id="binge-card">
	<div class="share-container">
		<ShareButton targetId="binge-card" fileName="emby-wrapped-binge.png" />
	</div>

	<div class="card-content">
		<!-- Phase 1: Setup -->
		<div class="header" class:show={phase >= 1}>
			<div class="badge">
				<span class="badge-icon">{UNICODE.sparkle}</span>
				<span class="badge-text">BINGE MODE</span>
			</div>
			<p class="subtitle">Your longest session</p>
		</div>

		<!-- Phase 2: Show name with dramatic entrance -->
		<div class="show-reveal" class:show={phase >= 2}>
			<h2 class="show-name font-display">{binge.showName}</h2>
			<div class="show-underline"></div>
		</div>

		<!-- Phase 3: Episode count - BIG and dramatic -->
		<div class="episode-reveal" class:show={phase >= 3}>
			<div class="episode-number font-mono">{binge.episodeCount}</div>
			<div class="episode-label">episodes</div>
			<div class="episode-context">in one sitting</div>
		</div>

		<!-- Phase 4: Duration -->
		<div class="duration-section" class:show={phase >= 4}>
			<div class="stat-pill">
				<span class="stat-icon">{UNICODE.circle}</span>
				<span class="stat-value">{duration.formatted}</span>
				<span class="stat-label">of pure commitment</span>
			</div>
		</div>

		<!-- Phase 5: Date & Time -->
		<div class="datetime-section" class:show={phase >= 5}>
			<div class="datetime-card">
				<div class="date">{dateString}</div>
				<div class="time-range">
					<span class="time">{startTimeString}</span>
					<span class="time-arrow">{UNICODE.arrow}</span>
					<span class="time">{endTimeString}</span>
				</div>
			</div>
		</div>

		<!-- Phase 6: Total binges -->
		<div class="total-section" class:show={phase >= 6}>
			<div class="total-divider"></div>
			<p class="total-text">
				<span class="total-number font-mono">{totalBinges}</span>
				<span>binge sessions this year</span>
			</p>
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
		opacity: 0;
		transition: opacity 0.4s ease;
	}

	.card-base.visible {
		opacity: 1;
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

	:global(.snapshot-mode) .share-container {
		display: none !important;
	}

	:global(.snapshot-mode) .header,
	:global(.snapshot-mode) .show-reveal,
	:global(.snapshot-mode) .episode-reveal,
	:global(.snapshot-mode) .duration-section,
	:global(.snapshot-mode) .datetime-section,
	:global(.snapshot-mode) .total-section {
		opacity: 1 !important;
		transform: none !important;
	}

	/* Fix badge: html2canvas can't render white text on gradient reliably.
	   Use solid background + explicit text color so both are always visible. */
	:global(.snapshot-mode) .badge {
		background: #ef4444 !important;
	}
	:global(.snapshot-mode) .badge-text,
	:global(.snapshot-mode) .badge-icon {
		color: #ffffff !important;
		-webkit-text-fill-color: #ffffff !important;
	}

	/* Fix episode-label negative margin pulling it into the number */
	:global(.snapshot-mode) .episode-label {
		margin-top: 0.5rem !important;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		width: 100%;
		max-width: 400px;
	}

	/* Header */
	.header {
		text-align: center;
		opacity: 0;
		transform: translateY(-20px);
		transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.header.show {
		opacity: 1;
		transform: translateY(0);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
		padding: 0.5rem 1rem;
		border-radius: 20px;
		box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
	}

	.badge-icon {
		font-size: 1.25rem;
	}

	.badge-text {
		font-family: "JetBrains Mono", monospace;
		font-size: 0.875rem;
		font-weight: 700;
		color: white;
		letter-spacing: 0.1em;
	}

	.subtitle {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.875rem;
		margin: 0.75rem 0 0 0;
	}

	/* Show Reveal */
	.show-reveal {
		text-align: center;
		opacity: 0;
		transform: scale(0.8);
		transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.show-reveal.show {
		opacity: 1;
		transform: scale(1);
	}

	.show-name {
		font-size: clamp(1.5rem, 6vw, 2.5rem);
		font-weight: 700;
		color: white;
		margin: 0;
		line-height: 1.2;
	}

	.show-underline {
		height: 3px;
		background: linear-gradient(90deg, transparent, #1db954, transparent);
		margin-top: 0.5rem;
		animation: expandLine 0.6s ease-out 0.3s both;
	}

	@keyframes expandLine {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}

	/* Episode Reveal - the STAR of the show */
	.episode-reveal {
		text-align: center;
		opacity: 0;
		transform: translateY(30px) scale(0.5);
		transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.episode-reveal.show {
		opacity: 1;
		transform: translateY(0) scale(1);
	}

	.episode-number {
		font-size: clamp(4rem, 15vw, 8rem);
		font-weight: 800;
		background: linear-gradient(
			135deg,
			#1db954 0%,
			#22d3ee 50%,
			#a855f7 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		line-height: 1;
		text-shadow: 0 0 60px rgba(29, 185, 84, 0.3);
	}

	.episode-label {
		font-size: 1.5rem;
		font-weight: 600;
		color: white;
		margin-top: -0.5rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.episode-context {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin-top: 0.25rem;
		font-style: italic;
	}

	/* Duration */
	.duration-section {
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.5s ease;
	}

	.duration-section.show {
		opacity: 1;
		transform: translateY(0);
	}

	.stat-pill {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(20, 20, 20, 0.8);
		padding: 0.75rem 1.25rem;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.stat-icon {
		color: #1db954;
		font-family: "JetBrains Mono", monospace;
	}

	.stat-value {
		font-weight: 600;
		color: white;
	}

	.stat-label {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.875rem;
	}

	/* DateTime */
	.datetime-section {
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.5s ease;
	}

	.datetime-section.show {
		opacity: 1;
		transform: translateY(0);
	}

	.datetime-card {
		text-align: center;
		padding: 1rem 1.5rem;
		background: rgba(29, 185, 84, 0.1);
		border-radius: 12px;
		border: 1px solid rgba(29, 185, 84, 0.2);
	}

	.date {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 0.25rem;
	}

	.time-range {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.time {
		font-family: "JetBrains Mono", monospace;
		font-size: 0.875rem;
		color: #1db954;
	}

	.time-arrow {
		color: rgba(255, 255, 255, 0.3);
		font-family: "JetBrains Mono", monospace;
	}

	/* Total */
	.total-section {
		width: 100%;
		text-align: center;
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.5s ease;
	}

	.total-section.show {
		opacity: 1;
		transform: translateY(0);
	}

	.total-divider {
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.2),
			transparent
		);
		margin-bottom: 1rem;
	}

	.total-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.total-number {
		color: white;
		font-weight: 600;
		margin-right: 0.25rem;
	}
</style>
