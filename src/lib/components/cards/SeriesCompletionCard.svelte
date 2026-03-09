<script lang="ts">
	import type { SeriesCompletionStat } from "$lib/server/stats";
	import ShareButton from "$lib/components/ui/ShareButton.svelte";

	export let seriesCompletion: SeriesCompletionStat[] = [];

	$: rankedSeries = [...seriesCompletion]
		.sort((a, b) => b.completionPercentage - a.completionPercentage)
		.slice(0, 5);

	$: nearlyFinished = seriesCompletion
		.filter((series) => series.completionPercentage >= 80 && series.completionPercentage < 100)
		.sort((a, b) => b.completionPercentage - a.completionPercentage)
		.slice(0, 5);
</script>

<div class="card-base" id="series-completion-card">
	<div class="card-header">
		<h2>Series Completion</h2>
		<ShareButton targetId="series-completion-card" fileName="emby-wrapped-series-completion.png" />
	</div>

	<div class="card-content">
		<section>
			<h3>Top by completion %</h3>
			{#if rankedSeries.length === 0}
				<p class="empty">No qualifying series this period.</p>
			{:else}
				{#each rankedSeries as series, i}
					<div class="row" title={`${series.watchedEpisodes} watched / ${series.totalEpisodes} total episodes`}>
						<span class="rank">#{i + 1}</span>
						<span class="name">{series.name}</span>
						<span class="pct">{series.completionPercentage}%</span>
						<small>{series.watchedEpisodes}/{series.totalEpisodes}</small>
					</div>
				{/each}
			{/if}
		</section>

		<section>
			<h3>Nearly finished (80-99%)</h3>
			{#if nearlyFinished.length === 0}
				<p class="empty">No nearly finished series yet.</p>
			{:else}
				{#each nearlyFinished as series}
					<details>
						<summary>{series.name} — {series.completionPercentage}%</summary>
						<p>{series.watchedEpisodes} watched of {series.totalEpisodes} total episodes.</p>
					</details>
				{/each}
			{/if}
		</section>
	</div>
</div>

<style>
	.card-base { min-height: 100vh; padding: 2rem 1.25rem; background: #0f172a; color: #fff; }
	.card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; }
	.card-content { display:grid; gap: 1.2rem; max-width: 760px; margin: 0 auto; }
	section { background: rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.16); border-radius: 12px; padding: 1rem; }
	h3 { margin: 0 0 0.75rem; font-size: 1rem; }
	.row { display:grid; grid-template-columns: 52px 1fr auto; gap: 0.5rem 0.75rem; align-items:center; padding: 0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.08); }
	.row:last-child { border-bottom: none; }
	.row small { grid-column: 2 / -1; opacity: 0.8; }
	.rank { opacity: 0.75; }
	.pct { font-weight: 700; }
	.empty { opacity: 0.75; margin: 0; }
	details { padding: 0.35rem 0; }
	summary { cursor: pointer; }
</style>
