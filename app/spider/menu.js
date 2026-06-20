/**
 * Windows XP Menu Bar Logic for Spider Solitaire
 * Ported and adapted from properties.js
 */
(function() {
    function initMenu() {
        const menu2Container = document.getElementById('menu2');
        if (!menu2Container) return;

        const menuItems = menu2Container.querySelectorAll('.menu-item');
        let isMenuActive = false;

        menuItems.forEach(menuItem => {
            menuItem.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                const wasActive = menuItem.classList.contains('active');

                // Deactivate all
                menuItems.forEach(item => item.classList.remove('active'));
                isMenuActive = false;

                // Toggle current if it wasn't active
                if (!wasActive) {
                    menuItem.classList.add('active');
                    isMenuActive = true;
                }
            });

            menuItem.addEventListener('mouseenter', () => {
                if (isMenuActive) {
                    menuItems.forEach(item => item.classList.remove('active'));
                    menuItem.classList.add('active');
                }
            });
        });

        // Close menu when clicking outside
        document.addEventListener('mousedown', () => {
            menuItems.forEach(item => item.classList.remove('active'));
            isMenuActive = false;
        });

        // Signal the parent system to close this app window
        const closeItem = menu2Container.querySelector('[data-action="Close"]');
        if (closeItem) {
            closeItem.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                menuItems.forEach(item => item.classList.remove('active'));
                isMenuActive = false;
                window.parent.postMessage({ type: 'closeApp', appId: 'spider' }, '*');
            });
        }

        // Generic action handler for game functions
        const dropdownItems = menu2Container.querySelectorAll('.dropdown-menu li[data-action]');
        dropdownItems.forEach(item => {
            if (item.dataset.action === 'Close') return; // Handled separately above

            item.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                const game = window.game;
                
                if (!game) return;

                switch(action) {
                    case 'new-game':
                        game.active_prompt = 1;
                        game.pause();
                        game.prompt_mode = true;
                        if (game.audio) game.audio.playSound(2);
                        break;
                    case 'restart':
                        game.active_prompt = 2;
                        game.pause();
                        game.prompt_mode = true;
                        if (game.audio) game.audio.playSound(2);
                        break;
                    case 'difficulty':
                        game.active_prompt = 0;
                        game.pause();
                        game.prompt_mode = true;
                        if (game.audio) game.audio.playSound(2);
                        break;
                    case 'undo':
                        if (game.rules) game.rules.undo();
                        if (game.audio) game.audio.playSound(2);
                        break;
                    case 'hint':
                        if (game.rules) game.rules.hint();
                        if (game.audio) game.audio.playSound(2);
                        break;
                    case 'sound':
                        if (game.audio) {
                            game.audio.toggleMute();
                            game.audio.playSound(2);
                            item.classList.toggle('checked', !game.audio.muted);
                        }
                        break;
                }

                // Close menus after selection
                menuItems.forEach(m => m.classList.remove('active'));
                isMenuActive = false;
            });
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMenu);
    } else {
        initMenu();
    }
})();
