import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function getGroqChat(text, stack) {
    console.log('groq: request received');
    console.time('groq_api');
    stack.push(
        {
            role: 'user',
            content: text
        }
    );
    const res = await groq.chat.completions.create({
        messages: stack,
        model: "llama3-groq-8b-8192-tool-use-preview",
        stream: false
    });
    stack.push(
        {
            role: 'assistant',
            content: res.choices[0].message.content
        }
    );
    console.timeEnd('groq_api');
    return Promise.resolve(res.choices[0].message.content);
}
