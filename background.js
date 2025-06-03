// Function to get answer from word.tips
async function getWordTipsAnswer(clue, wordLength) {
    try {
        // Format the clue for the URL
        const formattedClue = encodeURIComponent(
            clue.toLowerCase()
                .replace(/[^a-z0-9\s-_]/g, '') // Remove special chars except spaces, hyphens, and underscores
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
                .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        );
        const url = `https://word.tips/crossword-solver/ny-times/${formattedClue}`;

        // Fetch the page
        const response = await fetch(url);
        const html = await response.text();

        // Log the HTML to see what we're getting
        console.log('HTML Response:', html);

        // Try different regex patterns
        const patterns = [
            /data-letter="([A-Z])"/g,
            /data-letter='([A-Z])'/g,
            /data-letter=([A-Z])/g,
            /"letter":"([A-Z])"/g,
            /'letter':'([A-Z])'/g
        ];

        let answerMatch = null;
        for (const pattern of patterns) {
            answerMatch = html.match(pattern);
            if (answerMatch) {
                console.log('Found match with pattern:', pattern);
                break;
            }
        }

        if (!answerMatch) {
            console.log('No matches found with any pattern');
            throw new Error('Answer not found');
        }

        // Extract letters from the matches
        const answer = answerMatch
            .map(match => {
                const letterMatch = match.match(/[A-Z]/);
                return letterMatch ? letterMatch[0] : '';
            })
            .join('');

        console.log('Extracted answer:', answer);

        return answer;
    } catch (error) {
        console.error('Error getting answer from word.tips:', error);
        throw error;
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getWordTipsAnswer') {
        getWordTipsAnswer(request.clue, request.wordLength)
            .then(answer => sendResponse({ success: true, answer }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
    }
});