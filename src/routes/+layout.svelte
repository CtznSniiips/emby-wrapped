<script lang="ts">
	import "../app.css";
	import AudioPlayer from "$lib/components/ui/AudioPlayer.svelte";

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

<style>
	.app {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}
</style>
