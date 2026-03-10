<script lang="ts">
	import { onMount } from "svelte";
	import { UNICODE } from "$lib/utils/format";
	import type { DeviceClientStat } from "$lib/server/stats";
	import ShareButton from "../ui/ShareButton.svelte";

	export let deviceClientBreakdown: DeviceClientStat[];

	let visible = false;
	let phase = 0;

	onMount(() => {
		setTimeout(() => {
			visible = true;
			phase = 1;
		}, 100);

		deviceClientBreakdown.slice(0, 5).forEach((_, i) => {
			setTimeout(() => {
				phase = Math.max(phase, i + 2);
			}, 500 + i * 220);
		});
	});

	$: topDevice = deviceClientBreakdown[0];
	$: displayItems = deviceClientBreakdown.slice(0, 5);
</script>

<div class="card-base" class:visible id="device-client-card">
	<div class="share-container">
		<ShareButton targetId="device-client-card" fileName="emby-wrapped-device-client.png" />
	</div>

	<div class="card-content">
		<div class="title" class:show={phase >= 1}>
			<span class="unicode">{UNICODE.sparkle}</span>
			<h2 class="font-display">Where You Watched</h2>
		</div>

		{#if topDevice}
			<div class="hero" class:show={phase >= 2}>
				<p class="kicker">Top Device/Client</p>
				<h3 class="font-display">{topDevice.name}</h3>
				<p class="meta">{topDevice.percentage}% of your watch time</p>
			</div>
		{/if}

		<div class="list">
			{#each displayItems as item, i}
				<div class="row" class:show={phase >= i + 2}>
					<span class="name">{item.name}</span>
					<div class="bar-wrap">
						<div class="bar" style="width: {item.percentage}%"></div>
					</div>
					<span class="percent font-mono">{item.percentage}%</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.card-base { position: relative; width: 100%; min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 2rem 1.5rem; opacity: 0; transition: opacity 0.4s ease; }
	.card-base.visible { opacity: 1; }
	.share-container { position: absolute; top: 1.5rem; right: 1.5rem; z-index: 50; }
	:global(.snapshot-mode) .share-container { display:none !important; }
	.card-content { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 1.25rem; }
	.title { opacity: 0; transform: translateY(-12px); transition: all .4s ease; display:flex; align-items:center; gap:.5rem; }
	.title.show { opacity:1; transform:translateY(0); }
	.unicode { color:#22d3ee; }
	h2,h3,p { margin:0; color:white; }
	.kicker { color:#94a3b8; font-size:.8rem; text-transform:uppercase; letter-spacing:.08em; }
	.meta { color:#cbd5e1; font-size:.95rem; }
	.hero { opacity:0; transform:scale(.96); transition: all .45s ease; padding:1rem; border:1px solid rgba(148,163,184,.25); border-radius:.9rem; background:rgba(15,23,42,.4); }
	.hero.show { opacity:1; transform:scale(1); }
	.list { display:flex; flex-direction:column; gap:.6rem; }
	.row { opacity:0; transform: translateY(10px); transition: all .35s ease; display:grid; grid-template-columns: 1fr 1.5fr auto; gap:.55rem; align-items:center; }
	.row.show { opacity:1; transform:translateY(0); }
	.name,.percent { color:white; font-size:.9rem; }
	.bar-wrap { height:8px; border-radius:999px; background:rgba(100,116,139,.25); overflow:hidden; }
	.bar { height:100%; background: linear-gradient(90deg,#22d3ee,#3b82f6); border-radius:999px; }
</style>
