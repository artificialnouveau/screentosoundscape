
# %%
import wikipediaapi
import wikipedia
import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import unquote
import re

# Initialize the Wikipedia API
wiki_wiki = wikipediaapi.Wikipedia(
    user_agent='Screen-to-Soundscape',
    language='en',
    extract_format=wikipediaapi.ExtractFormat.WIKI
)

def fetch_html(page_title):
    """ Fetch the raw HTML of the Wikipedia page. """
    url = f'https://en.wikipedia.org/wiki/{page_title.replace(" ", "_")}'
    response = requests.get(url)
    return response.text

def apply_links_to_text(text, links):
    """ Replace occurrences of text with markdown links using the links dictionary, matching whole words only. """
    for link_text, markdown in links.items():
        # Ensure only whole words are replaced by using word boundaries in regex
        text = re.sub(r'\b' + re.escape(link_text) + r'\b', markdown, text)
    return text.replace('\n', ' ')  # Removing newline characters from the text

def parse_links(html_content):
    """ Parse HTML to create a dictionary of text to markdown link mappings, ignoring special or non-article links. """
    soup = BeautifulSoup(html_content, 'html.parser')
    links = {}
    for a in soup.find_all('a', href=True):
        if a.text and a['href'].startswith('/wiki/') and not a['href'].startswith('/wiki/Special:'):
            link_url = f"https://en.wikipedia.org{a['href']}"
            # Create markdown link
            links[a.text] = f'[{a.text}]({link_url})'
    return links

def print_sections(page, html_content, include_links=False, save_json=True):
    """ Process the sections of the Wikipedia page, optionally include hyperlink markdown and save to JSON. """
    result = {
        'Title': f"H1: {page.title}",
        'Introduction': "",
        'Sections': {}
    }

    links = parse_links(html_content) if include_links else {}

    # Processing the introduction
    if include_links:
        intro_text = apply_links_to_text(page.summary, links)
    else:
        intro_text = page.summary.replace('\n', ' ')
    result['Introduction'] = intro_text

    # Fetch images and figure captions
    images_info = fetch_images_and_figcaptions(page.title)

    def process_section(sections, result_dict, level=1):
        for section in sections:
            header_text = section.title.strip()
            header_tag = f"H{level}"
            section_text = section.text

            if include_links:
                section_text = apply_links_to_text(section_text, links)
            else:
                section_text = section_text.replace('\n', ' ')

            section_dict = result_dict.setdefault(header_tag + ': ' + header_text, {})
            section_dict['P'] = section_text

            # Append images and captions to the relevant sections
            for key, image in images_info.items():
                if image['nearest_header'] == header_text:
                    caption_with_links = apply_links_to_text(image['caption'], links)
                    section_dict.setdefault('Images', []).append({
                        'url': image['url'],
                        'caption': caption_with_links
                    })

            if section.sections:
                section_dict['Subsections'] = {}
                process_section(section.sections, section_dict['Subsections'], level + 1)

    process_section(page.sections, result['Sections'], 2)
    
    if save_json:
        filename = f"wiki_jsons/wiki_{page.title.replace(' ', '_')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=4)
        print("Saved as ", filename)

    return result

# Fetch the page and its HTML
page_title = "Galaxy"
page_py = wiki_wiki.page(page_title)
html_content = fetch_html(page_title)
result_dict = print_sections(page_py, html_content, include_links=True, save_json=True)
result_dict
