from dotenv import load_dotenv
from openai import OpenAI
from elevenlabs.client import ElevenLabs
from elevenlabs import play

eleven_api_key = os.getenv('ELEVENLABS_API_KEY')
eleven_client = ElevenLabs(api_key='x')

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

def translate_text(text, target_language='fr'):
    translator = Translator()
    try:
        translation = translator.translate(text, dest=target_language)
        return translation.text
    except Exception as e:
        print(f"Translation failed: {e}")
        return None

def apply_character_limit(text, limit):
    if limit is not None and len(text) > limit:
        last_space = text.rfind(' ', 0, limit)
        return text[:last_space] if last_space != -1 else text[:limit]
    return text

def generate_audio_from_text(text, tag, save=False, filename='output.mp3', character_limit=None):
    """ Generate audio from text using a specific voice based on tag, with optional character limit. """
    clean_text = remove_urls(text)
    if character_limit:
        clean_text = apply_character_limit(clean_text, character_limit)
    print(f"Generating audio for: {clean_text[:50]}...")
    voice = voice_mapping.get(tag, voice_mapping['default'])
    audio_generator = eleven_client.generate(text=clean_text, voice=voice, model="eleven_multilingual_v2")
    audio_data = b"".join(audio_generator)
    if save:
        if not filename.endswith('.mp3'):
            filename += '.mp3'
        with open(filename, 'wb') as audio_file:
            audio_file.write(audio_data)
    return filename

def hash_filename(path):
    """ Hashing function to generate safe file names based on the content path. """
    path_string = '_'.join(path)
    return hashlib.sha256(path_string.encode()).hexdigest()

def remove_urls(text):
    """ Remove URLs and links from the text. """
    text = re.sub(r'\[([^\]]+)\]\(https?://[^\)]+\)', r'\1', text)
    text = re.sub(r'https?://\S+', '', text)
    return text

def generate_audio_from_text(text, tag, save=False, filename='output.mp3', character_limit=None):
    """ Generate audio from text using specific voice settings based on the section type. """
    clean_text = remove_urls(text)
    if character_limit:
        clean_text = apply_character_limit(clean_text, character_limit)
    print(clean_text)
    voice = voice_mapping.get(tag, voice_mapping['default'])
    audio_generator = eleven_client.generate(text=clean_text, voice=voice, model="eleven_multilingual_v2")
    audio_data = b"".join(audio_generator)
    if save:
        if not filename.endswith('.mp3'):
            filename += '.mp3'
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, 'wb') as audio_file:
            audio_file.write(audio_data)
    return filename

def clean_title(title):
    """ Utility function to clean the title to ensure it doesn't include headers or unwanted formatting. """
    # Explicitly remove any patterns like 'H1: ', 'H2: ', etc., if they are included
    cleaned_title = re.sub(r'H[0-9]:\s*', '', title)
    return cleaned_title.replace(' ', '_').replace(':', '')

def process_json_for_audio(json_data, language, base_path='wiki_jsons', character_limit=None, max_files=5):
    """ Process JSON data to generate linked audio files respecting character limits and max file count. """
    # Ensure the title is cleaned to not include any headers or unwanted characters
    title_safe = clean_title(json_data['Title'])
    page_directory = os.path.join(base_path, f"{language}_wiki_{title_safe}")
    audio_directory = os.path.join(page_directory, 'mp3s')
    os.makedirs(audio_directory, exist_ok=True)

    updated_json = json_data.copy()
    file_count = [0]

    def recursively_generate_audio(data, path, updates=None):
        if updates is None:
            updates = {}
        if file_count[0] >= max_files:
            return
        for key, value in data.items():
            safe_key = key.replace(' ', '_').replace(':', '')
            new_path = path + [safe_key]
            if isinstance(value, dict):
                recursively_generate_audio(value, new_path, updates)
            elif isinstance(value, list) and key == 'Images':
                for index, image in enumerate(value):
                    if 'caption' in image:
                        filename = f"{'_'.join(new_path)}_{index}.mp3"
                        full_path = os.path.join(audio_directory, filename)
                        if not os.path.exists(full_path):
                            audio_filename = generate_audio_from_text(image['caption'], 'figcaption', save=True, filename=full_path, character_limit=character_limit)
                            image['audio_caption'] = audio_filename
                            file_count[0] += 1
                            if file_count[0] >= max_files:
                                break
            elif key in ['P', 'Introduction']:
                filename = f"{'_'.join(new_path)}.mp3"
                full_path = os.path.join(audio_directory, filename)
                if not os.path.exists(full_path):
                    audio_filename = generate_audio_from_text(value, key.lower(), save=True, filename=full_path, character_limit=character_limit)
                    updates[key] = audio_filename
                    file_count[0] += 1
                    if file_count[0] >= max_files:
                        break

        for key, audio_filename in updates.items():
            data[key + '_audio'] = audio_filename

    recursively_generate_audio(updated_json, [])

    new_json_filename = os.path.join(page_directory, f"{language}_wiki_{title_safe}_with_audio.json")
    with open(new_json_filename, 'w', encoding='utf-8') as f:
        json.dump(updated_json, f, ensure_ascii=False, indent=4)

    return new_json_filename

# Example usage:
language = 'fr'  # Change this to 'en' for English or 'fr' for French etc.
wiki_api = init_wikipedia_api(language)
page_title = "Galaxies"  # French for "Galaxy"
page_py = wiki_api.page(page_title)
html_content = fetch_html(page_title, language)
result_dict = print_sections(page_py, html_content, language, include_links=True, save_json=True)
# with open('strings.json') as f:
#     d = json.load(f)
new_json_file = process_json_for_audio(result_dict, language, character_limit=1000, max_files=10)
print(f"Audio JSON saved as: {new_json_file}")
