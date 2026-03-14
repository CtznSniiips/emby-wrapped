<script lang="ts">
    import html2canvas from "html2canvas";
    import { UNICODE } from "$lib/utils/format";

    export let targetId: string;
    export let fileName: string = "emby-wrapped.png";
    export let label: string = "Share";

    let isGenerating = false;

    async function captureAndShare() {
        const element = document.getElementById(targetId);
        if (!element || isGenerating) return;

        isGenerating = true;

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: "#0a0a0a",
                scale: 2,
                // allowTaint WITHOUT useCORS: images are served via same-origin /api/proxy-image,
                // so the canvas is never actually tainted. useCORS:true forces html2canvas to
                // re-fetch images with crossOrigin:anonymous which drops auth cookies → 401.
                allowTaint: true,
                logging: false,
                onclone: (clonedDoc) => {
                    // html2canvas 1.4.1 only passes the cloned document as the argument.
                    const clonedEl = clonedDoc.getElementById(targetId);
                    if (!clonedEl) return;

                    // Apply snapshot-mode so per-card CSS overrides fire
                    clonedEl.classList.add("snapshot-mode");

                    // ── 1. Hide the share button ────────────────────────────
                    clonedEl.querySelectorAll<HTMLElement>(".share-container").forEach(
                        (e) => (e.style.display = "none")
                    );

                    // ── 2. Fix gradient text ────────────────────────────────
                    // html2canvas can't render -webkit-background-clip:text.
                    // Walk every element; if it uses the gradient-clip trick, replace
                    // -webkit-text-fill-color with a solid colour extracted from the gradient.
                    clonedEl.querySelectorAll<HTMLElement>("*").forEach((node) => {
                        const s = window.getComputedStyle(node);
                        if (
                            s.getPropertyValue("-webkit-text-fill-color") === "transparent" ||
                            s.getPropertyValue("-webkit-background-clip") === "text"
                        ) {
                            const m = s.backgroundImage.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/i);
                            const color = m ? m[0] : "#ffffff";
                            node.style.setProperty("-webkit-text-fill-color", color, "important");
                            node.style.setProperty("color", color, "important");
                            node.style.setProperty("background", "none", "important");
                            node.style.setProperty("background-image", "none", "important");
                            node.style.setProperty("-webkit-background-clip", "unset", "important");
                            node.style.setProperty("background-clip", "unset", "important");
                        }
                    });

                    // ── 3. Reveal all animated elements ────────────────────
                    // Each card hides sections with opacity:0 + transform + sometimes filter.
                    // getComputedStyle is unreliable on cloned-doc nodes (wrong window context),
                    // so we target every known animated class explicitly.
                    const show = [
                        // TotalTimeCard
                        ".lead", ".big-number", ".subtitle",
                        ".breakdown", ".comparison", ".content-counts",
                        // IntroCard
                        ".profile-section", ".footer-info",
                        // StreakCard
                        ".eyebrow", ".longest", ".current",
                        // PersonalityCard
                        ".icon-section", ".title-section", ".tagline-section", ".details-section",
                        // BingeCard
                        ".header", ".show-reveal", ".episode-reveal",
                        ".duration-section", ".datetime-section", ".total-section",
                        // TopContentCard
                        ".label-section", ".poster-section", ".title-section", ".stats-section",
                        // Top5Card
                        ".header-section", ".hero-item", ".grid-item", ".total-stats",
                        // DayOfWeekCard
                        ".chart-wrapper", ".personality-badge", ".title-section",
                        // MonthlyJourneyCard
                        ".chart-container", ".insight", ".peak-month",
                        // GenreCard
                        ".hero-genre", ".genre-row", ".personality",
                    ];
                    show.forEach((selector) => {
                        clonedEl.querySelectorAll<HTMLElement>(selector).forEach((node) => {
                            node.style.setProperty("opacity", "1", "important");
                            node.style.setProperty("transform", "none", "important");
                            node.style.setProperty("filter", "none", "important");
                            node.style.setProperty("visibility", "visible", "important");
                        });
                    });

                    // ── 4. IntroCard layout fix ─────────────────────────────
                    // .year-lockup is position:absolute and overlaps .profile-section.
                    // Convert .intro-container to a simple vertical stack.
                    const introContainer = clonedEl.querySelector<HTMLElement>(".intro-container");
                    if (introContainer) {
                        introContainer.style.setProperty("height", "auto", "important");
                        introContainer.style.setProperty("justify-content", "flex-start", "important");
                        introContainer.style.setProperty("padding-top", "3rem", "important");
                        introContainer.style.setProperty("gap", "2rem", "important");
                    }
                    const yearLockup = clonedEl.querySelector<HTMLElement>(".year-lockup");
                    if (yearLockup) {
                        yearLockup.style.setProperty("position", "relative", "important");
                        yearLockup.style.setProperty("top", "auto", "important");
                        yearLockup.style.setProperty("left", "auto", "important");
                        yearLockup.style.setProperty("transform", "none", "important");
                        yearLockup.style.setProperty("opacity", "1", "important");
                    }
                    const bridgeText = clonedEl.querySelector<HTMLElement>(".bridge-text");
                    if (bridgeText) bridgeText.style.setProperty("display", "none", "important");

                    // ── Hide UI chrome that has no place in a share image ──────────
                    [".time-selector-wrapper", ".scroll-indicator", ".select-arrow", ".ready-hint"]
                        .forEach(sel => clonedEl.querySelectorAll<HTMLElement>(sel)
                            .forEach(e => e.style.setProperty("display", "none", "important")));

                    // ── IntroCard: fix wrapped-year so it doesn't bleed into WRAPPED ──
                    const wrappedYear = clonedEl.querySelector<HTMLElement>(".wrapped-year");
                    if (wrappedYear) {
                        wrappedYear.style.setProperty("line-height", "1.2", "important");
                        wrappedYear.style.setProperty("margin-bottom", "0.5rem", "important");
                    }

                    // ── TotalTimeCard: fix .unit overlapping .number ─────────────────
                    // The root cause is line-height:1 on a large clamp() font. The visual
                    // glyph descends below the CSS line box. Bump line-height on .number
                    // and convert the flex column to block so each child stacks cleanly.
                    const bigNumber = clonedEl.querySelector<HTMLElement>(".big-number");
                    if (bigNumber) {
                        bigNumber.style.setProperty("display", "block", "important");
                        bigNumber.style.setProperty("text-align", "center", "important");
                    }
                    // .number is a <span> — make it block so it occupies its own line
                    clonedEl.querySelectorAll<HTMLElement>(".number").forEach(el => {
                        el.style.setProperty("display", "block", "important");
                        el.style.setProperty("line-height", "1.25", "important");
                    });
                    clonedEl.querySelectorAll<HTMLElement>(".unit").forEach(el => {
                        el.style.setProperty("display", "block", "important");
                        el.style.setProperty("margin-top", "0.5rem", "important");
                        el.style.setProperty("line-height", "1.5", "important");
                    });

                    // ── StreakCard: fix .value overlapping .range ────────────────────
                    // Same line-height:1 / large clamp() issue. The glyph visually exceeds
                    // the line box. Increase line-height and add margin below.
                    const streakValue = clonedEl.querySelector<HTMLElement>(".value");
                    if (streakValue) {
                        streakValue.style.setProperty("line-height", "1.3", "important");
                        streakValue.style.setProperty("margin-bottom", "1rem", "important");
                        streakValue.style.setProperty("display", "block", "important");
                    }
                    clonedEl.querySelectorAll<HTMLElement>(".range").forEach(el => {
                        el.style.setProperty("margin-top", "0.5rem", "important");
                        el.style.setProperty("display", "block", "important");
                    });

                    // ── BingeCard: fix episode-number bleeding into episode-label ────
                    // line-height:1 + gradient-clip creates an invisible overflow.
                    // Increase line-height so the line box matches the visual glyph height.
                    clonedEl.querySelectorAll<HTMLElement>(".episode-number").forEach(el => {
                        el.style.setProperty("line-height", "1.25", "important");
                        el.style.setProperty("display", "block", "important");
                    });
                    clonedEl.querySelectorAll<HTMLElement>(".episode-label").forEach(el => {
                        el.style.setProperty("margin-top", "0.75rem", "important");
                        el.style.setProperty("display", "block", "important");
                    });

                    // ── BingeCard badge: rebuild as flat element for html2canvas ─────
                    // inline-flex children can be mis-composited by html2canvas.
                    const badge = clonedEl.querySelector<HTMLElement>(".badge");
                    if (badge) {
                        const icon = badge.querySelector(".badge-icon")?.textContent ?? "✧";
                        const text = badge.querySelector(".badge-text")?.textContent ?? "BINGE MODE";
                        badge.innerHTML = "";
                        badge.style.cssText += ";display:flex!important;align-items:center!important;" +
                            "justify-content:center!important;background:#ef4444!important;" +
                            "background-image:none!important;padding:0.5rem 1.25rem!important;" +
                            "border-radius:20px!important;gap:0.5rem!important;";
                        const inner = clonedDoc.createElement("span");
                        inner.textContent = `${icon}  ${text}`;
                        inner.style.cssText = "color:#fff!important;-webkit-text-fill-color:#fff!important;" +
                            "font-family:ui-monospace,monospace;font-size:0.875rem;font-weight:700;" +
                            "letter-spacing:0.1em;line-height:1.5;";
                        badge.appendChild(inner);
                    }

                    // ── PersonalityCard: replace unicode glyph with SVG text ────────
                    // Every unicode glyph has different font metrics so CSS flex centering
                    // is never reliable. SVG <text dominant-baseline="central"> is
                    // mathematically exact regardless of which glyph is used.
                    const iconRing = clonedEl.querySelector<HTMLElement>(".icon-ring");
                    const mainIcon = clonedEl.querySelector<HTMLElement>(".main-icon");
                    if (iconRing && mainIcon) {
                        const glyph = mainIcon.textContent ?? "◈";
                        iconRing.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg"
                                 width="120" height="120" viewBox="0 0 120 120"
                                 style="display:block;overflow:visible">
                                <text
                                    x="60" y="60"
                                    text-anchor="middle"
                                    dominant-baseline="central"
                                    font-size="52"
                                    fill="white"
                                    font-family="ui-sans-serif,system-ui,sans-serif"
                                    filter="drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
                                >${glyph}</text>
                            </svg>`;
                    }

                    // ── 5. GenreCard: replace conic-gradient ring with SVG ──
                    // html2canvas doesn't support conic-gradient.
                    const heroRing = clonedEl.querySelector<HTMLElement>(".hero-ring");
                    if (heroRing) {
                        const percent = parseFloat(
                            heroRing.style.getPropertyValue("--percent") || "0"
                        );
                        const ringColor = heroRing.style.getPropertyValue("--color") || "#1db954";
                        const r = 54, cx = 60, cy = 60;
                        const circ = 2 * Math.PI * r;
                        const filled = (percent / 100) * circ;
                        heroRing.style.background = "none";
                        heroRing.style.position = "relative";
                        heroRing.innerHTML = `
                            <svg width="120" height="120"
                                 style="position:absolute;top:0;left:0;transform:rotate(-90deg)">
                                <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                                    stroke="rgba(255,255,255,0.1)" stroke-width="12"/>
                                <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                                    stroke="${ringColor}" stroke-width="12"
                                    stroke-dasharray="${filled} ${circ}"
                                    stroke-linecap="round"/>
                            </svg>
                            <div style="position:relative;z-index:1;width:90px;height:90px;
                                        border-radius:50%;background:#0a0a0a;
                                        display:flex;align-items:center;justify-content:center;">
                                <span style="font-family:monospace;font-size:1.25rem;
                                             font-weight:700;color:#fff;">
                                    ${Math.round(percent)}%
                                </span>
                            </div>`;
                    }
                },
            });

            const image = canvas.toDataURL("image/png");

            if (navigator.share) {
                const blob = await (await fetch(image)).blob();
                const file = new File([blob], fileName, { type: "image/png" });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: "My Emby Wrapped",
                        text: "Check out my year in Review!",
                    });
                } else {
                    downloadImage(image);
                }
            } else {
                downloadImage(image);
            }
        } catch (err) {
            console.error("Sharing failed:", err);
            try {
                const el = document.getElementById(targetId);
                if (el) {
                    const canvas = await html2canvas(el, {
                        backgroundColor: "#0a0a0a",
                        scale: 2,
                        allowTaint: true,
                        logging: false,
                    });
                    downloadImage(canvas.toDataURL("image/png"));
                }
            } catch {
                alert("Could not generate image. Please try again.");
            }
        } finally {
            isGenerating = false;
        }
    }

    function downloadImage(dataUrl: string) {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        link.click();
    }
</script>

<button
    class="share-btn"
    on:click|stopPropagation={captureAndShare}
    disabled={isGenerating}
    aria-label="Share this card"
>
    <span class="icon">{isGenerating ? UNICODE.dots : "↗"}</span>
    <span class="label">{isGenerating ? "..." : label}</span>
</button>

<style>
    .share-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background: rgba(20, 20, 20, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 0.625rem 1.25rem;
        border-radius: 999px;
        color: rgba(255, 255, 255, 0.85);
        font-family: inherit;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-height: 36px;
        min-width: 36px;
    }

    .share-btn:hover:not(:disabled) {
        background: rgba(29, 185, 84, 0.3);
        border-color: rgba(29, 185, 84, 0.5);
        color: white;
        transform: scale(1.05);
    }

    .share-btn:active:not(:disabled) {
        transform: scale(0.96);
    }

    .share-btn:disabled {
        opacity: 0.7;
        cursor: wait;
    }

    .icon {
        font-size: 1rem;
        line-height: 1;
        pointer-events: none;
    }

    .label {
        line-height: 1;
        pointer-events: none;
    }

    @media (max-width: 600px) {
        .share-btn {
            padding: 0.625rem 1rem;
            font-size: 0.75rem;
        }
        .label {
            display: none;
        }
    }
</style>
