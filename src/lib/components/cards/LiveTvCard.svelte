<script lang="ts">
	import { onMount } from "svelte";
	import { UNICODE } from "$lib/utils/format";
	import ShareButton from "../ui/ShareButton.svelte";
	import type { LiveTvChannelStat } from "$lib/server/stats";

	export let totalMinutes: number;
	export let topChannels: LiveTvChannelStat[];

	let visible = false;
	let phase = 0;
	let imageErrors: Set<string> = new Set();

	onMount(() => {
		setTimeout(() => {
			visible = true;
			startReveal();
		}, 100);
	});

	function startReveal() {
		const timeline = [
			{ phase: 1, delay: 0 },
			{ phase: 2, delay: 500 },
			{ phase: 3, delay: 1000 },
			{ phase: 4, delay: 1600 },
			{ phase: 5, delay: 2200 },
		];
		timeline.forEach(({ phase: p, delay }) => {
			setTimeout(() => {
				phase = p;
			}, delay);
		});
	}

	function getLogoUrl(ch: LiveTvChannelStat): string {
		if (!ch.logoUrl) return '';
		return `/api/proxy-image?url=${encodeURIComponent(ch.logoUrl)}`;
	}

	function getGradient(name: string): string {
		let h = 0;
		for (let i = 0; i < name.length; i++) {
			h = name.charCodeAt(i) + ((h << 5) - h);
		}
		const hue = Math.abs(h % 360);
		return `linear-gradient(135deg, hsl(${hue},60%,25%) 0%, hsl(${(hue + 40) % 360},50%,15%) 100%)`;
	}

	$: totalHours = Math.floor(totalMinutes / 60);
	$: remainMins = totalMinutes % 60;
</script>

<div class="card-base" class:visible id="livetv-card">
	<!-- Scanline overlay -->
	<div class="bg-scan" aria-hidden="true"></div>

	<!-- Ambient glow orbs -->
	<div class="orb orb-1" aria-hidden="true"></div>
	<div class="orb orb-2" aria-hidden="true"></div>

	{#if visible}
		<div class="share-container">
			<ShareButton targetId="livetv-card" fileName="emby-wrapped-livetv.png" />
		</div>
	{/if}

	<div class="content">
		<!-- Header -->
		<div class="header" class:show={phase >= 1}>
			<div class="overline">
				<span class="unicode">{UNICODE.diamond}</span>
				<span>LIVE TV RECAP</span>
				<span class="unicode">{UNICODE.diamond}</span>
			</div>
			<h2 class="main-title font-display">Your Channels</h2>
		</div>

		<!-- Total time hero -->
		<div class="time-hero" class:show={phase >= 2}>
			<div class="time-label font-mono">total time watched</div>
			<div class="time-value">
				{#if totalHours > 0}
					<span class="big-num font-display">{totalHours}</span>
					<span class="unit">h</span>
				{/if}
				{#if remainMins > 0}
					<span class="big-num font-display">{remainMins}</span>
					<span class="unit">m</span>
				{/if}
			</div>
		</div>

		<!-- Divider -->
		<div class="divider" class:show={phase >= 2}></div>

		<!-- Channel list -->
		<div class="channels">
			{#each topChannels as ch, i}
				{@const showPhase = i < 2 ? 3 : i < 4 ? 4 : 5}
				<div
					class="channel-row"
					class:show={phase >= showPhase}
					style="transition-delay: {(i % 2) * 80}ms"
				>
					<div class="rank font-mono">#{i + 1}</div>

					<div class="logo-wrap">
						{#if !imageErrors.has(ch.id) && ch.logoUrl}
							<img
								src={getLogoUrl(ch)}
								alt={ch.name}
								class="logo"
								on:error={() => (imageErrors = new Set([...imageErrors, ch.id]))}
							/>
						{:else}
							<div class="logo-fallback" style="background:{getGradient(ch.name)}">
								<span>{ch.name.charAt(0)}</span>
							</div>
						{/if}
					</div>

					<div class="ch-details">
						<div class="ch-name">{ch.name}</div>
						<div class="bar-wrap">
							<div
								class="bar"
								class:animate={phase >= showPhase}
								style="--target-width: {Math.round((ch.minutes / topChannels[0].minutes) * 100)}%"
							></div>
						</div>
					</div>

					<div class="ch-time font-mono">
						{#if Math.floor(ch.minutes / 60) > 0}
							{Math.floor(ch.minutes / 60)}h
						{/if}
						{ch.minutes % 60}m
					</div>
				</div>
			{/each}
		</div>

		<!-- Footer -->
		<div class="footer" class:show={phase >= 5}>
			<div class="footer-line"></div>
			<div class="footer-text font-mono">
				{topChannels.length} channel{topChannels.length !== 1 ? "s" : ""} tuned in
			</div>
			<div class="footer-line"></div>
		</div>
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
		padding: 2rem 1.5rem;
		opacity: 0;
		transition: opacity 0.4s ease;
		overflow: hidden;
		background:
			radial-gradient(ellipse at 20% 15%, rgba(251, 146, 60, 0.13) 0%, transparent 55%),
			radial-gradient(ellipse at 80% 85%, rgba(239, 68, 68, 0.09) 0%, transparent 55%);
	}

	.card-base.visible {
		opacity: 1;
	}

	/* Scanlines */
	.bg-scan {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 3px,
			rgba(255, 255, 255, 0.013) 3px,
			rgba(255, 255, 255, 0.013) 4px
		);
		opacity: 0.6;
		z-index: 0;
	}

	/* Ambient orbs */
	.orb {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		z-index: 0;
		animation: pulse-orb 4s ease-in-out infinite alternate;
	}

	.orb-1 {
		width: 280px;
		height: 280px;
		top: -80px;
		left: -60px;
		background: radial-gradient(circle, rgba(251, 146, 60, 0.18) 0%, transparent 70%);
		animation-delay: 0s;
	}

	.orb-2 {
		width: 220px;
		height: 220px;
		bottom: -60px;
		right: -40px;
		background: radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%);
		animation-delay: -2s;
	}

	@keyframes pulse-orb {
		0% { transform: scale(1); opacity: 0.6; }
		100% { transform: scale(1.15); opacity: 1; }
	}

	/* Content */
	.content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		max-width: 480px;
		gap: 1.1rem;
		margin: 0 auto;
	}

	/* Header */
	.header {
		text-align: center;
		opacity: 0;
		transform: translateY(-20px);
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.header.show {
		opacity: 1;
		transform: translateY(0);
	}

	.overline {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		font-family: "JetBrains Mono", monospace;
		font-size: 0.7rem;
		color: #fb923c;
		letter-spacing: 0.2em;
		margin-bottom: 0.4rem;
	}

	.unicode {
		font-size: 0.6em;
		opacity: 0.7;
	}

	.main-title {
		font-size: clamp(1.9rem, 8vw, 2.8rem);
		font-weight: 800;
		line-height: 0.9;
		margin: 0;
		background: linear-gradient(180deg, white 0%, rgba(255, 255, 255, 0.65) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		text-transform: uppercase;
		letter-spacing: -0.02em;
	}

	/* Time Hero */
	.time-hero {
		text-align: center;
		opacity: 0;
		transform: scale(0.88);
		transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.time-hero.show {
		opacity: 1;
		transform: scale(1);
	}

	.time-label {
		font-size: 0.65rem;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.38);
		text-transform: uppercase;
		margin-bottom: 0.3rem;
	}

	.time-value {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.1rem;
	}

	.big-num {
		font-size: clamp(2.8rem, 11vw, 4.2rem);
		font-weight: 800;
		color: white;
		line-height: 1;
	}

	.unit {
		font-size: 1.3rem;
		color: #fb923c;
		font-weight: 700;
		margin-right: 0.4rem;
		line-height: 1;
		align-self: flex-end;
		padding-bottom: 0.3rem;
	}

	/* Divider */
	.divider {
		width: 100%;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(251, 146, 60, 0.35), transparent);
		opacity: 0;
		transform: scaleX(0.4);
		transition: all 0.7s ease;
	}

	.divider.show {
		opacity: 1;
		transform: scaleX(1);
	}

	/* Channels */
	.channels {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		width: 100%;
	}

	.channel-row {
		display: grid;
		grid-template-columns: 1.6rem 3.2rem 1fr auto;
		column-gap: 0.75rem;
		align-items: center;
		opacity: 0;
		transform: translateX(-18px);
		transition: opacity 0.5s ease, transform 0.5s ease;
	}

	.channel-row.show {
		opacity: 1;
		transform: translateX(0);
	}

	.rank {
		font-size: 0.6rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.3);
		text-align: right;
	}

	/* Logo */
	.logo-wrap {
		width: 3.2rem;
		height: 1.9rem;
		border-radius: 6px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.logo {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 3px;
	}

	.logo-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.95rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.55);
	}

	/* Channel details column */
	.ch-details {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		overflow: hidden;
		min-width: 0;
	}

	.ch-name {
		font-size: 0.8rem;
		font-weight: 600;
		color: white;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bar-wrap {
		height: 3px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 99px;
		overflow: hidden;
		width: 100%;
	}

	.bar {
		height: 100%;
		width: 0%;
		background: linear-gradient(90deg, #fb923c, #f97316);
		border-radius: 99px;
		transition: width 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
	}

	.bar.animate {
		width: var(--target-width);
	}

	.ch-time {
		font-size: 0.65rem;
		color: #fb923c;
		font-weight: 600;
		white-space: nowrap;
		text-align: right;
	}

	/* Footer */
	.footer {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		opacity: 0;
		transform: scaleX(0.9);
		transition: all 0.7s ease;
	}

	.footer.show {
		opacity: 1;
		transform: scaleX(1);
	}

	.footer-line {
		flex: 1;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
	}

	.footer-text {
		font-size: 0.65rem;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.35);
		text-transform: uppercase;
		white-space: nowrap;
	}

	.share-container {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 200;
		padding: 0.5rem;
		margin: -0.5rem;
	}

	/* Mobile */
	@media (max-width: 600px) {
		.card-base {
			padding: 2.5rem 1rem 4.5rem;
		}

		.content {
			gap: 0.85rem;
		}

		.main-title {
			font-size: 1.6rem;
		}

		.big-num {
			font-size: 2.8rem;
		}

		.ch-name {
			font-size: 0.7rem;
		}

		.ch-time {
			font-size: 0.6rem;
		}

		.logo-wrap {
			width: 2.8rem;
			height: 1.65rem;
		}
	}

	/* Snapshot overrides */
	:global(.snapshot-mode) .share-container {
		display: none !important;
	}

	:global(.snapshot-mode) .main-title,
	:global(.snapshot-mode) .big-num {
		background: none !important;
		-webkit-text-fill-color: initial !important;
		color: white !important;
		text-shadow: none !important;
	}

	:global(.snapshot-mode) .bar {
		width: var(--target-width) !important;
	}
</style>
