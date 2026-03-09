<script lang="ts">
  import { onMount } from "svelte";
  import type { UserStats } from "$lib/server/stats";
  import ShareButton from "../ui/ShareButton.svelte";

  export let stats: UserStats;

  let visible = false;
  onMount(() => {
    setTimeout(() => {
      visible = true;
    }, 100);
  });

  $: completion = stats.playbackCompletion;

  $: trendText =
    completion.trend.direction === "up"
      ? `Completion is trending up (${completion.trend.startCompletedRate}% → ${completion.trend.endCompletedRate}%).`
      : completion.trend.direction === "down"
        ? `Completion is trending down (${completion.trend.startCompletedRate}% → ${completion.trend.endCompletedRate}%).`
        : `Completion stayed steady at about ${completion.trend.endCompletedRate}%.`;

  $: insight = `You finish ${completion.completedPct}% of episodes.`;
</script>

<div class="card-base" class:visible id="completion-breakdown-card">
  <div class="share-container">
    <ShareButton
      targetId="completion-breakdown-card"
      fileName="emby-wrapped-completion-breakdown.png"
    />
  </div>

  <div class="card-content">
    <h2 class="title font-display">Session Completion</h2>

    <div class="stacked-bar" role="img" aria-label="Completed {completion.completedPct} percent, partial {completion.partialPct} percent, quick drop {completion.quickDropPct} percent">
      <div class="segment completed" style="width: {completion.completedPct}%" />
      <div class="segment partial" style="width: {completion.partialPct}%" />
      <div class="segment quick-drop" style="width: {completion.quickDropPct}%" />
    </div>

    <div class="legend">
      <div class="legend-row">
        <span class="dot completed"></span>
        <span>Completed</span>
        <strong class="font-mono">{completion.completedPct}%</strong>
      </div>
      <div class="legend-row">
        <span class="dot partial"></span>
        <span>Partial</span>
        <strong class="font-mono">{completion.partialPct}%</strong>
      </div>
      <div class="legend-row">
        <span class="dot quick-drop"></span>
        <span>Quick drop</span>
        <strong class="font-mono">{completion.quickDropPct}%</strong>
      </div>
    </div>

    <p class="insight">{insight}</p>
    <p class="trend">{trendText}</p>
  </div>
</div>

<style>
  .card-base {
    position: relative;
    width: 100%;
    min-height: 100%;
    display: flex;
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
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .title {
    color: #fff;
    font-size: 1.9rem;
    margin: 0 0 0.25rem;
    text-align: center;
  }

  .stacked-bar {
    height: 24px;
    width: 100%;
    border-radius: 999px;
    overflow: hidden;
    display: flex;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .segment {
    height: 100%;
    transition: width 0.6s ease;
  }

  .completed {
    background: linear-gradient(90deg, #22c55e, #4ade80);
  }

  .partial {
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
  }

  .quick-drop {
    background: linear-gradient(90deg, #ef4444, #f87171);
  }

  .legend {
    display: grid;
    gap: 0.5rem;
  }

  .legend-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.5rem;
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.95rem;
  }

  .dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
  }

  .insight {
    margin: 0.5rem 0 0;
    color: #fff;
    font-size: 1.05rem;
    text-align: center;
    font-weight: 600;
  }

  .trend {
    margin: 0;
    color: rgba(255, 255, 255, 0.68);
    text-align: center;
    font-size: 0.9rem;
    line-height: 1.45;
  }
</style>
