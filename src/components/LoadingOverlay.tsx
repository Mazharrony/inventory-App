import Spinner from "./Spinner";

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export const LoadingOverlay = ({ isLoading, message = "Loading..." }: LoadingOverlayProps) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in">
      <div className="bg-card p-8 rounded-lg shadow-xl flex flex-col items-center gap-4">
        <Spinner size="lg" className="text-primary" />
        <p className="text-foreground font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
