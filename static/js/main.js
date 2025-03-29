/**
 * Poker GTO Explorer - Main JavaScript
 * A tool for analyzing poker game theory optimal strategies
 */

// ================ APPLICATION STATE ================
const app = {
    sessionId: null,      // Current session ID from server
    currentPath: "",      // Current navigation path
    currentNode: null,    // Current node data
    selectedHand: null,   // Selected hand in matrix
    isLoading: false,     // Loading state flag
    actionCache: {},      // Cache for actions to prevent duplicates
    treeExpanded: false,  // Track if tree is fully expanded
    matrixDataNeedsUpdate: true,  // Flag for hand matrix data
    evDataNeedsUpdate: true       // Flag for EV analysis data
};

// Track manually expanded Cards nodes
window.manuallyExpandedCards = new Set();

// ================ DOM ELEMENTS ================
const elements = {
    // Views
    loadingView: document.getElementById('loading-view'),
    rootNodeView: document.getElementById('root-node-view'),
    explorerView: document.getElementById('explorer-view'),

    // Buttons
    uploadBtn: document.getElementById('upload-btn'),
    welcomeUploadBtn: document.getElementById('welcome-upload-btn'),
    homeBtn: document.getElementById('home-btn'),
    startExploringBtn: document.getElementById('start-exploring-btn'),
    fileInput: document.getElementById('file-input'),

    // Info displays
    fileInfo: document.getElementById('file-info'),
    statusMessage: document.getElementById('status-message'),

    // Root node content
    gameInfoContent: document.getElementById('game-info-content'),
    startingActionsContainer: document.getElementById('starting-actions-container'),

    // Explorer content
    breadcrumbNav: document.getElementById('breadcrumb-nav'),
    gameTree: document.getElementById('game-tree'),
    nodeTitle: document.getElementById('node-title'),
    nodeInfoContainer: document.getElementById('node-info-container'),
    actionButtons: document.getElementById('action-buttons'),

    // Tab content containers
    roughStrategyContainer: document.getElementById('rough-strategy-container'),
    handMatrixGrid: document.getElementById('hand-matrix-grid'),
    handDetailsContent: document.getElementById('hand-details-content'),
    evAnalysisContainer: document.getElementById('ev-analysis-container')
};

// ================ FILE HANDLING ================
// Trigger file upload dialog
function triggerFileUpload() {
    elements.fileInput.click();
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        setLoading(true, `Loading ${file.name}...`);

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload file
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to upload file');
        }

        const data = await response.json();

        // Update app state
        app.sessionId = data.session_id;

        // Reset application state
        app.actionCache = {};
        app.treeExpanded = false;
        window.manuallyExpandedCards.clear();
        app.matrixDataNeedsUpdate = true;
        app.evDataNeedsUpdate = true;

        // Update UI
        elements.fileInfo.textContent = `File: ${data.filename}`;
        elements.homeBtn.disabled = false;

        // Display game info in root node view
        displayGameInfo(data.game_info);

        // Load tree structure
        await loadTreeStructure();

        // Show root node view
        showRootNodeView();

        setStatus(`Successfully loaded game tree`);
    } catch (error) {
        console.error('Error uploading file:', error);
        setStatus(`Error: ${error.message}`);
    } finally {
        setLoading(false);
    }
}

// Load tree structure
async function loadTreeStructure() {
    try {
        const response = await fetch(`/api/tree/${app.sessionId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load tree structure');
        }

        const treeData = await response.json();

        // Render game tree
        treeView.renderTree(treeData, elements.gameTree);

        // Pre-expand the first couple of levels for better visibility
        treeView.preExpandLevels(2);

        // Ensure cards stay collapsed
        setTimeout(collapseCardNodes, 300);
    } catch (error) {
        console.error('Error loading tree structure:', error);
        setStatus(`Error: ${error.message}`);
    }
}

// ================ VIEW MANAGEMENT ================
// Show loading state
function setLoading(isLoading, message) {
    app.isLoading = isLoading;

    if (isLoading) {
        document.body.classList.add('loading');
        if (message) {
            setStatus(message);
        }
    } else {
        document.body.classList.remove('loading');
    }
}

// Set status message
function setStatus(message) {
    elements.statusMessage.textContent = message;
}

// Show root node view
function showRootNodeView() {
    elements.loadingView.classList.add('hidden');
    elements.rootNodeView.classList.remove('hidden');
    elements.explorerView.classList.add('hidden');

    // Reload starting actions
    loadStartingActions();
}

// Show explorer view
function showExplorerView() {
    elements.loadingView.classList.add('hidden');
    elements.rootNodeView.classList.add('hidden');
    elements.explorerView.classList.remove('hidden');

    // Navigate to current path or root if empty
    navigateToPath(app.currentPath || '');

    // Collapse all cards nodes after navigation (with delay)
    setTimeout(collapseCardNodes, 500);
}

// ================ GAME INFO & NAVIGATION ================
// Display game info in root node view
function displayGameInfo(gameInfo) {
    // Clear previous content
    elements.gameInfoContent.innerHTML = '';
    elements.startingActionsContainer.innerHTML = '';

    // Add game info items
    const infoItems = [
        { label: 'Game Type', value: gameInfo.game_type },
        { label: 'Position', value: gameInfo.position },
        { label: 'Starting Player', value: gameInfo.starting_player !== undefined ? gameInfo.starting_player : 'N/A' },
        { label: 'Starting Pot', value: gameInfo.starting_pot ? `$${gameInfo.starting_pot}` : 'N/A' },
        { label: 'Board', value: gameInfo.board || 'None (Preflop)' },
        { label: 'Decision Points', value: gameInfo.decision_points }
    ];

    infoItems.forEach(item => {
        const labelElement = document.createElement('div');
        labelElement.classList.add('label');
        labelElement.textContent = `${item.label}:`;

        const valueElement = document.createElement('div');
        valueElement.classList.add('value');
        valueElement.textContent = item.value;

        elements.gameInfoContent.appendChild(labelElement);
        elements.gameInfoContent.appendChild(valueElement);
    });

    // Load and display starting actions
    loadStartingActions();
}

// Load and display starting actions
async function loadStartingActions() {
    try {
        // Clear previous content to avoid duplication
        elements.startingActionsContainer.innerHTML = '';

        const response = await fetch(`/api/node/${app.sessionId}?path=`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load node information');
        }

        const nodeInfo = await response.json();

        // Use a Set to ensure no duplicate actions are displayed
        const uniqueActions = new Set(nodeInfo.actions || []);

        if (uniqueActions.size > 0) {
            uniqueActions.forEach(action => {
                const actionType = getActionType(action);

                const actionBtn = document.createElement('button');
                actionBtn.classList.add('btn', 'action-btn', `action-${actionType}`);
                actionBtn.textContent = action;

                actionBtn.addEventListener('click', () => {
                    app.currentPath = `/childrens/${action}`;
                    app.currentNode = null;
                    showExplorerView();
                    navigateToPath(app.currentPath);
                });

                elements.startingActionsContainer.appendChild(actionBtn);
            });
        } else {
            const message = document.createElement('p');
            message.textContent = 'No actions available at root node';
            elements.startingActionsContainer.appendChild(message);
        }
    } catch (error) {
        console.error('Error loading starting actions:', error);

        const message = document.createElement('p');
        message.textContent = `Error: ${error.message}`;
        elements.startingActionsContainer.appendChild(message);
    }
}

// Navigate to a specific path
async function navigateToPath(path) {
    try {
        setLoading(true, `Loading node...`);

        // If path is empty, navigate to root
        if (!path) {
            path = '';
        }

        // Update current path
        app.currentPath = path;

        // Update breadcrumb
        updateBreadcrumb(path);

        // Get node information
        let nodeInfo = null;
        let response = await fetch(`/api/node/${app.sessionId}?path=${encodeURIComponent(path)}`);

        if (!response.ok) {
            // Try the direct node endpoint as fallback
            console.log("Regular path failed, trying direct node access...");
            const directResponse = await fetch(`/api/direct_node/${app.sessionId}?path=${encodeURIComponent(path)}&actions=${treeView.actionSequence?.join(',') || ''}`);

            if (directResponse.ok) {
                nodeInfo = await directResponse.json();
            } else {
                throw new Error("Failed to load node through both methods");
            }
        } else {
            nodeInfo = await response.json();
        }

        app.currentNode = nodeInfo;

        // Update node display
        updateNodeDisplay(nodeInfo);

        // Update strategy displays if strategy exists
        if (nodeInfo.has_strategy) {
            await updateStrategyDisplays(path);
        } else {
            clearStrategyDisplays();
        }

        // Update tree selection
        treeView.selectNode(path);

        // Check if we need to expand the tree view
        if (!app.treeExpanded && path.split('/').length > 4) {
            app.treeExpanded = true;
            treeView.expandAllVisible();
        }

        // Fix scrolling and ensure right panel is visible
        fixScrollingAfterNavigation();

        // Ensure cards stay collapsed (after a delay to allow tree to render)
        setTimeout(collapseCardNodes, 300);

        // Adjust hand matrix size
        setTimeout(adjustHandMatrixSize, 100);

        setStatus(`Navigated to ${nodeInfo.node_type || 'node'}`);
    } catch (error) {
        console.error('Error navigating to path:', error);
        setStatus(`Error: ${error.message}`);

        // Clear displays and show error
        clearStrategyDisplays();
    } finally {
        setLoading(false);
    }
}

// Fix scrolling after navigation
function fixScrollingAfterNavigation() {
    // Make sure the right panel is scrolled to top
    const rightPanel = document.querySelector('.right-panel');
    if (rightPanel) {
        rightPanel.scrollTop = 0;
    }

    // Make sure tabs content is scrolled to top
    const tabsContent = document.querySelector('.tabs-content');
    if (tabsContent) {
        tabsContent.scrollTop = 0;
    }
}

// Update the breadcrumb navigation
function updateBreadcrumb(path) {
    // Split path into components
    const parts = path.split('/').filter(p => p);

    // Build HTML
    let html = `<div class="breadcrumb-item"><button data-path="" onclick="navigateToPath('')">Root</button></div>`;

    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        html += `<div class="breadcrumb-separator">&gt;</div>`;

        // Skip "childrens" and "dealcards" in display but keep them in the path
        if (part === 'childrens' || part === 'dealcards') {
            currentPath += `/${part}`;
            continue;
        }

        currentPath += `/${part}`;
        html += `<div class="breadcrumb-item"><button data-path="${currentPath}" onclick="navigateToPath('${currentPath}')">${part}</button></div>`;
    }

    elements.breadcrumbNav.innerHTML = html;
}

// Update node display
function updateNodeDisplay(nodeInfo) {
    // Update title
    let titleText = 'Node Information';
    if (nodeInfo.player !== undefined) {
        titleText = `Player: ${nodeInfo.player}`;
    }
    if (nodeInfo.node_type) {
        titleText += `, Node Type: ${nodeInfo.node_type}`;
    }
    if (nodeInfo.board) {
        titleText += `, Board: ${nodeInfo.board}`;
    }
    elements.nodeTitle.textContent = titleText;

    // Update node info grid
    elements.nodeInfoContainer.innerHTML = '';

    const infoItems = [
        { label: 'Node Type', value: nodeInfo.node_type || 'N/A' },
        { label: 'Player', value: nodeInfo.player !== undefined ? nodeInfo.player : 'N/A' },
        { label: 'Board', value: nodeInfo.board || 'None' }
    ];

    if (nodeInfo.pot) {
        infoItems.push({ label: 'Pot', value: `$${nodeInfo.pot}` });
    }

    if (nodeInfo.deal_number !== undefined) {
        infoItems.push({ label: 'Deal Number', value: nodeInfo.deal_number });
    }

    if (nodeInfo.dealcards_count) {
        infoItems.push({ label: 'Possible Cards', value: nodeInfo.dealcards_count });
    }

    infoItems.forEach(item => {
        const labelElement = document.createElement('div');
        labelElement.classList.add('label');
        labelElement.textContent = `${item.label}:`;

        const valueElement = document.createElement('div');
        valueElement.classList.add('value');
        valueElement.textContent = item.value;

        elements.nodeInfoContainer.appendChild(labelElement);
        elements.nodeInfoContainer.appendChild(valueElement);
    });

    // Update navigation buttons
    updateNavigationButtons(nodeInfo);
}

// Update navigation buttons
function updateNavigationButtons(nodeInfo) {
    // Clear existing buttons
    elements.actionButtons.innerHTML = '';

    // Cache the actions for this node if not already cached
    const nodePath = app.currentPath;
    if (!app.actionCache[nodePath] && nodeInfo.actions) {
        app.actionCache[nodePath] = nodeInfo.actions;
    }

    // Use cached actions to ensure consistency
    const actions = app.actionCache[nodePath] || nodeInfo.actions || [];

    // Create navigation container for better layout
    const navContainer = document.createElement('div');
    navContainer.className = 'nav-buttons-wrapper';
    navContainer.style.display = 'flex';
    navContainer.style.flexWrap = 'wrap';
    navContainer.style.gap = '8px';
    elements.actionButtons.appendChild(navContainer);

    // Add up button if we're not at the root (always first)
    if (app.currentPath) {
        const parentPath = app.currentPath.split('/').slice(0, -1).join('/');

        const upBtn = document.createElement('button');
        upBtn.classList.add('btn', 'action-btn', 'action-up');
        upBtn.textContent = '↑ Up';

        upBtn.addEventListener('click', () => {
            navigateToPath(parentPath);
        });

        navContainer.appendChild(upBtn);
    }

    // Add action buttons
    if (actions.length > 0) {
        actions.forEach(action => {
            const actionType = getActionType(action);

            const actionBtn = document.createElement('button');
            actionBtn.classList.add('btn', 'action-btn', `action-${actionType}`);
            actionBtn.textContent = action;

            actionBtn.addEventListener('click', () => {
                const newPath = `${app.currentPath}/childrens/${action}`;
                navigateToPath(newPath);
            });

            navContainer.appendChild(actionBtn);
        });
    }

    // Special handling for cards - check both dealcards and cards properties
    const cardsList = nodeInfo.dealcards || nodeInfo.cards || [];

    if (cardsList && cardsList.length > 0) {
        // Add a "Cards" button at the top for easy access
        const cardsBtn = document.createElement('button');
        cardsBtn.classList.add('btn', 'action-btn', 'action-cards');
        cardsBtn.textContent = 'Cards';
        cardsBtn.style.backgroundColor = '#ffd700';
        cardsBtn.addEventListener('click', () => {
            // Navigate to standard cards path
            const newPath = nodeInfo.dealcards
                ? `${app.currentPath}/dealcards`
                : `${app.currentPath}/cards`;
            navigateToPath(newPath);
        });
        navContainer.appendChild(cardsBtn);

        // Create a container for all cards
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'cards-container';
        cardsContainer.style.marginTop = '8px';

        // Add a header for the cards section
        const cardsHeader = document.createElement('div');
        cardsHeader.style.width = '100%';
        cardsHeader.style.fontWeight = 'bold';
        cardsHeader.style.marginBottom = '8px';
        cardsHeader.textContent = `Available Cards (${cardsList.length})`;
        cardsContainer.appendChild(cardsHeader);

        // Sort cards for better display
        const sortedCards = [...cardsList].sort((a, b) => {
            // Sort by rank first (A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2)
            const rankOrder = { 'A': 1, 'K': 2, 'Q': 3, 'J': 4, 'T': 5, '9': 6, '8': 7, '7': 8, '6': 9, '5': 10, '4': 11, '3': 12, '2': 13 };
            // Then by suit (clubs, diamonds, hearts, spades)
            const suitOrder = { 'c': 1, 'd': 2, 'h': 3, 's': 4 };

            if (a.length === 2 && b.length === 2) {
                // For cards like "Ac", "Kd", etc.
                const rankDiff = rankOrder[a[0]] - rankOrder[b[0]];
                if (rankDiff !== 0) return rankDiff;
                return suitOrder[a[1]] - suitOrder[b[1]];
            }
            return a.localeCompare(b);
        });

        // Display all cards directly in navigation area
        sortedCards.forEach(card => {
            const cardBtn = document.createElement('button');
            cardBtn.classList.add('card');

            // Add suit class if it's a card with suit
            if (card.length === 2) {
                cardBtn.classList.add(`card-${card[1]}`);
                cardBtn.innerHTML = `${card[0]}${getSuitSymbol(card[1])}`;
            } else {
                cardBtn.textContent = card;
            }

            cardBtn.addEventListener('click', () => {
                // Handle both possible paths
                let newPath;
                if (nodeInfo.dealcards) {
                    newPath = `${app.currentPath}/dealcards/${card}`;
                } else {
                    newPath = `${app.currentPath}/cards/${card}`;
                }
                navigateToPath(newPath);
            });

            cardsContainer.appendChild(cardBtn);
        });

        // Add the cards container to navigation area
        navContainer.appendChild(cardsContainer);
    }
}

// ================ STRATEGY DISPLAYS ================
// Update strategy displays
async function updateStrategyDisplays(path) {
    try {
        // Get strategy information
        const response = await fetch(`/api/strategy/${app.sessionId}?path=${encodeURIComponent(path)}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load strategy information');
        }

        const strategyInfo = await response.json();

        // Update rough strategy
        strategyView.updateRoughStrategy(strategyInfo, elements.roughStrategyContainer);

        // Only fetch specific data when the corresponding tab is active or about to be viewed
        const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');

        // Get hand matrix data only when needed
        if (activeTab === 'hand-matrix' || app.matrixDataNeedsUpdate) {
            app.matrixDataNeedsUpdate = false;
            const matrixResponse = await fetch(`/api/hand_matrix/${app.sessionId}?path=${encodeURIComponent(path)}`);
            if (matrixResponse.ok) {
                const matrixData = await matrixResponse.json();
                handMatrix.updateHandMatrix(matrixData, elements.handMatrixGrid, handleHandClick);
            }
        }

        // Get EV analysis only when needed
        if (activeTab === 'ev-analysis' || app.evDataNeedsUpdate) {
            app.evDataNeedsUpdate = false;
            const evResponse = await fetch(`/api/ev_analysis/${app.sessionId}?path=${encodeURIComponent(path)}`);
            if (evResponse.ok) {
                const evData = await evResponse.json();
                evAnalysis.updateEvAnalysis(evData, elements.evAnalysisContainer);
            }
        }

        // Adjust hand matrix size after content is loaded
        setTimeout(adjustHandMatrixSize, 100);
    } catch (error) {
        console.error('Error updating strategy displays:', error);
        clearStrategyDisplays();
    }
}

// Clear strategy displays
function clearStrategyDisplays() {
    // Clear rough strategy
    elements.roughStrategyContainer.innerHTML = '<p>No strategy data available for this node</p>';

    // Clear hand matrix
    elements.handMatrixGrid.innerHTML = '';

    // Clear hand details
    elements.handDetailsContent.innerHTML = '<p>No strategy data available</p>';

    // Clear EV analysis
    elements.evAnalysisContainer.innerHTML = '<p>No EV data available for this node</p>';
}

// Handle hand click in matrix
async function handleHandClick(hand) {
    try {
        app.selectedHand = hand;

        // Get hand details
        const response = await fetch(`/api/hand_details/${app.sessionId}?path=${encodeURIComponent(app.currentPath)}&hand=${encodeURIComponent(hand)}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load hand details');
        }

        const handData = await response.json();

        // Update hand details display
        handMatrix.displayHandDetails(handData, elements.handDetailsContent);

        setStatus(`Selected hand: ${hand}`);
    } catch (error) {
        console.error('Error loading hand details:', error);
        elements.handDetailsContent.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

// ================ TABS MANAGEMENT ================
// Initialize tab switching
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            const previousTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');

            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update active tab content
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');

            // Load data when switching to a tab that needs it
            if (tabId === 'hand-matrix' && previousTab !== 'hand-matrix' && app.currentPath) {
                if (!elements.handMatrixGrid.hasChildNodes()) {
                    fetch(`/api/hand_matrix/${app.sessionId}?path=${encodeURIComponent(app.currentPath)}`)
                        .then(response => response.json())
                        .then(matrixData => {
                            handMatrix.updateHandMatrix(matrixData, elements.handMatrixGrid, handleHandClick);
                        });
                }
            } else if (tabId === 'ev-analysis' && previousTab !== 'ev-analysis' && app.currentPath) {
                if (!elements.evAnalysisContainer.hasChildNodes()) {
                    fetch(`/api/ev_analysis/${app.sessionId}?path=${encodeURIComponent(app.currentPath)}`)
                        .then(response => response.json())
                        .then(evData => {
                            evAnalysis.updateEvAnalysis(evData, elements.evAnalysisContainer);
                        });
                }
            }

            // Adjust hand matrix size when that tab is selected
            if (tabId === 'hand-matrix') {
                setTimeout(adjustHandMatrixSize, 100);
            }
        });
    });
}

// ================ CARDS MANAGEMENT ================
// Function to collapse Cards nodes with respect for manual interaction
function collapseCardNodes(respectManualExpansion = true) {
    // Find all card nodes by text content
    const cardLabels = document.querySelectorAll('.tree-node-label');
    cardLabels.forEach(label => {
        if (label.textContent === 'Cards') {
            const cardItem = label.closest('li');
            if (cardItem) {
                const path = cardItem.dataset.path || '';
                // Skip if manually expanded by user and we're respecting that
                if (respectManualExpansion && window.manuallyExpandedCards.has(path)) {
                    return;
                }

                const childrenContainer = cardItem.querySelector('.tree-children');
                if (childrenContainer && !childrenContainer.classList.contains('collapsed')) {
                    // Find the toggle button
                    const toggle = cardItem.querySelector('.tree-toggle');
                    if (toggle && toggle.innerHTML === '▼') {
                        // Collapse it
                        childrenContainer.classList.add('collapsed');
                        toggle.innerHTML = '▶';
                    }
                }
            }
        }
    });

    // Also find by class
    const cardNodes = document.querySelectorAll('.tree-node-type-cards, .tree-node-cards');
    cardNodes.forEach(cardNode => {
        const cardItem = cardNode.closest('li');
        if (cardItem) {
            const path = cardItem.dataset.path || '';
            // Skip if manually expanded by user and we're respecting that
            if (respectManualExpansion && window.manuallyExpandedCards.has(path)) {
                return;
            }

            const childrenContainer = cardItem.querySelector('.tree-children');
            if (childrenContainer && !childrenContainer.classList.contains('collapsed')) {
                // Find the toggle button
                const toggle = cardItem.querySelector('.tree-toggle');
                if (toggle && toggle.innerHTML === '▼') {
                    // Collapse it
                    childrenContainer.classList.add('collapsed');
                    toggle.innerHTML = '▶';
                }
            }
        }
    });
}

// ================ SCROLL FIXES ================
// Modified selectNode function for treeView to fix scrolling
function fixTreeViewSelectNode() {
    // Save reference to original method if it exists
    const originalSelectNode = treeView.selectNode;

    // Override with improved version
    treeView.selectNode = function (path) {
        // Clear all selections
        const items = document.querySelectorAll('.tree-item');
        items.forEach(item => {
            item.classList.remove('selected');
        });

        // Find and select the node
        const item = document.querySelector(`.tree-item[data-path="${path}"]`);
        if (item) {
            item.classList.add('selected');

            // Expand path to make selection visible
            this.expandPath(path);

            // Improved scrolling that preserves ability to scroll afterward
            setTimeout(() => {
                // Get the tree container and its scroll properties
                const treeContainer = document.querySelector('.tree-container');
                if (!treeContainer) return;

                const containerRect = treeContainer.getBoundingClientRect();
                const itemRect = item.getBoundingClientRect();

                // Check if item is outside visible area
                const isAbove = itemRect.top < containerRect.top + 40; // Add margin
                const isBelow = itemRect.bottom > containerRect.bottom - 40; // Add margin

                if (isAbove || isBelow) {
                    // Calculate new scroll position that places item in the middle
                    // but allows for further scrolling
                    const scrollMiddle = itemRect.top + (itemRect.height / 2) -
                        containerRect.top - (containerRect.height / 2);

                    // Smooth scroll to the calculated position
                    treeContainer.scrollBy({
                        top: scrollMiddle,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        } else {
            // Node not found in visible tree, might need to load more of the tree
            this.expandToFindNode(path);
        }
    };
}

// Fix for the tree container scrolling
function fixTreeContainerScrolling() {
    const treeContainer = document.querySelector('.tree-container');
    if (treeContainer) {
        // Ensure proper scroll behavior
        treeContainer.style.overflowY = 'auto';
        treeContainer.style.overscrollBehavior = 'contain'; // Prevent scroll chaining
    }
}

// Adjust the hand matrix height based on window size
function adjustHandMatrixSize() {
    const handMatrix = document.querySelector('.hand-matrix-container');
    if (handMatrix) {
        const windowHeight = window.innerHeight;
        const headerHeight = document.querySelector('.app-header')?.offsetHeight || 0;
        const breadcrumbHeight = document.querySelector('.breadcrumb-container')?.offsetHeight || 0;
        const infoHeight = document.querySelector('.strategy-info-panel')?.offsetHeight || 0;
        const tabsHeaderHeight = document.querySelector('.tabs-header')?.offsetHeight || 0;
        const statusHeight = document.querySelector('.status-bar')?.offsetHeight || 0;

        // Calculate available height for hand matrix
        const availableHeight = windowHeight - headerHeight - breadcrumbHeight - infoHeight - tabsHeaderHeight - statusHeight - 60; // 60px for margins/padding

        // Set minimum height
        handMatrix.style.maxHeight = Math.max(availableHeight, 400) + 'px';
        handMatrix.style.overflowY = 'auto';
    }
}

// Fix right panel scrolling when tree is scrolled
function fixSplitViewScrolling() {
    // Make sure right panel maintains its position and scroll independently
    const rightPanel = document.querySelector('.right-panel');
    if (rightPanel) {
        rightPanel.style.overflow = 'auto';
    }

    // Make sure each section inside right panel has correct overflow
    const sections = document.querySelectorAll('.strategy-info-panel, .tabs-container');
    sections.forEach(section => {
        section.style.overflow = 'auto';
    });

    // Fix height calculations
    adjustPanelHeights();
}

// Function to adjust panel heights correctly
function adjustPanelHeights() {
    const windowHeight = window.innerHeight;
    const headerHeight = document.querySelector('.app-header')?.offsetHeight || 0;
    const breadcrumbHeight = document.querySelector('.breadcrumb-container')?.offsetHeight || 0;
    const statusHeight = document.querySelector('.status-bar')?.offsetHeight || 0;

    // Calculate available height
    const availableHeight = windowHeight - headerHeight - breadcrumbHeight - statusHeight;

    // Set split view height
    const splitView = document.querySelector('.split-view');
    if (splitView) {
        splitView.style.height = `${availableHeight}px`;
    }

    // Set tree container height
    const treeContainer = document.querySelector('.tree-container');
    if (treeContainer) {
        const treeHeaderHeight = document.querySelector('.left-panel h3')?.offsetHeight || 0;
        treeContainer.style.height = `calc(100% - ${treeHeaderHeight}px)`;
    }

    // Adjust tabs container
    const tabsContainer = document.querySelector('.tabs-container');
    if (tabsContainer) {
        const infoPanel = document.querySelector('.strategy-info-panel');
        const infoPanelHeight = infoPanel?.offsetHeight || 0;
        const navHeight = document.querySelector('.nav-buttons-container')?.offsetHeight || 0;
        const availableTabsHeight = availableHeight - infoPanelHeight - navHeight - 40; // 40px for margins
        tabsContainer.style.maxHeight = `${availableTabsHeight}px`;
    }
}

// ================ UTILITY FUNCTIONS ================
// Helper function to determine action type
function getActionType(action) {
    if (action.includes('CHECK')) return 'check';
    if (action.includes('CALL')) return 'call';
    if (action.includes('BET')) return 'bet';
    if (action.includes('RAISE')) return 'raise';
    if (action.includes('FOLD')) return 'fold';
    return '';
}

// Helper function to get suit symbol
function getSuitSymbol(suit) {
    const symbols = {
        'c': '♣',
        'd': '♦',
        'h': '♥',
        's': '♠'
    };
    return symbols[suit] || suit;
}

// Debounce function (for handling rapid events)
function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add CSS styles for scroll fixes
function addScrollCSSFixes() {
    // Check if styles already exist
    if (document.getElementById('scroll-fix-styles')) return;

    const style = document.createElement('style');
    style.id = 'scroll-fix-styles';
    style.textContent = `
        /* Extra space at the bottom of tree */
        .tree-view:after {
            content: '';
            display: block;
            height: 200px;
        }
        
        /* Fix for tab content scrolling */
        .tab-content {
            padding-bottom: 100px;
        }
        
        /* Fix for node selection visibility */
        .tree-item.selected {
            z-index: 2;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
        }
    `;
    document.head.appendChild(style);
}

// ================ EVENT LISTENERS ================
// Setup event listeners
function setupEventListeners() {
    // File upload buttons
    elements.uploadBtn.addEventListener('click', triggerFileUpload);
    elements.welcomeUploadBtn.addEventListener('click', triggerFileUpload);
    elements.fileInput.addEventListener('change', handleFileUpload);

    // Navigation buttons
    elements.homeBtn.addEventListener('click', showRootNodeView);
    elements.startExploringBtn.addEventListener('click', showExplorerView);

    // Add resize event handler to adjust hand matrix visibility
    window.addEventListener('resize', debounce(function () {
        adjustHandMatrixSize();
        adjustPanelHeights();
    }, 200));

    // Track manual card expansions
    document.addEventListener('click', function (e) {
        const toggle = e.target.closest('.tree-toggle');
        if (!toggle) return;

        const item = toggle.parentNode;
        const li = item.parentNode;
        const path = item.dataset.path || '';

        // Check if this is a Cards node
        const isCardsNode =
            li.querySelector('.tree-node-cards') !== null ||
            li.classList.contains('tree-node-type-cards') ||
            (li.querySelector('.tree-node-label') &&
                li.querySelector('.tree-node-label').textContent === 'Cards');

        if (isCardsNode) {
            const childrenContainer = li.querySelector('.tree-children');
            const isCollapsed = childrenContainer.classList.contains('collapsed');

            if (isCollapsed) {
                // User is expanding a cards node
                window.manuallyExpandedCards.add(path);
            } else {
                // User is collapsing a cards node
                window.manuallyExpandedCards.delete(path);
            }
        }
    }, true);

    // Fix tree container scrolling issues
    document.querySelector('.tree-container')?.addEventListener('scroll', function () {
        // When manually scrolling the tree, make sure right panel stays visible
        const rightPanel = document.querySelector('.right-panel');
        if (rightPanel) {
            rightPanel.scrollTop = 0;
        }
    });
}

// ================ INITIALIZATION ================
// Initialize app
function init() {
    // Basic initialization
    initTabs();
    setupEventListeners();

    // Apply scroll fixes
    fixTreeViewSelectNode();
    fixTreeContainerScrolling();
    fixSplitViewScrolling();
    addScrollCSSFixes();

    // Set up tree observer
    const treeObserver = new MutationObserver(function () {
        setTimeout(collapseCardNodes, 100);
    });

    // Start observing once the tree container is available
    setTimeout(function () {
        const treeContainer = document.getElementById('game-tree');
        if (treeContainer) {
            treeObserver.observe(treeContainer, {
                childList: true,
                subtree: true
            });
        }
    }, 1000);

    // Initial adjustments
    setTimeout(adjustHandMatrixSize, 300);
    setTimeout(adjustPanelHeights, 300);

    setStatus('Ready to load solver data');
}

// ================ EXPOSE GLOBAL FUNCTIONS ================
// Expose functions to global scope for event handlers
window.navigateToPath = navigateToPath;
window.showRootNodeView = showRootNodeView;
window.showExplorerView = showExplorerView;
window.debounce = debounce;
window.collapseCardNodes = collapseCardNodes;
window.adjustPanelHeights = adjustPanelHeights;

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', init);