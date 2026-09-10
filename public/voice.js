// Configuración de reconocimiento de voz
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

let isListening = false;
let lastRecognizedCommand = '';

// Configurar reconocimiento de voz
recognition.lang = 'es-ES';
recognition.continuous = false;
recognition.interimResults = true;

const API = 'http://localhost:3000/api';

// EVENTOS DE RECONOCIMIENTO DE VOZ
recognition.onstart = () => {
    isListening = true;
    updateMicButton();
    document.getElementById('transcriptionText').textContent = 'Escuchando...';
    document.querySelector('.transcription').classList.add('listening');
};

recognition.onresult = (event) => {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i].transcript;
        
        if (event.results[i].isFinal) {
            handleVoiceCommand(transcript);
        } else {
            interimTranscript += transcript;
        }
    }
    
    document.getElementById('transcriptionText').textContent = interimTranscript || 'Escuchando...';
};

recognition.onerror = (event) => {
    console.error('Error en reconocimiento de voz:', event.error);
    document.getElementById('transcriptionText').textContent = `Error: ${event.error}`;
};

recognition.onend = () => {
    isListening = false;
    updateMicButton();
};

// FUNCIONES DE CONTROL
function toggleMicrophone() {
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function updateMicButton() {
    const micButton = document.getElementById('micButton');
    const micText = micButton.querySelector('.mic-text');
    
    if (isListening) {
        micButton.classList.add('active');
        micText.textContent = 'Escuchando...';
    } else {
        micButton.classList.remove('active');
        micText.textContent = 'Activar Micrófono';
    }
}

// PROCESAR COMANDO DE VOZ
async function handleVoiceCommand(transcript) {
    const command = transcript.toLowerCase().trim();
    lastRecognizedCommand = command;
    
    console.log('Comando detectado:', command);
    
    // Actualizar transcripción
    document.getElementById('transcriptionText').textContent = command;
    document.querySelector('.transcription').classList.add('recognized');
    
    // Mostrar sección de respuesta
    document.getElementById('voiceResponse').style.display = 'block';
    
    // Intentar ejecutar como comando del sistema
    const executeCommands = document.getElementById('executeCommands').checked;
    const commandResult = await tryExecuteCommand(command, executeCommands);
    
    if (commandResult) {
        displayVoiceResponse(commandResult);
        return;
    }
    
    // Si no es un comando, tratarlo como pregunta para Gemini
    const aiResponse = await askGemini(command);
    displayVoiceResponse(aiResponse);
}

// INTENTAR EJECUTAR COMANDO
async function tryExecuteCommand(command, autoExecute = true) {
    try {
        const response = await fetch(`${API}/commands/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        
        const data = await response.json();
        
        if (data.success && autoExecute) {
            return data.result;
        } else if (!data.success) {
            return null; // No es un comando reconocido
        }
        
        return data.result;
    } catch (error) {
        console.error('Error ejecutando comando:', error);
        return null;
    }
}

// PREGUNTAR A GEMINI
async function askGemini(message) {
    try {
        const response = await fetch(`${API}/gemini/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        if (data.success) {
            return data.response;
        } else {
            return 'Error: ' + data.error;
        }
    } catch (error) {
        return 'Error al conectar con Gemini: ' + error.message;
    }
}

// MOSTRAR RESPUESTA DE VOZ
function displayVoiceResponse(text) {
    document.getElementById('responseText').textContent = text;
    
    // Hablar respuesta si está habilitado
    const autoSpeak = document.getElementById('autoSpeak').checked;
    if (autoSpeak) {
        speakText(text);
    }
}

// SÍNTESIS DE VOZ (TEXT-TO-SPEECH)
function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Eventos de síntesis
    utterance.onstart = () => {
        console.log('Jarvis está hablando...');
    };
    
    utterance.onend = () => {
        console.log('Jarvis terminó de hablar.');
    };
    
    speechSynthesis.cancel(); // Detener cualquier síntesis anterior
    speechSynthesis.speak(utterance);
}

function speakResponse() {
    const text = document.getElementById('responseText').textContent;
    if (text) {
        speakText(text);
    }
}

function clearVoiceResponse() {
    document.getElementById('voiceResponse').style.display = 'none';
    document.getElementById('responseText').textContent = '';
    document.querySelector('.transcription').classList.remove('recognized');
    document.getElementById('transcriptionText').textContent = 'En espera...';
}

// CARGAR COMANDOS DISPONIBLES
async function loadAvailableCommands() {
    try {
        const response = await fetch(`${API}/commands/commands`);
        const data = await response.json();
        
        const commandsList = document.getElementById('commandsList');
        commandsList.innerHTML = '';
        
        data.commands.forEach(command => {
            const tag = document.createElement('div');
            tag.className = 'command-tag';
            tag.textContent = command;
            tag.onclick = () => {
                document.getElementById('transcriptionText').textContent = command;
                handleVoiceCommand(command);
            };
            commandsList.appendChild(tag);
        });
    } catch (error) {
        console.error('Error cargando comandos:', error);
    }
}

// INICIALIZAR
window.addEventListener('load', () => {
    loadAvailableCommands();
    
    // Verificar soporte de APIs
    if (!SpeechRecognition) {
        alert('⚠️ Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari.');
    }
});

// ATAJOS DE TECLADO
document.addEventListener('keydown', (e) => {
    // Ctrl + M para activar micrófono
    if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        toggleMicrophone();
    }
    
    // Escape para detener
    if (e.key === 'Escape' && isListening) {
        recognition.stop();
    }
});
