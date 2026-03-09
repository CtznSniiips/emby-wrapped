<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import CardStack from "$lib/components/CardStack.svelte";
	import AudioPlayer from "$lib/components/ui/AudioPlayer.svelte";
	import IntroCard from "$lib/components/cards/IntroCard.svelte";
	import TotalTimeCard from "$lib/components/cards/TotalTimeCard.svelte";
	import StreakCard from "$lib/components/cards/StreakCard.svelte";
	import TopContentCard from "$lib/components/cards/TopContentCard.svelte";
	import GenreCard from "$lib/components/cards/GenreCard.svelte";
	import Top5Card from "$lib/components/cards/Top5Card.svelte";
	import WatchingClockCard from "$lib/components/cards/WatchingClockCard.svelte";
	import DayOfWeekCard from "$lib/components/cards/DayOfWeekCard.svelte";
	import MonthlyJourneyCard from "$lib/components/cards/MonthlyJourneyCard.svelte";
	import BingeCard from "$lib/components/cards/BingeCard.svelte";
	import FirstLastWatchCard from "$lib/components/cards/FirstLastWatchCard.svelte";
	import FinaleCard from "$lib/components/cards/FinaleCard.svelte";
	import PersonalityCard from "$lib/components/cards/PersonalityCard.svelte";
	import SeriesCompletionCard from "$lib/components/cards/SeriesCompletionCard.svelte";
	import MusicSummaryCard from "$lib/components/cards/MusicSummaryCard.svelte";
	import type { PageData } from "./$types";

	export let data: PageData;

	$: ({ stats, userImageUrl, serverName, currentTimeRange, timeRangeOptions } = data);

	function handleTimeRangeChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const newPeriod = select.value;
		goto(`?period=${newPeriod}`, { replaceState: true });
	}

	// Build card sequence based on available data
	interface Card {
		type: string;
		component: any;
		props: Record<string, any>;
	}

	let cards: Card[] = [];

	$: {
		cards = [];

		// 1. Always show intro
		cards.push({
			type: "intro",
			component: IntroCard,
			props: { 
				stats, 
				serverName, 
				userImageUrl,
				timeRangeOptions,
				currentTimeRange
			},
		});

		// 2. Total time
        if (stats.totalMinutes > 0) {
            cards.push({
                type: "total_time",
                component: TotalTimeCard,
                props: { stats },
            });
        }

		// 3. Streak card
		if (stats.longestStreak > 0) {
			cards.push({
				type: "streak",
				component: StreakCard,
				props: { stats },
			});
		}

		// 4. Top show (if exists)
		if (stats.topShows.length > 0) {
			cards.push({
				type: "top_show",
				component: TopContentCard,
				props: { topItem: stats.topShows[0], type: "show", rank: 1 },
			});
		}

		// 5. Top movie (if exists)
		if (stats.topMovies.length > 0) {
			cards.push({
				type: "top_movie",
				component: TopContentCard,
				props: { topItem: stats.topMovies[0], type: "movie", rank: 1 },
			});
		}

		// 6. Genre breakdown (if we have genres)
		if (stats.topGenres.length > 0) {
			cards.push({
				type: "genres",
				component: GenreCard,
				props: { genres: stats.topGenres },
			});
		}

		// 6. Top 5 shows (if we have enough) - pass actual count
		if (stats.topShows.length >= 3) {
			cards.push({
				type: "top5_shows",
				component: Top5Card,
				props: {
					items: stats.topShows,
					title: "Your Top Shows",
					type: "shows",
					totalCount: stats.uniqueShows, // Actual unique show count
				},
			});
		}

		// 7. Top 5 movies (if we have enough) - pass actual count
		if (stats.topMovies.length >= 3) {
			cards.push({
				type: "top5_movies",
				component: Top5Card,
				props: {
					items: stats.topMovies,
					title: "Your Top Movies",
					type: "movies",
					totalCount: stats.uniqueMovies, // Actual unique movie count
				},
			});
		}

		// 8. Watching clock (hourly patterns)
		if (stats.totalMinutes > 0) {
			cards.push({
				type: "clock",
				component: WatchingClockCard,
				props: { stats },
			});
		}

		// 9. Viewing Personality - NEW!
        if (stats.totalMinutes > 0) {
            cards.push({
                type: "personality",
                component: PersonalityCard,
                props: { stats },
            });
        }

		// 10. Series completion insights
		if (stats.seriesCompletion.length > 0) {
			cards.push({
				type: "series_completion",
				component: SeriesCompletionCard,
				props: { seriesCompletion: stats.seriesCompletion },
			});
		}

		// 10. Day of week patterns
		if (stats.heatmap.days.some((d) => d > 0)) {
			cards.push({
				type: "day_of_week",
				component: DayOfWeekCard,
				props: { stats },
			});
		}

		// 11. Monthly journey
		if (stats.heatmap.months.some((m) => m > 0)) {
			cards.push({
				type: "monthly",
				component: MonthlyJourneyCard,
				props: { stats },
			});
		}

		// 11. Binge card (if we have a binge session) - moved before journey
		if (stats.longestBinge) {
			cards.push({
				type: "binge",
				component: BingeCard,
				props: {
					binge: stats.longestBinge,
					totalBinges: stats.bingeCount,
				},
			});
		}

		// 12. First & Last watch (journey card) - NOW NEAR THE END
		if (stats.firstWatch && stats.lastWatch) {
			cards.push({
				type: "first_last",
				component: FirstLastWatchCard,
				props: { stats },
			});
		}

		// 13. Music summary (if we have music data)
		if (stats.music && stats.music.totalMinutes > 0) {
			cards.push({
				type: "music",
				component: MusicSummaryCard,
				props: { music: stats.music },
			});
		}

		// 14. Always end with finale
		cards.push({
			type: "finale",
			component: FinaleCard,
			props: { stats },
		});
	}
</script>

<svelte:head>
	<title>{stats.username}'s {stats.timeRangeLabel} Wrapped ◈ Emby for the People</title>
	<meta
		name="description"
		content="{stats.username} watched {Math.round(
			stats.totalMinutes / 60,
		)} hours on Emby for the People in {stats.timeRangeLabel}."
	/>
</svelte:head>

<!-- Time Range Selector - Moved to IntroCard -->
<!-- <div class="time-range-selector">
	<select value={currentTimeRange} on:change={handleTimeRangeChange}>
		{#each timeRangeOptions as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</div> -->

<CardStack totalCards={cards.length} let:cardIndex let:isActive>
	{#if isActive}
		<svelte:component
			this={cards[cardIndex].component}
			{...cards[cardIndex].props}
		/>
	{/if}
</CardStack>

<style>
	:global(body) {
		overflow: hidden;
	}

	.time-range-selector {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 100;
	}

	.time-range-selector select {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		cursor: pointer;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition: all 0.2s ease;
	}

	.time-range-selector select:hover {
		background: rgba(0, 0, 0, 0.8);
		border-color: rgba(255, 255, 255, 0.4);
	}

	.time-range-selector select:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.6);
	}

	.time-range-selector select option {
		background: #1a1a2e;
		color: white;
	}
</style>
