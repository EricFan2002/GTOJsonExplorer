// Utility functions for Poker GTO Explorer

// Helper for getting suit symbols
function getSuitSymbol(suit) {
    const symbols = {
        'c': '♣',
        'd': '♦',
        'h': '♥',
        's': '♠'
    };
    return symbols[suit] || suit;
}

// Helper for getting action type
function getActionType(action) {
    if (action.includes('CHECK')) return 'check';
    if (action.includes('CALL')) return 'call';
    if (action.includes('BET')) return 'bet';
    if (action.includes('RAISE')) return 'raise';
    if (action.includes('FOLD')) return 'fold';
    return '';
}

// Format a card code (e.g., "Ac" -> "A♣")
function formatCard(card) {
    if (!card || card.length !== 2) return card;

    const rank = card[0];
    const suit = card[1];
    return `${rank}${getSuitSymbol(suit)}`;
}

// Format a board string (e.g., "AcKdQh" -> "A♣ K♦ Q♥")
function formatBoard(board) {
    if (!board) return "None";

    const formatted = [];
    for (let i = 0; i < board.length; i += 2) {
        if (i + 1 < board.length) {
            const rank = board[i];
            const suit = board[i + 1];
            formatted.push(`${rank}${getSuitSymbol(suit)}`);
        }
    }

    return formatted.join(' ');
}

// Abbreviate action for display
function abbreviateAction(action) {
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

// Get color for action type
function getActionColor(actionType) {
    const colors = {
        check: '#2ecc71',  // Green
        call: '#3498db',   // Blue
        bet: '#f39c12',    // Orange
        raise: '#e67e22',  // Darker orange
        fold: '#95a5a6'    // Gray
    };
    return colors[actionType] || '#cccccc';
}

// Convert hex color to rgba
function hexToRgba(hex, opacity) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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

// Add commas to large numbers
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Format currency
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

// Deep clone an object
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Check if two arrays contain the same elements
function arraysEqual(a, b) {
    if (a.length !== b.length) return false;

    const sortedA = [...a].sort();
    const sortedB = [...b].sort();

    for (let i = 0; i < sortedA.length; i++) {
        if (sortedA[i] !== sortedB[i]) return false;
    }

    return true;
}

// Simple cache for expensive operations
class SimpleCache {
    constructor(maxSize = 100) {
        this.cache = {};
        this.keys = [];
        this.maxSize = maxSize;
    }

    get(key) {
        return this.cache[key];
    }

    set(key, value) {
        // If key already exists, remove it so it will be added at the end
        const existingIndex = this.keys.indexOf(key);
        if (existingIndex >= 0) {
            this.keys.splice(existingIndex, 1);
        }

        // Add to cache
        this.cache[key] = value;
        this.keys.push(key);

        // Manage cache size
        if (this.keys.length > this.maxSize) {
            const oldestKey = this.keys.shift();
            delete this.cache[oldestKey];
        }

        return value;
    }

    has(key) {
        return key in this.cache;
    }

    clear() {
        this.cache = {};
        this.keys = [];
    }
}