<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { UNICODE } from "$lib/utils/format";
	import type { UserStats } from "$lib/server/stats";

	export let stats: UserStats;
	export let serverName: string;
	export let userImageUrl: string | null;
	export let timeRangeOptions: { value: string; label: string }[] = [];
	export let currentTimeRange: string = "";

	let visible = false;
	let phase = 0;

	function handleTimeRangeChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const newPeriod = select.value;
		goto(`?period=${newPeriod}`, { replaceState: true });
	}

	onMount(() => {
		setTimeout(() => {
			visible = true;
			startreveal();
		}, 100);
	});

	function startreveal() {
		// Cinematic sequence
		// 0: Init
		// 1: "Emby Wrapped" logo / year
		// 2: "For" (bridge)
		// 3: User Profile & Name
		// 4: Server Name & Hint

		const timeline = [
			{ phase: 1, delay: 500 },
			{ phase: 2, delay: 1800 },
			{ phase: 3, delay: 2400 },
			{ phase: 4, delay: 3500 },
		];

		timeline.forEach(({ phase: p, delay }) => {
			setTimeout(() => {
				phase = p;
			}, delay);
		});
	}
</script>

<div class="card-base" class:visible id="intro-card">
	<div class="intro-container">
		<!-- Phase 1: Year Reveal -->
		<div
			class="year-lockup"
			class:active={phase >= 1}
			class:minimized={phase >= 3}
		>
			<div class="wrapped-year font-display">{stats.year}</div>
			<div class="wrapped-label text-gradient">WRAPPED</div>

			<!-- Time Range Selector -->
			<div class="time-selector-wrapper" on:click|stopPropagation>
				<select value={currentTimeRange} on:change={handleTimeRangeChange} class="time-select">
					{#each timeRangeOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<div class="select-arrow">{UNICODE.triangleDown}</div>
			</div>
		</div>

		<!-- Phase 2: Bridge -->
		<div class="bridge-text" class:show={phase === 2 || phase === 3}>
			<span>prepared for</span>
		</div>

		<!-- Phase 3: Profile Reveal -->
		<div class="profile-section" class:show={phase >= 3}>
			<div class="profile-ring">
				<div class="profile-image-container">
					{#if userImageUrl}
						<img
							src={userImageUrl}
							alt={stats.username}
							class="profile-img"
						/>
					{:else}
						<div class="profile-fallback">
							<span>{stats.username.charAt(0).toUpperCase()}</span
							>
						</div>
					{/if}
				</div>
			</div>

			<h1 class="username font-display">
				{stats.username}
			</h1>

			<!-- Phase 4: Footer -->
			<div class="footer-info" class:show={phase >= 4}>
				<div class="server-badge">
					<span class="server-icon">{UNICODE.diamond}</span>
					<span class="server-name">{serverName}</span>
				</div>

				<div class="ready-hint">
					<p class="hint-text">
						{Math.round(stats.totalMinutes / 60).toLocaleString()} hours
						of stories
					</p>
					<span class="scroll-indicator">{UNICODE.triangleDown}</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.card-base {
		position: relative;
		width: 100%;
		min-height: 100%;
		height: auto;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		opacity: 0;
		transition: opacity 1s cubic-bezier(0.16, 1, 0.3, 1);
		background: radial-gradient(
			circle at center,
			rgba(30, 30, 30, 0.4) 0%,
			transparent 70%
		);
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

	:global(.snapshot-mode) .wrapped-label {
    color: #1db954 !important;
    -webkit-text-fill-color: #1db954 !important;
    background: none !important;
}

	/* Reset the animated layout to a static flow */
	:global(.snapshot-mode).card-base,
	:global(.snapshot-mode) .intro-container {
		height: auto !important;
	}

	:global(.snapshot-mode) .intro-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start !important;
		height: auto !important;
		gap: 2rem;
		padding-top: 3rem;
	}

	:global(.snapshot-mode) .year-lockup {
		position: relative !important;
		top: auto !important;
		left: auto !important;
		transform: none !important;
		opacity: 1 !important;
	}

	:global(.snapshot-mode) .bridge-text {
		display: none !important;
	}

	:global(.snapshot-mode) .time-selector-wrapper {
		display: none !important;
	}

	/* Prevent line-height:0.85 causing WRAPPED to overlap 2026 */
	:global(.snapshot-mode) .wrapped-year {
		line-height: 1.1 !important;
		margin-bottom: 0.25rem !important;
	}

	:global(.snapshot-mode) .profile-section {
		opacity: 1 !important;
		transform: none !important;
		margin-top: 0 !important;
	}

	:global(.snapshot-mode) .footer-info {
		opacity: 1 !important;
		transform: none !important;
	}

	.intro-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100%;
		height: auto;
		width: 100%;
		position: relative;
		padding: 4rem 0;
	}

	/* Year Lockup */
	.year-lockup {
		display: flex;
		flex-direction: column;
		align-items: center;
		opacity: 0;
		transform: scale(0.9) translateY(20px);
		transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%) scale(0.9);
	}

	.year-lockup.active {
		opacity: 1;
		transform: translate(-50%, -50%) scale(1.5);
	}

	.year-lockup.minimized {
		top: 15%;
		transform: translate(-50%, -50%) scale(0.8);
		opacity: 0.5;
	}

	.wrapped-year {
		font-size: 6rem;
		font-weight: 800;
		line-height: 0.85;
		letter-spacing: -0.04em;
		color: white;
		text-shadow: 0 0 60px rgba(255, 255, 255, 0.2);
	}

	.wrapped-label {
		font-family: "JetBrains Mono", monospace;
		font-size: 1.25rem;
		letter-spacing: 0.8em;
		margin-left: 0.8em; /* optical alignment */
		font-weight: 300;
		background: linear-gradient(90deg, #1db954, #3b82f6);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	/* Time Selector */
	.time-selector-wrapper {
		margin-top: 1.5rem;
		position: relative;
		display: flex;
		align-items: center;
		pointer-events: auto; /* Ensure clickable */
		z-index: 20;
	}

	.time-select {
		appearance: none;
		-webkit-appearance: none;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 100px;
		color: rgba(255, 255, 255, 0.8);
		font-family: "JetBrains Mono", monospace;
		font-size: 0.875rem;
		padding: 0.5rem 2.5rem 0.5rem 1.25rem;
		cursor: pointer;
		transition: all 0.2s ease;
		outline: none;
		text-align: center;
	}

	.time-select:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.4);
		color: white;
	}

	.time-select option {
		background: #1a1a1a;
		color: white;
	}

	.select-arrow {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.5);
	}

	/* Hide selector when minimized - REMOVED to keep it accessible */
	/* .year-lockup.minimized .time-selector-wrapper {
		display: none;
	} */

	/* Ensure it stays interactive even when parent is minimized/moved */
	.year-lockup.minimized .time-selector-wrapper {
		pointer-events: auto;
		/* Optional: adjust scale if it gets too small */
		transform: scale(1.2); 
		margin-top: 2rem;
	}

	/* Bridge */
	.bridge-text {
		position: absolute;
		top: 45%;
		opacity: 0;
		transform: translateY(10px);
		transition: all 0.6s ease;
		font-family: "JetBrains Mono", monospace;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.875rem;
		letter-spacing: 0.2em;
	}

	.bridge-text.show {
		opacity: 1;
		transform: translateY(0);
	}

	/* Profile Section */
	.profile-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		opacity: 0;
		transform: translateY(40px);
		transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
		margin-top: 5rem; /* Space from minified header */
	}

	.profile-section.show {
		opacity: 1;
		transform: translateY(0);
	}

	.profile-ring {
		padding: 4px;
		background: linear-gradient(135deg, #1db954, #3b82f6);
		border-radius: 50%;
		box-shadow: 0 0 40px rgba(29, 185, 84, 0.3);
	}

	.profile-image-container {
		width: 140px;
		height: 140px;
		border-radius: 50%;
		border: 4px solid #0a0a0a;
		overflow: hidden;
		background: #0a0a0a;
	}

	.profile-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.profile-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #1a1a1a;
		color: white;
		font-size: 3rem;
		font-weight: 700;
	}

	.username {
		font-size: 3.5rem;
		font-weight: 700;
		margin: 0;
		text-align: center;
		background: linear-gradient(
			180deg,
			#fff 0%,
			rgba(255, 255, 255, 0.7) 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		letter-spacing: -0.02em;
	}

	/* Footer */
	.footer-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3rem;
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.8s ease 0.2s;
	}

	.footer-info.show {
		opacity: 1;
		transform: translateY(0);
	}

	.server-badge {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 100px;
	}

	.server-icon {
		color: #1db954;
		font-size: 0.875rem;
	}

	.server-name {
		font-family: "JetBrains Mono", monospace;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.ready-hint {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.hint-text {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.scroll-indicator {
		color: rgba(255, 255, 255, 0.3);
		animation: bounce 2s infinite;
		font-size: 1.25rem;
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
			opacity: 0.3;
		}
		50% {
			transform: translateY(5px);
			opacity: 0.6;
		}
	}
</style>
