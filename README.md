# NYT Crossword Helper

A Chrome extension that provides AI-powered hints and explanations for New York Times crossword puzzles. Get smart hints for clues and detailed explanations for answers, helping you learn and improve your crossword-solving skills.

## Features

- **Clue Hints**: Get AI-powered explanations of crossword clues without revealing the answer
- **Answer Explanations**: Understand why a particular word fits the clue
- **Detailed Word Information**: Learn about word origins, usage, and related terms
- **Smart Formatting**: Clean, easy-to-read explanations with proper formatting
- **Input Flexibility**: Enter known characters or the full word for more accurate explanations

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/nyt-crossword-helper.git
```

2. Open Chrome and go to `chrome://extensions/`

3. Enable "Developer mode" in the top right

4. Click "Load unpacked" and select the `nyt-crossword-helper` directory

## Usage

1. Open a New York Times crossword puzzle (Daily or Mini)
2. Select a clue or word in the puzzle
3. Click the extension icon
4. Choose between:
   - "Clue Hint" for an explanation of the clue
   - "Get Answer" for the word and its explanation
5. For answers, you can:
   - Enter known characters (e.g., "A_E_")
   - Enter the full word
   - Click "More Info" for detailed word information

## Development

### Prerequisites

- Chrome browser
- Basic knowledge of JavaScript and Chrome extension development

### Project Structure

```
nyt-crossword-helper/
├── manifest.json      # Extension configuration
├── popup.html        # Extension popup interface
├── popup.js          # Popup functionality
├── content.js        # Content script for NYT crossword page
├── styles.css        # Styling for the extension
└── README.md         # This file
```

### Setup Development Environment

1. Clone the repository
2. Make your changes
3. Load the extension in Chrome using Developer mode
4. Test your changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- New York Times Crossword for providing the puzzle platform
- Gemini API for powering the AI explanations
- Chrome Extension API for making this possible

## Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter)

Project Link: [https://github.com/yourusername/nyt-crossword-helper](https://github.com/yourusername/nyt-crossword-helper)