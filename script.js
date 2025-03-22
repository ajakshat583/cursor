// DOM Elements
const symptomsInput = document.getElementById('symptoms-input');
const submitBtn = document.getElementById('submit-btn');
const loader = document.getElementById('loader');
const resultContainer = document.getElementById('result-container');
const resultContent = document.getElementById('result-content');
const themeToggle = document.getElementById('theme-toggle');

// Gemini API Key - Replace with your own API key
const API_KEY = "AIzaSyAbfXvu8LUDeAw8rfOTaLAGw1Y915Go3WU"; // Enter your Gemini API key here

// Theme Handling
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Gemini API Interaction
async function getDiagnosis(symptoms, retryCount = 0) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        
        // If this is a retry, use a simplified prompt
        let prompt;
        const maxRetries = 3;
        
        if (retryCount === 0) {
            prompt = `You are a medical assistant. I will provide you with a list of symptoms, and you need to identify the possible diseases and provide solutions. The response should include:
1. The name of the disease.
2. Possible causes of the disease.
3. Recommended treatments or solutions.
4. Any precautions to prevent it.

Symptoms: ${symptoms}

Answer based on these symptoms and be as informative as possible.`;
        } else {
            // Simplified prompt for retry attempts
            prompt = `Analyze these symptoms and provide a brief medical assessment with possible disease, causes, treatments, and precautions. Keep it concise.

Symptoms: ${symptoms}`;
        }

        const data = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();
        return result.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error(`Error fetching diagnosis (attempt ${retryCount + 1}):`, error);
        
        // Implement retry logic
        if (retryCount < 3) {
            console.log(`Retrying with attempt ${retryCount + 2}...`);
            // Wait for a short time before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            return getDiagnosis(symptoms, retryCount + 1);
        }
        
        return `After several attempts, we couldn't analyze your symptoms. Please try again with more specific symptoms or try later.`;
    }
}

// Format the result into HTML
function formatResult(text) {
    // Split the response by numbered sections
    const sections = text.split(/\d+\.\s+/).filter(section => section.trim() !== '');
    
    // Match expected sections to our format
    let disease = sections[0] || 'Not identified';
    let causes = sections[1] || 'Not specified';
    let treatments = sections[2] || 'Not provided';
    let precautions = sections[3] || 'Not provided';
    
    // If the API returns a different format, we'll handle it gracefully
    if (sections.length < 4) {
        // If we can't clearly identify sections, just return the formatted text
        return `<div class="result-section">
                    <p>${text}</p>
                </div>`;
    }
    
    return `
        <div class="result-section">
            <h3>Disease</h3>
            <p>${disease}</p>
        </div>
        <div class="result-section">
            <h3>Possible Causes</h3>
            <p>${causes}</p>
        </div>
        <div class="result-section">
            <h3>Recommended Treatments</h3>
            <p>${treatments}</p>
        </div>
        <div class="result-section">
            <h3>Precautions</h3>
            <p>${precautions}</p>
        </div>
    `;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    
    themeToggle.addEventListener('click', toggleTheme);
    
    submitBtn.addEventListener('click', async () => {
        const symptoms = symptomsInput.value.trim();
        
        if (!symptoms) {
            alert('Please enter your symptoms.');
            return;
        }
        
        if (!API_KEY) {
            alert('Please add your Gemini API Key in the script.js file.');
            return;
        }
        
        // Show loader
        resultContainer.style.display = 'none';
        loader.style.display = 'flex';
        
        // Get diagnosis
        const diagnosis = await getDiagnosis(symptoms);
        
        // Hide loader and show results
        loader.style.display = 'none';
        resultContainer.style.display = 'block';
        
        // Format and display result
        resultContent.innerHTML = formatResult(diagnosis);
        
        // Scroll to results
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}); 