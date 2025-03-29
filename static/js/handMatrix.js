// Hand Matrix Component for Poker GTO Explorer - Modified Version

const handMatrix = {
    // Update the hand matrix display
    updateHandMatrix(matrixData, container, clickHandler) {
        container.innerHTML = '';

        if (!matrixData.has_strategy) {
            container.innerHTML = '<p>No hand matrix data available for this node</p>';
            return;
        }

        const ranks = matrixData.ranks;

        // Create the grid with headers

        // Empty corner cell
        const cornerCell = document.createElement('div');
        cornerCell.classList.add('matrix-header');
        container.appendChild(cornerCell);

        // Column headers (ranks)
        ranks.forEach(rank => {
            const header = document.createElement('div');
            header.classList.add('matrix-header');
            header.textContent = rank;
            container.appendChild(header);
        });

        // Row headers and cells
        ranks.forEach((rank, rowIndex) => {
            // Row header
            const rowHeader = document.createElement('div');
            rowHeader.classList.add('matrix-header');
            rowHeader.textContent = rank;
            container.appendChild(rowHeader);

            // Cells for this row
            ranks.forEach((colRank, colIndex) => {
                // Find the cell data
                const cellData = matrixData.cells.find(cell =>
                    cell.row === rowIndex && cell.col === colIndex);

                if (cellData) {
                    const cell = this.createCellElement(cellData, matrixData, clickHandler);
                    container.appendChild(cell);
                } else {
                    // Empty cell as fallback
                    const emptyCell = document.createElement('div');
                    emptyCell.classList.add('matrix-cell');
                    container.appendChild(emptyCell);
                }
            });
        });

        // Make sure cells are square and properly sized
        this.adjustCellSizes(container);

        // Add resize listener for responsive matrix
        window.addEventListener('resize', window.debounce(() => {
            this.adjustCellSizes(container);
        }, 100));
    },

    // Create a cell element with enhanced styling and information
    createCellElement(cellData, matrixData, clickHandler) {
        const cell = document.createElement('div');
        cell.classList.add('matrix-cell');

        // Add type class (pair, suited, offsuit)
        if (cellData.type) {
            cell.classList.add(cellData.type);
        }

        // Create better structured content layout
        const contentContainer = document.createElement('div');
        contentContainer.className = 'cell-content';

        // Hand text (bigger and more prominent)
        const handText = document.createElement('div');
        handText.className = 'hand-text';
        handText.textContent = cellData.hand;
        contentContainer.appendChild(handText);

        // Action styling
        if (cellData.action !== 'none') {
            // Get color based on action and probability
            const actionType = this.getActionType(cellData.action);
            const actionColor = this.getActionColor(actionType);
            const opacity = Math.min(0.7 + (cellData.probability / 100 * 0.3), 0.95);

            // Set background with opacity
            cell.style.backgroundColor = this.hexToRgba(actionColor, opacity);

            // Set border to emphasize the cell
            cell.style.border = `2px solid ${actionColor}`;

            // Add the primary action with probability
            if (cellData.probability > 0) {
                const actionLine = document.createElement('div');
                actionLine.className = 'action-primary';
                actionLine.textContent = `${this.abbreviateAction(cellData.action)}: ${cellData.probability}%`;
                contentContainer.appendChild(actionLine);

                // Set text color for better contrast
                if (actionType === 'call' || actionType === 'fold' || cellData.probability > 70) {
                    handText.style.color = 'white';
                    actionLine.style.color = 'white';
                }
            }

            // Find secondary action if significant
            const probs = cellData.probabilities || [];
            if (probs.length > 1) {
                // Sort probabilities
                const sortedProbs = [...probs].map((p, i) => ({
                    value: p,
                    action: matrixData.actions[i]
                })).sort((a, b) => b.value - a.value);

                // If second action is significant, add it
                if (sortedProbs.length > 1 && sortedProbs[1].value > 5) {
                    const secondLine = document.createElement('div');
                    secondLine.className = 'action-secondary';
                    secondLine.textContent = `${this.abbreviateAction(sortedProbs[1].action)}: ${sortedProbs[1].value}%`;
                    contentContainer.appendChild(secondLine);

                    if (actionType === 'call' || actionType === 'fold' || cellData.probability > 70) {
                        secondLine.style.color = 'white';
                    }
                }
            }

            // Add tooltip with all probabilities
            if (probs.length > 0) {
                const tooltip = matrixData.actions.map((action, i) =>
                    `${action}: ${probs[i]}%`
                ).join('\n');

                cell.title = tooltip;
            }
        }

        cell.appendChild(contentContainer);

        // Add click handler
        cell.addEventListener('click', () => {
            if (clickHandler) {
                clickHandler(cellData.hand);

                // Highlight selected cell
                document.querySelectorAll('.matrix-cell.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                cell.classList.add('selected');
            }
        });

        return cell;
    },

    // Adjust cell sizes to ensure they're square and properly displayed
    adjustCellSizes(container) {
        if (!container) return;

        // Calculate ideal cell size based on container width and height
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const columns = 14; // 13 rank columns + 1 header column
        const rows = 14; // 13 rank rows + 1 header row

        // Calculate cell size based on the smaller dimension to ensure squares
        const maxCellWidth = Math.floor((containerWidth / columns) - 2); // 2px for gap
        const maxCellHeight = Math.floor((containerHeight / rows) - 2); // 2px for gap
        const cellSize = Math.min(maxCellWidth, maxCellHeight);

        // Apply size to cells
        const cells = container.querySelectorAll('.matrix-cell, .matrix-header');
        cells.forEach(cell => {
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.fontSize = `${Math.max(8, Math.floor(cellSize / 6))}px`;
        });
    },

    // Display hand details with enhanced formatting
    displayHandDetails(handData, container) {
        container.innerHTML = '';

        if (!handData || handData.error) {
            container.innerHTML = `<p>${handData.error || 'No hand data available'}</p>`;
            return;
        }

        // Create enhanced header for the hand
        const header = document.createElement('div');
        header.className = 'hand-details-header';
        header.innerHTML = `<h4>Hand Details: ${handData.hand}</h4>`;
        container.appendChild(header);

        // Create table with better styling
        const tableWrapper = document.createElement('div');
        tableWrapper.style.overflowX = 'auto';
        tableWrapper.style.marginBottom = '15px';

        const table = document.createElement('table');
        table.className = 'hand-details-table';

        // Create header row
        const thead = document.createElement('thead');
        const headerTr = document.createElement('tr');

        // Card combo header
        const handTh = document.createElement('th');
        handTh.textContent = 'Combo';
        handTh.style.width = '60px';
        headerTr.appendChild(handTh);


        // Action headers
        handData.actions.forEach(action => {
            const actionTh = document.createElement('th');
            actionTh.textContent = action;
            actionTh.style.backgroundColor = this.getActionColor(this.getActionType(action));

            if (this.getActionType(action) === 'call') {
                actionTh.style.color = 'white';
            }

            headerTr.appendChild(actionTh);
        });

        thead.appendChild(headerTr);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');

        // Add each combination with improved styling
        handData.combinations.forEach((combo, index) => {
            const row = document.createElement('tr');
            row.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white';

            // Hand cell with card symbols
            const handCell = document.createElement('td');
            handCell.innerHTML = this.formatCardSymbols(combo.hand);
            row.appendChild(handCell);

            // Probability cells with better visualization
            combo.probabilities.forEach(prob => {
                const probCell = document.createElement('td');
                probCell.textContent = `${prob}%`;

                // Add color based on probability value
                if (prob > 70) {
                    probCell.style.backgroundColor = this.getActionColor('check'); // Green
                    probCell.style.color = 'white';
                } else if (prob > 30) {
                    probCell.style.backgroundColor = this.getActionColor('bet'); // Orange
                } else if (prob > 0) {
                    probCell.style.backgroundColor = this.getActionColor('fold'); // Red
                    probCell.style.color = 'white';
                }

                row.appendChild(probCell);
            });

            tbody.appendChild(row);
        });

        // Add average row with special styling
        const avgRow = document.createElement('tr');
        avgRow.className = 'hand-details-avg-row';

        // Average label
        const avgLabel = document.createElement('td');
        avgLabel.textContent = 'Average';
        avgRow.appendChild(avgLabel);

        // Average values
        handData.average_probabilities.forEach(prob => {
            const avgCell = document.createElement('td');
            avgCell.textContent = `${prob}%`;
            avgRow.appendChild(avgCell);
        });

        tbody.appendChild(avgRow);
        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        container.appendChild(tableWrapper);

        // Add info about combinations
        if (handData.combinations.length < handData.expected_combos) {
            const infoRow = document.createElement('div');
            infoRow.className = 'hand-details-info';
            infoRow.innerHTML = `<i class="fas fa-info-circle"></i> Note: Only ${handData.combinations.length} of ${handData.expected_combos} possible combinations found in data.`;
            container.appendChild(infoRow);
        }
    },

    // Format cards with colored suit symbols
    formatCardSymbols(handText) {
        if (!handText) return handText;

        // Replace suit symbols with colored versions
        return handText
            .replace(/♣/g, '<span style="color:#27ae60;">♣</span>')
            .replace(/♦/g, '<span style="color:#3498db;">♦</span>')
            .replace(/♥/g, '<span style="color:#e74c3c;">♥</span>')
            .replace(/♠/g, '<span style="color:#2c3e50;">♠</span>');
    },

    // Helper function to get action type
    getActionType(action) {
        if (action.includes('CHECK')) return 'check';
        if (action.includes('CALL')) return 'call';
        if (action.includes('BET')) return 'bet';
        if (action.includes('RAISE')) return 'raise';
        if (action.includes('FOLD')) return 'fold';
        return '';
    },

    // Get color for action type
    getActionColor(actionType) {
        const colors = {
            check: '#2ecc71',  // Green
            call: '#3498db',   // Blue
            bet: '#f39c12',    // Orange
            raise: '#e67e22',  // Darker orange
            fold: '#95a5a6'    // Gray
        };
        return colors[actionType] || '#cccccc';
    },

    // Convert hex color to rgba
    hexToRgba(hex, opacity) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },

    // Abbreviate action for display
    abbreviateAction(action) {
        if (action.includes('CHECK')) return 'Ck';
        if (action.includes('CALL')) return 'Ca';
        if (action.includes('FOLD')) return 'F';

        if (action.includes('BET') || action.includes('RAISE')) {
            const parts = action.split(' ');
            if (parts.length > 1) {
                try {
                    const amount = parseFloat(parts[1]);
                    return `${parts[0][0]}${Math.round(amount)}`;
                } catch (e) {
                    return parts[0][0];
                }
            }
            return action[0];
        }

        return action[0];
    }
};