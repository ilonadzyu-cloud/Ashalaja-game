v0.9.5o
- Fixed a self-triggering MutationObserver loop that could freeze Safari/WebKit as soon as the game stage rendered.
- Stage preload still waits for art, but no longer observes its own temporary class changes.
- General runtime observer no longer watches class mutations, preventing observer feedback between visual patches.
- Cat chapter-3 patch is loaded again, but its five cat arts are no longer preloaded on the start screen.
- Startup local-save workaround from v0.9.5n is preserved.
