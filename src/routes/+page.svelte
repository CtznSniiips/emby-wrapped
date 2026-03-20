<script lang="ts">
	import { onMount } from "svelte";
	import { goto, invalidateAll } from "$app/navigation";
	import { UNICODE, formatDuration } from "$lib/utils/format";
	import CardStack from "$lib/components/CardStack.svelte";
	import ProgressDots from "$lib/components/ui/ProgressDots.svelte";
	import AnimatedNumber from "$lib/components/ui/AnimatedNumber.svelte";
	import Top5Card from "$lib/components/cards/Top5Card.svelte";
    import MusicSummaryCard from "$lib/components/cards/MusicSummaryCard.svelte";
	import SeerrRequestsCard from "$lib/components/cards/SeerrRequestsCard.svelte";
	import embywrappedLogo from "$lib/assets/embywrapped-logo.png";

	import type { PageData } from './$types';

	export let data: PageData;

	let username = "";
	let isLoading = false;
	let error = "";
	let selectedTimeRange = "";
	let hasAppliedPrefill = false;

	// Initialize selectedTimeRange, honoring prefilled period from URL
	$: if (data.timeRangeOptions && data.timeRangeOptions.length > 0 && !selectedTimeRange) {
		const hasPrefilledPeriod = data.prefilledPeriod
			? data.timeRangeOptions.some((option) => option.value === data.prefilledPeriod)
			: false;

		selectedTimeRange = hasPrefilledPeriod
			? data.prefilledPeriod
			: data.timeRangeOptions[0].value;
	}

	$: if (!hasAppliedPrefill && data.prefilledUsername) {
		username = data.prefilledUsername;
		hasAppliedPrefill = true;
	}

	$: selectedTimeRangeOption = data.timeRangeOptions?.find(
		(o) => o.value === selectedTimeRange,
	);
	$: defaultPeriodLabel = String(new Date().getFullYear() - 1);
	$: displayPeriod = selectedTimeRangeOption?.label || defaultPeriodLabel;


	// Server stats
	let serverStats: any = null;
	let statsLoading = true;
	let authenticatedUser = data.authenticatedUser;
	let currentCardIndex = 0;

	// Card phases for animations (only for cards that aren't using separate components)
	let introPhase = 0;
	let timePhase = 0;
	let contentPhase = 0;
	let ctaPhase = 0;

	// Fetch server stats when selectedTimeRange changes
	$: if (selectedTimeRange && authenticatedUser) {
		fetchServerStats();
	}

	async function fetchServerStats() {
		statsLoading = true;
		try {
			const response = await fetch(`/api/server-stats?period=${selectedTimeRange}`);
			if (response.ok) {
				serverStats = await response.json();
			}
		} catch (e) {
			console.warn("Failed to load server stats:", e);
		} finally {
			statsLoading = false;
		}
	}

	onMount(async () => {
		// Keep shared URLs with `user`/`username` focused on community cards first.
		// We still preserve the prefilled username for the form, but remove it from the URL
		// so refreshes/back-navigation don't unexpectedly re-enter prefilled mode.
		if (data.prefilledUsername && typeof window !== "undefined") {
			const nextUrl = new URL(window.location.href);
			nextUrl.searchParams.delete("user");
			nextUrl.searchParams.delete("username");
			window.history.replaceState({}, "", nextUrl);
		}
	});

	function handleCardChange(event: CustomEvent<{ index: number }>) {
		const cardIndex = event.detail.index;
		currentCardIndex = cardIndex;
		// Reset and start animations for the active card
		resetAllPhases();
		setTimeout(() => startCardAnimation(cardIndex), 100);
	}

	function resetAllPhases() {
		introPhase = 0;
		timePhase = 0;
		contentPhase = 0;
		ctaPhase = 0;
	}

	function startCardAnimation(cardIndex: number) {
        const cardType = visibleCards[cardIndex];
		const timelines: Record<
			string,
			{ setter: (v: number) => void; delays: number[] }
		> = {
			'intro': {
				setter: (v) => (introPhase = v),
				delays: [0, 600, 1200, 2000],
			},
			'time': { setter: (v) => (timePhase = v), delays: [0, 500, 1500, 2200] },
			'content': {
				setter: (v) => (contentPhase = v),
				delays: [0, 500, 1200, 1900],
			},
			// Cards 3 and 4 (Top5Card) handle their own animations internally
			'cta': { setter: (v) => (ctaPhase = v), delays: [0, 500, 1000, 1600] },
		};

		const config = timelines[cardType];
		if (config) {
			config.delays.forEach((delay, i) => {
				setTimeout(() => config.setter(i + 1), delay);
			});
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!username.trim()) {
			error = "Please enter your username";
			return;
		}

		isLoading = true;
		error = "";

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: username.trim() }),
			});
			const data = await response.json();

			if (response.ok && data.valid) {
				authenticatedUser = { userId: data.userId, username: data.username };
				await invalidateAll();
			} else {
				error = data.error || "User not found on this server";
			}
		} catch (e) {
			error = "Failed to connect to server";
		} finally {
			isLoading = false;
		}
	}


	function openPersonalWrapped() {
		if (!authenticatedUser) return;
		goto(`/${authenticatedUser.userId}?period=${selectedTimeRange}`);
	}
	// Computed stats
	$: totalHours = serverStats ? Math.round(serverStats.totalMinutes / 60) : 0;
	$: totalDays = serverStats
		? Math.round(serverStats.totalMinutes / 1440)
		: 0;
	$: duration = serverStats
		? formatDuration(serverStats.totalMinutes)
		: { days: 0, hours: 0, minutes: 0, formatted: "" };

	// Card count
	$: visibleCards = (() => {
        const cards = ['intro'];
        if (serverStats) {
            cards.push('time');
            cards.push('content');
            if (serverStats.topShows?.length > 0) cards.push('top_shows');
            if (serverStats.topMovies?.length > 0) cards.push('top_movies');
            if (serverStats.seerrRequests?.totalRequests > 0) cards.push('seerr_requests');
            if (serverStats.music && serverStats.music.totalMinutes > 0) cards.push('music');
        }
        cards.push('cta');
        return cards;
    })();
</script>

<svelte:head>
	<title>{displayPeriod} Wrapped · Emby for the People</title>
</svelte:head>

{#if !authenticatedUser}
	<!-- User Login Section -->
	<div class="user-page">
		<div class="bg-pattern"></div>
		<div class="bg-gradient"></div>

		<main class="user-content">
			<header class="header">
				<div class="unicode-line">
					<span>{UNICODE.diamond}</span>
					<span>{UNICODE.dots}</span>
					<span>{UNICODE.diamond}</span>
				</div>

				<h1 class="title font-display">
					<span class="year">{displayPeriod}</span>
					<span class="wrapped">Wrapped</span>
				</h1>

				<div class="time-selector-wrapper">
					<select bind:value={selectedTimeRange} class="time-select">
						{#each data.timeRangeOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					<div class="select-arrow">{UNICODE.triangleDown}</div>
				</div>

				<p class="subtitle">
					Enter your username to see your personal wrapped for this period
				</p>
			</header>

			<form class="login-form" on:submit|preventDefault={handleSubmit}>
				<div class="form-group">
					<label for="username" class="label">Your username</label>
					<div class="input-wrapper">
						<input
							type="text"
							id="username"
							bind:value={username}
							placeholder="username"
							autocomplete="username"
							autocapitalize="none"
							spellcheck="false"
							disabled={isLoading}
							class="input"
						/>
					</div>
				</div>

				{#if error}
					<p class="error">{UNICODE.sparkle} {error}</p>
				{/if}

				<button type="submit" class="submit-btn" disabled={isLoading}>
					{#if isLoading}
						<span class="loading-dots"
							><span>·</span><span>·</span><span>·</span></span
						>
					{:else}
						<span>Reveal Your Year</span>
						<span class="btn-icon">{UNICODE.arrow}</span>
					{/if}
				</button>
			</form>

		</main>
	</div>
{:else}
	<!-- Server Wrapped Cards -->
	<CardStack
		totalCards={visibleCards.length}
		on:cardChange={handleCardChange}
		let:currentIndex
	>
		<!-- Card 0: Intro -->
		{#if visibleCards[currentIndex] === 'intro'}
			<div class="card-base">
				<div class="card-content intro-card">
					<img
						src={embywrappedLogo}
						alt="Emby Wrapped logo"
						class="community-logo"
						class:show={introPhase >= 2}
					/>

					<div class="unicode-line" class:show={introPhase >= 1}>
						<span>{UNICODE.diamond}</span>
						<span>{UNICODE.dots}</span>
						<span>{UNICODE.diamond}</span>
					</div>

					<h1
						class="big-title font-display"
						class:show={introPhase >= 2}
					>
						<span class="year">{displayPeriod}</span>
						<span class="wrapped">Wrapped</span>
					</h1>

					<!-- Time Selector -->
					<div class="time-selector-wrapper" class:show={introPhase >= 2} on:click|stopPropagation>
						<select bind:value={selectedTimeRange} class="time-select">
							{#each data.timeRangeOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
						<div class="select-arrow">{UNICODE.triangleDown}</div>
					</div>

					<p class="server-name" class:show={introPhase >= 3}>
						<span class="accent">{UNICODE.triangleUp}</span>
						Emby for the People
						<span class="accent">{UNICODE.triangleDown}</span>
					</p>

					<p class="tap-hint" class:show={introPhase >= 4}>
						<span class="hint-icon">{UNICODE.triangleDown}</span>
						Tap to begin
					</p>
				</div>
			</div>
		{/if}

		<!-- Card 1: Total Time -->
		{#if visibleCards[currentIndex] === 'time' && serverStats}
			<div class="card-base">
				<div class="bg-glow time"></div>
				<div class="card-content time-card">
					<p class="card-label" class:show={timePhase >= 1}>
						<span class="unicode">{UNICODE.dots}</span>
						In {displayPeriod}, our community watched
					</p>

					<div class="giant-stat" class:show={timePhase >= 2}>
						<span class="stat-number font-display">
							{#if timePhase >= 2}
								<AnimatedNumber
									value={totalDays}
									duration={2000}
								/>
							{:else}
								0
							{/if}
						</span>
						<span class="stat-unit">DAYS</span>
					</div>

					<p class="stat-context" class:show={timePhase >= 2}>
						of content together
					</p>

					<div class="stat-breakdown" class:show={timePhase >= 3}>
						<div class="breakdown-item">
							<span class="break-value font-mono"
								>{totalHours.toLocaleString()}</span
							>
							<span class="break-label">hours</span>
						</div>
						<span class="break-divider">{UNICODE.separator}</span>
						<div class="breakdown-item">
							<span class="break-value font-mono"
								>{serverStats.totalMinutes.toLocaleString()}</span
							>
							<span class="break-label">minutes</span>
						</div>
					</div>

					<div class="users-badge" class:show={timePhase >= 4}>
						<span class="users-icon">{UNICODE.star}</span>
						<span class="users-count font-mono"
							>{serverStats.totalUsers}</span
						>
						<span class="users-label">users strong</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Card 2: Content Count -->
		{#if visibleCards[currentIndex] === 'content' && serverStats}
			<div class="card-base">
				<div class="card-content content-card">
					<p class="card-label" class:show={contentPhase >= 1}>
						<span class="unicode">{UNICODE.sparkle}</span>
						Together we watched
					</p>

					<div class="content-stats" class:show={contentPhase >= 2}>
						<div class="content-stat movies">
							<span class="content-number font-display">
								{#if contentPhase >= 2}
									<AnimatedNumber
										value={serverStats.totalMovies}
										duration={2000}
									/>
								{:else}
									0
								{/if}
							</span>
							<span class="content-type">movies</span>
						</div>

						<div class="content-plus">+</div>

						<div class="content-stat episodes">
							<span class="content-number font-display">
								{#if contentPhase >= 2}
									<AnimatedNumber
										value={serverStats.totalEpisodes}
										duration={2500}
									/>
								{:else}
									0
								{/if}
							</span>
							<span class="content-type">episodes</span>
						</div>
					</div>

					<div class="total-plays" class:show={contentPhase >= 3}>
						<span class="total-line"></span>
						<span class="total-text font-mono">
							{(
								serverStats.totalMovies +
								serverStats.totalEpisodes
							).toLocaleString()} total plays
						</span>
						<span class="total-line"></span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Card 3: Top 5 Shows -->
		{#if visibleCards[currentIndex] === 'top_shows' && serverStats}
			<Top5Card
				items={serverStats.topShows}
				title="Community's Top Shows"
				type="shows"
				totalCount={serverStats.totalEpisodes}
			/>
		{/if}

		<!-- Card 4: Top 5 Movies -->
		{#if visibleCards[currentIndex] === 'top_movies' && serverStats}
			<Top5Card
				items={serverStats.topMovies}
				title="Community's Top Movies"
				type="movies"
				totalCount={serverStats.totalMovies}
			/>
		{/if}

		<!-- Card 5: Seerr Requests -->
		{#if visibleCards[currentIndex] === 'seerr_requests' && serverStats?.seerrRequests?.totalRequests > 0}
			<SeerrRequestsCard
				displayPeriod={displayPeriod}
				seerrRequests={serverStats.seerrRequests}
			/>
		{/if}

		<!-- Card 6: Music Summary (if exists) -->
        {#if visibleCards[currentIndex] === 'music' && serverStats}
			<MusicSummaryCard music={serverStats.music} />
		{/if}

		<!-- Card 6: CTA -->
		{#if visibleCards[currentIndex] === 'cta'}
			<div class="card-base visible">
				<div class="bg-particles">
					{#each Array(6) as _, i}
						<div
							class="particle"
							style="--delay: {i * 1.5}s; --duration: {12 +
								i * 4}s; --x: {10 + i * 15}%; --y: {20 +
								i * 10}%"
						></div>
					{/each}
				</div>

				<div class="card-content cta-card">
					<div class="cta-icon" class:show={ctaPhase >= 1}>
						{UNICODE.star}
					</div>

					<h2
						class="cta-title font-display"
						class:show={ctaPhase >= 2}
					>
						Ready to see your story?
					</h2>

					<p class="cta-subtitle" class:show={ctaPhase >= 3}>
						Discover your personal {displayPeriod} wrapped
					</p>

					<button
						class="cta-btn"
						class:show={ctaPhase >= 4}
						on:click={openPersonalWrapped}
					>
						<span>See Your Wrapped</span>
						<span class="btn-icon">{UNICODE.arrow}</span>
					</button>
				</div>
			</div>
		{/if}

		<ProgressDots
			total={visibleCards.length}
			current={currentCardIndex}
			slot="progress"
			let:goToCard
			onSelect={goToCard}
		/>
	</CardStack>
{/if}

<style>
	/* User Page */
	.user-page {
		position: relative;
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.bg-pattern {
		position: absolute;
		inset: 0;
		background-image: radial-gradient(
				circle at 20% 80%,
				rgba(124, 58, 237, 0.1) 0%,
				transparent 50%
			),
			radial-gradient(
				circle at 80% 20%,
				rgba(59, 130, 246, 0.1) 0%,
				transparent 50%
			);
		pointer-events: none;
	}

	.bg-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(10, 10, 10, 0.8) 100%
		);
		pointer-events: none;
	}

	.user-content {
		position: relative;
		z-index: 1;
		max-width: 420px;
		width: 100%;
		text-align: center;
	}

	/* Shared styles */
	.card-base {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		overflow: hidden;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		text-align: center;
		max-width: 400px;
		width: 100%;
		position: relative;
		z-index: 10;
	}

	.bg-glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.bg-glow.time {
		background: radial-gradient(
			ellipse at center,
			rgba(29, 185, 84, 0.12) 0%,
			transparent 60%
		);
	}

	/* Particles */
	.bg-particles {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
	}

	.particle {
		position: absolute;
		width: 150px;
		height: 150px;
		background: radial-gradient(
			circle,
			rgba(124, 58, 237, 0.2) 0%,
			transparent 70%
		);
		border-radius: 50%;
		top: var(--y);
		left: var(--x);
		animation: float var(--duration) ease-in-out infinite alternate;
		animation-delay: var(--delay);
		opacity: 0.6;
	}

	@keyframes float {
		0% {
			transform: translate(0, 0) scale(1);
		}
		100% {
			transform: translate(30px, -30px) scale(1.1);
		}
	}

	/* Animations */
	.unicode-line,
	.community-logo,
	.big-title,
	.server-name,
	.tap-hint,
	.card-label,
	.giant-stat,
	.stat-context,
	.stat-breakdown,
	.users-badge,
	.content-stats,
	.total-plays,
	.cta-icon,
	.cta-title,
	.cta-subtitle,
	.cta-btn {
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.unicode-line.show,
	.community-logo.show,
	.big-title.show,
	.server-name.show,
	.tap-hint.show,
	.card-label.show,
	.giant-stat.show,
	.stat-context.show,
	.stat-breakdown.show,
	.users-badge.show,
	.content-stats.show,
	.total-plays.show,
	.cta-icon.show,
	.cta-title.show,
	.cta-subtitle.show,
	.cta-btn.show {
		opacity: 1;
		transform: translateY(0);
	}

	/* Time Selector Alignment for Intro Card */
	.intro-card .time-selector-wrapper {
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
		margin-top: -0.5rem; /* Pull up closer to title */
	}

	.intro-card .time-selector-wrapper.show {
		opacity: 1;
		transform: translateY(0);
	}

	/* Intro card */
	.unicode-line {
		display: flex;
		gap: 1.5rem;
		font-family: "JetBrains Mono", monospace;
		font-size: 1.25rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.big-title {
		font-size: clamp(3.5rem, 15vw, 6rem);
		font-weight: 700;
		line-height: 1;
		margin: 0;
	}

	.community-logo {
		width: min(280px, 70vw);
		height: auto;
		margin-top: 0.5rem;
		margin-bottom: -0.5rem;
	}

	.big-title .year {
		display: block;
		background: linear-gradient(
			135deg,
			#1db954 0%,
			#3b82f6 50%,
			#7c3aed 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.big-title .wrapped {
		display: block;
		font-size: 0.4em;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}

	.server-name {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.accent {
		margin: 0 0.5rem;
		font-family: "JetBrains Mono", monospace;
		opacity: 0.5;
	}

	.tap-hint {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.3);
		margin-top: 2rem;
	}

	.hint-icon {
		font-family: "JetBrains Mono", monospace;
		animation: bounce 2s ease-in-out infinite;
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(8px);
		}
	}

	/* Time card */
	.card-label {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.6);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.unicode {
		font-family: "JetBrains Mono", monospace;
		color: #1db954;
	}

	.giant-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-number {
		font-size: clamp(5rem, 20vw, 10rem);
		font-weight: 700;
		background: linear-gradient(135deg, #1db954 0%, #22d3ee 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		line-height: 1;
	}

	.stat-unit {
		font-size: 1.5rem;
		color: rgba(255, 255, 255, 0.5);
		letter-spacing: 0.3em;
	}

	.stat-context {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.stat-breakdown {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1rem 2rem;
		background: rgba(20, 20, 20, 0.6);
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.breakdown-item {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.break-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: white;
	}

	.break-label {
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
	}

	.break-divider {
		font-family: "JetBrains Mono", monospace;
		color: rgba(255, 255, 255, 0.2);
		font-size: 1.5rem;
	}

	.users-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: rgba(124, 58, 237, 0.15);
		border-radius: 20px;
		border: 1px solid rgba(124, 58, 237, 0.25);
	}

	.users-icon {
		font-family: "JetBrains Mono", monospace;
		color: #7c3aed;
	}

	.users-count {
		font-size: 1.25rem;
		font-weight: 700;
		color: white;
	}

	.users-label {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}

	/* Content card */
	.content-stats {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.content-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.content-number {
		font-size: clamp(2.5rem, 10vw, 4rem);
		font-weight: 700;
		line-height: 1;
	}

	.content-stat.movies .content-number {
		color: #f97316;
	}
	.content-stat.episodes .content-number {
		color: #22d3ee;
	}

	.content-plus {
		font-size: 2rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.total-plays {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
	}

	.total-line {
		flex: 1;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.15),
			transparent
		);
	}

	.total-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		white-space: nowrap;
	}

	/* Top 5 card */
	.title-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.section-title {
		font-size: clamp(1.25rem, 5vw, 1.75rem);
		font-weight: 700;
		color: white;
		margin: 0;
	}

	.poster-row {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.poster-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
	}

	.size-large .poster-fallback {
		width: 110px;
	}
	.size-medium .poster-fallback {
		width: 85px;
	}
	.size-small .poster-fallback {
		width: 70px;
	}

	.rank-badge {
		position: absolute;
		top: -6px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		background: linear-gradient(135deg, #1db954 0%, #3b82f6 100%);
		color: white;
		font-family: "JetBrains Mono", monospace;
		font-size: 0.5rem;
		font-weight: 700;
		padding: 0.15rem 0.4rem;
		border-radius: 8px;
	}

	.rank-badge.movie {
		background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
	}

	.poster-fallback {
		aspect-ratio: 2/3;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
	}

	.poster-fallback.movie {
		border: 1px solid rgba(249, 115, 22, 0.3);
	}

	.fallback-letter {
		font-size: 1.75rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.25);
		font-family: "Space Grotesk", sans-serif;
	}

	.item-name {
		font-size: 0.5rem;
		font-weight: 600;
		color: white;
		margin: 0.4rem 0 0 0;
		text-align: center;
		max-width: 100%;
		line-height: 1.2;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.item-time {
		font-size: 0.4rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0.1rem 0 0 0;
	}

	/* CTA Card */
	.cta-card {
		justify-content: center;
	}

	.cta-icon {
		font-size: 1.5rem;
		color: #1db954;
		margin-bottom: 1rem;
	}

	.cta-title {
		font-size: clamp(2.5rem, 8vw, 4rem);
		font-weight: 800;
		line-height: 0.95;
		margin: 0;
		background: linear-gradient(
			135deg,
			white 0%,
			rgba(255, 255, 255, 0.7) 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.cta-subtitle {
		font-size: 1.25rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 300;
	}

	.cta-btn {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem 2.5rem;
		background: white;
		color: black;
		border: none;
		border-radius: 100px;
		font-size: 1.125rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		margin-top: 2rem;
		box-shadow: 0 10px 30px rgba(255, 255, 255, 0.15);
	}

	.cta-btn:hover {
		transform: translateY(-2px) scale(1.02);
		box-shadow: 0 20px 40px rgba(255, 255, 255, 0.25);
		background: #1db954;
		color: white;
	}

	.btn-icon {
		font-family: "JetBrains Mono", monospace;
	}

	/* User form */
	.header {
		margin-bottom: 2rem;
	}

	.title {
		font-size: clamp(2.5rem, 10vw, 4rem);
		font-weight: 700;
		line-height: 1;
		margin: 0;
	}

	.title .year {
		display: block;
		background: linear-gradient(
			135deg,
			#1db954 0%,
			#3b82f6 50%,
			#7c3aed 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.title .wrapped {
		display: block;
		font-size: 0.5em;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		letter-spacing: 0.15em;
		text-transform: uppercase;
		margin-top: 0.25em;
	}

	.subtitle {
		margin-top: 1rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.login-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		text-align: left;
	}

	.label {
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 0.5rem;
	}

	.input {
		width: 100%;
		padding: 1rem 1.25rem;
		font-size: 1.125rem;
		font-family: inherit;
		background: rgba(20, 20, 20, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: white;
		transition: all 0.2s ease;
	}

	.input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}
	.input:focus {
		outline: none;
		border-color: rgba(29, 185, 84, 0.5);
		box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.1);
	}

	.error {
		color: #f87171;
		font-size: 0.875rem;
		margin: 0;
		text-align: left;
	}

	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		padding: 1rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		font-family: inherit;
		background: linear-gradient(135deg, #1db954 0%, #1ed760 100%);
		border: none;
		border-radius: 12px;
		color: #0a0a0a;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(29, 185, 84, 0.3);
	}

	.submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.loading-dots {
		display: flex;
		gap: 0.25rem;
	}
	.loading-dots span {
		animation: pulse 1s ease-in-out infinite;
	}
	.loading-dots span:nth-child(2) {
		animation-delay: 0.2s;
	}
	.loading-dots span:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}

	.back-btn {
		margin-top: 2rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-family: inherit;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.back-btn:hover {
		background: rgba(255, 255, 255, 0.05);
		color: white;
	}

	/* Time Selector */
	.time-selector-wrapper {
		margin-top: 1rem;
		position: relative;
		display: inline-flex;
		align-items: center;
		pointer-events: auto;
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


</style>
