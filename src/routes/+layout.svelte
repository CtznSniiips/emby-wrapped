<script lang="ts">
	import "../app.css";
	import AudioPlayer from "$lib/components/ui/AudioPlayer.svelte";
	import { navigating } from "$app/stores";
	import { serverStatsStore } from "$lib/stores/serverStatsStore";
	import { onDestroy } from "svelte";

	export let data;

	// ── Fun facts ────────────────────────────────────────────────────────────────
	// Static fallbacks shown before (or instead of) server-specific ones.
	const staticFacts = [
		"Crunching your watch history…",
		"Did you know? Binge-watching was coined in 2013.",
		"Counting every late-night episode…",
		"The average person watches ~1,500 hours of TV a year.",
		"Ranking your most-rewatched shows…",
		"Buffering feelings of nostalgia…",
		"Tallying all those 'just one more episode' moments…",
		"Consulting the algorithm gods…",
		"Your stats are worth the wait, we promise.",
		"Rewinding the year in your head…",
	];

	function buildFacts(stats: typeof $serverStatsStore): string[] {
		if (!stats) return staticFacts;

		const facts: string[] = [...staticFacts];

		if (stats.totalMinutes) {
			const days = Math.round(stats.totalMinutes / 1440);
			const hours = Math.round(stats.totalMinutes / 60);
			facts.push(`Your server watched ${hours.toLocaleString()} hours together — that's ${days} full days!`);
		}
		if (stats.totalUsers && stats.totalUsers > 1) {
			facts.push(`${stats.totalUsers} people called this server home this year.`);
		}
		if (stats.totalMovies && stats.totalMovies > 0) {
			facts.push(`${stats.totalMovies.toLocaleString()} movies watched across the whole server.`);
		}
		if (stats.totalEpisodes && stats.totalEpisodes > 0) {
			facts.push(`${stats.totalEpisodes.toLocaleString()} episodes streamed — someone's been busy.`);
		}
		if (stats.topShows && stats.topShows.length > 0) {
			facts.push(`"${stats.topShows[0].name}" was your server's most-watched show.`);
		}
		if (stats.topMovies && stats.topMovies.length > 0) {
			facts.push(`"${stats.topMovies[0].name}" topped the movie charts on your server.`);
		}
		if (stats.totalMovies && stats.totalEpisodes) {
			const ratio = (stats.totalEpisodes / Math.max(stats.totalMovies, 1)).toFixed(1);
			facts.push(`For every movie, your server watched ${ratio} episodes.`);
		}

		// Shuffle so it feels fresh each time
		return facts.sort(() => Math.random() - 0.5);
	}

	// ── Carousel state ───────────────────────────────────────────────────────────
	let facts: string[] = staticFacts;
	let factIndex = 0;
	let visible = true;
	let interval: ReturnType<typeof setInterval> | null = null;

	$: facts = buildFacts($serverStatsStore);

	$: if ($navigating) {
		factIndex = 0;
		visible = true;
		facts = buildFacts($serverStatsStore);
		if (!interval) {
			interval = setInterval(() => {
				visible = false;
				setTimeout(() => {
					factIndex = (factIndex + 1) % facts.length;
					visible = true;
				}, 350);
			}, 3000);
		}
	} else {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Emby Wrapped ◈ Emby for the People</title>
	<meta
		name="description"
		content="Your viewing recap, rewatched. Discover your personal media statistics from Emby for the People."
	/>
	<meta property="og:title" content="Emby Wrapped" />
	<meta
		property="og:description"
		content="Your viewing recap, rewatched."
	/>
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	{#if data.analyticsScript}
		{@html data.analyticsScript}
	{/if}
</svelte:head>

<div class="app">
	{#if data.isAuthenticated}
		<AudioPlayer />
	{/if}
	<slot />
</div>

{#if $navigating}
	<div class="nav-loading" aria-live="polite">
		<!-- Progress bar at the very top -->
		<div class="progress-bar">
			<div class="progress-shimmer"></div>
		</div>

		<div class="nav-loading-inner">
			<div class="nav-spinner"></div>

			<p class="nav-fact" class:fact-visible={visible}>
				{facts[factIndex]}
			</p>

			<p class="nav-hint">tap · · · tap · · · tap</p>
		</div>
	</div>
{/if}

<style>
	.app {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	/* ── Loading overlay ──────────────────────────────────────────────── */
	.nav-loading {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(10, 10, 10, 0.92);
		backdrop-filter: blur(16px);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		animation: overlay-in 0.25s ease;
	}

	/* ── Progress bar ─────────────────────────────────────────────────── */
	.progress-bar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(255, 255, 255, 0.06);
		overflow: hidden;
	}

	.progress-shimmer {
		height: 100%;
		width: 40%;
		background: linear-gradient(90deg, transparent, #1db954, #3b82f6, transparent);
		animation: shimmer 1.6s ease-in-out infinite;
	}

	/* ── Centre content ───────────────────────────────────────────────── */
	.nav-loading-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		max-width: 360px;
		padding: 0 2rem;
		text-align: center;
	}

	.nav-spinner {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.08);
		border-top-color: #1db954;
		animation: spin 0.9s linear infinite;
		flex-shrink: 0;
	}

	/* ── Rotating fact ────────────────────────────────────────────────── */
	.nav-fact {
		font-size: 1rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.75);
		min-height: 3rem;
		opacity: 0;
		transform: translateY(6px);
		transition:
			opacity 0.35s ease,
			transform 0.35s ease;
	}

	.nav-fact.fact-visible {
		opacity: 1;
		transform: translateY(0);
	}

	/* ── Subtle pulsing hint ──────────────────────────────────────────── */
	.nav-hint {
		font-size: 0.7rem;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.18);
		animation: pulse-hint 2.4s ease-in-out infinite;
	}

	/* ── Keyframes ────────────────────────────────────────────────────── */
	@keyframes overlay-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	@keyframes shimmer {
		0%   { transform: translateX(-150%); }
		100% { transform: translateX(350%); }
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@keyframes pulse-hint {
		0%, 100% { opacity: 0.18; }
		50%       { opacity: 0.45; }
	}
</style>
