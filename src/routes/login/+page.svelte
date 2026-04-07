<script lang="ts">
    import { goto } from '$app/navigation';
    import EmbyWrappedLogo from '$lib/assets/embywrapped-logo.png';
    import { UNICODE } from '$lib/utils/format';
    import type { PageData } from './$types';

    export let data: PageData;

    let username = '';
    let password = '';
    let isLoading = false;
    let error = '';

    async function handleSubmit(event: Event) {
        event.preventDefault();

        if (!username.trim() || !password) {
            error = 'Please enter your username and password';
            return;
        }

        isLoading = true;
        error = '';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password })
            });
            const payload = await response.json();

            if (response.ok && payload.valid) {
                const query = new URLSearchParams();
                if (data.prefilledPeriod) query.set('period', data.prefilledPeriod);
                await goto(`/${query.toString() ? `?${query.toString()}` : ''}`, { invalidateAll: true });
                return;
            }

            error = payload.error || 'Invalid username or password';
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
            <img src={EmbyWrappedLogo} alt="EmbyWrapped logo" class="logo" />

            <div class="unicode-line">
                <span>{UNICODE.diamond}</span>
                <span>{UNICODE.dots}</span>
                <span>{UNICODE.diamond}</span>
            </div>

            <h1 class="title font-display">
                Sign in to EmbyWrapped
            </h1>

            <p class="subtitle">
                Log in with your Emby username and password to continue
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

            <div class="form-group">
                <label for="password" class="label">Your password</label>
                <div class="input-wrapper">
                    <input
                        type="password"
                        id="password"
                        bind:value={password}
                        placeholder="password"
                        autocomplete="current-password"
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
                    <span>Let's go</span>
                    <span class="btn-icon">{UNICODE.arrow}</span>
                {/if}
            </button>
        </form>
    </main>
</div>

<style>
    :global(body) {
        overflow-y: auto;
        overflow-x: hidden;
    }

    .user-page {
        position: relative;
        min-height: 100vh;
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    }

    @media (max-height: 760px) {
        .user-page {
            align-items: flex-start;
        }
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

    .logo {
        display: block;
        width: min(220px, 60vw);
        height: auto;
        margin: 0 auto 1rem;
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
