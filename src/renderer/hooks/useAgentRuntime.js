import { useCallback, useEffect, useRef, useState } from 'react';

function normalizeRuntimeMessages(messages = []) {
  const now = Date.now();
  return messages
    .filter(message => message && ['user', 'assistant', 'tool'].includes(message.role))
    .map((message, index) => ({
      ...message,
      createdAt: message.createdAt || new Date(now + index).toISOString(),
      timestamp: message.timestamp || now + index,
      isStreaming: false
    }));
}

export function useAgentRuntime({ setMessages, setLoading, setAgentStep, setPendingApprovalCall }) {
  const activeSessionIdRef = useRef(null);
  const initializedSessionsRef = useRef(new Set());
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!window.electron?.agent?.onEvent) return undefined;
    return window.electron.agent.onEvent(event => {
      const activeSessionId = activeSessionIdRef.current;
      if (!activeSessionId || event?.sessionId !== activeSessionId) return;

      if (event.event === 'state_change') {
        if (event.iteration) setAgentStep(event.iteration);
        if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(event.toState)) setAgentStep(0);
        return;
      }

      if (event.event === 'token_delta' || event.event === 'reasoning_delta') {
        setMessages(previous => {
          const next = [...previous];
          let index = next.findLastIndex(message => message.role === 'assistant' && message.isStreaming && message.agentSessionId === activeSessionId);
          if (index < 0) {
            next.push({
              role: 'assistant',
              content: '',
              reasoning: '',
              isStreaming: true,
              agentSessionId: activeSessionId,
              createdAt: new Date().toISOString(),
              timestamp: Date.now()
            });
            index = next.length - 1;
          }
          const current = next[index];
          next[index] = event.event === 'token_delta'
            ? { ...current, content: `${current.content || ''}${event.content || ''}` }
            : { ...current, reasoning: `${current.reasoning || ''}${event.reasoning || ''}` };
          return next;
        });
        return;
      }

      if (event.event === 'tool_call_request') {
        setMessages(previous => {
          const next = [...previous];
          let index = next.findLastIndex(message => message.role === 'assistant' && message.agentSessionId === activeSessionId);
          if (index < 0) {
            next.push({ role: 'assistant', content: '', isStreaming: true, agentSessionId: activeSessionId, timestamp: Date.now() });
            index = next.length - 1;
          }
          const current = next[index];
          const toolCalls = [...(current.tool_calls || [])];
          if (!toolCalls.some(call => call.id === event.toolCall?.id)) toolCalls.push(event.toolCall);
          next[index] = { ...current, tool_calls: toolCalls };
          return next;
        });
        return;
      }

      if (event.event === 'tool_permission_required') {
        setPendingApprovalCall({
          ...event.toolCall,
          _agentRuntime: true,
          _agentSessionId: activeSessionId
        });
        return;
      }

      if (event.event === 'tool_result') {
        const content = event.error
          ? JSON.stringify({ error: event.error })
          : (typeof event.result === 'string' ? event.result : JSON.stringify(event.result));
        setMessages(previous => [
          ...previous,
          {
            role: 'tool',
            name: event.toolName,
            content,
            tool_call_id: event.toolCallId,
            status: event.error ? 'error' : 'completed',
            error: event.error || null,
            createdAt: new Date().toISOString(),
            timestamp: Date.now()
          }
        ]);
      }
    });
  }, [setAgentStep, setLoading, setMessages, setPendingApprovalCall]);

  const runAgent = useCallback(async ({ sessionId, message, seedMessages, model, workspaceRoot, systemPrompt, agentHarness }) => {
    if (!window.electron?.agent || !sessionId) throw new Error('Agent runtime is unavailable.');

    activeSessionIdRef.current = sessionId;
    setIsRunning(true);
    setLoading(true);
    setAgentStep(1);

    try {
      if (!initializedSessionsRef.current.has(sessionId)) {
        await window.electron.agent.createSession({
          sessionId,
          workspaceRoot: workspaceRoot || undefined,
          model,
          messages: seedMessages || []
        });
        initializedSessionsRef.current.add(sessionId);
      }

      const result = await window.electron.agent.prompt(sessionId, message, {
        workspaceRoot: workspaceRoot || undefined,
        model,
        maxIterations: 25,
        settings: {
          agentMode: true,
          agentModeActive: true,
          currentChatId: sessionId,
          agentSystemPrompt: systemPrompt || '',
          ...(agentHarness ? { agentHarness } : {})
        }
      });

      if (Array.isArray(result?.messages)) setMessages(normalizeRuntimeMessages(result.messages));
      if (result?.status === 'failed' || result?.status === 'error') {
        throw new Error(result.error || 'Agent execution failed.');
      }
      return result;
    } catch (error) {
      if (!/cancel/i.test(error.message || '')) {
        setMessages(previous => [
          ...previous.filter(message => !message.isStreaming),
          { role: 'assistant', content: `Error: ${error.message}`, createdAt: new Date().toISOString(), timestamp: Date.now() }
        ]);
      }
      throw error;
    } finally {
      setPendingApprovalCall(null);
      setAgentStep(0);
      setLoading(false);
      setIsRunning(false);
      activeSessionIdRef.current = null;
    }
  }, [setAgentStep, setLoading, setMessages, setPendingApprovalCall]);

  const cancelAgent = useCallback(async () => {
    const sessionId = activeSessionIdRef.current;
    if (!sessionId || !window.electron?.agent?.cancel) return false;
    await window.electron.agent.cancel(sessionId);
    setPendingApprovalCall(null);
    setAgentStep(0);
    setLoading(false);
    return true;
  }, [setAgentStep, setLoading, setPendingApprovalCall]);

  return { runAgent, cancelAgent, isRunning };
}

export { normalizeRuntimeMessages };
