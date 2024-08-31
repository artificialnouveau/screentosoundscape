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

# Example usage:
language = 'fr'  # Change this to 'en' for English or 'fr' for French etc.
wiki_api = init_wikipedia_api(language)
page_title = "Galaxie"  # French for "Galaxy"
page_py = wiki_api.page(page_title)
html_content = fetch_html(page_title, language)
result_dict = print_sections(page_py, html_content, language, include_links=True, save_json=True)
result_dict
