<script lang="ts">
	import { onMount } from "svelte";
	import AnimatedNumber from "$lib/components/ui/AnimatedNumber.svelte";
	import ShareButton from "$lib/components/ui/ShareButton.svelte";
	import { formatDate } from "$lib/utils/format";
	import type { UserStats } from "$lib/server/stats";

	export let stats: UserStats;

	let visible = false;
	let phase = 0;

	$: longestRange = stats.longestStreakStart && stats.longestStreakEnd
		? `${formatDate(stats.longestStreakStart)} → ${formatDate(stats.longestStreakEnd)}`
		: "No active dates";

	$: currentRange = stats.currentStreakStart && stats.currentStreakEnd
		? `${formatDate(stats.currentStreakStart)} → ${formatDate(stats.currentStreakEnd)}`
		: "No active dates";

	onMount(() => {
		setTimeout(() => {
			visible = true;
			phase = 1;
		}, 100);

		setTimeout(() => (phase = 2), 500);
		setTimeout(() => (phase = 3), 1200);
	});
</script>

<div class="card-base" class:visible id="streak-card">
	{#if visible}
		<div class="share-container">
			<ShareButton targetId="streak-card" fileName="emby-wrapped-streak.png" />
		</div>
	{/if}

	<div class="card-content">
		<p class="eyebrow" class:show={phase >= 1}>Consistency streak</p>
		<div class="longest" class:show={phase >= 2}>
			<p class="label">Longest streak</p>
			<div class="value font-display">
				<AnimatedNumber value={stats.longestStreak} duration={1800} />
				<span>days</span>
			</div>
			<p class="range font-mono">{longestRange}</p>
		</div>

		<div class="current" class:show={phase >= 3}>
			<p class="label">Current streak</p>
			<div class="current-value font-mono">{stats.currentStreak} days</div>
			<p class="range font-mono">{currentRange}</p>
		</div>

		<p class="timezone">Date boundaries use <span class="font-mono">{stats.streakTimeZone}</span></p>
	</div>
</div>

<style>
	.card-base {
		position: relative;
		width: 100%;
		min-height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		opacity: 0;
		transition: opacity 0.4s ease;
	}
	.card-base.visible { opacity: 1; }
	.card-content { text-align: center; max-width: 34rem; }
	.eyebrow, .longest, .current { opacity: 0; transform: translateY(16px); transition: all 0.5s ease; }
	.eyebrow.show, .longest.show, .current.show { opacity: 1; transform: translateY(0); }
	.eyebrow { color: rgba(255,255,255,.7); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 1rem; }
	.label { color: rgba(255,255,255,.75); margin-bottom: .4rem; }
	.value { font-size: clamp(3rem, 12vw, 7rem); line-height: 1; font-weight: 600; }
	.value span { font-size: .3em; margin-left: .4rem; opacity: .8; text-transform: uppercase; }
	.current { margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid rgba(255,255,255,.15); }
	.current-value { font-size: 1.5rem; margin-bottom: .35rem; }
	.range { color: rgba(255,255,255,.65); font-size: .9rem; }
	.timezone { margin-top: 1rem; color: rgba(255,255,255,.55); font-size: .8rem; }
</style>
