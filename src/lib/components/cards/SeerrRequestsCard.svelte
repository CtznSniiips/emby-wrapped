<script lang="ts">
	import AnimatedNumber from '$lib/components/ui/AnimatedNumber.svelte';
	import { UNICODE } from '$lib/utils/format';
	import SeerrLogo from '$lib/assets/seerr-logo.svg';

	export let displayPeriod: string;
	export let seerrRequests: {
		totalRequests: number;
		movieRequests: number;
		seriesRequests: number;
		requestsByUser: Array<{ name: string; count: number; movieRequests: number; seriesRequests: number }>;
	};
</script>

<div class="card-base">
	<div class="card-content seerr-card">
		<img src={SeerrLogo} alt="Seerr logo" class="seerr-logo" />

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

		<p class="request-type-breakdown">
			Movies: <span class="font-mono">{seerrRequests.movieRequests}</span>
			&middot;
			Series: <span class="font-mono">{seerrRequests.seriesRequests}</span>
		</p>

		<p class="seerr-breakdown-title">User breakdown</p>
		<div class="seerr-breakdown">
			{#each seerrRequests.requestsByUser as userReq}
				<div class="seerr-user-row">
					<p class="seerr-row">
						<span>{userReq.name}</span>
						<span class="font-mono">{userReq.count} request{userReq.count === 1 ? '' : 's'}</span>
					</p>
					<p class="seerr-row-subtext">
						Movies: <span class="font-mono">{userReq.movieRequests}</span>
						&middot;
						Series: <span class="font-mono">{userReq.seriesRequests}</span>
					</p>
				</div>
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

	.seerr-logo {
		width: 120px;
		height: auto;
		opacity: 0.95;
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

	.request-type-breakdown {
		margin: 0.25rem 0 0;
		font-size: 0.9rem;
		opacity: 0.9;
	}

	.seerr-card {
		max-width: 520px;
		width: 100%;
		gap: 1rem;
	}

	.seerr-breakdown-title {
		font-size: 0.95rem;
		opacity: 0.85;
		margin-top: 0.25rem;
	}

	.seerr-breakdown {
		width: 100%;
		max-width: 420px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		padding: 0.8rem 1rem;
	}

	.seerr-user-row {
		padding: 0.3rem 0;
	}

	.seerr-user-row + .seerr-user-row {
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.seerr-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin: 0.1rem 0;
		font-size: 0.95rem;
	}

	.seerr-row-subtext {
		margin: 0;
		text-align: left;
		font-size: 0.82rem;
		opacity: 0.8;
	}
</style>
