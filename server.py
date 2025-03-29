from flask import Flask, request, jsonify, render_template, send_from_directory
import json
import os
import tempfile
from werkzeug.utils import secure_filename
from tree_processor import GameTreeProcessor

app = Flask(__name__,
            static_url_path='',
            static_folder='static',
            template_folder='templates')

# Configuration
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max file size

# Temporary storage for the loaded trees
loaded_trees = {}


@app.route('/')
def index():
    """Serve the main application page"""
    return render_template('index.html')


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload and preprocessing"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            # Process the game tree
            processor = GameTreeProcessor(file_path)
            session_id = processor.get_session_id()
            loaded_trees[session_id] = processor

            # Return session ID and basic info
            return jsonify({
                'session_id': session_id,
                'filename': filename,
                'game_info': processor.get_game_info()
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            # Clean up the file
            os.remove(file_path)


@app.route('/api/tree/<session_id>', methods=['GET'])
def get_tree_structure(session_id):
    """Get the tree structure for rendering"""
    if session_id not in loaded_trees:
        return jsonify({'error': 'Session not found'}), 404

    processor = loaded_trees[session_id]
    return jsonify(processor.get_tree_structure())


@app.route('/api/node/<session_id>', methods=['GET'])
def get_node(session_id):
    """Get detailed information about a specific node"""
    if session_id not in loaded_trees:
        return jsonify({'error': 'Session not found'}), 404

    path = request.args.get('path', '')
    processor = loaded_trees[session_id]

    try:
        node_info = processor.get_node_info(path)
        return jsonify(node_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/strategy/<session_id>', methods=['GET'])
def get_strategy(session_id):
    """Get strategy information for a specific node"""
    if session_id not in loaded_trees:
        return jsonify({'error': 'Session not found'}), 404

    path = request.args.get('path', '')
    processor = loaded_trees[session_id]

    try:
        strategy_info = processor.get_strategy_info(path)
        return jsonify(strategy_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/hand_matrix/<session_id>', methods=['GET'])
def get_hand_matrix(session_id):
    """Get hand matrix data for a specific node"""
    if session_id not in loaded_trees:
        return jsonify({'error': 'Session not found'}), 404

    path = request.args.get('path', '')
    processor = loaded_trees[session_id]

    try:
        matrix_data = processor.get_hand_matrix_data(path)
        return jsonify(matrix_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ev_analysis/<session_id>', methods=['GET'])
def get_ev_analysis(session_id):
    """Get EV analysis data for a specific node"""
    if session_id not in loaded_trees:
        return jsonify({'error': 'Session not found'}), 404

    path = request.args.get('path', '')
    processor = loaded_trees[session_id]

    try:
        ev_data = processor.get_ev_analysis(path)
        return jsonify(ev_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/hand_details/<session_id>', methods=['GET'])
def get_hand_details(session_id):
    """Get detailed information about a specific hand at a node"""
    if session_id not in loaded_trees:
        return jsonify({'error': 'Session not found'}), 404

    path = request.args.get('path', '')
    hand = request.args.get('hand', '')
    processor = loaded_trees[session_id]

    try:
        hand_data = processor.get_hand_details(path, hand)
        return jsonify(hand_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/session/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Clean up a session when the user is done"""
    if session_id in loaded_trees:
        del loaded_trees[session_id]
        return jsonify({'status': 'success'})
    return jsonify({'error': 'Session not found'}), 404


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5100)
