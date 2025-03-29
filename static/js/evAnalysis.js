// EV Analysis Component for Poker GTO Explorer

const evAnalysis = {
    // Update the EV analysis display
    updateEvAnalysis(evData, container) {
        container.innerHTML = '';

        if (!evData.has_strategy) {
            container.innerHTML = '<p>No EV data available for this node</p>';
            return;
        }

        // Action Frequencies Chart
        if (evData.actions && evData.action_frequencies) {
            const chartCard = document.createElement('div');
            chartCard.classList.add('strategy-card');

            const chartTitle = document.createElement('h4');
            chartTitle.textContent = 'Action Frequencies';
            chartCard.appendChild(chartTitle);

            // Create bar chart
            const chartContainer = document.createElement('div');
            chartContainer.classList.add('chart-container');

            // Find max frequency for scaling
            const frequencies = Object.values(evData.action_frequencies);
            const maxFreq = Math.max(...frequencies, 0.1);  // Avoid division by zero

            // Add a bar for each action
            evData.actions.forEach(action => {
                const frequency = evData.action_frequencies[action] || 0;

                // Calculate height (scale to max height of 150px)
                const height = Math.max(Math.round((frequency / maxFreq) * 150), 10);

                // Create bar container
                const barContainer = document.createElement('div');
                barContainer.classList.add('chart-bar-container');

                // Create the bar
                const bar = document.createElement('div');
                bar.classList.add('chart-bar');
                bar.style.height = `${height}px`;
                bar.style.backgroundColor = this.getActionColor(this.getActionType(action));
                barContainer.appendChild(bar);

                // Add action label
                const label = document.createElement('div');
                label.classList.add('chart-label');
                label.textContent = action;
                barContainer.appendChild(label);

                // Add frequency value
                const value = document.createElement('div');
                value.classList.add('chart-value');
                value.textContent = `${frequency.toFixed(1)}%`;
                barContainer.appendChild(value);

                chartContainer.appendChild(barContainer);
            });

            chartCard.appendChild(chartContainer);
            container.appendChild(chartCard);
        }

        // Hand Composition Card
        if (evData.hand_composition) {
            const composition = evData.hand_composition;

            const compositionCard = document.createElement('div');
            compositionCard.classList.add('strategy-card');

            const compositionTitle = document.createElement('h4');
            compositionTitle.textContent = 'Hand Composition';
            compositionCard.appendChild(compositionTitle);

            // Create composition table
            const tableContainer = document.createElement('table');
            tableContainer.style.width = '100%';
            tableContainer.style.borderCollapse = 'collapse';

            // Header row
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');

            ['Hand Type', 'Count', 'Percentage'].forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                th.style.padding = '8px';
                th.style.textAlign = 'left';
                th.style.borderBottom = '2px solid #eee';
                headerRow.appendChild(th);
            });

            thead.appendChild(headerRow);
            tableContainer.appendChild(thead);

            // Table body
            const tbody = document.createElement('tbody');

            // Pairs row
            const pairsRow = document.createElement('tr');

            const pairsType = document.createElement('td');
            pairsType.textContent = 'Pairs';
            pairsType.style.padding = '8px';

            const pairsCount = document.createElement('td');
            pairsCount.textContent = composition.pairs;
            pairsCount.style.padding = '8px';

            const pairsPct = document.createElement('td');
            pairsPct.textContent = composition.total > 0
                ? ((composition.pairs / composition.total) * 100).toFixed(1) + '%'
                : '0%';
            pairsPct.style.padding = '8px';

            pairsRow.appendChild(pairsType);
            pairsRow.appendChild(pairsCount);
            pairsRow.appendChild(pairsPct);
            tbody.appendChild(pairsRow);

            // Suited row
            const suitedRow = document.createElement('tr');
            suitedRow.style.backgroundColor = '#f9f9f9';

            const suitedType = document.createElement('td');
            suitedType.textContent = 'Suited';
            suitedType.style.padding = '8px';

            const suitedCount = document.createElement('td');
            suitedCount.textContent = composition.suited;
            suitedCount.style.padding = '8px';

            const suitedPct = document.createElement('td');
            suitedPct.textContent = composition.total > 0
                ? ((composition.suited / composition.total) * 100).toFixed(1) + '%'
                : '0%';
            suitedPct.style.padding = '8px';

            suitedRow.appendChild(suitedType);
            suitedRow.appendChild(suitedCount);
            suitedRow.appendChild(suitedPct);
            tbody.appendChild(suitedRow);

            // Offsuit row
            const offsuitRow = document.createElement('tr');

            const offsuitType = document.createElement('td');
            offsuitType.textContent = 'Offsuit';
            offsuitType.style.padding = '8px';

            const offsuitCount = document.createElement('td');
            offsuitCount.textContent = composition.offsuit;
            offsuitCount.style.padding = '8px';

            const offsuitPct = document.createElement('td');
            offsuitPct.textContent = composition.total > 0
                ? ((composition.offsuit / composition.total) * 100).toFixed(1) + '%'
                : '0%';
            offsuitPct.style.padding = '8px';

            offsuitRow.appendChild(offsuitType);
            offsuitRow.appendChild(offsuitCount);
            offsuitRow.appendChild(offsuitPct);
            tbody.appendChild(offsuitRow);

            // Total row
            const totalRow = document.createElement('tr');
            totalRow.style.fontWeight = 'bold';
            totalRow.style.borderTop = '2px solid #eee';

            const totalType = document.createElement('td');
            totalType.textContent = 'Total';
            totalType.style.padding = '8px';

            const totalCount = document.createElement('td');
            totalCount.textContent = composition.total;
            totalCount.style.padding = '8px';

            const totalPct = document.createElement('td');
            totalPct.textContent = '100%';
            totalPct.style.padding = '8px';

            totalRow.appendChild(totalType);
            totalRow.appendChild(totalCount);
            totalRow.appendChild(totalPct);
            tbody.appendChild(totalRow);

            tableContainer.appendChild(tbody);
            compositionCard.appendChild(tableContainer);
            container.appendChild(compositionCard);
        }

        // Strategy Tips Card
        if (evData.tips && evData.tips.length > 0) {
            const tipsCard = document.createElement('div');
            tipsCard.classList.add('strategy-card');

            const tipsTitle = document.createElement('h4');
            tipsTitle.textContent = 'Decision Tips';
            tipsCard.appendChild(tipsTitle);

            // Create list of tips
            const tipsList = document.createElement('ul');
            tipsList.classList.add('tips-list');

            evData.tips.forEach(tip => {
                const item = document.createElement('li');
                item.textContent = tip;
                tipsList.appendChild(item);
            });

            tipsCard.appendChild(tipsList);
            container.appendChild(tipsCard);
        }

        // Board Analysis Card
        if (evData.board_analysis && evData.board_analysis.length > 0) {
            const boardCard = document.createElement('div');
            boardCard.classList.add('strategy-card');

            const boardTitle = document.createElement('h4');
            boardTitle.textContent = 'Board Analysis';
            boardCard.appendChild(boardTitle);

            // Create list of analysis points
            const analysisList = document.createElement('ul');
            analysisList.classList.add('tips-list');

            evData.board_analysis.forEach(analysis => {
                const item = document.createElement('li');
                item.textContent = analysis;
                analysisList.appendChild(item);
            });

            boardCard.appendChild(analysisList);
            container.appendChild(boardCard);
        }
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
    }
};