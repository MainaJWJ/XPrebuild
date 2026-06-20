export default class Tabs {
  static instances = new WeakMap();

  constructor(root) {
    Tabs.instances.set(root, this);

    this.root = root;
    this.tabList = root.querySelector('[role="tablist"]');
    this.panels = root.querySelectorAll('[role="tabpanel"]');
    this.selectedTab = null;

    for (let tab of this.tabList.children) {
      tab.addEventListener('mousedown', () => this.change(tab));
      if (!tab.getAttribute('aria-selected')) {
        tab.setAttribute('tabindex', -1);
      } else {
        this.selectedTab = tab;
      }
    }
    this.tabList.addEventListener('keydown', e => {
      if (this.selectedTab) {
        if (e.key === 'ArrowRight' && this.selectedTab.nextElementSibling) {
          this.change(this.selectedTab.nextElementSibling);
        } else if (e.key === 'ArrowLeft' && this.selectedTab.previousElementSibling) {
          this.change(this.selectedTab.previousElementSibling);
        }
      }
    });
  }

  change(tab) {
    const tabPage = document.getElementById(tab.getAttribute('aria-controls'));
    for (let other of this.tabList.children) {
      other.setAttribute('aria-selected', false);
      other.setAttribute('tabindex', -1);
    }
    tab.setAttribute('aria-selected', true);
    tab.setAttribute('tabindex', 0);
    tab.focus();
    this.selectedTab = tab;
    this.panels.forEach(p => p.setAttribute('hidden', true));
    tabPage.removeAttribute('hidden');
  }

  static initDomElements() {
    window.addEventListener('DOMContentLoaded', () => {
      const tabContainers = document.getElementsByClassName('tabs');
      for (const tabContainer of tabContainers) {
        if (!Tabs.instances.has(tabContainer)) {
          new Tabs(tabContainer);
        }
      }
    });

    // Handle messages (e.g., from appengine.js or parent context)
    window.addEventListener('message', (e) => {
        const data = e.data;
        if (!data || typeof data !== 'object') return;

        // Auto-switch to target tab if payload exists
        if (data.targetTab) {
            const tabContainers = document.getElementsByClassName('tabs');
            for (const container of tabContainers) {
                const instance = Tabs.instances.get(container);
                if (instance) {
                    const tab = container.querySelector(`[aria-controls="${data.targetTab}"]`);
                    if (tab) {
                        instance.change(tab);
                    }
                }
            }
        }
    });
  }
}

class List {
  constructor(root) {
    this.root = root;

    this.multiselect = this.root.getAttribute('aria-multiselectable') === 'true';
    this.iconGrid = this.root.children.length > 0 && this.root.children[0].classList.contains('icon-grid');
    this.treeView = this.root.children.length > 0 && this.root.children[0].role === 'tree';
    this.options = this.root.querySelectorAll('[role="option"], [role="treeitem"]');
    this.selectedOption = -1;
    this.prefix = '';
    this.prefixTimeout = null;

    for (let i = 0; i < this.options.length; i++) {
      const option = this.options[i];
      option.addEventListener('mousedown', e => {
        e.stopPropagation();
        e.preventDefault();
        this.select(i, e.shiftKey, e.ctrlKey, true);
      });
      option.addEventListener('keydown', e => {
        if (e.key === ' ' && !this.prefix) {
          e.preventDefault();
          this.select(i, e.shiftKey, true, true);
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          if (this.prefixTimeout) {
            clearTimeout(this.prefixTimeout);
          }
          this.prefix += e.key.toLowerCase();
          for (let j = 0; j < this.options.length; j++) {
            if (this.treeView && this.options[j].matches('details:not([open]) ul *')) {
              continue;
            }
            if (this.options[j].textContent.trimLeft().toLowerCase().startsWith(this.prefix)) {
              this.select(j, false, false);
              break;
            }
          }
          this.prefixTimeout = setTimeout(() => {
            this.prefixTimeout = null;
            this.prefix = '';
          }, 700);
        } else if (e.key === 'a' && e.ctrlKey && this.multiselect) {
          e.preventDefault();
          for (let option of this.options) {
            option.setAttribute('aria-selected', true);
          }
        } else if (e.key === 'Home') {
          e.preventDefault();
          this.select(0, e.shiftKey, e.ctrlKey);
        } else if (e.key === 'End') {
          e.preventDefault();
          this.select(this.options.length - 1, e.shiftKey, e.ctrlKey);
        } else if (this.iconGrid) {
          if (this.options.length > 0) {
            let columns;
            const y0 = this.options[0].getBoundingClientRect().top;
            for (columns = 1; columns < this.options.length; columns++) {
              const y1 = this.options[columns].getBoundingClientRect().top;
              if (y1 !== y0) {
                break;
              }
            }
            const x = i % columns;
            const y = (i / columns) | 0;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              this.select(x + (y + 1) * columns, e.shiftKey, e.ctrlKey);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              this.select(x + (y - 1) * columns, e.shiftKey, e.ctrlKey);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              if (x > 0) {
                this.select(i - 1, e.shiftKey, e.ctrlKey);
              }
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              if (x < columns - 1) {
                this.select(i + 1, e.shiftKey, e.ctrlKey);
              }
            }
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.select(i + 1, e.shiftKey, e.ctrlKey, false, 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.select(i - 1, e.shiftKey, e.ctrlKey, false);
        } else if (this.treeView) {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            const option = this.options[i];
            if (option.tagName === 'SUMMARY') {
              option.parentElement.open = true;
            }
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const option = this.options[i];
            if (option.tagName === 'SUMMARY') {
              option.parentElement.open = false;
            }
          }
        }
      });
      if (option.getAttribute('aria-selected') !== 'true') {
        option.setAttribute('tabindex', -1);
      } else {
        this.selectedOption = i;
        option.setAttribute('tabindex', 0);
      }
    }
    if (this.selectedOption < 0 && this.options.length) {
      this.options[0].setAttribute('tabindex', 0);
    }
    this.root.addEventListener('mousedown', () => {
      if (this.multiselect) {
        for (let option of this.options) {
          option.setAttribute('aria-selected', false);
        }
      }
      if (this.selectedOption >= 0) {
        this.options[this.selectedOption].focus();
      } else if (this.options.length) {
        this.options[0].focus();
      }
    });
  }

  select(index, shift, ctrl, click, direction = -1) {
    if (index < 0 || index >= this.options.length) {
      return;
    }
    const option = this.options[index];
    if (this.treeView && option.matches('details:not([open]) ul *')) {
      this.select(index + direction, shift, ctrl, click, direction);
      return;
    }
    for (let other of this.options) {
      if (!this.multiselect || !ctrl) {
        other.setAttribute('aria-selected', false);
      }
      other.setAttribute('tabindex', -1);
    }
    if (this.multiselect && (ctrl || shift)) {
      if (this.selectedOption < 0) {
        this.selectedOption = index;
      }
      if (shift) {
        if (this.selectedOption < index) {
          for (let i = this.selectedOption; i <= index; i++) {
            this.options[i].setAttribute('aria-selected', true);
          }
        } else {
          for (let i = this.selectedOption; i >= index; i--) {
            this.options[i].setAttribute('aria-selected', true);
          }
        }
      } else if (ctrl && click) {
        if (option.getAttribute('aria-selected') === 'true') {
          option.setAttribute('aria-selected', false);
        } else {
          option.setAttribute('aria-selected', true);
          this.selectedOption = index;
        }
      }
    } else {
      option.setAttribute('aria-selected', true);
      this.selectedOption = index;
    }
    option.setAttribute('tabindex', 0);
    option.focus();
  }

  static initDomElements() {
    window.addEventListener('DOMContentLoaded', () => {
      const lists = document.getElementsByClassName('list');
      for (let list of lists) {
        new List(list);
      }
      // Initialize menu bar functionality

    });
  }
}

class Menu {
  static initDomElements() {
    // ======================================================================
    // Menu 2 (Menu Bar) Logic - Ported from folder.html
    // ======================================================================
    const menu2Container = document.getElementById('menu2');
    if (!menu2Container) return;

    const menuItems = menu2Container.querySelectorAll('.menu-item');
    let isMenuActive = false;

    menuItems.forEach(menuItem => {
      menuItem.addEventListener('click', (e) => {
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
    document.addEventListener('click', () => {
      menuItems.forEach(item => item.classList.remove('active'));
      isMenuActive = false;
    });

    // Handle "Close" action in menu
    const closeItem = menu2Container.querySelector('[data-action="Close"]');
    if (closeItem) {
      closeItem.addEventListener('click', (e) => {
        e.stopPropagation();
        menuItems.forEach(item => item.classList.remove('active'));
        isMenuActive = false;
        alert('Close action triggered');
      });
    }

    // ======================================================================
    // Menu 1 (Popup Menu) Logic
    // ======================================================================
    // Note: The ported context menu design is static in index.html for demonstration.
    // However, we can add simple hover effects for submenus if any existed (none in current port).
    // The CSS .xp-popup-menu handles the layout.
    // If interactivity is needed for Menu 1 (like clicking items), it can be added here.
  }
}

Tabs.initDomElements();
List.initDomElements();
Menu.initDomElements();

// ======================================================================
// Screen Saver Preview Logic
// ======================================================================
window.addEventListener('DOMContentLoaded', () => {
    const screensaverList = document.getElementById('screensaver-list');
    const previewIframe = document.getElementById('screensaver-preview');
    const previewBtn = document.getElementById('btn-preview');

    if (!screensaverList || !previewIframe || !previewBtn) return;

    // Registry mapping (simplified for iframe preview)
    const screensaverPaths = {
        'windows': '../../app/screensaver/windows/index.html',
        'starfield': '../../app/screensaver/starfield/index.html',
        'pipes': '../../app/screensaver/pipes/index.html',
        'mystify': '../../app/screensaver/mystify/index.html',
        'maze': '../../app/screensaver/maze/index.html',
        'flower': '../../app/screensaver/flower/index.html',
        'smile': '../../app/screensaver/smile/index.html',
        'fish': '../../app/screensaver/fish/index.html',
        'flying-toasters': '../../app/screensaver/flying-toasters/index.html',
        'hard-rain': '../../app/screensaver/hard-rain/index.html',
        'rainstorm': '../../app/screensaver/rainstorm/index.html',
        'starry-night': '../../app/screensaver/starry-night/index.html'
    };

    function updatePreview(appId) {
        if (!appId || !screensaverPaths[appId]) {
            previewIframe.style.display = 'none';
            previewIframe.src = 'about:blank';
            return;
        }

        previewIframe.src = screensaverPaths[appId];
        previewIframe.style.display = 'block';
        previewIframe.style.position = 'absolute';
        previewIframe.style.top = '0';
        previewIframe.style.left = '0';
        previewIframe.style.zIndex = '10';
        previewIframe.style.pointerEvents = 'none';

        // Scaling logic: internal 800x600 scaled to fit 134x100
        // Scale = 134/800 = 0.1675
        previewIframe.style.width = '800px';
        previewIframe.style.height = '600px';
        previewIframe.style.transform = 'scale(0.1730,0.1650)';
        previewIframe.style.transformOrigin = 'top left';
    }

    // Observer to detect when the list selection changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'aria-selected') {
                const target = mutation.target;
                if (target.getAttribute('aria-selected') === 'true') {
                    updatePreview(target.dataset.appId);
                }
            }
        });
    });

    screensaverList.querySelectorAll('.list-item').forEach(item => {
        observer.observe(item, { attributes: true });
    });

    // Handle "Preview" button click
    previewBtn.addEventListener('click', () => {
        const selected = screensaverList.querySelector('[aria-selected="true"]');
        const appId = selected?.dataset.appId;
        if (appId) {
            window.parent.postMessage({ type: 'launchApp', appId: appId }, '*');
        }
    });
});

// ======================================================================
// CRT Filter Interaction Logic
// ======================================================================
window.addEventListener('DOMContentLoaded', () => {
    const chkEnable = document.getElementById('chk-enable-filter');
    const chkGrayscale = document.getElementById('chk-grayscale');

    const sliders = [
        { id: 'input-roll', valId: 'val-roll' },
        { id: 'input-brightness', valId: 'val-brightness' },
        { id: 'input-vignette', valId: 'val-vignette' }
    ];

    // Format numbers consistently (e.g., 1.00)
    const formatNum = (val) => parseFloat(val).toFixed(2);

    // 1. Request current state from parent (crt.js)
    window.parent.postMessage({ type: 'requestCRTState' }, '*');

    // 2. Listen for the state response
    window.addEventListener('message', (e) => {
        const data = e.data;
        if (data && data.type === 'crtState') {
            const params = data.params;
            
            // Sync Checkboxes
            if (chkEnable) chkEnable.checked = params.enabled;
            if (chkGrayscale) chkGrayscale.checked = params.grayscale;

            // Sync Sliders
            sliders.forEach(slider => {
                const input = document.getElementById(slider.id);
                const valSpan = document.getElementById(slider.valId);
                const currentVal = params[slider.id];
                
                if (input && currentVal !== undefined) {
                    input.value = currentVal;
                    if (valSpan) valSpan.textContent = formatNum(currentVal);
                }
            });
        }
    });

    if (chkEnable) {
        chkEnable.addEventListener('change', () => {
            window.parent.postMessage({ type: 'toggleCRT', state: chkEnable.checked }, '*');
        });
    }

    if (chkGrayscale) {
        chkGrayscale.addEventListener('change', () => {
            window.parent.postMessage({ type: 'toggleCRTGrayscale', state: chkGrayscale.checked }, '*');
        });
    }

    sliders.forEach(slider => {
        const input = document.getElementById(slider.id);
        const valSpan = document.getElementById(slider.valId);
        if (input) {
            input.addEventListener('input', () => {
                if (valSpan) valSpan.textContent = formatNum(input.value);
                window.parent.postMessage({ 
                    type: 'updateCRTParam', 
                    id: slider.id, 
                    value: input.value 
                }, '*');
            });
        }
    });
});