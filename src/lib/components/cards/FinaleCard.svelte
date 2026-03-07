<script lang="ts">
	import { onMount } from "svelte";
	import AnimatedNumber from "$lib/components/ui/AnimatedNumber.svelte";
	import { UNICODE, formatDuration } from "$lib/utils/format";
	import type { UserStats } from "$lib/server/stats";
	import ShareButton from "../ui/ShareButton.svelte";

	export let stats: UserStats;

	let visible = false;
	let showConfetti = false;

	onMount(() => {
		setTimeout(() => {
			visible = true;
		}, 100);
		setTimeout(() => {
			showConfetti = true;
		}, 500);
	});

	$: duration = formatDuration(stats.totalMinutes);

	// Get top 4 posters for collage
	$: collageItems = [
		...stats.topShows.slice(0, 2),
		...stats.topMovies.slice(0, 2),
	];

	// Generate confetti pieces
	const confettiColors = [
		"#1db954",
		"#22d3ee",
		"#7c3aed",
		"#f97316",
		"#ef4444",
		"#fbbf24",
		"#ec4899",
	];
	const confettiPieces = Array(40)
		.fill(null)
		.map((_, i) => ({
			id: i,
			color: confettiColors[i % confettiColors.length],
			left: Math.random() * 100,
			delay: Math.random() * 3,
			duration: 3 + Math.random() * 2,
			size: 6 + Math.random() * 8,
			rotation: Math.random() * 360,
		}));
</script>

<div class="card-base" class:visible id="finale-card">
	<!-- Solid background for screenshot capture -->
	<div class="bg-solid"></div>

	<!-- Confetti celebration -->
	{#if showConfetti}
		<div class="confetti-container">
			{#each confettiPieces as piece}
				<div
					class="confetti"
					style="
						left: {piece.left}%;
						background-color: {piece.color};
						width: {piece.size}px;
						height: {piece.size * 0.6}px;
						animation-delay: {piece.delay}s;
						animation-duration: {piece.duration}s;
						--rotation: {piece.rotation}deg;
					"
				></div>
			{/each}
		</div>
	{/if}

	<!-- Background collage -->
	<div class="collage-bg">
		{#each collageItems as item, i}
			<div class="collage-item" style="animation-delay: {i * 100}ms">
				<img
					src="/api/proxy-image?url={encodeURIComponent(
						item.imageUrl,
					)}"
					alt=""
				/>
			</div>
		{/each}
	</div>
	<div class="bg-overlay"></div>

	<div class="share-container">
		<ShareButton
			targetId="finale-card"
			fileName="emby-wrapped-finale.png"
		/>
	</div>

	<div class="card-content">
		<div class="unicode-line">
			<span>{UNICODE.diamond}</span>
			<span>{UNICODE.asterism}</span>
			<span>{UNICODE.diamond}</span>
		</div>

		<h1 class="title font-display">That's a wrap on {stats.timeRangeLabel}</h1>

		<div class="stats-grid">
			<div class="stat-item">
				<span class="stat-value font-mono">
					<AnimatedNumber
						value={duration.days > 0
							? duration.days
							: Math.round(stats.totalMinutes / 60)}
						duration={1500}
					/>
				</span>
				<span class="stat-label"
					>{duration.days > 0
						? "days watched"
						: "hours watched"}</span
				>
			</div>
			<div class="stat-item">
				<span class="stat-value font-mono">
					<AnimatedNumber
						value={stats.moviesWatched}
						duration={1200}
					/>
				</span>
				<span class="stat-label">movies</span>
			</div>
			<div class="stat-item">
				<span class="stat-value font-mono">
					<AnimatedNumber
						value={stats.episodesWatched}
						duration={1400}
					/>
				</span>
				<span class="stat-label">episodes</span>
			</div>
			<div class="stat-item">
				<span class="stat-value font-mono">
					<AnimatedNumber
						value={stats.totalGenresExplored}
						duration={1000}
					/>
				</span>
				<span class="stat-label">genres explored</span>
			</div>
		</div>

		<p class="thanks">
			<span class="unicode">{UNICODE.dots}</span>
			Thanks for watching with us
			<span class="unicode">{UNICODE.dots}</span>
		</p>
	</div>
</div>

<style>
	.card-base {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		text-align: center;
		opacity: 0;
		transform: translateY(20px);
		transition:
			opacity 0.5s ease,
			transform 0.5s ease;
		overflow: hidden;
	}

	.card-base.visible {
		opacity: 1;
		transform: translateY(0);
	}

	/* Solid background for proper screenshot capture */
	.bg-solid {
		position: absolute;
		inset: 0;
		background: #0a0a0a;
		z-index: -1;
	}

	/* Confetti */
	.confetti-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
		z-index: 2;
		pointer-events: none;
	}

	.confetti {
		position: absolute;
		top: -20px;
		border-radius: 2px;
		animation: confettiFall linear infinite;
		transform: rotate(var(--rotation, 0deg));
	}

	@keyframes confettiFall {
		0% {
			top: -20px;
			opacity: 1;
			transform: rotate(var(--rotation, 0deg)) translateX(0);
		}
		25% {
			transform: rotate(calc(var(--rotation, 0deg) + 90deg))
				translateX(15px);
		}
		50% {
			transform: rotate(calc(var(--rotation, 0deg) + 180deg))
				translateX(-10px);
		}
		75% {
			transform: rotate(calc(var(--rotation, 0deg) + 270deg))
				translateX(15px);
		}
		100% {
			top: 110%;
			opacity: 0;
			transform: rotate(calc(var(--rotation, 0deg) + 360deg))
				translateX(0);
		}
	}

	:global(.snapshot-mode) .confetti-container {
		display: none !important;
	}

	/* Background collage */
	.collage-bg {
		position: absolute;
		inset: -100px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
		gap: 8px;
		transform: rotate(-5deg) scale(1.2);
		animation: float-bg 20s ease-in-out infinite alternate;
		z-index: 0;
	}

	@keyframes float-bg {
		from {
			transform: rotate(-5deg) scale(1.2) translate(0, 0);
		}
		to {
			transform: rotate(-8deg) scale(1.3) translate(-20px, -20px);
		}
	}

	.collage-item {
		opacity: 0;
		animation: fadeInCollage 1.5s ease forwards;
	}

	@keyframes fadeInCollage {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}

	.collage-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(6px) brightness(0.35) saturate(1.2);
	}

	.bg-overlay {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			circle at center,
			rgba(5, 5, 5, 0.8) 0%,
			rgba(5, 5, 5, 0.95) 100%
		);
		z-index: 1;
	}

	.share-container {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 50;
		animation: fadeIn 0.5s ease 1s backwards;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	:global(.snapshot-mode) .share-container {
		display: none !important;
	}

	.card-content {
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		width: 100%;
		max-width: 500px;
	}

	.unicode-line {
		display: flex;
		gap: 1.5rem;
		font-family: "JetBrains Mono", monospace;
		font-size: 1.25rem;
		color: rgba(255, 255, 255, 0.3);
		letter-spacing: 0.2em;
	}

	.title {
		font-size: clamp(2.5rem, 8vw, 4rem);
		font-weight: 800;
		margin: 0;
		line-height: 0.95;
		background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		text-transform: uppercase;
		letter-spacing: -0.03em;
	}

	:global(.snapshot-mode) .title {
		background: none !important;
		-webkit-text-fill-color: initial !important;
		color: white !important;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		width: 100%;
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: white;
		line-height: 1;
	}

	.stat-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 500;
	}

	.thanks {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.unicode {
		font-family: "JetBrains Mono", monospace;
		color: rgba(255, 255, 255, 0.2);
	}
</style>
