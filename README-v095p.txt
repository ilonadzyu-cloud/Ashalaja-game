v0.9.5p
- HOTFIX ONLY: no story, choices, flags, cat scene, battles, items or dialogue were rewritten.
- Removed live MutationObserver loops from visual/UI patch layers during gameplay startup.
- Disabled the stage preload/synchronization watcher that ran exactly when gameScreen first rendered.
- Kept one-shot visual setup and static scene patches.
- Shop/garlic refresh now uses lightweight click-driven refresh instead of observing the whole DOM.
