```markdown
## `useStream` Hook in `frontend/src/App.tsx`

The `frontend/src/App.tsx` file utilizes the `useStream` hook from the `@langchain/langgraph-sdk/react` library to manage real-time communication with a backend service. This hook is central to receiving and processing Server-Sent Events (SSE) for live updates in the application.

### Configuration Details

The `useStream` hook is configured with the following parameters:

-   **`apiUrl`**: This determines the backend endpoint for the SSE connection.
    -   In a **development environment** (`import.meta.env.DEV` is true), the URL is set to `http://localhost:2024`.
    -   In a **production environment**, the URL is set to `http://localhost:8123`.
-   **`assistantId`**: This identifier is statically set to `"agent"`. It likely specifies which backend assistant or agent to connect to.
-   **`messagesKey`**: This is set to `"messages"`. It indicates the key within the streamed data that contains the chat messages or primary content to be displayed or processed.

### Role of `onUpdateEvent` Callback

The `useStream` hook accepts an `onUpdateEvent` callback function. This function plays a crucial role in handling incoming data from the backend.

-   **Event Reception**: Whenever the backend sends an SSE event, the `onUpdateEvent` callback is invoked with the raw event data as its argument.
-   **Data Processing**: Inside this callback, the application logic processes the received event. As seen in `App.tsx`, this involves:
    -   Identifying the type of event (e.g., `generate_query`, `web_research`, `reflection`, `finalize_answer`).
    -   Extracting relevant information from the event payload.
    -   Transforming this raw data into a `ProcessedEvent` format suitable for display in the UI (specifically, for an activity timeline).
    -   Updating the application's state (`processedEventsTimeline`) with this new event, triggering UI updates.

In essence, the `onUpdateEvent` callback serves as the **primary entry point for raw SSE event data into the frontend application's logic**. It bridges the gap between the real-time data stream and the user-facing components, enabling dynamic updates based on backend activities.

### Detailed `onUpdateEvent` Logic

The `onUpdateEvent` callback function is designed to process various types of events streamed from the backend. It receives a raw `event` object and uses conditional logic to determine the event type. This is achieved by checking for the existence of specific keys on the `event` object.

1.  **Raw Event Reception**: The callback receives an `event: any` object, which is the raw data packet sent by the backend via SSE.

2.  **Conditional Event Identification**: The code employs `if...else if...` statements to check for the presence of specific top-level keys in the `event` object. This determines the nature of the event:
    *   `if (event.generate_query)`: Identifies an event related to query generation.
    *   `else if (event.web_research)`: Identifies an event related to web research activities.
    *   `else if (event.reflection)`: Identifies an event where the system reflects on the information gathered.
    *   `else if (event.finalize_answer)`: Identifies an event for finalizing the answer.

3.  **`ProcessedEvent` Creation**: Based on the identified event type, a `ProcessedEvent` object is created with a specific `title` and `data` payload. This object is tailored for UI display, likely in an activity timeline.

    *   **`event.generate_query`**:
        *   **Title**: "Generating Search Queries"
        *   **Data**: The `data` is constructed by joining the elements of the `event.generate_query.query_list` array with ", ". For example, if `query_list` is `["AI impact on jobs", "future of work AI"]`, the data becomes `"AI impact on jobs, future of work AI"`.

    *   **`event.web_research`**:
        *   **Title**: "Web Research"
        *   **Data**: This string is more complex:
            *   It accesses `event.web_research.sources_gathered` (or an empty array `[]` if undefined) to get the list of sources.
            *   `numSources` is the count of these sources.
            *   `uniqueLabels` are extracted from `sources.map((s: any) => s.label).filter(Boolean)` to get distinct, non-empty labels.
            *   `exampleLabels` takes the first 3 unique labels and joins them with ", ".
            *   The final `data` string is formatted as: `"Gathered ${numSources} sources. Related to: ${exampleLabels || "N/A"}."`.

    *   **`event.reflection`**:
        *   **Title**: "Reflection"
        *   **Data**: The content depends on the boolean `event.reflection.is_sufficient`:
            *   If `true`: `"Search successful, generating final answer."`
            *   If `false`: `"Need more information, searching for ${event.reflection.follow_up_queries.join(", ")}"` (joins the list of follow-up queries).

    *   **`event.finalize_answer`**:
        *   **Title**: "Finalizing Answer"
        *   **Data**: A static message: `"Composing and presenting the final answer."`
        *   Additionally, a React ref `hasFinalizeEventOccurredRef.current` is set to `true`.

4.  **State Update**: If any of the conditions match and a `processedEvent` object is successfully created (i.e., it's not `null`), it is then added to the `processedEventsTimeline` state array. This is done using the functional update form of `setState`:
    ```typescript
    setProcessedEventsTimeline((prevEvents) => [
      ...prevEvents,
      processedEvent!,
    ]);
    ```
    This appends the new event to the existing list, which in turn will likely trigger a re-render of the UI components that depend on this state, updating the activity timeline for the user.

### Management of Event Data for UI Display

In `App.tsx`, two primary state variables are responsible for managing the processed event data, which is crucial for displaying activity timelines to the user:

1.  **`processedEventsTimeline`**:
    *   This is a React state variable initialized as an empty array: `useState<ProcessedEvent[]>([])`.
    *   It holds an array of `ProcessedEvent` objects. Each object in this array represents a step or an event that occurs during the generation of an AI response *in real-time*.
    *   This timeline is actively updated by the `onUpdateEvent` callback as new SSE events arrive from the backend for the *current, ongoing* AI interaction.

2.  **`historicalActivities`**:
    *   This is a React state variable initialized as an empty object: `useState<Record<string, ProcessedEvent[]>>({})`.
    *   It's a record (or dictionary/map) where:
        *   The **keys** are message IDs (strings), specifically the IDs of AI-generated messages.
        *   The **values** are arrays of `ProcessedEvent` objects, representing the complete sequence of activities that occurred to generate that specific past AI message.
    *   This state stores the activity timelines for all *previous* AI responses in the chat session.

### Passing Event Data to `ChatMessagesView`

These two state variables are passed down as props to the `ChatMessagesView` component, which is responsible for rendering the chat interface:

*   `processedEventsTimeline` is passed to `ChatMessagesView` as the `liveActivityEvents` prop. This allows `ChatMessagesView` to display the real-time activity for the AI response currently being generated.
*   `historicalActivities` is passed as the `historicalActivities` prop. This enables `ChatMessagesView` to access and display the activity timelines for any previously completed AI messages.

Within `ChatMessagesView.tsx`, the `liveActivityEvents` (for the last AI message if it's still loading) and the relevant entry from `historicalActivities` (for previous AI messages) are further passed to individual `AiMessageBubble` component instances. The `AiMessageBubble` then uses these props to render an `ActivityTimeline` component, displaying the sequence of events for that particular message.

### Populating `historicalActivities`

The mechanism for populating `historicalActivities` is handled within a `useEffect` hook in `App.tsx` that depends on `thread.messages`, `thread.isLoading`, and `processedEventsTimeline`:

1.  **Trigger Condition**: The logic executes when:
    *   `hasFinalizeEventOccurredRef.current` is `true` (this ref is set to `true` in `onUpdateEvent` when an `event.finalize_answer` is received).
    *   `thread.isLoading` is `false` (meaning the `useStream` hook is no longer actively streaming/loading data for the current response).
    *   `thread.messages.length > 0` (ensuring there are messages to process).

2.  **Copying Timeline to History**:
    *   If these conditions are met, it signifies that an AI message generation has just completed.
    *   The ID of the last message in the `thread.messages` array (which should be the AI message that was just finalized) is retrieved.
    *   The entire current content of `processedEventsTimeline` (which contains all activities for the just-completed response) is copied into the `historicalActivities` state. The last AI message's ID is used as the key for this new entry.
    ```typescript
    setHistoricalActivities((prev) => ({
      ...prev,
      [lastMessage.id!]: [...processedEventsTimeline],
    }));
    ```

3.  **Resetting for Next Interaction**:
    *   `hasFinalizeEventOccurredRef.current` is then set back to `false`.
    *   The `processedEventsTimeline` itself is cleared (set to an empty array `[]`) inside the `handleSubmit` function when a *new* user message is submitted. This ensures it's ready to collect events for the next AI response.

### Rendering Activities in `ActivityTimeline.tsx`

The `ActivityTimeline` component (in `frontend/src/components/ActivityTimeline.tsx`) is responsible for visually rendering the sequence of events that occur during an AI's response generation.

1.  **Receiving Event Data**:
    *   It receives a `processedEvents` prop, which is an array of `ProcessedEvent` objects (`{ title: string, data: any }`). This array can represent either the `liveActivityEvents` (for an ongoing AI response) or a specific entry from `historicalActivities` (for a past AI response).
    *   It also receives an `isLoading` boolean prop, indicating if events are still being streamed or processed.

2.  **The `getEventIcon` Function**:
    *   This crucial helper function determines which icon to display next to each event in the timeline. It takes the `title` of a `ProcessedEvent` and its `index` as arguments.
    *   **Web Search Related Icons**:
        *   If the lowercase `title` includes `"generating"` (e.g., "Generating Search Queries" from `App.tsx`), it returns a `TextSearch` icon from `lucide-react`.
        *   If the lowercase `title` includes `"research"` (e.g., "Web Research" from `App.tsx`), it returns a `Search` icon.
        *   If the lowercase `title` includes `"thinking"`, it returns an animated `Loader2` icon, signifying an ongoing thought process that often precedes or accompanies research steps.
    *   Other specific titles like `"reflection"` (returns `Brain` icon) and `"finalizing"` (returns `Pen` icon) are also handled.
    *   If none of the specific keywords are matched in the title, it defaults to an `Activity` icon.

3.  **Rendering Logic**:
    *   The component maps over the `processedEvents` array.
    *   For each `eventItem` in the array:
        *   It calls `getEventIcon(eventItem.title, index)` to obtain the appropriate icon.
        *   It displays the `eventItem.title` (e.g., "Generating Search Queries", "Web Research") as a medium-font text.
        *   It displays the `eventItem.data` (e.g., the list of queries, summary of sources) as smaller text below the title.
    *   This structure makes the processed titles and their associated data (originally formulated in `App.tsx`'s `onUpdateEvent` callback) visible to the user, each accompanied by a contextually relevant icon.

4.  **Loading Indicators**:
    *   **Initial Loading**: If `isLoading` is `true` and `processedEvents` is empty (i.e., the AI has just started processing a request), a prominent `Loader2` icon with the text "Searching..." is displayed as the first item in the timeline.
    *   **Ongoing Loading**: If `isLoading` is `true` and there are already some events in `processedEvents` (i.e., the AI is part-way through its processing steps), a smaller `Loader2` icon with "Searching..." is shown at the *end* of the list of current events. This indicates that more events might be forthcoming.
    *   If `isLoading` is `false` and `processedEvents` is empty, a "No activity to display" message is shown.

The `ActivityTimeline` also includes functionality to collapse and expand the view of the events, managed by the `isTimelineCollapsed` state.

## Summary

Backend Server-Sent Events (SSE) are primarily handled in the frontend by `App.tsx`. The `useStream` hook from `@langchain/langgraph-sdk/react` establishes the connection and receives raw event objects through its `onUpdateEvent` callback.

Within `onUpdateEvent`, these raw events are categorized. The code checks for specific keys on the event object, such as `event.generate_query` (for query generation) or `event.web_research` (for web research). Based on these keys, `ProcessedEvent` objects are created. These objects contain descriptive titles (e.g., "Generating Search Queries", "Web Research") and the relevant extracted data. These `ProcessedEvent` objects populate the `processedEventsTimeline` state array, which tracks the real-time activities of an ongoing AI response.

This event data then flows through the component tree:
1.  The `processedEventsTimeline` is passed as the `liveActivityEvents` prop to the `ChatMessagesView` component.
2.  The `historicalActivities` state (a record storing past `processedEventsTimeline` arrays, keyed by AI message ID) is also passed to `ChatMessagesView`.
3.  `ChatMessagesView` then relays the appropriate set of events (either live or historical) to the relevant `AiMessageBubble` component.

The `AiMessageBubble` utilizes the `ActivityTimeline` component to display these events. `ActivityTimeline` iterates through the received list of `ProcessedEvent` objects. Its `getEventIcon` function plays a key role in enhancing clarity by selecting an appropriate icon (e.g., `TextSearch` for titles containing "generating", `Search` for "research") based on keywords found in the `event.title`. The title and data of each event are then rendered alongside this icon.

This entire mechanism allows the frontend to effectively interpret backend SSE events. Specifically, it enables the system to identify web search-related operations (like query generation and research execution), extract their details, and clearly display these activities and their results to the user within the chat interface's activity timeline, providing transparency into the AI's process.
```
