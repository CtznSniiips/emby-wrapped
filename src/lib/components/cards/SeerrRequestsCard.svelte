<script lang="ts">
	import AnimatedNumber from '$lib/components/ui/AnimatedNumber.svelte';
	import { UNICODE } from '$lib/utils/format';

	export let displayPeriod: string;
	export let seerrRequests: {
		totalRequests: number;
		requestsByUser: Array<{ name: string; count: number }>;
	};
</script>

<div class="card-base">
	<div class="card-content seerr-card">
		<p class="card-label">
			<span class="unicode">{UNICODE.sparkle}</span>
			In {displayPeriod}, our community made
		</p>

		<div class="giant-stat">
			<span class="stat-number font-display">
				<AnimatedNumber value={seerrRequests.totalRequests} duration={2000} />
			</span>
			<span class="stat-unit">REQUESTS</span>
		</div>

		<p class="seerr-breakdown-title">User breakdown</p>
		<div class="seerr-breakdown">
			{#each seerrRequests.requestsByUser as userReq}
				<p class="seerr-row">
					<span>{userReq.name}</span>
					<span class="font-mono">{userReq.count} request{userReq.count === 1 ? '' : 's'}</span>
				</p>
			{/each}
		</div>
	</div>
</div>

<style>
	.card-base {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2rem;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		width: 100%;
	}

	.card-label {
		font-size: 1rem;
		opacity: 0.9;
		margin: 0;
	}

	.giant-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 0.75rem;
	}

	.stat-number {
		font-size: clamp(3rem, 11vw, 5rem);
		line-height: 0.95;
	}

	.stat-unit {
		letter-spacing: 0.12em;
		font-size: 0.8rem;
		opacity: 0.7;
	}

	.seerr-card {
		max-width: 520px;
		width: 100%;
		gap: 1rem;
	}

	.seerr-breakdown-title {
		font-size: 0.95rem;
		opacity: 0.85;
		margin-top: 0.5rem;
	}

	.seerr-breakdown {
		width: 100%;
		max-width: 420px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		padding: 0.8rem 1rem;
	}

	.seerr-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin: 0.35rem 0;
		font-size: 0.95rem;
	}
</style>
