/**
 * js/agent.js
 * The Orchestrator: Manages the 3-Phase Agent Workflow.
 */
import { fetchChat, streamChat } from './api.js';

export async function runAgentWorkflow(userPrompt, history, onUpdate, onComplete, onError) {
    try {
        // --- Phase 1: Orchestrator ---
        onUpdate('> Orchestrator: Analyzing request...');

        const orchestratorPrompt = `You are an Orchestrator. Break this task into 2 distinct sub-tasks for parallel workers.
        Output ONLY JSON: { "task1": "...", "task2": "..." }.
        Do not output any markdown code blocks, just raw JSON string.`;

        const messages = [
            { role: 'system', content: orchestratorPrompt },
            { role: 'user', content: userPrompt }
        ];

        let jsonString = await fetchChat(messages);

        // Clean potential markdown blocks if model ignores instructions
        jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

        let tasks = [];
        try {
            const parsed = JSON.parse(jsonString);
            if (parsed.task1 && parsed.task2) {
                tasks = [parsed.task1, parsed.task2];
            } else {
                throw new Error('Invalid JSON structure');
            }
        } catch (e) {
            console.warn('Orchestrator JSON parse failed. Fallback to single task.');
            tasks = [jsonString]; // Fallback: Treat entire output as one task
        }

        // --- Phase 2: Parallel Workers ---
        onUpdate(`> Dispatching ${tasks.length} parallel workers...`);

        const workerPromises = tasks.map(async (task, index) => {
            // Worker prompt: Just the task, no history to keep it focused/fast?
            // Requirement: "These workers should not see the full chat history, only their specific task."
            const workerMessages = [
                { role: 'system', content: 'You are a specialized worker. Solve this task efficiently.' },
                { role: 'user', content: task }
            ];

            try {
                const result = await fetchChat(workerMessages);
                return `Worker ${index + 1} Output:\n${result}`;
            } catch (err) {
                return `Worker ${index + 1} Failed: ${err.message}`;
            }
        });

        const workerResults = await Promise.all(workerPromises);
        const combinedResults = workerResults.join('\n\n---\n\n');

        // --- Phase 3: Synthesizer ---
        onUpdate('> Synthesizer: Combining results into final answer...');

        const synthesizerPrompt = `Combine these two results into one cohesive final answer for the user.
        Ensure the tone is consistent and helpful.`;

        const finalMessages = [
            { role: 'system', content: synthesizerPrompt },
            { role: 'user', content: `Original Request: ${userPrompt}\n\nWorker Results:\n${combinedResults}` }
        ];

        // Stream the final result
        // Note: The caller (chat.js) handles hiding the terminal when this stream starts (via onChunk callback or wrapper)
        // But here we just delegate to streamChat.

        await streamChat(finalMessages, onComplete.onChunk, onComplete.onFinish, onError);

    } catch (err) {
        console.error('Agent Workflow Error:', err);
        onError(err);
    }
}
