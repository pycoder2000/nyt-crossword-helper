// Track last request mode
let lastRequestMode = '';

// Configuration
const GEMINI_API_KEY = 'AIzaSyDIHHQhEV7mrz9W5nL_ZOoI-q5S0dXyP9I';

// DOM elements
const menuPage = document.getElementById('menuPage');
const resultPage = document.getElementById('resultPage');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const loadingEl = document.getElementById('loading');
const clueBtn = document.getElementById('clueBtn');
const wordBtn = document.getElementById('wordBtn');
const backBtn = document.getElementById('backBtn');
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

// Function to update result with markdown support
function updateResult(content) {
    try {
        if (!content) {
            resultEl.innerHTML = 'No content received';
            return;
        }

        // Pre-process the content to clean up formatting
        content = content
            // Fix multiple newlines
            .replace(/\n\s*\n/g, '\n')
            // Remove empty lines at the start
            .replace(/^\n+/, '')
            // Remove empty lines at the end
            .replace(/\n+$/, '');

        // Use marked to convert markdown to HTML
        const html = marked.parse(content, {
            breaks: true,  // Convert line breaks to <br>
            gfm: true,     // Use GitHub Flavored Markdown
            headerIds: false // Disable header IDs for cleaner output
        });

        resultEl.innerHTML = html;
    } catch (error) {
        console.error('Error parsing markdown:', error);
        resultEl.innerHTML = `Error parsing markdown: ${error.message}<br>Raw content: ${content}`;
    }
}

// Function to get answer from word.tips
async function getWordTipsAnswer(clue, wordLength) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getWordTipsAnswer',
            clue,
            wordLength
        });

        if (!response.success) {
            throw new Error(response.error);
        }

        return response.answer;
    } catch (error) {
        console.error('Error getting answer from word.tips:', error);
        throw error;
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

        if (text.type === 'word') {
            prompt = `You are a helpful assistant that explains New York Times crossword puzzle answers.
                Clue ${text.clueNumber || ''}: "${text.clue}"
                The answer is: ${text.answer}

                ${isDetailed ?
                    `Please provide a detailed explanation including:
                1. The word's etymology and origin
                2. Common usage examples
                3. Related words or phrases
                4. Cultural or historical significance
                5. Any interesting facts about the word`
                    :
                    `Please explain:
                1. Why this word fits the clue
                2. A brief definition of this word
                3. How it relates to the clue's context`}`;
        } else {
            prompt = `You are a helpful assistant that explains New York Times crossword puzzle clues.

                Clue: "${text.text}"

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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
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

        let answer;
        try {
            // Try to get answer from word.tips first
            if (mode === 'word') {
                answer = await getWordTipsAnswer(response.clue, response.wordLength);
                // Get explanation from Gemini
                const explanation = await getExplanation({
                    type: 'word',
                    clue: response.clue,
                    wordLength: response.wordLength,
                    answer: answer
                });
                updateResult(`Answer: ${answer}\n\n${explanation}`);
            } else {
                // For clues, still use Gemini
                const explanation = await getExplanation(response);
                updateResult(explanation);
            }
        } catch (error) {
            console.error('Error getting answer:', error);
            // Fallback to Gemini if word.tips fails
            const explanation = await getExplanation(response);
            const warningHtml = `
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-2 mb-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="ml-2">
                            <p class="text-xs text-yellow-700">Answer not found on word.tips. This answer was generated using Gemini.</p>
                        </div>
                    </div>
                </div>`;
            updateResult(`${warningHtml}${explanation}`);
        }

        hideLoading();
        updateStatus(''); // Clear the status message
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

        updateStatus('Getting detailed information...');
        showLoading();
        moreInfoBtn.style.display = 'none';

        let detailedInfo = '';
        try {
            // First try to get detailed info from word.tips
            const wordTipsAnswer = await getWordTipsAnswer(response.clue, response.wordLength);
            if (wordTipsAnswer) {
                detailedInfo = `Word.tips Answer: ${wordTipsAnswer}\n\n`;
            }
        } catch (error) {
            console.log('Word.tips not available, falling back to Gemini');
        }

        // Always get detailed explanation from Gemini
        const geminiExplanation = await getExplanation(response, true);
        detailedInfo += geminiExplanation;

        hideLoading();
        updateStatus('');
        updateResult(detailedInfo);
        moreInfoBtn.style.display = 'block';

    } catch (error) {
        console.error('Error in handleMoreInfo:', error);
        updateStatus('Error getting detailed information');
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

document.getElementById('clueBtn').addEventListener('mouseenter', () => {
    document.getElementById('hintIcon').textContent = '✏️';
});

document.getElementById('clueBtn').addEventListener('mouseleave', () => {
    document.getElementById('hintIcon').textContent = '';
});

document.getElementById('wordBtn').addEventListener('mouseenter', () => {
    document.getElementById('answerIcon').textContent = '🤫';
});

document.getElementById('wordBtn').addEventListener('mouseleave', () => {
    document.getElementById('answerIcon').textContent = '';
});