<script lang="ts">
	import type { SeriesCompletionStat } from "$lib/server/stats";
	import ShareButton from "$lib/components/ui/ShareButton.svelte";

	export let seriesCompletion: SeriesCompletionStat[] = [];

	let imageErrors: Set<string> = new Set();

	$: rankedSeries = [...seriesCompletion]
		.sort((a, b) => b.completionPercentage - a.completionPercentage)
		.slice(0, 5);

	$: nearlyFinished = seriesCompletion
		.filter((series) => series.completionPercentage >= 80 && series.completionPercentage < 100)
		.sort((a, b) => b.completionPercentage - a.completionPercentage)
		.slice(0, 4);

	function handleImageError(id: string) {
		imageErrors = new Set([...imageErrors, id]);
	}

	function getGradientFromName(name: string): string {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		const hue1 = Math.abs(hash % 360);
		const hue2 = (hue1 + 32) % 360;
		return `linear-gradient(140deg, hsl(${hue1}, 70%, 42%), hsl(${hue2}, 80%, 28%))`;
	}

	function getImageUrl(imageUrl: string): string {
		return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
	}
</script>

<div class="card-base" id="series-completion-card">
	<div class="orb orb-1"></div>
	<div class="orb orb-2"></div>
	<div class="orb orb-3"></div>

	<div class="card-header">
		<div>
			<p class="eyebrow">Progress Tracker</p>
			<h2>Series Completion</h2>
		</div>
		<div class="share-container">
			<ShareButton targetId="series-completion-card" fileName="emby-wrapped-series-completion.png" />
		</div>
	</div>

	<div class="card-content">
		<section>
			<h3>Top by completion %</h3>
			{#if rankedSeries.length === 0}
				<p class="empty">No qualifying series this period.</p>
			{:else}
				{#each rankedSeries as series, i}
					<div class="row" title={`${series.watchedEpisodes} watched / ${series.totalEpisodes} total episodes`}>
						<div class="rank">#{i + 1}</div>
						<div class="poster-wrap">
							{#if !imageErrors.has(series.id)}
								<img
									src={getImageUrl(series.imageUrl)}
									alt={series.name}
									class="poster"
									on:error={() => handleImageError(series.id)}
								/>
							{:else}
								<div class="poster-fallback" style={`background: ${getGradientFromName(series.name)}`}>
									{series.name.charAt(0)}
								</div>
							{/if}
						</div>
						<div class="meta">
							<div class="meta-head">
								<span class="name">{series.name}</span>
								<span class="pct">{series.completionPercentage}%</span>
							</div>
							<div class="progress-track">
								<div class="progress-fill" style={`width: ${series.completionPercentage}%`}></div>
							</div>
							<small>{series.watchedEpisodes}/{series.totalEpisodes} episodes</small>
						</div>
					</div>
				{/each}
			{/if}
		</section>

		<section>
			<h3>Nearly finished (80-99%)</h3>
			{#if nearlyFinished.length === 0}
				<p class="empty">No nearly finished series yet.</p>
			{:else}
				<div class="chips">
					{#each nearlyFinished as series}
						<div class="chip">
							<div class="chip-title">{series.name}</div>
							<div class="chip-sub">{series.watchedEpisodes} of {series.totalEpisodes} episodes</div>
							<div class="chip-pct">{series.completionPercentage}%</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>

<style>
	.card-base {
		position: relative;
		isolation: isolate;
		min-height: 100vh;
		padding: 2rem 1.25rem;
		background: radial-gradient(circle at 8% 8%, rgba(30, 64, 175, 0.22), transparent 42%),
			radial-gradient(circle at 92% 88%, rgba(76, 29, 149, 0.2), transparent 50%),
			linear-gradient(180deg, #020617 0%, #0b1220 55%, #0a1020 100%);
		color: #fff;
		overflow: hidden;
	}

	.orb {
		position: absolute;
		border-radius: 999px;
		filter: blur(56px);
		opacity: 0.25;
		z-index: -1;
	}
	.orb-1 {
		top: 6%;
		left: -8%;
		width: 220px;
		height: 220px;
		background: #0ea5e9;
	}
	.orb-2 {
		bottom: 15%;
		right: -10%;
		width: 260px;
		height: 260px;
		background: #8b5cf6;
	}
	.orb-3 {
		top: 42%;
		right: 16%;
		width: 160px;
		height: 160px;
		background: #22d3ee;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		max-width: 860px;
		margin-inline: auto;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		opacity: 0.75;
	}

	.card-content {
		display: grid;
		gap: 1.2rem;
		max-width: 860px;
		margin: 0 auto;
	}

	section {
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(148, 163, 184, 0.22);
		border-radius: 16px;
		padding: 1rem;
	}

	h3 {
		margin: 0 0 0.9rem;
		font-size: 1rem;
		opacity: 0.95;
	}

	.row {
		display: grid;
		grid-template-columns: 42px 54px 1fr;
		gap: 0.75rem;
		align-items: center;
		padding: 0.55rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.row:last-child {
		border-bottom: none;
	}

	.rank {
		font-weight: 700;
		opacity: 0.75;
	}

	.poster-wrap {
		width: 54px;
		height: 78px;
		border-radius: 10px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
	}

	.poster,
	.poster-fallback {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.poster-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1.25rem;
	}

	.meta-head {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: baseline;
	}

	.name {
		font-weight: 600;
	}

	.pct {
		font-weight: 700;
		color: #a5f3fc;
	}

	.progress-track {
		height: 8px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.12);
		margin: 0.35rem 0;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #06b6d4, #3b82f6 60%, #a855f7);
	}

	small,
	.empty {
		opacity: 0.78;
	}

	.empty {
		margin: 0;
	}

	.chips {
		display: grid;
		gap: 0.6rem;
	}

	.chip {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-areas:
			"title pct"
			"sub pct";
		padding: 0.7rem 0.75rem;
		border-radius: 12px;
		background: rgba(15, 23, 42, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.chip-title {
		grid-area: title;
		font-weight: 600;
	}

	.chip-sub {
		grid-area: sub;
		font-size: 0.85rem;
		opacity: 0.75;
	}

	.chip-pct {
		grid-area: pct;
		align-self: center;
		font-weight: 700;
		color: #67e8f9;
	}

	:global(.snapshot-mode) .share-container {
		display: none !important;
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
</style>
