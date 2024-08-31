ScreenToSoundscape

The ScreenToSoundscape project converts HTML content into an audio format using various voices for different semantic elements of the HTML. It uses the ElevenLabs API for text-to-speech conversion, providing a richer auditory experience through customized voice outputs for different parts of the HTML structure. Additionally, it features spatial audio effects to enhance the auditory landscape.
Features

### Wiki Json

#### Structure of the Resulting JSON

The JSON file created by print_sections function includes:

    Title: The title of the Wikipedia page.
    Introduction: The introductory text of the page.
    Sections: A nested structure representing the content hierarchy of the page. Each section contains:
        Title of the Section: Marked by headers like "H1", "H2", etc.
        Text Content: The text of each section, optionally embedded with markdown links.
        Subsections: Further nested sections if they exist.
        P_audio: path of the audio file
        

Additionally, image information related to each section might be present if fetch_images_and_figcaptions is integrated within this function or used alongside to augment the JSON with media content.

Naming Convention of the audio files: Audio files are named according to the structure they represent, for example, "Introduction.mp3" for the introduction. This helps in identifying the content of the audio file based on its filename.

When you parse this JSON:

    Access the Title: json_data['Title'] gives the main title of the page.
    Read the Introduction: json_data['Introduction'] provides the introduction text.
    Navigate Sections: json_data['Sections'] contains a dictionary of sections. Each section can be accessed by its header key, e.g., json_data['Sections']['H1: Section Title'].
        Inside each section, you can read paragraph text with json_data['Sections']['H1: Section Title']['P'] and navigate through any subsections similarly.
