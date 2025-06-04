import { InputForm } from "./InputForm";

interface WelcomeScreenProps {
  handleSubmit: (
    submittedInputValue: string,
    effort: string,
    model: string
  ) => void;
  onCancel: () => void;
  isLoading: boolean;
  currentEffort: string;
  setCurrentEffort: (value: string) => void;
  currentModel: string;
  setCurrentModel: (value: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  handleSubmit,
  onCancel,
  isLoading,
  currentEffort,
  setCurrentEffort,
  currentModel,
  setCurrentModel,
}) => (
  <div className="flex flex-col items-center justify-center text-center px-4 flex-1 w-full max-w-3xl mx-auto gap-4">
    <div>
      <h1 className="text-5xl md:text-6xl font-semibold text-neutral-100 mb-3">
        Welcome.
      </h1>
      <p className="text-xl md:text-2xl text-neutral-400">
        How can I help you today?
      </p>
    </div>
    <div className="w-full mt-4">
      <InputForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCancel={onCancel}
        hasHistory={false}
        effort={currentEffort}
        setEffort={setCurrentEffort}
        model={currentModel}
        setModel={setCurrentModel}
      />
    </div>
    <p className="text-xs text-neutral-500">
      Powered by Google Gemini and LangChain LangGraph.
    </p>
  </div>
);
