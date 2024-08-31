#%%

import wikipediaapi
import wikipedia
import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import unquote

# Initialize the Wikipedia API
wiki_wiki = wikipediaapi.Wikipedia(
    user_agent='Screen-to-Soundscape',
    language='en',
    extract_format=wikipediaapi.ExtractFormat.WIKI
)

# Fetch the Wikipedia page for "Galaxy"
page_of_interest = wiki_wiki.page("Galaxy")
# print(page_galaxy.text)

def print_sections(sections, level=0, limit=10000):
    for s in sections:
        print("%s: %s - %s" % ("*" * (level + 1), s.title, s.text[0:limit]))
        print_sections(s.sections, level + 1)

def print_links(page):
    links = page.links
    for title in sorted(links.keys()):
        print("%s: %s" % (title, links[title]))

def get_wiki_image(search_term):
    try:
        WIKI_REQUEST = 'http://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles='
        result = wikipedia.search(search_term, results = 1)
        wikipedia.set_lang('en')
        wkpage = wikipedia.WikipediaPage(title = result[0])
        title = wkpage.title
        response  = requests.get(WIKI_REQUEST+title)
        json_data = json.loads(response.text)
        img_link = list(json_data['query']['pages'].values())[0]['original']['source']
        # print(wkpage)
        # print(title)
        # print(response)
        # print(json_data)
        # print(img_link)
        return img_link        
    except:
        return 0


def fetch_images_and_figcaptions(page_title):
    # Construct the URL for the Wikipedia page
    url = f"https://en.wikipedia.org/wiki/{page_title}"
    response = requests.get(url)
    
    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(response.content, "html.parser")
    
    # Dictionary to hold image info
    images_info = {}
    
    # Increment for each valid image found
    image_count = 0
    
    # Find all 'figure' elements since these usually contain both img and figcaption
    for figure in soup.find_all('figure'):
        img_tag = figure.find('img')
        if img_tag and 'src' in img_tag.attrs:
            img_url = img_tag['src']
            alt_text = img_tag.get('alt', "")
            
            # Decode the URL if it's URL-encoded
            img_url = unquote(img_url)

            # Extracting caption from figcaption if it exists
            figcaption = figure.find('figcaption')
            caption_text = figcaption.text.strip() if figcaption else ''
            
            image_count += 1
            images_info[image_count] = {
                'url': f"https:{img_url}", 
                'caption': caption_text
            }
    
    return images_info


def print_sections(sections, level=0, result=None, path="", order=[1]):
    if result is None:
        result = {}

    header_tag = f"*H{level+1}*"
    for s in sections:
        current_path = f"{path} > {header_tag} {s.title}" if path else f"{header_tag} {s.title}"
        paragraph_tag = f"{current_path} > *P*"
        result[order[0]] = f"{paragraph_tag} {s.text.strip()}"
        order[0] += 1  # Increment the order within the list to maintain state across recursive calls
        if s.sections:
            print_sections(s.sections, level + 1, result, current_path, order)

    return result

# Initialize result dictionary and call the function
result_dict = {}
result_dict = print_sections(page_of_interest.sections)

# print_links(page_of_interest)

# wiki_image = get_wiki_image('Galaxy')

# images_data = fetch_images_and_figcaptions("Galaxy")
# images_data

#%%
import wikipediaapi
from bs4 import BeautifulSoup

# Initialize Wikipedia API
wiki_wiki = wikipediaapi.Wikipedia(
    language='en',
    user_agent='MyProjectName (merlin@example.com)'
)

def process_html_text(html_content):
    # Parse HTML and wrap hyperlink texts in brackets
    soup = BeautifulSoup(html_content, 'html.parser')
    for a in soup.find_all('a', href=True):
        if a.text:  # Check if the link has text
            original_text = a.text
            a.string = f'[{original_text}]'  # Wrap hyperlink text in brackets
            print(a.string)
    # Remove newline characters and return the clean text
    return soup.get_text(separator=' ', strip=True).replace('\n', ' ')

def print_sections(page):
    result = {}

    # Parse the main title
    title = page.title
    result['Title'] = f"H1: {title}"

    # Use the summary attribute directly for the introduction
    summary_text = page.summary
    result['Introduction'] = f"P: {summary_text.strip()}"

    def process_section(sections, result_dict, level=1):
        for section in sections:
            header_text = section.title.strip()
            header_tag = f"H{level}"
            paragraph_text = process_html_text(section.text).strip()

            # Ensure the current section's dictionary is initialized
            if header_text not in result_dict:
                result_dict[header_tag + ': ' + header_text] = {}

            if paragraph_text:  # Only add if paragraph text is not empty
                result_dict[header_tag + ': ' + header_text]['P'] = paragraph_text

            # Recursively process subsections if they exist
            if section.sections:
                if 'Subsections' not in result_dict[header_tag + ': ' + header_text]:
                    result_dict[header_tag + ': ' + header_text]['Subsections'] = {}
                process_section(section.sections, result_dict[header_tag + ': ' + header_text]['Subsections'], level + 1)

    # Start processing sections after the introduction
    result['Sections'] = {}
    process_section(page.sections, result['Sections'])

    return result

# Fetch the page
page_py = wiki_wiki.page('Galaxy')
result_dict = print_sections(page_py)
result_dict

    # Page - Summary: Python is a widely used high-level programming language for
# %%
#%%
import wikipediaapi
from bs4 import BeautifulSoup

# Initialize Wikipedia API
wiki_wiki = wikipediaapi.Wikipedia(
    language='en',
    user_agent='MyProjectName (merlin@example.com)'
)

def process_html_text(html_content):
    # Parse HTML and wrap hyperlink texts in brackets
    soup = BeautifulSoup(html_content, 'html.parser')
    for a in soup.find_all('a', href=True):
        if a.text:  # Check if the link has text
            original_text = a.text
            a.string = f'[{original_text}]'  # Wrap hyperlink text in brackets
            print(a.string)
    # Remove newline characters and return the clean text
    return soup.get_text(separator=' ', strip=True).replace('\n', ' ')

def print_sections(page):
    result = {}

    # Parse the main title
    title = page.title
    result['Title'] = f"H1: {title}"

    # Use the summary attribute directly for the introduction
    summary_text = page.summary
    result['Introduction'] = f"P: {summary_text.strip()}"

    def process_section(sections, result_dict, level=1):
        for section in sections:
            header_text = section.title.strip()
            header_tag = f"H{level}"
            paragraph_text = process_html_text(section.text).strip()

            # Ensure the current section's dictionary is initialized
            if header_text not in result_dict:
                result_dict[header_tag + ': ' + header_text] = {}

            if paragraph_text:  # Only add if paragraph text is not empty
                result_dict[header_tag + ': ' + header_text]['P'] = paragraph_text

            # Recursively process subsections if they exist
            if section.sections:
                if 'Subsections' not in result_dict[header_tag + ': ' + header_text]:
                    result_dict[header_tag + ': ' + header_text]['Subsections'] = {}
                process_section(section.sections, result_dict[header_tag + ': ' + header_text]['Subsections'], level + 1)

    # Start processing sections after the introduction
    result['Sections'] = {}
    process_section(page.sections, result['Sections'])

    return result

# Fetch the page
page_py = wiki_wiki.page('Galaxy')
result_dict = print_sections(page_py)
result_dict

# %%
import re
import wikipediaapi
import requests
from bs4 import BeautifulSoup

# Initialize Wikipedia API
wiki_wiki = wikipediaapi.Wikipedia(
    language='en',
    user_agent='MyProjectName (merlin@example.com)'
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
    return text

# Updated `parse_links` to ignore certain links
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

def print_sections(page, html_content, include_links=False):
    """ Process the sections of the Wikipedia page, optionally include hyperlink markdown. """
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
        intro_text = page.summary
    result['Introduction'] = intro_text

    def process_section(sections, result_dict, level=1):
        for section in sections:
            header_text = section.title.strip()
            header_tag = f"H{level}"
            section_text = section.text

            if include_links:
                section_text = apply_links_to_text(section_text, links)

            section_dict = result_dict.setdefault(header_tag + ': ' + header_text, {})
            section_dict['P'] = section_text

            if section.sections:
                section_dict['Subsections'] = {}
                process_section(section.sections, section_dict['Subsections'], level + 1)

    process_section(page.sections, result['Sections'], 2)
    return result

# Fetch the page and its HTML
page_title = "Galaxy"
page_py = wiki_wiki.page(page_title)
html_content = fetch_html(page_title)
result_dict = print_sections(page_py, html_content, include_links=True)
result_dict

# %%
