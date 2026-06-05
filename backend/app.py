from flask import Flask, jsonify, request
from flask import send_from_directory
from werkzeug.utils import secure_filename
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

import os
import pandas as pd

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
MODEL_NAME = 'bert_model'
TOKENIZER_NAME = 'bert_model_tokenizer'
preferences = {'love':0.20, 'sad':0.20, 'anger':0.20, 'happy':0.20, 'fear':0.20}
emotions_dict = {0 : 'love', 1: 'sad', 2: 'anger', 3:'happy', 4:'fear'}

tokenizer = AutoTokenizer.from_pretrained(f'./{TOKENIZER_NAME}')
model = AutoModelForSequenceClassification.from_pretrained(f'./{MODEL_NAME}',local_files_only=True,trust_remote_code=True)    

def return_emotions(p_text):
    inputs = tokenizer(p_text, return_tensors="pt", max_length=512, truncation=True)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits  # shape: [1, 5]

    probs = torch.nn.functional.softmax(logits, dim=-1)

    top_probs, top_indices = torch.topk(probs, k=2, dim=-1)

    top_probs = top_probs[0].tolist()
    top_indices = top_indices[0].tolist()

    return [(top_indices[0], top_probs[0]), (top_indices[1], top_probs[1])]

@app.route("/images/<author>/<song>")
def get_image(author, song):
    base_path = os.path.join(os.getcwd(), 'uploads')
    dir_path = os.path.join(base_path, f'{author}-{song}')

    if not os.path.exists(base_path):
        return jsonify({'error': 'uploads folder not found'}), 404

    if not os.path.exists(dir_path):
        return jsonify({'error': 'directory not found'}), 404

    for filename in os.listdir(dir_path):
        if 'thumbnail' in filename.lower(): 
            return send_from_directory(directory=dir_path, path=filename)

    return jsonify({'error': 'thumbnail file not found'}), 404

@app.route("/audio/<author>/<song>")
def get_audio(author, song):
    base_path = os.path.join(os.getcwd(), 'uploads')
    dir_path = os.path.join(base_path, f'{author}-{song}')

    if not os.path.exists(base_path):
        return jsonify({'error': 'uploads folder not found'}), 404

    if not os.path.exists(dir_path):
        return jsonify({'error': 'directory not found'}), 404

    for filename in os.listdir(dir_path):
        if filename.lower().endswith(('.mp3', '.wav', '.ogg')):
            return send_from_directory(directory=dir_path, path=filename)

    return jsonify({'error': 'thumbnail file not found'}), 404


@app.route("/get-songs", methods=['GET'])
def get_songs():
    songs = []

    base_path = os.path.join(os.getcwd(), 'uploads')

    if not os.path.exists(base_path):
        return jsonify({'error': 'uploads folder not found'}), 404

    for dir_name in os.listdir(base_path):
        dir_path = os.path.join(base_path, dir_name)

        if not os.path.isdir(dir_path):
            continue

        try:
            artist, song = dir_name.strip().split('-', 1)
        except ValueError:
          
            continue

        processed_file = os.path.join(dir_path, 'processed.csv')
        if not os.path.exists(processed_file):
            continue

        try:
            with open(processed_file, 'r', encoding='utf-8', errors='ignore') as f:
                df = pd.read_csv(f)

                if df.empty:
                    continue

                lyrics = df['lyrics'][0]
                sentiment1 = df['sentiment1'][0]
                sentiment2 = df['sentiment2'][0]

                songs.append({
                    'artist': artist.strip(),
                    'song': song.strip(),
                    'lyrics': lyrics,
                    'sentiment1': sentiment1,
                    'sentiment2': sentiment2
                })

        except Exception as e:
            print(f"Error reading {processed_file}: {e}")
            continue

    return jsonify(songs)


@app.route('/upload', methods=['POST'])
def upload():
    author = request.form.get('author')
    song = request.form.get('song')
    lyrics = request.form.get('lyrics')
    audio = request.files.get('audio')
    image = request.files.get('image')
    
    if not all([author, song, lyrics, audio, image]):
        return jsonify({'error': 'All fields are required'}), 400
    
    folder_name = f"{author.strip()}-{song.strip()}"
    folder_name = folder_name.replace("_"," ")
    target_path = os.path.join(UPLOAD_FOLDER, folder_name)
    os.makedirs(target_path, exist_ok=True)

    lyrics_path = os.path.join(target_path, 'lyrics.txt')
    with open(lyrics_path, 'w', encoding='utf-8') as f:
        f.write(lyrics)

    audio_ext = os.path.splitext(audio.filename)[1]
    audio_path = os.path.join(target_path, f"song{audio_ext}")
    audio.save(audio_path)

    image_ext = os.path.splitext(image.filename)[1]
    image_path = os.path.join(target_path, f"thumbnail{image_ext}")
    image.save(image_path)

    primary_tuple, secondary_tuple = return_emotions(lyrics)
    primary_emotion, primary_prob = primary_tuple
    secondary_emotion, secondary_prob = secondary_tuple
    print('PROBS', primary_prob, secondary_prob)

    named_primary_emotion = emotions_dict[primary_emotion]
    named_secondary_emotion = emotions_dict[secondary_emotion]
    if secondary_prob < 0.25:
        named_secondary_emotion = 'none'


    row = pd.DataFrame([{
    "lyrics": lyrics,
    "sentiment1": named_primary_emotion,
    "sentiment2": named_secondary_emotion
}])

    emotions_path = os.path.join(target_path, f"processed.csv")

    row.to_csv(emotions_path, index=False, encoding='utf-8')

    return jsonify({'message': 'Upload successful'}), 200

@app.route('/update-preferences', methods=['PATCH'])
def update_preferences():
    total_listened = request.form.get('total_listened')
    duration = request.form.get('song_length')
    primary = request.form.get('primary_emotion')
    secondary = request.form.get('secondary_emotion')

    if not primary or not secondary or not total_listened or not duration:
        return jsonify({"error": "Missing required data"}), 400
    
    total_listened = float(total_listened)
    duration = float(duration)

    listen_ratio = min(total_listened / duration, 1.0)
    time_factor = min(duration / 120, 1.0)
    time_factor = max(time_factor, 1.5)

    # Determine deltas based on engagement
    if listen_ratio >= 0.8:
        delta_p = 0.15
        delta_s = 0.075
    elif listen_ratio >= 0.4:
        delta_p = 0.08
        delta_s = 0.04
    elif listen_ratio >= 0.1:
        delta_p = 0.02
        delta_s = 0.01
    else:
        delta_p = -0.02
        delta_s = -0.01

    replay_factor = total_listened / duration
    if replay_factor > 1.5:
        bonus = (replay_factor - 1.0) * 0.025
        delta_p += bonus
        delta_s += bonus / 2

    preferences[primary] = preferences.get(primary, 0.05) + delta_p * listen_ratio * time_factor
    if secondary != 'none':
        preferences[secondary] = preferences.get(secondary, 0.05) + delta_s * listen_ratio * time_factor

    print('### Early preferences: ', preferences)

    # all values >= 5%
    for emotion in preferences:
        preferences[emotion] = min(round(preferences[emotion], 3), 0.75)
        preferences[emotion] = max(preferences[emotion], 0.05)

    # normalize so total = 1.0
    total = sum(preferences.values())
    for emotion in preferences:
        preferences[emotion] = round(preferences[emotion] / total, 3)

    print('###Preferences: ', preferences)

    return jsonify({"preferences": preferences})

@app.route('/get-preferences')
def get_preferences():
    return jsonify({"preferences": preferences})
