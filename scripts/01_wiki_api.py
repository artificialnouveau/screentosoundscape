

#%%
import wikipediaapi
import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import unquote
import re
from googletrans import Translator

import hashlib
import os


def init_wikipedia_api(language='en'):
    """ Initialize and return a Wikipedia API instance for the specified language. """
    return wikipediaapi.Wikipedia(
        user_agent='Screen-to-Soundscape',
        language=language,
        extract_format=wikipediaapi.ExtractFormat.WIKI
    )

def fetch_html(page_title, language='en'):
    """ Fetch the raw HTML of the Wikipedia page, adjusting for language. """
    url = f'https://{language}.wikipedia.org/wiki/{page_title.replace(" ", "_")}'
    response = requests.get(url)
    return response.text

def parse_links(html_content, language='en'):
    """ Parse HTML to create a dictionary of text to markdown link mappings, ignoring special or non-article links. """
    soup = BeautifulSoup(html_content, 'html.parser')
    links = {}
    for a in soup.find_all('a', href=True):
        if a.text and a['href'].startswith('/wiki/') and not a['href'].startswith('/wiki/Special:'):
            link_url = f"https://{language}.wikipedia.org{a['href']}"
            links[a.text] = f'[{a.text}]({link_url})'
    return links

def apply_links_to_text(text, links):
    """ Replace occurrences of text with markdown links using the links dictionary, matching whole words only. """
    for link_text, markdown in links.items():
        text = re.sub(r'\b' + re.escape(link_text) + r'\b', markdown, text)
    return text.replace('\n', ' ')

def print_sections(page, html_content, language='en', include_links=False, save_json=True):
    """ Process and optionally save the sections of a Wikipedia page to JSON, with link markdown. """
    result = {
        'Title': f"H1: {page.title}",
        'Introduction': "",
        'Sections': {}
    }
    links = parse_links(html_content, language) if include_links else {}
    intro_text = apply_links_to_text(page.summary, links) if include_links else page.summary.replace('\n', ' ')
    result['Introduction'] = intro_text

    images_info = fetch_images_and_figcaptions(page.title, language, save_json)

    def process_section(sections, result_dict, level=1):
        for section in sections:
            header_text = section.title.strip()
            section_text = apply_links_to_text(section.text, links) if include_links else section.text.replace('\n', ' ')
            section_dict = result_dict.setdefault(f"H{level}: {header_text}", {'P': section_text})
            if section.sections:
                section_dict['Subsections'] = {}
                process_section(section.sections, section_dict['Subsections'], level + 1)

    process_section(page.sections, result['Sections'], 2)
    
    if save_json:
        filename = f"wiki_jsons/{language}_wiki_{page.title.replace(' ', '_')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=4)
        print("Saved as ", filename)

    return result

def fetch_images_and_figcaptions(page_title, language='en', save_json=True):
    """ Fetch images and their captions from a Wikipedia page, saving details to a JSON file. """
    url = f"https://{language}.wikipedia.org/wiki/{page_title}"
    response = requests.get(url)
    soup = BeautifulSoup(response.content, "html.parser")
    images_info = {}
    headers = [header.text for header in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])]
    current_header = headers[0] if headers else "Introduction"
    
    for element in soup.find_all(['figure', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        if element.name.startswith('h'):
            current_header = element.text.strip()
        elif element.name == 'figure' or 'thumbimage' in element.get('class', []):
            img_tag = element.find('img')
            if img_tag and 'src' in img_tag.attrs:
                img_url = f"https:{unquote(img_tag['src'])}"
                figcaption = element.find('figcaption')
                caption_text = figcaption.text.strip() if figcaption else ''
                images_info[current_header] = {'url': img_url, 'caption': caption_text}

    if save_json:
        filename = f"wiki_jsons/{language}_wiki_images_{page_title.replace(' ', '_')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(images_info, f, ensure_ascii=False, indent=4)

    return images_info


#%%
from dotenv import load_dotenv
from openai import OpenAI
from elevenlabs.client import ElevenLabs
from elevenlabs import play

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

def clean_title(title):
    """ Clean and create a safe title for filenames, removing any unwanted header labels. """
    title = re.sub(r'H\d+: ', '', title)  # Remove header tags like 'H1: '
    return re.sub(r'[^\w\s]', '', title).replace(' ', '_')

def remove_urls(text):
    """ Remove URLs and links from the text. """
    text = re.sub(r'\[([^\]]+)\]\(https?://[^\)]+\)', r'\1', text)  # Removes markdown-style links
    text = re.sub(r'https?://\S+', '', text)  # Removes standalone URLs
    return text

def clean_text_for_audio(text):
    """Clean text by removing URLs and unnecessary tags like 'H1'."""
    text = remove_urls(text)
    # Remove header tags like 'H1:', 'H2:', 'Introduction:', etc.
    text = re.sub(r'^(H\d+:|Introduction:)', '', text).strip()
    return text

def generate_audio_from_text(text, tag, save=False, filename='output.mp3', character_limit=None):
    """ Generate audio from text using a specific voice based on tag, with optional character limit. """
    if os.path.exists(filename):
        return filename  # Skip generation if the file already exists

    clean_text = remove_urls(text)
    if character_limit:
        clean_text = clean_text[:character_limit]  # Apply character limit

    print(clean_text)
    voice = voice_mapping.get(tag.lower(), voice_mapping['default'])
    audio_generator = eleven_client.generate(text=clean_text, voice=voice, model="eleven_multilingual_v2")
    audio_data = b"".join(audio_generator)
    
    if save:
        if not filename.endswith('.mp3'):
            filename += '.mp3'
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, 'wb') as audio_file:
            audio_file.write(audio_data)
    
    return filename

def process_section(data, path, audio_directory, file_count, max_files, character_limit):
    """Recursively process each section and generate audio for headers and paragraphs, skipping specific keys."""
    updates = {}
    for key, value in list(data.items()):  # Convert items to list to avoid size change error
        if key == 'audio_path':
            continue  # Skip processing for 'audio_path'

        if file_count[0] >= max_files:
            break  # Stop if max file count reached

        # Clean up the key to form part of the filename
        new_key = key.replace(':', '').replace(' ', '_')
        current_path = path + [new_key]

        if isinstance(value, dict):
            # Process headers and paragraphs in all sections, including 'Title' and 'Introduction'
            for sub_key, sub_value in value.items():
                if sub_key == 'audio_path':
                    continue

                if isinstance(sub_key, str):
                    sub_current_path = current_path + [sub_key.replace(':', '').replace(' ', '_')]

                    # Check if sub_key is a header (e.g., "H2: Etymology")
                    header_match = re.match(r'H(\d+):\s*(.+)', sub_key)
                    if header_match:
                        header_level = header_match.group(1)  # Get the header level (e.g., "1", "2", "3")
                        header_text = header_match.group(2)
                        header_filename = '_'.join(sub_current_path) + f'_header{header_level}.mp3'
                        header_full_path = os.path.join(audio_directory, header_filename)

                        if not os.path.exists(header_full_path):
                            generate_audio_from_text(header_text, 'header', save=True, filename=header_full_path, character_limit=character_limit)
                            updates[sub_key] = {
                                'text': header_text,
                                'audio_path': header_full_path
                            }
                            file_count[0] += 1

                        # Process nested sections
                        if isinstance(sub_value, dict):
                            process_section(sub_value, sub_current_path, audio_directory, file_count, max_files, character_limit)

                    # Process paragraphs nested within sections
                    elif sub_key == 'P' and isinstance(sub_value, str):
                        paragraph_filename = '_'.join(sub_current_path[:-1]) + '_paragraph.mp3'  # Exclude 'P' from filename
                        paragraph_full_path = os.path.join(audio_directory, paragraph_filename)

                        if not os.path.exists(paragraph_full_path):
                            generate_audio_from_text(sub_value, 'p', save=True, filename=paragraph_full_path, character_limit=character_limit)
                            updates[sub_key] = {
                                'text': sub_value,
                                'audio_path': paragraph_full_path
                            }
                            file_count[0] += 1

                elif isinstance(sub_value, dict):
                    process_section(sub_value, current_path, audio_directory, file_count, max_files, character_limit)

        # Handle paragraphs directly under the current section (without nested dict)
        elif key == 'P' and isinstance(value, str):
            paragraph_filename = '_'.join(current_path[:-1]) + '_paragraph.mp3'  # Exclude 'P' from filename
            paragraph_full_path = os.path.join(audio_directory, paragraph_filename)

            if not os.path.exists(paragraph_full_path):
                generate_audio_from_text(value, 'p', save=True, filename=paragraph_full_path, character_limit=character_limit)
                updates[key] = {
                    'text': value,
                    'audio_path': paragraph_full_path
                }
                file_count[0] += 1

        # Handle top-level headers such as Title and Introduction
        elif isinstance(key, str):
            header_match = re.match(r'H(\d+)', key)
            if header_match:
                header_level = header_match.group(1)  # Extract header level (e.g., "1" for H1)
                header_filename = '_'.join(current_path) + f'_header{header_level}.mp3'
                header_full_path = os.path.join(audio_directory, header_filename)

                if not os.path.exists(header_full_path):
                    generate_audio_from_text(value, 'header', save=True, filename=header_full_path, character_limit=character_limit)
                    updates[key] = {
                        'text': value,
                        'audio_path': header_full_path
                    }
                    file_count[0] += 1

    # Apply updates to avoid modifying the dictionary while iterating over it
    data.update(updates)

def process_json_for_audio(json_data, language, base_path='wiki_jsons', character_limit=None, max_files=5):
    """Process JSON data and generate linked audio files respecting character limits and file counts."""
    # Safely handle the title extraction in case the structure is different
    if isinstance(json_data.get('Title'), dict) and 'H1' in json_data['Title']:
        title_safe = clean_title(json_data['Title']['H1'])
    elif isinstance(json_data.get('Title'), str):
        title_safe = clean_title(json_data['Title'])
    else:
        raise ValueError("The provided JSON does not have a valid 'Title' or 'H1' key.")

    page_directory = os.path.join(base_path, f"{language}_wiki_{title_safe}")
    audio_directory = os.path.join(page_directory, 'mp3s')
    os.makedirs(audio_directory, exist_ok=True)

    file_count = [0]  # Track number of generated files
    process_section(json_data, [], audio_directory, file_count, max_files, character_limit)

    # Save the updated JSON with audio paths
    new_json_filename = os.path.join(page_directory, f"{language}_wiki_{title_safe}_with_audio.json")
    with open(new_json_filename, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=4)

    return new_json_filename

import json
import os

def get_audio_paths(json_data, current_path=""):
    audio_mapping = {}

    # Define the base path for mp3 files
    base_path = "mp3s"

    # Traverse the JSON structure recursively
    for key, value in json_data.items():
        if isinstance(value, dict):
            # Create the new path based on current hierarchy and key
            sub_path = f"{current_path}_{key}".replace(" ", "_").replace(":", "").replace(".", "")
            
            # Handle header cases like "H2: Etymology"
            header_match = re.match(r'H(\d+):\s*(.+)', key)
            if header_match:
                header_level = header_match.group(1)
                header_text = header_match.group(2)

                # Generate the audio filename for the header
                header_file_name = f"{sub_path}_header{header_level}.mp3"
                if header_file_name.startswith("_"):
                    header_file_name = header_file_name[1:]  # Avoid leading underscores

                # Add the header as a new nested dict if it's not already initialized
                audio_mapping[key] = {
                    "text": header_text,
                    "audio_path": os.path.join(base_path, header_file_name)
                }

            # Ensure that key is initialized before attempting to update it
            if key not in audio_mapping:
                audio_mapping[key] = {}

            # Recursively process nested dictionaries
            audio_mapping[key].update(get_audio_paths(value, sub_path))

        else:
            # Preserve original value for text fields like "P"
            if key == "P":
                file_name = f"{current_path}".replace(" ", "_").replace(":", "").replace(".", "") + "_paragraph.mp3"
                if file_name.startswith("_"):
                    file_name = file_name[1:]
                
                # Add paragraph with both text and audio path in a new "P" key
                audio_mapping["P"] = {
                    "text": value,
                    "audio_path": os.path.join(base_path, file_name)
                }

            # Handle the Title and Introduction special cases
            if key == "Title":
                # Title should contain "H1" and its text and audio path
                audio_mapping["H1 Galaxy"] = {
                    "text": clean_title(value),
                    "audio_path": os.path.join(base_path, "Title_header1.mp3")
                }
            elif key == "Introduction":
                # Introduction paragraph should have a "P" key with its text and audio path
                audio_mapping["P"] = {
                    "text": value,
                    "audio_path": os.path.join(base_path, "Introduction_paragraph.mp3")
                }

    return audio_mapping

def save_audio_paths_to_json(input_filename):
    # Load JSON from the input file
    with open(input_filename, 'r', encoding='utf-8') as file:
        json_data = json.load(file)

    # Get audio paths with the updated structure
    updated_json_data = get_audio_paths(json_data)

    # Create the output filename
    base_name = os.path.splitext(input_filename)[0]  # Strip the extension
    output_filename = f"{base_name}_with_audio.json"

    # Save the new JSON to the output file
    with open(output_filename, 'w', encoding='utf-8') as file:
        json.dump(updated_json_data, file, indent=4)

    print(f"Audio paths saved to {output_filename}")

#%%
# Example usage:
language = 'en'#'fr'  # Change this to 'en' for English or 'fr' for French etc.
wiki_api = init_wikipedia_api(language)
page_title = 'Galaxy'# "Galaxies"  # French for "Galaxy"
page_py = wiki_api.page(page_title)
html_content = fetch_html(page_title, language)
result_dict = print_sections(page_py, html_content, language, include_links=True, save_json=True)

new_json_file = process_json_for_audio(result_dict, language, character_limit=1000, max_files=10)
print(f"Audio JSON saved as: {new_json_file}")

#%%
input_filename = r"en_wiki_Galaxy.json" # Replace this with your actual file name
save_audio_paths_to_json(input_filename)

#%%
import os
import json
from pydub import AudioSegment

def merge_audio_with_cues(json_path, website_audio_path, colette_audio_path, output_folder_path, overlap=4):
    # Load JSON data
    with open(json_path, 'r') as file:
        data = json.load(file)
    
    # Function to determine the type of audio cue needed
    def determine_audio_cues(filename):
        # Handle the special case for Title
        if "Title_header1" in filename:
            return "title_opening.mp3", "title_closing.mp3"
        
        # Identify if it's a header or paragraph
        if "header" in filename:
            level = filename.split("_header")[-1].replace(".mp3", "")  # Extract the header level (e.g., header1, header2)
            if level.isdigit():
                return f"header_{level}_opening.mp3", f"header_{level}_closing.mp3"
        elif "paragraph" in filename:
            return "paragraph_opening.mp3", "paragraph_closing.mp3"
        
        # Default case if not handled
        return None, None
    
    # Recursive function to process each audio file and its associated element
    def process_element(element, path_prefix=""):
        for key, value in element.items():
            if isinstance(value, dict):
                # Construct the audio path for this element if exists
                if "audio_path" in value:
                    audio_path = os.path.join(website_audio_path, value["audio_path"])
                    print("Processing file:", audio_path)

                    # Determine the appropriate opening and closing cue based on the filename
                    opening_file, closing_file = determine_audio_cues(value["audio_path"])
                    
                    if opening_file and closing_file:
                        try:
                            # Define the corresponding opening and closing sound files
                            opening_sound_path = os.path.join(colette_audio_path, opening_file)
                            closing_sound_path = os.path.join(colette_audio_path, closing_file)
                            
                            # Load audio segments
                            main_audio = AudioSegment.from_mp3(audio_path)
                            opening_audio = AudioSegment.from_mp3(opening_sound_path)
                            closing_audio = AudioSegment.from_mp3(closing_sound_path)
                            
                            # Calculate overlap in milliseconds
                            overlap_ms = overlap * 1000
                            
                            # Adjust overlap if the main audio is shorter than the required duration
                            if len(main_audio) < 2 * overlap_ms:
                                # If the file is too short, reduce the overlap to 25% of the total length of the audio
                                overlap_ms = len(main_audio) // 4
                                print(f"Adjusted overlap to {overlap_ms} ms for file {audio_path}")
                            
                            # Ensure the opening and closing audios are long enough for the overlap
                            if len(opening_audio) > overlap_ms:
                                opening_audio = opening_audio[:overlap_ms]
                            if len(closing_audio) > overlap_ms:
                                closing_audio = closing_audio[:overlap_ms]
                            
                            # Extend main audio if it's too short
                            if len(main_audio) < overlap_ms * 2:
                                padding = AudioSegment.silent(duration=(overlap_ms * 2) - len(main_audio))
                                main_audio = main_audio + padding
                                print(f"Extended main audio for {audio_path} with silence.")

                            # Merge opening audio with the first part of the main audio
                            final_audio = opening_audio.overlay(main_audio[:overlap_ms], position=0) + main_audio[overlap_ms:-overlap_ms]

                            # Merge closing audio with the last part of the main audio
                            final_audio = final_audio + closing_audio.overlay(main_audio[-overlap_ms:], position=0)
                            
                            # Save the final audio file
                            output_audio_path = os.path.join(output_folder_path, os.path.basename(audio_path))
                            final_audio.export(output_audio_path, format="mp3")
                            print("Output saved:", output_audio_path)
                        except FileNotFoundError as e:
                            print(f"File not found: {e.filename}. Continuing with next files...")
                
                # Recursively process nested elements
                process_element(value, path_prefix + key + "_")
    
    # Start processing from the root of the JSON
    process_element(data)

# Run the merging process
merge_audio_with_cues(json_path, website_audio_path, colette_audio_path, output_folder_path, overlap)



