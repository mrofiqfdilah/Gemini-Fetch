import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import MarkdownIt from 'markdown-it';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // Tambahkan state loading
    const API_KEY = 'API KEY'; // Ganti dengan API Key Anda

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'id-ID'; // Atur bahasa sesuai kebutuhan
    recognition.interimResults = false;

    useEffect(() => {
        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript; // Ambil teks dari hasil
            setInput(transcript); // Set input dengan hasil suara

            // Kirim pesan secara otomatis dan tunggu balasan dari AI
            await handleSendMessage(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Terjadi kesalahan dalam pengenalan: ', event.error);
        };

        return () => {
            recognition.abort(); // Hentikan recognition saat komponen di-unmount
        };
    }, [recognition]);

    const handleSendMessage = async (inputMessage) => {
        if (!inputMessage.trim()) {
            setError('Masukkan pesan sebelum mengirim.');
            return;
        }

        const newMessages = [...messages, { text: inputMessage, sender: 'user' }];
        setMessages(newMessages);
        setLoading(true); // Set loading menjadi true

        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
            });

            const contents = [
                {
                    role: 'user',
                    parts: [{ text: inputMessage }]
                }
            ];

            const result = await model.generateContentStream({ contents });
            const md = new MarkdownIt();

            let buffer = [];
            for await (let response of result.stream) {
                buffer.push(response.text());
            }

            const botMessage = { text: md.render(buffer.join('')), sender: 'bot' };

            // Hilangkan tag HTML untuk speech synthesis
            const plainText = new DOMParser().parseFromString(botMessage.text, 'text/html').body.textContent || "";

            // Membaca pesan bot dengan suara

            setMessages((prevMessages) => [...prevMessages, botMessage]);

            // Membaca pesan bot dengan suara
            const utterance = new SpeechSynthesisUtterance(plainText);
            utterance.lang = 'id-ID';

            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(voice => voice.name.includes('Indonesian') && voice.name.includes('Female'));

            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }

            window.speechSynthesis.speak(utterance);

        } catch (error) {
            console.error('Kesalahan saat mengirim pesan:', error);
            setError('Terjadi kesalahan saat mengirim pesan. Silakan coba lagi.');
        } finally {
            setLoading(false); // Set loading menjadi false setelah selesai
        }

        setInput(''); // Reset input setelah pengiriman
    };

    const startListening = () => {
        console.log("Mulai mendengarkan...");
        recognition.start();
    };

    return (
        <div className="chatbot">
            <div className="chat-window">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        <span dangerouslySetInnerHTML={{ __html: msg.text }} />
                    </div>
                ))}
                {loading && <div className="loading">Loading...</div>} {/* Indikator loading */}
            </div>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={(e) => e.preventDefault()}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ketik pesan..."
                    required
                />
                <button type="button" onClick={startListening}>🎤</button>
                <button type="button" onClick={() => handleSendMessage(input)}>Kirim</button>
            </form>
        </div>
    );
};

export default Chatbot;
