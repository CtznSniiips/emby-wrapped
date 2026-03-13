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
            // Capture with html2canvas
            const canvas = await html2canvas(element, {
                backgroundColor: "#0a0a0a",
                scale: 2,
                useCORS: true,
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById(targetId);
                    if (!clonedElement) return;

                    clonedElement.classList.add('snapshot-mode');
                    clonedElement.style.opacity = '1';
                    clonedElement.style.transform = 'none';

                    // Universal gradient text fix
                    // html2canvas doesn't support -webkit-background-clip:text so we
                    // walk every element and replace transparent text-fill with solid colors
                    clonedElement.querySelectorAll('*').forEach((el) => {
                        const style = window.getComputedStyle(el);
                        const fill = style.getPropertyValue('-webkit-text-fill-color');
                        const clip = style.getPropertyValue('-webkit-background-clip');

                        if (fill === 'transparent' || clip === 'text') {
                            const htmlEl = el as HTMLElement;
                            // Grab the gradient to pick a representative solid color,
                            // or just fall back to white which reads fine on dark backgrounds
                            const bg = style.backgroundImage;
                            let color = '#ffffff';
                            // Pull the first color stop from the gradient if possible
                            const match = bg.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/i);
                            if (match) color = match[0];

                            htmlEl.style.setProperty('-webkit-text-fill-color', color, 'important');
                            htmlEl.style.setProperty('background', 'none', 'important');
                            htmlEl.style.setProperty('background-image', 'none', 'important');
                            htmlEl.style.setProperty('-webkit-background-clip', 'unset', 'important');
                            htmlEl.style.setProperty('background-clip', 'unset', 'important');
                            htmlEl.style.setProperty('color', color, 'important');
                        }
                    });

                    // IntroCard layout — reset animated absolute positioning
                    // so year + profile don't overlap
                    const yearLockup = clonedElement.querySelector('.year-lockup') as HTMLElement;
                    if (yearLockup) {
                        yearLockup.style.position = 'relative';
                        yearLockup.style.top = 'auto';
                        yearLockup.style.left = 'auto';
                        yearLockup.style.transform = 'none';
                        yearLockup.style.opacity = '1';
                    }
                    const bridgeText = clonedElement.querySelector('.bridge-text') as HTMLElement;
                    if (bridgeText) bridgeText.style.display = 'none';

                    // GenreCard conic-gradient — replace with SVG ring
                    const heroRing = clonedElement.querySelector('.hero-ring') as HTMLElement;
                    if (heroRing) {
                        const percent = parseFloat(heroRing.style.getPropertyValue('--percent') || '0');
                        const color = heroRing.style.getPropertyValue('--color') || '#1db954';
                        const r = 54;
                        const cx = 60;
                        const cy = 60;
                        const circumference = 2 * Math.PI * r;
                        const filled = (percent / 100) * circumference;

                        heroRing.style.background = 'none';
                        heroRing.style.position = 'relative';
                        heroRing.innerHTML = `
                            <svg width="120" height="120" style="position:absolute;top:0;left:0;transform:rotate(-90deg)">
                                <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                                    stroke="rgba(255,255,255,0.1)" stroke-width="12"/>
                                <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                                    stroke="${color}" stroke-width="12"
                                    stroke-dasharray="${filled} ${circumference}"
                                    stroke-linecap="round"/>
                            </svg>
                            <div style="position:relative;z-index:1;width:90px;height:90px;border-radius:50%;
                                        background:#0a0a0a;display:flex;align-items:center;justify-content:center;">
                                <span style="font-family:monospace;font-size:1.25rem;font-weight:700;color:white;">
                                    ${Math.round(percent)}%
                                </span>
                            </div>`;
                    }

                    // Make all animated elements visible regardless of phase
                    clonedElement.querySelectorAll('[class]').forEach((el) => {
                        const htmlEl = el as HTMLElement;
                        const computedOpacity = window.getComputedStyle(htmlEl).opacity;
                        if (computedOpacity === '0') {
                            htmlEl.style.opacity = '1';
                            htmlEl.style.transform = 'none';
                        }
                    });
                },
            });

            const image = canvas.toDataURL("image/png");

            // Try to share, otherwise download
            if (navigator.share) {
                const blob = await (await fetch(image)).blob();
                const file = new File([blob], fileName, { type: "image/png" });

                if (
                    navigator.canShare &&
                    navigator.canShare({ files: [file] })
                ) {
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
            // Fallback: just download
            try {
                const canvas = await html2canvas(element, {
                    backgroundColor: "#0a0a0a",
                    scale: 2,
                    useCORS: true,
                    logging: false,
                });
                downloadImage(canvas.toDataURL("image/png"));
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

    /* Mobile: keep the label visible, just make button slightly more compact */
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
