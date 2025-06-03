// Function to get selected clue
function getSelectedClue() {
    const clueElement = document.querySelector('.xwd__clue-bar-desktop--text');
    if (clueElement) {
        return {
            type: 'clue',
            text: clueElement.textContent.trim()
        };
    }
    return null;
}

// Function to get selected word
function getSelectedWord() {
    // Get the clue for the selected word
    const clueElement = document.querySelector('.xwd__clue-bar-desktop--text');
    if (!clueElement) return null;

    const clue = clueElement.textContent.trim();

    // Get the highlighted cell to determine word info
    const highlightedCell = document.querySelector('.xwd__cell--highlighted');
    if (!highlightedCell) return null;

    // Get word info from aria-label
    const ariaLabel = highlightedCell.getAttribute('aria-label');
    if (!ariaLabel) return null;

    // Parse aria-label to get word length and position
    // Example aria-label: "19A: Warm shade of white, Answer: 5 letters, Letter: 2"
    const wordLengthMatch = ariaLabel.match(/Answer: (\d+) letters/);
    const wordLength = wordLengthMatch ? parseInt(wordLengthMatch[1]) : 0;

    // Get the clue number and direction (e.g., "19A" or "19D")
    const clueMatch = ariaLabel.match(/^(\d+[AD]):/);
    const clueNumber = clueMatch ? clueMatch[1] : '';

    return {
        type: 'word',
        clue: clue,
        wordLength: wordLength,
        clueNumber: clueNumber
    };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSelectedContent') {
        let content = null;

        if (request.mode === 'clue') {
            content = getSelectedClue();
        } else if (request.mode === 'word') {
            content = getSelectedWord();
        }

        sendResponse(content);
    }
});