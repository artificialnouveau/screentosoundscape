#%%
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from elevenlabs.client import ElevenLabs
import pygame
import pyttsx3
from pydub import AudioSegment
from pydub.playback import play
import os
import time
from dotenv import load_dotenv
import pandas as pd
pd.set_option("display.max_rows", 1000)
pd.set_option("display.expand_frame_repr", True)
pd.set_option('display.width', 1000)
pd.set_option("display.max_colwidth", 1000)
load_dotenv()

load_dotenv('ELEVENLABS_API_KEY.env')
api_key = os.getenv('ELEVENLABS_API_KEY')
client = ElevenLabs(api_key=api_key)

voice_mapping = {
    'article': 'Alice', 
    'figcaption': 'Callum', 'figure': 'Callum', 
    'footer': 'Alice',
    'header': 'Alice', 
    'main': 'Alice', 
    'mark': 'Alice', 
    'section': 'Callum', 
    'summary': 'Callum',
    'time': 'Liam', 
    'h1': 'Alice', 'h2': 'Alice', 'h3': 'Alice', 'h4': 'Alice',
    'h5': 'Alice', 'h6': 'Alice', 
    'p': 'Callum', 
    'b': 'Callum', 'i': 'Callum',
    'u': 'Callum', 'code': 'Grace', 'default': 'Alice'
}


#%%
def download_webpage(url):
    response = requests.get(url)
    response.raise_for_status()  # Raises an HTTPError for bad responses
    return response.text

def apply_spatial_effects(sound, index, total):
    # Reduce volume by 3 dB
    sound = sound - 3
    position_scale = index / max(1, total - 1)
    if position_scale < 0.5:
        # Sounds from the top (panned right, high-pass filter)
        sound = sound.high_pass_filter(3000)
        pan = 1 - position_scale * 2
    else:
        # Sounds from the bottom (panned left, low-pass filter)
        sound = sound.low_pass_filter(3000)
        pan = (position_scale - 0.5) * 2 - 1  # Pan more to the left for bottom
    sound = sound.pan(pan)
    return sound


def format_filename(url):
    parsed_url = urlparse(url)
    domain = parsed_url.netloc.split('.')[1]  # Extract domain (e.g., 'wikipedia')
    path = parsed_url.path.strip('/').replace('/', '_').replace(' ', '_')  # Format path
    filename = f"{domain}_{path}"
    return filename

def get_line_number(tag, html_content):
    """Get the line number of a tag in the HTML content."""
    start = html_content.find(str(tag))
    return html_content.count('\n', 0, start) + 1

def play_audio_sequence(audio_files, playback_speed, delay=1.5):
    pygame.mixer.init()
    for audio_file in audio_files:
        pygame.mixer.music.load(audio_file)
        pygame.mixer.music.play()
        while pygame.mixer.music.get_busy():
            pygame.time.delay(int(100 / playback_speed))
        time.sleep(delay / playback_speed)
        pygame.mixer.music.stop()

def parse_and_generate_audio(html_content, url, selected_tags=None, generate_audio=True, 
                             character_limit=None, apply_effects=True, save_combined=None, 
                             play_audio=False, playback_speed=1.0, overwrite=False, text=False):
    semantic_tags = ['article', 'figcaption', 'figure', 'footer', 'header', 'main', 'mark', 
                     'section', 'summary', 'time', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                     'p', 'b', 'i', 'u', 'code']

    voice_mapping = {
        'article': 'Alice', 'figcaption': 'Callum', 'figure': 'Callum', 'footer': 'Alice',
        'header': 'Alice', 'main': 'Alice', 'mark': 'Alice', 'section': 'Callum', 'summary': 'Callum',
        'time': 'Liam', 'h1': 'Alice', 'h2': 'Alice', 'h3': 'Alice', 'h4': 'Alice', 'h5': 'Alice', 'h6': 'Alice', 
        'p': 'Callum', 'b': 'Callum', 'i': 'Callum', 'u': 'Callum', 'code': 'Grace', 'default': 'Alice'
    }

    soup = BeautifulSoup(html_content, 'html.parser')
    tags_to_process = soup.find_all(selected_tags if selected_tags else semantic_tags)

    if not tags_to_process:
        print("No tags found for processing. Please check the HTML content or the tag selection.")
        return

    combined_audio = AudioSegment.silent(duration=1000)
    audio_files = []
    used_characters = 0

    audio_dir = f'.../ScreenToSoundscape/audio_samples/{format_filename(url)}'
    os.makedirs(audio_dir, exist_ok=True)

    with open(os.path.join(audio_dir, f"{format_filename(url)}_content.html"), 'w', encoding='utf-8') as html_file:
        html_file.write(html_content)

    for tag in tags_to_process:
        text_content = tag.get_text(strip=True)
        if not text_content:
            print(f"No text extracted from {tag.name} tag. Skipping.")
            continue

        if character_limit and used_characters >= character_limit:
            print(f"Character limit reached. Stopping text processing.")
            break

        if character_limit:
            remaining_characters = character_limit - used_characters
            if len(text_content) > remaining_characters:
                text_content = text_content[:remaining_characters].rsplit(' ', 1)[0]
                used_characters += len(text_content)
            else:
                used_characters += len(text_content)
        else:
            used_characters += len(text_content)

        line_number = get_line_number(tag, html_content)
        first_word = text_content.split()[0] if text_content else 'empty'
        voice_choice = voice_mapping.get(tag.name, 'default')

        formatted_filename = f"{format_filename(url)}_line{line_number}_{tag.name}_{first_word}.wav"
        audio_file_path = os.path.join(audio_dir, formatted_filename)

        if text:
            text_file_path = audio_file_path.replace('.wav', '.txt')
            with open(text_file_path, 'w') as text_file:
                text_file.write(text_content)

        if os.path.exists(audio_file_path) and not overwrite:
            print(f"File {formatted_filename} already exists. Skipping.")
            continue

        if text_content and generate_audio:
            # Generate audio using ElevenLabs API
            audio_generator = client.generate(text=text_content, voice=voice_choice, model="eleven_multilingual_v2")
            with open(audio_file_path, 'wb') as audio_file:
                for chunk in audio_generator:
                    audio_file.write(chunk)

            audio_segment = AudioSegment.from_file(audio_file_path)

            audio_files.append(audio_file_path)
            
            if apply_effects:
                audio_segment = apply_spatial_effects(audio_segment, len(audio_files), len(tags_to_process))

            if save_combined == 'parallel':
                combined_audio = combined_audio.overlay(audio_segment)
            elif save_combined == 'linear':
                combined_audio += audio_segment

    if save_combined and save_combined != 'none':
        filename = os.path.join(audio_dir, f"{format_filename(url)}_combined_audio.wav")
        combined_audio.export(filename, format="wav")
        print("Final audio file saved as:", filename)

    if play_audio:
        play_audio_sequence(audio_files, playback_speed)

#%%
url = 'https://en.wikipedia.org/wiki/Screen_reader'
html_content = download_webpage(url)
parse_and_generate_audio(html_content, url, 
                         selected_tags=['article',
                                        'summary',
                                        'figcaption',
                                        'h1', 'h2', 'h3',
                                        'h4', 'h5', 'h6', 'p'],
                         generate_audio=True, 
                         character_limit=10000, 
                         apply_effects=False, 
                         save_combined='linear', 
                         play_audio=False,
                         playback_speed=1.0,
                         overwrite = False,
                         text=True)

#%%
url = 'https://fr.wikipedia.org/wiki/Lecteur_d%27%C3%A9cran'
html_content = download_webpage(url)
parse_and_generate_audio(html_content, url, 
                         selected_tags=['article',
                                        'summary',
                                        'figcaption',
                                        'h1', 'h2', 'h3',
                                        'h4', 'h5', 'h6', 'p'],
                         generate_audio=True, 
                         character_limit=10000, 
                         apply_effects=False, 
                         save_combined='linear', 
                         play_audio=False,
                         playback_speed=1.0,
                         overwrite = False,
                         text=True)
