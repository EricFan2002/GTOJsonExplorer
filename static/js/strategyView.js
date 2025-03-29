// Strategy View Component for Poker GTO Explorer

const strategyView = {
    // Update the rough strategy display
    updateRoughStrategy(strategyInfo, container) {
        container.innerHTML = '';

        if (!strategyInfo.has_strategy) {
            container.innerHTML = '<p>No strategy data available for this node</p>';
            return;
        }

        // Create action frequencies card
        if (strategyInfo.actions && strategyInfo.action_frequencies) {
            const actionsCard = document.createElement('div');
            actionsCard.classList.add('strategy-card');

            const actionsTitle = document.createElement('h4');
            actionsTitle.textContent = 'Action Frequencies';
            actionsCard.appendChild(actionsTitle);

            // Add action summaries
            const actions = strategyInfo.actions;

            actions.forEach(action => {
                const frequency = strategyInfo.action_frequencies[action] || 0;

                // Create action summary
                const actionSummary = document.createElement('div');
                actionSummary.classList.add('action-summary');

                // Action icon
                const actionType = this.getActionType(action);
                const icon = document.createElement('div');
                icon.classList.add('action-icon');
                icon.style.backgroundColor = this.getActionColor(actionType);
                icon.textContent = this.getActionSymbol(actionType);

                if (actionType === 'call') {
                    icon.style.color = 'white';
                }

                actionSummary.appendChild(icon);

                // Action name
                const name = document.createElement('div');
                name.classList.add('action-name');
                name.textContent = action;
                actionSummary.appendChild(name);

                // Action frequency
                const freq = document.createElement('div');
                freq.classList.add('action-freq');
                freq.textContent = `${frequency.toFixed(1)}%`;
                actionSummary.appendChild(freq);

                actionsCard.appendChild(actionSummary);

                // Progress bar
                const progressContainer = document.createElement('div');
                progressContainer.classList.add('progress-bar-container');

                const progressBar = document.createElement('div');
                progressBar.classList.add('progress-bar');
                progressBar.style.width = `${frequency}%`;
                progressBar.style.backgroundColor = this.getActionColor(actionType);

                progressContainer.appendChild(progressBar);
                actionsCard.appendChild(progressContainer);
            });

            container.appendChild(actionsCard);
        }

        // Create range composition card
        if (strategyInfo.hand_composition) {
            const composition = strategyInfo.hand_composition;

            const compositionCard = document.createElement('div');
            compositionCard.classList.add('strategy-card');

            const compositionTitle = document.createElement('h4');
            compositionTitle.textContent = 'Range Composition';
            compositionCard.appendChild(compositionTitle);

            // Create grid
            const grid = document.createElement('div');
            grid.classList.add('hand-composition-grid');

            // Labels row
            grid.appendChild(this.createCompositionLabel('Hand Type'));
            grid.appendChild(this.createCompositionLabel('Count'));
            grid.appendChild(this.createCompositionLabel('Percentage'));

            // Pairs row
            grid.appendChild(this.createCompositionLabel('Pairs'));
            grid.appendChild(document.createTextNode(composition.pairs));

            const pairsPct = composition.total > 0
                ? ((composition.pairs / composition.total) * 100).toFixed(1) + '%'
                : '0%';
            grid.appendChild(document.createTextNode(pairsPct));

            // Suited row
            grid.appendChild(this.createCompositionLabel('Suited'));
            grid.appendChild(document.createTextNode(composition.suited));

            const suitedPct = composition.total > 0
                ? ((composition.suited / composition.total) * 100).toFixed(1) + '%'
                : '0%';
            grid.appendChild(document.createTextNode(suitedPct));

            // Offsuit row
            grid.appendChild(this.createCompositionLabel('Offsuit'));
            grid.appendChild(document.createTextNode(composition.offsuit));

            const offsuitPct = composition.total > 0
                ? ((composition.offsuit / composition.total) * 100).toFixed(1) + '%'
                : '0%';
            grid.appendChild(document.createTextNode(offsuitPct));

            // Total row
            grid.appendChild(this.createCompositionLabel('Total', true));

            const totalValue = document.createElement('strong');
            totalValue.textContent = composition.total;
            grid.appendChild(totalValue);

            const totalPct = document.createElement('strong');
            totalPct.textContent = '100%';
            grid.appendChild(totalPct);

            compositionCard.appendChild(grid);
            container.appendChild(compositionCard);
        }

        // Create board analysis card if available
        if (strategyInfo.board_analysis && strategyInfo.board_analysis.length > 0) {
            const boardCard = document.createElement('div');
            boardCard.classList.add('strategy-card');

            const boardTitle = document.createElement('h4');
            boardTitle.textContent = 'Board Analysis';
            boardCard.appendChild(boardTitle);

            // Create list of analysis points
            const analysisList = document.createElement('ul');
            analysisList.classList.add('tips-list');

            strategyInfo.board_analysis.forEach(analysis => {
                const item = document.createElement('li');
                item.textContent = analysis;
                analysisList.appendChild(item);
            });

            boardCard.appendChild(analysisList);
            container.appendChild(boardCard);
        }
    },

    // Create a composition label
    createCompositionLabel(text, bold = false) {
        const label = document.createElement(bold ? 'strong' : 'div');
        label.classList.add('hand-composition-label');
        label.textContent = text;
        return label;
    },

    // Helper function to determine action type
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

    // Get symbol for action type
    getActionSymbol(actionType) {
        const symbols = {
            check: '✓',
            call: '⟳',
            bet: '⟐',
            raise: '↑',
            fold: '✕'
        };
        return symbols[actionType] || '';
    }
};