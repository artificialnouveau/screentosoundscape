ScreenToSoundscape

The ScreenToSoundscape project converts HTML content into an audio format using various voices for different semantic elements of the HTML. It uses the ElevenLabs API for text-to-speech conversion, providing a richer auditory experience through customized voice outputs for different parts of the HTML structure. Additionally, it features spatial audio effects to enhance the auditory landscape.
Features

    HTML to Audio Conversion: Converts HTML tags into audio using specific voices.
    Voice Customization: Different voices for different HTML tags via ElevenLabs API.
    Spatial Audio Effects: Applies audio effects based on tag position in the document.
    Audio Playback: Supports immediate playback of generated audio.
    Text and HTML Saving: Saves text content and the original HTML for reference.

Dependencies

    requests
    beautifulsoup4
    pygame
    pyttsx3
    pydub
    python-dotenv
    pandas
    ElevenLabs API client

Make sure to have Python installed on your system to run the scripts. This project was developed and tested on Python 3.9.
Setup

    Clone the repository:

    bash

git clone <repository-url>
cd ScreenToSoundscape

Install required packages:

bash

pip install requests beautifulsoup4 pygame pyttsx3 pydub python-dotenv pandas

ElevenLabs Setup:

    Sign up for an ElevenLabs account and obtain your API key.
    Create a file named .env or ELEVENLABS_API_KEY.env in the project directory.
    Add your ElevenLabs API key to the file:

    makefile

        ELEVENLABS_API_KEY=your_api_key_here

    API Installation:
        If the ElevenLabs Python client is not automatically installed, you might need to install it manually or check their official documentation for the latest installation guide.

Usage

    Prepare Your HTML Content:
        Ensure your HTML content is accessible to the script, either via a URL or as a string.

    Run the script:
        Use the provided Python functions to parse HTML and generate audio.
        Modify parse_and_generate_audio parameters based on your needs (e.g., url, selected_tags).

    Generate Audio:

    python

html_content = download_webpage('https://example.com')
parse_and_generate_audio(html_content, 'https://example.com', generate_audio=True, play_audio=True)

Review Outputs:

    Check the specified output directory for audio files and text extracts.
