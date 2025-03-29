// Tree View Component for Poker GTO Explorer - Fixed Version

const treeView = {
    // Keep track of the tree data
    treeData: null,
    treeContainer: null,
    loadedNodes: new Set(),
    maxDepth: 50, // Default max depth for full tree
    actionSequence: [], // Track action sequence for direct node access

    // Render the tree
    renderTree(data, container) {
        this.treeData = data;
        this.treeContainer = container;
        container.innerHTML = '';

        // Add expand all button
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'tree-controls';
        controlsDiv.style.padding = '5px';
        controlsDiv.style.marginBottom = '10px';

        const expandAllBtn = document.createElement('button');
        expandAllBtn.className = 'btn btn-sm';
        expandAllBtn.textContent = 'Expand All';
        expandAllBtn.title = 'Expand all visible nodes';
        expandAllBtn.addEventListener('click', () => this.expandAllVisible());

        controlsDiv.appendChild(expandAllBtn);
        container.appendChild(controlsDiv);

        // Create tree root
        const rootItem = this.createTreeItem(data);
        container.appendChild(rootItem);

        // Expand root by default
        const toggle = rootItem.querySelector('.tree-toggle');
        if (toggle) {
            this.toggleNode(toggle);
        }
    },

    // Pre-expand levels to given depth
    preExpandLevels(depth) {
        if (!this.treeContainer) return;

        const expandRecursive = (element, currentDepth, parentIsCards = false) => {
            if (currentDepth >= depth) return;

            // Check if this is a cards node
            const isCardsNode = element.querySelector('.tree-node-cards') !== null ||
                element.classList.contains('tree-node-type-cards');

            // Don't auto-expand cards nodes or their children
            if (parentIsCards || isCardsNode) {
                return;
            }

            const toggle = element.querySelector(':scope > .tree-item > .tree-toggle');
            if (toggle && toggle.innerHTML === '▶') {
                this.toggleNode(toggle);

                // Wait for children to be rendered
                setTimeout(() => {
                    const children = element.querySelector(':scope > .tree-children');
                    if (children) {
                        Array.from(children.children).forEach(child => {
                            // Pass isCardsNode to track if parent is a cards node
                            expandRecursive(child, currentDepth + 1, isCardsNode);
                        });
                    }
                }, 0);
            }
        };

        expandRecursive(this.treeContainer.firstChild, 0, false);
    }

    ,

    // Expand all visible nodes
    expandAllVisible() {
        if (!this.treeContainer) return;

        // Show loading indicator
        const loadingEl = document.createElement('div');
        loadingEl.textContent = 'Expanding nodes...';
        loadingEl.style.padding = '5px';
        loadingEl.style.fontStyle = 'italic';
        this.treeContainer.insertBefore(loadingEl, this.treeContainer.firstChild.nextSibling);

        // Use setTimeout to avoid freezing the UI
        setTimeout(() => {
            // Get all visible collapsed nodes
            const collapsedToggles = this.treeContainer.querySelectorAll('.tree-toggle:not(.hidden)');

            // Process in batches to avoid UI freeze
            const processBatch = (startIdx, batchSize) => {
                const endIdx = Math.min(startIdx + batchSize, collapsedToggles.length);

                for (let i = startIdx; i < endIdx; i++) {
                    const toggle = collapsedToggles[i];
                    if (toggle.innerHTML === '▶') {
                        this.toggleNode(toggle);
                    }
                }

                // Update loading message
                loadingEl.textContent = `Expanding nodes... (${endIdx}/${collapsedToggles.length})`;

                // Process next batch or finish
                if (endIdx < collapsedToggles.length) {
                    setTimeout(() => processBatch(endIdx, batchSize), 0);
                } else {
                    this.treeContainer.removeChild(loadingEl);
                }
            };

            // Start processing in batches of 50
            processBatch(0, 50);
        }, 0);
    },

    // Create a tree item with no placeholders between levels
    createTreeItem(node) {
        const li = document.createElement('li');

        // Add metadata for searching and navigation
        li.dataset.path = node.path || '';
        li.dataset.nodeName = node.name || '';

        // Set appropriate CSS class based on node type
        if (node.type === 'action') {
            const actionType = this.getActionType(node.name);
            li.className = `tree-node-type-action action-${actionType}`;
        } else if (node.type === 'cards') {
            li.className = 'tree-node-type-cards';
        } else if (node.type === 'card') {
            li.className = 'tree-node-type-card';
        }

        // Create item container
        const item = document.createElement('div');
        item.classList.add('tree-item');
        item.dataset.path = node.path || '';

        // Add click event to navigate
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            // Store action sequence for recovery
            if (node.type === 'action' && node.name) {
                this.actionSequence.push(node.name);
            }
            window.navigateToPath(node.path);
        });

        // Add toggle button if has children
        let toggle = null;
        if (node.children && node.children.length > 0) {
            toggle = document.createElement('span');
            toggle.classList.add('tree-toggle');
            toggle.innerHTML = '▶';
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNode(toggle);
            });
            item.appendChild(toggle);
        } else {
            // For nodes without children, don't show a toggle but maintain spacing
            toggle = document.createElement('span');
            toggle.classList.add('tree-toggle', 'hidden');
            toggle.style.visibility = 'hidden';
            toggle.innerHTML = '&nbsp;';
            item.appendChild(toggle);
        }

        // Add label with appropriate styling
        const label = document.createElement('span');
        label.className = 'tree-node-label';

        if (node.type === 'action') {
            // Style based on action type
            const actionType = this.getActionType(node.name);
            label.classList.add('tree-node-action', `action-node-${actionType}`);
        } else if (node.type === 'cards') {
            label.classList.add('tree-node-cards');
        } else if (node.type === 'card') {
            label.classList.add('tree-node-card');
            if (node.suit) {
                label.classList.add(`card-${node.suit}`);
            }
        }

        label.textContent = node.name || 'Root';
        item.appendChild(label);

        li.appendChild(item);

        // Create children container if needed
        if (node.children && node.children.length > 0) {
            const childrenContainer = document.createElement('ul');
            childrenContainer.classList.add('tree-children', 'collapsed');

            // Directly add all child nodes without any placeholders
            node.children.forEach(child => {
                if (child) { // Only add valid children
                    const childItem = this.createTreeItem(child);
                    childrenContainer.appendChild(childItem);
                }
            });

            this.loadedNodes.add(node.path);
            li.appendChild(childrenContainer);
        }

        return li;
    },

    // Get the depth of a path
    getDepth(path) {
        if (!path) return 0;
        return path.split('/').filter(p => p).length;
    },

    // Toggle node expansion
    toggleNode(toggle) {
        const item = toggle.parentNode;
        const li = item.parentNode;
        const childrenContainer = li.querySelector('.tree-children');

        if (childrenContainer) {
            if (childrenContainer.classList.contains('collapsed')) {
                // Expand
                childrenContainer.classList.remove('collapsed');
                toggle.innerHTML = '▼';
            } else {
                // Collapse
                childrenContainer.classList.add('collapsed');
                toggle.innerHTML = '▶';
            }
        }
    },

    // Handle node data not found error in client side
    handleNodeNotFound(path, container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'tree-error';
        errorDiv.style.color = 'red';
        errorDiv.style.padding = '5px';
        errorDiv.style.margin = '5px 0';
        errorDiv.textContent = 'Node data not found.';

        const retryBtn = document.createElement('button');
        retryBtn.textContent = 'Retry';
        retryBtn.className = 'btn btn-sm';
        retryBtn.style.marginLeft = '5px';
        retryBtn.addEventListener('click', async (e) => {
            e.stopPropagation();

            // Try direct node access as a fallback
            try {
                // Show loading
                errorDiv.textContent = 'Trying alternative method...';
                errorDiv.style.color = 'blue';

                // Try to directly load the node via action sequence
                const response = await fetch(`/api/direct_node/${app.sessionId}?path=${encodeURIComponent(path)}&actions=${this.actionSequence.join(',')}`);

                if (response.ok) {
                    // If successful, refresh the UI
                    window.navigateToPath(path);
                    container.removeChild(errorDiv);
                } else {
                    // Show error message
                    const data = await response.json();
                    errorDiv.textContent = data.error || 'Failed to load node';
                    errorDiv.style.color = 'red';
                    errorDiv.appendChild(retryBtn);
                }
            } catch (error) {
                errorDiv.textContent = 'Error: ' + error.message;
                errorDiv.style.color = 'red';
                errorDiv.appendChild(retryBtn);
            }
        });

        errorDiv.appendChild(retryBtn);
        container.appendChild(errorDiv);
    },

    // Helper function to determine action type
    getActionType(action) {
        if (action.includes('CHECK')) return 'check';
        if (action.includes('CALL')) return 'call';
        if (action.includes('BET') || action.includes('RAISE')) return 'bet';
        if (action.includes('FOLD')) return 'fold';
        return '';
    },

    // Select a node in the tree
    selectNode(path) {
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

            // Scroll to make visible with a small delay to ensure DOM is updated
            setTimeout(() => {
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else {
            // Node not found in visible tree, might need to load more of the tree
            this.expandToFindNode(path);
        }
    },

    // Expand to find a node that's not currently visible
    expandToFindNode(path) {
        if (!path) return;

        // Get the path components
        const parts = path.split('/').filter(p => p);

        // Try to find increasingly longer parent paths
        let currentPath = '';
        for (let i = 0; i < parts.length; i++) {
            currentPath += '/' + parts[i];

            const parentItem = document.querySelector(`.tree-item[data-path="${currentPath}"]`);
            if (parentItem) {
                const toggle = parentItem.querySelector('.tree-toggle');
                if (toggle && toggle.innerHTML === '▶') {
                    // Expand this node
                    this.toggleNode(toggle);
                }
            }
        }

        // After expanding all available nodes in the path, check again for our target
        setTimeout(() => {
            const item = document.querySelector(`.tree-item[data-path="${path}"]`);
            if (item) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    },

    // Expand the path to a node
    expandPath(path) {
        if (!path) return;

        // Split path
        const parts = path.split('/').filter(p => p);
        let currentPath = '';

        // Expand each segment
        for (let i = 0; i < parts.length; i++) {
            currentPath += '/' + parts[i];

            // Find node
            const item = document.querySelector(`.tree-item[data-path="${currentPath}"]`);
            if (item) {
                // Find parent
                const li = item.parentNode;
                const toggle = item.querySelector('.tree-toggle');

                // Expand if collapsed and not hidden
                const childrenContainer = li.querySelector('.tree-children');
                if (childrenContainer &&
                    childrenContainer.classList.contains('collapsed') &&
                    toggle &&
                    !toggle.classList.contains('hidden')) {
                    this.toggleNode(toggle);
                }
            }
        }
    }
};