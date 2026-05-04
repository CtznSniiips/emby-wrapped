<script lang="ts">
	import "../app.css";
	import AudioPlayer from "$lib/components/ui/AudioPlayer.svelte";
	import { navigating } from "$app/stores";

	export let data;
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
	<div class="nav-loading" aria-live="polite" aria-label="Loading your wrapped…">
		<div class="nav-loading-inner">
			<div class="nav-spinner"></div>
			<p class="nav-loading-text">Loading your wrapped…</p>
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

	.nav-loading {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(10, 10, 10, 0.85);
		backdrop-filter: blur(12px);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fade-in 0.2s ease;
	}

	.nav-loading-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
	}

	.nav-spinner {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-top-color: #1db954;
		animation: spin 0.8s linear infinite;
	}

	.nav-loading-text {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.5);
		letter-spacing: 0.05em;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}
</style>
