<script lang="ts">
	import type { RewatchInsights } from "$lib/server/stats";
	import ShareButton from "$lib/components/ui/ShareButton.svelte";

	export let rewatch: RewatchInsights;

	const typeLabels: Record<string, string> = {
		movie: "Movies",
		episode: "Episodes",
		musicvideo: "Music Videos"
	};

	function getTypeLabel(type: string): string {
		return typeLabels[type] || `${type.charAt(0).toUpperCase()}${type.slice(1)}s`;
	}

	function getImageUrl(imageUrl: string): string {
		return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
	}

	function getBadgeTone(type: string): string {
		if (type === "movie") return "badge-blue";
		if (type === "episode") return "badge-purple";
		return "badge-teal";
	}
</script>

<div class="card-base" id="rewatch-card">
	<div class="orb orb-1"></div>
	<div class="orb orb-2"></div>
	<div class="orb orb-3"></div>

	<div class="card-header">
		<div>
			<p class="eyebrow">Repeat Behavior</p>
			<h2>Rewatch Insights</h2>
		</div>
		<ShareButton targetId="rewatch-card" fileName="emby-wrapped-rewatch-insights.png" />
	</div>

	<div class="stats-strip">
		<div class="stat-pill">
			<div class="label">Rewatch Index</div>
			<div class="value">{rewatch.rewatchIndex}%</div>
		</div>
		<div class="stat-pill">
			<div class="label">Repeat Plays</div>
			<div class="value">{rewatch.repeatPlays}</div>
		</div>
		<div class="stat-pill">
			<div class="label">Titles Rewatched</div>
			<div class="value">{rewatch.repeatedTitles}</div>
		</div>
	</div>

	<div class="card-content">
		<section>
			<h3>Top Rewatched Titles</h3>
			{#each rewatch.topRewatchedTitles as item, i}
				<div class="row">
					<div class="rank">#{i + 1}</div>
					<img class="poster" src={getImageUrl(item.imageUrl)} alt={item.name} />
					<div class="meta">
						<div class="name">{item.name}</div>
						<div class="sub">+{item.repeatPlays} repeat plays · {item.totalPlays} total</div>
					</div>
					<div class={`badge ${getBadgeTone(item.type)}`}>{getTypeLabel(item.type)}</div>
				</div>
			{/each}
		</section>

		{#if rewatch.mediaTypeSplits.length > 0}
			<section>
				<h3>Repeat Split by Media Type</h3>
				<div class="chips">
					{#each rewatch.mediaTypeSplits as split}
						<div class="chip">
							<div class="chip-title">{getTypeLabel(split.type)}</div>
							<div class="chip-stat">{split.repeatPlays} repeat plays</div>
							<div class="chip-sub">{split.repeatedTitles} titles · {split.totalPlays} total plays</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>

<style>
	.card-base {
		position: relative;
		min-height: 100vh;
		padding: 2rem 1.25rem;
		background: radial-gradient(circle at 12% 14%, #34d39933, transparent 46%),
			linear-gradient(180deg, #0f172a 0%, #111827 100%);
		color: #fff;
		overflow: hidden;
	}

	.orb {
		position: absolute;
		border-radius: 999px;
		filter: blur(44px);
		opacity: 0.45;
		z-index: 0;
	}

	.orb-1 {
		top: 4%;
		left: -8%;
		width: 220px;
		height: 220px;
		background: #34d399;
	}

	.orb-2 {
		right: -9%;
		bottom: 10%;
		width: 250px;
		height: 250px;
		background: #2dd4bf;
	}

	.orb-3 {
		top: 34%;
		right: 18%;
		width: 150px;
		height: 150px;
		background: #60a5fa;
	}

	.card-header,
	.stats-strip,
	.card-content {
		position: relative;
		z-index: 1;
		max-width: 860px;
		margin-inline: auto;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		opacity: 0.75;
	}

	.stats-strip {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.stat-pill {
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		padding: 0.75rem;
	}

	.label {
		font-size: 0.72rem;
		opacity: 0.75;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.value {
		font-size: 1.45rem;
		font-weight: 700;
	}

	.card-content {
		display: grid;
		gap: 1rem;
	}

	section {
		background: rgba(148, 163, 184, 0.14);
		border: 1px solid rgba(255, 255, 255, 0.16);
		backdrop-filter: blur(8px);
		border-radius: 16px;
		padding: 1rem;
	}

	h3 {
		margin: 0 0 0.9rem;
	}

	.row {
		display: grid;
		grid-template-columns: 42px 54px 1fr auto;
		gap: 0.75rem;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.row:last-child {
		border-bottom: none;
	}

	.rank {
		font-weight: 700;
		opacity: 0.75;
	}

	.poster {
		width: 54px;
		height: 78px;
		border-radius: 10px;
		object-fit: cover;
		border: 1px solid rgba(255, 255, 255, 0.16);
		background: rgba(255, 255, 255, 0.08);
	}

	.name {
		font-weight: 600;
	}

	.sub {
		font-size: 0.82rem;
		opacity: 0.75;
	}

	.badge {
		padding: 0.25rem 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		border: 1px solid rgba(255, 255, 255, 0.25);
	}

	.badge-blue {
		background: rgba(59, 130, 246, 0.25);
	}

	.badge-purple {
		background: rgba(168, 85, 247, 0.25);
	}

	.badge-teal {
		background: rgba(20, 184, 166, 0.25);
	}

	.chips {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 0.75rem;
	}

	.chip {
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(15, 23, 42, 0.45);
		border-radius: 12px;
		padding: 0.75rem;
	}

	.chip-title {
		font-weight: 600;
	}

	.chip-stat {
		font-size: 1rem;
		font-weight: 700;
	}

	.chip-sub {
		font-size: 0.78rem;
		opacity: 0.75;
	}

	@media (max-width: 740px) {
		.stats-strip {
			grid-template-columns: 1fr;
		}

		.row {
			grid-template-columns: 30px 48px 1fr;
		}

		.badge {
			display: none;
		}
	}
</style>
