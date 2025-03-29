// Tree View Component for Poker GTO Explorer - Fixed Version

const treeView = {
    // Keep track of the tree data
    treeData: null,
    treeContainer: null,
    loadedNodes: new Set(),
    maxDepth: 50, // Default max depth

    // Render the tree
    renderTree(data, container) {
        this.treeData = data;
        this.treeContainer = container;
        container.innerHTML = '';

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

        const expandRecursive = (element, currentDepth) => {
            if (currentDepth >= depth) return;

            const toggle = element.querySelector(':scope > .tree-item > .tree-toggle');
            if (toggle && toggle.innerHTML === '▶') {
                this.toggleNode(toggle);

                // Wait for children to be rendered
                setTimeout(() => {
                    const children = element.querySelector(':scope > .tree-children');
                    if (children) {
                        Array.from(children.children).forEach(child => {
                            expandRecursive(child, currentDepth + 1);
                        });
                    }
                }, 0);
            }
        };

        expandRecursive(this.treeContainer.firstChild, 0);
    },

    // Expand all visible nodes
    expandAllVisible() {
        if (!this.treeContainer) return;

        // Get all visible collapsed nodes
        const collapsedToggles = this.treeContainer.querySelectorAll('.tree-toggle:not(.hidden)');
        collapsedToggles.forEach(toggle => {
            if (toggle.innerHTML === '▶') {
                this.toggleNode(toggle);
            }
        });
    },

    // Create a tree item
    createTreeItem(node) {
        const li = document.createElement('li');

        // Add metadata for searching and navigation
        li.dataset.path = node.path || '';

        // Create item container
        const item = document.createElement('div');
        item.classList.add('tree-item');
        item.dataset.path = node.path || '';

        // Add click event to navigate
        item.addEventListener('click', (e) => {
            e.stopPropagation();
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
            // For nodes without children, don't show a toggle
            toggle = document.createElement('span');
            toggle.classList.add('tree-toggle', 'hidden');
            toggle.style.visibility = 'hidden';
            toggle.innerHTML = '&nbsp;';
            item.appendChild(toggle);
        }

        // Add label with appropriate styling
        const label = document.createElement('span');

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

        label.textContent = node.name;
        item.appendChild(label);

        li.appendChild(item);

        // Create children container if needed
        if (node.children && node.children.length > 0) {
            const childrenContainer = document.createElement('ul');
            childrenContainer.classList.add('tree-children', 'collapsed');

            // Add children (limit initial depth to improve performance)
            if (this.getDepth(node.path) < 3) {
                node.children.forEach(child => {
                    const childItem = this.createTreeItem(child);
                    childrenContainer.appendChild(childItem);
                });
                this.loadedNodes.add(node.path);
            } else {
                // Add a placeholder for lazy loading
                const placeholderItem = document.createElement('li');
                placeholderItem.textContent = 'Loading...';
                placeholderItem.classList.add('loading-placeholder');
                childrenContainer.appendChild(placeholderItem);
            }

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

                // Load children if needed
                const path = item.dataset.path;
                if (!this.loadedNodes.has(path)) {
                    this.loadChildren(path, childrenContainer);
                }
            } else {
                // Collapse
                childrenContainer.classList.add('collapsed');
                toggle.innerHTML = '▶';
            }
        }
    },

    // Load children dynamically
    loadChildren(path, container) {
        // Remove loading placeholder
        const placeholder = container.querySelector('.loading-placeholder');
        if (placeholder) {
            container.removeChild(placeholder);
        }

        // Find node in tree data
        const node = this.findNodeByPath(this.treeData, path);
        if (node && node.children) {
            node.children.forEach(child => {
                const childItem = this.createTreeItem(child);
                container.appendChild(childItem);
            });

            this.loadedNodes.add(path);
        }
    },

    // Find a node in the tree data by path
    findNodeByPath(rootNode, targetPath) {
        if (!rootNode || !targetPath) return null;
        if (rootNode.path === targetPath) return rootNode;

        if (rootNode.children) {
            for (const child of rootNode.children) {
                const found = this.findNodeByPath(child, targetPath);
                if (found) return found;
            }
        }

        return null;
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

        // Get the longest parent path that might be visible
        const parts = path.split('/').filter(p => p);

        // Try to find increasingly longer parent paths
        for (let i = 1; i <= parts.length; i++) {
            const partialPath = '/' + parts.slice(0, i).join('/');
            const parentItem = document.querySelector(`.tree-item[data-path="${partialPath}"]`);

            if (parentItem) {
                const toggle = parentItem.querySelector('.tree-toggle');
                if (toggle && toggle.innerHTML === '▶') {
                    // Expand this node
                    this.toggleNode(toggle);

                    // If this is the target path, we're done
                    if (partialPath === path) {
                        parentItem.classList.add('selected');
                        setTimeout(() => {
                            parentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                        return;
                    }
                }
            }
        }

        // If we get here, we couldn't find the node even after expanding
        console.log(`Could not find node with path: ${path}`);
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