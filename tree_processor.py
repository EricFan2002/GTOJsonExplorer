import json
import uuid
import numpy as np
from collections import defaultdict


class GameTreeProcessor:
    """
    Processes poker solver game trees for the web application.
    Handles tree parsing, navigation, and data extraction.
    """

    def __init__(self, file_path):
        """Initialize with a game tree JSON file"""
        with open(file_path, 'r') as f:
            self.game_tree = json.load(f)

        # Generate a unique session ID
        self.session_id = str(uuid.uuid4())

        # Memoization for performance
        self.node_cache = {}

    def get_session_id(self):
        """Return the session ID for this processor"""
        return self.session_id

    def get_game_info(self):
        """Extract and return basic game information"""
        info = {
            "game_type": "No Limit Hold'em",
            "position": "In Position" if self.get_player_at_root() == 0 else "Out of Position"
        }

        # Try to extract more info
        if "player" in self.game_tree:
            info["starting_player"] = self.game_tree["player"]

        if "pot" in self.game_tree:
            info["starting_pot"] = round(self.game_tree["pot"], 2)
        elif "potSize" in self.game_tree:
            info["starting_pot"] = round(self.game_tree["potSize"], 2)

        if "board" in self.game_tree:
            info["board"] = self.format_board(self.game_tree["board"])
        else:
            info["board"] = "None (Preflop)"

        # Count decision points
        info["decision_points"] = self.count_decision_points()

        return info

    def get_player_at_root(self):
        """Determine which player is active at the root node"""
        if "player" in self.game_tree:
            return self.game_tree["player"]
        return 0  # Default to player 0

    def format_board(self, board):
        """Format the board cards nicely"""
        if not board:
            return "None"

        formatted = []
        for i in range(0, len(board), 2):
            if i+1 < len(board):
                rank, suit = board[i], board[i+1]
                suit_symbol = self.get_suit_symbol(suit)
                formatted.append(f"{rank}{suit_symbol}")

        return " ".join(formatted)

    def get_suit_symbol(self, suit):
        """Return the symbol for a suit"""
        symbols = {'c': '♣', 'd': '♦', 'h': '♥', 's': '♠'}
        return symbols.get(suit, suit)

    def count_decision_points(self):
        """Estimate the number of decision points in the tree"""
        def count_nodes(node, visited=None):
            if visited is None:
                visited = set()

            if not isinstance(node, dict):
                return 0

            node_id = id(node)
            if node_id in visited:
                return 0

            visited.add(node_id)
            count = 1 if "actions" in node else 0

            # Count children from actions
            if "childrens" in node and "actions" in node:
                for action in node["actions"]:
                    if action in node["childrens"]:
                        count += count_nodes(node["childrens"][action], visited)

            # Count children from dealcards
            if "dealcards" in node:
                for card, child in node["dealcards"].items():
                    count += count_nodes(child, visited)

            return count

        return count_nodes(self.game_tree)

    def get_tree_structure(self):
        """Generate a simplified tree structure for the frontend"""
        def build_tree(node, path="", depth=0, max_depth=15):
            # Prevent too deep recursion
            if depth > max_depth:
                return {"name": "... (max depth reached)", "path": path}

            result = {}

            # Node info
            if "node_type" in node:
                result["node_type"] = node["node_type"]
            if "player" in node:
                result["player"] = node["player"]

            # Add path for navigation
            result["path"] = path

            # Children (actions)
            children = []

            if "actions" in node:
                for action in node["actions"]:
                    action_path = f"{path}/childrens/{action}" if path else f"/childrens/{action}"
                    child = {
                        "name": action,
                        "path": action_path,
                        "type": "action"
                    }

                    # Only recurse if this action has children and we're not too deep
                    if "childrens" in node and action in node["childrens"] and depth < max_depth - 1:
                        child["children"] = [build_tree(node["childrens"][action], action_path, depth+1, max_depth)]

                    children.append(child)

            # Children (dealcards)
            if "dealcards" in node:
                cards_path = f"{path}/dealcards"
                cards_node = {
                    "name": "Cards",
                    "path": cards_path,
                    "type": "cards",
                    "children": []
                }

                # Only add a few cards as examples if there are many
                card_items = list(node["dealcards"].items())
                if len(card_items) > 10:
                    # Just show a few examples
                    card_items = card_items[:10]
                    has_more = True
                else:
                    has_more = False

                for card, card_node in card_items:
                    card_path = f"{cards_path}/{card}"
                    formatted_card = f"{card[0]}{self.get_suit_symbol(card[1])}" if len(card) == 2 else card
                    card_child = {
                        "name": formatted_card,
                        "path": card_path,
                        "type": "card",
                        "suit": card[1] if len(card) == 2 else None
                    }

                    # Only recurse if we're not too deep
                    if depth < max_depth - 1:
                        card_child["children"] = [build_tree(card_node, card_path, depth+1, max_depth)]

                    cards_node["children"].append(card_child)

                if has_more:
                    cards_node["children"].append({
                        "name": "... more cards",
                        "path": cards_path,
                        "type": "more_cards"
                    })

                children.append(cards_node)

            result["children"] = children
            return result

        return build_tree(self.game_tree)

    def find_node_by_path(self, path):
        """Find a node in the game tree by its path"""
        # Check cache first
        if path in self.node_cache:
            return self.node_cache[path]

        if not path or not self.game_tree:
            return self.game_tree

        parts = [p for p in path.split('/') if p]
        node = self.game_tree

        i = 0
        while i < len(parts):
            part = parts[i]

            if part == "childrens" and i+1 < len(parts):
                # Next part is the action
                action = parts[i+1]
                if "childrens" in node and action in node["childrens"]:
                    node = node["childrens"][action]
                    i += 2  # Skip both "childrens" and the action name
                else:
                    return None
            elif part == "dealcards" and i+1 < len(parts):
                # Next part is the card
                card = parts[i+1]
                if "dealcards" in node and card in node["dealcards"]:
                    node = node["dealcards"][card]
                    i += 2  # Skip both "dealcards" and the card name
                else:
                    return None
            elif part in node:
                node = node[part]
                i += 1
            else:
                return None

        # Store in cache
        self.node_cache[path] = node
        return node

    def get_node_info(self, path):
        """Get detailed information about a node"""
        node = self.find_node_by_path(path)
        if not node:
            raise ValueError(f"Node not found at path: {path}")

        info = {}

        # Basic node info
        if "node_type" in node:
            info["node_type"] = node["node_type"]

        if "player" in node:
            info["player"] = node["player"]

        if "board" in node:
            info["board"] = self.format_board(node["board"])

        if "pot" in node:
            info["pot"] = round(node["pot"], 2)
        elif "potSize" in node:
            info["pot"] = round(node["potSize"], 2)

        if "deal_number" in node:
            info["deal_number"] = node["deal_number"]

        # Available actions
        if "actions" in node:
            info["actions"] = node["actions"]

        # Dealcards info
        if "dealcards" in node:
            info["dealcards_count"] = len(node["dealcards"])

            # Just include the card keys, not all the children
            info["dealcards"] = list(node["dealcards"].keys())

        # Has strategy?
        info["has_strategy"] = "strategy" in node

        # Add path for reference
        info["path"] = path

        return info

    def get_strategy_info(self, path):
        """Get strategy information for a node"""
        node = self.find_node_by_path(path)
        if not node:
            raise ValueError(f"Node not found at path: {path}")

        if "strategy" not in node:
            return {"has_strategy": False}

        strategy = node["strategy"]

        # Basic strategy info
        result = {
            "has_strategy": True,
            "node_type": node.get("node_type", "unknown"),
            "player": node.get("player", "unknown"),
            "board": self.format_board(node.get("board", ""))
        }

        if "actions" not in strategy:
            return result

        # Add actions
        result["actions"] = strategy["actions"]

        # Add aggregated strategy stats if available
        if "strategy" in strategy:
            hand_strategies = strategy["strategy"]

            # Calculate action frequencies
            action_totals = defaultdict(float)
            action_counts = defaultdict(int)

            for _, probs in hand_strategies.items():
                for i, prob in enumerate(probs):
                    if i < len(strategy["actions"]):
                        action = strategy["actions"][i]
                        action_totals[action] += float(prob)
                        action_counts[action] += 1

            action_frequencies = {}
            for action in strategy["actions"]:
                if action_counts[action] > 0:
                    action_frequencies[action] = round(action_totals[action] / action_counts[action] * 100, 2)
                else:
                    action_frequencies[action] = 0

            result["action_frequencies"] = action_frequencies

            # Count hand types
            pairs_count = 0
            suited_count = 0
            offsuit_count = 0

            for hand_key in hand_strategies.keys():
                if len(hand_key) == 4:
                    rank1, suit1, rank2, suit2 = hand_key[0], hand_key[1], hand_key[2], hand_key[3]
                    if rank1 == rank2:
                        pairs_count += 1
                    elif suit1 == suit2:
                        suited_count += 1
                    else:
                        offsuit_count += 1

            total_hands = pairs_count + suited_count + offsuit_count
            result["hand_composition"] = {
                "pairs": pairs_count,
                "suited": suited_count,
                "offsuit": offsuit_count,
                "total": total_hands
            }

            # Only return aggregated stats to keep response size manageable
            result["has_hand_strategies"] = True

            # Board analysis if applicable
            if "board" in node:
                result["board_analysis"] = self.analyze_board_texture(node["board"])

        return result

    def get_hand_matrix_data(self, path):
        """Generate data for the hand matrix visualization"""
        node = self.find_node_by_path(path)
        if not node or "strategy" not in node:
            return {"has_strategy": False}

        strategy = node["strategy"]
        if "actions" not in strategy or "strategy" not in strategy:
            return {"has_strategy": False}

        actions = strategy["actions"]
        hand_strategies = strategy["strategy"]

        # Define the hand rankings for the grid
        ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

        matrix_data = {
            "has_strategy": True,
            "actions": actions,
            "ranks": ranks,
            "cells": []
        }

        # Generate all possible hand combinations
        for i, rank1 in enumerate(ranks):
            for j, rank2 in enumerate(ranks):
                hand_text = ""
                solver_hands = []

                if i == j:  # Pairs (AA, KK, etc.)
                    hand_text = f"{rank1}{rank1}"
                    hand_type = "pair"
                    for s1 in ['c', 'd', 'h', 's']:
                        for s2 in ['c', 'd', 'h', 's']:
                            if s1 < s2:  # Avoid duplicates (AcAd = AdAc)
                                solver_hands.append(f"{rank1}{s1}{rank1}{s2}")

                elif i < j:  # Suited hands (AKs, AQs, etc.)
                    hand_text = f"{rank1}{rank2}s"
                    hand_type = "suited"
                    for suit in ['c', 'd', 'h', 's']:
                        solver_hands.append(f"{rank1}{suit}{rank2}{suit}")

                else:  # Offsuit hands (AKo, AQo, etc.)
                    hand_text = f"{rank1}{rank2}o"
                    hand_type = "offsuit"
                    for s1 in ['c', 'd', 'h', 's']:
                        for s2 in ['c', 'd', 'h', 's']:
                            if s1 != s2:
                                solver_hands.append(f"{rank1}{s1}{rank2}{s2}")

                # Find matching hands in the strategy
                matching_hands = []
                for solver_hand in solver_hands:
                    for hand_key in hand_strategies.keys():
                        if self.match_hands(solver_hand, hand_key):
                            matching_hands.append((hand_key, hand_strategies[hand_key]))
                            break  # Found a match for this solver hand

                if matching_hands:
                    # Calculate average probabilities
                    total_probs = np.zeros(len(actions))
                    for _, probs in matching_hands:
                        total_probs += np.array(probs)
                    avg_probs = total_probs / len(matching_hands)

                    # Find the dominant action
                    max_idx = np.argmax(avg_probs)
                    max_prob = float(avg_probs[max_idx])
                    max_action = actions[max_idx]

                    # Format for client
                    cell = {
                        "row": i,
                        "col": j,
                        "hand": hand_text,
                        "type": hand_type,
                        "action": max_action,
                        "probability": round(max_prob * 100, 1),
                        "probabilities": [round(float(p) * 100, 1) for p in avg_probs]
                    }
                else:
                    # No strategy data for this hand
                    cell = {
                        "row": i,
                        "col": j,
                        "hand": hand_text,
                        "type": hand_type,
                        "action": "none",
                        "probability": 0,
                        "probabilities": []
                    }

                matrix_data["cells"].append(cell)

        return matrix_data

    def get_hand_details(self, path, hand_text):
        """Get detailed information about a specific hand"""
        node = self.find_node_by_path(path)
        if not node or "strategy" not in node:
            return {"error": "No strategy data available"}

        strategy = node["strategy"]
        if "actions" not in strategy or "strategy" not in strategy:
            return {"error": "No detailed strategy data available"}

        actions = strategy["actions"]
        hand_strategies = strategy["strategy"]

        # Parse the hand text to get solver hands
        solver_hands = self.get_solver_hands_for_hand_text(hand_text)
        if not solver_hands:
            return {"error": f"Invalid hand format: {hand_text}"}

        # Find matching hands in the strategy
        matching_hands = []
        for solver_hand in solver_hands:
            for hand_key in hand_strategies.keys():
                if self.match_hands(solver_hand, hand_key):
                    matching_hands.append((hand_key, hand_strategies[hand_key]))

        if not matching_hands:
            return {"error": f"No strategy data found for hand: {hand_text}"}

        # Format the result
        result = {
            "hand": hand_text,
            "actions": actions,
            "combinations": []
        }

        # Add details for each specific hand combination
        for hand_key, probs in matching_hands:
            formatted_hand = self.format_specific_hand(hand_key)
            combo = {
                "hand": formatted_hand,
                "probabilities": [round(float(p) * 100, 1) for p in probs]
            }
            result["combinations"].append(combo)

        # Calculate average probabilities
        total_probs = np.zeros(len(actions))
        for _, probs in matching_hands:
            total_probs += np.array(probs)
        avg_probs = total_probs / len(matching_hands)
        result["average_probabilities"] = [round(float(p) * 100, 1) for p in avg_probs]

        # Calculate expected combos
        if 's' in hand_text:
            result["expected_combos"] = 4
        elif 'o' in hand_text:
            result["expected_combos"] = 12
        else:  # Pair
            result["expected_combos"] = 6

        return result

    def get_solver_hands_for_hand_text(self, hand_text):
        """Convert a hand text like 'AKs' to a list of specific solver hands"""
        solver_hands = []

        if len(hand_text) < 2:
            return []

        # Check if it's a pair (AA, KK, etc.)
        if len(hand_text) == 2 and hand_text[0] == hand_text[1]:
            rank = hand_text[0]
            for s1 in ['c', 'd', 'h', 's']:
                for s2 in ['c', 'd', 'h', 's']:
                    if s1 < s2:  # Avoid duplicates (AcAd = AdAc)
                        solver_hands.append(f"{rank}{s1}{rank}{s2}")

        # Check if it's a suited hand (AKs, AQs, etc.)
        elif len(hand_text) == 3 and hand_text[2] == 's':
            rank1, rank2 = hand_text[0], hand_text[1]
            for suit in ['c', 'd', 'h', 's']:
                solver_hands.append(f"{rank1}{suit}{rank2}{suit}")

        # Check if it's an offsuit hand (AKo, AQo, etc.)
        elif len(hand_text) == 3 and hand_text[2] == 'o':
            rank1, rank2 = hand_text[0], hand_text[1]
            for s1 in ['c', 'd', 'h', 's']:
                for s2 in ['c', 'd', 'h', 's']:
                    if s1 != s2:
                        solver_hands.append(f"{rank1}{s1}{rank2}{s2}")

        return solver_hands

    def format_specific_hand(self, hand_key):
        """Format a specific hand combination for display"""
        if len(hand_key) != 4:
            return hand_key

        rank1, suit1, rank2, suit2 = hand_key[0], hand_key[1], hand_key[2], hand_key[3]
        suit_symbols = {'c': '♣', 'd': '♦', 'h': '♥', 's': '♠'}

        return f"{rank1}{suit_symbols.get(suit1, suit1)}{rank2}{suit_symbols.get(suit2, suit2)}"

    def get_ev_analysis(self, path):
        """Generate data for EV analysis visualization"""
        node = self.find_node_by_path(path)
        if not node or "strategy" not in node:
            return {"has_strategy": False}

        strategy = node["strategy"]
        if "actions" not in strategy or "strategy" not in strategy:
            return {"has_strategy": False}

        actions = strategy["actions"]
        hand_strategies = strategy["strategy"]

        # Calculate action frequencies
        action_totals = defaultdict(float)
        action_counts = defaultdict(int)

        for _, probs in hand_strategies.items():
            for i, prob in enumerate(probs):
                if i < len(actions):
                    action = actions[i]
                    action_totals[action] += float(prob)
                    action_counts[action] += 1

        action_frequencies = {}
        for action in actions:
            if action_counts[action] > 0:
                action_frequencies[action] = round(action_totals[action] / action_counts[action] * 100, 2)
            else:
                action_frequencies[action] = 0

        # Count hand types
        pairs_count = 0
        suited_count = 0
        offsuit_count = 0

        for hand_key in hand_strategies.keys():
            if len(hand_key) == 4:
                rank1, suit1, rank2, suit2 = hand_key[0], hand_key[1], hand_key[2], hand_key[3]
                if rank1 == rank2:
                    pairs_count += 1
                elif suit1 == suit2:
                    suited_count += 1
                else:
                    offsuit_count += 1

        total_hands = pairs_count + suited_count + offsuit_count

        # Analysis tips
        tips = []

        # Find most common action
        most_common_action = max(action_frequencies.items(), key=lambda x: x[1])[0]
        most_common_pct = action_frequencies[most_common_action]
        tips.append(f"Most frequent action: {most_common_action} ({most_common_pct:.1f}%)")

        # Check for polarization
        if len(actions) >= 2:
            sorted_actions = sorted(action_frequencies.items(), key=lambda x: x[1], reverse=True)
            if len(sorted_actions) >= 2:
                if sorted_actions[0][1] > 50 and sorted_actions[1][1] > 30:
                    tips.append(f"Strategy is polarized between {sorted_actions[0][0]} and {sorted_actions[1][0]}")
                elif sorted_actions[0][1] > 70:
                    tips.append(f"Strategy strongly favors {sorted_actions[0][0]}")

        # Board analysis if applicable
        board_analysis = None
        if "board" in node:
            board_analysis = self.analyze_board_texture(node["board"])

        return {
            "has_strategy": True,
            "actions": actions,
            "action_frequencies": action_frequencies,
            "hand_composition": {
                "pairs": pairs_count,
                "suited": suited_count,
                "offsuit": offsuit_count,
                "total": total_hands
            },
            "tips": tips,
            "board_analysis": board_analysis
        }

    def analyze_board_texture(self, board):
        """Analyze the board texture and return analysis"""
        if not board or len(board) < 2:
            return []

        # Parse the board
        cards = []
        for i in range(0, len(board), 2):
            if i+1 < len(board):
                rank, suit = board[i], board[i+1]
                cards.append((rank, suit))

        if not cards:
            return []

        # Analyze texture
        analysis = []

        # Count suits
        suits = [card[1] for card in cards]
        suit_counts = {}
        for suit in suits:
            suit_counts[suit] = suit_counts.get(suit, 0) + 1

        # Check for flush possibility
        flush_suit = None
        for suit, count in suit_counts.items():
            if count >= 3:
                flush_suit = suit
                analysis.append(f"Flush draw possible ({count} {self.get_suit_symbol(suit)} cards)")

        # Count ranks
        ranks = [card[0] for card in cards]
        rank_counts = {}
        for rank in ranks:
            rank_counts[rank] = rank_counts.get(rank, 0) + 1

        # Check for pairs
        pairs = [rank for rank, count in rank_counts.items() if count >= 2]
        if pairs:
            if len(pairs) == 1 and rank_counts[pairs[0]] == 2:
                analysis.append(f"Paired board ({pairs[0]})")
            elif len(pairs) == 1 and rank_counts[pairs[0]] == 3:
                analysis.append(f"Trips on board ({pairs[0]})")
            elif len(pairs) == 2:
                analysis.append(f"Two pair on board ({pairs[0]} and {pairs[1]})")
            elif len(pairs) == 1 and rank_counts[pairs[0]] == 4:
                analysis.append(f"Quads on board ({pairs[0]})")

        # Check for straight possibilities
        rank_values = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14
        }

        board_values = sorted([rank_values.get(r, 0) for r in ranks])
        if len(board_values) >= 3:
            if board_values[-1] - board_values[0] <= 4:
                analysis.append("Connected board (straight possible)")
            elif len(board_values) >= 3 and (board_values[-1] - board_values[1] <= 4 or board_values[-2] - board_values[0] <= 4):
                analysis.append("Semi-connected board")

        # Board high card
        if len(ranks) > 0:
            high_ranks = {
                'A': 'Ace', 'K': 'King', 'Q': 'Queen', 'J': 'Jack', 'T': 'Ten'
            }
            high_card_ranks = [r for r in ranks if r in high_ranks]
            if high_card_ranks:
                high_card = max(high_card_ranks, key=lambda x: rank_values.get(x, 0))
                analysis.append(f"High card: {high_ranks.get(high_card, high_card)}")

        # Overall texture
        if len(analysis) == 0:
            analysis.append("Dry board texture")

        return analysis

    def match_hands(self, solver_hand, hand_key):
        """Check if two hand representations match"""
        if len(solver_hand) != 4 or len(hand_key) != 4:
            return False

        rank1, suit1, rank2, suit2 = solver_hand[0], solver_hand[1], solver_hand[2], solver_hand[3]
        kr1, ks1, kr2, ks2 = hand_key[0], hand_key[1], hand_key[2], hand_key[3]

        # Quick exact check
        if solver_hand == hand_key:
            return True

        # Rank matching ignoring order
        ranks_match = (
            (rank1 == kr1 and rank2 == kr2) or
            (rank1 == kr2 and rank2 == kr1)
        )
        if not ranks_match:
            return False

        # Pair check
        if rank1 == rank2 and kr1 == kr2:
            # same pair, check suit combos
            if (suit1 == ks1 and suit2 == ks2) or (suit1 == ks2 and suit2 == ks1):
                return True
            return False

        # suited check
        if suit1 == suit2 and ks1 == ks2:
            return True

        # offsuit check
        if suit1 != suit2 and ks1 != ks2:
            # same pattern of suits?
            return (
                (suit1 == ks1 and suit2 == ks2) or
                (suit1 == ks2 and suit2 == ks1)
            )
        return False
