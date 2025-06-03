// Import config
import config from './config.js';

// DOM elements
const menuPage = document.getElementById('menuPage');
const resultPage = document.getElementById('resultPage');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const loadingEl = document.getElementById('loading');
const clueBtn = document.getElementById('clueBtn');
const wordBtn = document.getElementById('wordBtn');
const backBtn = document.getElementById('backBtn');
const knownCharsInput = document.getElementById('knownChars');
const fullWordInput = document.getElementById('fullWord');
const moreInfoBtn = document.getElementById('moreInfoBtn');

// Function to show loading state
function showLoading() {
    loadingEl.style.display = 'flex';
    resultEl.style.display = 'none';
}

// Function to hide loading state
function hideLoading() {
    loadingEl.style.display = 'none';
    resultEl.style.display = 'block';
}

// Function to update status
function updateStatus(message) {
    statusEl.textContent = message;
    statusEl.style.display = message ? 'block' : 'none';
    statusEl.style.margin = '0';
    statusEl.style.padding = '0';
}

// Function to show typewriter effect
function typeWriter(text, element, speed = 30) {
    let i = 0;
    element.innerHTML = '';
    element.classList.add('typewriter');

    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            element.classList.remove('typewriter');
        }
    }

    type();
}

// Function to update result with markdown support and typewriter effect
function updateResult(content) {
    try {
        if (!content) {
            resultEl.innerHTML = 'No content received';
            return;
        }

        // Pre-process the content to clean up formatting
        content = content
            // Convert numbered lists to bullet points
            .replace(/^\s*\d+\.\s+/gm, '• ')
            // Convert dash and asterisk to bullet points
            .replace(/^[-*]\s+/gm, '• ')
            // Ensure consistent bullet point spacing
            .replace(/^•\s+/gm, '• ')
            // Fix multiple newlines
            .replace(/\n\s*\n/g, '\n')
            // Remove empty lines at the start
            .replace(/^\n+/, '')
            // Remove empty lines at the end
            .replace(/\n+$/, '');

        // Convert markdown to HTML
        let html = content
            // Handle bold text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Handle italic text
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Handle bullet points
            .replace(/^•\s+(.*?)$/gm, '<li>$1</li>')
            // Wrap consecutive list items in ul
            .replace(/(<li>.*?<\/li>)(?:\n<li>.*?<\/li>)*/g, '<ul>$&</ul>')
            // Handle line breaks
            .replace(/\n/g, '<br>');

        resultEl.innerHTML = html;
    } catch (error) {
        console.error('Error parsing markdown:', error);
        resultEl.innerHTML = `Error parsing markdown: ${error.message}<br>Raw content: ${content}`;
    }
}

// Function to check if URL is NYT Crossword
function isNYTCrosswordURL(url) {
    return url.match(/^https:\/\/www\.nytimes\.com\/crosswords\/game\/(daily|mini)\/\d{4}\/\d{2}\/\d{2}$/);
}

// Function to get explanation from Gemini
async function getExplanation(text, isDetailed = false) {
    try {
        let prompt = '';
        const knownChars = knownCharsInput.value.trim();
        const fullWord = fullWordInput.value.trim();

        if (text.type === 'word') {
            prompt = `You are a helpful assistant that explains New York Times crossword puzzle answers.
                Clue ${text.clueNumber}: "${text.clue}"
                The answer is ${text.wordLength} letters long.
                ${knownChars ? `Known characters: ${knownChars}` : ''}
                ${fullWord ? `Full word: ${fullWord}` : ''}

                ${isDetailed ?
                    `Please provide a detailed explanation including:
                1. The word's etymology and origin
                2. Common usage examples
                3. Related words or phrases
                4. Cultural or historical significance
                5. Any interesting facts about the word`
                    :
                    `Please provide the most likely answer word, a brief definition of this word, why this word fits the clue`}`;
        } else {
            prompt = `You are a helpful assistant that explains New York Times crossword puzzle clues.

                Clue: "${text.text}"
                ${knownChars ? `Known characters: ${knownChars}` : ''}
                ${fullWord ? `Full word: ${fullWord}` : ''}

                ${isDetailed ?
                    `Please provide a detailed analysis including:
                1. Historical context of the clue
                2. Different possible interpretations
                3. Common crossword conventions used
                4. Similar clues and their patterns
                5. Tips for solving similar clues in the future`
                    :
                    `Please explain:
                - What this clue likely means
                - What kind of answer it's looking for (e.g., noun, verb, slang, abbreviation, pun, plural, tense, foreign word, etc.)
                - Any subtle hints or wordplay it might include

                DO NOT provide the actual answer. Keep your explanation brief, focused, and helpful for a crossword solver who is stuck on this clue.`}`;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();

        if (!data.candidates || !data.candidates[0]) {
            throw new Error(`Invalid response format from Gemini API: ${JSON.stringify(data)}`);
        }

        const explanation = data.candidates[0].content.parts[0].text;

        if (!explanation) {
            throw new Error('Empty explanation received from API');
        }

        return explanation;
    } catch (error) {
        console.error('Detailed error:', error);
        return `Error details: ${error.message}\n\nFull error: ${JSON.stringify(error, null, 2)}`;
    }
}

// Function to show result page
function showResultPage(showBackButton = true) {
    menuPage.style.display = 'none';
    resultPage.style.display = 'flex';
    backBtn.style.display = showBackButton ? 'block' : 'none';
}

// Function to show menu page
function showMenuPage() {
    resultPage.style.display = 'none';
    menuPage.style.display = 'flex';
    resultEl.innerHTML = '';
    updateStatus('');
}

// Function to handle getting content and explanation
async function handleContentRequest(mode) {
    try {
        lastRequestMode = mode;
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Check if we're on NYT Crossword page
        if (!isNYTCrosswordURL(tab.url)) {
            updateStatus('Please open NYT Crossword page');
            resultEl.innerHTML = '';
            return;
        }

        // Show result page
        showResultPage();

        let response;
        try {
            // Get selected content from the page
            response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getSelectedContent',
                mode: mode
            });
        } catch (error) {
            if (error.message.includes('Receiving end does not exist')) {
                // Try to re-inject the content script
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                // Try again after a short delay
                await new Promise(resolve => setTimeout(resolve, 500));
                response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'getSelectedContent',
                    mode: mode
                });
            } else {
                throw error;
            }
        }

        if (!response) {
            updateStatus(`No ${mode} selected. Please select a ${mode} in the puzzle first.`);
            return;
        }

        updateStatus(`Getting explanation...`);
        showLoading();

        // Get explanation from Gemini
        const explanation = await getExplanation(response);

        hideLoading();
        updateStatus(''); // Clear the status message
        updateResult(explanation);
        // Only show More Info button for word answers
        moreInfoBtn.style.display = mode === 'word' ? 'block' : 'none';

    } catch (error) {
        console.error('Detailed error in handleContentRequest:', error);
        if (error.message.includes('Receiving end does not exist')) {
            updateStatus('Connection lost. Please refresh the NYT Crossword page and try again.');
        } else {
            updateStatus('Error occurred. See details below:');
            updateResult(`Error details: ${error.message}\n\nFull error: ${JSON.stringify(error, null, 2)}`);
        }
        hideLoading();
        moreInfoBtn.style.display = 'none';
    }
}

// Function to handle More Info request
async function handleMoreInfo() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'getSelectedContent',
            mode: lastRequestMode
        });

        if (!response) {
            updateStatus('No content selected. Please select content in the puzzle first.');
            return;
        }

        updateStatus('Getting detailed explanation...');
        showLoading();
        moreInfoBtn.style.display = 'none';

        const detailedExplanation = await getExplanation(response, true);
        hideLoading();
        updateStatus('');
        updateResult(detailedExplanation);
        moreInfoBtn.style.display = 'block';

    } catch (error) {
        console.error('Error in handleMoreInfo:', error);
        updateStatus('Error getting detailed explanation');
        hideLoading();
        moreInfoBtn.style.display = 'block';
    }
}

// Initialize popup
async function initializePopup() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!isNYTCrosswordURL(tab.url)) {
        showResultPage(false);
        updateStatus('Please open NYT Crossword page');
        resultEl.style.display = 'none';
        clueBtn.disabled = true;
        wordBtn.disabled = true;
    } else {
        showMenuPage();
        clueBtn.disabled = false;
        wordBtn.disabled = false;
    }
}

// Add click handlers for buttons
clueBtn.addEventListener('click', () => handleContentRequest('clue'));
wordBtn.addEventListener('click', () => handleContentRequest('word'));
backBtn.addEventListener('click', showMenuPage);
moreInfoBtn.addEventListener('click', handleMoreInfo);

// Initialize when popup opens
initializePopup();