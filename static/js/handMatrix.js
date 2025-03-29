// Hand Matrix Component for Poker GTO Explorer - Fixed Version

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
                    const cell = document.createElement('div');
                    cell.classList.add('matrix-cell');

                    // Add type class (pair, suited, offsuit)
                    if (cellData.type) {
                        cell.classList.add(cellData.type);
                    }

                    // Create content container for better layout control
                    const contentContainer = document.createElement('div');
                    contentContainer.className = 'cell-content';
                    contentContainer.style.display = 'flex';
                    contentContainer.style.flexDirection = 'column';
                    contentContainer.style.alignItems = 'center';
                    contentContainer.style.justifyContent = 'center';
                    contentContainer.style.height = '100%';
                    contentContainer.style.width = '100%';
                    contentContainer.style.overflow = 'hidden';

                    // Set the hand text
                    const handText = document.createElement('div');
                    handText.className = 'hand-text';
                    handText.textContent = cellData.hand;
                    handText.style.fontWeight = 'bold';
                    handText.style.marginBottom = '2px';
                    contentContainer.appendChild(handText);

                    // Add action styling if there's strategy data
                    if (cellData.action !== 'none') {
                        // Get color based on action and probability
                        const actionType = this.getActionType(cellData.action);
                        const actionColor = this.getActionColor(actionType);
                        const opacity = 0.7 + (cellData.probability / 100 * 0.3);

                        // Set background with opacity
                        const rgba = this.hexToRgba(actionColor, opacity);
                        cell.style.backgroundColor = rgba;

                        // Set text color based on action
                        if (actionType === 'call' && cellData.probability > 50) {
                            handText.style.color = 'white';
                        }

                        // Add the dominant action
                        if (cellData.probability > 0) {
                            const actionLine = document.createElement('div');
                            actionLine.className = 'action-line';
                            actionLine.textContent = `${this.abbreviateAction(cellData.action)}: ${cellData.probability}%`;
                            actionLine.style.fontSize = '0.8em';
                            actionLine.style.fontWeight = 'bold';
                            actionLine.style.marginBottom = '2px';
                            contentContainer.appendChild(actionLine);

                            if (actionType === 'call' && cellData.probability > 50) {
                                actionLine.style.color = 'white';
                            }
                        }

                        // Find second most likely action if significant
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
                                secondLine.className = 'second-action';
                                secondLine.textContent = `${this.abbreviateAction(sortedProbs[1].action)}: ${sortedProbs[1].value}%`;
                                secondLine.style.fontSize = '0.75em';
                                contentContainer.appendChild(secondLine);

                                if (actionType === 'call' && cellData.probability > 50) {
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
                        }
                    });

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

    // Adjust cell sizes to ensure they're square and properly displayed
    adjustCellSizes(container) {
        if (!container) return;

        // Calculate ideal cell size based on container width
        const containerWidth = container.clientWidth;
        const columns = 14; // 13 rank columns + 1 header column
        const cellSize = Math.floor((containerWidth / columns) - 2); // 2px for gap

        // Apply size to cells
        const cells = container.querySelectorAll('.matrix-cell, .matrix-header');
        cells.forEach(cell => {
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.fontSize = `${Math.max(8, Math.floor(cellSize / 6))}px`;
        });
    },

    // Display hand details
    displayHandDetails(handData, container) {
        container.innerHTML = '';

        if (!handData || handData.error) {
            container.innerHTML = `<p>${handData.error || 'No hand data available'}</p>`;
            return;
        }

        // Create details container with responsive design
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'details-container';
        detailsContainer.style.width = '100%';
        detailsContainer.style.overflow = 'auto';

        // Create header row
        const headerRow = document.createElement('div');
        headerRow.style.fontWeight = 'bold';
        headerRow.style.textAlign = 'center';
        headerRow.style.marginBottom = '8px';
        headerRow.style.padding = '4px';
        headerRow.style.backgroundColor = '#f0f0f0';
        headerRow.style.borderRadius = '4px';
        headerRow.textContent = `Hand Details: ${handData.hand}`;
        detailsContainer.appendChild(headerRow);

        // Create details table with proper styling
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        // Create header row
        const thead = document.createElement('thead');
        const headerTr = document.createElement('tr');

        // Hand header
        const handTh = document.createElement('th');
        handTh.textContent = 'Hand';
        handTh.style.padding = '4px';
        handTh.style.backgroundColor = '#f0f0f0';
        handTh.style.border = '1px solid #ddd';
        headerTr.appendChild(handTh);

        // Action headers
        handData.actions.forEach(action => {
            const actionTh = document.createElement('th');
            actionTh.textContent = action;
            actionTh.style.padding = '4px';
            actionTh.style.backgroundColor = this.getActionColor(this.getActionType(action));

            if (this.getActionType(action) === 'call') {
                actionTh.style.color = 'white';
            }

            actionTh.style.border = '1px solid #ddd';
            headerTr.appendChild(actionTh);
        });

        thead.appendChild(headerTr);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');

        // Add each combination
        handData.combinations.forEach((combo, index) => {
            const row = document.createElement('tr');
            row.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white';

            // Hand cell
            const handCell = document.createElement('td');
            handCell.textContent = combo.hand;
            handCell.style.padding = '4px';
            handCell.style.border = '1px solid #ddd';
            row.appendChild(handCell);

            // Probability cells
            combo.probabilities.forEach(prob => {
                const probCell = document.createElement('td');
                probCell.textContent = `${prob}%`;
                probCell.style.padding = '4px';
                probCell.style.border = '1px solid #ddd';
                probCell.style.textAlign = 'center';

                // Style based on probability value
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

        // Add average row
        const avgRow = document.createElement('tr');
        avgRow.style.fontWeight = 'bold';
        avgRow.style.backgroundColor = '#e0e0e0';

        // Average label
        const avgLabel = document.createElement('td');
        avgLabel.textContent = 'Average';
        avgLabel.style.padding = '4px';
        avgLabel.style.border = '1px solid #ddd';
        avgRow.appendChild(avgLabel);

        // Average values
        handData.average_probabilities.forEach(prob => {
            const avgCell = document.createElement('td');
            avgCell.textContent = `${prob}%`;
            avgCell.style.padding = '4px';
            avgCell.style.border = '1px solid #ddd';
            avgCell.style.textAlign = 'center';

            // Style based on probability value
            if (prob > 70) {
                avgCell.style.backgroundColor = this.getActionColor('check'); // Green
                avgCell.style.color = 'white';
            } else if (prob > 30) {
                avgCell.style.backgroundColor = this.getActionColor('bet'); // Orange
            } else if (prob > 0) {
                avgCell.style.backgroundColor = this.getActionColor('fold'); // Red
                avgCell.style.color = 'white';
            }

            avgRow.appendChild(avgCell);
        });

        tbody.appendChild(avgRow);
        table.appendChild(tbody);
        detailsContainer.appendChild(table);

        // Add info about combinations
        if (handData.combinations.length < handData.expected_combos) {
            const infoRow = document.createElement('div');
            infoRow.style.fontStyle = 'italic';
            infoRow.style.color = '#777';
            infoRow.style.marginTop = '8px';
            infoRow.style.padding = '4px';
            infoRow.textContent = `Note: Only ${handData.combinations.length} of ${handData.expected_combos} possible combinations found in data.`;
            detailsContainer.appendChild(infoRow);
        }

        container.appendChild(detailsContainer);
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