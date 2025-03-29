// EV Analysis Component for Poker GTO Explorer - Fixed Version

const evAnalysis = {
    // Update the EV analysis display
    updateEvAnalysis(evData, container) {
        container.innerHTML = '';

        if (!evData.has_strategy) {
            container.innerHTML = '<p>No EV data available for this node</p>';
            return;
        }

        // Action Frequencies Chart (only shown in EV Analysis tab)
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

        // EV Analysis-specific content - avoid duplicating what's in other tabs
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

        // Only include board analysis here if it hasn't been shown elsewhere
        if (evData.board_analysis && evData.board_analysis.length > 0 && !document.querySelector('[data-board-analysis="true"]')) {
            const boardCard = document.createElement('div');
            boardCard.classList.add('strategy-card');
            boardCard.dataset.boardAnalysis = "true"; // Mark as shown

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