<script lang="ts">
    import { goto } from '$app/navigation';
    import { UNICODE } from '$lib/utils/format';
    import type { PageData } from './$types';

    export let data: PageData;

    let username = '';
    let isLoading = false;
    let error = '';
    let selectedTimeRange = '';

    $: if (data.timeRangeOptions?.length > 0 && !selectedTimeRange) {
        const hasPrefilledPeriod = data.prefilledPeriod
            ? data.timeRangeOptions.some((option) => option.value === data.prefilledPeriod)
            : false;

        selectedTimeRange = hasPrefilledPeriod
            ? data.prefilledPeriod
            : data.timeRangeOptions[0].value;
    }

    async function handleSubmit(event: Event) {
        event.preventDefault();

        if (!username.trim()) {
            error = 'Please enter your username';
            return;
        }

        isLoading = true;
        error = '';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim() })
            });
            const payload = await response.json();

            if (response.ok && payload.valid) {
                const query = new URLSearchParams();
                if (selectedTimeRange) query.set('period', selectedTimeRange);
                await goto(`/${query.toString() ? `?${query.toString()}` : ''}`);
                return;
            }

            error = payload.error || 'User not found on this server';
        } catch {
            error = 'Failed to connect to server';
        } finally {
            isLoading = false;
        }
    }
</script>

<svelte:head>
    <title>Login · Emby for the People</title>
</svelte:head>

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
                Sign in to Wrapped
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
                Log in with your Emby username to continue to the community stats flow.
            </p>
        </header>

        <form class="login-form" on:submit={handleSubmit}>
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
                    <span class="loading-dots"><span>·</span><span>·</span><span>·</span></span>
                {:else}
                    <span>Continue to community wrapped</span>
                    <span class="btn-icon">{UNICODE.arrow}</span>
                {/if}
            </button>
        </form>
    </main>
</div>

<style>
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
        background-image: radial-gradient(circle at 20% 80%, rgba(124, 58, 237, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);
        pointer-events: none;
    }

    .bg-gradient {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 0%, rgba(10, 10, 10, 0.8) 100%);
        pointer-events: none;
    }

    .user-content {
        position: relative;
        z-index: 1;
        max-width: 420px;
        width: 100%;
        text-align: center;
    }

    .header {
        margin-bottom: 2rem;
    }

    .unicode-line {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        color: var(--color-accent);
        margin-bottom: 1rem;
    }

    .title {
        font-size: clamp(2rem, 7vw, 2.6rem);
        margin-bottom: 1rem;
    }

    .subtitle {
        color: var(--color-text-secondary);
        margin-top: 1rem;
    }

    .time-selector-wrapper {
        position: relative;
        width: fit-content;
        margin: 0 auto;
    }

    .time-select {
        appearance: none;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: var(--color-text-primary);
        border-radius: 999px;
        padding: 0.5rem 2rem 0.5rem 1rem;
    }

    .select-arrow {
        position: absolute;
        right: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
    }

    .login-form {
        background: rgba(18, 18, 18, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        padding: 1.5rem;
        text-align: left;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .label {
        display: block;
        margin-bottom: 0.5rem;
        color: var(--color-text-secondary);
    }

    .input {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.03);
        color: var(--color-text-primary);
        padding: 0.75rem 0.9rem;
    }

    .error {
        color: #ff8c8c;
        margin-bottom: 1rem;
    }

    .submit-btn {
        width: 100%;
        border-radius: 999px;
        border: 0;
        padding: 0.8rem 1rem;
        background: linear-gradient(135deg, #7c3aed, #3b82f6);
        color: white;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }

    .submit-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
</style>
