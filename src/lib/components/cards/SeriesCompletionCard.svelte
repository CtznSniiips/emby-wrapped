<script lang="ts">
	import { onMount } from "svelte";
	import type { SeriesCompletionStat } from "$lib/server/stats";
	import ShareButton from "$lib/components/ui/ShareButton.svelte";
	import { UNICODE } from "$lib/utils/format";

	export let seriesCompletion: SeriesCompletionStat[] = [];

	let visible = false;
	let phase = 0;
	let imageErrors: Set<string> = new Set();

	onMount(() => {
		setTimeout(() => {
			visible = true;
		}, 80);

		const timeline = [
			{ phase: 1, delay: 150 },
			{ phase: 2, delay: 550 },
			{ phase: 3, delay: 1000 },
			{ phase: 4, delay: 1400 },
		];

		timeline.forEach(({ phase: p, delay }) => {
			setTimeout(() => {
				phase = p;
			}, delay);
		});
	});

	$: rankedSeries = [...seriesCompletion]
		.sort((a, b) => {
			if (b.completionPercentage !== a.completionPercentage) {
				return b.completionPercentage - a.completionPercentage;
			}
			return b.watchedEpisodes - a.watchedEpisodes;
		})
		.slice(0, 5);

	$: nearlyFinished = seriesCompletion
		.filter((series) => series.completionPercentage >= 80 && series.completionPercentage < 100)
		.sort((a, b) => b.completionPercentage - a.completionPercentage)
		.slice(0, 4);

	function getImageUrl(url: string): string {
		return `/api/proxy-image?url=${encodeURIComponent(url)}`;
	}

	function getFallbackGradient(name: string): string {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		const hue = Math.abs(hash % 360);
		return `linear-gradient(135deg, hsl(${hue}, 70%, 42%), hsl(${(hue + 35) % 360}, 70%, 30%))`;
	}

	function handleImageError(id: string) {
		imageErrors = new Set([...imageErrors, id]);
	}
</script>

<div class="card-base" class:visible id="series-completion-card">
	<div class="aurora"></div>
	<div class="grain"></div>

	<div class="share-container">
		<ShareButton targetId="series-completion-card" fileName="emby-wrapped-series-completion.png" />
	</div>

	<div class="card-content">
		<div class="title-section" class:show={phase >= 1}>
			<p class="eyebrow font-mono">{UNICODE.diamond} COMPLETION TRACKER {UNICODE.diamond}</p>
			<h2 class="title font-display">Series You’re Crushing</h2>
		</div>

		<section class="panel" class:show={phase >= 2}>
			<h3>Top by completion %</h3>
			{#if rankedSeries.length === 0}
				<p class="empty">No qualifying series this period.</p>
			{:else}
				{#each rankedSeries as series, i}
					<div class="row" title={`${series.watchedEpisodes} watched / ${series.totalEpisodes} total episodes`}>
						<div class="rank font-mono">#{i + 1}</div>
						{#if !imageErrors.has(series.id)}
							<img
								src={getImageUrl(series.imageUrl)}
								alt={series.name}
								class="poster"
								on:error={() => handleImageError(series.id)}
							/>
						{:else}
							<div class="poster fallback" style={`background:${getFallbackGradient(series.name)}`}>
								{series.name.charAt(0).toUpperCase()}
							</div>
						{/if}
						<div class="meta">
							<div class="name">{series.name}</div>
							<small class="count">{series.watchedEpisodes}/{series.totalEpisodes} eps</small>
						</div>
						<div class="pct-wrap">
							<div class="pct font-mono">{series.completionPercentage}%</div>
							<div class="track">
								<div class="bar" style={`width:${series.completionPercentage}%`}></div>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</section>

		<section class="panel nearly" class:show={phase >= 3}>
			<h3>Nearly finished (80–99%)</h3>
			{#if nearlyFinished.length === 0}
				<p class="empty">No nearly finished series yet.</p>
			{:else}
				{#each nearlyFinished as series}
					<details>
						<summary>
							<span>{series.name}</span>
							<strong class="font-mono">{series.completionPercentage}%</strong>
						</summary>
						<p>{series.watchedEpisodes} watched of {series.totalEpisodes} total episodes.</p>
					</details>
				{/each}
			{/if}
		</section>
	</div>
</div>

<style>
	.card-base {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2.5rem 1rem;
		overflow: hidden;
		opacity: 0;
		transition: opacity 0.4s ease;
		background: radial-gradient(circle at 20% 0%, #1f2937 0%, #0b1020 35%, #06080f 100%);
	}
	.card-base.visible { opacity: 1; }
	.aurora {
		position: absolute; inset: -20%;
		background: conic-gradient(from 100deg at 20% 30%, rgba(34,211,238,.22), rgba(167,139,250,.22), rgba(29,185,84,.22), rgba(34,211,238,.22));
		filter: blur(70px);
		animation: drift 14s linear infinite;
	}
	.grain {
		position: absolute; inset: 0;
		background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
		background-size: 3px 3px;
		opacity: 0.08;
		pointer-events: none;
	}
	.share-container {
		position: absolute;
		top: 1.4rem;
		right: 1.2rem;
		z-index: 10;
	}
	:global(.snapshot-mode) .share-container { display: none !important; }
	.card-content {
		position: relative;
		z-index: 2;
		width: min(860px, 100%);
		display: grid;
		gap: 1rem;
	}
	.title-section, .panel {
		opacity: 0;
		transform: translateY(14px) scale(0.98);
		transition: all .5s cubic-bezier(.19,1,.22,1);
	}
	.title-section.show, .panel.show {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
	.eyebrow { margin: 0 0 .35rem; color: #7dd3fc; font-size: .72rem; letter-spacing: .08em; }
	.title { margin: 0; color: #fff; font-size: clamp(1.6rem, 5vw, 2.1rem); }
	.panel {
		background: linear-gradient(135deg, rgba(15,23,42,.85), rgba(30,41,59,.65));
		border: 1px solid rgba(125,211,252,.2);
		backdrop-filter: blur(8px);
		border-radius: 16px;
		padding: 1rem;
	}
	h3 { margin: 0 0 .75rem; color: #dbeafe; font-size: 1rem; }
	.row {
		display: grid;
		grid-template-columns: 42px 42px 1fr minmax(120px, 180px);
		gap: .65rem;
		align-items: center;
		padding: .45rem 0;
		border-bottom: 1px solid rgba(148,163,184,.2);
	}
	.row:last-child { border-bottom: 0; }
	.rank { color: #7dd3fc; }
	.poster { width: 42px; aspect-ratio: 2/3; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,.2); }
	.poster.fallback { display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; }
	.name { color: #fff; font-weight: 600; line-height: 1.2; }
	.count { color: #cbd5e1; }
	.pct-wrap { display: grid; gap: .35rem; }
	.pct { color: #86efac; text-align: right; }
	.track { height: 6px; border-radius: 999px; background: rgba(148,163,184,.3); overflow: hidden; }
	.bar { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #22d3ee, #1db954); }
	.nearly details { border-top: 1px solid rgba(148,163,184,.18); padding: .45rem 0; }
	.nearly details:first-of-type { border-top: 0; }
	summary { cursor: pointer; display:flex; justify-content:space-between; color:#f8fafc; }
	details p { margin: .4rem 0 0; color: #cbd5e1; font-size: .92rem; }
	.empty { margin: 0; color: #94a3b8; }
	@media (max-width: 640px) {
		.row { grid-template-columns: 30px 34px 1fr; }
		.pct-wrap { grid-column: 2 / -1; }
	}
	@keyframes drift {
		0% { transform: rotate(0deg) scale(1); }
		50% { transform: rotate(180deg) scale(1.1); }
		100% { transform: rotate(360deg) scale(1); }
	}
</style>
