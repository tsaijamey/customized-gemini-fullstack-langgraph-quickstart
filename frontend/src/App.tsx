import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import { useState, useEffect, useRef, useCallback } from "react";
import { ProcessedEvent } from "@/components/ActivityTimeline";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessagesView } from "@/components/ChatMessagesView";

export default function App() {
  const [errorMessage, setErrorMessage] = useState<Message | null>(null);
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  const [processedEventsTimeline, setProcessedEventsTimeline] = useState<
    ProcessedEvent[]
  >([]);
  const [historicalActivities, setHistoricalActivities] = useState<
    Record<string, ProcessedEvent[]>
  >({});
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const hasFinalizeEventOccurredRef = useRef(false);

  const thread = useStream<{
    messages: Message[];
    initial_search_query_count: number;
    max_research_loops: number;
    reasoning_model: string;
  }>({
    apiUrl: import.meta.env.DEV
      ? "http://localhost:2024"
      : "http://localhost:8123",
    assistantId: "agent",
    messagesKey: "messages",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFinish: (event: any) => {
      console.log(event);
      setIsStreamingActive(false);
    },
    onError: (error: unknown) => {
      setIsStreamingActive(false);
      let errorMessageText = `An unknown error occurred.`;
      if (error instanceof Error) {
        errorMessageText = error.message;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (error as any).message === "string"
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMessageText = (error as any).message;
      } else {
        try {
          errorMessageText = JSON.stringify(error);
        } catch {
          errorMessageText = "An un-serializable error occurred.";
        }
      }
      setErrorMessage({
        type: "ai",
        content: `An error occurred: ${errorMessageText}`,
        id: "error-" + Date.now().toString(),
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdateEvent: (event: any) => {
      // 获取事件的第一个键
      const eventKey = Object.keys(event)[0];
      // 获取事件数据
      const eventData = event[eventKey];

      // 增加日志以便调试
      console.log("Received event:", {
        eventKey,
        eventData: JSON.stringify(eventData),
      });

      // 如果没有事件数据，或者事件是内容流的一部分，则直接返回
      if (!eventData || eventKey === "message") return;

      // 处理不同的事件类型
      let processedEvent: ProcessedEvent | null = null;

      // Logic to create or update the event in the timeline
      // 如果 eventKey 是 "generate_query"、"web_research"、"reflection" 或 "finalize_answer"
      if (eventKey === "generate_query") {
        processedEvent = {
          title: "Generating Search Queries",
          data: eventData.query_list
            ? `Queries: ${eventData.query_list.join(", ")}`
            : "In progress...",
        };
      } else if (eventKey === "web_research") {
        const sources = eventData.sources_gathered || [];
        processedEvent = {
          title: "Web Research",
          data:
            sources.length > 0
              ? `Gathered ${sources.length} sources.`
              : "Searching...",
        };
      } else if (eventKey === "reflection") {
        processedEvent = {
          title: "Reflection",
          data:
            eventData.is_sufficient !== undefined
              ? eventData.is_sufficient
                ? "Search successful, generating final answer."
                : `Need more info, searching for: ${eventData.follow_up_queries.join(", ")}`
              : "Reflecting on results...",
        };
      } else if (eventKey === "finalize_answer") {
        processedEvent = {
          title: "Finalizing Answer",
          data: "Composing and presenting the final answer.",
        };
        hasFinalizeEventOccurredRef.current = true;
      }

      // 如果存在已处理的事件
      if (processedEvent) {
        // 更新已处理事件的时间线状态
        setProcessedEventsTimeline((prevEvents) => {
          // "Web Research" 和 "Generating Search Queries" 可能会在一个流程中多次发生。
          // 因此，我们总是将它们作为新事件添加。
          if (
            processedEvent.title === "Web Research" ||
            processedEvent.title === "Generating Search Queries"
          ) {
            return [...prevEvents, processedEvent];
          }

          // 对于其他事件（如 "Reflection", "Finalizing Answer"），它们在流程中是唯一的。
          // 我们查找并更新它们，如果它们已存在的话。
          const newEvents = [...prevEvents];
          const existingEventIndex = newEvents.findIndex(
            (e) => e.title === processedEvent!.title,
          );

          if (existingEventIndex !== -1) {
            // 更新现有事件
            newEvents[existingEventIndex] = processedEvent;
            return newEvents;
          } else {
            // 添加新事件
            return [...newEvents, processedEvent];
          }
        });
      }
    },
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [thread.messages]);

  useEffect(() => {
    if (
      hasFinalizeEventOccurredRef.current &&
      !thread.isLoading &&
      thread.messages.length > 0
    ) {
      const lastMessage = thread.messages[thread.messages.length - 1];
      if (lastMessage && lastMessage.type === "ai" && lastMessage.id) {
        setHistoricalActivities((prev) => ({
          ...prev,
          [lastMessage.id!]: [...processedEventsTimeline],
        }));
      }
      hasFinalizeEventOccurredRef.current = false;
    }
  }, [thread.messages, thread.isLoading, processedEventsTimeline]);

  const handleSubmit = useCallback(
    (submittedInputValue: string, effort: string, model: string) => {
      if (!submittedInputValue.trim()) return;
      setErrorMessage(null);
      setIsStreamingActive(true);
      setProcessedEventsTimeline([]);
      hasFinalizeEventOccurredRef.current = false;

      // convert effort to, initial_search_query_count and max_research_loops
      // low means max 1 loop and 1 query
      // medium means max 3 loops and 3 queries
      // high means max 10 loops and 5 queries
      let initial_search_query_count = 0;
      let max_research_loops = 0;
      switch (effort) {
        case "low":
          initial_search_query_count = 1;
          max_research_loops = 1;
          break;
        case "medium":
          initial_search_query_count = 3;
          max_research_loops = 3;
          break;
        case "high":
          initial_search_query_count = 5;
          max_research_loops = 10;
          break;
      }

      const newMessages: Message[] = [
        ...(thread.messages || []),
        {
          type: "human",
          content: submittedInputValue,
          id: Date.now().toString(),
        },
      ];
      thread.submit({
        messages: newMessages,
        initial_search_query_count: initial_search_query_count,
        max_research_loops: max_research_loops,
        reasoning_model: model,
      });
    },
    [thread]
  );

  const handleCancel = useCallback(() => {
    thread.stop();
    window.location.reload();
  }, [thread]);

  return (
    <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 flex flex-col min-h-0">
          {thread.messages.length === 0 ? (
            <WelcomeScreen
              handleSubmit={handleSubmit}
              isLoading={thread.isLoading}
              onCancel={handleCancel}
            />
          ) : (
            <ChatMessagesView
              messages={
                errorMessage ? [...thread.messages, errorMessage] : thread.messages
              }
              isStreamingActive={isStreamingActive}
              scrollAreaRef={scrollAreaRef}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              liveActivityEvents={processedEventsTimeline}
              historicalActivities={historicalActivities}
            />
          )}
        </div>
      </main>
    </div>
  );
}
