// Main JavaScript for Poker GTO Explorer - Fixed Version

// Global state
const app = {
    sessionId: null,
    currentPath: "",
    currentNode: null,
    selectedHand: null,
    isLoading: false,
    actionCache: {}, // Cache for actions to prevent duplicates
    treeExpanded: false // Track if tree is fully expanded
};

// DOM Elements
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

// Initialize tab switching
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update active tab content
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
        });
    });
}

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
    }, 100));
}

// Adjust the hand matrix height based on window size
function adjustHandMatrixSize() {
    const handMatrix = document.querySelector('.hand-matrix-container');
    if (handMatrix) {
        const windowHeight = window.innerHeight;
        const headerHeight = document.querySelector('.app-header').offsetHeight;
        const breadcrumbHeight = document.querySelector('.breadcrumb-container').offsetHeight;
        const infoHeight = document.querySelector('.strategy-info-panel').offsetHeight;
        const tabsHeaderHeight = document.querySelector('.tabs-header').offsetHeight;
        const statusHeight = document.querySelector('.status-bar').offsetHeight;

        // Calculate available height for hand matrix
        const availableHeight = windowHeight - headerHeight - breadcrumbHeight - infoHeight - tabsHeaderHeight - statusHeight - 60; // 60px for margins/padding

        // Set minimum height
        handMatrix.style.maxHeight = Math.max(availableHeight, 400) + 'px';
        handMatrix.style.overflowY = 'auto';
    }
}

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
    } catch (error) {
        console.error('Error loading tree structure:', error);
        setStatus(`Error: ${error.message}`);
    }
}

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
        const response = await fetch(`/api/node/${app.sessionId}?path=${encodeURIComponent(path)}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load node information');
        }

        const nodeInfo = await response.json();
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

        // Adjust hand matrix size
        setTimeout(adjustHandMatrixSize, 100);

        setStatus(`Navigated to ${nodeInfo.node_type || 'node'}`);
    } catch (error) {
        console.error('Error navigating to path:', error);
        setStatus(`Error: ${error.message}`);
    } finally {
        setLoading(false);
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

    // Add dealcards button if there are dealcards
    if (nodeInfo.dealcards && nodeInfo.dealcards.length > 0) {
        const cardsBtn = document.createElement('button');
        cardsBtn.classList.add('btn', 'action-btn', 'action-cards');
        cardsBtn.textContent = 'Cards';

        cardsBtn.addEventListener('click', () => {
            const newPath = `${app.currentPath}/dealcards`;
            navigateToPath(newPath);
        });

        navContainer.appendChild(cardsBtn);

        // If there are only a few cards, add buttons for each
        if (nodeInfo.dealcards.length <= 6) {
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'cards-container';
            cardsContainer.style.display = 'flex';
            cardsContainer.style.flexWrap = 'wrap';
            cardsContainer.style.gap = '4px';
            navContainer.appendChild(cardsContainer);

            nodeInfo.dealcards.forEach(card => {
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
                    const newPath = `${app.currentPath}/dealcards/${card}`;
                    navigateToPath(newPath);
                });

                cardsContainer.appendChild(cardBtn);
            });
        }
    }

    // Add up button if we're not at the root
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
}

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

        // Get hand matrix data
        const matrixResponse = await fetch(`/api/hand_matrix/${app.sessionId}?path=${encodeURIComponent(path)}`);
        if (matrixResponse.ok) {
            const matrixData = await matrixResponse.json();
            handMatrix.updateHandMatrix(matrixData, elements.handMatrixGrid, handleHandClick);
        }

        // Get EV analysis
        const evResponse = await fetch(`/api/ev_analysis/${app.sessionId}?path=${encodeURIComponent(path)}`);
        if (evResponse.ok) {
            const evData = await evResponse.json();
            evAnalysis.updateEvAnalysis(evData, elements.evAnalysisContainer);
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
}

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

// Expose functions to global scope for event handlers
window.navigateToPath = navigateToPath;
window.showRootNodeView = showRootNodeView;
window.showExplorerView = showExplorerView;
window.debounce = debounce;

// Initialize app
function init() {
    initTabs();
    setupEventListeners();
    setStatus('Ready to load solver data');

    // Apply initial hand matrix height adjustment
    setTimeout(adjustHandMatrixSize, 300);
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', init);